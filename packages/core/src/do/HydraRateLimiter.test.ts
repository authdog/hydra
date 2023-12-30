import { HydraRateLimiter } from "./HydraRateLimiter"; // Update the import path as needed

describe("HydraRateLimiter", () => {
  let rateLimiter: HydraRateLimiter;

  beforeEach(() => {
    rateLimiter = new HydraRateLimiter();
  });

  it("should increment facet value correctly", () => {
    const facet = "test_facet";

    rateLimiter.incrementFacetValue(facet);
    rateLimiter.incrementFacetValue(facet);

    const value = rateLimiter.getFacetValue(facet);
    expect(value).toBe(2);
  });

  it("should return default value for non-existing facet", () => {
    const facet = "non_existing_facet";

    const value = rateLimiter.getFacetValue(facet);
    expect(value).toBe(0);
  });

  it("should handle fetching based on endpoint path", async () => {
    const incrementRequest = {
      url: "http://localhost:3566/increment?facet=test_facet",
      /* Add other necessary request properties as needed */
    };

    const defaultRequest = {
      url: "http://localhost:3566/default",
      /* Add other necessary request properties as needed */
    };

    const incrementResponse = await rateLimiter.fetch(incrementRequest);
    expect(incrementResponse.status).toBe(200);

    const defaultValue = await rateLimiter.fetch(defaultRequest);
    expect(defaultValue.status).toBe(404);
  });
});
