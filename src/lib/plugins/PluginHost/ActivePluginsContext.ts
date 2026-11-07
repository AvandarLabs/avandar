import { createContext } from "react";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";

/**
 * The plugins whose contributions are live in the current workspace. The
 * plugin host provides it, and `usePluginMenuItems` reads it to pick the
 * commands a slot shows. It is empty outside a host, so a slot rendered there
 * shows nothing.
 */
export const ActivePluginsContext = createContext<readonly ActivePlugin[]>([]);
