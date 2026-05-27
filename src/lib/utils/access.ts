import { Access, PayloadRequest } from "payload";
import { STATUS as PERMISSION_STATUS } from "../constants/permission.js";
import { toID } from "./data.js";

type UserRoleRef =
  | number
  | string
  | { id?: number | string; isSuperAdmin?: boolean | null };
type RequestUser = {
  id?: number | string;
  roles?: UserRoleRef[] | null;
  isSuperAdmin?: boolean | null;
};

/** Role references from `req.user`, normalized to an empty array when missing. */
const getRoleRefs = (user: RequestUser): UserRoleRef[] => user.roles ?? [];

/**
 * True when `isSuperAdmin` is already on the session user (no DB round-trip).
 * Used before falling back to `resolveSuperAdminFromUserID`.
 */
const hasInlineSuperAdmin = (user: RequestUser | null | undefined): boolean => {
  if (!user) {
    return false;
  }
  return Boolean(user.isSuperAdmin);
};

/**
 * Loads the user from the `users` collection and checks `isSuperAdmin`.
 * Ensures super-admin status reflects persisted data when the session payload is stale or partial.
 */
const resolveSuperAdminFromUserID = async ({
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
  req: PayloadRequest;
  user: RequestUser;
  featureCode: string;
  actionCode: string;
}): Promise<boolean> => {
  const roleRefs = getRoleRefs(user);
  if (!roleRefs.length) {
    return false;
  }

  const roleIDs = roleRefs
    .map((ref) => toID(ref))
    .filter((id): id is string => typeof id === "string");
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

/**
 * Payload access helper: allow only super admins.
 * Checks inline `isSuperAdmin` on `req.user`, then the `users` collection.
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
 * Payload access helper: allow the document owner (`req.user.id === id`) or a super admin.
 */
export const getAuthenticatedOrSuperAdminAccess:
  | Access
  | Promise<boolean> = async ({ req, id }) => {
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
 * Returns a Payload access function for a feature/action pair (e.g. `users` + `read`).
 * Super admins bypass; others are checked via roles and `roles-permissions`.
 */
export const getPermissionAccess = ({
  featureCode,
  actionCode,
}: {
  featureCode: string;
  actionCode: string;
}) => {
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
