import { Router } from "itty-router";
import { createCors } from "itty-cors";
import { withDurables } from "itty-durable";
import { NotFound } from "./handlers/notFound";
import { Health } from "./handlers/health";
import {GraphQLHandler} from "@authdog/hydra-core";

const { preflight, corsify } = createCors();

const router = Router();
router
  .all("*", withDurables())
  .options("*", preflight)
  .get("/", Health)
  .get("/health", Health)
  .get("/graphql", GraphQLHandler)
  .post("/graphql", GraphQLHandler)
  .get("*", NotFound);

const handleRequest = (req, env, ctx) => {
  const {HYDRA_ACME} = env;

  const enrichedContext = {
    ...ctx,
    kv: HYDRA_ACME,
    rateLimiter: null,
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
