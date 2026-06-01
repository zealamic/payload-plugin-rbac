import { Access, type PayloadRequest, type Where } from "payload"
import type { DataScope } from "../../collections/roles/types.js"
import { STATUS as PERMISSION_STATUS } from "../constants/permission.js"
import { DATA_SCOPE, STATUS as ROLE_STATUS } from "../constants/role.js"
import { PARENT_PATH_SEPARATOR } from "../constants/user.js"
import { toID } from "./data.js"

type UserRoleRef =
  | number
  | string
  | {
      id?: number | string
      isSuperAdmin?: boolean | null
      dataScope?: DataScope
    }

type RequestUser = {
  id?: number | string
  roles?: UserRoleRef[] | null
  isSuperAdmin?: boolean | null
}

export type DataScopeOptions = {
  /** Field on business collections storing the creator user id. Default: `createdBy`. */
  createdByField?: string
  /** Users collection slug. Default: `users`. */
  usersCollectionSlug?: string
}

const DEFAULT_CREATED_BY_FIELD = "createdBy"
const DEFAULT_USERS_COLLECTION = "users"

const SCOPE_PRIORITY: Record<DataScope, number> = {
  [DATA_SCOPE.OWN]: 0,
  [DATA_SCOPE.HIERARCHY]: 1,
  [DATA_SCOPE.ALL]: 2,
}

/** Role references from `req.user`, normalized to an empty array when missing. */
const getRoleRefs = (user: RequestUser): UserRoleRef[] => user.roles ?? []

const getRoleIds = (user: RequestUser): string[] =>
  getRoleRefs(user)
    .map((ref) => toID(ref))
    .filter((id): id is string => Boolean(id))

/**
 * True when `isSuperAdmin` is already on the session user (no DB round-trip).
 * Used before falling back to `resolveSuperAdminFromUserID`.
 */
const hasInlineSuperAdmin = (user: RequestUser | null | undefined): boolean => {
  if (!user) {
    return false
  }
  return Boolean(user.isSuperAdmin)
}

const pickWidestDataScope = (scopes: Array<DataScope | null | undefined>): DataScope => {
  let widest: DataScope = DATA_SCOPE.OWN

  for (const scope of scopes) {
    if (!scope) {
      continue
    }
    if (SCOPE_PRIORITY[scope] > SCOPE_PRIORITY[widest]) {
      widest = scope
    }
  }

  return widest
}

/**
 * Loads the user from the `users` collection and checks `isSuperAdmin`.
 * Ensures super-admin status reflects persisted data when the session payload is stale or partial.
 */
const resolveSuperAdminFromUserID = async ({
  req,
  user,
}: {
  req: PayloadRequest
  user: RequestUser
}): Promise<boolean> => {
  if (!user.id) {
    return false
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
  })

  return userDocs.docs.length > 0
}

/**
 * Grants access when any of the user's roles has an enabled `roles-permissions` row
 * for an active permission matching `featureCode` and `actionCode`.
 */
const resolvePermissionFromRoleID = async ({
  req,
  user,
  featureCode,
  actionCode,
}: {
  req: PayloadRequest
  user: RequestUser
  featureCode: string
  actionCode: string
}): Promise<boolean> => {
  const roleIDs = getRoleIds(user)
  if (!roleIDs.length) {
    return false
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
  })

  if (!permissions.docs.length) {
    return false
  }
  const permissionIDs = permissions.docs.map((item) => item.id)
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
  })

  return rolePermissions.docs.length > 0
}

/**
 * Payload access helper: allow only super admins.
 * Checks inline `isSuperAdmin` on `req.user`, then the `users` collection.
 */
export const getSuperAdminAccess = async ({ req }: { req: PayloadRequest }) => {
  const user = req.user as RequestUser | undefined
  if (!user) {
    return false
  }

  if (hasInlineSuperAdmin(user)) {
    return true
  }

  return await resolveSuperAdminFromUserID({ req, user })
}

/**
 * Payload access helper: allow the document owner (`req.user.id === id`) or a super admin.
 */
