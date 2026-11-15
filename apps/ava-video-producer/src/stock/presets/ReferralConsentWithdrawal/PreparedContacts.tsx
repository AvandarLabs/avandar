import { propEq } from "@avandar/utils";
import { getConsentTurnFromPermissionsAndFrame } from "./getConsentTurnFromPermissionsAndFrame";
import { PreparedContact } from "./PreparedContact";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Each affected contact has its own held slot and handling interval. */
export function PreparedContacts({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const held = input.plannedContacts.filter(
    (contact) =>
      input.permissions.find(propEq("id", contact.permissionId))?.withdrawn,
  );
  return (
    <g>
      {input.plannedContacts.map((contact, index) => (
        <PreparedContact
          key={contact.id}
          contact={contact}
          index={index}
          order={held.indexOf(contact)}
          permissionTurn={getConsentTurnFromPermissionsAndFrame({
            frame,
            permissions: input.permissions,
            permissionId: contact.permissionId,
          })}
          frame={frame}
          labels={input.labels}
          accent={accent}
        />
      ))}
    </g>
  );
}
