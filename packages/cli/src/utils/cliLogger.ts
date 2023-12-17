// @ts-ignore
import cc from "node-console-colors";

export const logError = (message: string) => {
    console.info(cc.set("bg_red", `${message} ✖`));
      process.exit(1);
}

export const logSuccess = (message: string) => {
    console.info(cc.set("bg_green", `${message} ✓`))
}