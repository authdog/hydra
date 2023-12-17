import path from "path";
import { buildSchemaIntrospection } from "../utils/introspectSchemas";
import { validateConfig } from "../utils/validateConfig";

interface IGenerateSchemaAction {
  config?: string;
}

export const generateSchemaAction = async ({
  config = "./hydra.config.ts",
}: IGenerateSchemaAction) => {
  const rootPath = process.cwd(); // Get the root directory path

  const configPath = path.resolve(rootPath, config); // Construct absolute path for config
  const outputPath = path.resolve(rootPath, ".hydra/schemaRaw.ts"); // Construct absolute path for output

  let demoConfig: any;

  try {
    // Use `import` instead of `require` for TypeScript support
    const importedConfig = await import(configPath);
    demoConfig = importedConfig.default || importedConfig;
  } catch (error) {
    throw new Error("Error loading or parsing the config file: " + error);
  }

  console.log(demoConfig);
  const validatedConfig = validateConfig(demoConfig);

  if (!validatedConfig) {
    throw new Error("Invalid config");
  }

  try {
    await buildSchemaIntrospection(validatedConfig.schemas, outputPath);
  } catch (error) {
    console.error(error);
    throw new Error("Error generating schema");
  }

  console.info("Schema generated successfully");
};