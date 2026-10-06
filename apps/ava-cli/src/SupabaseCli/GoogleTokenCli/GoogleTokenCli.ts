import { GoogleTokenGetCli } from "@ava-cli/SupabaseCli/GoogleTokenCli/GoogleTokenGetCli/GoogleTokenGetCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for inspecting the Google OAuth tokens stored in `tokens__google`. */
export const GoogleTokenCli = Acclimate.createCLI("google-token")
  .description(
    "Inspect stored Google OAuth tokens. All commands default to the local " +
      "database.",
  )
  .addCommand("get", GoogleTokenGetCli);
