import { Router } from "itty-router";
import { createCors } from "itty-cors";
import { withDurables } from "itty-durable";
import { NotFound } from "./handlers/notFound";
import { Health } from "./handlers/health";
import { GraphQLHandler, HydraHandler } from "@authdog/hydra-core";
import { HydraConfigAcme } from "./hydra.config";

// import { default as rawSchema } from "./.hydra/schemaRaw";
let rawSchema = null;

try {
  rawSchema = require("./.hydra/schemaRaw");
} catch (err) {
  console.log("err", err);
}

const { preflight, corsify } = createCors();

const router = Router();
router
  .all("*", withDurables())
  .options("*", preflight)
  .get("/", Health)
  .get("/health", Health)
  .get("/graphql", GraphQLHandler)
  .post("/graphql", HydraHandler)
  .get("*", NotFound);

const handleRequest = (req, env, ctx) => {
  const { HYDRA_ACME } = env;

  // console.log("rawSchema", rawSchema);

  const enrichedContext = {
    ...ctx,
    kv: HYDRA_ACME,
    hydraConfig: HydraConfigAcme,
    rawSchema,
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
