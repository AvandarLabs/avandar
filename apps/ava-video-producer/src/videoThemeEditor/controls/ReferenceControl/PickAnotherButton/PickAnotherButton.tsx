import { Button } from "@mantine/core";
import css from "./PickAnotherButton.module.css";
import type { RefObject } from "react";

type Props = Readonly<{
  name: string;
  isColor: boolean;
  /** The control's root, whose picker field takes focus. */
  containerRef: RefObject<HTMLDivElement | null>;
}>;

/** Offered for a missing reference: moves focus into the picker to choose another. */
export function PickAnotherButton({ name, isColor, containerRef }: Props) {
  return (
    <Button
      className={css.pickAnotherButton}
      size="compact-xs"
      variant="light"
      aria-label={`Pick another for ${name}`}
      onClick={() => containerRef.current?.querySelector("input")?.focus()}
    >
      {isColor ? "Pick a colour" : "Pick a value"}
    </Button>
  );
}
