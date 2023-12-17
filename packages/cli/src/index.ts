import { Command } from "commander";
import { generateSchemaAction } from "./commands/generate-schema";

import figlet from "figlet";
import { actionRunner } from "./utils/errorsHandler";

const program = new Command();

// get version from package.json
program
  .name("hydra-cli")
  .description(figlet.textSync("Hydra CLI", { horizontalLayout: "full" }))
  .version(require("../package.json").version);

program
  .command("generate-schema")
  .description("generate hydra schema from configuration specifications")
  .option(
    "-c, --config <configPath>",
    "Path to Hydra configuration path, default being <hydra.config.ts>",
  )
  .action(actionRunner(generateSchemaAction));

// TODO
// program
//     .command("login")
//     .description(loginDescription)
//     .action(loginAction);

// // TODO
// program
//     .command("start")
//     .description("start development server")
//     .option("-p, --port <port>", "Development server port")
//     .action(startAction);

// // TODO
// // requires to be authenticated
// program
//     .command("purge")
//     .description("purge cached data")
//     .option("-a, --all", "remove all cached data (default option)")
//     .option("-tid", "remove cached objects with occurences typename:id")
//     .option("-type", "remove cached object with occurences of a given type")
//     .action(purgeAction);

// ideas:
// scaffold a new hydra project

program.parse();
