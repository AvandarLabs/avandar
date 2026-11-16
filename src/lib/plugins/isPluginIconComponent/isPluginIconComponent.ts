import type { PluginIconComponent } from "@/lib/plugins/PluginIndex.types";

/**
 * True when a manifest icon is something React can render as a component.
 * Rendering anything else throws, so a slot checks this before it renders an
 * icon and shows the command or plugin without one instead.
 *
 * A function component qualifies, and so does a `forwardRef` or `memo`
 * component, which is an object tagged with a symbol `$$typeof`. Tabler icons
 * are `forwardRef` components. A component that went through JSON, such as one
 * restored from a persisted query cache, comes back as a plain object with no
 * such tag, and does not qualify.
 */
export function isPluginIconComponent(
  value: unknown,
): value is PluginIconComponent {
  if (typeof value === "function") {
    return true;
  }
  return (
    typeof value === "object" &&
    value !== null &&
    "$$typeof" in value &&
    typeof value.$$typeof === "symbol"
  );
}
