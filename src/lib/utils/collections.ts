import type { CustomComponent } from "payload";

export const mergeBeforeListTable = (
  pluginComponent: string,
  consumerComponents?: CustomComponent[] | null,
): CustomComponent[] => [pluginComponent, ...(consumerComponents ?? [])];
