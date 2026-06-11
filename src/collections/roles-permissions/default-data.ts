import type { RolesPermissionsCollectionTranslations } from "./types.js";

export const rolesPermissionsDefaultTranslations: RolesPermissionsCollectionTranslations = {
  en: {
    labels: {
      singular: "Role Permission",
      plural: "Role Permissions",
    },
    admin: {
      group: "System",
    },
    fields: {
      role: {
        label: "Role",
        placeholder: "Select role",
      },
      permission: {
        label: "Permission",
        placeholder: "Select permission",
      },
      enabled: {
        label: "Enabled",
        placeholder: "Check enabled",
      },
    },
  },
};
