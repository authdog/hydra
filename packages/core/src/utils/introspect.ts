import fetch from "node-fetch";
import { getIntrospectionQuery, buildClientSchema, printSchema } from "graphql";
const fs = require("fs");

interface IntrospectionResponse {
  data?: {
    __schema: any; // This should be a more specific type representing the introspected schema
  };
}

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

    // Parse response as JSON
    const introspectionResult: IntrospectionResponse = await response.json();

    // Check for network-related errors
    if (!introspectionResult || !introspectionResult.data) {
      throw new Error("Invalid introspection result");
    }

    // Build a client schema from the introspection result
    const clientSchema = buildClientSchema(introspectionResult.data);
    const schemaString = printSchema(clientSchema);

    // Create a multi-line string enclosed within backticks
    return `${schemaString}`;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null; // Return null or handle the error appropriately
  }
}

/**
 *
 * @param schemas - remote GraphQL schemas to introspect, typically from hydra.config.ts
 * @param outputPath - path to write the introspected schemas to
 */
export const buildSchemaIntrospection = async (
  schemas: { id: string; uri: string }[],
  outputPath: string,
) => {
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

  const exportStatements = schemaWithIntrospection.map(
    (s) =>
      `export const ${s.name} = {
        name: "${s.name}",
        url: "${s.url}",
        introspected: ${JSON.stringify(s.introspected, null, 2)}
      };`,
  );

  const fileContent = `${exportStatements.join("\n")}\n`;

  try {
    fs.writeFileSync(outputPath, fileContent);
    console.log(`${outputPath} written`);
  } catch (err) {
    console.error(err);
  }
};
