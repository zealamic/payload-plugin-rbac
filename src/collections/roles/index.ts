import type { CollectionConfig, Condition } from "payload";
import { DATA_SCOPE, STATUS } from "../../lib/constants/role.js";
import {
  getArrayOfMergedFieldAffectingData,
  getSuperAdminAccess,
  toLocaleRecord,
  toSelectPlaceholder,
} from "../../lib/utils/index.js";
import { syncPermissionMatrixDraftAfterChange } from "./hooks/sync-permission-matrix-draft.js";
import type { RolesCollectionParams } from "./types.js";

export const getRolesCollection = (params: RolesCollectionParams) => {
  const {
    translations = {},
    access = {},
    fields = [],
    labels = {},
    admin = {},
  } = params || {};
  const arrTranslationsKeys = Object.keys(translations);
  const roles: CollectionConfig = {
    slug: "roles",
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
      defaultColumns: ["code", "name", "description", "status", "updatedAt"],
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
    hooks: {
      afterChange: [syncPermissionMatrixDraftAfterChange],
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
          name: "description",
          type: "text",
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.description?.label,
          ),
          admin: {
            placeholder: toLocaleRecord(
              arrTranslationsKeys,
              (locale) =>
                translations[locale]?.fields?.description?.placeholder,
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
        {
          name: "dataScope",
          type: "select",
          required: true,
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.dataScope?.label,
          ),
          defaultValue: DATA_SCOPE.OWN,
          options: Object.values(DATA_SCOPE).map((dataScope) => ({
            label: toLocaleRecord(
              arrTranslationsKeys,
              (locale) =>
                translations[locale]?.fields?.dataScope?.[`${dataScope}Label`],
            ),
            value: dataScope,
          })),
          admin: {
            placeholder: toSelectPlaceholder(
              arrTranslationsKeys,
              (locale) => translations[locale]?.fields?.dataScope?.placeholder,
            ),
          },
        },
        {
          name: "permissionMatrixDraft",
          type: "json",
          label: toLocaleRecord(
            arrTranslationsKeys,
            (locale) => translations[locale]?.fields?.permissionMatrix?.label,
          ),
          admin: {
            components: {
              Field:
                "payload-auth-rbac-plugin/client#RolePermissionMatrixClient",
            },
            condition: ((_, __, { operation }) =>
              operation === "update") satisfies Condition,
          },
        },
      ],
    }),
    timestamps: true,
  };

  return roles;
};
