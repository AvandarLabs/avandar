import { registerHooks } from "node:module";

/** Keep non-visual SSR assertions independent of the browser CSS bundler. */
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".module.css")) {
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export default new Proxy({}, {get: (_, name) => String(name)});",
      };
    }
    return nextLoad(url, context);
  },
});
