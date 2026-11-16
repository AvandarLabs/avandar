import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { requireLicense } from "../../requireLicense";
import { createAvandarTheme } from "./createAvandarTheme/createAvandarTheme";
import { readAvandarThemeSource } from "./readAvandarThemeSource";

requireLicense();
const output = fileURLToPath(
  new URL("../../../themes/avandar.theme.json", import.meta.url),
);
await fs.writeFile(
  output,
  `${JSON.stringify(createAvandarTheme(readAvandarThemeSource()), null, 2)}\n`,
);
console.log("Synced themes/avandar.theme.json from the Avandar theme.");
