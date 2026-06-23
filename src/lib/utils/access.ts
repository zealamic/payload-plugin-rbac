import { Access, type PayloadRequest, type Where } from "payload";
import type { DataScope } from "../../collections/roles/types.js";
import { STATUS as PERMISSION_STATUS } from "../constants/permission.js";
import { DATA_SCOPE, STATUS as ROLE_STATUS } from "../constants/role.js";
import { PARENT_PATH_SEPARATOR } from "../constants/user.js";
import {
  getDataScopeOptionsCacheKey,
  getPermissionCheckCacheKey,
  getRBACRequestCache,
} from "./access-cache.js";
import { toID } from "./data.js";

type UserRoleRef =
  | number
  | string
  | {
      id?: number | string;
      isSuperAdmin?: boolean | null;
      dataScope?: DataScope;
    };

type RequestUser = {
  id?: number | string;
  roles?: UserRoleRef[] | null;
  isSuperAdmin?: boolean | null;
};

export type DataScopeOptions = {
  /** Field on business collections storing the creator user id. Default: `createdBy`. */
  createdByField?: string;
  /** Users collection slug. Default: `users`. */
  usersCollectionSlug?: string;
};

type PermissionAccessBaseArgs = {
  featureCode: string;
  actionCode: string;
};

/** Permission-only check (boolean). */
export type GetPermissionAccessPermissionOnlyArgs = PermissionAccessBaseArgs & {
  mode?: "none";
  collectionSlug?: never;
  options?: never;
};

/** Read access: permission check + data-scope `Where` filter. */
export type GetPermissionAccessReadArgs = PermissionAccessBaseArgs & {
  mode?: "none";
  collectionSlug?: never;
  options: DataScopeOptions;
};

/** Update/delete access: per-document RBAC + data-scope check. */
export type GetPermissionAccessModifyArgs = PermissionAccessBaseArgs & {
  mode: "modify";
  /** Defaults to `featureCode` when omitted (typical when both match the collection `slug`). */
  collectionSlug?: string;
  /** Defaults to `{ createdByField: "createdBy", usersCollectionSlug: "users" }` when omitted. */
  options?: DataScopeOptions;
};

export type GetPermissionAccessArgs =
  | GetPermissionAccessPermissionOnlyArgs
  | GetPermissionAccessReadArgs
  | GetPermissionAccessModifyArgs;

const DEFAULT_CREATED_BY_FIELD = "createdBy";
const DEFAULT_USERS_COLLECTION = "users";

const DEFAULT_DATA_SCOPE_OPTIONS: Required<DataScopeOptions> = {
  createdByField: DEFAULT_CREATED_BY_FIELD,
  usersCollectionSlug: DEFAULT_USERS_COLLECTION,
};

const resolveDataScopeOptions = (options?: DataScopeOptions): Required<DataScopeOptions> => ({
  createdByField: options?.createdByField ?? DEFAULT_DATA_SCOPE_OPTIONS.createdByField,
  usersCollectionSlug:
    options?.usersCollectionSlug ?? DEFAULT_DATA_SCOPE_OPTIONS.usersCollectionSlug,
});

const SCOPE_PRIORITY: Record<DataScope, number> = {
  [DATA_SCOPE.OWN]: 0,
  [DATA_SCOPE.HIERARCHY]: 1,
  [DATA_SCOPE.ALL]: 2,
};

/** Normalize role refs from `req.user` to an always-iterable array. */
const getRoleRefs = (user: RequestUser): UserRoleRef[] => user.roles ?? [];

const getRoleIds = (user: RequestUser): string[] =>
  getRoleRefs(user)
    .map((ref) => toID(ref))
    .filter((id): id is string => Boolean(id));

/**
 * Fast-path super-admin check from session payload (`req.user`).
 * Avoids a database round-trip when the field is already present.
 */
const hasInlineSuperAdmin = (user: RequestUser | null | undefined): boolean => {
  if (!user) {
    return false;
  }
  return Boolean(user.isSuperAdmin);
};

const pickWidestDataScope = (scopes: Array<DataScope | null | undefined>): DataScope => {
  let widest: DataScope = DATA_SCOPE.OWN;

  for (const scope of scopes) {
    if (!scope) {
      continue;
    }
    if (SCOPE_PRIORITY[scope] > SCOPE_PRIORITY[widest]) {
      widest = scope;
    }
  }

  return widest;
};

/**
 * Fallback super-admin check against persisted users data.
 * Use when session payload may be stale or missing `isSuperAdmin`.
 */
