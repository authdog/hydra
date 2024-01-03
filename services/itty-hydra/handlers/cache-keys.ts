import { headersDefault } from "../utils/headers";

export const CacheKeysHandler = async (request, bindings: any, ctx: any) => {
  const keys = await ctx?.kv.list();

  return new Response(
    JSON.stringify({
      message: "OK",
      ...keys,
    }),
    { status: 200, headers: headersDefault },
  );
};
