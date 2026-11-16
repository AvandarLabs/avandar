import css from "./OptionRow.module.css";

type Props = Readonly<{ label: string; chip: string | undefined }>;

/** One picker option: a colour chip when it has one, then its label. */
export function OptionRow({ label, chip }: Props) {
  return (
    <span className={css.optionRow}>
      {chip ? (
        <span
          className={css.optionRowChip}
          style={{ background: chip }}
          aria-hidden="true"
          data-inherit-dim
        />
      ) : null}
      <span>{label}</span>
    </span>
  );
}
