import { afterEach, describe, expect, test, vi } from "vitest";

import { BUILD_COMMAND, createLogger, DEV_COMMAND, formatHelp, parseArgs, runCommand } from "./cli";

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("build-archive-storybook", () => {
  test("defaults", () => {
    expect(parseArgs(BUILD_COMMAND, [])).toEqual({
      outputDir: "storybook-static",
      statsDir: undefined,
      logLevel: "info",
      help: false,
    });
  });

  test("arguments passed by chromatic-cli", () => {
    const options = parseArgs(BUILD_COMMAND, ["--output-dir=/tmp/out", "--stats-json=/tmp/out"]);

    expect(options).toMatchObject({ outputDir: "/tmp/out", statsDir: "/tmp/out" });
  });

  test("--webpack-stats-json passed by chromatic-cli for older Storybook versions", () => {
    const options = parseArgs(BUILD_COMMAND, ["--output-dir=out", "--webpack-stats-json=stats"]);

    expect(options).toMatchObject({ outputDir: "out", statsDir: "stats" });
  });

  test.each([[["--output-dir", "out"]], [["--output-dir=out"]], [["-o", "out"]], [["-o=out"]]])(
    "output directory from %j",
    (args) => {
      expect(parseArgs(BUILD_COMMAND, args).outputDir).toBe("out");
    },
  );

  test("--stats-json without directory defaults to output directory", () => {
    expect(parseArgs(BUILD_COMMAND, ["-o", "out", "--stats-json"]).statsDir).toBe("out");
    expect(parseArgs(BUILD_COMMAND, ["--stats-json", "-o", "out"]).statsDir).toBe("out");
    expect(parseArgs(BUILD_COMMAND, ["--stats-json"]).statsDir).toBe("storybook-static");
  });

  test("--stats-json does not take the next flag as its value", () => {
    const options = parseArgs(BUILD_COMMAND, ["--stats-json", "--quiet"]);

    expect(options).toMatchObject({ statsDir: "storybook-static", logLevel: "warn" });
  });

  test("--stats-json takes the next argument as its value", () => {
    expect(parseArgs(BUILD_COMMAND, ["--stats-json", "stats"]).statsDir).toBe("stats");
  });

  test("ignores unknown flags and positional arguments", () => {
    const options = parseArgs(BUILD_COMMAND, [
      "--disable-telemetry",
      "--config-dir",
      ".storybook",
      "-c",
      "positional",
      "--no-open",
      "-o",
      "out",
    ]);

    expect(options).toEqual({
      outputDir: "out",
      statsDir: undefined,
      logLevel: "info",
      help: false,
    });
  });

  test("ignores arguments after --", () => {
    expect(parseArgs(BUILD_COMMAND, ["--", "-o", "out"]).outputDir).toBe("storybook-static");
  });

  test("throws when value is missing", () => {
    expect(() => parseArgs(BUILD_COMMAND, ["--output-dir"])).toThrow(
      "Option '-o, --output-dir <dir>' argument missing",
    );
    expect(() => parseArgs(BUILD_COMMAND, ["-o", "--quiet"])).toThrow(
      "Option '-o, --output-dir <dir>' argument missing",
    );
  });

  test.each([["-h"], ["--help"]])("%s", (arg) => {
    expect(parseArgs(BUILD_COMMAND, [arg]).help).toBe(true);
  });

  test("help", () => {
    expect(formatHelp(BUILD_COMMAND)).toMatchInlineSnapshot(`
      "Usage: build-archive-storybook [options]

      Build a static Storybook from the test archives

      Options:
        -o, --output-dir <dir>          Directory where to store built files (default: storybook-static)
            --stats-json [dir]          Write stats JSON for TurboSnap into the directory (default: output directory)
            --webpack-stats-json [dir]  Synonym for --stats-json
            --quiet                     Only log warnings and errors
            --loglevel <level>          Define log level (choices: trace, debug, info, warn, error, silent, default: info)
            --debug                     Log debug output and error stack traces
        -h, --help                      Display help"
    `);
  });
});

