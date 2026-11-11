import type {
  GadgetSummary,
  GadgetSummaryOptions,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

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

export const useDashboardSummary = _summarizeUnavailableGadget;
export const useDashboardTileSummary = _summarizeUnavailableGadget;
export const useDatasetSummary = _summarizeUnavailableGadget;
export const useMapSummary = _summarizeUnavailableGadget;
export const useConceptSummary = _summarizeUnavailableGadget;
export const useIndividualSummary = _summarizeUnavailableGadget;
