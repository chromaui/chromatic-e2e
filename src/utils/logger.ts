export const logger = process.env.LOG
  ? console
  : { log: (..._args: any[]) => {}, warn: (..._args: any[]) => {} };
