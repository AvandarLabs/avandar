import { Acclimate } from "@avandar/acclimate";

/** Print a cyan info message. */
export function printInfo(message: string): void {
  Acclimate.log(`|cyan|${message}`);
}

/** Print a green success message. */
export function printSuccess(message: string): void {
  Acclimate.log(`|green|${message}`);
}

/** Print a yellow warning message. */
export function printWarn(message: string): void {
  Acclimate.log(`|yellow|${message}`);
}

/** Print a red error message. */
export function printError(message: string): void {
  Acclimate.log(`|red|${message}`);
}

