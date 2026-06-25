import type { CustomComponent, Field } from "payload";
import { DEFAULT_USERS_COLLECTION_SLUG } from "../constants/user.js";

export const mergeBeforeListTable = (
  pluginComponent: string,
  consumerComponents?: CustomComponent[] | null,
): CustomComponent[] => [pluginComponent, ...(consumerComponents ?? [])];

export const resolveUsersCollectionSlug = (adminUser?: string | null): string =>
  adminUser || DEFAULT_USERS_COLLECTION_SLUG;

export const getCreatedByRelationshipField = (params?: {
  createdByFieldName?: string | null;
  usersCollectionSlug?: string | null;
}): Field => {
  const { createdByFieldName, usersCollectionSlug } = params || {};
  if (usersCollectionSlug) {
    return {
      name: createdByFieldName || "createdBy",
      type: "relationship",
      relationTo: usersCollectionSlug,
      hasMany: false,
      admin: {
        hidden: true,
      },
    };
  }

  return {
    name: createdByFieldName || "createdBy",
    type: "text",
    admin: {
      hidden: true,
    },
  };
};
