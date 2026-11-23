import { COMPONENT_COMMANDS } from "./componentCommands.constants.mjs";
import { FILM_COMMANDS } from "./filmCommands.constants.mjs";
import { LIFECYCLE_COMMANDS } from "./lifecycleCommands.constants.mjs";
import { PIPELINE_COMMANDS } from "./pipelineCommands.constants.mjs";

/** Public producer commands, with help and execution kept together. */
export const PRODUCER_COMMANDS = {
  ...FILM_COMMANDS,
  ...PIPELINE_COMMANDS,
  ...COMPONENT_COMMANDS,
  ...LIFECYCLE_COMMANDS,
};
