const actionErrorHanlder = (error: Error) => {
  console.error(error.message);
  process.exit(1);
};

/**
 * @param fn Takes as parameter an action function
 * @returns  Returns a function that runs the action function and handles any errors
 * https://github.com/tj/commander.js/issues/782#issuecomment-430190791
 */
export const actionRunner = (fn: (...args: any) => Promise<any>) => {
  return (...args: any) => fn(...args).catch(actionErrorHanlder);
};
