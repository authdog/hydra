import {
  extractedAllQueryIdentifiersInRawQuery,
  generateGraphQLCacheKey,
} from "../invalidation/invalidation";
import { GraphQLHandler } from "./graphql";

export const HydraHandler = async (req, env, ctx): Promise<Response> => {
  if (ctx.hasOwnProperty("kv") === false) {
    throw new Error("Missing KV store");
  }

  if (ctx.hasOwnProperty("hydraConfig") === false) {
    throw new Error("Missing Hydra Config");
  }

  const { kv, hydraConfig } = ctx;

  let extractedQueries = [];
  let cacheKey = null;

  let isMutation = false;

  const requestBody = await req.clone()?.json();

  let isIntrospection = true;
  if (requestBody?.operationName !== "IntrospectionQuery") {
    isIntrospection = false;

    isMutation = requestBody?.query?.startsWith("mutation");

    extractedQueries = extractedAllQueryIdentifiersInRawQuery(
      requestBody?.query,
    );

    const variables = JSON.stringify(requestBody?.variables);

    const requiresAuthorization = extractedQueries.some((query) => {
      return !hydraConfig.publicQueries.some((publicQuery) => {
        return publicQuery.name === query;
      });
    });

    if (!requiresAuthorization) {
      cacheKey = await generateGraphQLCacheKey({
        query: requestBody?.query,
        variables,
      });
    } else if (requiresAuthorization) {
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: "Unauthorized",
            },
          ],
        }),
        {
          status: 401,
        },
      );
    }

    if (cacheKey) {
      const cachedResponse = await kv.get(cacheKey);
      if (cachedResponse) {
        return new Response(cachedResponse, {
          status: 200,
        });
      }
    }
  }

  const response = await GraphQLHandler(req, env, ctx);
  const cacheWritable = cacheKey && !isIntrospection && !isMutation;

  if (cacheWritable) {
    const responseBody = await response?.clone()?.json();
    const responseBodyString = JSON.stringify(responseBody);
    await kv.put(cacheKey, responseBodyString);
  }

  return response;
};
