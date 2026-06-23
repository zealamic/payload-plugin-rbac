import type { Config, Field } from "payload";
import {
  getArrayOfMergedFieldAffectingData,
  getPermissionAccess,
  toLocaleRecord,
} from "../../lib/utils/index.js";
import { mergeUserCollectionHooks } from "./parent-path.js";
import type { UsersModificationParams, UsersModificationTranslations } from "./types.js";

const buildDefaultFields = (
  translations: UsersModificationTranslations,
  userSlug: string,
): Field[] => {
  const locales = Object.keys(translations);
  return [
    {
      name: "isSuperAdmin",
      type: "checkbox",
      defaultValue: false,
      label: toLocaleRecord(locales, (locale) => translations[locale]?.fields?.isSuperAdmin?.label),
      admin: {
        readOnly: true,
      },
    },
    {
      name: "roles",
      type: "relationship",
      relationTo: "roles",
      hasMany: true,
      label: toLocaleRecord(locales, (locale) => translations[locale]?.fields?.roles?.label),
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: userSlug,
      hasMany: false,
      label: toLocaleRecord(locales, (locale) => translations[locale]?.fields?.parent?.label),
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
    };

    const pluginFields = getArrayOfMergedFieldAffectingData({
      defaultFields: buildDefaultFields(translations, userSlug),
      fields: customFields,
    });

    const existing = (config.collections || []).find((c) => c.slug === userSlug);

    const dataScopeOptions = {
      createdByField: "id",
      usersCollectionSlug: userSlug,
    } as const;

    const defaultAccess = {
      create: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "create",
      }),
      update: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "update",
        mode: "modify",
        options: dataScopeOptions,
      }),
      delete: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "delete",
        mode: "modify",
        options: dataScopeOptions,
      }),
      read: getPermissionAccess({
        featureCode: userSlug,
        actionCode: "read",
        options: dataScopeOptions,
      }),
    };

    if (existing) {
      config.collections = (config.collections || []).map((collection) => {
        if (collection.slug !== userSlug) {
          return collection;
        }
        return {
          ...collection,
          fields: [...pluginFields, ...collection.fields],
          access: {
            create: collection.access?.create ?? defaultAccess.create,
            read: collection.access?.read ?? defaultAccess.read,
            update: collection.access?.update ?? defaultAccess.update,
            delete: collection.access?.delete ?? defaultAccess.delete,
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
