import fetch from "node-fetch";
import { getIntrospectionQuery, buildClientSchema, printSchema } from "graphql";
import { initSpinner, stopSpinner } from "./spinners";
import fs from "fs";
import { logError } from "./cliLogger";

export async function introspectRemoteSchema(endpointUrl: string) {
  try {
    // Send an introspection query to the GraphQL endpoint
    // animate cliSpinners.dots in the console

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: getIntrospectionQuery() }),
    })?.then((res) => {
      return res;
    });

    if (!response.ok) {
      process.stdout.write(`\r`);

      throw new Error(
        `Failed to fetch introspection query: ${response.status}`,
      );
    }

    const introspectionResult = await response.json();

    // Build a client schema from the introspection result
    const clientSchema = buildClientSchema(introspectionResult.data);
    const schemaString = printSchema(clientSchema);

    // Create a multi-line string enclosed within backticks
    const formattedSchemaString = `${schemaString}`;
    return formattedSchemaString;
  } catch (error: any) {
    logError(error.message);
  }
}

interface GraphQLSchema {
  id: string;
  uri: string;
  // TODO: investigate distribution of GraphQL engines requiring tokens from introspection
  // token?: string; // some schemas require a token to be introspected
}

export const buildSchemaIntrospection = async (
  schemas: GraphQLSchema[],
  outputPath: string,
) => {
  let schemaWithIntrospection = [];

  const interval = initSpinner("Introspecting schemas");

  for (const schema of schemas) {
    const introspected = await introspectRemoteSchema(schema.uri);

    const output = {
      name: schema.id,
      url: schema.uri,
      introspected,
    };

    schemaWithIntrospection.push(output);
  }

  stopSpinner(interval);

  const fileContent = schemaWithIntrospection.map((s) => ({
    name: s.name,
    url: s.url,
    introspected: s.introspected,
  }));

  // create a .hydra directory if it doesn't exist
  if (!fs.existsSync(".hydra")) {
    fs.mkdirSync(".hydra");
  }

  // generate a schemaRaw file (.hydra/schemaRaw.js) module.exports = <fileContent>
  fs.writeFileSync(
    outputPath,
    `module.exports = ${JSON.stringify(fileContent, null, 2)}`,
  );
};
