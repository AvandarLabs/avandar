import type { ReactNode } from "react";
/** Copy for one catalog family. */
type SectionContent = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  all: string;
  navigation: string;
  search: string;
  empty: string;
};
/** Section copy, so one gallery serves both Compositions and Sample films. */
export function getCompositionSectionContentFromSection({
  section,
}: Readonly<{ section: "films" | "compositions" }>): SectionContent {
  return section === "films"
    ? {
        eyebrow: "SAMPLE FILMS",
        title: (
          <>
            Stories, <em>start to finish.</em>
          </>
        ),
        description:
          "Complete films built from the motion library. Each one sequences several compositions into a single argument.",
        all: "All films",
        navigation: "Film categories",
        search: "Search films",
        empty: "No matching films.",
      }
    : {
        eyebrow: "THE COMPOSITION COLLECTION",
        title: (
          <>
            Motions, <em>combined.</em>
          </>
        ),
        description:
          "Reusable compositions: transitions, compositing and recipes that sequence or layer two or more motions.",
        all: "All compositions",
        navigation: "Composition categories",
        search: "Search compositions",
        empty: "No matching compositions.",
      };
}
