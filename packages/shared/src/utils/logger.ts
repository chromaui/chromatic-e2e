/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
export const logger = process.env.LOG
  ? console
  : { log: (..._args: any[]) => {}, warn: (..._args: any[]) => {} };
