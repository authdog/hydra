import { headersDefault } from "../utils/headers";

export const NotFound = async () => {
  return new Response("Not Found", {
    status: 404,
    headers: headersDefault,
  });
};
