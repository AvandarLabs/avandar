export function getPolarAccessToken(): string {
  const token = Deno.env.get("POLAR_ACCESS_TOKEN");
  if (!token) {
    throw new Error("POLAR_ACCESS_TOKEN is not set");
  }
  return token;
}
