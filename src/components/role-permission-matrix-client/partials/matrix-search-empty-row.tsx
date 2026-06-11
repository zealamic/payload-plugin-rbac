import { CONSTANTS } from "../../../lib/constants/index.js";
import styles from "../matrix.module.scss";
import {
  ROLE_PERMISSION_MATRIX_I18N_PREFIX,
  type RolePermissionMatrixTranslationKey,
} from "../types.js";

const { RBAC_PREFIX } = CONSTANTS.GENERAL;

type MatrixSearchEmptyRowProps = {
  colSpan: number;
  matrixT: (key: RolePermissionMatrixTranslationKey) => string;
};

export const MatrixSearchEmptyRow = ({ colSpan, matrixT }: MatrixSearchEmptyRowProps) => (
  <tr>
    <td className={styles[`${RBAC_PREFIX}-table-td-empty`]} colSpan={colSpan}>
      {matrixT(`${ROLE_PERMISSION_MATRIX_I18N_PREFIX}:search:noResults`)}
    </td>
  </tr>
);
