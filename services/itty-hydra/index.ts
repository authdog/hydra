import { workerResolver } from "./main";
export { HydraRateLimiter } from "@authdog/hydra-core";

const handler = {
  fetch: workerResolver.fetch,
  //   queue: queueHandler,
};

export default handler;
