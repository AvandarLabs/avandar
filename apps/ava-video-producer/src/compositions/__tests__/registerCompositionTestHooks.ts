import { register } from "node:module";

/**
 * Remotion's frame hook needs a registered composition, and Node cannot load
 * CSS modules. Source outside `node_modules` gets a `remotion` whose frame
 * comes from a global the test sets, the macOS cursor (a product asset, not a
 * theme value) draws an empty `svg`, and CSS modules load as class names.
 */
const REMOTION_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export * from ${JSON.stringify(import.meta.resolve("remotion"))};
const FrameOffset = React.createContext(0);
export const useCurrentFrame = () =>
  globalThis.__testFrame - React.useContext(FrameOffset);
export const useVideoConfig = () =>
  ({ fps: 30, width: 1600, height: 1000, durationInFrames: 600, id: "test" });
export const Sequence = ({ from = 0, children }) => {
  const offset = React.useContext(FrameOffset);
  return globalThis.__testFrame - offset < from
    ? null
    : React.createElement(FrameOffset.Provider, { value: offset + from }, children);
};
export const Img = (props) => React.createElement("img", props);
export const OffthreadVideo = (props) =>
  React.createElement("video", { src: props.src, style: props.style });
`;
const CURSOR_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export const MacOSCursor = () => React.createElement("svg");
`;
const MOTION_BLUR_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export const CameraMotionBlur = (props) =>
  React.createElement(React.Fragment, null, props.children);
`;
const TEST_HOOKS = `
const REMOTION_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(REMOTION_STUB)}`,
)};
const CURSOR_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(CURSOR_STUB)}`,
)};
const MOTION_BLUR_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(MOTION_BLUR_STUB)}`,
)};
export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? "";
  if (specifier === "@remotion/mac-cursors") {
    return { url: CURSOR_STUB_URL, shortCircuit: true };
  }
  if (specifier === "@remotion/motion-blur") {
    return { url: MOTION_BLUR_STUB_URL, shortCircuit: true };
  }
  if (
    specifier === "remotion" &&
    parent.startsWith("file:") &&
    !parent.includes("/node_modules/")
  ) {
    return { url: REMOTION_STUB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) {
    return {
      format: "module",
      shortCircuit: true,
      source: "export default new Proxy({}, { get: (_, key) => String(key) });",
    };
  }
  return nextLoad(url, context);
}`;
/**
 * Registers the hooks. Import this module before any composition, then load
 * compositions with a dynamic `import()`, and set `globalThis.__testFrame`
 * before each render.
 */
register(`data:text/javascript,${encodeURIComponent(TEST_HOOKS)}`);
