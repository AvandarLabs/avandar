import { createRoot } from "react-dom/client";
import { Review } from "./Review/Review";
import "../src/avandar/generated/product.css";

createRoot(document.getElementById("root")!).render(<Review />);
