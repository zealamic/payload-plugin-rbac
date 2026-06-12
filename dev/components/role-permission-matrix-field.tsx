"use client";

import type {
  RolePermissionMatrixClientComponents,
  RolePermissionMatrixClientProps,
} from "@zealamic/payload-plugin-rbac/client";
import { RolePermissionMatrixClient } from "@zealamic/payload-plugin-rbac/client";

const matrixComponents: RolePermissionMatrixClientComponents = {
  renderCheckbox: ({ checked, id, label, name, onToggle, readOnly }) => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="checkbox"
          checked={checked}
          id={id}
          name={name}
          onChange={(event) => onToggle(event.target.checked)}
          readOnly={readOnly}
        />
        <label htmlFor={id}>{label}</label>
      </div>
    );
  },
};

export const RolePermissionMatrixField = (
  props: RolePermissionMatrixClientProps,
) => <RolePermissionMatrixClient {...props} components={matrixComponents} />;
