import type { CollectionConfig, Field } from "payload";

export type RolesPermissionsCollectionTranslations = {
  [locale: string]: {
    labels?: {
      singular?: string;
      plural?: string;
    };
    admin?: {
      group?: string;
    };
    fields?: {
      role?: {
        label?: string;
        placeholder?: string;
      };
      permission?: {
        label?: string;
        placeholder?: string;
      };
      enabled?: {
        label?: string;
        placeholder?: string;
      };
    };
  };
};

export type RolesPermissionsCollectionParams = {
  translations?: RolesPermissionsCollectionTranslations;
  fields?: Field[];
  access?: CollectionConfig["access"];
  labels?: CollectionConfig["labels"];
  admin?: CollectionConfig["admin"];
};

export type RolePermission = {
  id: string | number;
  role?: string | number;
  permission?: string | number;
  enabled?: boolean;
};
