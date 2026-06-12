import { Fragment, memo, useMemo } from "react";
import type { PermissionAction } from "../../../collections/permission-actions/types.js";
import type { PermissionFeature } from "../../../collections/permission-features/types.js";
import type { Permission } from "../../../collections/permissions/types.js";
import { CONSTANTS } from "../../../lib/constants/index.js";
import { getFeaturePermissionIDs, permissionLookupKey } from "../handlers/index.js";
import styles from "../matrix.module.scss";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "../types.js";
import { FeatureSelectAllCheckbox } from "./feature-select-all-checkbox.js";
import { PermissionCheckbox } from "./permission-checkbox.js";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;

type FeatureMatrixRowsProps = {
  checkboxId: string;
  draftValue: Record<string, boolean>;
  enabledByPermissionID: Map<string, boolean>;
  feature: PermissionFeature;
  isReadOnly: boolean;
  mainActions: PermissionAction[];
  matrixT: (key: RolePermissionMatrixTranslationKey) => string;
  onDraftPermissionChange: (permissionID: string, enabled: boolean) => void;
  onDraftPermissionsChange: (updates: Record<string, boolean>) => void;
  permissionByFeatureAndAction: Map<string, Permission>;
  subActions: PermissionAction[];
};

const resolveChecked = (
  permissionID: string,
  draftValue: Record<string, boolean>,
  enabledByPermissionID: Map<string, boolean>,
) =>
  typeof draftValue[permissionID] === "boolean"
    ? draftValue[permissionID]
    : (enabledByPermissionID.get(permissionID) ?? false);

export const FeatureMatrixRows = memo(function FeatureMatrixRows({
  checkboxId,
  draftValue,
  enabledByPermissionID,
  feature,
  isReadOnly,
  mainActions,
  matrixT,
  onDraftPermissionChange,
  onDraftPermissionsChange,
  permissionByFeatureAndAction,
  subActions,
}: FeatureMatrixRowsProps) {
  const featureID = String(feature.id);
  const hasSubActions = subActions.length > 0;
  const featureActions = useMemo(() => [...mainActions, ...subActions], [mainActions, subActions]);
  const featurePermissionIDs = useMemo(
    () => getFeaturePermissionIDs(featureID, featureActions, permissionByFeatureAndAction),
    [featureActions, featureID, permissionByFeatureAndAction],
  );
  const featurePermissionCheckedStates = useMemo(
    () =>
      featurePermissionIDs.map((permissionID) =>
        resolveChecked(permissionID, draftValue, enabledByPermissionID),
      ),
    [draftValue, enabledByPermissionID, featurePermissionIDs],
  );
  const featureLabel =
    matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:features:${feature.code}`) || String(feature.id);

  return (
    <Fragment key={featureID}>
      <tr>
        <td className={styles[`${RBAC_PREFIX}-table-td-feature`]}>
          <FeatureSelectAllCheckbox
            checkboxId={checkboxId}
            checkedStates={featurePermissionCheckedStates}
            featureID={featureID}
            featureLabel={featureLabel}
            isReadOnly={isReadOnly}
            onDraftPermissionsChange={onDraftPermissionsChange}
            permissionIDs={featurePermissionIDs}
          />
        </td>

        {mainActions.map((action) => {
          const matchedPermission = permissionByFeatureAndAction.get(
            permissionLookupKey(featureID, String(action.id)),
          );

          if (!matchedPermission) {
            return (
              <td
                key={`${featureID}-${action.id}`}
                className={styles[`${RBAC_PREFIX}-table-td-action`]}
              >
                -
              </td>
            );
          }

          const permissionID = String(matchedPermission.id);

          return (
            <td
              key={`${featureID}-${action.id}`}
              className={styles[`${RBAC_PREFIX}-table-td-action`]}
            >
              <PermissionCheckbox
                action={action}
                checkboxId={checkboxId}
                checked={resolveChecked(permissionID, draftValue, enabledByPermissionID)}
                featureID={featureID}
                isReadOnly={isReadOnly}
                matrixT={matrixT}
                onDraftPermissionChange={onDraftPermissionChange}
                permissionID={permissionID}
              />
            </td>
          );
        })}
      </tr>

      {hasSubActions && (
        <tr>
          <td aria-hidden="true" className={styles[`${RBAC_PREFIX}-table-td-feature`]} />
          <td className={styles[`${RBAC_PREFIX}-table-td-action`]} colSpan={mainActions.length}>
            {subActions.map((action) => {
              const matchedPermission = permissionByFeatureAndAction.get(
                permissionLookupKey(featureID, String(action.id)),
              );

              if (!matchedPermission) {
                return null;
              }

              const permissionID = String(matchedPermission.id);

              return (
                <PermissionCheckbox
                  key={`${featureID}-${action.id}-sub`}
                  action={action}
                  checkboxId={checkboxId}
                  checked={resolveChecked(permissionID, draftValue, enabledByPermissionID)}
                  featureID={featureID}
                  isReadOnly={isReadOnly}
                  isSub
                  matrixT={matrixT}
                  onDraftPermissionChange={onDraftPermissionChange}
                  permissionID={permissionID}
                />
              );
            })}
          </td>
        </tr>
      )}
    </Fragment>
  );
});
