import { ReunionInvitation } from "./ReunionInvitation/ReunionInvitation";
import { ReunionMember } from "./ReunionMember/ReunionMember";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & { input: Input };

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  group: Readonly<ParentProps>["input"]["groups"][number];
  groupIndex: number;
};

/** Renders the invitation and group members in authored paint order. */
export function InvitationAndGroupMembers(options: Readonly<Props>): ReactNode {
  return (
    <>
      <ReunionInvitation
        input={options.input}
        groupIndex={options.groupIndex}
        frame={options.frame}
        accent={
          options.groupIndex === 0
            ? options.accent
            : options.tokens.color.highlight
        }
      />
      {options.group.members.map((member, index) => {
        return (
          <ReunionMember
            key={member.id}
            member={member}
            index={index}
            groupIndex={options.groupIndex}
            input={options.input}
            frame={options.frame}
            accent={
              options.groupIndex === 0
                ? options.accent
                : options.tokens.color.highlight
            }
          />
        );
      })}
    </>
  );
}
