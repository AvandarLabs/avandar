import { COMMANDS, HELP } from "./video.constants";
import type { Command, Options } from "./video.types";

function _getOptionValuesFromArguments({
  rest,
  allowed,
}: Readonly<{ rest: readonly string[]; allowed: ReadonlySet<string> }>): Record<
  string,
  string | undefined
> {
  return Array.from({ length: Math.ceil(rest.length / 2) }, (_, index) => {
    return index * 2;
  }).reduce<Record<string, string | undefined>>((values, index) => {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!allowed.has(flag) || !value || Object.hasOwn(values, flag)) {
      throw new Error(`Invalid or repeated option: ${flag}\n${HELP}`);
    }
    return { ...values, [flag]: value };
  }, {});
}
/** Parses the small CLI without shell evaluation or implicit flags. */
export function parseArgs(argv: readonly string[]): Options {
  const [command, filename, ...rest] = argv;
  if (!COMMANDS.includes(command as Command) || !filename) {
    throw new Error(HELP);
  }
  const allowed = new Set(
    command === "tts"
      ? ["--voice", "--rate"]
      : command === "align"
        ? ["--audio", "--srt"]
        : command === "preview" || command === "render"
          ? ["--theme"]
          : [],
  );
  const values = _getOptionValuesFromArguments({
    rest: rest,
    allowed: allowed,
  });
  const options: Options = {
    command: command as Command,
    filename,
    ...(values["--rate"] === undefined
      ? {}
      : { rate: Number(values["--rate"]) }),
    ...(values["--voice"] === undefined ? {} : { voice: values["--voice"] }),
    ...(values["--audio"] === undefined ? {} : { audio: values["--audio"] }),
    ...(values["--srt"] === undefined ? {} : { srt: values["--srt"] }),
    ...(values["--theme"] === undefined ? {} : { theme: values["--theme"] }),
  };
  if (
    options.rate !== undefined &&
    (!Number.isInteger(options.rate) || options.rate < 80 || options.rate > 240)
  ) {
    throw new Error("Scratch speech rate must be 80 to 240 words per minute");
  }
  if (command === "align" && (!options.audio || !options.srt)) {
    throw new Error("align requires --audio and --srt");
  }
  return options;
}
