import {
  blueBright,
  Chalk,
  greenBright,
  magentaBright,
  redBright,
  yellowBright,
} from "chalk";

export type ConsoleParams = Parameters<typeof console["log"]>;

const createLogFunction =
  (type: string, color: Chalk) =>
  (...args: ConsoleParams) =>
    console.log(color([`[${type}]:`, ...args].join(" ")));

export const info = createLogFunction("info", blueBright);

export const warn = createLogFunction("warn", yellowBright);

export const err = createLogFunction("error", redBright);

export const ok = createLogFunction("success", greenBright);

export const cmd = createLogFunction("$", magentaBright);
