import type { ReactNode } from "react";

export const ROLE_PERMISSION_MATRIX_I18N_PREFIX = "components:rolePermissionMatrix" as const;

export type RolePermissionMatrixTranslationKey =
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:viewInUpdateScreenOnly:label`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:loading:placeholder`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:title`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:featuresLabel`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:actionsLabel`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:error:placeholder`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:search:placeholder`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:search:noResults`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:features:${string}`
  | `${typeof ROLE_PERMISSION_MATRIX_I18N_PREFIX}:actions:${string}`;

export type RolePermissionMatrixClientTranslations = {
  [locale: string]: {
    viewInUpdateScreenOnly?: {
      label?: string;
      placeholder?: string;
    };
    loading?: {
      placeholder?: string;
    };
    title?: string;
    featuresLabel?: string;
    features?: Record<string, string>;
    actionsLabel?: string;
    actions?: Record<string, string>;
    search?: {
      placeholder?: string;
      noResults?: string;
    };
    error?: {
      placeholder?: string;
    };
  };
};

export type RolePermissionMatrixTextInputRenderProps = {
  onChange: (value: string) => void;
  path: string;
  placeholder: string;
  value: string;
};

export type RolePermissionMatrixCheckboxRenderProps = {
  checked: boolean;
  id: string;
  label: string;
  name: string;
  onToggle: (checked: boolean) => void;
  partialChecked?: boolean;
  readOnly: boolean;
};

export type RolePermissionMatrixClientComponents = {
  renderCheckbox?: (props: RolePermissionMatrixCheckboxRenderProps) => ReactNode;
  renderTextInput?: (props: RolePermissionMatrixTextInputRenderProps) => ReactNode;
};

export type RolePermissionMatrixClientProps = {
  components?: RolePermissionMatrixClientComponents;
};
