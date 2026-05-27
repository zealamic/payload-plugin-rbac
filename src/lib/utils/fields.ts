import type { Field } from "payload";
import { fieldAffectsData } from "payload/shared";

/**
 * Merges one plugin default field with a host override that shares the same `name`.
 * Custom properties win (`{ ...defaultField, ...customField }`). Non-data fields
 * (e.g. tabs, unnamed layout fields) are returned unchanged.
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
  const customField = fields.find(
    (field) => fieldAffectsData(field) && field.name === defaultName,
  );

  if (customField) {
    return {
      ...defaultField,
      ...customField,
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
  const defaultNames = new Set(
    defaultFields.filter(fieldAffectsData).map((field) => field.name),
  );

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
