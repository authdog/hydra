import {
  DIRECTIVE_RAW_REGEXP,
  FIELD_REGEXP,
  INPUT_BLOCK_REGEXP,
  INPUT_BLOCK_REGEX_GENERAL,
  SCALAR_BLOCK_REGEX_GENERAL,
  TYPE_BLOCK_REGEXP,
  TYPE_BLOCK_REGEX_GENERAL,
} from "./constants";

interface Field {
  name: string;
  args: {
    name: string;
    type: string;
  }[];
  type: string;
}

interface Type {
  name: string;
  fields: Field[];
}

interface Input {
  name: string;
  fields: Field[];
}

interface Directive {
  directiveName: string;
  directiveLine: string;
}

interface Scalar {
  scalarName: string;
  scalarLine: string;
}

interface SchemaConfig {
  types: Type[];
  inputs: Input[];
  directives: Directive[];
  scalars: Scalar[];
}

// export function unifySchemas(
//   managementSchema: string,
//   authzSchema: string
// ): string {
//   // Combine the two schemas
//   const unifiedSchema = `
//       ${managementSchema}

//       # Merge the Query and Mutation types
//       extend type Query {
//         ${authzSchema.match(TYPE_QUERY_REGEXP)[1]}
//       }

//       extend type Mutation {
//         ${authzSchema.match(TYPE_MUTATION_REGEXP)[1]}
//       }
//     `;

//   return unifiedSchema;
// }

// export const extractPrimitiveWithRegExp = (
//   rawSchema: string,
//   regex: RegExp
// ) => {};

export const extractTypesBlocks = (rawSchema: string) => {
  // extract as array of strings everything between type <string> {}
  // e.g.:
  // type Query {
  //   health: Health
  // }
  return rawSchema.match(TYPE_BLOCK_REGEX_GENERAL);
};

export const extractInputsBlocks = (rawSchema: string) => {
  // extract as array of strings everything between input <string> {}
  // e.g.:
  // input HealthInput {
  //   status: String
  // }
  return rawSchema.match(INPUT_BLOCK_REGEX_GENERAL);
};

/*
  
  a type block is a string like this:
  type Query {
      health: Health
  }
  
  return an object like this:
  {
      name: "Query",
      fields: [
          {
              name: "health",
              type: "Health"
          }
      ]
  }
  */
export const extractGenericBlockPayload = (
  typeBlock: string,
  blockRegex: RegExp = TYPE_BLOCK_REGEXP,
) => {
  // Initialize an empty object to store the result
  const result = {
    name: "",
    fields: [],
  };

  // Regular expression to match the type block
  const typeBlockRegex = blockRegex ?? TYPE_BLOCK_REGEXP;
  const matches = typeBlock.match(typeBlockRegex);

  if (matches) {
    // Extract the type name from the regex match
    result.name = matches[1];

    // Extract and split the fields section into an array of field strings
    const fieldStrings = matches[2].trim().split("\n");

    // Iterate through the field strings and parse each field
    for (const fieldString of fieldStrings) {
      const fieldRegex = FIELD_REGEXP;
      const fieldMatches = fieldString.match(fieldRegex);

      if (fieldMatches) {
        // Extract field name, arguments, type, and default value (if present) from the regex match
        const fieldName = fieldMatches[1];
        const fieldArgsString = fieldMatches[2] ? fieldMatches[2].trim() : null;
        const fieldType = fieldMatches[3];
        // const defaultValue = fieldMatches[5];

        // Parse the arguments string into an array of argument objects
        let fieldArgs = [];
        if (fieldArgsString) {
          fieldArgs = fieldArgsString
            .slice(1, -1) // Remove parentheses
            .split(",") // Split into individual argument strings
            .map((argString) => {
              const [argName, argType] = argString.trim().split(":");
              return { name: argName.trim(), type: argType.trim() };
            });
        }

        // Handle array types by wrapping the type name in square brackets
        const isArray = fieldType.includes("[");
        const cleanFieldType = fieldType.replace(/[\[\]]/g, ""); // Remove square brackets
        const typeObject = isArray ? `[${cleanFieldType}]` : cleanFieldType;

        // Push the field object to the result's fields array
        result.fields.push({
          name: fieldName,
          args: fieldArgs,
          type: typeObject,
          // defaultValue: defaultValue || null,
        });
      }
    }
  }

  return result;
};

