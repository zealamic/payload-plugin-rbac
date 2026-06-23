import type { CollectionConfig, Field } from "payload";
import type { RBACUsersCollectionParams } from "../shared/types.js";
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

export type PermissionFeaturesCollectionParams = RBACUsersCollectionParams & {
  translations?: PermissionFeaturesCollectionTranslations;
  fields?: Field[];
  access?: CollectionConfig["access"];
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
