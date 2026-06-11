import type { RolesCollectionTranslations } from "./types.js";

export const rolesDefaultTranslations: RolesCollectionTranslations = {
  en: {
    labels: {
      singular: "Role",
      plural: "Roles",
    },
    admin: {
      group: "System",
    },
    fields: {
      code: {
        label: "Code",
        placeholder: "Enter code",
      },
      name: {
        label: "Name",
        placeholder: "Enter name",
      },
      description: {
        label: "Description",
        placeholder: "Enter description",
      },
      status: {
        label: "Status",
        placeholder: "Select status",
        activeLabel: "Active",
        inactiveLabel: "Inactive",
      },
      dataScope: {
        label: "Data Scope",
        placeholder: "Select data scope",
        ownLabel: "Own",
        allLabel: "All",
        hierarchyLabel: "Hierarchy",
      },
      permissionMatrix: {
        label: "Permission Matrix",
        placeholder: "Select permission matrix",
      },
    },
  },
};
