import type { RolePermissionMatrixClientTranslations } from "./types.js";

export const rolePermissionMatrixClientDefaultTranslations: RolePermissionMatrixClientTranslations =
  {
    en: {
      viewInUpdateScreenOnly: {
        label: "View permission matrix in update screen only",
      },
      loading: {
        placeholder: "Loading permission matrix...",
      },
      error: {
        placeholder: "Failed to load permission matrix. Please try again.",
      },
      title: "Permission Matrix",
      featuresLabel: "Features",
      features: {
        users: "Users",
      },
      actionsLabel: "Actions",
      search: {
        placeholder: "Search features...",
        noResults: "No features match your search.",
      },
      actions: {
        create: "Create",
        read: "Read",
        update: "Update",
        delete: "Delete",
      },
    },
  };
