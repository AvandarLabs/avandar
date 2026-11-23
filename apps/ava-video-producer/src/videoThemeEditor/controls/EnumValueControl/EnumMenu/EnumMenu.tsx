import { makeMap } from "@avandar/utils";
import { AtlasSelect } from "../../../../gallery/AtlasSelect/AtlasSelect";
import css from "./EnumMenu.module.css";
import type { OptionCopy } from "../../../tokenCopy/EditorCopy";
import type { ReactNode } from "react";

type EnumOption = OptionCopy & Readonly<{ option: string }>;

type Props = Readonly<{
  label: string;
  value: string | undefined;
  options: readonly EnumOption[];
  hasIssue: boolean;
  onChange: (option: string) => void;
}>;

/** An enum menu whose options show their explanations under their names. */
export function EnumMenu({
  label,
  value,
  options,
  hasIssue,
  onChange,
}: Props): ReactNode {
  const descriptions = makeMap(options, {
    key: "option",
    valueKey: "description",
  });
  return (
    <AtlasSelect
      aria-label={label}
      error={hasIssue}
      value={value ?? null}
      placeholder="Not set"
      data={options.map((entry) => {
        return {
          value: entry.option,
          label: entry.label,
        };
      })}
      onChange={(selectedOption) => {
        return selectedOption && onChange(selectedOption);
      }}
      renderOption={({ option }) => {
        const description = descriptions.get(option.value);
        return (
          <span className={css.enumMenuOption}>
            <span>{option.label}</span>
            {description ? (
              <span className={css.enumMenuOptionDescription}>
                {description}
              </span>
            ) : null}
          </span>
        );
      }}
    />
  );
}
