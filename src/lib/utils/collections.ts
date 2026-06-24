import type { CustomComponent, Field } from "payload";
import { DEFAULT_USERS_COLLECTION_SLUG } from "../constants/user.js";

export const mergeBeforeListTable = (
  pluginComponent: string,
  consumerComponents?: CustomComponent[] | null,
): CustomComponent[] => [pluginComponent, ...(consumerComponents ?? [])];

export const resolveUsersCollectionSlug = (adminUser?: string | null): string =>
  adminUser || DEFAULT_USERS_COLLECTION_SLUG;

export const getCreatedByRelationshipField = (usersCollectionSlug: string): Field => ({
  name: "createdBy",
  type: "relationship",
  relationTo: usersCollectionSlug,
  hasMany: false,
  admin: {
    hidden: true,
  },
});
