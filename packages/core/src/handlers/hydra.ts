import {
  extractedAllQueryIdentifiersInRawQuery,
  generateGraphQLCacheKey,
} from "../invalidation/invalidation";
import { GraphQLHandler } from "./graphql";

export const HydraHandler = async (req, env, ctx) => {
  const { kv, hydraConfig } = ctx;

  let extractedQueries = [];
  let cacheKey = null;

  // const clonedRequest = req.clone();

  // // const requestHeaders = clonedRequest?.headers;
  const requestBody = await req.clone()?.json();

  let isIntrospection = true;
  if (requestBody?.operationName !== "IntrospectionQuery") {
    isIntrospection = false;

    // const isMutation = requestBody?.query?.startsWith("mutation");

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

  if (cacheKey) {
    // @ts-ignore
    const responseBody = await response?.clone()?.json();
    const responseBodyString = JSON.stringify(responseBody);
    await kv.put(cacheKey, responseBodyString);
  }

  return response;
};
