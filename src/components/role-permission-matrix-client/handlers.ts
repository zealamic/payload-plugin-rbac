import type { PermissionAction } from "./../../collections/permission-actions/types.js";
import type { PermissionFeature } from "./../../collections/permission-features/types.js";
import type { Permission } from "./../../collections/permissions/types.js";
import type { RolePermission } from "./../../collections/roles-permissions/types.js";
import { STATUS as PERMISSION_STATUS } from "./../../lib/constants/permission.js";
import {
  STATUS as PERMISSION_ACTION_STATUS,
  TYPE,
} from "./../../lib/constants/permission-action.js";
import { STATUS as PERMISSION_FEATURE_STATUS } from "./../../lib/constants/permission-feature.js";
import { toID } from "./../../lib/utils/data.js";
import type { ApiListResponse } from "./../../types.js";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "./types.js";

export type PermissionMatrixData = {
  actions: PermissionAction[];
  features: PermissionFeature[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
};

const parseListResponse = async <T>(
  response: Response,
  resource: string,
): Promise<ApiListResponse<T>> => {
  if (!response.ok) {
    throw new Error(`Failed to fetch ${resource}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ApiListResponse<T>;
};

export const fetchAllPermissionData = async ({
  apiBase,
  id,
  signal,
}: {
  apiBase: string;
  id: string;
  signal?: AbortSignal;
}): Promise<PermissionMatrixData> => {
  const base = apiBase || "/api";
  const fetchOptions = { credentials: "include" as const, signal };

  const [featuresRes, actionsRes, permissionsRes, rolePermissionsRes] = await Promise.all([
    fetch(
      `${base}/permission-features?limit=0&depth=0&where[status][equals]=${PERMISSION_FEATURE_STATUS.ACTIVE}&sort=sortOrder`,
      fetchOptions,
    ),
    fetch(
      `${base}/permission-actions?limit=0&depth=0&where[status][equals]=${PERMISSION_ACTION_STATUS.ACTIVE}&sort=sortOrder`,
      fetchOptions,
    ),
    fetch(
      `${base}/permissions?limit=0&depth=1&where[status][equals]=${PERMISSION_STATUS.ACTIVE}`,
      fetchOptions,
    ),
    id
      ? fetch(`${base}/roles-permissions?limit=0&depth=0&where[role][equals]=${id}`, fetchOptions)
      : Promise.resolve(new Response(JSON.stringify({ docs: [] }))),
  ]);

  const [featuresJson, actionsJson, permissionsJson, rolePermissionsJson] = await Promise.all([
    parseListResponse<PermissionFeature>(featuresRes, "permission-features"),
    parseListResponse<PermissionAction>(actionsRes, "permission-actions"),
    parseListResponse<Permission>(permissionsRes, "permissions"),
    id
      ? parseListResponse<RolePermission>(rolePermissionsRes, "roles-permissions")
      : ({ docs: [] } as ApiListResponse<RolePermission>),
  ]);

  return {
    features: featuresJson.docs ?? [],
    actions: actionsJson.docs ?? [],
    permissions: permissionsJson.docs ?? [],
    rolePermissions: rolePermissionsJson.docs ?? [],
  };
};

export const getFeatureDisplayLabel = (
  feature: PermissionFeature,
  matrixT: (key: RolePermissionMatrixTranslationKey) => string,
) =>
  matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:features:${feature.code}`) ||
  String(feature.code ?? feature.id);

export const featureMatchesSearch = (
  feature: PermissionFeature,
  searchString: string,
  matrixT: (key: RolePermissionMatrixTranslationKey) => string,
) => {
  const query = searchString.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const displayLabel = getFeatureDisplayLabel(feature, matrixT).toLowerCase();
  const code = String(feature.code ?? "").toLowerCase();

  return displayLabel.includes(query) || code.includes(query);
};

export const permissionLookupKey = (featureID: string | number, actionID: string | number) =>
  `${featureID}:${actionID}`;

export const buildPermissionByFeatureAndAction = (permissions: Permission[]) => {
  const map = new Map<string, Permission>();

  for (const permission of permissions) {
    const key = permissionLookupKey(
      toID(permission.permissionFeature),
      toID(permission.permissionAction),
    );

    if (key !== ":") {
      map.set(key, permission);
    }
  }

  return map;
};

export const buildMainActions = (actions: PermissionAction[]) =>
  actions.filter((action) => action.type === TYPE.MAIN);

export const buildSubActionsByFeatureID = (
  actions: PermissionAction[],
  permissions: Permission[],
) => {
  const actionByID = new Map(actions.map((action) => [String(action.id), action]));
  const subActionIDsByFeatureID = new Map<string, Set<string>>();

  for (const permission of permissions) {
    const action = actionByID.get(toID(permission.permissionAction));

    if (!action || action.type !== TYPE.SUB) {
      continue;
    }

    const featureID = toID(permission.permissionFeature);
    let actionIDs = subActionIDsByFeatureID.get(featureID);

    if (!actionIDs) {
      actionIDs = new Set();
      subActionIDsByFeatureID.set(featureID, actionIDs);
    }

    actionIDs.add(String(action.id));
  }

  const map = new Map<string, PermissionAction[]>();

  for (const [featureID, actionIDs] of subActionIDsByFeatureID) {
    map.set(
      featureID,
      actions.filter((action) => action.type === TYPE.SUB && actionIDs.has(String(action.id))),
    );
  }

  return map;
};

export const arePermissionDraftsEqual = (
  left: Record<string, boolean>,
  right: Record<string, boolean>,
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
};

export const getFeaturePermissionIDs = (
  featureID: string,
  actions: PermissionAction[],
  permissionByFeatureAndAction: Map<string, Permission>,
) => {
  const permissionIDs: string[] = [];

  for (const action of actions) {
    const permission = permissionByFeatureAndAction.get(
      permissionLookupKey(featureID, String(action.id)),
    );

    if (permission?.id != null) {
      permissionIDs.push(String(permission.id));
    }
  }

  return permissionIDs;
};
