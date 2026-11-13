import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { BoundColumnName } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/BoundColumnName";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

const CODES: ColumnCodes.T = {
  datasetColumnId: "col-gender",
  dictionaryId: "dict-1",
  dictionaryName: "NYS codes",
  entryName: "sex",
  codeListName: "Sex (1/2/9)",
  isOrdered: false,
  mode: "reference",
  direction: "decode",
  description: "Sex recorded on the case report.",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
};

describe("BoundColumnName", () => {
  it("puts a code-list tag after the name", () => {
    render(<BoundColumnName name="GENDER" codes={CODES} />);

    expect(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    ).toBeInTheDocument();
  });

  it("leaves the entry's description to the Description column", () => {
    render(<BoundColumnName name="GENDER" codes={CODES} />);

    expect(screen.queryByText("Sex recorded on the case report.")).toBeNull();
  });
});
