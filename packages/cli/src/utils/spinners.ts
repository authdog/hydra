// @ts-ignore
import cliSpinners from "cli-spinners";

export const initSpinner = (message: string) => {
    const spinner = cliSpinners.dots;
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(`\r${spinner.frames[i++ % spinner.frames.length]} ${message}`);
    }, spinner.interval);

    return interval;
}

export const stopSpinner = (interval: NodeJS.Timeout) => {
    clearInterval(interval);
    process.stdout.write(`\r`);
}