const HydraConfig = {
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
      budget: 100,
      unit: "minute",
    },
    queries: [
      {
        id: "health",
        budget: 5,
      },
      {
        id: "hydraDevQuery",
        budget: 50,
      },
    ],
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

module.exports.default = HydraConfig;
