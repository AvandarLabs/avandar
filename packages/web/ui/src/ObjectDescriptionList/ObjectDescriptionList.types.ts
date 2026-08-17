//! The public type surface of `ObjectDescriptionList`.
//!
//! The types themselves live in `renderOptionTypes/`, grouped by what they
//! describe: the value shapes, then the render options for a primitive, an
//! object, and an array, then the child-object helper the submit callback
//! uses. This file is the entry point every consumer imports, so the grouping
//! stays an internal detail.

export * from "./renderOptionTypes/arrayRenderOptions";
export * from "./renderOptionTypes/childObjects";
export * from "./renderOptionTypes/describableValues";
export * from "./renderOptionTypes/objectRenderOptions";
export * from "./renderOptionTypes/primitiveValueRenderOptions";
