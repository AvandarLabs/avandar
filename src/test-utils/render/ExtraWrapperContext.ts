import { createContext } from "react";
import type { ComponentType, ReactNode } from "react";

export const ExtraWrapperContext = createContext<
  ComponentType<{ children: ReactNode }> | undefined
>(undefined);
