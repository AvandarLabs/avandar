import { describe, expect, it } from "vitest";
import {
  filterAndRankByTokenSearch,
  findTokenSearchMatch,
  splitTextByMatchedRanges,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/tokenSearch/tokenSearch";

describe("findTokenSearchMatch", () => {
  it("matches each search token anywhere inside the text's words", () => {
    expect(
      findTokenSearchMatch("City government", "ty gov")?.matchedRanges,
    ).toEqual([
      { start: 2, end: 4 },
      { start: 5, end: 8 },
    ]);
  });

  it("matches regardless of letter case", () => {
    expect(findTokenSearchMatch("City government", "CITY")).toBeDefined();
  });

  it("matches tokens in any order", () => {
    expect(findTokenSearchMatch("City government", "gov ci")).toBeDefined();
  });

  it("returns undefined when any one token is missing from the text", () => {
    expect(findTokenSearchMatch("City government", "ty xyz")).toBeUndefined();
  });

  it("needs a separate occurrence for each repeated token", () => {
    expect(findTokenSearchMatch("New York", "new new")).toBeUndefined();
  });

  it("ignores accents, mapping the match back onto the accented text", () => {
    expect(
      findTokenSearchMatch("Salud Pública", "publica")?.matchedRanges,
    ).toEqual([{ start: 6, end: 13 }]);
  });

  it("prefers an occurrence that starts a word", () => {
    expect(findTokenSearchMatch("Ultra transit", "tra")?.matchedRanges).toEqual(
      [{ start: 6, end: 9 }],
    );
  });

  it("merges tokens that match side by side into one range", () => {
    expect(findTokenSearchMatch("Transit", "tran sit")?.matchedRanges).toEqual([
      { start: 0, end: 7 },
    ]);
  });

  it("matches everything with no ranges when the search is blank", () => {
    expect(findTokenSearchMatch("City government", "   ")).toEqual({
      matchedRanges: [],
      score: 0,
    });
  });

  it("scores a match at a word start above one inside a word", () => {
    const wordStartScore = findTokenSearchMatch("Health", "hea")?.score ?? 0;
    const midWordScore = findTokenSearchMatch("Wheat", "hea")?.score ?? 0;

    expect(wordStartScore).toBeGreaterThan(midWordScore);
  });
});

describe("splitTextByMatchedRanges", () => {
  it("splits the text into matched and unmatched segments in order", () => {
    expect(
      splitTextByMatchedRanges("City government", [
        { start: 2, end: 4 },
        { start: 5, end: 8 },
      ]),
    ).toEqual([
      { text: "Ci", isMatch: false },
      { text: "ty", isMatch: true },
      { text: " ", isMatch: false },
      { text: "gov", isMatch: true },
      { text: "ernment", isMatch: false },
    ]);
  });

  it("returns the whole text as one unmatched segment with no ranges", () => {
    expect(splitTextByMatchedRanges("Health", [])).toEqual([
      { text: "Health", isMatch: false },
    ]);
  });
});

describe("filterAndRankByTokenSearch", () => {
  const getText = (item: string): string => {
    return item;
  };

  it("drops the items the search does not match", () => {
    expect(
      filterAndRankByTokenSearch(
        ["City government", "State health", "County parks"],
        "ty gov",
        getText,
      ),
    ).toEqual(["City government"]);
  });

  it("lists word-start matches before matches inside a word", () => {
    expect(
      filterAndRankByTokenSearch(["Wheat prices", "Health"], "hea", getText),
    ).toEqual(["Health", "Wheat prices"]);
  });

  it("keeps the original order among equally good matches", () => {
    expect(
      filterAndRankByTokenSearch(
        ["Transit", "Transportation", "Trade"],
        "tr",
        getText,
      ),
    ).toEqual(["Transit", "Transportation", "Trade"]);
  });

  it("keeps every item in order when the search is blank", () => {
    expect(filterAndRankByTokenSearch(["B", "A"], "", getText)).toEqual([
      "B",
      "A",
    ]);
  });
});