const resolveSuperAdminFromUserIDUncached = async ({
  req,
  user,
}: {
  req: PayloadRequest;
  user: RequestUser;
}): Promise<boolean> => {
  if (!user.id) {
    return false;
  }

  const userDocs = await req.payload.find({
    collection: "users",
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      and: [
        {
          id: { equals: user.id },
        },
        {
          isSuperAdmin: { equals: true },
        },
      ],
    },
  });

  return userDocs.docs.length > 0;
};

const resolveSuperAdminFromUserID = async ({
  req,
  user,
}: {
  req: PayloadRequest;
  user: RequestUser;
}): Promise<boolean> => {
  const cache = getRBACRequestCache(req);

  if (!cache.superAdmin) {
    cache.superAdmin = resolveSuperAdminFromUserIDUncached({ req, user });
  }

  return await cache.superAdmin;
};

/**
 * Resolve RBAC permission from role assignments:
 * 1) find active `permissions` by feature/action code
 * 2) check an enabled `roles-permissions` row for any user role
 */
const resolvePermissionFromRoleIDUncached = async ({
  req,
  user,
  featureCode,
  actionCode,
}: {
  req: PayloadRequest;
  user: RequestUser;
  featureCode: string;
  actionCode: string;
}): Promise<boolean> => {
  const roleIDs = getRoleIds(user);
  if (!roleIDs.length) {
    return false;
  }

  const permissions = await req.payload.find({
    collection: "permissions",
    depth: 0,
    limit: 0,
    pagination: false,
    req,
    where: {
      and: [
        {
          status: { equals: PERMISSION_STATUS.ACTIVE },
        },
        {
          "permissionFeature.code": { equals: featureCode },
        },
        {
          "permissionAction.code": { equals: actionCode },
        },
      ],
    },
  });

  if (!permissions.docs.length) {
    return false;
  }
  const permissionIDs = permissions.docs.map((item) => item.id);
  const rolePermissions = await req.payload.find({
    collection: "roles-permissions",
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      and: [
        {
          role: { in: roleIDs },
        },
        {
          permission: { in: permissionIDs },
        },
        {
          enabled: { equals: true },
        },
      ],
    },
  });

  return rolePermissions.docs.length > 0;
};

const resolvePermissionFromRoleID = async ({
  req,
  user,
  featureCode,
  actionCode,
}: {
  req: PayloadRequest;
  user: RequestUser;
  featureCode: string;
  actionCode: string;
}): Promise<boolean> => {
  if (!user.id) {
    return false;
  }

  const cache = getRBACRequestCache(req);
  const cacheKey = getPermissionCheckCacheKey({
    featureCode,
    actionCode,
    userId: user.id,
  });
  const cached = cache.permissionChecks.get(cacheKey);

  if (cached) {
    return cached;
  }

  const result = resolvePermissionFromRoleIDUncached({
    req,
    user,
    featureCode,
    actionCode,
  });
  cache.permissionChecks.set(cacheKey, result);

  return await result;
};

/**
 * Access helper: allow only super admins.
 * Check session first, then persisted users data.
 */
export const getSuperAdminAccess = async ({ req }: { req: PayloadRequest }) => {
  const user = req.user as RequestUser | undefined;
  if (!user) {
    return false;
  }

  if (hasInlineSuperAdmin(user)) {
    return true;
  }

  return await resolveSuperAdminFromUserID({ req, user });
};

/**
 * Access helper: allow current document owner or super admin.
 */
export const getAuthenticatedOrSuperAdminAccess: Access | Promise<boolean> = async ({
  req,
  id,
}) => {
  const user = req.user as RequestUser | undefined;
  if (!user?.id) {
    return false;
  }

  if (String(user.id) === String(id)) {
    return true;
  }

  if (hasInlineSuperAdmin(user)) {
    return true;
  }
  return await resolveSuperAdminFromUserID({ req, user });
};

/**
 * Core RBAC access function (permission-only).
 * Super admins bypass; others are evaluated via roles + `roles-permissions`.
 */
const getBasePermissionAccess = ({ featureCode, actionCode }: PermissionAccessBaseArgs) => {
  return async ({ req }: { req: PayloadRequest }) => {
    const user = req.user as RequestUser | undefined;
    if (!user) {
      return false;
    }

    if (hasInlineSuperAdmin(user)) {
      return true;
    }

    return await resolvePermissionFromRoleID({
      req,
      user,
      featureCode,
      actionCode,
    });
  };
};

/**
 * Resolve effective data scope from active roles.
 * Widest scope wins: `all` > `hierarchy` > `own`.
 */
