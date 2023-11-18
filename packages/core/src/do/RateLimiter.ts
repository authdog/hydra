import { createDurable } from "itty-durable";

export class RateLimiter extends createDurable({
  autoReturn: true,
  autoPersist: false,
}) {
  facetsMap = new Map<string, number>();
  constructor(state, env) {
    super(state, env);
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
}
