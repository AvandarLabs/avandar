export function getPolarServerType(): "sandbox" | "production" {
  const server = Deno.env.get("POLAR_SERVER_TYPE");
  if (server === "sandbox" || server === "production") {
    return server;
  } else if (!server) {
    throw new Error("POLAR_SERVER_TYPE is not set");
  } else {
    throw new Error(
      `Invalid POLAR_SERVER_TYPE: '${server}'. Only 'sandbox' and 'production' are supported.`,
    );
  }
}
