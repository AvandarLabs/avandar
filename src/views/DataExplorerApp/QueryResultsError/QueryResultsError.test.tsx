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

  it("explains the error in plain language so it is not mistaken for zero rows", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError
          message={`Conversion Error: Could not convert string 'abc' to INT64`}
          sql={`select * from t where "cases" = 'abc'`}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /treats one kind of value as another/,
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      /Could not convert/,
    );
  });

  it("names a missing column without showing the raw binder error", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError
          message={`Binder Error: Referenced column "deaths" not found in FROM clause!`}
          sql="select deaths from t"
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /uses a column named "deaths" that isn't in the data/,
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(/Binder Error/);
  });

  it("shows the technical message behind a disclosure, without dataset ids", () => {
    render(
      <AvandarAppProvider>
        <QueryResultsError
          message="Catalog Error: Table with name 86440223-249d-4b3d-9be4-159a4e615e0a does not exist!"
          sql="select 1"
        />
      </AvandarAppProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /show details/i }));
    expect(
      screen.getByText(
        "Catalog Error: Table with name <dataset> does not exist!",
      ),
    ).toBeInTheDocument();
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
