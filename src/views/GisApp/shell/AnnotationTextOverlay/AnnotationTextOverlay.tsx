import type { TextFeature } from "@/views/GisApp/shell/AnnotationTextOverlay/useProjectedOverlayPoint";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { KeyboardEvent, ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { useLayoutEffect, useRef } from "react";

import css from "@/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay.module.css";
import { AnnotationTextSelectFrame } from "@/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextSelectFrame";
import { useProjectedOverlayPoint } from "@/views/GisApp/shell/AnnotationTextOverlay/useProjectedOverlayPoint";

type EditProps = {
  map: MapLibreMap;
  feature: TextFeature;
  mode?: "edit";
  onTextChange: (text: string) => void;
  onCommit: () => void;
};

type SelectProps = {
  map: MapLibreMap;
  feature: TextFeature;
  mode: "select";
  onMove: (coordinates: [number, number]) => void;
  onResize: (sizePx: number) => void;
  onStartEdit: () => void;
};

type Props = EditProps | SelectProps;

function _commitOnce(
  didCommit: { current: boolean },
  onCommit: () => void,
): void {
  if (didCommit.current) {
    return;
  }
  didCommit.current = true;
  onCommit();
}

function AnnotationTextEditor({
  map,
  feature,
  onTextChange,
  onCommit,
}: Readonly<EditProps>): ReactNode {
  const { t } = useLingui();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const didCommit = useRef(false);
  const point = useProjectedOverlayPoint(map, feature);
  useLayoutEffect(
    function focusAndSelectOverlayText() {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      editor.focus();
      editor.select();
    },
    [feature.id],
  );
  const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    _commitOnce(didCommit, onCommit);
  };
  return (
    <div
      className={css.annotationTextOverlay}
      style={{
        left: point.x,
        top: point.y,
        color: feature.color,
        fontSize: feature.sizePx,
      }}
    >
      <textarea
        ref={editorRef}
        data-testid="annotation-text-overlay"
        className={css.annotationTextOverlayEditor}
        aria-label={t`Annotation text`}
        value={feature.text}
        rows={1}
        onChange={(event) => {
          onTextChange(event.currentTarget.value);
        }}
        onKeyDown={onEditorKeyDown}
        onBlur={() => {
          _commitOnce(didCommit, onCommit);
        }}
      />
    </div>
  );
}

/**
 * In-place editor or select-mode move/resize chrome for one text annotation.
 */
export function AnnotationTextOverlay(props: Readonly<Props>): ReactNode {
  const point = useProjectedOverlayPoint(props.map, props.feature);
  if (props.mode === "select") {
    return (
      <div
        className={css.annotationTextOverlay}
        style={{
          left: point.x,
          top: point.y,
          color: props.feature.color,
          fontSize: props.feature.sizePx,
        }}
      >
        <AnnotationTextSelectFrame
          map={props.map}
          feature={props.feature}
          onMove={props.onMove}
          onResize={props.onResize}
          onStartEdit={props.onStartEdit}
        />
      </div>
    );
  }
  return (
    <AnnotationTextEditor
      map={props.map}
      feature={props.feature}
      onTextChange={props.onTextChange}
      onCommit={props.onCommit}
    />
  );
}
