import { Command } from "commander"
import { startAction } from "./commands/start";
import { loginAction, loginDescription } from "./commands/login";
import { generateSchemaAction } from "./commands/generate-schema";
import { purgeAction } from "./commands/purge";

const program = new Command();

program
  .name('hydra-cli')
  .description('Hydra CLI')
  .version('0.1.0');

program
    .command("generate-schema")
    .description("generate hydra schema from configuration specifications")
    .option("-c, --config <configPath>", "Path to Hydra configuration path, default being <hydra.config.ts>")
    .action(generateSchemaAction);

program
    .command("login")
    .description(loginDescription)
    .action(loginAction);

program
    .command("start")
    .description("start development server")
    .option("-p, --port <port>", "Development server port")
    .action(startAction);

program
    .command("purge")
    .description("purge cached data")
    .option("-a, --all", "remove all cached data (default option)")
    .option("-tid", "remove cached objects with occurences typename:id")
    .option("-type", "remove cached object with occurences of a given type")
    .action(purgeAction);

// ideas:
// scaffold a new hydra project

program.parse();
