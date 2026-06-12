"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { RolePermissionMatrixClientComponents } from "../types.js";

const MatrixComponentsContext = createContext<RolePermissionMatrixClientComponents>({});

export const MatrixComponentsProvider = ({
  children,
  components,
}: {
  children: ReactNode;
  components: RolePermissionMatrixClientComponents;
}) => (
  <MatrixComponentsContext.Provider value={components}>{children}</MatrixComponentsContext.Provider>
);

export const useMatrixComponents = () => useContext(MatrixComponentsContext);
