import { createWebLogger } from "@logger";

export const Logger = createWebLogger({
  // do not show console.logs in production
  suppressConsoleLog: !import.meta.env.DEV,
});