export const extractDirectiveLines = (rawSchema: string) => {
  // directive @accessControl(scopes: [String], target: String) on FIELD_DEFINITION
  const directiveRegex = DIRECTIVE_RAW_REGEXP;
  const directiveMatches = rawSchema.match(directiveRegex);
  const directiveLines = directiveMatches?.map((line) => {
    const lineTrimmed = line.trim();
    const lineTrimmedWords = lineTrimmed.split(" ");
    let directiveName = lineTrimmedWords?.[1];
    // remove everything after : or ( (inclusive) in mutationName
    // health: -> health
    // health(meta: SomeInput) -> health
    directiveName = directiveName?.replace(/[:\(].*$/, "");
    return {
      directiveName,
      directiveLine: line?.trim(),
    };
  });
  return directiveLines;
};

export const extractScalarLines = (rawSchema: string) => {
  const scalarRegex = SCALAR_BLOCK_REGEX_GENERAL;
  const scalarMatches = rawSchema.match(scalarRegex);
  const scalarLines = scalarMatches?.map((line) => {
    const lineTrimmed = line.trim();
    const lineTrimmedWords = lineTrimmed.split(" ");
    let scalarName = lineTrimmedWords?.[1];
    scalarName = scalarName?.replace(/[:\(].*$/, "");
    return {
      scalarName,
      scalarLine: line?.trim(),
    };
  });

  return scalarLines;
};

export function unifyGraphQLSchemasObjects(schemas: string[]): SchemaConfig {
  // Combine all schemas
  let allTypes = [];
  const queryType = {
    name: "Query",
    fields: [],
  };
  const mutationType = {
    name: "Mutation",
    fields: [],
  };

  let allInputs = [];
  let allDirectives = [];
  let allScalars = [];

  schemas.forEach((schema) => {
    const types = extractTypesBlocks(schema);
    types &&
      types.forEach((type) => {
        const typeObject = extractGenericBlockPayload(type);
        if (
          typeObject?.name !== "Query" &&
          typeObject?.name !== "Mutation" &&
          typeObject?.name !== ""
        ) {
          allTypes.push(typeObject);
        } else if (typeObject?.name === "Query") {
          queryType.fields = queryType.fields.concat(typeObject.fields);
        } else if (typeObject?.name === "Mutation") {
          mutationType.fields = mutationType.fields.concat(typeObject.fields);
        }
      });

    const inputs = extractInputsBlocks(schema);
    inputs &&
      inputs.forEach((input) => {
        const inputObject = extractGenericBlockPayload(
          input,
          INPUT_BLOCK_REGEXP,
        );
        allInputs.push(inputObject);
      });

    const extractedDirectives = extractDirectiveLines(schema);

    if (extractedDirectives) {
      extractedDirectives.forEach((directive) => {
        allDirectives.push(directive);
      });
    }

    const extractedScalars = extractScalarLines(schema);

    if (extractedScalars) {
      extractedScalars.forEach((scalar) => {
        allScalars.push(scalar);
      });
    }
  });

  allTypes?.push(queryType);
  allTypes?.push(mutationType);

  const QueryType = allTypes.find((type) => type.name === "Query");

  if (QueryType) {
    const queryTypeWithUniqueFields =
      removeDuplicatedFieldsInPrimitive(QueryType);
    // replace QueryType with queryTypeWithUniqueFields
    allTypes = allTypes.map((type) => {
      if (type.name === "Query") {
        return queryTypeWithUniqueFields;
      }
      return type;
    });
  }

  const MutationType = allTypes.find((type) => type.name === "Mutation");

  if (MutationType) {
    const mutationTypeWithUniqueFields =
      removeDuplicatedFieldsInPrimitive(MutationType);
    // replace MutationType with mutationTypeWithUniqueFields
    allTypes = allTypes.map((type) => {
      if (type.name === "Mutation") {
        return mutationTypeWithUniqueFields;
      }
      return type;
    });
  }

  const uniqueTypesByName = allTypes.filter(
    (type, index, self) =>
      index === self.findIndex((t) => t.name === type.name),
  );

  const uniqueInputsByName = allInputs.filter(
    (input, index, self) =>
      index === self.findIndex((i) => i.name === input.name),
  );

  const uniqueDirectivesByName = allDirectives.filter(
    (directive, index, self) =>
      index ===
      self.findIndex((d) => d.directiveName === directive.directiveName),
  );

  const uniqueScalarsByName = allScalars.filter(
    (scalar, index, self) =>
      index === self.findIndex((s) => s.scalarName === scalar.scalarName),
  );

  const allPrimitives = {
    types: uniqueTypesByName,
    inputs: uniqueInputsByName,
    directives: uniqueDirectivesByName,
    scalars: uniqueScalarsByName,
  };

  return allPrimitives;
}

export const buildGraphQLSchemaSDL = (config: SchemaConfig): string => {
  const typeDefinitions: string[] = [];

  for (const typeConfig of config.types) {
    const fields: string[] = [];
    for (const fieldConfig of typeConfig.fields) {
      const args = fieldConfig.args
        .map((arg) => `${arg.name}: ${arg.type}`)
        .join(", ");
      fields.push(
        `${fieldConfig.name}${args?.length > 0 ? `(${args})` : ""}: ${
          fieldConfig.type
        }`,
      );
    }

    // check if typeConfig.name exist already in typeDefinitions
    // if so do not add it again
    let typeAlreadyExists = false;
    const typeTypeRegex = new RegExp(`type ${typeConfig.name} {`);

    typeDefinitions.forEach((type) => {
      if (type.match(typeTypeRegex)) {
        typeAlreadyExists = true;
      }
    });

    if (typeAlreadyExists === false) {
      typeDefinitions.push(
        `type ${typeConfig.name} {\n${fields.join("\n")}\n}\n`,
      );
    }
  }

  for (const inputConfig of config.inputs) {
    const fields: string[] = [];

    for (const fieldConfig of inputConfig.fields) {
      fields.push(`${fieldConfig.name}: ${fieldConfig.type}`);
    }

    // check if typeDefinition doesn't exist in typeDefinitions
    // if so add it
    let inputAlreadyExists = false;
    // regular expression "input <inputConfig.name> {"
    const inputTypeRegex = new RegExp(`input ${inputConfig.name} {`);

    typeDefinitions.forEach((type) => {
      if (type.match(inputTypeRegex)) {
        inputAlreadyExists = true;
      }
    });

    if (inputAlreadyExists === false) {
      typeDefinitions.push(
        `input ${inputConfig.name} {\n${fields.join("\n")}\n}\n`,
      );
    }
  }

  for (const directiveConfig of config.directives) {
    typeDefinitions.push(directiveConfig.directiveLine);
  }

  for (const scalarConfig of config.scalars) {
    typeDefinitions.push(scalarConfig.scalarLine);
  }

  return typeDefinitions.join("\n")?.replace(/!!/g, "!");
};

/*
      {
        name: 'Query',
        fields: [
          { name: 'health', args: [], type: 'Health' },
          { name: 'health', args: [], type: 'Health' },
          { name: 'user', args: [], type: 'User' }
        ]
      }
  
  should be
  
      {
        name: 'Query',
        fields: [
          { name: 'health', args: [], type: 'Health' },
          { name: 'user', args: [], type: 'User' }
        ]
      }
  
  
  */
const removeDuplicatedFieldsInPrimitive = (primitive: {
  name: string;
  fields: Field[];
}) => {
  const fields = primitive.fields;
  const uniqueFields = fields.filter(
    (field, index, self) =>
      index === self.findIndex((t) => t.name === field.name),
  );
  return {
    name: primitive.name,
    fields: uniqueFields,
  };
};

/*
  
  the goal of this function is to add the __typename keyword to the schema
  
  mutation {
    hydraDev {
      id
      name
      child {
        id
        childname
      }
    }
  }
  
  
  to this
  
  mutation {
    hydraDev {
      id
      name
      __typename
      child {
        id
        childname
        __typename
      }
    }
    __typename
  }
  
  */
export const addTypenameKeywordToSchema = (schema: string) => {
  const regex = /(\s*)([a-zA-Z]+)\s?{([^{}]*?)}/g;
  const schemaWithTypenameRemoved = schema.replace(/__typename/g, "");
  const replacedSchema = schemaWithTypenameRemoved.replace(
    regex,
    (_match, p1, p2, p3) => {
      const trimmedP3 = p3.trim();
      const lines = trimmedP3.split("\n").map((line) => line.trim());
      const indentedTypename = !p1?.includes("__typename")
        ? `${p1}__typename`
        : "";
      const indentedLines = lines.map((line) => p1 + line);
      return `${p1}${p2} {${indentedTypename}${indentedLines.join(
        "",
      )}${p1}}${indentedTypename}`;
    },
  );
  return replacedSchema;
};

interface DataObject {
  [key: string]: any;
}

export const removeTypename = (obj: DataObject): any => {
  if (obj && typeof obj === "object") {
    // Remove __typename field if it exists
    if (obj.hasOwnProperty("__typename")) {
      delete obj["__typename"];
    }

    // Iterate through object keys and recursively remove __typename fields
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          obj[key] = removeTypename(obj[key]);
        }
      }
    }
  }
  return obj;
};
