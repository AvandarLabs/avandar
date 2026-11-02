/** The film displays reviewed SQL and computed fixture results; it never executes queries. */
export const sqlBuilder = new Proxy(
  () => {
    throw new Error("SQL execution is outside the film adapter");
  },
  {
    get() {
      throw new Error("SQL execution is outside the film adapter");
    },
  },
);
