import { buildSchemaIntrospection } from "../utils/introspectSchemas";
import { validateConfig } from "../utils/validateConfig";
import path from "path";
import ts from "typescript";
import fs from "fs"

interface IGenerateSchemaAction {
  config?: string;
}

export const generateSchemaAction = async ({
  config = "./hydra.config.ts",
}: IGenerateSchemaAction) => {
  const rootPath = process.cwd(); // Get the root directory path

  const configPath = path.resolve(rootPath, config); // Construct absolute path for config
  const outputPath = path.resolve(rootPath, ".hydra/schemaRaw.ts"); // Construct absolute path for output

  try {

    // Compiler options (optional)
    const tsConfig = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS,
    };

    // Create TypeScript compiler host and program
    const compilerHost = ts.createCompilerHost({});
    const program = ts.createProgram([configPath], tsConfig, compilerHost);

    // Get the source file
    const sourceFile = program.getSourceFile(configPath);

    if (!sourceFile) {
      throw new Error("Source file not found");
    }

    // Emit the transpiled code
    const { outputText } = ts.transpileModule(sourceFile.getText(), { compilerOptions: tsConfig });

    // // Evaluate the transpiled code
    const module_ = eval(outputText);

    const demoConfig = module_.default || module_;

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
  } catch (error) {
    throw new Error("Error transpiling or executing TypeScript code: " + error);
  }
};
