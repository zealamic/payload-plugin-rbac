import type { CollectionConfig } from "payload"
import { getPermissionAccess } from "@zealamic/payload-plugin-rbac"

const FEATURE_CODE = "posts"

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
      options: {
        createdByField: "createdBy",
        usersCollectionSlug: "users",
      },
    }),
    update: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "update",
      mode: "modify",
      collectionSlug: FEATURE_CODE,
      options: {
        createdByField: "createdBy",
        usersCollectionSlug: "users",
      },
    }),
    delete: getPermissionAccess({
      featureCode: FEATURE_CODE,
      actionCode: "delete",
      mode: "modify",
      collectionSlug: FEATURE_CODE,
      options: {
        createdByField: "createdBy",
        usersCollectionSlug: "users",
      },
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
          }
        }

        return data
      },
    ],
  },
}
