"use client";

import {
  useConfig,
  useDocumentInfo,
  useField,
  useTranslation,
} from "@payloadcms/ui";
import { Fragment, useEffect, useId, useMemo, useState } from "react";
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
export const RolePermissionMatrixClient = () => {
  const checkboxId = useId();
  const { config } = useConfig();
  const { hasSavePermission, id } = useDocumentInfo();
  const { setValue, value } = useField<Record<string, boolean> | null>();
  const isReadOnly = !hasSavePermission;

  const [features, setFeatures] = useState<PermissionFeature[]>([]);
  const [actions, setActions] = useState<PermissionAction[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const base = config?.routes?.api || "/api";

        const [featuresRes, actionsRes, permissionsRes, rolePermissionsRes] =
          await Promise.all([
            fetch(
              `${base}/permission-features?limit=0&depth=0&where[status][equals]=${PERMISSION_FEATURE_STATUS.ACTIVE}`,
              {
                credentials: "include",
              },
            ),
            fetch(
              `${base}/permission-actions?limit=0&depth=0&where[status][equals]=${PERMISSION_ACTION_STATUS.ACTIVE}`,
              {
                credentials: "include",
              },
            ),
            fetch(
              `${base}/permissions?limit=0&depth=1&where[status][equals]=${PERMISSION_STATUS.ACTIVE}`,
              {
                credentials: "include",
              },
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
    value && typeof value === "object" ? value : {}
  ) as Record<string, boolean>;

  // Seed field value from persisted role-permissions one time for this form session.
  useEffect(() => {
    if (!rolePermissions.length) {
      return;
    }
    if (Object.keys(draftValue).length > 0) {
      return;
    }

    const seeded: Record<string, boolean> = {};
    for (const [permissionID, enabled] of enabledByPermissionID.entries()) {
      if (permissionID) {
        seeded[permissionID] = enabled;
      }
    }
    setValue(seeded);
  }, [draftValue, enabledByPermissionID, rolePermissions.length, setValue]);

  if (!id) {
    return (
      <div style={{ opacity: 0.8, padding: "8px 0" }}>
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
      <div style={{ opacity: 0.8, padding: "8px 0" }}>
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
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        {t(`components:rolePermissionMatrix:title` as Parameters<typeof t>[0])}
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 8 }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "8px",
                  textAlign: "left",
                  borderRight: "1px solid #333",
                  width: "25%",
                }}
              >
                {t(
                  `components:rolePermissionMatrix:features:label` as Parameters<
                    typeof t
                  >[0],
                )}
              </th>
              <th
                style={{ padding: "8px", textAlign: "left" }}
                colSpan={
                  actions.filter((action) => action.type === TYPE.MAIN).length
                }
              >
                {t(
                  `components:rolePermissionMatrix:actions:label` as Parameters<
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
                    <td
                      style={{
                        borderTop: "1px solid #333",
                        padding: "0.5rem",
                        borderRight: "1px solid #333",
                      }}
                    >
                      {feature.code || feature.id}
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
                            style={{
                              borderTop: "1px solid #333",
                              padding: "0.5rem",
                            }}
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
                          style={{
                            borderTop: "1px solid #333",
                            padding: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              id={`permission-matrix-checkbox-${checkboxId}`}
                              name={`permission-matrix-checkbox-${checkboxId}`}
                              checked={checked}
                              disabled={isReadOnly}
                              onChange={(event) => {
                                setValue({
                                  ...draftValue,
                                  [permissionID]: event.target.checked,
                                });
                              }}
                              style={{
                                userSelect: "none",
                                cursor: "pointer",
                              }}
                            />
                            <label
                              htmlFor={`permission-matrix-checkbox-${checkboxId}`}
                              style={{
                                display: "inline-block",
                                paddingLeft: "0.25rem",
                                userSelect: "none",
                                cursor: "pointer",
                              }}
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
                        style={{
                          borderRight: "1px solid #333",
                          padding: "8px",
                          textAlign: "right",
                        }}
                      ></td>
                      <td
                        style={{
                          borderTop: "1px solid #333",
                          padding: "8px",
                          textAlign: "left",
                        }}
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
