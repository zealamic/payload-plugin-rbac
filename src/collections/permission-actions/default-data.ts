import type { PermissionActionsCollectionTranslations } from "./types.js";

export const permissionActionsDefaultTranslations: PermissionActionsCollectionTranslations =
  {
    en: {
      labels: {
        singular: "Permission Action",
        plural: "Permission Actions",
      },
      admin: {
        group: "System",
      },
      fields: {
        code: {
          label: "Code",
          placeholder: "Enter code",
        },
        type: {
          label: "Type",
          placeholder: "Select type",
          mainLabel: "Main",
          subLabel: "Sub",
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
