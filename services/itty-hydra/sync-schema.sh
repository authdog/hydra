#!/bin/bash

# Read schema from .hydra/schemaRaw.json
SCHEMA=$(<.hydra/schemaRaw.json)

# Put schema into Key-Value store using wrangler
wrangler kv:key put schema "$SCHEMA" --namespace-id=c63f48a0f29843e8ab8251ef533e1c9c
