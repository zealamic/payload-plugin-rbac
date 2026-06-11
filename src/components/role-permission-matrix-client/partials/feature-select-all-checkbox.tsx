"use client";

import { CheckboxInput } from "@payloadcms/ui";
import { CONSTANTS } from "../../../lib/constants/index.js";
import styles from "../matrix.module.scss";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;

type FeatureSelectAllCheckboxProps = {
  checkboxId: string;
  checkedStates: boolean[];
  draftValue: Record<string, boolean>;
  featureID: string;
  featureLabel: string;
  isReadOnly: boolean;
  onDraftChange: (draft: Record<string, boolean>) => void;
  permissionIDs: string[];
};

export const FeatureSelectAllCheckbox = ({
  checkboxId,
  checkedStates,
  draftValue,
  featureID,
  featureLabel,
  isReadOnly,
  onDraftChange,
  permissionIDs,
}: FeatureSelectAllCheckboxProps) => {
  const inputID = `permission-matrix-select-all-${checkboxId}-${featureID}`;
  const hasPermissions = permissionIDs.length > 0;
  const allChecked = hasPermissions && checkedStates.every(Boolean);
  const someChecked = checkedStates.some(Boolean);
  const isIndeterminate = someChecked && !allChecked;

  return (
    <div className={styles[`${RBAC_PREFIX}-table-td-feature-container`]}>
      <CheckboxInput
        checked={allChecked}
        id={inputID}
        label={featureLabel}
        name={inputID}
        onToggle={(event) => {
          const next = { ...draftValue };

          for (const permissionID of permissionIDs) {
            next[permissionID] = event.target.checked;
          }

          onDraftChange(next);
        }}
        partialChecked={isIndeterminate}
        readOnly={isReadOnly || !hasPermissions}
      />
    </div>
  );
};
