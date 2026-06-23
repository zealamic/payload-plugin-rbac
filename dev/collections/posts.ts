import { getPermissionAccess } from "@zealamic/payload-plugin-rbac";
import type { CollectionConfig } from "payload";

const FEATURE_CODE = "posts";

export const postsCollection: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "createdBy", "updatedAt"],
  },
  access: {
    create: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "create",
    }),
    read: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "read",
      options: {},
    }),
    update: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "update",
      mode: "modify",
    }),
    delete: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "delete",
      mode: "modify",
    }),
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "content",
      type: "textarea",
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      index: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        if (operation === "create" && req.user?.id && !data?.createdBy) {
          return {
            ...data,
            createdBy: req.user.id,
          };
        }

        return data;
      },
    ],
  },
};
