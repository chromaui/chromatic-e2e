/*
 * Argument parsing and output handling for the `archive-storybook` and `build-archive-storybook`
 * bins. The bins used to forward their arguments to the Storybook CLI, so the flags here mirror the
 * ones of Storybook's `dev` and `build` commands that users and chromatic-cli pass. Other flags are
 * ignored: the Storybook CLI flags that were forwarded before were never public API.
 *
 * Arguments are parsed by hand, as `node:util`'s `parseArgs()` can't express optional values like
 * Storybook's `--stats-json [directory]`: it would take `--quiet` as the value of `--stats-json --quiet`.
 */

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface Flag {
  /** Long name, without the leading `--` */
  name: string;

  /** Single character alias, without the leading `-` */
  short?: string;

  /**
   * - `boolean`: takes no value
   * - `string`: requires a value
   * - `optional`: takes the next argument as value, unless it's a flag
   */
  type: "boolean" | "string" | "optional";

  /** Value placeholder shown in `--help`, e.g. `<dir>` */
  value?: string;

  description: string;
}

interface CommonOptions {
  logLevel: LogLevel;
  help: boolean;
}

export interface BuildOptions extends CommonOptions {
  outputDir: string;

  /** Directory to write `preview-stats.json` into, when `--stats-json` was passed */
  statsDir?: string;
}

export interface DevOptions extends CommonOptions {
  port: number;
  host?: string;
}

export interface Logger {
  trace: (message: string) => void;
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;

  /**
   * Output that other tools parse from stdout, like chromatic-cli's detection of `Output directory:`
   * when the build command didn't receive `--output-dir`. Hidden only by `--loglevel silent`.
   */
  output: (message: string) => void;
}

type Values = Record<string, string | true | undefined>;

interface Command<Options extends CommonOptions> {
  name: string;
  description: string;
  flags: Flag[];
  toOptions: (values: Values) => Options;
}

const LOGGING_FLAGS: Flag[] = [
  { name: "quiet", type: "boolean", description: "Only log warnings and errors" },
  {
    name: "loglevel",
    type: "string",
    value: "<level>",
    description: `Define log level (choices: ${LOG_LEVELS.join(", ")}, default: info)`,
  },
  { name: "debug", type: "boolean", description: "Log debug output and error stack traces" },
];

export const BUILD_COMMAND: Command<BuildOptions> = {
  name: "build-archive-storybook",
  description: "Build a static Storybook from the test archives",
  flags: [
    {
      name: "output-dir",
      short: "o",
      type: "string",
      value: "<dir>",
      description: "Directory where to store built files (default: storybook-static)",
    },
    {
      name: "stats-json",
      type: "optional",
      value: "[dir]",
      description: "Write stats JSON for TurboSnap into the directory (default: output directory)",
    },
    {
      name: "webpack-stats-json",
      type: "optional",
      value: "[dir]",
      description: "Synonym for --stats-json",
    },
    ...LOGGING_FLAGS,
    { name: "help", short: "h", type: "boolean", description: "Display help" },
  ],
  toOptions(values) {
    const outputDir = stringValue(values["output-dir"]) ?? "storybook-static";
    const statsJson = values["stats-json"] ?? values["webpack-stats-json"];

    return {
      ...toCommonOptions(values),
      outputDir,
      statsDir: statsJson === true ? outputDir : statsJson,
    };
  },
};

export const DEV_COMMAND: Command<DevOptions> = {
  name: "archive-storybook",
  description: "Start a Storybook server for the test archives",
  flags: [
    {
      name: "port",
      short: "p",
      type: "string",
      value: "<number>",
      description: "Port to run Storybook (default: 6006)",
    },
    {
      name: "host",
      short: "h",
      type: "string",
      value: "<host>",
      description: "Host to run Storybook",
    },
    ...LOGGING_FLAGS,
    { name: "help", type: "boolean", description: "Display help" },
  ],
  toOptions(values) {
    const port = Number(stringValue(values.port) ?? 6006);

    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw new Error(`Invalid port '${values.port}', expected a number between 0 and 65535`);
    }

    return { ...toCommonOptions(values), port, host: stringValue(values.host) };
  },
};

