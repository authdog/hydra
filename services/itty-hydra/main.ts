import { Router } from "itty-router";
import { createCors } from "itty-cors";
import { withDurables } from "itty-durable";
import { NotFound } from "./handlers/notFound";
import { Health } from "./handlers/health";

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
