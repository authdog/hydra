export const TYPE_BLOCK_REGEX_GENERAL = /type ([\s\S]*?)\{([\s\S]*?)\}/g;
export const INPUT_BLOCK_REGEX_GENERAL = /input ([\s\S]*?)\{([\s\S]*?)\}/g;
export const SCALAR_BLOCK_REGEX_GENERAL = /scalar (\w+)/g;

export const TYPE_BLOCK_REGEXP = /type (\w+) {([\s\S]*?)}/;
export const TYPE_QUERY_REGEXP = /type Query {([\s\S]*?)}/;
export const TYPE_MUTATION_REGEXP = /type Mutation {([\s\S]*?)}/;

export const INPUT_BLOCK_REGEXP = /input (\w+) {([\s\S]*?)}/;
export const FIELD_REGEXP =
  /\s*(\w+)(\([\s\S]*?\))?: ([\w\[\]!]+)(\s*=\s*([\w\d]+))?/;

export const DIRECTIVE_RAW_REGEXP = /directive @(\w+)(\([\s\S]*?\))? on (\w+)/g;
