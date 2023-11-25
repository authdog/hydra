import { Router } from "itty-router";
import { createCors } from "itty-cors";
import { withDurables } from "itty-durable";
import { NotFound } from "./handlers/notFound";
import { Health } from "./handlers/health";
import {GraphQLHandler} from "@authdog/hydra-core";
import { HydraConfig } from "./hydra.config";
import { extractedAllQueryIdentifiersInRawQuery, generateGraphQLCacheKey } from "@authdog/hydra-core/src/invalidation/invalidation";

const { preflight, corsify } = createCors();

const router = Router();
router
  // .all("*", withDurables())
  .options("*", preflight)
  .get("/", Health)
  .get("/health", Health)
  // serves playground
  .get("/graphql", GraphQLHandler)
  .post("/graphql", async (req, env, ctx) => {
    const {kv} = ctx;

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
      requestBody?.query
    );

    const variables = JSON.stringify(requestBody?.variables);


    const requiresAuthorization = extractedQueries.some((query) => {
      return !HydraConfig.publicQueries.some((publicQuery) => {
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
        }
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
        const responseBody = await response?.clone()?.json();
        const responseBodyString = JSON.stringify(responseBody);
        await kv.put(cacheKey, responseBodyString);
      }

      return response;
  })
  .get("*", NotFound);

const handleRequest = (req, env, ctx) => {
  const {HYDRA_ACME} = env;

  const enrichedContext = {
    ...ctx,
    kv: HYDRA_ACME,
    // rateLimiter: null,
  };

  return router
    .handle(req, env, enrichedContext)
    .catch(
      (err) => () =>
        new Response(err.stack, {
          status: 500,
        }),
    )
    .then(corsify); // cors should be applied to error responses as well
};

export const workerResolver = { fetch: handleRequest };
