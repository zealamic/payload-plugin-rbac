export const PERMISSION_FEATURE_REORDER_I18N_PREFIX =
  "components:permissionFeatureReorder" as const;

export type PermissionFeatureReorderTranslationKey =
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:reorderButton:label`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:drawer:title`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:drawer:description`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:loading:placeholder`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:empty:placeholder`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:error:loadFailed`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:error:saveFailed`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:saveSuccess:message`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:cancelButton:label`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:saveButton:label`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:item:dragAriaLabel`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:item:statusLabel`
  | `${typeof PERMISSION_FEATURE_REORDER_I18N_PREFIX}:item:sortOrderLabel`;

export type PermissionFeatureReorderClientTranslations = {
  [locale: string]: {
    reorderButton?: {
      label?: string;
    };
    drawer?: {
      title?: string;
      description?: string;
    };
    loading?: {
      placeholder?: string;
    };
    empty?: {
      placeholder?: string;
    };
    error?: {
      loadFailed?: string;
      saveFailed?: string;
    };
    saveSuccess?: {
      message?: string;
    };
    saveButton?: {
      label?: string;
    };
    cancelButton?: {
      label?: string;
    };
    item?: {
      dragAriaLabel?: string;
      statusLabel?: string;
      sortOrderLabel?: string;
    };
  };
};
