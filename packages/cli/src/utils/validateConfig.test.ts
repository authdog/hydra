/* global jest, describe, it, expect */
import { validateConfig } from "./validateConfig"; // Update with the correct file path

describe("validateConfig function", () => {
  const validConfig: any = {
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

  const invalidConfig: any = {
    rateLimiting: {
      default: {
        budget: "not a number",
      },
    },
    publicQueries: [
      {
        name: "health",
      },
      {
        name: 123, // invalid type
      },
    ],
    jwksUri: "invalid uri", // invalid URL format
  };

  const missingSchemasConfig: any = {
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

  it("should validate a valid config object without throwing errors", () => {
    expect(() => validateConfig(validConfig)).not.toThrow();
  });

  it("should throw a ZodError for an invalid config object", () => {
    expect(() => validateConfig(invalidConfig)).toThrow();
  });

  it("should throw a ZodError for a config object missing the schemas property", () => {
    expect(() => validateConfig(missingSchemasConfig)).toThrow();
  });


  const validConfigWithCustomRateLimitingBudget: any = {
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
      },
      health: {
        budget: 5,
        unit: "minute",
      }
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

  it("should validate a valid config object with custom rate limiting budgets without throwing errors", () => {
    expect(() => validateConfig(validConfigWithCustomRateLimitingBudget)).not.toThrow();
  });



  // it("should log validation errors to the console for an invalid config object", () => {
  //   const consoleErrorSpy = jest.spyOn(console, "error");
  //   consoleErrorSpy.mockImplementation(() => {}); // Mock console.error to do nothing

  //   try {
  //     validateConfig(invalidConfig);
  //   } catch (error) {
  //     expect(consoleErrorSpy).toHaveBeenCalled();
  //   }

  //   consoleErrorSpy.mockRestore(); // Restore console.error
  // });
});