export const getAuthenticatedOrSuperAdminAccess: Access | Promise<boolean> = async ({
  req,
  id,
}) => {
  const user = req.user as RequestUser | undefined
  if (!user?.id) {
    return false
  }

  if (String(user.id) === String(id)) {
    return true
  }

  if (hasInlineSuperAdmin(user)) {
    return true
  }
  return await resolveSuperAdminFromUserID({ req, user })
}

/**
 * Returns a Payload access function for a feature/action pair (e.g. `users` + `read`).
 * Super admins bypass; others are checked via roles and `roles-permissions`.
 */
export const getPermissionAccess = ({
  featureCode,
  actionCode,
}: {
  featureCode: string
  actionCode: string
}) => {
  return async ({ req }: { req: PayloadRequest }) => {
    const user = req.user as RequestUser | undefined
    if (!user) {
      return false
    }

    if (hasInlineSuperAdmin(user)) {
      return true
    }

    return await resolvePermissionFromRoleID({
      req,
      user,
      featureCode,
      actionCode,
    })
  }
}

/**
 * Resolves the effective data scope for the current user from active roles.
 * Widest scope wins: `all` > `hierarchy` > `own`.
 */
export const resolveEffectiveDataScope = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<DataScope> => {
  const user = req.user as RequestUser | undefined

  if (!user) {
    return DATA_SCOPE.OWN
  }

  if (hasInlineSuperAdmin(user)) {
    return DATA_SCOPE.ALL
  }

  const roleRefs = getRoleRefs(user)
  const roleIDs = getRoleIds(user)

  if (!roleIDs.length) {
    return DATA_SCOPE.OWN
  }

  const inlineScopes = roleRefs
    .filter(
      (ref): ref is { id?: string | number; dataScope?: DataScope } =>
        typeof ref === "object" && ref !== null,
    )
    .map((ref) => ref.dataScope)
    .filter((scope): scope is DataScope => Boolean(scope))

  if (inlineScopes.length === roleRefs.length) {
    return pickWidestDataScope(inlineScopes)
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
  })

  return pickWidestDataScope(
    roles.docs.map((role) => (role as { dataScope?: DataScope }).dataScope),
  )
}

/**
 * User IDs visible under hierarchy: self + direct/indirect subordinates (via `parent` / `parentPath`).
 */
export const getHierarchyVisibleUserIds = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<string[]> => {
  const usersCollectionSlug = options.usersCollectionSlug ?? DEFAULT_USERS_COLLECTION
  const user = req.user as RequestUser | undefined
  const userId = user?.id

  if (!userId) {
    return []
  }

  const selfId = String(userId)

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
  })

  const ids = new Set<string>([selfId])

  for (const doc of descendants.docs) {
    const id = toID(doc as UserRoleRef)
    if (id) {
      ids.add(id)
    }
  }

  return [...ids]
}

/**
 * Payload `where` clause limiting reads to documents the user may see for their data scope.
 * Returns `true` when no extra filter is needed (super admin or `all` scope).
 */
export const getDataScopeReadWhere = async (
  req: PayloadRequest,
  options: DataScopeOptions = {},
): Promise<Where | true> => {
  const user = req.user as RequestUser | undefined
  const createdByField = options.createdByField ?? DEFAULT_CREATED_BY_FIELD

  if (!user?.id) {
    return { [createdByField]: { equals: "___none___" } }
  }

  if (hasInlineSuperAdmin(user)) {
    return true
  }

  const scope = await resolveEffectiveDataScope(req, options)

  if (scope === DATA_SCOPE.ALL) {
    return true
  }

  const selfId = String(user.id)

  if (scope === DATA_SCOPE.OWN) {
    return { [createdByField]: { equals: selfId } }
  }

  const visibleUserIds = await getHierarchyVisibleUserIds(req, options)

  return {
    [createdByField]: {
      in: visibleUserIds.length ? visibleUserIds : [selfId],
    },
  }
}

const getCreatedById = (
  doc: Record<string, unknown>,
  createdByField: string,
): string | undefined => {
  const value = doc[createdByField]
  return toID(value as UserRoleRef) || undefined
}

