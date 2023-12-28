import {
  aggregateTypesWithIds,
  extractedAllQueryIdentifiersInRawQuery,
  generateGraphQLCacheKey,
  splitAggregatedTypesWithIds,
} from "../invalidation/invalidation";
import { addTypenameKeywordToSchema, removeTypename } from "../schemaUtils";
import { readStream } from "../utils/stream";
import { GraphQLHandler } from "./graphql";
import { checkTokenValidness } from "keylab";
import { fetchRateLimiterWithFacet } from "../do/utils";

export const HydraHandler = async (req, env, ctx): Promise<Response> => {
  if (ctx.hasOwnProperty("kv") === false) {
    throw new Error("Missing KV store");
  }

  if (ctx.hasOwnProperty("hydraConfig") === false) {
    throw new Error("Missing Hydra Config");
  }

  const { kv, hydraConfig, rateLimiter } = ctx;
  let cacheKey = null;
  // const { RateLimiter } = req;
  // get ip address
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-client-ip") ||
    req.headers.get("x-cluster-client-ip") ||
    req.headers.get("x-forwarded");

  const authorizedResponse = {
    errors: [
      {
        message: "Unauthorized",
        extensions: {
          code: "UNAUTHORIZED",
          statusCode: 401,
        },
      },
    ],
  };

  const facetId = ip;
  const defaultRateLimitingBudget = hydraConfig.rateLimiting.default.budget;
  let remainingRateBudget = -1;


  const kvNamespace = kv;
  const requestHeaders = req.clone()?.headers;
  const requestBody = await req.clone()?.json();

  const isMutation = requestBody?.query?.startsWith("mutation");

  let isIntrospection =
  requestBody?.operationName === "IntrospectionQuery" ||
  requestBody?.query?.indexOf("_schema") > -1;


  let extractedQueries = [];




  if (isIntrospection) {
    return await GraphQLHandler(req, env, ctx);
  }

  if (!isIntrospection && !isMutation) {

    // TODO: fix this, it excludes variables
    extractedQueries = extractedAllQueryIdentifiersInRawQuery(
      requestBody?.query,
    );
    
    if (rateLimiter && !isIntrospection && !isMutation) {

      const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const facetQueriesIds = extractedQueries.map((query) => {
        return `${facetId}_${query}`;
      })

      // TODO: generate map query -> rateCount
      const rateCounts = await Promise.all(facetQueriesIds.map(async (facetQueryId) => {
        const rateCount = await fetchRateLimiterWithFacet(req, rateLimiter, facetQueryId, timestamp);
        return rateCount;
      }));

      let hasAtLeastOneExceeded = false;

      rateCounts.map((rateCount) => {
        // TODO: read from config budget for given query
        if (Number(rateCount) > defaultRateLimitingBudget) {
          hasAtLeastOneExceeded = true;
          return true;
        }
      })
  
      if (hasAtLeastOneExceeded) {
        const errorResponse = {
          errors: [
            {
              message: "Too many requests",
              extensions: {
                code: "TOO_MANY_REQUESTS",
                statusCode: 429,
              },
            },
          ],
        };
  
        return new Response(JSON.stringify(errorResponse), {
          status: 429,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-hydra-rate-budget": "0",
            "x-hydra-rate-threshold": Number(
              defaultRateLimitingBudget,
            ).toString(),
          },
        });
      }
    }

    
    const variables = JSON.stringify(requestBody?.variables);

    // console.log("isMutation", isMutation);

    // TODO: make sure extracted queries identifiers are all public
    // if one of the name in extractedQueries doesn't belong public
    // then it requires authorization

    const requiresAuthorization = extractedQueries.some((query) => {
      return !hydraConfig.publicQueries.some((publicQuery) => {
        return publicQuery.name === query;
      });
    });

    let authorization =
      requestHeaders?.get("authorization") ||
      requestHeaders?.get("Authorization");

    if (authorization) {
      authorization = authorization?.replace("Bearer ", "");
      authorization = authorization?.replace("bearer ", "");
    }

    if (!requiresAuthorization) {
      cacheKey = await generateGraphQLCacheKey({
        query: requestBody?.query,
        variables,
      });
    } else if (requiresAuthorization && authorization) {
      let userId = "";

      if (requiresAuthorization && authorization) {
        let sanitizedJwks = null;

        try {
          const cachedJwks = await kvNamespace.get(hydraConfig?.jwksUri, {
            type: "text",
          });

          if (cachedJwks) {
            sanitizedJwks = JSON.parse(cachedJwks);
          } else {
            const jwksResponse = await fetch(hydraConfig?.jwksUri);
            const jwks = await jwksResponse.json();
            sanitizedJwks = jwks?.keys?.map((key) => {
              return {
                ...Object.keys(key).reduce((acc, curr) => {
                  if (curr !== "x5c" && curr !== "__typename") {
                    acc[curr] = key[curr];
                  }
                  return acc;
                }, {}),
              };
            });
            await kvNamespace.put(
              hydraConfig?.jwksUri,
              JSON.stringify(sanitizedJwks),
              {
                expirationTtl: 60,
              },
            );
          }
        } catch (e) {
          //console.log(e);
        }

        try {
          const { payload } = await checkTokenValidness(authorization, {
            adhoc: sanitizedJwks,
          });

          if (payload) {
            userId = payload?.sub;
          }
        } catch (e) {
          return new Response(JSON.stringify(authorizedResponse), {
            status: 401,
            headers: {
              "content-type": "application/json;charset=UTF-8",
              "x-hydra-rate-budget": "-1",
              "x-hydra-rate-threshold": Number(
                defaultRateLimitingBudget,
              ).toString(),
            },
          });
        }
      }

      cacheKey = await generateGraphQLCacheKey({
        query: requestBody?.query,
        userId,
        variables,
      });
    } else {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
      });
    }

    const cachedPayload = cacheKey
      ? await kvNamespace.get(cacheKey, {
          type: "text",
        })
      : null;

    if (cachedPayload) {
      return new Response(
        JSON.stringify({
          data: removeTypename(JSON.parse(cachedPayload)),
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-hydra-cached": "true",
            "x-hydra-rate-budget": String(remainingRateBudget),
            "x-hydra-rate-threshold": String(defaultRateLimitingBudget),
            // "x-hydra-cache-key": cacheKey,
          },
        },
      );
    }
  }
  // }

  let payload: any = null;

  try {
    const clonedRequest = req.clone();
    const clonedRequestPayload = await clonedRequest.json();

    const newRequestPayload = {
      ...clonedRequestPayload,
      query: addTypenameKeywordToSchema(clonedRequestPayload?.query),
    };

    const newRequest = new Request(req, {
      ...req,
      body: JSON.stringify(newRequestPayload),
    });

    payload = await GraphQLHandler(newRequest, env, ctx);

    if (isMutation) {
      const { data } = await payload.clone().json();
      const aggregatedIds = aggregateTypesWithIds(data);
      const allKeys = await kvNamespace.list();
      const keysToDelete = [];
      const userKey = cacheKey?.split("_")[0];

      const sequenceKeys = [];

      await allKeys?.keys
        ?.filter(
          (key) =>
            key.name?.indexOf("u:") === -1 || key.name?.indexOf(userKey) > -1,
        )
        ?.forEach((key) => {
          key?.metadata?.types?.forEach((type) => {
            aggregatedIds?.forEach((aggregatedId) => {
              if (
                type.name === aggregatedId.name &&
                type.ids.some((id) => aggregatedId.ids.includes(id))
              ) {
                keysToDelete.push(key.name);
              }

              if (key.name.indexOf("_s:") > -1) {
                // get prefix key from sequence key
                const prefixKey = key.name.split("_s:")[0];
                sequenceKeys.push(prefixKey);
              }
            });
          });
        });

      const deletePromises = [];

      // add sequence keys to delete
      allKeys?.keys
        ?.filter((key) => {
          return sequenceKeys.some((sequenceKey) => {
            return key.name.startsWith(sequenceKey);
          });
        })
        ?.forEach((key) => {
          deletePromises.push(kvNamespace.delete(key.name));
        });

      // add default keys to delete
      Array.from(new Set(keysToDelete)).forEach(async (key) => {
        deletePromises.push(kvNamespace.delete(key));
      });
      await Promise.all(deletePromises);
    }
  } catch (e) {
    console.log(e);
  }

  if (!isIntrospection && !isMutation && cacheKey && payload) {
    const rawJsonPayload = await payload.clone().json();

    // console.log("rawJsonPayload", rawJsonPayload)

    if (rawJsonPayload?.errors) {
      throw new Error(JSON.stringify(rawJsonPayload?.errors));
    }

    const { data } = rawJsonPayload;
    const aggregated = aggregateTypesWithIds(data);

    await kvNamespace.put(cacheKey, JSON.stringify(data), {
      expirationTtl: 60,
      metadata: {
        types: [
          ...aggregated?.map((item) => {
            return {
              name: item.name,
              ids: Array.from(new Set(item.ids.slice(0, 5))),
            };
          }),
        ],
      },
    });

    const chunks = splitAggregatedTypesWithIds(aggregated, 5);

    const keys = chunks?.map((chunk, idx) => {
      return {
        key: `${cacheKey}_s:${idx.toString().padStart(2, "0")}`,
        payload: chunk,
      };
    });

    const promises = keys?.map(async ({ key, payload }, idx: number) => {
      await kvNamespace.put(key, JSON.stringify({}), {
        expirationTtl: 60,
        metadata: {
          types: [
            ...payload?.map((item) => {
              return {
                name: item.name,
                ids: Array.from(new Set(item.ids)),
              };
            }),
          ],
        },
      });
    });
    await Promise.all(promises);
  }

  const streamData: any = await readStream(payload?.body?.getReader());
  const finalPayload = removeTypename(JSON.parse(streamData));

  payload = new Response(JSON.stringify(finalPayload), {
    status: 200,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "x-hydra-rate-budget": String(remainingRateBudget),
      "x-hydra-rate-threshold": String(defaultRateLimitingBudget),
      // "x-hydra-cache-key": cacheKey,
    },
  });

  return payload;
};
