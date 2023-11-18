import { workerResolver } from "./main";
// import { queueHandler } from "./queue";
// export { RateLimiter } from "./do/RateLimiter";

const handler = {
  fetch: workerResolver.fetch,
  //   queue: queueHandler,
};

export default handler;
