import type { Config, Field, PayloadRequest } from "payload";
import {
  getArrayOfMergedFieldAffectingData,
  getPermissionAccess,
  toLocaleRecord,
} from "../../lib/utils/index.js";
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
  ];
};

export const modifyUsersCollection = (params: UsersModificationParams = {}) => {
  const { translations = {}, fields: customFields = [] } = params;

  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig };
    const userSlug = config.admin?.user || "users";
    const pluginFields = getArrayOfMergedFieldAffectingData({
      defaultFields: buildDefaultFields(translations),
      fields: customFields,
    });

    const existing = (config.collections || []).find(
      (c) => c.slug === userSlug,
    );

    const defaultAccess = {
      create: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "create",
      }),
      update: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "update",
      }),
      delete: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "delete",
      }),
      read: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "read",
      }),
      readVersions: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "readVersions",
      }),
      unlock: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "unlock",
      }),
      admin: ({ req }: { req: PayloadRequest }) => {
        return getPermissionAccess({
          featureCode: userSlug,
          actionCode: "admin",
        })({ req });
      },
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
        };
      });
    } else {
      config.collections = [
        ...(config.collections || []),
        {
          slug: userSlug,
          auth: true,
          fields: pluginFields,
          access: defaultAccess,
        },
      ];
    }

    return config;
  };
};
