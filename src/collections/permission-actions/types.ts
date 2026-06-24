import type { CollectionConfig, Field } from "payload";
import type { RBACUsersCollectionParams } from "../shared/types.js";
import { STATUS, TYPE } from "../../lib/constants/permission-action.js";

export type PermissionActionsCollectionTranslations = {
  [locale: string]: {
    labels?: {
      singular?: string;
      plural?: string;
    };
    admin?: {
      group?: string;
    };
    fields?: {
      code?: {
        label?: string;
        placeholder?: string;
      };
      type?: {
        label?: string;
        placeholder?: string;
        mainLabel?: string;
        subLabel?: string;
      };
      sortOrder?: {
        label?: string;
        placeholder?: string;
      };
      status?: {
        label?: string;
        placeholder?: string;
        activeLabel?: string;
        inactiveLabel?: string;
      };
    };
  };
};

export type PermissionActionsCollectionParams = RBACUsersCollectionParams & {
  translations?: PermissionActionsCollectionTranslations;
  fields?: Field[];
  access?: CollectionConfig["access"];
  labels?: CollectionConfig["labels"];
  admin?: CollectionConfig["admin"];
};

export type PermissionActionStatus = (typeof STATUS)[keyof typeof STATUS];

export type PermissionActionType = (typeof TYPE)[keyof typeof TYPE];

export type PermissionAction = {
  id: string | number;
  code?: string | null;
  sortOrder?: number | null;
  type?: PermissionActionType | null;
  status?: PermissionActionStatus | null;
};
