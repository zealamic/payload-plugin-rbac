import type { PermissionFeature } from "../../collections/permission-features/types.js";
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

export const fetchPermissionFeatures = async ({
  apiBase,
  signal,
}: {
  apiBase: string;
  signal?: AbortSignal;
}): Promise<PermissionFeature[]> => {
  const base = apiBase || "/api";
  const response = await fetch(`${base}/permission-features?limit=0&depth=0&sort=sortOrder`, {
    credentials: "include",
    signal,
  });

  const json = await parseListResponse<PermissionFeature>(response, "permission-features");
  return json.docs ?? [];
};

export const moveItems = <T>(items: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
};

export const applySortOrders = (items: PermissionFeature[]): PermissionFeature[] =>
  items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));

export const getSortOrderChanges = (
  current: PermissionFeature[],
  original: PermissionFeature[],
): PermissionFeature[] => {
  const originalById = new Map(original.map((item) => [String(item.id), item.sortOrder ?? 0]));

  return current.filter((item) => {
    const id = String(item.id);
    const nextOrder = item.sortOrder ?? 0;
    return originalById.get(id) !== nextOrder;
  });
};

export const savePermissionFeatureSortOrders = async ({
  apiBase,
  items,
}: {
  apiBase: string;
  items: PermissionFeature[];
}): Promise<void> => {
  const base = apiBase || "/api";
  const response = await fetch(`${base}/permission-features/reorder`, {
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
        `Failed to save permission feature order: ${response.status} ${response.statusText}`,
    );
  }
};
