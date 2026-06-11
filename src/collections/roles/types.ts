import type { CollectionConfig, Field } from "payload";
import type { DATA_SCOPE, STATUS } from "../../lib/constants/role.js";

export type DataScope = (typeof DATA_SCOPE)[keyof typeof DATA_SCOPE];
export type RoleStatus = (typeof STATUS)[keyof typeof STATUS];

export type RolesCollectionTranslations = {
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
      name?: {
        label?: string;
        placeholder?: string;
      };
      description?: {
        label?: string;
        placeholder?: string;
      };
      status?: {
        label?: string;
        placeholder?: string;
        activeLabel?: string;
        inactiveLabel?: string;
      };
      dataScope?: {
        label?: string;
        placeholder?: string;
        allLabel?: string;
        ownLabel?: string;
        hierarchyLabel?: string;
      };
      permissionMatrix?: {
        label?: string;
        placeholder?: string;
      };
    };
  };
};

export type RolesCollectionParams = {
  translations?: RolesCollectionTranslations;
  fields?: Field[];
  access?: CollectionConfig["access"];
  labels?: CollectionConfig["labels"];
  admin?: CollectionConfig["admin"];
};
