export const logger = process.env.LOG ? console : { log: () => {}, warn: () => {} };
