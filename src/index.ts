import type { Config } from "payload";
import { permissionActionsDefaultTranslations } from "./collections/permission-actions/default-data.js";
import { getPermissionActionsCollection } from "./collections/permission-actions/index.js";
import { permissionFeaturesDefaultTranslations } from "./collections/permission-features/default-data.js";
import { getPermissionFeaturesCollection } from "./collections/permission-features/index.js";
import { permissionsDefaultTranslations } from "./collections/permissions/default-data.js";
import { getPermissionsCollection } from "./collections/permissions/index.js";
import { rolesDefaultTranslations } from "./collections/roles/default-data.js";
import { getRolesCollection } from "./collections/roles/index.js";
import { rolesPermissionsDefaultTranslations } from "./collections/roles-permissions/default-data.js";
import { getRolesPermissionsCollection } from "./collections/roles-permissions/index.js";
import { usersDefaultTranslations } from "./collections/users/default-data.js";
import { modifyUsersCollection } from "./collections/users/index.js";
import { permissionActionReorderClientDefaultTranslations } from "./components/permission-action-reorder-client/default-data.js";
import { permissionFeatureReorderClientDefaultTranslations } from "./components/permission-feature-reorder-client/default-data.js";
import { rolePermissionMatrixClientDefaultTranslations } from "./components/role-permission-matrix-client/default-data.js";

import {
  getAllTranslationsOfSpecificObject,
  getMergedTranslations,
  type TranslationValue,
} from "./lib/utils/index.js";
import type {
  PayloadPluginRBACConfig,
  PermissionActionsCollectionTranslations,
  PermissionFeaturesCollectionTranslations,
  PermissionsCollectionTranslations,
  RolesCollectionTranslations,
  RolesPermissionsCollectionTranslations,
  UsersModificationTranslations,
} from "./types.js";

export * from "./lib/constants/index.js";
export * from "./lib/utils/index.js";
export type * from "./types.js";

export const payloadPluginRBAC =
  (pluginOptions: PayloadPluginRBACConfig) =>
  (config: Config): Config => {
    if (!config.collections) {
      config.collections = [];
    }

    if (!pluginOptions.translations) {
      pluginOptions.translations = {};
    }

    config.collections.push(
      getPermissionActionsCollection({
        ...pluginOptions.collections?.permissionActions,
        translations: getMergedTranslations({
          defaultTranslations: permissionActionsDefaultTranslations,
          translations: getAllTranslationsOfSpecificObject<PermissionActionsCollectionTranslations>(
            {
              translations: pluginOptions.translations,
              path: "collections.permissionActions",
            },
          ),
        }),
      }),
    );
    config.collections.push(
      getPermissionFeaturesCollection({
        ...pluginOptions.collections?.permissionFeatures,
        translations: getMergedTranslations({
          defaultTranslations: permissionFeaturesDefaultTranslations,
          translations:
            getAllTranslationsOfSpecificObject<PermissionFeaturesCollectionTranslations>({
              translations: pluginOptions.translations,
              path: "collections.permissionFeatures",
            }),
        }),
      }),
    );
    config.collections.push(
      getPermissionsCollection({
        ...pluginOptions.collections?.permissions,
        translations: getMergedTranslations({
          defaultTranslations: permissionsDefaultTranslations,
          translations: getAllTranslationsOfSpecificObject<PermissionsCollectionTranslations>({
            translations: pluginOptions.translations,
            path: "collections.permissions",
          }),
        }),
      }),
    );
    config.collections.push(
      getRolesCollection({
        ...pluginOptions.collections?.roles,
        components: {
          rolePermissionMatrixField: pluginOptions.components?.rolePermissionMatrixField,
        },
        translations: getMergedTranslations({
          defaultTranslations: rolesDefaultTranslations,
          translations: getAllTranslationsOfSpecificObject<RolesCollectionTranslations>({
            translations: pluginOptions.translations,
            path: "collections.roles",
          }),
        }),
      }),
    );
    config.collections.push(
      getRolesPermissionsCollection({
        ...pluginOptions.collections?.rolesPermissions,
        translations: getMergedTranslations({
          defaultTranslations: rolesPermissionsDefaultTranslations,
          translations: getAllTranslationsOfSpecificObject<RolesPermissionsCollectionTranslations>({
            translations: pluginOptions.translations,
            path: "collections.rolesPermissions",
          }),
        }),
      }),
    );

    if (pluginOptions.autoModifyUsersCollection !== false) {
      config = modifyUsersCollection({
        translations: getMergedTranslations({
          defaultTranslations: usersDefaultTranslations,
          translations: getAllTranslationsOfSpecificObject<UsersModificationTranslations>({
            translations: pluginOptions.translations,
            path: "collections.users",
          }),
        }),
      })(config);
    }

    /**
     * If the plugin is disabled, we still want to keep added collections/fields so the database schema is consistent which is important for migrations.
     * If your plugin heavily modifies the database schema, you may want to remove this property.
     */
    if (pluginOptions.disabled) {
      return config;
    }

    const incomingOnInit = config.onInit;

    config.onInit = async (payload) => {
      if (incomingOnInit) {
        await incomingOnInit(payload);
      }
    };

    if (!config.i18n) {
      config.i18n = {};
    }
    const existingTranslations =
      (config.i18n?.translations as Record<string, Record<string, unknown>> | undefined) || {};

    const defaultRBACTranslations = {
      en: {
        collections: {
          permissionActions: permissionActionsDefaultTranslations.en,
          permissionFeatures: permissionFeaturesDefaultTranslations.en,
          permissions: permissionsDefaultTranslations.en,
          roles: rolesDefaultTranslations.en,
          rolesPermissions: rolesPermissionsDefaultTranslations.en,
          users: usersDefaultTranslations.en,
        },
        components: {
          permissionActionReorder: permissionActionReorderClientDefaultTranslations.en,
          permissionFeatureReorder: permissionFeatureReorderClientDefaultTranslations.en,
          rolePermissionMatrix: rolePermissionMatrixClientDefaultTranslations.en,
        },
      },
    };

    const mergedRBACTranslations = getMergedTranslations({
      defaultTranslations: defaultRBACTranslations,
      translations: pluginOptions.translations,
    });

    const finalTranslations = getMergedTranslations({
      defaultTranslations: existingTranslations as Record<string, TranslationValue>,
      translations: mergedRBACTranslations,
    });

    config.i18n = {
      ...config.i18n,
      translations: finalTranslations,
    };
    return config;
  };
