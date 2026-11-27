import { eslintCompatPlugin } from "@oxlint/plugins";
import componentPropsName from "./rules/component-props-name.js";
import errorClassSuffix from "./rules/error-class-suffix.js";
import exportKeyJsdoc from "./rules/export-key-jsdoc.js";
import functionBodyLineComments from "./rules/function-body-line-comments.js";
import jsxConditionalTernary from "./rules/jsx-conditional-ternary.js";
import moduleContextWitness from "./rules/module-context-witness.js";
import nestedArrowFunctions from "./rules/nested-arrow-functions.js";
import optionalArrayCandidates from "./rules/optional-array-candidates.js";
import privateHelperPrefix from "./rules/private-helper-prefix.js";
import propertyHelperCallbacks from "./rules/property-helper-callbacks.js";
import singleLineShortJsdoc from "./rules/single-line-short-jsdoc.js";
import straightLineObjectConstruction from "./rules/straight-line-object-construction.js";
import topLevelFunctionDeclarations from "./rules/top-level-function-declarations.js";

/**
 * Supplies Avandar rules as an Oxlint JavaScript plugin.
 * Use it, for example, in an Oxlint configuration's jsPlugins list.
 */
const plugin = eslintCompatPlugin({
  meta: { name: "@avandar/lint-typescript" },
  rules: {
    "function-body-line-comments": functionBodyLineComments,
    "single-line-short-jsdoc": singleLineShortJsdoc,
    "export-key-jsdoc": exportKeyJsdoc,
    "top-level-function-declarations": topLevelFunctionDeclarations,
    "nested-arrow-functions": nestedArrowFunctions,
    "private-helper-prefix": privateHelperPrefix,
    "component-props-name": componentPropsName,
    "module-context-witness": moduleContextWitness,
    "jsx-conditional-ternary": jsxConditionalTernary,
    "property-helper-callbacks": propertyHelperCallbacks,
    "straight-line-object-construction": straightLineObjectConstruction,
    "optional-array-candidates": optionalArrayCandidates,
    "error-class-suffix": errorClassSuffix,
  },
});
export default plugin;
