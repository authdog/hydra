import { headersDefault } from "../utils/headers";

export const Health = () => {
  const body = JSON.stringify({
    status: 200,
    statusText: "ok",
  });
  return new Response(body, { headers: headersDefault });
};
