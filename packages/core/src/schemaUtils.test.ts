import { INPUT_BLOCK_REGEXP } from "./federation/constants";
import {
  extractTypesBlocks,
  extractGenericBlockPayload,
  extractDirectiveLines,
  unifyGraphQLSchemasObjects,
  buildGraphQLSchemaSDL,
  extractScalarLines,
  addTypenameKeywordToSchema,
} from "./schemaUtils";

describe("Should import types primitives from schema", () => {
  it("extract blocks types", () => {
    const schema = `
        type Query {
            health: Health
        }
        type Health {
            status: String
        }
    `;

    const expected = [
      `type Query {
            health: Health
        }`,
      `type Health {
            status: String
        }`,
    ];

    expect(extractTypesBlocks(schema)).toEqual(expected);
  });

  describe("Should import types payload as object from schema", () => {
    it("extract block type as object", () => {
      const block = `
        type Query {
            health: Health
        }
    `;

      const expected = {
        name: "Query",
        fields: [
          {
            args: [],
            name: "health",
            type: "Health",
          },
        ],
      };

      expect(extractGenericBlockPayload(block)).toEqual(expected);
    });

    it("extract block type as object with args", () => {
      const block = `
        type Mutation {
            login(username: String!, password: String!): LoginResponse
        }
    `;

      const expected = {
        name: "Mutation",
        fields: [
          {
            name: "login",
            type: "LoginResponse",
            args: [
              {
                name: "username",
                type: "String!",
              },
              {
                name: "password",
                type: "String!",
              },
            ],
          },
        ],
      };

      expect(extractGenericBlockPayload(block)).toEqual(expected);
    });

    // query with three resolvers
    it("extract block type as object with three resolvers", () => {
      const block = `
            type Query {
            health: Health
            user: User
            users: [User]
            }
        `;

      const expected = {
        name: "Query",
        fields: [
          {
            args: [],
            name: "health",
            type: "Health",
          },
          {
            args: [],
            name: "user",
            type: "User",
          },
          {
            args: [],
            name: "users",
            type: "[User]",
          },
        ],
      };

      expect(extractGenericBlockPayload(block)).toEqual(expected);
    });
  });

  describe("Should extract input from schema", () => {
    it("extract input block type as object", () => {
      const block = `
            input LoginInput {
                username: String!
                password: String!
            }
        `;

      const expected = {
        name: "LoginInput",
        fields: [
          {
            name: "username",
            type: "String!",
            args: [],
          },
          {
            name: "password",
            type: "String!",
            args: [],
          },
        ],
      };
      expect(extractGenericBlockPayload(block, INPUT_BLOCK_REGEXP)).toEqual(
        expected
      );
    });
  });
});

describe("Should import types directives from schema", () => {
  it("extract lines", () => {
    const schemaWithDirectives = `
        directive @accessControl(scopes: [String], target: String) on FIELD_DEFINITION
        `;
    const lines = extractDirectiveLines(schemaWithDirectives);
    expect(lines).toEqual([
      {
        directiveLine:
          "directive @accessControl(scopes: [String], target: String) on FIELD_DEFINITION",
        directiveName: "@accessControl",
      },
    ]);
  });

  describe("Should import Scalar from schema", () => {
    it("extract scalar", () => {
      const schemaWithScalar = `scalar Date`;
      const lines = extractScalarLines(schemaWithScalar);
      expect(lines).toEqual([
        {
          scalarLine: "scalar Date",
          scalarName: "Date",
        },
      ]);
    });
  });
});

