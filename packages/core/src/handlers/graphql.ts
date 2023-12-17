import { createYoga } from "graphql-yoga";
import { schema } from "../schema";

export const GraphQLHandler = async (req: Request, env: any, ctx: any): Promise<any> => {
  const yoga = createYoga({
    schema,
    context: async (event) => {
      const { request } = event;
      const authorization =
        (request.headers.get("Authorization") ||
          request.headers.get("authorization")) ??
        null;

      const forwardedFor = request.headers.get("x-forwarded-for");
      //  "x-forwarded-for": "\"[2a02:1210:5274:9f00:b94e:d462:5886:5cc2]\", 140.248.74.113, 140.248.74.113",
      // extract ip address in [] in forwardedFor
      const remoteIp = forwardedFor?.match(/\[(.*?)\]/)?.[1] ?? null;

      return {
        authorization,
        remoteIp,
        userAgent: request.headers.get("user-agent") ?? null,
      };
    },
    landingPage: false,
  });
  return yoga(req, env, ctx);
};
