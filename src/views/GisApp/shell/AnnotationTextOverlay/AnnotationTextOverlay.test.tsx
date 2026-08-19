/**
 * In-place annotation text overlay: focus, select-all, Enter and blur commit.
 */
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { AnnotationTextOverlay } from "@/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay";
import {
    createFakeMap,
    emitTargetPointer,
    emitWindowPointer,
} from "@/views/GisApp/shell/MapToolCluster/createFakeMap";

function _makeTextFeature(
  text = "Enter your text here",
): Extract<AvaMapConfig.AnnotationFeature, { kind: "text" }> {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "text",
    geometry: { type: "Point", coordinates: [40, 80] },
    text,
    sizePx: 16,
    color: "#3b82f6",
  };
}

describe("AnnotationTextOverlay", () => {
  it("focuses and selects the placeholder on mount", () => {
    const fakeMap = createFakeMap();
    const feature = _makeTextFeature();
    render(
      <AnnotationTextOverlay
        map={fakeMap.map}
        feature={feature}
        onTextChange={vi.fn()}
        onCommit={vi.fn()}
      />,
    );

    const overlay = screen.getByTestId("annotation-text-overlay");
    expect(overlay).toHaveValue("Enter your text here");
    expect(overlay).toHaveFocus();
    expect((overlay as HTMLTextAreaElement).selectionStart).toBe(0);
    expect((overlay as HTMLTextAreaElement).selectionEnd).toBe(
      "Enter your text here".length,
    );
    expect(overlay.parentElement).toHaveStyle({ left: "40px", top: "80px" });
  });

  it("commits on Enter without Shift", () => {
    const fakeMap = createFakeMap();
    const onCommit = vi.fn();
    const onTextChange = vi.fn();
    render(
      <AnnotationTextOverlay
        map={fakeMap.map}
        feature={_makeTextFeature("Hello")}
        onTextChange={onTextChange}
        onCommit={onCommit}
      />,
    );

    const overlay = screen.getByTestId("annotation-text-overlay");
    fireEvent.change(overlay, { target: { value: "Hello world" } });
    fireEvent.keyDown(overlay, { key: "Enter" });
    expect(onTextChange).toHaveBeenCalledWith("Hello world");
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("commits on blur", () => {
    const fakeMap = createFakeMap();
    const onCommit = vi.fn();
    render(
      <AnnotationTextOverlay
        map={fakeMap.map}
        feature={_makeTextFeature("Hello")}
        onTextChange={vi.fn()}
        onCommit={onCommit}
      />,
    );

    fireEvent.blur(screen.getByTestId("annotation-text-overlay"));
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("does not commit on Shift+Enter", () => {
    const fakeMap = createFakeMap();
    const onCommit = vi.fn();
    render(
      <AnnotationTextOverlay
        map={fakeMap.map}
        feature={_makeTextFeature("Hello")}
        onTextChange={vi.fn()}
        onCommit={onCommit}
      />,
    );

    fireEvent.keyDown(screen.getByTestId("annotation-text-overlay"), {
      key: "Enter",
      shiftKey: true,
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("moves the annotation when the select frame is dragged", () => {
    const fakeMap = createFakeMap();
    const onMove = vi.fn();
    render(
      <AnnotationTextOverlay
        map={fakeMap.map}
        feature={_makeTextFeature("Hello")}
        mode="select"
        onMove={onMove}
        onResize={vi.fn()}
        onStartEdit={vi.fn()}
      />,
    );

    const frame = screen.getByTestId("annotation-text-selection");
    emitTargetPointer(frame, "pointerdown", 40, 80);
    emitWindowPointer("pointermove", 55, 95);
    emitWindowPointer("pointerup", 55, 95);
    expect(onMove).toHaveBeenCalledWith([55, 95]);
    expect(fakeMap.dragPan.disable).toHaveBeenCalled();
    expect(fakeMap.dragPan.enable).toHaveBeenCalled();
  });

  it("scales sizePx from the south-east handle within 8 to 96", () => {
    const fakeMap = createFakeMap();
    const onResize = vi.fn();
    render(
      <AnnotationTextOverlay
        map={fakeMap.map}
        feature={_makeTextFeature("Hello")}
        mode="select"
        onMove={vi.fn()}
        onResize={onResize}
        onStartEdit={vi.fn()}
      />,
    );

    const handle = screen.getByRole("slider", {
      name: "Resize annotation text",
    });
    emitTargetPointer(handle, "pointerdown", 40, 80);
    emitWindowPointer("pointermove", 40, 120);
    emitWindowPointer("pointerup", 40, 120);
    expect(onResize).toHaveBeenCalledWith(56);

    onResize.mockClear();
    emitTargetPointer(handle, "pointerdown", 40, 80);
    emitWindowPointer("pointermove", 40, -200);
    emitWindowPointer("pointerup", 40, -200);
    expect(onResize).toHaveBeenCalledWith(8);

    onResize.mockClear();
    emitTargetPointer(handle, "pointerdown", 40, 80);
    emitWindowPointer("pointermove", 40, 800);
    emitWindowPointer("pointerup", 40, 800);
    expect(onResize).toHaveBeenCalledWith(96);
  });

  it("starts editing on double-click in select mode", () => {
    const fakeMap = createFakeMap();
    const onStartEdit = vi.fn();
    render(
      <AnnotationTextOverlay
        map={fakeMap.map}
        feature={_makeTextFeature("Hello")}
        mode="select"
        onMove={vi.fn()}
        onResize={vi.fn()}
        onStartEdit={onStartEdit}
      />,
    );

    fireEvent.doubleClick(screen.getByTestId("annotation-text-selection"));
    expect(onStartEdit).toHaveBeenCalledOnce();
  });
});
