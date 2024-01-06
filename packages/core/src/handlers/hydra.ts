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
import {
  buildRateLimitResponse,
  unauthorizedResponse,
} from "../responses/default";


// TODO: remove duplicated identity fetcher
export const HydraHandler = async (req, env, ctx): Promise<Response> => {
  if (ctx.hasOwnProperty("kv") === false) {
    throw new Error("Missing KV store");
  }

  if (ctx.hasOwnProperty("hydraConfig") === false) {
    throw new Error("Missing Hydra Config");
  }

  const { kv, hydraConfig, rateLimiter } = ctx;
  let cacheKey = null;
  // get ip address
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-client-ip") ||
    req.headers.get("x-cluster-client-ip") ||
    req.headers.get("x-forwarded");

  const skipCache = req.headers.get("x-hydra-skip-cache") === "true";

  const facetId = ip || "localhost"; // TODO: extend to more facets combinations
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
  let userId = "";

  const directQuery = isIntrospection || skipCache;

  if (directQuery) {
    return await GraphQLHandler(req, env, ctx);
  }

  if (isMutation) {
    cacheKey = await generateGraphQLCacheKey({
      query: requestBody?.query,
      userId: "",
      variables: JSON.stringify(requestBody?.variables),
    });
  }

  let authorization =
    requestHeaders?.get("authorization") ||
    requestHeaders?.get("Authorization");

  if (authorization) {
    authorization = authorization?.replace("Bearer ", "");
    authorization = authorization?.replace("bearer ", "");
  }

  if (!isIntrospection && !isMutation) {
    // TODO: fix this, it excludes variables
    extractedQueries = extractedAllQueryIdentifiersInRawQuery(
      requestBody?.query,
    );

    if (rateLimiter && !isIntrospection && !isMutation) {
      const facetQueriesIds = extractedQueries.map((query) => {
        const facetQueryId = `${facetId}_${query}`;
        const queryId =
          hydraConfig.rateLimiting?.queries?.find((queryConfig) => {
            return queryConfig.id === query;
          })?.id || "default";
        const queryBudget =
          hydraConfig.rateLimiting?.queries?.find((queryConfig) => {
            return queryConfig.id === query;
          })?.budget || defaultRateLimitingBudget;

        return {
          facetQueryId,
          queryId,
          queryBudget,
        };
      });

      const rateCountsReports = await Promise.all(
        facetQueriesIds.map(async (facetObj) => {
          let timestamp = new Date()
            .toISOString()
            .slice(0, 16)
            .replace(/[-:T]/g, "")
            .slice(0, 12);
          const rateCount = await fetchRateLimiterWithFacet(
            req,
            rateLimiter,
            facetObj.facetQueryId,
            timestamp,
          );

          return {
            facetQueryId: facetObj.facetQueryId,
            queryBudget: facetObj.queryBudget,
            rateCount,
          };
        }),
      );

      const excedeedRateCountReports = rateCountsReports.filter((report) => {
        return report.rateCount > report.queryBudget;
      });

      if (excedeedRateCountReports?.length > 0) {
        const rateLimiterErrorResponse = buildRateLimitResponse(
          excedeedRateCountReports,
        );

        return new Response(JSON.stringify(rateLimiterErrorResponse), {
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

    // TODO: make sure extracted queries identifiers are all public
    // if one of the name in extractedQueries doesn't belong public
    // then it requires authorization

    const requiresAuthorization = extractedQueries.some((query) => {
      return !hydraConfig.publicQueries.some((publicQuery) => {
        return publicQuery.name === query;
      });
    });

    if (!requiresAuthorization) {
      cacheKey = await generateGraphQLCacheKey({
        query: requestBody?.query,
        variables,
      });
    } else if (requiresAuthorization && authorization) {
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
          return new Response(JSON.stringify(unauthorizedResponse), {
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
          },
        },
      );
    }
  }

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

    console.log(JSON.stringify(newRequestPayload, null, 2));

    payload = await GraphQLHandler(newRequest, env, ctx);

    if (isMutation) {
      const { data } = await payload.clone().json();
      const aggregatedIds = aggregateTypesWithIds(data);
      const allKeys = await kvNamespace.list();
      const keysToDelete = [];

      // get user from request
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

      const { ["payload"]: tokenPayload } = await checkTokenValidness(
        authorization,
        {
          adhoc: sanitizedJwks,
        },
      );

      if (tokenPayload) {
        userId = tokenPayload?.sub;
      }

      cacheKey = await generateGraphQLCacheKey({
        query: requestBody?.query,
        userId,
        variables: JSON.stringify(requestBody?.variables),
      });

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
        ts: new Date().toISOString(),
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
          ts: new Date().toISOString(),
        },
      });
    });
    await Promise.all(promises);
  }

  // const streamData: any = await readStream(payload?.body?.getReader());
  // removing __typename from response prevents cache invalidation with urql, disable for now
  // const finalPayload = removeTypename(JSON.parse(streamData));

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "x-hydra-rate-budget": String(remainingRateBudget),
      "x-hydra-rate-threshold": String(defaultRateLimitingBudget),
    },
  });;
};
