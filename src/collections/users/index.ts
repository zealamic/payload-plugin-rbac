import type { Config, Field, PayloadRequest } from "payload";
import {
  getArrayOfMergedFieldAffectingData,
  getPermissionAccess,
  getPermissionAndDataScopeMutationAccess,
  getPermissionAndDataScopeReadAccess,
  toLocaleRecord,
} from "../../lib/utils/index.js";
import { mergeUserCollectionHooks } from "./parent-path.js";
import type {
  UsersModificationParams,
  UsersModificationTranslations,
} from "./types.js";

const buildDefaultFields = (
  translations: UsersModificationTranslations,
): Field[] => {
  const locales = Object.keys(translations);
  return [
    {
      name: "isSuperAdmin",
      type: "checkbox",
      defaultValue: false,
      label: toLocaleRecord(
        locales,
        (locale) => translations[locale]?.fields?.isSuperAdmin?.label,
      ),
      admin: {
        readOnly: true,
      },
    },
    {
      name: "roles",
      type: "relationship",
      relationTo: "roles",
      hasMany: true,
      label: toLocaleRecord(
        locales,
        (locale) => translations[locale]?.fields?.roles?.label,
      ),
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "users",
      label: toLocaleRecord(
        locales,
        (locale) => translations[locale]?.fields?.parent?.label,
      ),
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    {
      name: "parentPath",
      type: "text",
      index: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
  ];
};

export const modifyUsersCollection = (params: UsersModificationParams = {}) => {
  const { translations = {}, fields: customFields = [] } = params;

  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig };
    const userSlug = config.admin?.user || "users";

    const customAdmin = {
      defaultColumns: ["email", "roles", "isSuperAdmin", "updatedAt"],
      useAsTitle: "email",
      ...config.admin,
    };

    const pluginFields = getArrayOfMergedFieldAffectingData({
      defaultFields: buildDefaultFields(translations),
      fields: customFields,
    });

    const existing = (config.collections || []).find(
      (c) => c.slug === userSlug,
    );
    const dataScopeOptions = {
      createdByField: "id",
      usersCollectionSlug: userSlug,
    } as const;

    const defaultAccess = {
      create: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "create",
      }),
      update: getPermissionAndDataScopeMutationAccess({
        featureCode: userSlug,
        actionCode: "update",
        collectionSlug: userSlug,
        options: dataScopeOptions,
      }),
      delete: getPermissionAndDataScopeMutationAccess({
        featureCode: userSlug,
        actionCode: "delete",
        collectionSlug: userSlug,
        options: dataScopeOptions,
      }),
      read: getPermissionAndDataScopeReadAccess({
        featureCode: userSlug,
        actionCode: "read",
        options: dataScopeOptions,
      }),
      readVersions: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "readVersions",
      }),
      unlock: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "unlock",
      }),
      // admin: ({ req }: { req: PayloadRequest }) => {
      //   return getPermissionAccess({
      //     featureCode: userSlug,
      //     actionCode: "admin",
      //   })({ req })
      // },
    };

    if (existing) {
      config.collections = (config.collections || []).map((collection) => {
        if (collection.slug !== userSlug) {
          return collection;
        }
        return {
          ...collection,
          fields: [...collection.fields, ...pluginFields],
          access: {
            ...defaultAccess,
            ...collection.access,
          },
          hooks: mergeUserCollectionHooks({
            existingHooks: collection.hooks,
            userSlug,
          }),
        };
      });
    } else {
      config.collections = [
        ...(config.collections || []),
        {
          slug: userSlug,
          auth: true,
          admin: customAdmin,
          fields: pluginFields,
          access: defaultAccess,
          hooks: mergeUserCollectionHooks({ userSlug }),
        },
      ];
    }

    return config;
  };
};
