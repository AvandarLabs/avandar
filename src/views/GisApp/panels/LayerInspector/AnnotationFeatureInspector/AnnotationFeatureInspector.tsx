import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  ColorInput,
  NumberInput,
  Stack,
  TextInput,
} from "@mantine/core";
import { useEffect } from "react";
import { match } from "ts-pattern";
import css from "@/views/GisApp/panels/LayerInspector/AnnotationFeatureInspector/AnnotationFeatureInspector.module.css";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  feature: AvaMapConfig.AnnotationFeature;
  onFeatureChange: (feature: AvaMapConfig.AnnotationFeature) => void;
  onDelete: () => void;
};

function _isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function useAnnotationDeleteHotkey(onDelete: () => void): void {
  useEffect(
    function registerAnnotationDeleteHotkey() {
      const onKeyDown = (event: KeyboardEvent): void => {
        if (_isTypingTarget(event.target)) {
          return;
        }
        if (event.key !== "Delete" && event.key !== "Backspace") {
          return;
        }
        event.preventDefault();
        onDelete();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
      };
    },
    [onDelete],
  );
}

function _withColor(
  feature: AvaMapConfig.AnnotationFeature,
  color: string,
): AvaMapConfig.AnnotationFeature {
  if (feature.kind === "area") {
    return { ...feature, color, stroke: { ...feature.stroke, color } };
  }
  return { ...feature, color };
}

function _withStrokeWidth(
  feature: AvaMapConfig.AnnotationFeature,
  widthPx: number,
): AvaMapConfig.AnnotationFeature {
  return match(feature)
    .with({ kind: "text" }, (textFeature) => {
      return textFeature;
    })
    .with({ kind: "area" }, (areaFeature) => {
      return { ...areaFeature, stroke: { ...areaFeature.stroke, widthPx } };
    })
    .with({ kind: "arrow" }, { kind: "freehand" }, (lineFeature) => {
      return { ...lineFeature, strokeWidthPx: widthPx };
    })
    .exhaustive();
}

function AnnotationStrokeWidthField(options: {
  feature: Exclude<AvaMapConfig.AnnotationFeature, { kind: "text" }>;
  onFeatureChange: Props["onFeatureChange"];
  label: string;
}): ReactNode {
  const { feature, onFeatureChange, label } = options;
  const value =
    feature.kind === "area" ? feature.stroke.widthPx : feature.strokeWidthPx;
  return (
    <NumberInput
      label={label}
      min={0}
      max={12}
      step={0.5}
      suffix=" px"
      value={value}
      onChange={(nextValue) => {
        if (!isNumber(nextValue)) {
          return;
        }
        onFeatureChange(_withStrokeWidth(feature, nextValue));
      }}
    />
  );
}

function AnnotationAreaOpacityField(options: {
  feature: Extract<AvaMapConfig.AnnotationFeature, { kind: "area" }>;
  onFeatureChange: Props["onFeatureChange"];
  opacityLabel: string;
}): ReactNode {
  const { feature, onFeatureChange, opacityLabel } = options;
  return (
    <NumberInput
      label={opacityLabel}
      min={0}
      max={1}
      step={0.05}
      value={feature.opacity}
      onChange={(value) => {
        if (!isNumber(value)) {
          return;
        }
        onFeatureChange({ ...feature, opacity: value });
      }}
    />
  );
}

function AnnotationFeatureFields({
  feature,
  onFeatureChange,
}: Pick<Props, "feature" | "onFeatureChange">): ReactNode {
  const { t } = useLingui();
  return (
    <>
      {feature.kind === "text" ?
        <TextInput
          key={feature.id}
          label={t`Annotation text`}
          value={feature.text}
          autoFocus={feature.text === ""}
          onChange={(event) => {
            onFeatureChange({ ...feature, text: event.currentTarget.value });
          }}
        />
      : null}
      <ColorInput
        label={t`Color`}
        format="hex"
        value={feature.color}
        onChange={(color) => {
          onFeatureChange(_withColor(feature, color));
        }}
      />
      {feature.kind === "area" ?
        <AnnotationAreaOpacityField
          feature={feature}
          onFeatureChange={onFeatureChange}
          opacityLabel={t`Opacity`}
        />
      : null}
      {feature.kind === "text" ? null : (
        <AnnotationStrokeWidthField
          feature={feature}
          onFeatureChange={onFeatureChange}
          label={t`Outline width`}
        />
      )}
    </>
  );
}

/** Compact editor for one selected annotation feature. */
export function AnnotationFeatureInspector({
  feature,
  onFeatureChange,
  onDelete,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  useAnnotationDeleteHotkey(onDelete);
  return (
    <Stack className={css.annotationFeatureInspector} gap="sm">
      <AnnotationFeatureFields
        feature={feature}
        onFeatureChange={onFeatureChange}
      />
      <Button color="red" variant="light" onClick={onDelete}>
        {t`Delete annotation`}
      </Button>
    </Stack>
  );
}
