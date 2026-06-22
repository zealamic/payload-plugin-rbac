export const PERMISSION_ACTION_REORDER_I18N_PREFIX = "components:permissionActionReorder" as const;
export const COLLECTIONS_PERMISSION_ACTIONS_I18N_PREFIX = "collections:permissionActions" as const;
export type PermissionActionReorderTranslationKey =
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:reorderButton:label`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:drawer:title`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:drawer:description`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:loading:placeholder`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:empty:placeholder`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:error:loadFailed`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:error:saveFailed`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:saveSuccess:message`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:cancelButton:label`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:saveButton:label`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:item:dragAriaLabel`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:item:unknownType`
  | `${typeof PERMISSION_ACTION_REORDER_I18N_PREFIX}:item:sortOrderLabel`
  | `${typeof COLLECTIONS_PERMISSION_ACTIONS_I18N_PREFIX}:fields:type:mainLabel`
  | `${typeof COLLECTIONS_PERMISSION_ACTIONS_I18N_PREFIX}:fields:type:subLabel`;

export type PermissionActionReorderClientTranslations = {
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
      unknownType?: string;
      sortOrderLabel?: string;
    };
  };
};
