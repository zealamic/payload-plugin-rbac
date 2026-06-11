"use client";
import {
  useConfig,
  useDocumentInfo,
  useField,
  useTranslation,
} from "@payloadcms/ui";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  FC,
} from "react";
import type { PermissionAction } from "../../collections/permission-actions/types.js";
import type { PermissionFeature } from "../../collections/permission-features/types.js";
import type { Permission } from "../../collections/permissions/types.js";
import type { RolePermission } from "../../collections/roles-permissions/types.js";
import { CONSTANTS } from "../../lib/constants/index.js";
import { toID } from "../../lib/utils/data.js";

import {
  buildMainActions,
  buildPermissionByFeatureAndAction,
  buildSubActionsByFeatureID,
  featureMatchesSearch,
  fetchAllPermissionData,
} from "./handlers/index.js";
import styles from "./matrix.module.scss";
import { FeatureMatrixRows } from "./partials/feature-matrix-rows.js";
import { MatrixSearchEmptyRow } from "./partials/matrix-search-empty-row.js";
import { MatrixSearchInput } from "./partials/matrix-search-input.js";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixClientProps,
  type RolePermissionMatrixTranslationKey,
} from "./types.js";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;

export const RolePermissionMatrixClient: FC<
  RolePermissionMatrixClientProps
> = () => {
  const checkboxId = useId();
  const { config } = useConfig();
  const apiBase = config?.routes?.api || "/api";
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
  const [error, setError] = useState<string | null>(null);
  const [searchString, setSearchString] = useState("");
  const { t } = useTranslation();
  const matrixT = useCallback(
    (key: RolePermissionMatrixTranslationKey) =>
      t(key as Parameters<typeof t>[0]),
    [t],
  );
  const seededForRoleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    seededForRoleIdRef.current = null;
    setLoading(true);
    setError(null);

    fetchAllPermissionData({
      apiBase,
      id: String(id),
      signal: controller.signal,
    })
      .then((data) => {
        if (!isActive) {
          return;
        }

        setFeatures(data.features);
        setActions(data.actions);
        setPermissions(data.permissions);
        setRolePermissions(data.rolePermissions);
      })
      .catch((fetchError: unknown) => {
        if (!isActive || controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load permission matrix",
        );
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [apiBase, id]);

  const mainActions = useMemo(() => buildMainActions(actions), [actions]);

  const permissionByFeatureAndAction = useMemo(
    () => buildPermissionByFeatureAndAction(permissions),
    [permissions],
  );

  const subActionsByFeatureID = useMemo(
    () => buildSubActionsByFeatureID(actions, permissions),
    [actions, permissions],
  );

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

  const onDraftChange = useCallback(
    (draft: Record<string, boolean>) => {
      setValue(draft);
    },
    [setValue],
  );

  const visibleFeaturesCount = useMemo(
    () =>
      features.filter((feature) =>
        featureMatchesSearch(feature, searchString, matrixT),
      ).length,
    [features, matrixT, searchString],
  );

  const showSearchEmptyRow =
    searchString.trim().length > 0 && visibleFeaturesCount === 0;

  useEffect(() => {
    if (!id || loading || error || permissions.length === 0) {
      return;
    }

    const roleId = String(id);
    if (seededForRoleIdRef.current === roleId) {
      return;
    }

    const fromAllPermissions: Record<string, boolean> = {};
    for (const permission of permissions) {
      if (permission.id != null) {
        fromAllPermissions[String(permission.id)] = false;
      }
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

    seededForRoleIdRef.current = roleId;
    setValue({
      ...fromAllPermissions,
      ...fromRolesPermissions,
      ...fromDocument,
    });
  }, [enabledByPermissionID, error, id, loading, permissions, setValue, value]);

  if (!id) {
    return (
      <div className={styles[`${RBAC_PREFIX}-component-placeholder`]}>
        {matrixT(
          `${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:viewInUpdateScreenOnly:label`,
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles[`${RBAC_PREFIX}-component-placeholder`]}>
        {matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:loading:placeholder`)}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles[`${RBAC_PREFIX}-component-placeholder`]}>
        {matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:error:placeholder`)}
      </div>
    );
  }

  return (
    <div>
      <div className={styles[`${RBAC_PREFIX}-component-title`]}>
        {matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:title`)}
        <MatrixSearchInput
          matrixT={matrixT}
          onChange={setSearchString}
          value={searchString}
        />
      </div>

      <div className={styles[`${RBAC_PREFIX}-table-container`]}>
        <table className={styles[`${RBAC_PREFIX}-table`]}>
          <thead>
            <tr>
              <th className={styles[`${RBAC_PREFIX}-table-th-feature`]}>
                {matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:featuresLabel`)}
              </th>
              <th
                className={styles[`${RBAC_PREFIX}-table-th-action`]}
                colSpan={mainActions.length}
              >
                {matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:actionsLabel`)}
              </th>
            </tr>
          </thead>
          <tbody>
            {showSearchEmptyRow ? (
              <MatrixSearchEmptyRow
                colSpan={mainActions.length + 1}
                matrixT={matrixT}
              />
            ) : (
              features.map((feature) => (
                <FeatureMatrixRows
                  key={String(feature.id)}
                  checkboxId={checkboxId}
                  draftValue={draftValue}
                  enabledByPermissionID={enabledByPermissionID}
                  feature={feature}
                  isReadOnly={isReadOnly}
                  isVisible={featureMatchesSearch(
                    feature,
                    searchString,
                    matrixT,
                  )}
                  mainActions={mainActions}
                  matrixT={matrixT}
                  onDraftChange={onDraftChange}
                  permissionByFeatureAndAction={permissionByFeatureAndAction}
                  subActions={
                    subActionsByFeatureID.get(String(feature.id)) ?? []
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
