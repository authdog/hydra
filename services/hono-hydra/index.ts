import app from "./main";
export { HydraRateLimiter } from "@authdog/hydra-core";

const handler = {
  fetch: app.fetch,
  //   queue: queueHandler,
};

export default handler;
