import { Hono } from "hono";

export { HydraRateLimiter } from "@authdog/hydra-core";

const app = new Hono();

app.get("/", (c) => {
    console.log(c);
    return c.text("Hello Hono!")
});


export default app;
