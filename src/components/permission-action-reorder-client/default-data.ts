import type { PermissionActionReorderClientTranslations } from "./types.js";

export const permissionActionReorderClientDefaultTranslations: PermissionActionReorderClientTranslations =
  {
    en: {
      reorderButton: {
        label: "Reorder",
      },
      drawer: {
        title: "Reorder permission actions",
        description:
          "Drag and drop cards to change display order. Lower positions appear first in the permission matrix.",
      },
      loading: {
        placeholder: "Loading...",
      },
      empty: {
        placeholder: "No permission actions found.",
      },
      error: {
        loadFailed: "Failed to load permission actions",
        saveFailed: "Failed to save permission action order",
      },
      saveSuccess: {
        message: "Permission action order saved.",
      },
      saveButton: {
        label: "Save order",
      },
      cancelButton: {
        label: "Cancel",
      },
      item: {
        dragAriaLabel: "Drag",
        unknownType: "unknown",
        sortOrderLabel: "sort order",
      },
    },
  };
