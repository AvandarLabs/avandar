import type { ReactNode } from "react";

type Props = Readonly<{
  captions: boolean;
  onChange: (captions: boolean) => void;
}>;

/** The checkbox that shows or hides a film's captions. */
export function CaptionToggle({ captions, onChange }: Props): ReactNode {
  return (
    <label className="captionToggle">
      <input
        type="checkbox"
        checked={captions}
        onChange={(event) => {
          return onChange(event.target.checked);
        }}
      />
      Captions
    </label>
  );
}
