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

  const existingForRole = await req.payload.find({
    collection: "roles-permissions",
    depth: 0,
    limit: 0,
    req,
    where: {
      role: { equals: roleID },
    },
  });

  const existingByPermissionID = new Map<string, (typeof existingForRole.docs)[number]>();

  for (const row of existingForRole.docs) {
    const permissionID = toID(row.permission);

    if (permissionID) {
      existingByPermissionID.set(permissionID, row);
    }
  }

  const writeOperations: Promise<unknown>[] = [];

  for (const [permissionID, enabled] of Object.entries(doc.permissionMatrixDraft)) {
    if (!permissionID) {
      continue;
    }

    const row = existingByPermissionID.get(permissionID);

    if (row?.id) {
      if (row.enabled === enabled) {
        continue;
      }

      writeOperations.push(
        req.payload.update({
          id: row.id,
          collection: "roles-permissions",
          data: { enabled },
          req,
        }),
      );
      continue;
    }

    writeOperations.push(
      req.payload.create({
        collection: "roles-permissions",
        data: {
          role: roleID,
          permission: permissionID,
          enabled,
        },
        req,
      }),
    );
  }

  for (const row of existingForRole.docs) {
    const permissionID = toID(row.permission);

    if (!permissionID || draftPermissionIDs.has(permissionID) || !row.enabled || !row.id) {
      continue;
    }

    writeOperations.push(
      req.payload.update({
        id: row.id,
        collection: "roles-permissions",
        data: { enabled: false },
        req,
      }),
    );
  }

  if (writeOperations.length > 0) {
    await Promise.all(writeOperations);
  }
};
