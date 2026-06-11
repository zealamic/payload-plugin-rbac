import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from "payload";
import { PARENT_PATH_SEPARATOR } from "../../lib/constants/user.js";
import { toID } from "../../lib/utils/data.js";

type UserDoc = {
  id?: string | number;
  parent?: ItemRef;
  parentPath?: string | null;
};

const getParentId = (parent: ItemRef | null | undefined): string | undefined => {
  const id = toID(parent ?? undefined);
  return id || undefined;
};

/** Ancestor IDs from root to parent (exclusive of self), e.g. `"1,2"`. */
export const buildParentPathFromParentDoc = (parent: UserDoc | null | undefined): string => {
  if (!parent?.id) {
    return "";
  }

  const parentId = String(parent.id);
  const ancestorPath = parent.parentPath?.trim();

  if (!ancestorPath) {
    return parentId;
  }

  return `${ancestorPath}${PARENT_PATH_SEPARATOR}${parentId}`;
};

export const computeParentPath = async ({
  parentId,
  req,
  userSlug,
}: {
  parentId?: string;
  req: PayloadRequest;
  userSlug: string;
}): Promise<string> => {
  if (!parentId) {
    return "";
  }

  const parentDoc = await req.payload.findByID({
    collection: userSlug,
    id: parentId,
    depth: 0,
    req,
  });

  return buildParentPathFromParentDoc(parentDoc as UserDoc);
};

const pathContainsId = (parentPath: string, id: string): boolean => {
  if (!parentPath) {
    return false;
  }

  return parentPath.split(PARENT_PATH_SEPARATOR).includes(id);
};

const validateParentAssignment = async ({
  userId,
  parentId,
  req,
  userSlug,
}: {
  userId?: string | number;
  parentId?: string;
  req: PayloadRequest;
  userSlug: string;
}): Promise<string | true> => {
  if (!parentId) {
    return true;
  }

  if (userId && String(parentId) === String(userId)) {
    return "A user cannot be their own parent.";
  }

  if (!userId) {
    return true;
  }

  const parentDoc = await req.payload.findByID({
    collection: userSlug,
    id: parentId,
    depth: 0,
    req,
  });

  const parentPath = (parentDoc as UserDoc).parentPath ?? "";

  if (pathContainsId(parentPath, String(userId))) {
    return "Cannot assign a descendant as parent (would create a cycle).";
  }

  return true;
};

const syncDescendantParentPaths = async ({
  userId,
  req,
  userSlug,
}: {
  userId: string | number;
  req: PayloadRequest;
  userSlug: string;
}): Promise<void> => {
  const children = await req.payload.find({
    collection: userSlug,
    depth: 0,
    limit: 0,
    pagination: false,
    req,
    where: {
      parent: { equals: userId },
    },
  });

  for (const child of children.docs as UserDoc[]) {
    if (!child.id) {
      continue;
    }

    const parentId = getParentId(child.parent);
    const nextParentPath = await computeParentPath({
      parentId,
      req,
      userSlug,
    });

    if ((child.parentPath ?? "") === nextParentPath) {
      await syncDescendantParentPaths({
        userId: child.id,
        req,
        userSlug,
      });
      continue;
    }

    await req.payload.update({
      collection: userSlug,
      id: child.id,
      data: { parentPath: nextParentPath },
      depth: 0,
      req,
      overrideAccess: true,
    });

    await syncDescendantParentPaths({
      userId: child.id,
      req,
      userSlug,
    });
  }
};

export const createUserParentPathHooks = (userSlug: string) => {
  const beforeChange: CollectionBeforeChangeHook = async ({
    data,
    req,
    operation,
    originalDoc,
  }) => {
    const incoming = data as UserDoc;
    const previous = originalDoc as UserDoc | undefined;

    const parentRef =
      incoming.parent !== undefined
        ? incoming.parent
        : operation === "update"
          ? previous?.parent
          : undefined;

    const parentId = getParentId(parentRef);

    const validation = await validateParentAssignment({
      userId: operation === "update" ? (previous?.id ?? incoming.id) : incoming.id,
      parentId,
      req,
      userSlug,
    });

    if (validation !== true) {
      throw new Error(validation);
    }

    incoming.parentPath = await computeParentPath({
      parentId,
      req,
      userSlug,
    });

    return incoming;
  };

  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, operation }) => {
    const current = doc as UserDoc;
    const previous = previousDoc as UserDoc | undefined;

    if (!current.id) {
      return doc;
    }

    const previousParentId = getParentId(previous?.parent);
    const nextParentId = getParentId(current.parent);

    const parentChanged = operation === "create" || previousParentId !== nextParentId;

    if (parentChanged) {
      await syncDescendantParentPaths({
        userId: current.id,
        req,
        userSlug,
      });
    }

    return doc;
  };

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    const deleted = doc as UserDoc | undefined;

    if (!deleted?.id) {
      return;
    }

    const children = await req.payload.find({
      collection: userSlug,
      depth: 0,
      limit: 0,
      pagination: false,
      req,
      where: {
        parent: { equals: deleted.id },
      },
    });

    for (const child of children.docs as UserDoc[]) {
      if (!child.id) {
        continue;
      }

      await req.payload.update({
        collection: userSlug,
        id: child.id,
        data: {
          parent: null,
          parentPath: "",
        },
        depth: 0,
        req,
        overrideAccess: true,
      });

      await syncDescendantParentPaths({
        userId: child.id,
        req,
        userSlug,
      });
    }
  };

  return { beforeChange, afterChange, afterDelete };
};

const mergeHookArrays = <T>(existing: T[] | T | undefined, added: T): T[] => {
  const base = Array.isArray(existing) ? existing : existing ? [existing] : [];
  return [...base, added];
};

export const mergeUserCollectionHooks = ({
  existingHooks,
  userSlug,
}: {
  existingHooks?: {
    beforeChange?: CollectionBeforeChangeHook[] | CollectionBeforeChangeHook;
    afterChange?: CollectionAfterChangeHook[] | CollectionAfterChangeHook;
    afterDelete?: CollectionAfterDeleteHook[] | CollectionAfterDeleteHook;
  };
  userSlug: string;
}) => {
  const { beforeChange, afterChange, afterDelete } = createUserParentPathHooks(userSlug);

  return {
    ...existingHooks,
    beforeChange: mergeHookArrays(existingHooks?.beforeChange, beforeChange),
    afterChange: mergeHookArrays(existingHooks?.afterChange, afterChange),
    afterDelete: mergeHookArrays(existingHooks?.afterDelete, afterDelete),
  };
};
