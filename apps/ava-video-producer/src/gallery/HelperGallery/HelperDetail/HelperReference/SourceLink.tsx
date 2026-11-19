import type { ReactNode } from "react";

/** Where app-relative source paths are browsable. */
const SOURCE_BASE_URL =
  "https://github.com/AvandarLabs/avandar/blob/develop/apps/ava-video-producer/";

type Props = {
  /** App-relative source path, for example `src/motion.ts`. */
  path: string;
};

/** A link to one app-relative source file. */
export function SourceLink({ path }: Props): ReactNode {
  return (
    <a href={`${SOURCE_BASE_URL}${path}`} target="_blank" rel="noreferrer">
      <code>{path}</code>
    </a>
  );
}
