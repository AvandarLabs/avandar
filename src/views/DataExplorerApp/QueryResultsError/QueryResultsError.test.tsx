import { describe, expect, it } from "vitest";

import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen } from "@/test-utils";
import { QueryResultsError } from "@/views/DataExplorerApp/QueryResultsError/QueryResultsError";

describe("QueryResultsError", () => {
  it("renders nothing when there is no error", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError message={undefined} sql="select 1" />
      </AvandarAppProvider>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the message so an error is not mistaken for zero rows", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError
          message={`Conversion Error: Could not convert string 'abc' to INT64`}
          sql={`select * from t where "cases" = 'abc'`}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not convert/);
  });

  it("hides the SQL behind a disclosure", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError message="Binder Error" sql="select 1" />
      </AvandarAppProvider>,
    );
    expect(screen.queryByText("select 1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show sql/i }));
    expect(screen.getByText("select 1")).toBeInTheDocument();
  });
});
