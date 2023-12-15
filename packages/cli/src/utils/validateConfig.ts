import { ZodError, z } from "zod";

interface IHydraConfig {
  schemas: {
    id: string;
    uri: string;
  }[];
  rateLimiting?: {
    default: {
      budget: number;
    };
  };
  publicQueries?: {
    name: string;
  }[];
  jwksUri: string;
}

const remoteGraphQLSchemaSchema = z.object({
  id: z.string(),
  uri: z.string().url(),
});

const schemasSchema = z.array(remoteGraphQLSchemaSchema);

const rateLimitingSchema = z.object({
  default: z.object({
    budget: z.number(),
  }),
});

const publicQuerySchema = z.object({
  name: z.string(),
});

const hydraConfigSchema = z.object({
  schemas: schemasSchema,
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
    }
    throw error;
  }
};
