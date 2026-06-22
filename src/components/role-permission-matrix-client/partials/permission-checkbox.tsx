"use client";
import { CheckboxInput } from "@payloadcms/ui";
import { memo } from "react";
import type { PermissionAction } from "../../../collections/permission-actions/types.js";
import { useMatrixComponents } from "../context/matrix-components-context.js";
import styles from "../matrix.module.scss";
import { PERMISSION_MATRIX_BLOCK } from "../matrix-block.js";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "../types.js";

type PermissionCheckboxProps = {
  action: PermissionAction;
  checkboxId: string;
  checked: boolean;
  featureID: string | number;
  isReadOnly: boolean;
  isSub?: boolean;
  matrixT: (key: RolePermissionMatrixTranslationKey) => string;
  onDraftPermissionChange: (permissionID: string, enabled: boolean) => void;
  permissionID: string;
};

export const PermissionCheckbox = memo(function PermissionCheckbox({
  action,
  checkboxId,
  checked,
  featureID,
  isReadOnly,
  isSub = false,
  matrixT,
  onDraftPermissionChange,
  permissionID,
}: PermissionCheckboxProps) {
  const { renderCheckbox } = useMatrixComponents();
  const inputID = `permission-matrix-checkbox-${checkboxId}-${featureID}-${action.id}${isSub ? "-sub" : ""}`;
  const label =
    matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:actions:${action.code}`) || String(action.id);
  const containerClassName = isSub
    ? styles[`${PERMISSION_MATRIX_BLOCK}__sub-action-checkbox`]
    : styles[`${PERMISSION_MATRIX_BLOCK}__action-checkbox`];

  if (renderCheckbox) {
    return (
      <div className={containerClassName}>
        {renderCheckbox({
          checked,
          id: inputID,
          label,
          name: inputID,
          onToggle: (nextChecked) => {
            onDraftPermissionChange(permissionID, nextChecked);
          },
          readOnly: isReadOnly,
        })}
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <CheckboxInput
        checked={checked}
        id={inputID}
        label={label}
        name={inputID}
        onToggle={(event) => {
          onDraftPermissionChange(permissionID, event.target.checked);
        }}
        readOnly={isReadOnly}
      />
    </div>
  );
});