const resolveEffectiveDataScopeUncached = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<DataScope> => {
  const user = req.user as RequestUser | undefined;

  if (!user) {
    return DATA_SCOPE.OWN;
  }

  if (hasInlineSuperAdmin(user)) {
    return DATA_SCOPE.ALL;
  }

  const roleRefs = getRoleRefs(user);
  const roleIDs = getRoleIds(user);

  if (!roleIDs.length) {
    return DATA_SCOPE.OWN;
  }

  const inlineScopes = roleRefs
    .filter(
      (ref): ref is { id?: string | number; dataScope?: DataScope } =>
        typeof ref === "object" && ref !== null,
    )
    .map((ref) => ref.dataScope)
    .filter((scope): scope is DataScope => Boolean(scope));

  if (inlineScopes.length === roleRefs.length) {
    return pickWidestDataScope(inlineScopes);
  }

  const roles = await req.payload.find({
    collection: "roles",
    depth: 0,
    limit: 0,
    pagination: false,
    req,
    where: {
      and: [{ id: { in: roleIDs } }, { status: { equals: ROLE_STATUS.ACTIVE } }],
    },
  });

  return pickWidestDataScope(
    roles.docs.map((role) => (role as { dataScope?: DataScope }).dataScope),
  );
};

export const resolveEffectiveDataScope = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<DataScope> => {
  const cache = getRBACRequestCache(req);
  const optionsCacheKey = getDataScopeOptionsCacheKey(options);

  if (!cache.effectiveDataScopeByOptions) {
    cache.effectiveDataScopeByOptions = new Map();
  }

  const cached = cache.effectiveDataScopeByOptions.get(optionsCacheKey);

  if (cached) {
    return cached;
  }

  const result = resolveEffectiveDataScopeUncached(req, options);
  cache.effectiveDataScopeByOptions.set(optionsCacheKey, result);

  return await result;
};

/**
 * Collect visible user IDs for hierarchy scope:
 * current user + direct/indirect descendants from `parent` / `parentPath`.
 */
const getHierarchyVisibleUserIdsUncached = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<string[]> => {
  const usersCollectionSlug = options.usersCollectionSlug ?? DEFAULT_USERS_COLLECTION;
  const user = req.user as RequestUser | undefined;
  const userId = user?.id;

  if (!userId) {
    return [];
  }

  const selfId = String(userId);

  const descendants = await req.payload.find({
    collection: usersCollectionSlug,
    depth: 0,
    limit: 0,
    pagination: false,
    req,
    where: {
      or: [
        { parent: { equals: selfId } },
        { parentPath: { equals: selfId } },
        { parentPath: { contains: `${selfId}${PARENT_PATH_SEPARATOR}` } },
      ],
    },
  });

  const ids = new Set<string>([selfId]);

  for (const doc of descendants.docs) {
    const id = toID(doc as UserRoleRef);
    if (id) {
      ids.add(id);
    }
  }

  return [...ids];
};

export const getHierarchyVisibleUserIds = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<string[]> => {
  const cache = getRBACRequestCache(req);
  const optionsCacheKey = getDataScopeOptionsCacheKey(options);
  const cached = cache.hierarchyVisibleUserIds.get(optionsCacheKey);

  if (cached) {
    return cached;
  }

  const result = getHierarchyVisibleUserIdsUncached(req, options);
  cache.hierarchyVisibleUserIds.set(optionsCacheKey, result);

  return await result;
};

/**
 * Build a read `Where` filter from data scope.
 * Returns `true` when no extra filtering is required (`all` scope / super admin).
 */
export const getDataScopeReadWhere = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<Where | true> => {
  const user = req.user as RequestUser | undefined;
  const createdByField = options.createdByField ?? DEFAULT_CREATED_BY_FIELD;

  if (!user?.id) {
    return { [createdByField]: { equals: "___none___" } };
  }

  if (hasInlineSuperAdmin(user)) {
    return true;
  }

  const scope = await resolveEffectiveDataScope(req, options);

  if (scope === DATA_SCOPE.ALL) {
    return true;
  }

  const selfId = String(user.id);

  if (scope === DATA_SCOPE.OWN) {
    return { [createdByField]: { equals: selfId } };
  }

  const visibleUserIds = await getHierarchyVisibleUserIds(req, options);

  return {
    [createdByField]: {
      in: visibleUserIds.length ? visibleUserIds : [selfId],
    },
  };
};

const getCreatedById = (
  doc: Record<string, unknown>,
  createdByField: string,
): string | undefined => {
  const value = doc[createdByField];
  return toID(value as UserRoleRef) || undefined;
};

const isUsersCollection = (collectionSlug: string, usersCollectionSlug: string) =>
  collectionSlug === usersCollectionSlug;

/**
 * Guard for privileged user documents.
 * Non-super-admins cannot mutate users where `isSuperAdmin === true`.
 */
