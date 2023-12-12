import { Command } from "commander"

const program = new Command();

program
  .name('hydra-cli')
  .description('Hydra CLI utilities')
  .version('0.1.0');

program
    .command("generate-schema")
    .description("Generate Hydra schema from configuration specifications")
    .option("-c, --config <configPath>", "Path to Hydra configuration path, default being <hydra.config.ts>")
    .action(({
        config
    }) => {

        let hydraConfig = {};

        if (config) {
            // validate custom config
        } else {
            // check if config exists
            // validate standard config
        }
        // if valid, set hydraConfig as parsed config
    });

program.parse();