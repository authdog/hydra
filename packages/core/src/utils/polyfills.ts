export const atob = (str: string) =>
  Buffer.from(str, "base64").toString("binary");
export const btoa = (str: string) =>
  Buffer.from(str, "binary").toString("base64");
