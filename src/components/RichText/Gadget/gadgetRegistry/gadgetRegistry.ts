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
 * How one gadget type looks and resolves. `noun` is the lowercase word used
 * inside sentences ("Unavailable dashboard"); `label` is the capitalized type
 * name shown on its own, such as beside a card's title.
 */
export type GadgetDefinition = {
  Icon: Icon;
  noun: MessageDescriptor;
  label: MessageDescriptor;
  useGadgetSummary: (ref: Gadget.Ref) => GadgetSummary;
};

/**
 * Every gadget type's icon, nouns, and summary hook. Use it wherever a gadget
 * ref is shown, for example a chip or card in a comment, which calls
 * `GADGET_REGISTRY[ref.gadgetType].useGadgetSummary(ref)` once per render.
 * Adding a type to `GADGET_TYPES` fails to compile until it has an entry here.
 */
export const GADGET_REGISTRY: Readonly<Record<Gadget.Type, GadgetDefinition>> =
  {
    dashboard: {
      Icon: IconLayoutDashboard,
      noun: msg`dashboard`,
      label: msg`Dashboard`,
      useGadgetSummary: useDashboardSummary,
    },
    dashboard_tile: {
      Icon: IconChartBar,
      noun: msg`tile`,
      label: msg`Dashboard tile`,
      useGadgetSummary: useDashboardTileSummary,
    },
    dataset: {
      Icon: IconDatabase,
      noun: msg`dataset`,
      label: msg`Dataset`,
      useGadgetSummary: useDatasetSummary,
    },
    map: {
      Icon: IconMap2,
      noun: msg`map`,
      label: msg`Map`,
      useGadgetSummary: useMapSummary,
    },
    concept: {
      Icon: IconFolders,
      noun: msg`case type`,
      label: msg`Case type`,
      useGadgetSummary: useConceptSummary,
    },
    individual: {
      Icon: IconFileText,
      noun: msg`case`,
      label: msg`Case`,
      useGadgetSummary: useIndividualSummary,
    },
  };