describe("Should unify schemas as SchemaConfig", () => {
  it("unify schemas with query", () => {
    const schema1 = `
            type Query {
                health: Health
            }
            type Health {
                status: String
            }
        `;
    const schema2 = `
            type Query {
                user: User
            }
            type User {
                name: String
            }
        `;
    const schemas = [schema1, schema2];
    const unifiedSchema = unifyGraphQLSchemasObjects(schemas);

    expect(unifiedSchema).toEqual({
      types: [
        {
          name: "Health",
          fields: [
            {
              args: [],
              name: "status",
              type: "String",
            },
          ],
        },
        {
          name: "User",
          fields: [
            {
              args: [],
              name: "name",
              type: "String",
            },
          ],
        },
        {
          name: "Query",
          fields: [
            {
              args: [],
              name: "health",
              type: "Health",
            },
            {
              args: [],
              name: "user",
              type: "User",
            },
          ],
        },
        {
          name: "Mutation",
          fields: [],
        },
      ],
      inputs: [],
      directives: [],
      scalars: [],
    });
  });

  it("unify schemas with query/mutation", () => {
    const schema1 = `
            type Query {
                health: Health
            }
            type Health {
                status: String
            }
        `;
    const schema2 = `
            type Mutation {
                login(username: String!, password: String!): LoginResponse
            }
            type LoginResponse {
                token: String
            }
        `;
    const schemas = [schema1, schema2];
    const unifiedSchema = unifyGraphQLSchemasObjects(schemas);

    expect(unifiedSchema).toEqual({
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
          name: "Query",
          fields: [
            {
              name: "health",
              args: [],
              type: "Health",
            },
          ],
        },
        {
          name: "Mutation",
          fields: [
            {
              name: "login",
              args: [
                {
                  name: "username",
                  type: "String!",
                },
                {
                  name: "password",
                  type: "String!",
                },
              ],
              type: "LoginResponse",
            },
          ],
        },
      ],
      inputs: [],
      directives: [],
      scalars: [],
    });
  });

  it("unify schemas with query/mutation/inputs/directives", () => {
    const schema1 = `
            type Query {
                health: Health
            }
            type Mutation {
                saveTodo(meta: SaveTodoInput): SaveTodoResponse
            }
            type Health {
                status: String
            }

            input SaveTodoInput {
                name: String!
            }

            type SaveTodoResponse {
                id: String
            }

        `;
    const schema2 = `
            type Mutation {
                login(username: String!, password: String!): LoginResponse
            }
            type LoginResponse {
                token: String
            }
        `;
    const schema3 = `
            input LoginInput {
                username: String!
                password: String!
            }
        `;
    const schema4 = `
            directive @accessControl(scopes: [String], target: String) on FIELD_DEFINITION
        `;
    const schemas = [schema1, schema2, schema3, schema4];
    const unifiedSchema = unifyGraphQLSchemasObjects(schemas);

    expect(unifiedSchema).toEqual({
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
          name: "SaveTodoResponse",
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
          name: "Query",
          fields: [
            {
              name: "health",
              args: [],
              type: "Health",
            },
          ],
        },
        {
          name: "Mutation",
          fields: [
            {
              name: "saveTodo",
              args: [
                {
                  name: "meta",
                  type: "SaveTodoInput",
                },
              ],
              type: "SaveTodoResponse",
            },
            {
              name: "login",
              args: [
                {
                  name: "username",
                  type: "String!",
                },
                {
                  name: "password",
                  type: "String!",
                },
              ],
              type: "LoginResponse",
            },
          ],
        },
      ],
      inputs: [
        {
          name: "SaveTodoInput",
          fields: [
            {
              name: "name",
              args: [],
              type: "String!",
            },
          ],
        },
        {
          name: "LoginInput",
          fields: [
            {
              name: "username",
              args: [],
              type: "String!",
            },
            {
              name: "password",
              args: [],
              type: "String!",
            },
          ],
        },
      ],
      directives: [
        {
          directiveName: "@accessControl",
          directiveLine:
            "directive @accessControl(scopes: [String], target: String) on FIELD_DEFINITION",
        },
      ],
      scalars: [],
    });
  });
});

