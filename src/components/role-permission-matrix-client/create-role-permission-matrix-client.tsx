"use client";

import type { FC } from "react";
import { RolePermissionMatrixClient } from "./index.js";
import type {
  RolePermissionMatrixClientComponents,
  RolePermissionMatrixClientProps,
} from "./types.js";

export const createRolePermissionMatrixClient = (
  components: RolePermissionMatrixClientComponents,
): FC<RolePermissionMatrixClientProps> => {
  const MatrixField: FC<RolePermissionMatrixClientProps> = (props) => (
    <RolePermissionMatrixClient {...props} components={components} />
  );

  MatrixField.displayName = "RolePermissionMatrixClient";

  return MatrixField;
};
