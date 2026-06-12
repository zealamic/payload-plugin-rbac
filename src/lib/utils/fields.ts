import type { Field } from "payload";
import { fieldAffectsData } from "payload/shared";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeFieldAdmin = (
  defaultAdmin: Field["admin"] | undefined,
  customAdmin: Field["admin"] | undefined,
): Field["admin"] => {
  if (!defaultAdmin) {
    return customAdmin;
  }

  if (!customAdmin) {
    return defaultAdmin;
  }

  const defaultComponents = isPlainObject(defaultAdmin.components) ? defaultAdmin.components : {};
  const customComponents = isPlainObject(customAdmin.components) ? customAdmin.components : {};

  return {
    ...defaultAdmin,
    ...customAdmin,
    components: {
      ...defaultComponents,
      ...customComponents,
    },
  } as Field["admin"];
};

/**
 * Merges one plugin default field with a host override that shares the same `name`.
 * Custom properties win; `admin` and `admin.components` are deep-merged.
 * Non-data fields (e.g. tabs, unnamed layout fields) are returned unchanged.
 */
export const getMergedFieldAffectingData = ({
  fields,
  defaultField,
}: {
  fields: Field[];
  defaultField: Field;
}): Field => {
  if (!defaultField || !fieldAffectsData(defaultField)) {
    return defaultField;
  }

  const defaultName = defaultField.name;
  const customField = fields.find((field) => fieldAffectsData(field) && field.name === defaultName);

  if (customField) {
    return {
      ...defaultField,
      ...customField,
      admin: mergeFieldAdmin(defaultField.admin, customField.admin),
    } as Field;
  }

  return defaultField;
};

/**
 * Builds the final `fields` array for a collection: each default is merged by name,
 * then host-only fields are appended (data fields with new names, plus layout fields).
 */
export const getArrayOfMergedFieldAffectingData = ({
  fields,
  defaultFields,
}: {
  fields: Field[];
  defaultFields: Field[];
}): Field[] => {
  const defaultNames = new Set(defaultFields.filter(fieldAffectsData).map((field) => field.name));

  const mergedFromDefaults = defaultFields.map((defaultField) =>
    getMergedFieldAffectingData({ fields, defaultField }),
  );

  const unMatchedFields = fields.filter((field) => {
    if (!fieldAffectsData(field)) {
      return true;
    }
    return !defaultNames.has(field.name);
  });

  return [...mergedFromDefaults, ...unMatchedFields];
};
