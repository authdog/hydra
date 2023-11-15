const gql = require("graphql-tag");

export interface IGraphQLSchema {
  types: {
    name: string;
    fields: {
      name: string;
      args: {
        name: string;
        type: string;
      }[];
      type: string;
    }[];
  }[];
  inputs: any[];
  directives: any[];
  scalars: any[];
}

interface IGenerateGraphQLCacheKey {
  query: string;
  userId?: string;
  variables?: any;
}

interface IAgregateTypesWithIds {
  name: string;
  ids: string[];
}

export const extractMutationName = (inputString: string): string | null => {
  const regex = /{([^}]*)}/;
  const matches = inputString.match(regex);
  if (matches && matches.length >= 2) {
    const textInsideBraces = matches[1]?.trim();
    const firstWord = textInsideBraces?.match(/\b\w+\b/);
    if (firstWord && firstWord.length > 0) {
      return firstWord[0];
    }
  }
  return null;
};

// export const invalidateCache = () => {
//   // will remove the keys containing any of the following keys passed as parameter

//   return;
// };

export const extractInvalidationBlocksFromQuery = (
  input: string,
  id: string = "id",
): string[] => {
  const regex = /{[^{}]+?(?=\n\s*})/g;
  const matches = input.match(regex) || [];
  const result: string[] = [];

  matches.forEach((match) => {
    // @ts-ignore: investigate why match is never
    if (match.includes(id)) {
      result.push(match);
    }
  });

  return result;
};

interface PathResult {
  paths: string[];
  result: string[];
}

export const mapPathsToTypes = (
  schema: IGraphQLSchema,
  pathResult: PathResult,
  mutationId: string,
): Record<string, string> => {
  const mutationField = schema.types
    .find((type) => type.name === "Mutation")
    ?.fields.find((field) => field.name === mutationId);

  if (!mutationField) {
    throw new Error("Mutation field not found in the schema");
  }

  const result: Record<string, string> = {};

  pathResult.paths.forEach((path, index) => {
    const currentPath = path.split(".");
    let currentType = mutationField.type;

    currentPath.forEach((p) => {
      const currentField = schema.types
        .find((type) => type.name === currentType)
        ?.fields.find((field) => field.name === p);
      if (!currentField) {
        throw new Error(
          `Field ${p} not found in the schema for type ${currentType}`,
        );
      }
      currentType = currentField.type;
    });

    result[path] = currentType;
  });

  return result;
};

export const findFieldsWithId = (
  selectionParent: string,
  selectionSet: any,
  //   result: string[] = [],
  paths: string[] = [],
  currentPath: string = "",
  mutationId: string = "",
) => {
  selectionSet.selections.forEach(
    (selection: {
      selectionSet: { selections: any[] };
      name: { value: string };
    }) => {
      // if (selection.kind === "Field" && selection.name.value === "id") {
      // //   result.push(selectionParent);
      // }
      if (selection.selectionSet) {
        // check if selectionSet has id field
        const hasIdField = selection.selectionSet.selections.find(
          (s: { kind: string; name: { value: string } }) =>
            s.kind === "Field" && s.name.value === "id",
        );

        if (hasIdField) {
          if (paths.length > 0) {
            paths.push(currentPath + "." + selection.name.value);
          } else {
            paths.push(selectionParent + "." + selection.name.value);
          }
        }

        findFieldsWithId(
          selection.name.value,
          selection.selectionSet,
          paths,
          paths.length === 0
            ? mutationId + "." + selection.name.value
            : mutationId + currentPath + "." + selection.name.value,
        );
      }
    },
  );

  return paths;
};

export const getTypesFromPaths = (
  pathsGraph: string[],
  schema: IGraphQLSchema,
): string[] => {
  const { types } = schema;
  const result: string[] = [];
  pathsGraph.forEach((path: string, index: number) => {
    const pathArr = ("Mutation." + path).split(".");
    let currentType = types.find((type) => type.name === pathArr[0]);
    if (!currentType) return;

    for (let i = 1; i < pathArr.length; i++) {
      const fieldName = pathArr[i];
      const field: any = currentType.fields.find((f) => f.name === fieldName);
      if (!field) break;
      currentType = types.find((type) => type.name === field.type);
      if (!currentType) break;
    }

    if (currentType) result.push(currentType.name);
  });

  return result;
};

export const generateGraphQLCacheKey = async ({
  query,
  userId,
  variables,
}: IGenerateGraphQLCacheKey) => {
  const crypto = require("node:crypto");
  let queryHashHex = null;
  let userIdHashHex = null;
  let variablesHashHex = null;

  if (crypto && crypto.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(query),
    );
    const hashArray = Array.from(new Uint8Array(digest));
    queryHashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const digestUserId = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(userId),
    );
    const hashArrayUserId = Array.from(new Uint8Array(digestUserId));
    userIdHashHex = hashArrayUserId
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    variablesHashHex = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(variables)),
    );
  } else {
    const sha256 = require("crypto-js/sha256");
    const Base64 = require("crypto-js/enc-base64");
    queryHashHex = Base64.stringify(sha256(query));

    if (userId) {
      userIdHashHex = Base64.stringify(sha256(userId));
    }

    if (variables) {
      variablesHashHex = Base64.stringify(sha256(JSON.stringify(variables)));
    }
  }

  const cacheKey = userId
    ? `u:${userIdHashHex}_q:${queryHashHex}_v:${variablesHashHex}`
    : `q:${queryHashHex}_v:${variablesHashHex}`;
  return cacheKey;
};

