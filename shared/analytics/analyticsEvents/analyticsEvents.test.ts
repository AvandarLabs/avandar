import { readFileSync } from "node:fs";
import path from "node:path";
import { ANALYTICS_EVENT_NAMES } from "$/analytics/analyticsEvents/analyticsEvents.ts";
import { describe, expect, it } from "vitest";

/**
 * The database owns the name-to-category mapping because Postgres triggers
 * emit many of these events and cannot read this registry. That split means
 * the two can drift, so this reads the schema file as text and proves every
 * registered name is mapped. A text check keeps the test in the normal
 * frontend suite instead of requiring a running database.
 */
describe("analytics event categories", () => {
  const schemaSql = readFileSync(
    path.resolve(
      process.cwd(),
      "supabase/schemas/30.usage_analytics_events.sql",
    ),
    "utf-8",
  );

  it.each(ANALYTICS_EVENT_NAMES)(
    "%s is categorised in util__analytics_event_category",
    (eventName) => {
      expect(schemaSql).toContain(`when '${eventName}' then`);
    },
  );

  it("maps no registered name to the other fallback", () => {
    const mappedToOther = ANALYTICS_EVENT_NAMES.filter((eventName) => {
      return schemaSql.includes(`when '${eventName}' then 'other'`);
    });

    expect(mappedToOther).toEqual([]);
  });
});
