import type { PermissionAction } from "../../collections/permission-actions/types.js";
import { TYPE } from "../../lib/constants/permission-action.js";
import type { ApiListResponse } from "../../types.js";

const parseListResponse = async <T>(
  response: Response,
  resource: string,
): Promise<ApiListResponse<T>> => {
  if (!response.ok) {
    throw new Error(`Failed to fetch ${resource}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ApiListResponse<T>;
};

type ReorderResponse = {
  error?: string;
  message?: string;
  success?: boolean;
};

export const fetchPermissionActions = async ({
  apiBase,
  signal,
}: {
  apiBase: string;
  signal?: AbortSignal;
}): Promise<PermissionAction[]> => {
  const base = apiBase || "/api";
  const response = await fetch(`${base}/permission-actions?limit=0&depth=0&sort=sortOrder`, {
    credentials: "include",
    signal,
  });

  const json = await parseListResponse<PermissionAction>(response, "permission-actions");
  return json.docs ?? [];
};

export const moveItems = <T>(items: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
};

export const applySortOrders = (items: PermissionAction[]): PermissionAction[] =>
  items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));

export const splitPermissionActionsByType = (items: PermissionAction[]) => ({
  mainItems: applySortOrders(items.filter((item) => item.type === TYPE.MAIN)),
  subItems: applySortOrders(items.filter((item) => item.type === TYPE.SUB)),
});

export const mergePermissionActionsByType = (
  mainItems: PermissionAction[],
  subItems: PermissionAction[],
): PermissionAction[] => [...applySortOrders(mainItems), ...applySortOrders(subItems)];

export const getSortOrderChanges = (
  current: PermissionAction[],
  original: PermissionAction[],
): PermissionAction[] => {
  const originalById = new Map(original.map((item) => [String(item.id), item.sortOrder ?? 0]));

  return current.filter((item) => {
    const id = String(item.id);
    const nextOrder = item.sortOrder ?? 0;
    return originalById.get(id) !== nextOrder;
  });
};

export const savePermissionActionSortOrders = async ({
  apiBase,
  items,
}: {
  apiBase: string;
  items: PermissionAction[];
}): Promise<void> => {
  const base = apiBase || "/api";
  const response = await fetch(`${base}/permission-actions/reorder`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sortedItems: items.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder ?? 0,
      })),
    }),
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as ReorderResponse;

    throw new Error(
      json.error ??
        `Failed to save permission action order: ${response.status} ${response.statusText}`,
    );
  }
};
