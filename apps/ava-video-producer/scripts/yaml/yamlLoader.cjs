const { compileYaml } = require("./compileYaml.cjs");

/** Compile YAML for Remotion's webpack browser bundles. */
module.exports = function yamlLoader(source) {
  return compileYaml(source);
};
