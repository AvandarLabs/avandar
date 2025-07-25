import { GoogleAuthClient } from "../_shared/getGoogleAuthClient.ts";

export function getAuthURL(authState: {
  redirectURL: string;
  userId: string;
}): { authorizeURL: string } {
  // Generate the url that will be used for the Google consent dialog.
  const authorizeURL = GoogleAuthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
    state: JSON.stringify(authState),
  });

  return { authorizeURL };
}
