import type { PayloadRequest } from "payload";
import type { DataScope } from "../../collections/roles/types.js";

type DataScopeOptionsCacheInput = {
  createdByField?: string;
  usersCollectionSlug?: string;
};

export type RBACRequestCache = {
  superAdmin?: Promise<boolean>;
  permissionChecks: Map<string, Promise<boolean>>;
  effectiveDataScopeByOptions?: Map<string, Promise<DataScope>>;
  hierarchyVisibleUserIds: Map<string, Promise<string[]>>;
};

const rbacRequestCaches = new WeakMap<PayloadRequest, RBACRequestCache>();

export const getRBACRequestCache = (req: PayloadRequest): RBACRequestCache => {
  let cache = rbacRequestCaches.get(req);

  if (!cache) {
    cache = {
      permissionChecks: new Map(),
      hierarchyVisibleUserIds: new Map(),
    };
    rbacRequestCaches.set(req, cache);
  }

  return cache;
};

export const getDataScopeOptionsCacheKey = (options: DataScopeOptionsCacheInput = {}): string =>
  `${options.createdByField ?? "createdBy"}:${options.usersCollectionSlug ?? "users"}`;

export const getPermissionCheckCacheKey = ({
  featureCode,
  actionCode,
  userId,
}: {
  featureCode: string;
  actionCode: string;
  userId: string | number;
}): string => `${userId}:${featureCode}:${actionCode}`;
