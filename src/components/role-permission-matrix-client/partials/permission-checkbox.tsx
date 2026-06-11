"use client";
import { CheckboxInput } from "@payloadcms/ui";
import type { PermissionAction } from "../../../collections/permission-actions/types.js";
import { CONSTANTS } from "../../../lib/constants/index.js";
import styles from "../matrix.module.scss";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "../types.js";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;

type PermissionCheckboxProps = {
  action: PermissionAction;
  checkboxId: string;
  checked: boolean;
  draftValue: Record<string, boolean>;
  featureID: string | number;
  isReadOnly: boolean;
  isSub?: boolean;
  matrixT: (key: RolePermissionMatrixTranslationKey) => string;
  onDraftChange: (draft: Record<string, boolean>) => void;
  permissionID: string;
};

export const PermissionCheckbox = ({
  action,
  checkboxId,
  checked,
  draftValue,
  featureID,
  isReadOnly,
  isSub = false,
  matrixT,
  onDraftChange,
  permissionID,
}: PermissionCheckboxProps) => {
  const inputID = `permission-matrix-checkbox-${checkboxId}-${featureID}-${action.id}${isSub ? "-sub" : ""}`;
  const label =
    matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:actions:${action.code}`) || String(action.id);

  return (
    <div
      className={
        isSub
          ? styles[`${RBAC_PREFIX}-table-td-action-sub-action-container`]
          : styles[`${RBAC_PREFIX}-table-td-action-container`]
      }
    >
      <CheckboxInput
        checked={checked}
        id={inputID}
        label={label}
        name={inputID}
        onToggle={(event) => {
          onDraftChange({
            ...draftValue,
            [permissionID]: event.target.checked,
          });
        }}
        readOnly={isReadOnly}
      />
    </div>
  );
};
