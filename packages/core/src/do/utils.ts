export const fetchWithRateLimiter = async (
  req: Request,
  rateLimiter,
  facetId: string,
) => {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  let id = rateLimiter.idFromName(`HydraRateLimiter_${timestamp}`);
  let stub = rateLimiter.get(id);

  const url = new URL(req.url);
  url.pathname = "/increment";
  url.searchParams.set("facet", facetId);

  const modifiedRequest = new Request(url.toString(), req);
  const response = await stub.fetch(modifiedRequest);
  return await response.json();
};
