import type { Field } from "payload";

export type UsersModificationTranslations = {
  [locale: string]: {
    fields?: {
      isSuperAdmin?: {
        label?: string;
      };
      roles?: {
        label?: string;
      };
    };
  };
};

export type UsersModificationParams = {
  translations?: UsersModificationTranslations;
  fields?: Field[];
  rolesSlug?: string;
};
