type Props = Readonly<{
  captions: boolean;
  onChange: (captions: boolean) => void;
}>;

/** The checkbox that shows or hides a film's captions. */
export function CaptionToggle({ captions, onChange }: Props) {
  return (
    <label className="captionToggle">
      <input
        type="checkbox"
        checked={captions}
        onChange={(event) => onChange(event.target.checked)}
      />
      Captions
    </label>
  );
}
