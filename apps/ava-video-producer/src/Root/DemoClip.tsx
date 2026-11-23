import "../theme.css";
import { Demo } from "../compositions/Demo/Demo";
import { StarterVideoTheme } from "../compositions/StarterVideoTheme/StarterVideoTheme";
import { Clip } from "./Clip";
import type { ReactNode } from "react";

/** Renders the demo clip. */
export function DemoClip(): ReactNode {
  return (
    <StarterVideoTheme itemId="demo">
      <Clip
        body={<Demo />}
        name="Acme Studio"
        kicker="Ask a question, publish the answer"
      />
    </StarterVideoTheme>
  );
}
