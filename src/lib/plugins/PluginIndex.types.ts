import type { CompiledPluginManifest } from "@avandar/plugin-manifest/runtime";
import type { PluginMessages } from "@avandar/plugin-sdk";
import type { ComponentType } from "react";

/** A Tabler icon component a manifest names. */
export type PluginIconComponent = ComponentType<{
  size?: number | string;
  "aria-hidden"?: boolean;
}>;

/** The lazily loaded manifest chunk of one plugin. */
export type PluginManifestModule = CompiledPluginManifest &
  Readonly<{ icons: Readonly<Record<string, PluginIconComponent>> }>;

/**
 * The lazily loaded code chunk of one plugin. `definition` is unknown until
 * the host checks it with `isPluginDefinition`.
 */
export type PluginCodeModule = Readonly<{
  definition: unknown;
  messages: PluginMessages;
}>;

/** One bundled plugin in `virtual:ava-plugin-index`. */
export type PluginIndexEntry = Readonly<{
  id: string;
  loadManifest: () => Promise<PluginManifestModule>;
  loadCode: () => Promise<PluginCodeModule>;

  /**
   * Present only when the manifest declares content. Resolves each content
   * id to the URL its bundled file is served from, for example to fetch the
   * file when the install wizard imports it. Loading it fetches no content.
   */
  loadContentUrls?: () => Promise<Readonly<Record<string, string>>>;
}>;
