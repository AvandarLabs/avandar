/**
 * Kinds of gadget a comment can reference. A gadget is any platform object
 * a comment can link or embed. See docs/measles-demo/gadgets.md.
 *
 * Enum values:
 *
 * `dashboard` - A row in `dashboards`.
 * `dashboard_tile` - A DataViz block inside a dashboard's `config`. The
 *   reference's id is the dashboard's and its sub id is the block's.
 * `dataset` - A row in `datasets`.
 * `map` - A row in `maps`.
 * `concept` - A case type, a row in `concepts`.
 * `individual` - A case, a row in `individuals`.
 */
create type public.gadget_type as enum(
  'dashboard',
  'dashboard_tile',
  'dataset',
  'map',
  'concept',
  'individual'
);