interface IResult {
  [key: string]: { id: string; name: string }[];
}

const extractTypeNamesAndIds = (obj: any, result: IResult = {}) => {
  for (let key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      if (obj[key].id && obj[key].__typename) {
        const typeName = obj[key].__typename;
        result[typeName] = result[typeName] || [];
        if (result[typeName]) {
          const item = {
            id: obj[key].id,
            name: obj[key].name,
          };
          if (Array.isArray(result[typeName])) {
            if (!!result[typeName]) {
              // @ts-ignore
              result[typeName].push(item);
            }
          }
        }
      }

      extractTypeNamesAndIds(obj[key], result);
    }
  }

  return result;
};

export const aggregateTypesWithIds = (data: any): IAgregateTypesWithIds[] => {
  const result = extractTypeNamesAndIds(data);
  const typesWithIds: IAgregateTypesWithIds[] = [];

  Object.keys(result).forEach((key) => {
    if (result[key]) {
      typesWithIds.push({
        name: key,
        ids: result[key]?.map((item) => item.id) || [],
      });
    }
  });

  return typesWithIds;
};

/*
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
        ],
      },
      { name: "Tenant", ids: ["4323e3a7-27bd-498f-b9c5-460dda25e523"] },
    ];

    will return balanced array of arrays like: 

    [[

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
          "ed89ef1e-2e76-4674-8272-5634064ae295"
        ]
      },
    ],
    [
      {
          name: "ApplicationEnvironment",
          ids: [
          "ed89ef1e-2e76-4674-8272-5634064ae296",
          "ed89ef1e-2e76-4674-8272-5634064ae297",
          "ed89ef1e-2e76-4674-8272-5634064ae298",
          "ed89ef1e-2e76-4674-8272-5634064ae299",
          "3831c9fc-9376-48f7-a375-7d348b3a6a28",
          "ed89ef1e-2e76-4674-8272-5634064ae293",
          "ed89ef1e-2e76-4674-8272-5634064ae294",
          "ed89ef1e-2e76-4674-8272-5634064ae295",
          "ed89ef1e-2e76-4674-8272-5634064ae296",
          ]
      },
      {
        name: "Tenant", ids: ["4323e3a7-27bd-498f-b9c5-460dda25e523"]
      }
    ]
  ]


    ]

*/
export const splitAggregatedTypesWithIds = (
  data: IAgregateTypesWithIds[],
  chunkSize: number = 5,
): IAgregateTypesWithIds[][] => {
  interface ITypeWithId {
    name: string;
    id: string;
  }

  let result: IAgregateTypesWithIds[][] = [];
  let currentArray: ITypeWithId[] = [];
  let currentSize = 0;

  for (let i = 0; i < data.length; i++) {
    // @ts-ignore
    for (let j = 0; data[i].ids?.length && j < data[i].ids.length; j++) {
      if (currentSize === chunkSize) {
        const aggregated: IAgregateTypesWithIds[] = [];
        currentArray.forEach((item) => {
          const found = aggregated.find((agg) => agg.name === item.name);
          if (found) {
            found.ids.push(item.id);
          } else {
            aggregated.push({
              name: item.name,
              ids: [item.id],
            });
          }
        });

        result.push(aggregated);

        // Reset currentArray and currentSize
        currentArray = [];
        currentSize = 0;
      }
      currentArray.push({
        // @ts-ignore
        name: data[i].name,
        // @ts-ignore
        id: data[i].ids[j],
      });
      currentSize++;
    }
  }

  if (currentArray.length > 0) {
    const aggregated: IAgregateTypesWithIds[] = [];
    currentArray.forEach((item) => {
      const found = aggregated.find((agg) => agg.name === item.name);
      if (found) {
        found.ids.push(item.id);
      } else {
        aggregated.push({
          name: item.name,
          ids: [item.id],
        });
      }
    });
    result.push(aggregated);
  }

  return result;
};

export const extractedAllQueryIdentifiersInRawQuery = (
  rawQuery: string,
): string[] => {
  const extracted = gql(rawQuery);
  const result: string[] = [];

  extracted.definitions.forEach(
    (definition: { kind: string; selectionSet: { selections: any[] } }) => {
      if (definition.kind === "OperationDefinition") {
        if (definition.selectionSet) {
          definition.selectionSet.selections.forEach((selection) => {
            if (selection.kind === "Field") {
              result.push(selection.name.value);
            }
          });
        }
      }
    },
  );

  return result;
};
