import { register } from "node:module";

/**
 * Remotion's frame hook needs a registered composition, and Node cannot load
 * CSS modules. Source outside `node_modules` gets a `remotion` whose frame
 * comes from a global the test sets, the macOS cursor (a product asset, not a
 * theme value) draws an empty `svg`, media elements draw plain `img` and
 * `video`, and CSS modules load as class names. `TransitionSeries` mounts
 * every sequence whose window holds the frame, overlapping ones during a
 * transition, without drawing the transition's presentation. Rough
 * notation marks draw their children inside an `svg` that carries the mark's
 * colour and stroke width, so a sentinel test still sees them.
 */
const REMOTION_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export * from ${JSON.stringify(import.meta.resolve("remotion"))};
const FrameOffset = (globalThis.__testFrameOffset ??= React.createContext(0));
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
export const Freeze = (props) =>
  React.createElement(React.Fragment, null, props.children);
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
const TRANSITIONS_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export * from ${JSON.stringify(import.meta.resolve("@remotion/transitions"))};
const FrameOffset = (globalThis.__testFrameOffset ??= React.createContext(0));
const Sequence = () => null;
const Transition = () => null;
const flatten = (children) =>
  React.Children.toArray(children).flatMap((child) =>
    child.type === React.Fragment ? flatten(child.props.children) : [child],
  );
const Series = ({ children }) => {
  const offset = React.useContext(FrameOffset);
  const frame = globalThis.__testFrame - offset;
  let cursor = 0;
  const mounted = [];
  flatten(children).forEach((child) => {
    if (child.type === Transition) {
      cursor -= child.props.timing.getDurationInFrames({ fps: 30 });
      return;
    }
    const start = cursor;
    cursor += child.props.durationInFrames;
    if (frame >= start && frame < cursor) {
      mounted.push(
        React.createElement(
          FrameOffset.Provider,
          { key: child.key ?? start, value: offset + start },
          child.props.children,
        ),
      );
    }
  });
  return React.createElement(React.Fragment, null, mounted);
};
export const TransitionSeries = Object.assign(Series, { Sequence, Transition });
`;
const ROUGH_NOTATION_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
const Mark = ({ color, strokeWidth, children }) =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement("svg", { stroke: color, strokeWidth }),
    children,
  );
export const Box = Mark;
export const Bracket = Mark;
export const Circle = Mark;
export const Highlight = Mark;
export const StrikeThrough = Mark;
export const CrossedOff = Mark;
export const Underline = Mark;
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
const ROUGH_NOTATION_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(ROUGH_NOTATION_STUB)}`,
)};
const TRANSITIONS_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(TRANSITIONS_STUB)}`,
)};
export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? "";
  if (specifier === "@remotion/mac-cursors") {
    return { url: CURSOR_STUB_URL, shortCircuit: true };
  }
  if (specifier === "@remotion/rough-notation") {
    return { url: ROUGH_NOTATION_STUB_URL, shortCircuit: true };
  }
  if (specifier === "@remotion/motion-blur") {
    return { url: MOTION_BLUR_STUB_URL, shortCircuit: true };
  }
  const isAppSource =
    parent.startsWith("file:") && !parent.includes("/node_modules/");
  if (specifier === "remotion" && isAppSource) {
    return { url: REMOTION_STUB_URL, shortCircuit: true };
  }
  if (specifier === "@remotion/transitions" && isAppSource) {
    return { url: TRANSITIONS_STUB_URL, shortCircuit: true };
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
