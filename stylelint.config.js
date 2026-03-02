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

    // CSS modules use camelCase class selectors by convention
    "selector-class-pattern": [
      "^([a-z][a-zA-Z0-9]*|mantine-.+)$",
      {
        message:
          "Expected class selector to be camelCase " +
          "or start with 'mantine-'",
      },
    ],

    // Allow empty source files (some modules may start
    // empty)
    "no-empty-source": null,

    // Enforce alphabetical CSS property order
    "order/properties-alphabetical-order": true,
  },
};
