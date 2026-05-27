import type { Access, CollectionConfig, Field } from "payload";
import { STATUS } from "src/lib/constants/permission.js";

export type PermissionsCollectionTranslations = {
  [locale: string]: {
    labels?: {
      singular?: string;
      plural?: string;
    };
    admin?: {
      group?: string;
    };
    fields?: {
      name?: {
        label?: string;
        placeholder?: string;
      };
      permissionFeature?: {
        label?: string;
        placeholder?: string;
      };
      permissionAction?: {
        label?: string;
        placeholder?: string;
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

export type PermissionsCollectionParams = {
  translations?: PermissionsCollectionTranslations;
  fields?: Field[];
  access?: Access;
  labels?: CollectionConfig["labels"];
  admin?: CollectionConfig["admin"];
};

export type PermissionItemRef = string | number | { id?: string | number };

export type PermissionStatus = (typeof STATUS)[keyof typeof STATUS];

export type Permission = {
  id: string | number;
  permissionFeature?: PermissionItemRef;
  permissionAction?: PermissionItemRef;
  status?: PermissionStatus | null;
};
