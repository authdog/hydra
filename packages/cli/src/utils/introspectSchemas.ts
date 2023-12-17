import fetch from "node-fetch";
import { getIntrospectionQuery, buildClientSchema, printSchema } from "graphql";
import { initSpinner, stopSpinner } from "./spinners";

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
  } catch (error) {
    console.error(error);
  }
}

interface GraphQLSchema {
  id: string;
  uri: string;
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

  // const outputPath = "src/handlers/federation/schemaRawGenerated.ts";
  const exportStatements = schemaWithIntrospection.map(
    (s) =>
      `export const ${s.name} = {
        name: "${s.name}",
        url: "${s.url}",
        introspected: ${JSON.stringify(s.introspected, null, 2)}
      };`,
  );

  const fileContent = `${exportStatements.join("\n")}\n`;

  const fs = require("fs");

  try {
    // define .hydra folder if it doesn't exist
    if (!fs.existsSync(".hydra")) {
      fs.mkdirSync(".hydra");
    }

    fs.writeFileSync(outputPath, fileContent);
    console.log(`${outputPath} written`);
  } catch (err) {
    console.error(err);
  }
};
