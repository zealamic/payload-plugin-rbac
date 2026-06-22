import styles from "../matrix.module.scss";
import { PERMISSION_MATRIX_BLOCK } from "../matrix-block.js";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "../types.js";

type MatrixSearchEmptyRowProps = {
  colSpan: number;
  matrixT: (key: RolePermissionMatrixTranslationKey) => string;
};

export const MatrixSearchEmptyRow = ({ colSpan, matrixT }: MatrixSearchEmptyRowProps) => (
  <tr>
    <td className={styles[`${PERMISSION_MATRIX_BLOCK}__td--empty`]} colSpan={colSpan}>
      {matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:search:noResults`)}
    </td>
  </tr>
);
