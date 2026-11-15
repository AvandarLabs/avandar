const { parse } = require("yaml");

/** Compile YAML into a default export shared by Node and browser bundlers. */
function compileYaml(source) {
  return `export default JSON.parse(${JSON.stringify(JSON.stringify(parse(source)))});\n`;
}

module.exports = { compileYaml };
