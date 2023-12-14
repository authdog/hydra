import fetch from "node-fetch";
import { getIntrospectionQuery, buildClientSchema, printSchema } from "graphql";

async function introspectRemoteSchema(endpointUrl: string) {
  try {
    // Send an introspection query to the GraphQL endpoint
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: getIntrospectionQuery() }),
    });

    if (!response.ok) {
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

    console.log(formattedSchemaString);

    return formattedSchemaString;
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

interface GraphQLSchema {
  id: string;
  uri: string;
  token?: string; // some schemas require a token to be introspected
}

export const buildSchemaIntrospection = async (schemas:GraphQLSchema[], outputPath: string) => {
  let schemaWithIntrospection = [];

  for (const schema of schemas) {
    const introspected = await introspectRemoteSchema(schema.uri);

    const output = {
      name: schema.id,
      url: schema.uri,
      introspected,
    };

    schemaWithIntrospection.push(output);
  }

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
