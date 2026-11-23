import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type {
  GadgetSummary,
  GadgetSummaryOptions,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";

/** Film-only gadget summaries. The case fixtures reference no gadgets, and
 * the real summaries query Supabase and DuckDB-backed clients, so every gadget
 * reads as unavailable instead of contacting a backend.
 */
function _summarizeUnavailableGadget(
  _ref: Gadget.Ref,
  _options: GadgetSummaryOptions,
): GadgetSummary {
  return { status: "unavailable" };
}

/** Returns the unavailable dashboard summary fixture for case and map films. */
export const useDashboardSummary = _summarizeUnavailableGadget;
/**
 * Returns the unavailable dashboard tile summary fixture for case and map
 * films.
 */
export const useDashboardTileSummary = _summarizeUnavailableGadget;
/** Returns the unavailable dataset summary fixture for case and map films. */
export const useDatasetSummary = _summarizeUnavailableGadget;
/** Returns the unavailable map summary fixture for case and map films. */
export const useMapSummary = _summarizeUnavailableGadget;
/** Returns the unavailable concept summary fixture for case and map films. */
export const useConceptSummary = _summarizeUnavailableGadget;
/**
 * Returns the unavailable individual summary fixture for case and map films.
 */
export const useIndividualSummary = _summarizeUnavailableGadget;
