export default {
  extends: ["stylelint-config-standard", "stylelint-config-css-modules"],
  plugins: ["stylelint-order"],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "config",
          "screen",
          "value",
        ],
      },
    ],

    // Allow Mantine CSS custom properties like
    // var(--mantine-color-neutral-7)
    "custom-property-pattern": null,

    // CSS modules use camelCase class selectors by convention.
    // Allowed patterns:
    //   - camelCase (optionally with BEM __element / --modifier suffixes)
    //   - mantine-* (Mantine internals)
    //   - ag-*     (ag-grid third-party classes)
    //   - cm-*     (CodeMirror third-party classes)
    //   - ava-*    (app-wide kebab-case utility / preset classes)
    //   - class-name, builtin (PrismJS token names)
    "selector-class-pattern": [
      "^([a-z][a-zA-Z0-9]*(__[a-zA-Z0-9]+)?(--[a-zA-Z0-9]+)?|(mantine|ag|cm|ava)-.+|class-name|builtin)$",
      {
        message:
          "Expected class selector to be camelCase (optionally with BEM " +
          "__element / --modifier), or start with mantine-/ag-/cm-/ava-, " +
          "or be a PrismJS token name (class-name, builtin)",
      },
    ],

    // Allow empty source files (some modules may start
    // empty)
    "no-empty-source": null,

    // Enforce alphabetical CSS property order
    "order/properties-alphabetical-order": true,
  },
};
