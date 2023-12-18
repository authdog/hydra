import fetch from "node-fetch";
import { getIntrospectionQuery, buildClientSchema, printSchema } from "graphql";
import { initSpinner, stopSpinner } from "./spinners";
// import { spawn } from "node:child_process";
import fs from "fs";


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
  namespaceId: string,
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

  const fileContent = schemaWithIntrospection.map(s => ({
    name: s.name,
    url: s.url,
    introspected: s.introspected
  }));


  // generate a schemaRaw file (.hydra/schemaRaw.js) module.exports = <fileContent>
  fs.writeFileSync(outputPath, `module.exports = ${JSON.stringify(fileContent, null, 2)}`);


  // if (namespaceId && namespaceId !== "test") {
  // // write with wrangler child process
  // // wrangler kv:key put schema '{"foo": "bar"}' --namespace-id=c63f48a0f29843e8ab8251ef533e1c9c
  // const wrangler = spawn("wrangler", [
  //   "kv:key",
  //   "put",
  //   "schema",
  //   JSON.stringify(fileContent),
  //   `--namespace-id=${namespaceId}`,
  // ]);

  // wrangler.stdout.on("data", (data) => {
  //   console.log(`stdout: ${data}`);
  // });
  // }


};
