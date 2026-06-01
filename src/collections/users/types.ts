import type { Field } from "payload";

export type UsersModificationTranslations = {
  [locale: string]: {
    fields?: {
      isSuperAdmin?: {
        label?: string;
      };
      roles?: {
        label?: string;
        placeholder?: string;
      };
      parent?: {
        label?: string;
        placeholder?: string;
      };
    };
  };
};

export type UsersModificationParams = {
  translations?: UsersModificationTranslations;
  fields?: Field[];
  rolesSlug?: string;
};
