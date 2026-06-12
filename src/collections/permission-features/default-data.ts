import type { PermissionFeaturesCollectionTranslations } from "./types.js";

export const permissionFeaturesDefaultTranslations: PermissionFeaturesCollectionTranslations = {
  en: {
    labels: {
      singular: "Permission Feature",
      plural: "Permission Features",
    },
    admin: {
      group: "System",
    },
    fields: {
      code: {
        label: "Code",
        placeholder: "Enter code",
      },
      sortOrder: {
        label: "Sort Order",
        placeholder: "Enter sort order",
      },
      status: {
        label: "Status",
        placeholder: "Select status",
        activeLabel: "Active",
        inactiveLabel: "Inactive",
      },
    },
  },
};
