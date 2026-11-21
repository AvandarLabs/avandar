/** @jsxRuntime automatic */
import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useCommittedRenderDelay } from "./useCommittedRenderDelay";

type Props = Parameters<typeof useCommittedRenderDelay>[0];

function FrameProbe(props: Readonly<Props>) {
  useCommittedRenderDelay(props);
  return <span>{props.label}</span>;
}

test("uncommitted render work does not leave a Remotion render handle", () => {
  const browser = new JSDOM("<div></div>");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const handles: number[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser.window,
  });
  Object.assign(browser.window, {
    remotion_delayRenderHandles: handles,
    remotion_delayRenderTimeouts: {},
  });
  try {
    renderToString(
      <FrameProbe
        label="abandoned frame"
        prepare={() => {
          return undefined;
        }}
      />,
    );
    assert.equal(handles.length, 0);
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    browser.window.close();
  }
});

test("StrictMode frame changes release prior barriers and unmount releases pending work", async () => {
  const { browser, originalWindow, originalDocument, scope } =
    _createCommittedFrameEnvironment();
  const completed: Array<() => void> = [];
  let numCleanups = 0;
  const prepare = (complete: () => void) => {
    completed.push(complete);
    return () => {
      numCleanups += 1;
    };
  };
  const originalActEnvironment = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT",
  );
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  const container = browser.window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  try {
    await _renderFrameProbe({ root, prepare, label: "frame 1" });
    assert.equal(scope.remotion_delayRenderHandles.length, 1);
    await _renderFrameProbe({ root, prepare, label: "frame 2" });
    assert.equal(scope.remotion_delayRenderHandles.length, 1);
    assert.equal(numCleanups, 2);
    completed.at(-1)?.();
    assert.equal(scope.remotion_delayRenderHandles.length, 0);
    await _renderFrameProbe({ root, prepare, label: "frame 3" });
    assert.equal(scope.remotion_delayRenderHandles.length, 1);
  } finally {
    await act(() => {
      return root.unmount();
    });
    assert.equal(scope.remotion_delayRenderHandles.length, 0);
    _restoreCommittedFrameEnvironment({
      browser,
      originalWindow,
      originalDocument,
      originalActEnvironment,
    });
  }
});

function _createCommittedFrameEnvironment(): Readonly<{
  browser: JSDOM;
  originalWindow: PropertyDescriptor | undefined;
  originalDocument: PropertyDescriptor | undefined;
  scope: Readonly<{ remotion_delayRenderHandles: number[] }>;
}> {
  const browser = new JSDOM("<div id='root'></div>");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser.window,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: browser.window.document,
  });
  const delayRenderHandles: number[] = [];
  const scope = Object.assign(browser.window, {
    remotion_delayRenderHandles: delayRenderHandles,
    remotion_delayRenderTimeouts: {},
  });
  return { browser, originalWindow, originalDocument, scope };
}

async function _renderFrameProbe({
  root,
  prepare,
  label,
}: Readonly<{
  root: ReturnType<typeof createRoot>;
  prepare: Props["prepare"];
  label: string;
}>): Promise<void> {
  await act(() => {
    return root.render(
      <StrictMode>
        <FrameProbe label={label} prepare={prepare} />
      </StrictMode>,
    );
  });
}

function _restoreCommittedFrameEnvironment({
  browser,
  originalWindow,
  originalDocument,
  originalActEnvironment,
}: Readonly<{
  browser: JSDOM;
  originalWindow: PropertyDescriptor | undefined;
  originalDocument: PropertyDescriptor | undefined;
  originalActEnvironment: PropertyDescriptor | undefined;
}>): void {
  Array.from([
    ["window", originalWindow],
    ["document", originalDocument],
    ["IS_REACT_ACT_ENVIRONMENT", originalActEnvironment],
  ] as const).forEach(([key, descriptor]) => {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  });
  browser.window.close();
}
