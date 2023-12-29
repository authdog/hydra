export class HydraRateLimiter {
  private facetsMap: Map<string, number>;

  constructor() {
    this.facetsMap = new Map<string, number>();
  }

  onLoad(): Promise<void> {
    return Promise.resolve();
  }

  incrementFacetValue(facet: string) {
    this.facetsMap.set(facet, (this.facetsMap.get(facet) || 0) + 1);
  }

  getFacetValue(facet: string) {
    console.log("facetId", facet);
    return this.facetsMap.get(facet) || 0;
  }

  async fetch(request) {
    let url = new URL(request.url);

    // request.url http://localhost:3566/increment?facet=localhost_health
    // extract facet from url
    const facet = url.searchParams.get("facet");

    let value = (await this.facetsMap.get(facet) || 0);

    switch (url.pathname) {
      case "/increment":
        this.incrementFacetValue(facet);
        break;
      case "/get":
        break;
      default:
        return new Response("Not found", { status: 404 });
    }

    return new Response(JSON.stringify({ value }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }
}