export const isProtectedSuperAdminUserDoc = (doc: Record<string, unknown>): boolean =>
  Boolean(doc.isSuperAdmin);

/**
 * Document-level access check:
 * RBAC permission (`featureCode` + `actionCode`) + data-scope evaluation.
 * Super admins bypass.
 */
export const canAccessDocumentByDataScope = async ({
  req,
  doc,
  featureCode,
  actionCode,
  collectionSlug,
  options: optionsInput,
}: {
  req: PayloadRequest;
  doc: Record<string, unknown>;
  featureCode: string;
  actionCode: string;
  collectionSlug: string;
  options?: DataScopeOptions;
}): Promise<boolean> => {
  const options = resolveDataScopeOptions(optionsInput);
  const user = req.user as RequestUser | undefined;
  const { createdByField, usersCollectionSlug } = options;

  if (!user?.id) {
    return false;
  }

  if (hasInlineSuperAdmin(user)) {
    return true;
  }

  const hasPermission = await resolvePermissionFromRoleID({
    req,
    user,
    featureCode,
    actionCode,
  });

  if (!hasPermission) {
    return false;
  }

  const scope = await resolveEffectiveDataScope(req, options);
  const creatorId = getCreatedById(doc, createdByField);

  if (!creatorId) {
    return true;
  }

  if (
    scope === DATA_SCOPE.ALL &&
    isUsersCollection(collectionSlug, usersCollectionSlug) &&
    isProtectedSuperAdminUserDoc(doc)
  ) {
    return false;
  }

  if (scope === DATA_SCOPE.ALL) {
    return true;
  }

  const selfId = String(user.id);

  if (scope === DATA_SCOPE.OWN) {
    return creatorId === selfId;
  }

  const visibleUserIds = await getHierarchyVisibleUserIds(req, options);
  return visibleUserIds.includes(creatorId);
};

/**
 * Merge an existing `where` with scope-derived constraints.
 */
export const mergeDataScopeWhere = (base: Where | undefined, scopeWhere: Where | true): Where => {
  if (scopeWhere === true) {
    return base ?? {};
  }

  if (!base || Object.keys(base).length === 0) {
    return scopeWhere;
  }

  return {
    and: [base, scopeWhere],
  };
};

/**
 * Access helper for collection `read`:
 * RBAC permission check + data-scope `Where` filter.
 */
const getPermissionAndDataScopeReadAccess = ({
  featureCode,
  actionCode,
  options: optionsInput,
}: {
  featureCode: string;
  actionCode: string;
  options?: DataScopeOptions;
}) => {
  const options = resolveDataScopeOptions(optionsInput);

  return async ({ req }: { req: PayloadRequest }) => {
    const hasPermission = await getBasePermissionAccess({
      featureCode,
      actionCode,
    })({
      req,
    });

    if (!hasPermission) {
      return false;
    }

    return getDataScopeReadWhere(req, options);
  };
};

/**
 * Access helper for document mutations (`update`/`delete`):
 * load target document then apply RBAC + data-scope checks.
 */
const getPermissionAndDataScopeModifyAccess = ({
  featureCode,
  actionCode,
  collectionSlug,
  options: optionsInput,
}: PermissionAccessBaseArgs & Omit<GetPermissionAccessModifyArgs, "mode">) => {
  const options = resolveDataScopeOptions(optionsInput);

  return async ({ req, id }: { req: PayloadRequest; id?: string | number }) => {
    if (!id) {
      return false;
    }

    const doc = await req.payload.findByID({
      collection: collectionSlug ?? featureCode,
      id,
      depth: 0,
      req,
    });

    return canAccessDocumentByDataScope({
      req,
      doc: doc as Record<string, unknown>,
      featureCode,
      actionCode,
      collectionSlug: collectionSlug ?? featureCode,
      options,
    });
  };
};

/**
 * Unified access entrypoint.
 *
 * Modes (`GetPermissionAccessArgs`):
 * - permission-only — default; boolean check, no `options` or `collectionSlug`
 * - read + data scope — pass `options` (no `mode: "modify"`)
 * - modify + data scope — `mode: "modify"`; `collectionSlug` optional (defaults to `featureCode`)
 */

export const getPermissionAccess = (args: GetPermissionAccessArgs) => {
  const { featureCode, actionCode } = args;

  if (args.mode === "modify") {
    return getPermissionAndDataScopeModifyAccess({
      featureCode,
      actionCode,
      collectionSlug: args.collectionSlug ?? featureCode,
      options: args.options,
    });
  }

  if ("options" in args) {
    return getPermissionAndDataScopeReadAccess({
      featureCode,
      actionCode,
      options: args.options,
    });
  }

  return getBasePermissionAccess({ featureCode, actionCode });
};
