/** Inputs shared by the ShelfActor visuals. */
export type Props = {
  role: "retailer" | "shopper";
  x: number;
  y: number;
  handX: number;
  handY: number;
  accent: string;
};
