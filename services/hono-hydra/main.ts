import { GraphQLHandler, HydraHandler } from "@authdog/hydra-core";
import { Hono } from "hono";

export { HydraRateLimiter } from "@authdog/hydra-core";
import { HydraConfigAcme } from "./hydra.config";

let rawSchema: any = null;

try {
  rawSchema = require("./.hydra/schemaRaw");
} catch (err) {
  // TODO: display errors/instruction for hydra generate-schema
  console.log("err", err);
}

const app = new Hono();

app.get("/", (c) => {
  console.log(c);
  return c.text("It's alive!");
});

app.get("/graphql", (c) => {
  return GraphQLHandler(c.req.raw, c.env, {
    rawSchema,
  });
});

app.post("/graphql", (c) => {
  const enrichedContext = {
    kv: c?.env?.HYDRA_ACME,
    hydraConfig: HydraConfigAcme,
    rawSchema,
    rateLimiter: c?.env?.HydraRateLimiter ?? null,
  };

  return HydraHandler(c.req.raw, c.env, enrichedContext);
});

export default app;
