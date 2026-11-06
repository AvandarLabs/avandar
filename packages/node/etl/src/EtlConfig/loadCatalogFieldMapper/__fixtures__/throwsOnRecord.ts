/** Test fixture: always throws, as a broken mapper script would. */
export default function throwsOnRecord(): never {
  throw new Error("fixture script failure");
}
