// Ambient stubs for transitive Electrobun deps that don't ship their own types.
// We don't use these libraries directly; Electrobun's index.ts re-exports them
// as `three` and `babylon`. Without these declarations TS errors with TS7016
// because Electrobun ships .ts source (no .d.ts) so its imports are checked.
declare module "three";
declare module "@babylonjs/core";
