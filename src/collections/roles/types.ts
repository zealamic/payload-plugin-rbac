import type { Access, CollectionConfig, Field } from "payload";

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
  access?: Access;
  labels?: CollectionConfig["labels"];
  admin?: CollectionConfig["admin"];
};