describe("SDL generation from SchemaConfig", () => {
  it("generate SDL from SchemaConfig", () => {
    const schema1 = `
    type Query {
        health: Health
    }
    type Mutation {
        saveTodo(meta: SaveTodoInput): SaveTodoResponse
    }
    type Health {
        status: String
    }

    input SaveTodoInput {
        name: String!
    }

    type SaveTodoResponse {
        id: String
    }

`;
    const schema2 = `
    type Mutation {
        login(username: String!, password: String!): LoginResponse
    }
    type LoginResponse {
        token: String
    }
`;
    const schema3 = `
    input LoginInput {
        username: String!
        password: String!
    }
`;
    const schema4 = `
    directive @accessControl(scopes: [String], target: String) on FIELD_DEFINITION
`;
    const schemas = [schema1, schema2, schema3, schema4];
    const unifiedSchema = unifyGraphQLSchemasObjects(schemas);
    const unifiedSdl = buildGraphQLSchemaSDL(unifiedSchema);

    const expectedSdl = `type Health {
status: String
}

type SaveTodoResponse {
id: String
}

type LoginResponse {
token: String
}

type Query {
health: Health
}

type Mutation {
saveTodo(meta: SaveTodoInput): SaveTodoResponse
login(username: String!, password: String!): LoginResponse
}

input SaveTodoInput {
name: String!
}

input LoginInput {
username: String!
password: String!
}

directive @accessControl(scopes: [String], target: String) on FIELD_DEFINITION`;

    expect(unifiedSdl).toEqual(expectedSdl);
  });

  it("unifies schemas with query/mutation/inputs/directives and duplicated input types", () => {
    const schema1 = `
        type Query {
            health: Health
        }

        type Health {
            status: String
        }
    `;

    const schema2 = `
        type Query {
            health: Health
            user: User
        }

        type Health {
            status: String
        }

        type User {
            name: String
        }
    `;

    const schemas = [schema1, schema2];

    const unifiedSchema = unifyGraphQLSchemasObjects(schemas);

    expect(unifiedSchema).toEqual({
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
          name: "User",
          fields: [
            {
              name: "name",
              args: [],
              type: "String",
            },
          ],
        },
        {
          name: "Query",
          fields: [
            {
              name: "health",
              args: [],
              type: "Health",
            },
            {
              name: "user",
              args: [],
              type: "User",
            },
          ],
        },
        {
          name: "Mutation",
          fields: [],
        },
      ],
      inputs: [],
      directives: [],
      scalars: [],
    });

    const unifiedSdl = buildGraphQLSchemaSDL(unifiedSchema);

    const expectedSdl = `type Health {
status: String
}

type User {
name: String
}

type Query {
health: Health
user: User
}

type Mutation {

}
`;

    expect(unifiedSdl).toEqual(expectedSdl);
  });

  it("generate schema with scalars", () => {
    const schema1 = `
    type Query {
        health: Health
    }

    type Health {
        status: String
    }
    scalar Date
    `;

    const schema2 = `
    scalar Date
    `;

    const schemas = [schema1, schema2];

    const unifiedSchema = unifyGraphQLSchemasObjects(schemas);

    const unifiedSdl = buildGraphQLSchemaSDL(unifiedSchema);

    const expectedSdl = `type Health {
status: String
}

type Query {
health: Health
}

type Mutation {

}

scalar Date`;

    expect(unifiedSdl).toEqual(expectedSdl);
  });
});

describe("Should inject __typename to queries if missing", () => {
  it("generate schema with __typename keyword", () => {
    const mutation1 = `mutation {
      hydraDev {
        id
        name
        child {
          id
          childname
        }
      }
    }`;

    const generated1 = addTypenameKeywordToSchema(mutation1);

    const expected1 = `mutation {
      hydraDev {
        id
        name
        child {
        __typename
        id
        childname
        }
        __typename
      }
    }`;

    expect(generated1).toEqual(expected1);
  });

  it("doesn't generate schema with __typename keyword if already present", () => {
    const mutation1 = `mutation {
      hydraDev {
        id
        name
        child {
          __typename
          id
          childname
        }
      }
    }`;

    const generated1 = addTypenameKeywordToSchema(mutation1);

    const expected1 = `mutation {
      hydraDev {
        id
        name
        child {
        __typename
        id
        childname
        }
        __typename
      }
    }`;
    expect(generated1).toEqual(expected1);
  });
});
