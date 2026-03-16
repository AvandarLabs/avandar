// global.d.ts (or types/css-modules.d.ts)
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
