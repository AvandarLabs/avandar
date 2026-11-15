import assert from "node:assert/strict";
import test from "node:test";
import { wordRevealInputSchema } from "./WordReveal.schema";

test("four words produce an ordinary length error without throwing", () => {
  const result = wordRevealInputSchema.safeParse({
    words: Array.from({ length: 4 }, () => ({ word: "A", accented: false })),
    showArrow: true,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        ({ code, path }) => code === "too_big" && path.join(".") === "words",
      ),
    );
  }
});
