/** Stand-in for a product mark. Replace with your own. */
export function Orb({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background:
          "radial-gradient(circle at 30% 30%, var(--brand-strong), var(--brand))",
        boxShadow: "0 0 0 3px var(--brand-soft)",
        flexShrink: 0,
      }}
    />
  );
}
