// Collections types
import type * as PermissionActionTypes from "./collections/permission-actions/types.js";
import type * as PermissionFeatureTypes from "./collections/permission-features/types.js";
import type * as PermissionTypes from "./collections/permissions/types.js";
import type * as RoleTypes from "./collections/roles/types.js";
import type * as RolePermissionTypes from "./collections/roles-permissions/types.js";
import type * as UsersTypes from "./collections/users/types.js";

// Components types
import type * as PermissionActionReorderClientTypes from "./components/permission-action-reorder-client/types.js";
import type * as PermissionFeatureReorderClientTypes from "./components/permission-feature-reorder-client/types.js";
import type * as RolePermissionMatrixClientTypes from "./components/role-permission-matrix-client/types.js";

export * from "./collections/permission-actions/types.js";
export * from "./collections/permission-features/types.js";
export * from "./collections/permissions/types.js";
export * from "./collections/roles/types.js";
export * from "./collections/roles-permissions/types.js";
export * from "./collections/users/types.js";
export * from "./components/permission-action-reorder-client/types.js";
export * from "./components/permission-feature-reorder-client/types.js";
export * from "./components/role-permission-matrix-client/types.js";

export type ItemRef = number | string | { id?: number | string };

export type ApiListResponse<T> = {
  docs?: T[];
};

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
      permissionActionReorder?: PermissionActionReorderClientTypes.PermissionActionReorderClientTranslations[string];
      permissionFeatureReorder?: PermissionFeatureReorderClientTypes.PermissionFeatureReorderClientTranslations[string];
      rolePermissionMatrix?: RolePermissionMatrixClientTypes.RolePermissionMatrixClientTranslations[string];
    };
  };
};

export type PayloadPluginRBACConfig = {
  /**
   * Collection slugs to augment (may include plugin-only collections absent from generated `CollectionSlug`).
   */
  collections?: Partial<
    Record<
      string,
      | Omit<PermissionActionTypes.PermissionActionsCollectionParams, "translations">
      | Omit<PermissionFeatureTypes.PermissionFeaturesCollectionParams, "translations">
      | Omit<PermissionTypes.PermissionsCollectionParams, "translations">
      | Omit<RoleTypes.RolesCollectionParams, "translations">
      | Omit<RolePermissionTypes.RolesPermissionsCollectionParams, "translations">
    >
  >;
  disabled?: boolean;
  translations?: RBACTranslations;
  autoModifyUsersCollection?: boolean;
  components?: {
    rolePermissionMatrixField?: string;
  };
};
