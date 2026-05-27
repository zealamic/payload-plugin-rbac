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
    features?:
      | {
          label?: string;
        }
      | Record<string, string>;
    actions?:
      | {
          label?: string;
        }
      | Record<string, string>;
  };
};
