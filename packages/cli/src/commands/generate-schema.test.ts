import { generateSchemaAction } from "./generate-schema";
import fs from "fs/promises"; // Use fs promises for asynchronous file operations

const checkFileExists = (file: any) => {
  return fs
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

describe("generate schema command", () => {
  it("should validate a valid config object without throwing errors", async () => {
    const configPath = "./src/assets/hydra.config.ts";
    const defaultHydraSchemaRawPath = "./.hydra/schemaRaw.js";

    try {

      // check if .hydra/schemaRaw.js exists
      const schemaFileExistsBeforeCommand = await checkFileExists(defaultHydraSchemaRawPath);
      if (schemaFileExistsBeforeCommand) {
        // remove the file if it exists
        await fs.unlink(defaultHydraSchemaRawPath);
      }

      // Ensure the file exists before attempting to generate the schema
      const configFileExists: boolean = await checkFileExists(configPath);
      if (configFileExists) {
        // Generate schema using the specified configuration
        await generateSchemaAction({
          config: configPath,
        });
        // Check if the schema file exists after generation
        const schemaFileExistsAfterCommand = await checkFileExists(defaultHydraSchemaRawPath);
        expect(schemaFileExistsAfterCommand).toBeTruthy();
        // Remove the generated schema file after validation
        await fs.unlink(defaultHydraSchemaRawPath);
      } else {
        // Handle error if the config file doesn't exist
        throw new Error(`Config file not found at ${configPath}`);
      }
    } catch (error: any) {
      // Handle any errors that occur during file operations or schema generation
      console.error("Error:", error);
      throw error; // Rethrow the error to fail the test
    }
  });
});
