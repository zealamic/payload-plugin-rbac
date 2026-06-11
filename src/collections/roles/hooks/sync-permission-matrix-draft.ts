import type { CollectionAfterChangeHook } from "payload";
import { toID } from "../../../lib/utils/data.js";

type PermissionMatrixDraft = Record<string, boolean>;

const isPermissionMatrixDraft = (value: unknown): value is PermissionMatrixDraft => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "boolean");
};

/**
 * Persists `permissionMatrixDraft` on the role document into `roles-permissions` rows.
 * RBAC checks use `roles-permissions`, not the JSON draft field.
 */
export const syncPermissionMatrixDraftAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  if (!doc.id || !isPermissionMatrixDraft(doc.permissionMatrixDraft)) {
    return;
  }

  const roleID = doc.id;
  const draftPermissionIDs = new Set(Object.keys(doc.permissionMatrixDraft).filter(Boolean));

  for (const [permissionID, enabled] of Object.entries(doc.permissionMatrixDraft)) {
    if (!permissionID) {
      continue;
    }

    const existing = await req.payload.find({
      collection: "roles-permissions",
      depth: 0,
      limit: 1,
      req,
      where: {
        and: [{ role: { equals: roleID } }, { permission: { equals: permissionID } }],
      },
    });

    const row = existing.docs[0];

    if (row?.id) {
      if (row.enabled === enabled) {
        continue;
      }

      await req.payload.update({
        id: row.id,
        collection: "roles-permissions",
        data: { enabled },
        req,
      });
      continue;
    }

    await req.payload.create({
      collection: "roles-permissions",
      data: {
        role: roleID,
        permission: permissionID,
        enabled,
      },
      req,
    });
  }

  const existingForRole = await req.payload.find({
    collection: "roles-permissions",
    depth: 0,
    limit: 0,
    req,
    where: {
      role: { equals: roleID },
    },
  });

  for (const row of existingForRole.docs) {
    const permissionID = toID(row.permission);

    if (!permissionID || draftPermissionIDs.has(permissionID) || !row.enabled) {
      continue;
    }

    await req.payload.update({
      id: row.id,
      collection: "roles-permissions",
      data: { enabled: false },
      req,
    });
  }
};
