import { FRAME_GATE_USAGE } from "./frameGateHelpers.constants";
import type { GateArguments } from "./frameGateHelpers.types";

/** Reads a comma-separated list of non-negative integer frames. */
function _parseCutList(value: string | undefined): number[] {
  if (value === undefined) {
    throw new Error(`${FRAME_GATE_USAGE}\n--declared-cuts needs a value`);
  }
  if (value === "") {
    return [];
  }
  return value.split(",").map((item) => {
    if (!/^\d+$/.test(item.trim())) {
      throw new Error(`${FRAME_GATE_USAGE}\nnot a frame number: ${item}`);
    }
    return Number(item.trim());
  });
}

/** Reads the arguments from `index` on into `parsed`, consuming flag values. */
function _readArguments(options: {
  argv: readonly string[];
  index: number;
  parsed: Partial<GateArguments>;
}): Partial<GateArguments> {
  const { argv, index, parsed } = options;
  const argument = argv[index];
  if (argument === undefined) {
    return parsed;
  }
  if (argument === "--declared-cuts") {
    const declaredCuts = _parseCutList(argv[index + 1]);
    return _readArguments({
      argv,
      index: index + 2,
      parsed: { ...parsed, declaredCuts },
    });
  }
  if (argument.startsWith("--declared-cuts=")) {
    const declaredCuts = _parseCutList(
      argument.slice("--declared-cuts=".length),
    );
    return _readArguments({
      argv,
      index: index + 1,
      parsed: { ...parsed, declaredCuts },
    });
  }
  if (argument === "--standalone") {
    return _readArguments({
      argv,
      index: index + 1,
      parsed: { ...parsed, isStandalone: true },
    });
  }
  if (argument.startsWith("--")) {
    throw new Error(`${FRAME_GATE_USAGE}\nunknown flag: ${argument}`);
  }
  return _readArguments({
    argv,
    index: index + 1,
    parsed: { ...parsed, file: argument },
  });
}

/**
 * Parses the gate's command line for `checkFrames`. Throws an error carrying
 * the usage line on a missing file, an unknown flag or a malformed cut list.
 */
export function makeGateArgumentsFromArgv(
  argv: readonly string[],
): GateArguments {
  const {
    file,
    isStandalone = false,
    declaredCuts = [],
  } = _readArguments({ argv, index: 0, parsed: {} });
  if (!file) {
    throw new Error(FRAME_GATE_USAGE);
  }
  return { file, isStandalone, declaredCuts };
}
