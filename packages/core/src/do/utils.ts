export const fetchRateLimiterWithFacet = async (
  req,
  rateLimiter,
  facetId,
  timestamp,
) => {
  let id = rateLimiter.idFromName(`HydraRateLimiter_${timestamp}`);
  let stub = rateLimiter.get(id);
  const url = new URL(req.url);
  url.pathname = "/increment";
  url.searchParams.set("facet", facetId);

  const modifiedRequest = new Request(url.toString(), req?.clone());
  const response = await stub.fetch(modifiedRequest);
  const rateCountBody = await response.json();
  const { value: rateCount } = rateCountBody;
  return rateCount;
};
