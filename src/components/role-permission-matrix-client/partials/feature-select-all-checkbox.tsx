"use client";

import { CheckboxInput } from "@payloadcms/ui";
import { memo, useCallback } from "react";
import { useMatrixComponents } from "../context/matrix-components-context.js";
import styles from "../matrix.module.scss";
import { PERMISSION_MATRIX_BLOCK } from "../matrix-block.js";

type FeatureSelectAllCheckboxProps = {
  checkboxId: string;
  checkedStates: boolean[];
  featureID: string;
  featureLabel: string;
  isReadOnly: boolean;
  onDraftPermissionsChange: (updates: Record<string, boolean>) => void;
  permissionIDs: string[];
};

export const FeatureSelectAllCheckbox = memo(function FeatureSelectAllCheckbox({
  checkboxId,
  checkedStates,
  featureID,
  featureLabel,
  isReadOnly,
  onDraftPermissionsChange,
  permissionIDs,
}: FeatureSelectAllCheckboxProps) {
  const { renderCheckbox } = useMatrixComponents();
  const inputID = `permission-matrix-select-all-${checkboxId}-${featureID}`;
  const hasPermissions = permissionIDs.length > 0;
  const allChecked = hasPermissions && checkedStates.every(Boolean);
  const someChecked = checkedStates.some(Boolean);
  const isIndeterminate = someChecked && !allChecked;
  const readOnly = isReadOnly || !hasPermissions;

  const handleToggle = useCallback(
    (nextChecked: boolean) => {
      const updates: Record<string, boolean> = {};

      for (const permissionID of permissionIDs) {
        updates[permissionID] = nextChecked;
      }

      onDraftPermissionsChange(updates);
    },
    [onDraftPermissionsChange, permissionIDs],
  );

  if (renderCheckbox) {
    return (
      <div className={styles[`${PERMISSION_MATRIX_BLOCK}__feature-checkbox`]}>
        {renderCheckbox({
          checked: allChecked,
          id: inputID,
          label: featureLabel,
          name: inputID,
          onToggle: handleToggle,
          partialChecked: isIndeterminate,
          readOnly,
        })}
      </div>
    );
  }

  return (
    <div className={styles[`${PERMISSION_MATRIX_BLOCK}__feature-checkbox`]}>
      <CheckboxInput
        checked={allChecked}
        id={inputID}
        label={featureLabel}
        name={inputID}
        onToggle={(event) => handleToggle(event.target.checked)}
        partialChecked={isIndeterminate}
        readOnly={readOnly}
      />
    </div>
  );
});
