import pc from "picocolors";

export const logger = {
  info: (message: string): void => {
    console.log(pc.cyan("i"), message);
  },
  success: (message: string): void => {
    console.log(pc.green("√"), message);
  },
  warn: (message: string): void => {
    console.log(pc.yellow("!"), message);
  },
  error: (message: string): void => {
    console.error(pc.red("x"), message);
  },
};
