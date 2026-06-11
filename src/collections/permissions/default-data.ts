import type { PermissionsCollectionTranslations } from "./types.js";

export const permissionsDefaultTranslations: PermissionsCollectionTranslations = {
  en: {
    labels: {
      singular: "Permission",
      plural: "Permissions",
    },
    admin: {
      group: "System",
    },
    fields: {
      name: {
        label: "Name",
        placeholder: "Enter name",
      },
      permissionFeature: {
        label: "Permission Feature",
        placeholder: "Select permission feature",
      },
      permissionAction: {
        label: "Permission Action",
        placeholder: "Select permission action",
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
