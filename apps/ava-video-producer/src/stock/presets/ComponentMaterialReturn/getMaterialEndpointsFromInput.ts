import { propEq } from "@avandar/utils";
import { getMaterialItemsFromInput } from "./getMaterialItemsFromInput";
import type { Input } from "./ComponentMaterialReturn.schema";
/** Whole components occupy unique slots inside their declared destination. */
export function getMaterialEndpointsFromInput({
  input,
  index,
}: Readonly<{ input: Input; index: number }>): {
  source: { x: number; y: number };
  target: { x: number; y: number };
  destination: string;
} {
  const items = getMaterialItemsFromInput(input);
  const item = items[index];
  const destination =
    item.route === "recycle" || item.route === "residue"
      ? item.route
      : "output";
  const peers = items
    .slice(0, index)
    .filter(
      (peer) =>
        (peer.route === "recycle" || peer.route === "residue"
          ? peer.route
          : "output") === destination,
    ).length;
  const source = {
    x:
      item.origin === "returned"
        ? 65 + index * 40
        : 75 + (index - input.parts.length) * 70,
    y: item.origin === "returned" ? 300 : 365,
  };
  const target = {
    x:
      destination === "output"
        ? 420 + peers * 32
        : 750 +
          (peers +
            (destination === "residue"
              ? input.parts.filter(propEq("route", "recycle")).length
              : 0)) *
            28,
    y: destination === "residue" ? 365 : 300,
  };
  return { source, target, destination };
}
