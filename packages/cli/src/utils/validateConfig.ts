import { z } from "zod";
import { IHydraConfig } from "@authdog/hydra-core";

const rateLimitingUnitSchema = z.enum(["minute", "hour"]);

const remoteGraphQLSchemaSchema = z.object({
  id: z.string(),
  uri: z.string().url(),
});

const schemasSchema = z.array(remoteGraphQLSchemaSchema);

const rateLimitingSchema = z.object({
  default: z.object({
    budget: z.number(),
    unit: rateLimitingUnitSchema.optional(),
  }),
  queries: z
    .array(
      z.object({
        id: z.string(),
        budget: z.number(),
        unit: rateLimitingUnitSchema.optional(),
      }),
    )
    .optional(),
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
    return hydraConfigSchema.parse(config);
  } catch (error) {
    throw error;
  }
};