describe("archive-storybook", () => {
  test("defaults", () => {
    expect(parseArgs(DEV_COMMAND, [])).toEqual({
      port: 6006,
      host: undefined,
      logLevel: "info",
      help: false,
    });
  });

  test("port and host", () => {
    expect(parseArgs(DEV_COMMAND, ["-p", "3000", "-h", "0.0.0.0"])).toMatchObject({
      port: 3000,
      host: "0.0.0.0",
    });
    expect(parseArgs(DEV_COMMAND, ["--port=3000", "--host", "localhost"])).toMatchObject({
      port: 3000,
      host: "localhost",
    });
  });

  test("-h is host and --help is help", () => {
    expect(parseArgs(DEV_COMMAND, ["--help"]).help).toBe(true);
    expect(() => parseArgs(DEV_COMMAND, ["-h"])).toThrow(
      "Option '-h, --host <host>' argument missing",
    );
  });

  test.each(["abc", "1.5", "70000"])("throws on invalid port %s", (port) => {
    expect(() => parseArgs(DEV_COMMAND, ["--port", port])).toThrow(
      `Invalid port '${port}', expected a number between 0 and 65535`,
    );
  });

  test("help", () => {
    expect(formatHelp(DEV_COMMAND)).toMatchInlineSnapshot(`
      "Usage: archive-storybook [options]

      Start a Storybook server for the test archives

      Options:
        -p, --port <number>     Port to run Storybook (default: 6006)
        -h, --host <host>       Host to run Storybook
            --quiet             Only log warnings and errors
            --loglevel <level>  Define log level (choices: trace, debug, info, warn, error, silent, default: info)
            --debug             Log debug output and error stack traces
            --help              Display help"
    `);
  });
});

describe("log level", () => {
  test.each([
    [[], "info"],
    [["--quiet"], "warn"],
    [["--debug"], "debug"],
    [["--debug", "--quiet"], "debug"],
    [["--loglevel", "error"], "error"],
    [["--loglevel=trace", "--quiet"], "trace"],
    [["--loglevel", "silent", "--debug"], "silent"],
  ])("%j is %s", (args, logLevel) => {
    expect(parseArgs(BUILD_COMMAND, args).logLevel).toBe(logLevel);
  });

  test("throws on invalid log level", () => {
    expect(() => parseArgs(BUILD_COMMAND, ["--loglevel", "verbose"])).toThrow(
      "Invalid log level 'verbose', expected one of: trace, debug, info, warn, error, silent",
    );
  });
});

describe("createLogger", () => {
  test("logs messages at or above the level", () => {
    const output = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = createLogger("info", output);

    logger.trace("trace");
    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(output.log.mock.calls).toEqual([["info"]]);
    expect(output.warn.mock.calls).toEqual([["warn"]]);
    expect(output.error.mock.calls).toEqual([["error"]]);
  });

  test("silent logs nothing", () => {
    const output = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = createLogger("silent", output);

    logger.info("info");
    logger.error("error");

    expect(output.log).not.toHaveBeenCalled();
    expect(output.error).not.toHaveBeenCalled();
  });
});

test.each(["error", "warn", "info", "debug"] as const)(
  "output is logged with log level %s",
  (level) => {
    const output = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    createLogger(level, output).output("Output directory: out");

    expect(output.log.mock.calls).toEqual([["Output directory: out"]]);
  },
);

test("output is not logged with log level silent", () => {
  const output = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

  createLogger("silent", output).output("Output directory: out");

  expect(output.log).not.toHaveBeenCalled();
});

describe("runCommand", () => {
  test("runs main with options and logger", async () => {
    const main = vi.fn().mockResolvedValue(undefined);

    await runCommand(BUILD_COMMAND, ["-o", "out"], main);

    expect(main).toHaveBeenCalledWith(
      expect.objectContaining({ outputDir: "out" }),
      expect.objectContaining({ info: expect.any(Function) }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  test("prints help without running main", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const main = vi.fn();

    await runCommand(BUILD_COMMAND, ["--help"], main);

    expect(main).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(formatHelp(BUILD_COMMAND));
  });

  test("logs error message without stack and sets exit code", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCommand(BUILD_COMMAND, [], () => Promise.reject(new Error("Build failed")));

    expect(error.mock.calls).toEqual([["Build failed"]]);
    expect(log).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  test("logs stack trace with --debug", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCommand(BUILD_COMMAND, ["--debug"], () => Promise.reject(new Error("Build failed")));

    expect(log).toHaveBeenCalledWith(expect.stringContaining("Error: Build failed\n    at "));
    expect(process.exitCode).toBe(1);
  });

  test("logs error message with --loglevel silent", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await runCommand(BUILD_COMMAND, ["--loglevel", "silent"], () =>
      Promise.reject(new Error("Build failed")),
    );

    expect(error.mock.calls).toEqual([["Build failed"]]);
    expect(process.exitCode).toBe(1);
  });

  test("logs argument errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const main = vi.fn();

    await runCommand(BUILD_COMMAND, ["--loglevel", "verbose"], main);

    expect(main).not.toHaveBeenCalled();
    expect(error.mock.calls).toEqual([
      ["Invalid log level 'verbose', expected one of: trace, debug, info, warn, error, silent"],
    ]);
    expect(process.exitCode).toBe(1);
  });
});
