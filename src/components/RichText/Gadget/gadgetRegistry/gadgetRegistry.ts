import { msg } from "@lingui/core/macro";
import {
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconFolders,
  IconLayoutDashboard,
  IconMap2,
} from "@tabler/icons-react";
import {
  useConceptSummary,
  useDashboardSummary,
  useDashboardTileSummary,
  useDatasetSummary,
  useIndividualSummary,
  useMapSummary,
} from "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { MessageDescriptor } from "@lingui/core";
import type { Icon } from "@tabler/icons-react";
import type { LinkProps } from "@tanstack/react-router";

/** Where opening a gadget goes, as a TanStack Router link target. */
export type GadgetLinkTarget = {
  to: NonNullable<LinkProps["to"]>;
  params: Record<string, string>;
  search?: Record<string, string>;
};

/** One fact on a gadget card. */
export type GadgetFact = { label: MessageDescriptor; value: string };

/** What a reader sees for one gadget ref. */
export type GadgetSummary =
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "available";
      name: string;
      facts: readonly GadgetFact[];
      link: GadgetLinkTarget;
    };

/**
 * What a summary hook needs to fetch. A chip shows only the name, so it
 * passes `withFacts: false` and each type skips its secondary lookups.
 */
export type GadgetSummaryOptions = { withFacts: boolean };

/**
 * How one gadget type looks and resolves. Each state is a whole message
 * rather than a noun spliced into a sentence, so translators can inflect it.
 */
export type GadgetDefinition = {
  Icon: Icon;

  /** The capitalized type name, such as beside a card's title. */
  label: MessageDescriptor;

  /** The editor's action that opens the gadget, such as "Open dashboard". */
  openLabel: MessageDescriptor;
  loadingLabel: MessageDescriptor;
  unavailableLabel: MessageDescriptor;

  /** Warns an author that some readers will see the gadget as unavailable. */
  limitedAudienceHint: MessageDescriptor;
  useGadgetSummary: (
    ref: Gadget.Ref,
    options: GadgetSummaryOptions,
  ) => GadgetSummary;
};

/**
 * Every gadget type's icon, copy, and summary hook. Use it wherever a gadget
 * ref is shown, for example a chip or card in a comment, which calls
 * `GADGET_REGISTRY[ref.gadgetType].useGadgetSummary(ref, options)` once per
 * render. Adding a type to `GADGET_TYPES` fails to compile until it has an
 * entry here.
 */
export const GADGET_REGISTRY: Readonly<Record<Gadget.Type, GadgetDefinition>> =
  {
    dashboard: {
      Icon: IconLayoutDashboard,
      label: msg`Dashboard`,
      openLabel: msg`Open dashboard`,
      loadingLabel: msg`Loading dashboard`,
      unavailableLabel: msg`Unavailable dashboard`,
      limitedAudienceHint: msg`Only some people can open this dashboard. Teammates on this case without access will see "Unavailable".`,
      useGadgetSummary: useDashboardSummary,
    },
    dashboard_tile: {
      Icon: IconChartBar,
      label: msg`Dashboard tile`,
      openLabel: msg`Open dashboard tile`,
      loadingLabel: msg`Loading dashboard tile`,
      unavailableLabel: msg`Unavailable dashboard tile`,
      limitedAudienceHint: msg`Only some people can open this dashboard tile. Teammates on this case without access will see "Unavailable".`,
      useGadgetSummary: useDashboardTileSummary,
    },
    dataset: {
      Icon: IconDatabase,
      label: msg`Dataset`,
      openLabel: msg`Open dataset`,
      loadingLabel: msg`Loading dataset`,
      unavailableLabel: msg`Unavailable dataset`,
      limitedAudienceHint: msg`Only some people can open this dataset. Teammates on this case without access will see "Unavailable".`,
      useGadgetSummary: useDatasetSummary,
    },
    map: {
      Icon: IconMap2,
      label: msg`Map`,
      openLabel: msg`Open map`,
      loadingLabel: msg`Loading map`,
      unavailableLabel: msg`Unavailable map`,
      limitedAudienceHint: msg`Only some people can open this map. Teammates on this case without access will see "Unavailable".`,
      useGadgetSummary: useMapSummary,
    },
    concept: {
      Icon: IconFolders,
      label: msg`Case type`,
      openLabel: msg`Open case type`,
      loadingLabel: msg`Loading case type`,
      unavailableLabel: msg`Unavailable case type`,
      limitedAudienceHint: msg`Only some people can open this case type. Teammates on this case without access will see "Unavailable".`,
      useGadgetSummary: useConceptSummary,
    },
    individual: {
      Icon: IconFileText,
      label: msg`Case`,
      openLabel: msg`Open case`,
      loadingLabel: msg`Loading case`,
      unavailableLabel: msg`Unavailable case`,
      limitedAudienceHint: msg`Only some people can open this case. Teammates on this case without access will see "Unavailable".`,
      useGadgetSummary: useIndividualSummary,
    },
  };
