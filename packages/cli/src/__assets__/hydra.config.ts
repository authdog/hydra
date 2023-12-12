const HydraConfig = {
    rateLimiting: {
      default: {
        budget: 100,
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

export default HydraConfig;