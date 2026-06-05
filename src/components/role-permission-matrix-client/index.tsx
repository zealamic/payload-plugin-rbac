"use client";

import {
  useConfig,
  useDocumentInfo,
  useField,
  useTranslation,
} from "@payloadcms/ui";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PermissionAction } from "../../collections/permission-actions/types.js";
import type { PermissionFeature } from "../../collections/permission-features/types.js";
import type { Permission } from "../../collections/permissions/types.js";
import type { RolePermission } from "../../collections/roles-permissions/types.js";
import { STATUS as PERMISSION_STATUS } from "../../lib/constants/permission.js";
import {
  STATUS as PERMISSION_ACTION_STATUS,
  TYPE,
} from "../../lib/constants/permission-action.js";
import { STATUS as PERMISSION_FEATURE_STATUS } from "../../lib/constants/permission-feature.js";
import { toID } from "../../lib/utils/data.js";

import styles from "./matrix.module.scss";

const RBAC_PREFIX = "rbac";

type ApiListResponse<T> = {
  docs?: T[];
};

export const RolePermissionMatrixClient = () => {
  const checkboxId = useId();
  const { config } = useConfig();
  const { hasSavePermission, id } = useDocumentInfo();
  const { setValue, value } = useField<Record<string, boolean> | null>({
    path: "permissionMatrixDraft",
  });
  const isReadOnly = !hasSavePermission;

  const [features, setFeatures] = useState<PermissionFeature[]>([]);
  const [actions, setActions] = useState<PermissionAction[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const seededForRoleIdRef = useRef<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const base = config?.routes?.api || "/api";

        const [featuresRes, actionsRes, permissionsRes, rolePermissionsRes] =
          await Promise.all([
            fetch(
              `${base}/permission-features?limit=0&depth=0&where[status][equals]=${PERMISSION_FEATURE_STATUS.ACTIVE}`,
              { credentials: "include" },
            ),
            fetch(
              `${base}/permission-actions?limit=0&depth=0&where[status][equals]=${PERMISSION_ACTION_STATUS.ACTIVE}`,
              { credentials: "include" },
            ),
            fetch(
              `${base}/permissions?limit=0&depth=1&where[status][equals]=${PERMISSION_STATUS.ACTIVE}`,
              { credentials: "include" },
            ),
            id
              ? fetch(
                  `${base}/roles-permissions?limit=0&depth=0&where[role][equals]=${id}`,
                  {
                    credentials: "include",
                  },
                )
              : Promise.resolve(new Response(JSON.stringify({ docs: [] }))),
          ]);

        const featuresJson =
          (await featuresRes.json()) as ApiListResponse<PermissionFeature>;
        const actionsJson =
          (await actionsRes.json()) as ApiListResponse<PermissionAction>;
        const permissionsJson =
          (await permissionsRes.json()) as ApiListResponse<Permission>;
        const rolePermissionsJson =
          (await rolePermissionsRes.json()) as ApiListResponse<RolePermission>;

        setFeatures(
          featuresJson.docs?.sort(
            (a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0),
          ) || [],
        );
        setActions(
          actionsJson.docs?.sort(
            (a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0),
          ) || [],
        );
        setPermissions(permissionsJson.docs || []);
        setRolePermissions(rolePermissionsJson.docs || []);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [config?.routes?.api, id]);

  const enabledByPermissionID = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of rolePermissions) {
      map.set(toID(row.permission), Boolean(row.enabled));
    }
    return map;
  }, [rolePermissions]);

  const draftValue = (
    value && typeof value === "object" && !Array.isArray(value) ? value : {}
  ) as Record<string, boolean>;

  useEffect(() => {
    if (!id || loading) {
      return;
    }

    const roleId = String(id);
    if (seededForRoleIdRef.current === roleId) {
      return;
    }

    const fromRolesPermissions: Record<string, boolean> = {};
    for (const [permissionID, enabled] of enabledByPermissionID.entries()) {
      if (permissionID) {
        fromRolesPermissions[permissionID] = enabled;
      }
    }

    const fromDocument =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, boolean>)
        : {};

    const hasRolesPermissions = Object.keys(fromRolesPermissions).length > 0;
    const hasDocumentDraft = Object.keys(fromDocument).length > 0;

    if (!hasRolesPermissions && !hasDocumentDraft) {
      return;
    }

    seededForRoleIdRef.current = roleId;
    setValue({
      ...fromRolesPermissions,
      ...fromDocument,
    });
  }, [enabledByPermissionID, id, loading, setValue, value]);

  if (!id) {
    return (
      <div className={styles[`${RBAC_PREFIX}-component-placeholder`]}>
        {t(
          `components:rolePermissionMatrix:viewInUpdateScreenOnly:label` as Parameters<
            typeof t
          >[0],
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles[`${RBAC_PREFIX}-component-placeholder`]}>
        {t(
          `components:rolePermissionMatrix:loading:placeholder` as Parameters<
            typeof t
          >[0],
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={styles[`${RBAC_PREFIX}-component-title`]}>
        {t(`components:rolePermissionMatrix:title` as Parameters<typeof t>[0])}
      </div>

      <div className={styles[`${RBAC_PREFIX}-table-container`]}>
        <table className={styles[`${RBAC_PREFIX}-table`]}>
          <thead>
            <tr>
              <th className={styles[`${RBAC_PREFIX}-table-th-feature`]}>
                {t(
                  `components:rolePermissionMatrix:featuresLabel` as Parameters<
                    typeof t
                  >[0],
                )}
              </th>
              <th
                className={styles[`${RBAC_PREFIX}-table-th-action`]}
                colSpan={
                  actions.filter((action) => action.type === TYPE.MAIN).length
                }
              >
                {t(
                  `components:rolePermissionMatrix:actionsLabel` as Parameters<
                    typeof t
                  >[0],
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => {
              const mainActions = actions.filter(
                (action) => action.type === TYPE.MAIN,
              );
              const subActions = actions.filter(
                (action) =>
                  action.type === TYPE.SUB &&
                  permissions.some(
                    (permission) =>
                      toID(permission.permissionAction) === String(action.id) &&
                      toID(permission.permissionFeature) === String(feature.id),
                  ),
              );
              const isSubActionInPermission = subActions.length > 0;

              return (
                <Fragment key={String(feature.id)}>
                  <tr>
                    <td className={styles[`${RBAC_PREFIX}-table-td-feature`]}>
                      {t(
                        `components:rolePermissionMatrix:features:${feature.code}` as Parameters<
                          typeof t
                        >[0],
                      ) || feature.id}
                    </td>

                    {mainActions.map((action) => {
                      const matchedPermission = permissions.find(
                        (permission) =>
                          toID(permission.permissionFeature) ===
                            String(feature.id) &&
                          toID(permission.permissionAction) ===
                            String(action.id),
                      );

                      if (!matchedPermission) {
                        return (
                          <td
                            key={`${feature.id}-${action.id}`}
                            className={styles[`${RBAC_PREFIX}-table-td-action`]}
                          >
                            -
                          </td>
                        );
                      }

                      const permissionID = String(matchedPermission.id);
                      const checked =
                        typeof draftValue[permissionID] === "boolean"
                          ? draftValue[permissionID]
                          : (enabledByPermissionID.get(permissionID) ?? false);

                      return (
                        <td
                          key={`${feature.id}-${action.id}`}
                          className={styles[`${RBAC_PREFIX}-table-td-action`]}
                        >
                          <div
                            className={
                              styles[`${RBAC_PREFIX}-table-td-action-container`]
                            }
                          >
                            <input
                              type="checkbox"
                              id={`permission-matrix-checkbox-${checkboxId}-${feature.id}-${action.id}`}
                              name={`permission-matrix-checkbox-${checkboxId}-${feature.id}-${action.id}`}
                              checked={checked}
                              disabled={isReadOnly}
                              onChange={(event) => {
                                setValue({
                                  ...draftValue,
                                  [permissionID]: event.target.checked,
                                });
                              }}
                              className={
                                styles[`${RBAC_PREFIX}-table-td-action-input`]
                              }
                            />
                            <label
                              htmlFor={`permission-matrix-checkbox-${checkboxId}-${feature.id}-${action.id}`}
                              className={
                                styles[`${RBAC_PREFIX}-table-td-action-label`]
                              }
                            >
                              {t(
                                `components:rolePermissionMatrix:actions:${action.code}` as Parameters<
                                  typeof t
                                >[0],
                              ) || action.id}
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {isSubActionInPermission && (
                    <tr>
                      <td
                        className={styles[`${RBAC_PREFIX}-table-td-feature`]}
                      ></td>
                      <td
                        className={styles[`${RBAC_PREFIX}-table-td-action`]}
                        colSpan={mainActions.length}
                      >
                        {subActions.map((action) => {
                          const matchedPermission = permissions.find(
                            (permission) =>
                              toID(permission.permissionFeature) ===
                                String(feature.id) &&
                              toID(permission.permissionAction) ===
                                String(action.id),
                          );

                          if (!matchedPermission) {
                            return null;
                          }

                          const permissionID = String(matchedPermission.id);
                          const checked =
                            typeof draftValue[permissionID] === "boolean"
                              ? draftValue[permissionID]
                              : (enabledByPermissionID.get(permissionID) ??
                                false);

                          return (
                            <div key={`${feature.id}-${action.id}-sub`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isReadOnly}
                                onChange={(event) => {
                                  setValue({
                                    ...draftValue,
                                    [permissionID]: event.target.checked,
                                  });
                                }}
                              />{" "}
                              <span
                                style={{
                                  display: "inline-block",
                                }}
                              >
                                {action.code || action.id}
                              </span>
                            </div>
                          );
                        })}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
