import type { ReactNode } from "react";

type Props = { id: string; accent: string };

/** A filter that strokes just outside the union's alpha in the accent. */
export function EdgeFilter({ id, accent }: Readonly<Props>): ReactNode {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feMorphology
        in="SourceAlpha"
        operator="dilate"
        radius={2}
        result="expanded"
      />
      <feComposite
        in="expanded"
        in2="SourceAlpha"
        operator="out"
        result="edge"
      />
      <feFlood floodColor={accent} />
      <feComposite in2="edge" operator="in" />
    </filter>
  );
}
