export interface IHydraConfig {
  schemas: {
    id: string;
    uri: string;
  }[];
  rateLimiting?: {
    default: {
      budget: number;
    };
    queries?: {
      id: string;
      budget: number;
    }[];
  };
  publicQueries?: {
    name: string;
  }[];
  jwksUri: string;
}
