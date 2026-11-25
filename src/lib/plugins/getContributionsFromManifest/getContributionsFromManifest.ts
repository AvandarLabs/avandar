import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/**
 * One thing a plugin adds to the app, such as a toolbar command or a chart
 * type. `title` is the manifest string as written, usually a `%key%`
 * reference that the caller localizes with the plugin's strings.
 */
export type PluginContribution = { id: string; title: string };

/**
 * What a plugin adds to the app, grouped by where it shows up, for example to
 * list a plugin's additions on its settings card before it is installed.
 */
export type PluginContributions = {
  /** Data Explorer toolbar commands, in menu order, each listed once. */
  dataExplorerToolbarCommands: PluginContribution[];

  /** Chart types, in the order the manifest declares them. */
  chartTypes: PluginContribution[];
};

/**
 * Gets what a manifest contributes, with titles left as manifest strings.
 * Use it wherever a plugin's additions are listed by name, such as a summary
 * that tells an admin what installing the plugin would add.
 */
export function getContributionsFromManifest(
  manifest: Readonly<PluginManifest>,
): PluginContributions {
  const { commands, menus, vizTypes } = manifest.contributes;
  // A command can sit in the toolbar more than once under different `when`
  // conditions, but it is still one addition.
  const toolbarCommandIds = new Set(
    (menus["dataExplorer.toolbar"] ?? []).map((menuEntry) => {
      return menuEntry.command;
    }),
  );
  return {
    dataExplorerToolbarCommands: [...toolbarCommandIds].flatMap((commandId) => {
      const command = commands.find((candidateCommand) => {
        return candidateCommand.id === commandId;
      });
      return command === undefined
        ? []
        : [{ id: command.id, title: command.title }];
    }),
    chartTypes: vizTypes.map((vizType) => {
      return { id: vizType.id, title: vizType.title };
    }),
  };
}