/**
 * Parses the arguments and runs the command. Handles `--help`, and logs errors without the stack
 * trace of the bundled code, unless debug logs are enabled.
 */
export async function runCommand<Options extends CommonOptions>(
  command: Command<Options>,
  args: string[],
  main: (options: Options, logger: Logger) => Promise<void>,
) {
  let logger = createLogger("info");

  try {
    const options = parseArgs(command, args);
    logger = createLogger(options.logLevel);

    if (options.help) {
      console.log(formatHelp(command));
      return;
    }

    await main(options, logger);
  } catch (error) {
    // Always print the error, regardless of the log level. Chromatic CLI shows stderr to users, and
    // reports a missing dependency when the failed command printed nothing.
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }

    process.exitCode = 1;
  }
}

export function parseArgs<Options extends CommonOptions>(
  command: Command<Options>,
  args: string[],
): Options {
  const values: Values = {};

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    // Everything after `--` is positional
    if (arg === "--") break;

    const match = /^(?:--([^=]+)|-([^-=]))(?:=(.*))?$/s.exec(arg);

    // Positional arguments are ignored
    if (!match) continue;

    const [, long, short, inlineValue] = match;
    const flag = command.flags.find((f) => (long ? f.name === long : f.short === short));

    // Unknown flags are ignored
    if (!flag) continue;

    if (flag.type === "boolean") {
      values[flag.name] = true;
    } else if (inlineValue !== undefined) {
      values[flag.name] = inlineValue;
    } else if (args[index + 1] !== undefined && !args[index + 1].startsWith("-")) {
      values[flag.name] = args[++index];
    } else if (flag.type === "optional") {
      values[flag.name] = true;
    } else {
      throw new Error(`Option '${formatFlag(flag)}' argument missing`);
    }
  }

  return command.toOptions(values);
}

export function createLogger(
  level: LogLevel,
  output: Pick<Console, "log" | "warn" | "error"> = console,
): Logger {
  const isEnabled = (messageLevel: LogLevel) =>
    LOG_LEVELS.indexOf(messageLevel) >= LOG_LEVELS.indexOf(level);

  const log = (messageLevel: LogLevel, write: (message: string) => void) => (message: string) => {
    if (isEnabled(messageLevel)) write(message);
  };

  return {
    trace: log("trace", (message) => output.log(message)),
    debug: log("debug", (message) => output.log(message)),
    info: log("info", (message) => output.log(message)),
    warn: log("warn", (message) => output.warn(message)),
    error: log("error", (message) => output.error(message)),
    output: (message) => {
      if (level !== "silent") output.log(message);
    },
  };
}

export function formatHelp(command: Command<CommonOptions>) {
  const rows = command.flags.map((flag) => [formatFlag(flag), flag.description]);
  const width = Math.max(...rows.map(([usage]) => usage.length));

  return [
    `Usage: ${command.name} [options]`,
    "",
    command.description,
    "",
    "Options:",
    ...rows.map(([usage, description]) => `  ${usage.padEnd(width)}  ${description}`),
  ].join("\n");
}

function formatFlag(flag: Flag) {
  const short = flag.short ? `-${flag.short}, ` : "    ";
  return `${short}--${flag.name}${flag.value ? ` ${flag.value}` : ""}`;
}

function toCommonOptions(values: Values): CommonOptions {
  return { logLevel: resolveLogLevel(values), help: values.help === true };
}

/** Explicit `--loglevel` wins over `--debug`, which wins over `--quiet` */
function resolveLogLevel(values: Values): LogLevel {
  const level = values.loglevel;

  if (typeof level === "string") {
    if (!LOG_LEVELS.includes(level as LogLevel)) {
      throw new Error(`Invalid log level '${level}', expected one of: ${LOG_LEVELS.join(", ")}`);
    }

    return level as LogLevel;
  }

  if (values.debug) return "debug";
  if (values.quiet) return "warn";

  return "info";
}

function stringValue(value: string | true | undefined) {
  return typeof value === "string" ? value : undefined;
}
