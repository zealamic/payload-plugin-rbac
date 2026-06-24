import type { CollectionBeforeChangeHook } from "payload";

export const createdByOnCreateBeforeChangeHook: CollectionBeforeChangeHook = ({
  req,
  data,
  operation,
}) => {
  if (operation === "create" && req.user?.id && !data?.createdBy) {
    return {
      ...data,
      createdBy: req.user.id,
    };
  }

  return data;
};
