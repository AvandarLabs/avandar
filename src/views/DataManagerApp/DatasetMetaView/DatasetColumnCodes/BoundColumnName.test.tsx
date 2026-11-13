import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { BoundColumnName } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/BoundColumnName";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

const CODES = {
  dictionaryName: "NYS codes",
  entryName: "sex",
  codeListName: "Sex (1/2/9)",
  description: "Sex recorded on the case report.",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
} as unknown as ColumnCodes.T;

describe("BoundColumnName", () => {
  it("shows the entry's description, from its dictionary, for a column with none", () => {
    render(
      <BoundColumnName name="GENDER" codes={CODES} showsEntryDescription />,
    );

    expect(
      screen.getByText("Sex recorded on the case report."),
    ).toBeInTheDocument();
    expect(screen.getByText("From NYS codes")).toBeInTheDocument();
  });

  it("lets a column's own description win", () => {
    render(
      <BoundColumnName
        name="GENDER"
        codes={CODES}
        showsEntryDescription={false}
      />,
    );

    expect(screen.queryByText("Sex recorded on the case report.")).toBeNull();
  });

  it("puts a code-list tag after the name", () => {
    render(
      <BoundColumnName name="GENDER" codes={CODES} showsEntryDescription />,
    );

    expect(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    ).toBeInTheDocument();
  });
});
