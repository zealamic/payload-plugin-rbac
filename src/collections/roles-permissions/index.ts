import type { CollectionConfig } from "payload";
import {
  getArrayOfMergedFieldAffectingData,
  getSuperAdminAccess,
  toLocaleRecord,
  toSelectPlaceholder,
} from "../../lib/utils/index.js";
import type { RolesPermissionsCollectionParams } from "./types.js";

export const getRolesPermissionsCollection = (
  params: RolesPermissionsCollectionParams,
) => {
  const {
    translations = {},
    access = {},
    fields = [],
    labels = {},
    admin = {},
  } = params || {};
  const arrTranslationsKeys = Object.keys(translations);
  const rolesPermissions: CollectionConfig = {
    slug: "roles-permissions",
    labels: {
      singular: toLocaleRecord(
        arrTranslationsKeys,
        (locale) => translations[locale]?.labels?.singular,
      ),
      plural: toLocaleRecord(
        arrTranslationsKeys,
        (locale) => translations[locale]?.labels?.plural,
      ),
      ...labels,
    },
    admin: {
      group: toLocaleRecord(
        arrTranslationsKeys,
        (locale) => translations[locale]?.admin?.group,
      ),
      useAsTitle: "role",
      defaultColumns: ["role", "permission", "enabled", "updatedAt"],
      hidden: true,
      ...admin,
    },
    access: {
      create: getSuperAdminAccess,
      update: getSuperAdminAccess,
      delete: getSuperAdminAccess,
      read: getSuperAdminAccess,
      readVersions: getSuperAdminAccess,
      unlock: getSuperAdminAccess,
      admin: ({ req }) => {
        return getSuperAdminAccess({ req });
      },
      ...access,
    },
    fields: getArrayOfMergedFieldAffectingData({
      fields,
      defaultFields: [
        {
          name: "role",
          type: "relationship",
          required: true,
          relationTo: "roles",
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.role?.label,
          ),
          admin: {
            placeholder: toSelectPlaceholder(
              arrTranslationsKeys,
              (locale) => translations[locale]?.fields?.role?.placeholder,
            ),
          },
        },
        {
          name: "permission",
          type: "relationship",
          relationTo: "permissions",
          required: true,
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.permission?.label,
          ),
          admin: {
            placeholder: toSelectPlaceholder(
              arrTranslationsKeys,
              (locale) => translations[locale]?.fields?.permission?.placeholder,
            ),
          },
        },
        {
          name: "enabled",
          type: "checkbox",
          required: false,
          defaultValue: true,
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.enabled?.label,
          ),
        },
      ],
    }),
    timestamps: true,
  };

  return rolesPermissions;
};
