import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { requireLicense } from "../../requireLicense";
import { CliOutput } from "../../runProducerCommand/CliOutput/CliOutput.mjs";
import { ProducerCli } from "../../runProducerCommand/ProducerCli/ProducerCli.mjs";
import { AvandarThemeConversion } from "./AvandarThemeConversion/AvandarThemeConversion";
import { readAvandarThemeSource } from "./readAvandarThemeSource";

requireLicense();
const output = fileURLToPath(
  new URL("../../../themes/avandar.theme.json", import.meta.url),
);
await fs.writeFile(
  output,
  `${JSON.stringify(AvandarThemeConversion.makeThemeFromProduct(readAvandarThemeSource()), null, 2)}\n`,
);
CliOutput.success("Synced themes/avandar.theme.json from the Avandar theme.");
