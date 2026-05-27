import type { CollectionConfig } from "payload";
import { STATUS } from "../../lib/constants/permission.js";
import {
  getArrayOfMergedFieldAffectingData,
  getSuperAdminAccess,
  toLocaleRecord,
  toSelectPlaceholder,
} from "../../lib/utils/index.js";
import type { PermissionsCollectionParams } from "./types.js";

export const getPermissionsCollection = (
  params: PermissionsCollectionParams,
) => {
  const {
    translations = {},
    access = {},
    fields = [],
    labels = {},
    admin = {},
  } = params || {};
  const arrTranslationsKeys = Object.keys(translations);
  const permissions: CollectionConfig = {
    slug: "permissions",
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
      useAsTitle: "name",
      defaultColumns: [
        "name",
        "permissionFeature",
        "permissionAction",
        "status",
        "updatedAt",
      ],
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
          name: "name",
          type: "text",
          required: true,
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.name?.label,
          ),
          admin: {
            placeholder: toLocaleRecord(
              arrTranslationsKeys,
              (locale) => translations[locale]?.fields?.name?.placeholder,
            ),
          },
        },
        {
          name: "permissionFeature",
          type: "relationship",
          required: true,
          relationTo: "permission-features",
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.permissionFeature?.label,
          ),
          admin: {
            placeholder: toSelectPlaceholder(
              arrTranslationsKeys,
              (locale) =>
                translations[locale]?.fields?.permissionFeature?.placeholder,
            ),
          },
        },
        {
          name: "permissionAction",
          type: "relationship",
          required: true,
          relationTo: "permission-actions",
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.permissionAction?.label,
          ),
          admin: {
            placeholder: toSelectPlaceholder(
              arrTranslationsKeys,
              (locale) =>
                translations[locale]?.fields?.permissionAction?.placeholder,
            ),
          },
        },
        {
          name: "sortOrder",
          type: "number",
          required: false,
          defaultValue: 0,
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.sortOrder?.label,
          ),
          admin: {
            placeholder: toLocaleRecord(
              arrTranslationsKeys,
              (locale) => translations[locale]?.fields?.sortOrder?.placeholder,
            ),
          },
        },
        {
          name: "status",
          type: "select",
          required: true,
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.status?.label,
          ),
          defaultValue: STATUS.ACTIVE,
          options: Object.values(STATUS).map((status) => ({
            label: toLocaleRecord(
              arrTranslationsKeys,
              (locale) =>
                translations[locale]?.fields?.status?.[`${status}Label`],
            ),
            value: status,
          })),
          admin: {
            placeholder: toSelectPlaceholder(
              arrTranslationsKeys,
              (locale) => translations[locale]?.fields?.status?.placeholder,
            ),
          },
        },
      ],
    }),
    timestamps: true,
  };

  return permissions;
};
