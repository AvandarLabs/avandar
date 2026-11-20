/** @jsxRuntime automatic */
import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useCommittedRenderDelay } from "./useCommittedRenderDelay";

function FrameProbe(props: Parameters<typeof useCommittedRenderDelay>[0]) {
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
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    browser.window.close();
  }
});

test("StrictMode frame changes release prior barriers and unmount releases pending work", async () => {
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
  const scope = Object.assign(browser.window, {
    remotion_delayRenderHandles: [] as number[],
    remotion_delayRenderTimeouts: {},
  });
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
    await act(() => {
      return root.render(
        <StrictMode>
          <FrameProbe label="frame 1" prepare={prepare} />
        </StrictMode>,
      );
    });
    assert.equal(scope.remotion_delayRenderHandles.length, 1);
    await act(() => {
      return root.render(
        <StrictMode>
          <FrameProbe label="frame 2" prepare={prepare} />
        </StrictMode>,
      );
    });
    assert.equal(scope.remotion_delayRenderHandles.length, 1);
    assert.equal(numCleanups, 2);
    completed.at(-1)?.();
    assert.equal(scope.remotion_delayRenderHandles.length, 0);
    await act(() => {
      return root.render(
        <StrictMode>
          <FrameProbe label="frame 3" prepare={prepare} />
        </StrictMode>,
      );
    });
    assert.equal(scope.remotion_delayRenderHandles.length, 1);
  } finally {
    await act(() => {
      return root.unmount();
    });
    assert.equal(scope.remotion_delayRenderHandles.length, 0);
    for (const [key, descriptor] of [
      ["window", originalWindow],
      ["document", originalDocument],
      ["IS_REACT_ACT_ENVIRONMENT", originalActEnvironment],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    browser.window.close();
  }
});
