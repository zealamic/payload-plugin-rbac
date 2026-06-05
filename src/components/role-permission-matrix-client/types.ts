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
  };
};
