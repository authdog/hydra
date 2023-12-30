import {
  DEFAULT_DO_FACET_QUERY_PARAM,
  INCREMENT_FACET_DO_ENDPOINT,
} from "../constants";

export const fetchRateLimiterWithFacet = async (
  req: Request,
  rateLimiter: any, // DurableObjectNamespace
  facetId: string,
  timestamp: string,
) => {
  let id = rateLimiter.idFromName(`HydraRateLimiter_${timestamp}`);
  let stub = rateLimiter.get(id);
  const url = new URL(req.url);
  url.pathname = INCREMENT_FACET_DO_ENDPOINT;
  url.searchParams.set(DEFAULT_DO_FACET_QUERY_PARAM, facetId);

  const modifiedRequest = new Request(url.toString(), req?.clone());
  const response = await stub.fetch(modifiedRequest);
  const rateCountBody = await response.json();
  const { value: rateCount } = rateCountBody;
  return rateCount;
};
