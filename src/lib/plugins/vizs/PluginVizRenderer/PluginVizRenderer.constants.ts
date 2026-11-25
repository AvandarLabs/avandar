/**
 * The most result rows a plugin chart component receives. A component draws
 * every row it gets, so this keeps a large result from freezing the page. A
 * transform reads every row instead, since it usually aggregates them first.
 */
export const PLUGIN_VIZ_COMPONENT_ROW_LIMIT = 1_000;
