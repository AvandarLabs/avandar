import knex from "knex";

/**
 * A knex builder configured for SQLite-style identifier quoting; used to
 * assemble the SELECT/FROM/WHERE/... of a structured query as a SQL string.
 */
export const sqlBuilder = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});
