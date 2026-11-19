import { registerRoot } from "remotion";
import "./theme.css";
// Evaluated before the root's storyboard modules so the product stylesheet
// keeps its place in the cascade, directly after the theme.
import "./avandar/AvandarScene";
import { Root } from "./avandar/Root";

registerRoot(Root);
