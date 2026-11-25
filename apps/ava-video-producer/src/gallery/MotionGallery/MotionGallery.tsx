import { createRoot } from "react-dom/client";
import { AtlasSectionRoot } from "./AtlasSectionRoot/AtlasSectionRoot";

const root: HTMLElement | null = document.getElementById("motion-root");
if (root) {
  createRoot(root).render(<AtlasSectionRoot />);
}
