import { useGraphicTokens } from "../theme/useGraphicTheme/useGraphicTheme";

type Props = { id: string };

/** The stage ground: a solid or gradient fill the size of the viewBox. */
export function GroundFill({ id }: Props) {
  const { color } = useGraphicTokens();
  const fill = color.groundFill;
  if (fill.type === "solid") {
    return <rect width={960} height={600} fill={fill.color} />;
  }
  return (
    <>
      <defs>
        <linearGradient
          id={`${id}-ground`}
          gradientTransform={`rotate(${fill.deg - 90} 0.5 0.5)`}
        >
          <stop offset="0" stopColor={fill.from} />
          <stop offset="1" stopColor={fill.to} />
        </linearGradient>
      </defs>
      <rect width={960} height={600} fill={`url(#${id}-ground)`} />
    </>
  );
}
