# @avandar/plugin-sdk

The API Avandar plugins are written against. Plugins run in-process in the
host app. Calls are async or fire-and-forget and pass serializable data. There
are two exceptions: `i18n.t` is synchronous and runs on the plugin side, and
the `content` of `ui.openModal` and `ui.openDrawer` is a React tree that the
host renders.

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `definePlugin` | Function | Declares a plugin's command handlers, chart types, and AI tool handlers. A plugin's entry module exports the result as its default export |
| `isPluginDefinition` | Function | Checks that a value came from `definePlugin`, so a host can validate a plugin's entry module before it runs a command or draws a chart |
| `makePluginTranslator` | Function | Makes a translator for a plugin's own ICU messages. A key falls back from the exact locale to its base language (`es` for `es-MX`), then English, then the bare key. A message that cannot be compiled or formatted is returned as written instead of throwing |
| `AvandarProvider` | Component | Gives plugin UI access to its scoped `avandar` API. The host renders it around content a plugin opens |
| `PluginVizProvider` | Component | Marks plugin chart content, so `useT` returns the chart's translator. The host renders it around every plugin chart component |
| `useAvandar` | Hook | Gets the scoped `avandar` API inside plugin UI. Throws a `PluginError` outside an `AvandarProvider`, and inside a plugin chart the error names the chart type |
| `useT` | Hook | Gets the plugin's translator inside plugin UI or a plugin chart |
| `PluginError` | Class | A typed error from the plugin API. Branch on its `code` |
| `PluginErrorCode` | Type | Why a plugin API call failed: `PermissionDenied`, `InvalidHandle`, `LoadFailed`, `CommandFailed`, or `InvalidToolInput` |
| `AvandarApi` | Type | The API a plugin receives, scoped to one plugin, workspace, user, and invocation |
| `CommandHandler` | Type | Runs when a user invokes a plugin command |
| `AiToolHandler` | Type | Runs when the data agent's model calls a plugin AI tool. It gets the model's arguments and returns the result the model reads |
| `PluginDefinition` | Type | What a plugin's entry module exports as its default |
| `PluginVizDefinition` | Type | How a plugin draws one chart type: a `transform` or a `Component` |
| `PluginVizTransform` | Type | Turns a chart's input into rows plus a `PluginChartSpec` |
| `PluginVizTransformResult` | Type | What a transform returns: the rows and the chart spec |
| `PluginChartSpec` | Type | The built-in bar, line, or area chart a transform asks Avandar to draw |
| `PluginVizInput` | Type | What a chart receives: rows, columns, settings, and whether the rows are truncated |
| `PluginVizContext` | Type | The translator and locale a transform receives |
| `PluginVizComponentProps` | Type | A chart component's props: its input plus the measured width and height |
| `PluginVizSettingValue` | Type | A value a chart setting holds |
| `PluginInvocationContext` | Type | What a command was invoked on. One variant per slot |
| `DataExplorerToolbarContext` | Type | The invocation context for a Data Explorer toolbar command |
| `AgentToolContext` | Type | The invocation context for an AI tool: the query result the data agent was working with |
| `PluginColumnDataType` | Type | A column type in a query result, matching Avandar's data types |
| `QueryHandle` | Type | An opaque reference to a query result, passed back to `avandar.data.fetchRows` |
| `FetchRowsOptions` | Type | Options for `avandar.data.fetchRows` |
| `FetchRowsResult` | Type | Rows returned by `avandar.data.fetchRows` |
| `PluginMessages` | Type | Locale code to message key to ICU message, from `locales/<lang>.json` |
| `TranslationValues` | Type | Values interpolated into an ICU message |
| `PluginOverlayOptions` | Type | A modal or drawer a plugin opens |
| `PluginNotifyOptions` | Type | A notification a plugin shows |
