import { makeExecutableSchema } from "@graphql-tools/schema";
import { default as fetch } from "node-fetch";
import {
  addTypenameKeywordToSchema,
  buildGraphQLSchemaSDL,
  unifyGraphQLSchemasObjects,
} from "./schemaUtils";

// extract everything between type Query {}
const queryRegex = /type Query {([\s\S]*?)}/;
const mutationRegex = /type Mutation {([\s\S]*?)}/;

const extractPrimitiveWithRegExp = (rawSchema: string, regex: RegExp) => {
  const primitiveMatch = rawSchema.match(regex);
  const primitiveBody = primitiveMatch?.[1];
  const primitiveBodyTrimmed = primitiveBody?.trim();
  const primitiveBodyTrimmedLines = primitiveBodyTrimmed?.split("\n");
  const operations = primitiveBodyTrimmedLines?.map((line) => {
    const lineTrimmed = line.trim();
    const lineTrimmedWords = lineTrimmed.split(" ");
    let operationName = lineTrimmedWords?.[0];
    // remove everything after : or ( (inclusive) in mutationName
    // health: -> health
    // health(meta: SomeInput) -> health
    operationName = operationName?.replace(/[:\(].*$/, "");
    return {
      operationName,
    };
  });
  return operations;
};

export const getSchema = (schemas: any) => {
  // If the schemaRaw is empty, handle it here
  if (!schemas || schemas.length === 0) {
    console.warn("SchemaRaw is empty or invalid.");
    // Perform necessary actions or log messages for an empty schemaRaw
  }

  const queries = [
    ...schemas
      .map(({ introspected, url }) => {
        return extractPrimitiveWithRegExp(introspected, queryRegex).map(
          ({ operationName }) => {
            return {
              id: operationName,
              resolver: async (_, __, ctx) => {
                const queryBody = ctx?.params?.query;
                const variables = ctx?.params?.variables;
                const authorization = getAuthorizationFromContext(ctx);
                return await fetchGraphQLEndpoint(
                  url,
                  addTypenameKeywordToSchema(queryBody),
                  variables,
                  operationName,
                  { Authorization: authorization },
                );
              },
            };
          },
        );
      })
      .flat(),
  ];

  const mutations = [
    ...schemas
      .map(({ introspected, url }) => {
        return extractPrimitiveWithRegExp(introspected, mutationRegex).map(
          ({ operationName }) => {
            return {
              id: operationName,
              resolver: async (_, bindings, ctx) => {
                const queryBody = ctx?.params?.query;
                const variables = ctx?.params?.variables;
                const authorization = getAuthorizationFromContext(ctx);
                return await fetchGraphQLEndpoint(
                  url,
                  addTypenameKeywordToSchema(queryBody),
                  variables,
                  operationName,
                  { Authorization: authorization },
                );
              },
            };
          },
        );
      })
      .flat(),
  ];

  const resolvers = {
    Query: {},
    Mutation: {},
  };

  queries?.forEach(({ id, resolver }) => {
    resolvers.Query[id] = resolver;
  });

  mutations?.forEach(({ id, resolver }) => {
    resolvers.Mutation[id] = resolver;
  });

  let schema = makeExecutableSchema({
    typeDefs: buildGraphQLSchemaSDL(
      unifyGraphQLSchemasObjects([
        ...schemas.map(({ introspected }) => introspected),
      ]),
    ),
    resolvers,
  });

  return schema;
};

const fetchGraphQLEndpoint = async (
  endpoint: string,
  query: string,
  variables: object = {},
  methodId: string,
  headers: object = {},
) => {
  const requestBody = {
    query,
    variables,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Network response was not ok: ${response.status} ${response.statusText}`,
      );
    }

    const json: any = await response.json();
    if (json.errors) {
      throw new Error(JSON.stringify(json.errors));
    }
    return json.data[methodId];
  } catch (error) {
    throw error;
  }
};

const getAuthorizationFromContext = (ctx) => {
  const authorization = ctx?.request?.headers?.get("authorization");
  return authorization;
};