import type { Access, CollectionConfig, Field } from "payload";
import { STATUS } from "../../lib/constants/permission-feature.js";

export type PermissionFeaturesCollectionTranslations = {
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

export type PermissionFeaturesCollectionParams = {
  translations?: PermissionFeaturesCollectionTranslations;
  fields?: Field[];
  access?: Access;
  labels?: CollectionConfig["labels"];
  admin?: CollectionConfig["admin"];
};

export type PermissionFeatureStatus = (typeof STATUS)[keyof typeof STATUS];

export type PermissionFeature = {
  id: string | number;
  code?: string | null;
  sortOrder?: number | null;
  status?: PermissionFeatureStatus | null;
};
