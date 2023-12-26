export const HydraConfigAcme = {
  schemas: [
    {
      id: "mgt",
      uri: "https://mgt.auth.dog/graphql",
    },
    {
      id: "authz",
      uri: "https://authz.auth.dog/graphql",
    },
  ],
  rateLimiting: {
    default: {
      budget: 20,
    },
  },
  publicQueries: [
    {
      name: "health",
    },
    {
      name: "hydraDevQuery",
    },
  ],
  jwksUri: "https://id.authdog.com/oidc/.well-known/jwks.json",
};
