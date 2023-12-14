import {buildSchemaIntrospection} from "../utils/introspectSchemas";

export const generateSchemaAction = async ({
    config = {
        
    }
}) => {

    // let hydraConfig = {};

    // if (config) {
    //     // validate custom config
    // } else {
    //     // check if config exists
    //     // validate standard config
    // }
    // // if valid, set hydraConfig as parsed config

    const schemas = [
          {
            id: "mgt",
            uri: "https://mgt.auth.dog/graphql",
          },
          {
            id: "authz",
            uri: "https://authz.auth.dog/graphql",
          },
    ];
    
    const outputPath = "./.hydra/schemaRaw.ts";

    await buildSchemaIntrospection(schemas, outputPath);


    console.log("Generate Schema action");
}