import type { ReactNode } from "react";

type Props = {
  identity: string;
  first: string;
  second: string;
  accent: string;
};
/** Layer Definitions for the authored scene. */
export function LayerDefinitions({
  identity,
  first,
  second,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <defs>
      <clipPath id={`${identity}-a`}>
        <path d={first} />
      </clipPath>
      <clipPath id={`${identity}-b`}>
        <path d={second} />
      </clipPath>
      <mask
        id={`${identity}-outside`}
        maskUnits="userSpaceOnUse"
        x={30}
        y={140}
        width={520}
        height={350}
      >
        <rect x={30} y={140} width={520} height={350} fill="white" />
        <path d={second} fill="black" />
      </mask>
      <pattern
        id={`${identity}-hatch`}
        width={8}
        height={8}
        patternUnits="userSpaceOnUse"
      >
        <path d="M0 8 L8 0" stroke={accent} strokeWidth={1.5} />
      </pattern>
    </defs>
  );
}
