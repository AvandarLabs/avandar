import { GoogleTokenGetCLI } from "@ava-cli/SupabaseCLI/GoogleTokenCLI/GoogleTokenGetCLI/GoogleTokenGetCLI";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for inspecting the Google OAuth tokens stored in `tokens__google`. */
export const GoogleTokenCLI = Acclimate.createCLI("google-token")
  .description(
    "Inspect stored Google OAuth tokens. All commands default to the local " +
      "database.",
  )
  .addCommand("get", GoogleTokenGetCLI);
