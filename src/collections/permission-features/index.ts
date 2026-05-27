import type { CollectionConfig } from "payload";
import { STATUS } from "../../lib/constants/permission-feature.js";
import {
  getArrayOfMergedFieldAffectingData,
  getSuperAdminAccess,
  toLocaleRecord,
  toSelectPlaceholder,
} from "../../lib/utils/index.js";
import type { PermissionFeaturesCollectionParams } from "./types.js";

export const getPermissionFeaturesCollection = (
  params: PermissionFeaturesCollectionParams,
) => {
  const {
    translations = {},
    access = {},
    fields = [],
    labels = {},
    admin = {},
  } = params || {};
  const arrTranslationsKeys = Object.keys(translations);
  const permissionFeatures: CollectionConfig = {
    slug: "permission-features",
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
      useAsTitle: "code",
      defaultColumns: ["code", "status", "updatedAt"],
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
          name: "code",
          type: "text",
          required: true,
          unique: true,
          index: true,
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.code?.label,
          ),
          admin: {
            placeholder: toLocaleRecord(
              arrTranslationsKeys,
              (locale) => translations[locale]?.fields?.code?.placeholder,
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

  return permissionFeatures;
};
