# Cloudflare samples

## Get Started

Wrangler is recommended for local development and deployment. This README assumes you have already installed Wrangler.
All those notes and commands are applicable to cloudflare related projects (itty-hydra, hono-hydra, etc). Special notes are added to sample READMEs.

## Cloudflare Configuration

A KV namespace and a Durable object (optional) are required for this project.

## KV Namespace

KV is used to cache GraphQL queries payload with user segmentation meaning each user will have a different cache segment.

```bash
wrangler kv:namespace create "HYDRA_ORG_KV"
```

### Wrangler configuration

```toml
kv_namespaces = [
  { binding = "HYDRA_ORG_KV", id = "<KV_ID>" }
]
```

## Durable Object

Durable object is used for rate limiting, facet defined in `hydra.config.ts`.

### Wrangler Configuration

We need to add the durable object binding to the wrangler configuration.

`HydraRateLimiter` is a Durable Object class provided by Hydra, note that it's not specific to GraphQL and can be used in other contexts.

It must be exported by your worker index script.

`export { HydraRateLimiter } from "@authdog/hydra-core";`

We also need to add the migration and bindings to the wrangler configuration.

```toml
[durable_objects]
bindings = [
  { name = "HydraRateLimiter", class_name = "HydraRateLimiter" }
]

[[migrations]]
tag = "v1"
new_classes = ["HydraRateLimiter"]
```


## Troubleshooting

```bash
✘ [ERROR] Could not resolve "node:crypto"

    ../../packages/core/build/invalidation/invalidation.js:105:27:
      105 │     const crypto = require("node:crypto");
```
This error is caused because you don't have the node_compat flag enabled in your wrangler.toml file. To fix this, add the following line to your wrangler.toml file.

Add "node_compat = true" to your wrangler.toml file and make sure to prefix the module name with "node:" to enable Node.js compatibility.


