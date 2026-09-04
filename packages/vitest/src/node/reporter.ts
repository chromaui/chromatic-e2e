import { relative, resolve } from "node:path";

import colors from "tinyrainbow";
import { TestCase, TestModule, Vitest } from "vitest/node";
import { Reporter } from "vitest/reporters";

import { DEFAULT_OUTPUT_DIR } from "../constants";
import { type ResolvedOptions } from "../types";
import { TELEMETRY_LOG_FILE } from "./telemetry";

const REPORTER_NAME = "chromatic-reporter";

interface Options
  extends
    Pick<ResolvedOptions, "outputDirectory" | "turboSnap">,
    Pick<ResolvedOptions["reporter"], "verbose">,
    Pick<ResolvedOptions["telemetry"], "logToFile"> {
  /** User's Vitest built-in reporter */
  builtInReporter: "default" | "verbose" | "tree";
}

export class ChromaticReporter implements Reporter {
  public name = REPORTER_NAME;

  private constructor(
    private ctx: Vitest,
    private options: Options,
    private snapshotCountPerEntity = new Map<TestCase["id"], number>(),
    private isPluginActivated = false,
  ) {}

  /**
   * Add `ChromaticReporter` to Vitest reporters unless it's already included.
   */
  static apply(ctx: Vitest, pluginOptions: ResolvedOptions) {
    const options: Options = {
      verbose: pluginOptions.reporter.verbose,
      outputDirectory: pluginOptions.outputDirectory,
      turboSnap: pluginOptions.turboSnap,
      logToFile: pluginOptions.telemetry.enabled && pluginOptions.telemetry.logToFile,
      builtInReporter: "default",
    };

    for (const reporter of ctx.config.reporters) {
      // Apply ChromaticReporter just once
      if (isChromaticReporter(reporter)) {
        return;
      }

      // Inline reporter
      if (!Array.isArray(reporter)) {
        continue;
      }

      const reporterName = reporter[0];

      if (reporterName === "tree" || reporterName === "default" || reporterName === "verbose") {
        options.builtInReporter = reporterName as Exclude<typeof reporterName, string>;
      }
    }

    ctx.config.reporters.push(new ChromaticReporter(ctx, options));
  }

  /**
   * Custom reporter life-cycle called when `takeSnapshot()` is called.
   */
  static onSnapshot(ctx: Vitest, test: TestCase) {
    const reporter = ctx.config.reporters.find(isChromaticReporter);

    reporter?._onSnapshot(test);
  }

  /**
   * Custom reporter life-cycle called when plugin is activated for a project.
   */
  static onPluginActivated(ctx: Vitest) {
    const reporter = ctx.config.reporters.find(isChromaticReporter);

    reporter?._onPluginActivated();
  }

  onTestCaseResult(testCase: TestCase) {
    if (this.options.builtInReporter !== "verbose") {
      return;
    }

    this.logSnapshots({
      count: this.snapshotCountPerEntity.get(testCase.id) ?? 0,
      indentation: 3,
      projectName: testCase.project.name,
    });
  }

  onTestModuleEnd(testModule: TestModule) {
    if (this.options.builtInReporter !== "default" && this.options.builtInReporter !== "tree") {
      return;
    }

    let noSlowTests = true;

    for (const testCase of testModule.children.allTests()) {
      if (testCase.diagnostic()?.slow) {
        noSlowTests = false;
        break;
      }
    }

    const indentProjectName = noSlowTests && this.options.builtInReporter === "default";

    this.logSnapshots({
      count: this.snapshotCountPerEntity.get(testModule.id) ?? 0,
      indentation: indentProjectName ? 3 : 2,
      projectName: indentProjectName && testModule.project.name,
    });
  }

  onTestRunEnd() {
    const snapshotCount = [...this.snapshotCountPerEntity.values()].reduce((a, b) => a + b, 0);
    this.snapshotCountPerEntity.clear();

    const separator = colors.dim("─".repeat(this.ctx.logger.getColumns()));

    if (!this.isPluginActivated) {
      return this.ctx.logger.log(
        `${separator}`,

        `\n${colors.inverse(" Chromatic Visual Regression ")}`,

        `\n\n${colors.red("No archives captured. Chromatic plugin requires a browser mode project with Chromium project.")}`,

        `\n\n${separator}\n`,
      );
    }

    if (snapshotCount === 0) {
      return;
    }

    const output = resolve(this.ctx.config.root, this.options.outputDirectory);

    let uploadCommand = "chromatic --vitest --project-token=<TOKEN>";

    if (this.options.turboSnap) {
      uploadCommand += " --only-changed";
    }

    // If user changed the output directory or Vitest root,
    // they'll need to define custom CHROMATIC_ARCHIVE_LOCATION when uploading archives:
    if (
      this.options.outputDirectory !== DEFAULT_OUTPUT_DIR ||
      this.ctx.config.root !== process.cwd()
    ) {
      uploadCommand = `CHROMATIC_ARCHIVE_LOCATION=${relative(process.cwd(), output)} ${uploadCommand}`;
    }

    const telemetryInfo = this.options.logToFile
      ? `\nTelemetry events logged to ${colors.dim(resolve(output, TELEMETRY_LOG_FILE))}`
      : "";

    this.ctx.logger.log(
      `${separator}`,

      `\n${colors.inverse(" Chromatic Visual Regression ")}`,

      `\n\n${colors.green("✓")} ${snapshotCount} ${pluralize(snapshotCount, "archive")} captured`,

      `\n\nArchives saved in ${colors.dim(output)}`,
      telemetryInfo,
      `\nTo upload archives into Chromatic run ${colors.green(uploadCommand)}`,

      `\n\n${separator}\n`,
    );
  }

  private logSnapshots(options: {
    count: number;
    indentation: number;
    projectName: string | false;
  }) {
    if (!this.options.verbose || options.count === 0) {
      return;
    }

    const snapshots = `(${options.count} ${pluralize(options.count, "archive")} captured)`;

    if (options.projectName) {
      options.indentation += options.projectName.length + 2;
    }

    this.ctx.logger.log(`${" ".repeat(options.indentation)} ${colors.dim(snapshots)}`);
  }

  private _onSnapshot(test: TestCase) {
    // Vitest's verbose reporter logs outputs of each test case, others after each test module:
    const key = this.options.builtInReporter === "verbose" ? test.id : test.module.id;

    const previousCount = this.snapshotCountPerEntity.get(key) ?? 0;
    this.snapshotCountPerEntity.set(key, previousCount + 1);
  }

  private _onPluginActivated() {
    this.isPluginActivated = true;
  }
}

function isChromaticReporter(
  reporter: Vitest["config"]["reporters"][number],
): reporter is ChromaticReporter {
  return "name" in reporter && reporter.name === REPORTER_NAME;
}

function pluralize(count: number, text: string) {
  return count === 1 ? text : `${text}s`;
}
