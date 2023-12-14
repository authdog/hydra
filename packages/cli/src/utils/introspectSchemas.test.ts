/* global jest, describe, it, expect */

import { introspectRemoteSchema } from './introspectSchemas'; // Update with the correct file path

describe('introspectSchemas function', () => {
  const schemas = [
    {
      id: 'mgt',
      uri: 'https://mgt.auth.dog/graphql',
    },
    {
      id: 'authz',
      uri: 'https://authz.auth.dog/graphql',
    },
  ];

  it('should validate a valid config object without throwing errors', async () => {
    await Promise.all(
      schemas.map(async (schema) => {
        await expect(introspectRemoteSchema(schema.uri)).resolves.not.toThrow();
      })
    );
  });
});
