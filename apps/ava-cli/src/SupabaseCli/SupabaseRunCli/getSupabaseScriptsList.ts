import * as fs from "node:fs/promises";
import * as path from "node:path";

const PROJECT_ROOT = path.join(process.cwd());

/**
 * Returns a string of the available scripts in the .ava/scripts directory
 */
export async function getSupabaseScriptsList(): Promise<string[]> {
  const scriptsDirectory = path.join(PROJECT_ROOT, ".ava", "scripts");
  const scripts = (await fs.readdir(scriptsDirectory)).map((script: string) => {
    return script.replace(".ts", "");
  });
  return scripts;
}
