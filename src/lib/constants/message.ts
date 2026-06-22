export const ERROR_KEYS = {
  UNAUTHORIZED: "unauthorized",
  INVALID_DATA: "invalid_data",
  INTERNAL_SERVER_ERROR: "internal_server_error",
  DATA_MUST_BE_AN_SORTED_ARRAY: "data_must_be_an_array_of_sorted_items",
  ARRAY_ITEM_MUST_HAVE_ID_AND_SORT_ORDER: "array_item_must_have_id_and_sort_order",
} as const;

export const SUCCESS_KEYS = {
  UPDATE_SUCCESS: "update_success",
} as const;