const isUsersCollection = (collectionSlug: string, usersCollectionSlug: string) =>
  collectionSlug === usersCollectionSlug

/**
 * Whether the target user document is protected from update/delete by non–super-admins
 * (`isSuperAdmin === true`). Applies to `DATA_SCOPE.ALL` on the users collection.
 */
export const isProtectedSuperAdminUserDoc = (doc: Record<string, unknown>): boolean =>
  Boolean(doc.isSuperAdmin)

/**
 * Checks if the current user may perform `actionCode` on `doc` under data scope rules.
 * Requires an enabled role permission for `featureCode` + `actionCode` (super admins bypass).
 */
export const canAccessDocumentByDataScope = async ({
  req,
  doc,
  featureCode,
  actionCode,
  collectionSlug,
  options = {},
}: {
  req: PayloadRequest
  doc: Record<string, unknown>
  featureCode: string
  actionCode: string
  collectionSlug: string
  options?: DataScopeOptions
}): Promise<boolean> => {
  const user = req.user as RequestUser | undefined
  const createdByField = options.createdByField ?? DEFAULT_CREATED_BY_FIELD
  const usersCollectionSlug = options.usersCollectionSlug ?? DEFAULT_USERS_COLLECTION

  if (!user?.id) {
    return false
  }

  if (hasInlineSuperAdmin(user)) {
    return true
  }

  const hasPermission = await resolvePermissionFromRoleID({
    req,
    user,
    featureCode,
    actionCode,
  })

  if (!hasPermission) {
    return false
  }

  const scope = await resolveEffectiveDataScope(req, options)
  const creatorId = getCreatedById(doc, createdByField)

  if (!creatorId) {
    return true
  }

  if (
    scope === DATA_SCOPE.ALL &&
    isUsersCollection(collectionSlug, usersCollectionSlug) &&
    isProtectedSuperAdminUserDoc(doc)
  ) {
    return false
  }

  if (scope === DATA_SCOPE.ALL) {
    return true
  }

  const selfId = String(user.id)

  if (scope === DATA_SCOPE.OWN) {
    return creatorId === selfId
  }

  const visibleUserIds = await getHierarchyVisibleUserIds(req, options)
  return visibleUserIds.includes(creatorId)
}

/**
 * Merges a base `where` with data-scope read constraints.
 */
export const mergeDataScopeWhere = (base: Where | undefined, scopeWhere: Where | true): Where => {
  if (scopeWhere === true) {
    return base ?? {}
  }

  if (!base || Object.keys(base).length === 0) {
    return scopeWhere
  }

  return {
    and: [base, scopeWhere],
  }
}

/**
 * Combines RBAC permission check with data-scope read filter for collection `read` access.
 */
export const getPermissionAndDataScopeReadAccess = ({
  featureCode,
  actionCode,
  options = {},
}: {
  featureCode: string
  actionCode: string
  options?: DataScopeOptions
}) => {
  return async ({ req }: { req: PayloadRequest }) => {
    const hasPermission = await getPermissionAccess({ featureCode, actionCode })({
      req,
    })

    if (!hasPermission) {
      return false
    }

    return getDataScopeReadWhere(req, options)
  }
}

/**
 * Collection document access with permission (`featureCode` + `actionCode`) and data scope.
 */
export const getPermissionAndDataScopeMutationAccess = ({
  featureCode,
  actionCode,
  collectionSlug,
  options = {},
}: {
  featureCode: string
  actionCode: string
  collectionSlug: string
  options?: DataScopeOptions
}) => {
  return async ({ req, id }: { req: PayloadRequest; id?: string | number }) => {
    if (!id) {
      return false
    }

    const doc = await req.payload.findByID({
      collection: collectionSlug,
      id,
      depth: 0,
      req,
    })

    return canAccessDocumentByDataScope({
      req,
      doc: doc as Record<string, unknown>,
      featureCode,
      actionCode,
      collectionSlug,
      options,
    })
  }
}
