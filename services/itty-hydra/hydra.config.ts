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
    {
      id: "notification",
      uri: "https://notif.auth.dog/.netlify/functions/graphql",
    },
  ],
  rateLimiting: {
    default: {
      budget: 20,
    },
    queries: [
      {
        id: "health",
        budget: 5,
      },
      {
        id: "hydraDevQuery",
        budget: 15,
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
    {
      name: "applicationEnvironment",
    },
    // {
    //   name: "getEnvJwks"
    // },
    // {
    //   name: "jwksPayload"
    // }
  ],
  jwksUri: "https://id.authdog.com/oidc/.well-known/jwks.json",
};
