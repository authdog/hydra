import { Router } from "itty-router";
import { createCors } from "itty-cors";
import { NotFound } from "./handlers/notFound";
import { Health } from "./handlers/health";
import {
  GraphQLHandler,
  HydraHandler
} from "@authdog/hydra-core";
import { HydraConfigAcme } from "./hydra.config";

let rawSchema = null;

try {
  rawSchema = require("./.hydra/schemaRaw");
} catch (err) {
  // TODO: display errors/instruction for hydra generate-schema
  console.log("err", err);
}

const { preflight, corsify } = createCors();

const router = Router();
router
  .options("*", preflight)
  .get("/", Health)
  .get("/health", Health)
  .get("/graphql", GraphQLHandler)
  .post("/graphql", HydraHandler)
  .all("*", NotFound);

const handleRequest = async (req, env, ctx) => {


  const enrichedContext = {
    ...ctx,
    kv: env?.HYDRA_ACME,
    hydraConfig: HydraConfigAcme,
    rawSchema,
    rateLimiter: env?.HydraRateLimiter ?? null,
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
