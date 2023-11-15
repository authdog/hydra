import gql from "graphql-tag";
import {
  IGraphQLSchema,
  aggregateTypesWithIds,
  extractMutationName,
  extractedAllQueryIdentifiersInRawQuery,
  findFieldsWithId,
  generateGraphQLCacheKey,
  getTypesFromPaths,
  splitAggregatedTypesWithIds,
} from "./invalidation";

describe("Should invalidate queries matching returned values from mutation", () => {
  it("extract mutation name 1", () => {
    const querySample1 = `
        mutation OperationName($meta: NewTenantInput!) {
            createTenant(meta: $meta) {
                tenant {
                    id
                }
            }
        }`;

    const extractedMutationName1 = extractMutationName(querySample1);
    expect(extractedMutationName1).toEqual("createTenant");
  });

  it("extract mutation name 2", () => {
    const querySample2 = `
        mutation OperationName($meta: NewTenantInput!) {
            saveTodo             (meta: $meta) {
                tenant {
                    id
                    name
                    owner {
                        id
                    }
                    createdAt
                }
            }
        }`;

    const extractedMutationName2 = extractMutationName(querySample2);
    expect(extractedMutationName2).toEqual("saveTodo");
  });

  it("extract invalidation blocks", () => {
    const querySample2: any = gql`
      mutation OperationName($meta: NewTenantInput!) {
        createTenant(meta: $meta) {
          tenant {
            id
            name
            owner {
              id
              customer {
                id
                sandbox {
                  slug {
                    id
                  }
                }
              }
            }
            region {
              id
            }
            createdAt
          }
        }
      }
    `;

    const mutationBlock =
      querySample2?.definitions?.[0]?.selectionSet?.selections?.[0];
    const mutationName = mutationBlock?.name?.value; // saveTodo
    const mutationNameSelectionSet = mutationBlock?.selectionSet;

    const selectionsWithIds = findFieldsWithId(
      mutationName,
      mutationNameSelectionSet,
      [],
      "",
      mutationName,
    );

    expect(selectionsWithIds).toStrictEqual([
      "createTenant.tenant",
      "createTenant.tenant.owner",
      "createTenant.tenant.owner.customer",
      "createTenant.tenant.owner.customer.sandbox.slug",
      "createTenant.tenant.region",
    ]);
  });

  it("map paths to types", () => {
    const pathsGraph = [
      "createTenant.tenant",
      "createTenant.tenant.owner",
      "createTenant.tenant.owner.customer",
      "createTenant.tenant.region",
    ];

    const schema1: IGraphQLSchema = {
      types: [
        {
          name: "Health",
          fields: [
            {
              name: "status",
              args: [],
              type: "String",
            },
          ],
        },
        {
          name: "Tenant",
          fields: [
            {
              name: "id",
              args: [],
              type: "String",
            },
            {
              name: "name",
              args: [],
              type: "String",
            },
            {
              name: "owner",
              args: [],
              type: "User",
            },
            {
              name: "region",
              args: [],
              type: "Region",
            },
            {
              name: "createdAt",
              args: [],
              type: "String",
            },
          ],
        },
        {
          name: "User",
          fields: [
            {
              name: "id",
              args: [],
              type: "String",
            },
            {
              name: "customer",
              args: [],
              type: "Customer",
            },
          ],
        },
        {
          name: "Region",
          fields: [
            {
              name: "id",
              args: [],
              type: "String",
            },
          ],
        },
        {
          name: "Customer",
          fields: [
            {
              name: "id",
              args: [],
              type: "String",
            },
          ],
        },
        {
          name: "LoginResponse",
          fields: [
            {
              name: "token",
              args: [],
              type: "String",
            },
          ],
        },
        {
          name: "CreateTenantResponse",
          fields: [
            {
              name: "tenant",
              args: [],
              type: "Tenant",
            },
          ],
        },
        {
          name: "Mutation",
          fields: [
            {
              name: "createTenant",
              args: [
                {
                  name: "meta",
                  type: "NewTenantInput!",
                },
              ],
              type: "CreateTenantResponse",
            },
          ],
        },
      ],
      inputs: [],
      directives: [],
      scalars: [],
    };

    const generatedTypes = getTypesFromPaths(pathsGraph, schema1);
    expect(generatedTypes).toStrictEqual([
      "Tenant",
      "User",
      "Customer",
      "Region",
    ]);
  });

  it("generates cache keys", async () => {
    const generatedKey1 = await generateGraphQLCacheKey({
      query: `{
          id
          name
          owner {
              id
          }
          createdAt
      }`,
    });

    // expect(generatedKey1).toStrictEqual(
    //   "q:e30a7f6c96de2c2ab6b1b581b4e94fc301cc9896156510db657ecbb45d04ed8f"
    // );

    // check if generatedKey1 includes q: prefix and no u:
    expect(generatedKey1).toContain("q:");

    const generatedKey2 = await generateGraphQLCacheKey({
      query: `{
          id
          name
          owner {
              id
              customer {
                  id
              }
          }
          tenant {
            id
            region {
              id
              sandbox {
                id
              }
            }
          }
          createdAt
      }`,
    });

    // expect(generatedKey2).toStrictEqual(
    //   "q:f83d711dff470d5866624a2d3ed921ea4d27c724e2df09c3bd935cde9e7b130e"
    // );

    expect(generatedKey2).toContain("q:");
    // to match regular expression q: + 64 characters
    // expect(generatedKey2).toMatch(/q:[a-zA-Z0-9\=]{64}/);

    const generatedKey3 = await generateGraphQLCacheKey({
      query: `{
          id
          name
          owner {
              id
              customer {
                  id
              }
          }
          tenant {
            id
            region {
              id
              sandbox {
                id
                container
              }
            }
          }
          createdAt
      }`,
      userId: "2c96e8bc-c9a0-4a17-a718-5a8caf042af3",
    });

    // expect(generatedKey3).toStrictEqual(
    //   "u:167a91a84c13ba21c3581e6331e9d315460ccdab1b4b9a4ef12b222c128b14ac_q:37bdc424ca071441ceb316f13d945090b1a1e6976666225b7b9d18b9a7bdd87b"
    // );
    expect(generatedKey3).toContain("u:");
    expect(generatedKey3).toContain("q:");

    const generatedKey4WithParams = await generateGraphQLCacheKey({
      query: `query GetTenant($id: String!) {
        tenant(id: $id) {
          id
          name
          owner {
              id
              customer {
                  id
              }
          }
          tenant {
            id
            region {
              id
              sandbox {
                id
                container
              }
            }
          }
          createdAt
      }`,
      variables: {
        id: "2c96e8bc-c9a0-4a17-a718-5a8caf042af3",
      },
    });

    expect(generatedKey4WithParams).toContain("v:");
    expect(generatedKey4WithParams).toContain("q:");

    // expect(generatedKey4WithParams).toContain("u:")
  });

  it("aggregates types and ids from data payload", async () => {
    const data = {
      tenantApplications: {
        applications: [
          {
            id: "8ea0d08c-23fb-4b21-b7bd-54cdcc3fc272",
            name: "Test App",
            description: "",
            createdAt: 1697409680409,
            environments: [
              {
                id: "1dbc3650-de93-4ae8-b315-414bb04f997b",
                name: "dev",
                weight: 0,
                __typename: "ApplicationEnvironment",
              },
              {
                id: "81dd4cda-0e54-45de-b2e4-aeda918bf177",
                name: "prod",
                weight: 2,
                __typename: "ApplicationEnvironment",
              },
            ],
            __typename: "Application",
          },
          {
            id: "8de7a794-8f38-4e3e-8c3b-d7f7d1bde465",
            name: "Console",
            description: "Authdog Cloud Console web application",
            createdAt: 1677683558938,
            environments: [
              {
                id: "814b7faa-0a5c-405d-a4fc-45b82c93f051",
                name: "dev",
                weight: 0,
                __typename: "ApplicationEnvironment",
              },
              {
                id: "3831c9fc-9376-48f7-a375-7d348b3a6a28",
                name: "stage",
                weight: 1,
                __typename: "ApplicationEnvironment",
              },
              {
                id: "ed89ef1e-2e76-4674-8272-5634064ae293",
                name: "prod",
                weight: 2,
                __typename: "ApplicationEnvironment",
              },
            ],
            __typename: "Application",
          },
        ],
        tenant: {
          id: "4323e3a7-27bd-498f-b9c5-460dda25e523",
          __typename: "Tenant",
        },
        meta: {
          ok: {
            message: "Success",
            code: 200,
            __typename: "QueryMetaSuccess",
          },
          error: null,
          __typename: "QueryMeta",
        },
        __typename: "TenantApplicationsResponse",
      },
    };

    const aggregatedPayload = aggregateTypesWithIds(data);

    expect(aggregatedPayload).toStrictEqual([
      {
        name: "Application",
        ids: [
          "8ea0d08c-23fb-4b21-b7bd-54cdcc3fc272",
          "8de7a794-8f38-4e3e-8c3b-d7f7d1bde465",
        ],
      },
      {
        name: "ApplicationEnvironment",
        ids: [
          "1dbc3650-de93-4ae8-b315-414bb04f997b",
          "81dd4cda-0e54-45de-b2e4-aeda918bf177",
          "814b7faa-0a5c-405d-a4fc-45b82c93f051",
          "3831c9fc-9376-48f7-a375-7d348b3a6a28",
          "ed89ef1e-2e76-4674-8272-5634064ae293",
        ],
      },
      { name: "Tenant", ids: ["4323e3a7-27bd-498f-b9c5-460dda25e523"] },
    ]);
  });

  it("split aggregation into chunks", async () => {
    const aggregated = [
      {
        name: "Application",
        ids: [
          "8ea0d08c-23fb-4b21-b7bd-54cdcc3fc272",
          "8de7a794-8f38-4e3e-8c3b-d7f7d1bde465",
        ],
      },
      {
        name: "ApplicationEnvironment",
        ids: [
          "1dbc3650-de93-4ae8-b315-414bb04f997b",
          "81dd4cda-0e54-45de-b2e4-aeda918bf177",
          "814b7faa-0a5c-405d-a4fc-45b82c93f051",
          "3831c9fc-9376-48f7-a375-7d348b3a6a28",
          "ed89ef1e-2e76-4674-8272-5634064ae293",
          "ed89ef1e-2e76-4674-8272-5634064ae294",
          "ed89ef1e-2e76-4674-8272-5634064ae295",
          "ed89ef1e-2e76-4674-8272-5634064ae296",
          "ed89ef1e-2e76-4674-8272-5634064ae297",
          "ed89ef1e-2e76-4674-8272-5634064ae298",
          "ed89ef1e-2e76-4674-8272-5634064ae299",
          "3831c9fc-9376-48f7-a375-7d348b3a6a28",
          "ed89ef1e-2e76-4674-8272-5634064ae293",
          "ed89ef1e-2e76-4674-8272-5634064ae294",
          "ed89ef1e-2e76-4674-8272-5634064ae295",
          "ed89ef1e-2e76-4674-8272-5634064ae296",
          "ed89ef1e-2e76-4674-8272-5634064ae297",
          "ed89ef1e-2e76-4674-8272-5634064ae298",
          "ed89ef1e-2e76-4674-8272-5634064ae299",
        ],
      },
      { name: "Tenant", ids: ["4323e3a7-27bd-498f-b9c5-460dda25e523"] },
    ];

    const chunks = splitAggregatedTypesWithIds(aggregated, 5);

    expect(chunks.length).toStrictEqual(5);
  });
});

describe("Should extract queries selection", () => {
  it("should extract queries selection [health]", () => {
    const example1 = `{
      health
    }`;
    expect(extractedAllQueryIdentifiersInRawQuery(example1)).toStrictEqual([
      "health",
    ]);
  });

  it("should extract queries selection [health, tenant]", () => {
    const example1 = `{
      health
      tenant(id: "123") {
        id
      }

    }`;
    expect(extractedAllQueryIdentifiersInRawQuery(example1)).toStrictEqual([
      "health",
      "tenant",
    ]);
  });
});
