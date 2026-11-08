/**
 * The chart building blocks a plugin chart component may render: a curated
 * set of Recharts components, plus `useChartTheme` for Avandar's chart
 * colors. Plugins import chart code only from this module, so the host
 * controls which chart components plugins can render.
 */
export {
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Legend,
  ReferenceLine,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export { useChartTheme } from "@plugin-ui/useChartTheme/useChartTheme";
export type { ChartTheme } from "@plugin-ui/useChartTheme/useChartTheme";
