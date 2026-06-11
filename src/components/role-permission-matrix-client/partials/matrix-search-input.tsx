"use client";

import { TextInput } from "@payloadcms/ui";
import type { ChangeEvent } from "react";
import { CONSTANTS } from "../../../lib/constants/index.js";
import styles from "../matrix.module.scss";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "../types.js";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;

const SEARCH_INPUT_PATH = "permission-matrix-search";

type MatrixSearchInputProps = {
  matrixT: (key: RolePermissionMatrixTranslationKey) => string;
  onChange: (value: string) => void;
  value: string;
};

export const MatrixSearchInput = ({ matrixT, onChange, value }: MatrixSearchInputProps) => {
  const placeholder = matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:search:placeholder`);

  return (
    <TextInput
      className={styles[`${RBAC_PREFIX}-component-search`]}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      path={SEARCH_INPUT_PATH}
      placeholder={placeholder}
      showError={false}
      value={value}
    />
  );
};
