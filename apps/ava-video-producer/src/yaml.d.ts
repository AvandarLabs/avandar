/** Authored YAML is validated by its consumer before use. */
declare module "*.yaml" {
  const value: unknown;
  export default value;
}

/** Authored YAML is validated by its consumer before use. */
declare module "*.yml" {
  const value: unknown;
  export default value;
}
