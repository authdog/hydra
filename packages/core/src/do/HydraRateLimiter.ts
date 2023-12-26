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
    return this.facetsMap.get(facet) || 0;
  }

  async fetch(request) {
    let url = new URL(request.url);
    let value = (await this.facetsMap.get(request.query?.facet)) || 0;

    switch (url.pathname) {
      case "/increment":
        this.incrementFacetValue(request.query?.facet);
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
