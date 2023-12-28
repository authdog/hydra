type RateLimitingUnit = "minute" | "hour";

export interface IHydraConfig {
    schemas: {
      id: string;
      uri: string;
    }[];
    rateLimiting?: {
      default: {
        budget: number;
        unit?: RateLimitingUnit
      };
      queries?: {
        id: string;
        budget: number;
        unit?: RateLimitingUnit
      }[];
    };
    publicQueries?: {
      name: string;
    }[];
    jwksUri: string;
  }