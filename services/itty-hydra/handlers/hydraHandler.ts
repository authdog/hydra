interface Context {}

export const Hydra = async (request: Request, env: any, ctx: Context) => {
  return new Response("Hydra handler", {
    status: 200,
  });
};
