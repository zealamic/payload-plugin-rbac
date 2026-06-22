import type { PermissionFeatureReorderClientTranslations } from "./types.js";

export const permissionFeatureReorderClientDefaultTranslations: PermissionFeatureReorderClientTranslations =
  {
    en: {
      reorderButton: {
        label: "Reorder",
      },
      drawer: {
        title: "Reorder permission features",
        description:
          "Drag and drop cards to change display order. Lower positions appear first in the permission matrix.",
      },
      loading: {
        placeholder: "Loading...",
      },
      empty: {
        placeholder: "No permission features found.",
      },
      error: {
        loadFailed: "Failed to load permission features",
        saveFailed: "Failed to save permission feature order",
      },
      saveSuccess: {
        message: "Permission feature order saved.",
      },
      saveButton: {
        label: "Save order",
      },
      cancelButton: {
        label: "Cancel",
      },
      item: {
        dragAriaLabel: "Drag",
        statusLabel: "status",
        sortOrderLabel: "sort order",
      },
    },
  };
