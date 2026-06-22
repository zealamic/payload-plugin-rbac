"use client";

import { TextInput } from "@payloadcms/ui";
import type { ChangeEvent } from "react";
import { useMatrixComponents } from "../context/matrix-components-context.js";
import styles from "../matrix.module.scss";
import { PERMISSION_MATRIX_BLOCK } from "../matrix-block.js";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "../types.js";

const SEARCH_INPUT_PATH = "permission-matrix-search";

type MatrixSearchInputProps = {
  matrixT: (key: RolePermissionMatrixTranslationKey) => string;
  onChange: (value: string) => void;
  value: string;
};

export const MatrixSearchInput = ({ matrixT, onChange, value }: MatrixSearchInputProps) => {
  const { renderTextInput } = useMatrixComponents();
  const placeholder = matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:search:placeholder`);

  if (renderTextInput) {
    return (
      <>
        {renderTextInput({
          onChange,
          path: SEARCH_INPUT_PATH,
          placeholder,
          value,
        })}
      </>
    );
  }

  return (
    <TextInput
      className={styles[`${PERMISSION_MATRIX_BLOCK}__search`]}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      path={SEARCH_INPUT_PATH}
      placeholder={placeholder}
      showError={false}
      value={value}
    />
  );
};
