import { useLingui } from "@lingui/react/macro";
import { useRef, useState } from "react";
import css from "@/views/GisApp/shell/MapTopBar/MapTitleInput/MapTitleInput.module.css";
import type { KeyboardEvent, ReactNode } from "react";

type Props = {
  name: string;
  onNameChange: (name: string) => void;
};

function _onTitleKeyDown(
  options: Readonly<{
    event: KeyboardEvent<HTMLInputElement>;
    cancel: () => void;
  }>,
): void {
  const { event, cancel } = options;
  if (event.key === "Enter") {
    event.currentTarget.blur();
  }
  if (event.key === "Escape") {
    cancel();
    event.currentTarget.blur();
  }
}

function MapTitleEditor({ name, onNameChange }: Props): ReactNode {
  const { t } = useLingui();
  const [draft, setDraft] = useState(name);
  const isCancellingRef = useRef(false);

  const commit = (): void => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      setDraft(name);
      return;
    }

    const trimmedName = draft.trim();
    if (trimmedName === "" || trimmedName === name) {
      setDraft(name);
      return;
    }

    onNameChange(trimmedName);
  };

  return (
    <input
      className={css.mapTitleInput}
      type="text"
      value={draft}
      aria-label={t`Map name`}
      onChange={(event) => {
        setDraft(event.currentTarget.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        _onTitleKeyDown({
          event,
          cancel: () => {
            isCancellingRef.current = true;
            setDraft(name);
          },
        });
      }}
    />
  );
}

/** Edits the map name locally and commits a nonblank draft on blur or Enter. */
export function MapTitleInput({ name, onNameChange }: Props): ReactNode {
  return <MapTitleEditor key={name} name={name} onNameChange={onNameChange} />;
}
