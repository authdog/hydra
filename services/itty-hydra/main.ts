import { Router } from "itty-router";
import { createCors } from "itty-cors";

// import {
//   Health,
//   NotFound,
//   KvRead,
//   KvWrite,
//   KvKeysList,
//   GraphQLHandler,
//   SsrTest,
//   CacheTestHandler,
//   CachePurgeTestHandler,
//   CacheKeysTestHandler,
//   SmartInvalidateHandler,
//   AuthTestHandler,
// } from "./handlers";

// import { checkTokenValidness } from "keylab";
// import {
//   aggregateTypesWithIds,
//   extractedAllQueryIdentifiersInRawQuery,
//   generateGraphQLCacheKey,
//   splitAggregatedTypesWithIds,
//   readStream
// } from "@authdog/graphql-hydra-core";

// import { HydraConfig } from "./hydra.config";
// import { addTypenameKeywordToSchema } from "./handlers/federation/schemaUtils";

import { withDurables } from "itty-durable";
import { NotFound } from "./handlers/notFound";
import { Health } from "./handlers/health";
// import { readStream } from "./utils/stream";

const { preflight, corsify } = createCors();

const router = Router();
router
  .all("*", withDurables())
  .options("*", preflight)
  .get("/", Health)
  .get("/health", Health)
  .get("*", NotFound);

const handleRequest = (req, env, ctx) => {
  return router
    .handle(req, env, ctx)
    .catch(
      (err) => () =>
        new Response(err.stack, {
          status: 500,
        }),
    )
    .then(corsify); // cors should be applied to error responses as well
};

export const workerResolver = { fetch: handleRequest };
