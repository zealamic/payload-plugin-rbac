import type { CollectionConfig, PayloadRequest } from "payload";
import { ERROR_KEYS, SUCCESS_KEYS } from "../../lib/constants/message.js";
import { STATUS } from "../../lib/constants/permission-feature.js";
import {
  getArrayOfMergedFieldAffectingData,
  getSuperAdminAccess,
  mergeBeforeListTable,
  toLocaleRecord,
  toSelectPlaceholder,
} from "../../lib/utils/index.js";
import type { PermissionFeaturesCollectionParams } from "./types.js";

export const getPermissionFeaturesCollection = (params: PermissionFeaturesCollectionParams) => {
  const { translations = {}, access = {}, fields = [], labels = {}, admin = {} } = params || {};
  const arrTranslationsKeys = Object.keys(translations);
  const permissionFeatures: CollectionConfig = {
    slug: "permission-features",
    defaultSort: "updatedAt",
    labels: {
      singular: toLocaleRecord(
        arrTranslationsKeys,
        (locale) => translations[locale]?.labels?.singular,
      ),
      plural: toLocaleRecord(arrTranslationsKeys, (locale) => translations[locale]?.labels?.plural),
      ...labels,
    },
    admin: {
      group: toLocaleRecord(arrTranslationsKeys, (locale) => translations[locale]?.admin?.group),
      useAsTitle: "code",
      defaultColumns: ["code", "status", "updatedAt"],
      ...admin,
      components: {
        ...admin.components,
        beforeListTable: mergeBeforeListTable(
          "@zealamic/payload-plugin-rbac/client#PermissionFeatureReorderClient",
          admin.components?.beforeListTable,
        ),
      },
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
            hidden: true,
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
              (locale) => translations[locale]?.fields?.status?.[`${status}Label`],
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
    endpoints: [
      {
        path: "/reorder",
        method: "post",
        handler: async (req: PayloadRequest) => {
          try {
            if (!req.user) {
              return Response.json({ error: ERROR_KEYS.UNAUTHORIZED }, { status: 401 });
            }

            const body = req.json ? await req.json() : (req as any).body;
            const sortedItems = body?.sortedItems;

            if (!Array.isArray(sortedItems)) {
              return Response.json(
                { error: ERROR_KEYS.DATA_MUST_BE_AN_SORTED_ARRAY },
                { status: 400 },
              );
            }

            if (
              sortedItems.some(
                (item: any) =>
                  item?.id === undefined ||
                  item?.id === null ||
                  item?.sortOrder === undefined ||
                  item?.sortOrder === null,
              )
            ) {
              return Response.json(
                { error: ERROR_KEYS.ARRAY_ITEM_MUST_HAVE_ID_AND_SORT_ORDER },
                { status: 400 },
              );
            }

            const payload = req.payload;

            await Promise.all(
              sortedItems.map((item) =>
                payload.update({
                  collection: "permission-features",
                  id: item.id,
                  data: {
                    sortOrder: item.sortOrder,
                  },
                }),
              ),
            );

            return Response.json(
              { success: true, message: SUCCESS_KEYS.UPDATE_SUCCESS },
              { status: 200 },
            );
          } catch (error) {
            return Response.json(
              { error: error instanceof Error ? error.message : ERROR_KEYS.INTERNAL_SERVER_ERROR },
              { status: 500 },
            );
          }
        },
      },
    ],
    timestamps: true,
  };

  return permissionFeatures;
};
