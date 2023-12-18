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

    try {
      // await fs.unlink("./.hydra/schemaRaw.ts");

      // Ensure the file exists before attempting to generate the schema
      // @ts-ignore
      const configFileExists: boolean = await checkFileExists(configPath);
      if (configFileExists) {
        // Generate schema using the specified configuration
        await generateSchemaAction({
          config: configPath,
          namespaceId: "test",
        });

        // Check if the schema file exists after generation
        //const schemaFileExists = await checkFileExists("./.hydra/schemaRaw.ts");
        //expect(schemaFileExists).toBeTruthy();

        // Remove the generated schema file after validation
        //await fs.unlink("./.hydra/schemaRaw.ts");
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
