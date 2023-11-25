# itty-hydra

This project is a sample application to demonstrate the use of Hydra with Itty.

## Get Started

Wrangler is recommended for local development and deployment.

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
  { binding = "HYDRA_ORG_KV", id = "KV_ID" }
]
```

## Durable Object

Durable object is used for rate limiting, facet defined in `hydra.config.ts`.

### Wrangler Configuration

We need to add the durable object binding to the wrangler configuration.

`RateLimiter` is a Durable Object class provided by Hydra, note that it's not specific to GraphQL and can be used in other contexts.

It must be exported by your worker index script.

export { RateLimiter } from "@authdog/hydra-core";

We also need to add the migration and bindings to the wrangler configuration.

```toml
[[durable_objects.bindings]]
name = "RateLimiter"
class_name = "RateLimiter"

[[migrations]]
tag = "v2"
new_classes = [ "RateLimiter" ]
```
