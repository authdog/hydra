import {ZodError, z} from "zod";

/*
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

*/

interface IHydraConfig {
    rateLimiting?: {
        default: {
            budget: number;
        }
    },
    publicQueries?: {
        name: string;
    }[],
    jwksUri: string;
}

const rateLimitingSchema = z.object({
    default: z.object({
      budget: z.number(),
    }),
  });
  
  const publicQuerySchema = z.object({
    name: z.string(),
  });
  
  const hydraConfigSchema = z.object({
    rateLimiting: rateLimitingSchema.optional(),
    publicQueries: z.array(publicQuerySchema).optional(),
    jwksUri: z.string(),
  });
  
  export const validateConfig = (config: IHydraConfig): IHydraConfig => {
    try {
      // Validate the provided config object against the Zod schema
      const validatedConfig = hydraConfigSchema.parse(config);
      return validatedConfig;
    } catch (error) {
      if (error instanceof ZodError) {
        // Handle validation errors here
        console.error("Validation error:", error.errors);
        // You might want to throw an error or handle it accordingly based on your application's needs
      }
      // Throw the error if it's not a ZodError (unexpected error)
      throw error;
    }
  };