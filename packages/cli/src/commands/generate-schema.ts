import {
  hydraConfigPathDefault,
  hydraSchemaRawPath,
} from "../__assets__/constants";
import { logError, logSuccess } from "../utils/cliLogger";
import { buildSchemaIntrospection } from "../utils/introspectSchemas";
import { validateConfig } from "../utils/validateConfig";
import path from "path";
import ts from "typescript";

interface IGenerateSchemaAction {
  config?: string;
}

export const generateSchemaAction = async ({
  config = hydraConfigPathDefault,
}: IGenerateSchemaAction) => {
  const rootPath = process.cwd(); // Get the root directory path
  const configPath = path.resolve(rootPath, config); // Construct absolute path for config
  const outputPath = path.resolve(rootPath, hydraSchemaRawPath); // Construct absolute path for output

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
      return logError(`Config [${config}] not found`);
    }

    // Emit the transpiled code
    const { outputText } = ts.transpileModule(sourceFile.getText(), {
      compilerOptions: tsConfig,
    });

    // // Evaluate the transpiled code
    const module_ = eval(outputText);
    const demoConfig = module_.default || module_;
    const validatedConfig = validateConfig(demoConfig);

    if (!validatedConfig) {
      return logError(`Invalid config [${config}]`);
    }

    try {
      await buildSchemaIntrospection(validatedConfig.schemas, outputPath);
    } catch (error) {
      return logError("Error generating schema");
    }

    // console.info(cc.set("bg_green", "Schema generated successfully ✓"));
    logSuccess("Schema generated successfully");
  } catch (error) {
    // @ts-ignore
    return logError(error.message);
  }
};
