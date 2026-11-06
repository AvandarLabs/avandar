import { useLingui } from "@lingui/react/macro";
import { AtlasSelect } from "../../../gallery/AtlasSelect/AtlasSelect";
import css from "./CompositionControls.module.css";
import type { useCompositionAppearance } from "./useCompositionAppearance";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };

/** Independent roughness profiles with support for authored numeric levels. */
export function CompositionRoughnessControls({ appearance }: Props) {
  const { t } = useLingui();
  const choices = [
    { value: "0", label: t`Smooth` },
    { value: "0.5", label: t`Subtle` },
    { value: "1.5", label: t`Sketch` },
    { value: "3", label: t`Rough` },
  ];
  return (
    <div className={css.roughness}>
      {(["annotationRoughness", "boxRoughness"] as const).map((key) => {
        const value = String(appearance.draft[key]);
        return (
          <AtlasSelect
            key={key}
            value={value}
            label={
              key === "annotationRoughness"
                ? t`Annotation roughness`
                : t`Box roughness`
            }
            data={
              choices.some((choice) => choice.value === value)
                ? choices
                : [...choices, { value, label: value }]
            }
            onChange={(level) => appearance.update({ [key]: Number(level) })}
          />
        );
      })}
    </div>
  );
}
