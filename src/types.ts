// Collections types
import type * as PermissionActionTypes from "./collections/permission-actions/types.js";
import type * as PermissionFeatureTypes from "./collections/permission-features/types.js";
import type * as PermissionTypes from "./collections/permissions/types.js";
import type * as RoleTypes from "./collections/roles/types.js";
import type * as RolePermissionTypes from "./collections/roles-permissions/types.js";
import type * as UsersTypes from "./collections/users/types.js";

// Components types
import type * as RolePermissionMatrixClientTypes from "./components/role-permission-matrix-client/types.js";

export * from "./collections/permission-actions/types.js";
export * from "./collections/permission-features/types.js";
export * from "./collections/permissions/types.js";
export * from "./collections/roles/types.js";
export * from "./collections/roles-permissions/types.js";
export * from "./collections/users/types.js";
export * from "./components/role-permission-matrix-client/types.js";

export type RBACTranslations = {
  [locale: string]: {
    // Collections types
    collections?: {
      permissionActions?: PermissionActionTypes.PermissionActionsCollectionTranslations[string];
      permissionFeatures?: PermissionFeatureTypes.PermissionFeaturesCollectionTranslations[string];
      permissions?: PermissionTypes.PermissionsCollectionTranslations[string];
      roles?: RoleTypes.RolesCollectionTranslations[string];
      rolesPermissions?: RolePermissionTypes.RolesPermissionsCollectionTranslations[string];
      users?: UsersTypes.UsersModificationTranslations[string];
    };
    // Components types
    components?: {
      rolePermissionMatrix?: RolePermissionMatrixClientTypes.RolePermissionMatrixClientTranslations[string];
    };
  };
};
