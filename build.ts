#!/usr/bin/env bun

/**
 * Production Build System for RainyXeon Portfolio
 * @module build
 * @author RainyXeon
 * @license MIT
 */

import { existsSync, statSync } from "fs";
import { rm, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";

interface BuildConfig {
  readonly outdir: string;
  readonly minify: boolean;
  readonly sourcemap: "external" | "inline" | "none";
  readonly target: "browser" | "bun" | "node";
  readonly splitting: boolean;
  readonly format: "esm" | "cjs" | "iife";
  readonly treeshaking: boolean;
}

interface BuildResult {
  success: boolean;
  outputs: Array<{ path: string; size: number }>;
  duration: number;
  errors: string[];
}

const BUILD_CONFIG: BuildConfig = {
  outdir: "./dist",
  minify: true,
  sourcemap: "external",
  target: "browser",
  splitting: true,
  format: "esm",
  treeshaking: true,
} as const;

class BuildLogger {
  private startTime: number = 0;
  private readonly isVerbose: boolean;

  constructor(verbose: boolean = false) {
    this.isVerbose = verbose;
  }

  start(message: string): void {
    this.startTime = performance.now();
    console.log(`[BUILD] ${message}`);
  }

  success(message: string, details?: string): void {
    const elapsed = this.getElapsed();
    console.log(
      `[SUCCESS] ${message} ${details ? `(${details})` : ""} [${elapsed}ms]`,
    );
  }

  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`);
    if (error && this.isVerbose) {
      console.error(error);
    }
  }

  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  private getElapsed(): string {
    return (performance.now() - this.startTime).toFixed(2);
  }
}

const logger = new BuildLogger(process.argv.includes("--verbose"));

async function cleanBuildDirectory(): Promise<void> {
  logger.start("Cleaning build directory");

  if (existsSync(BUILD_CONFIG.outdir)) {
    await rm(BUILD_CONFIG.outdir, { recursive: true, force: true });
  }

  await mkdir(BUILD_CONFIG.outdir, { recursive: true });
  logger.success("Build directory cleaned");
}

async function buildEntrypoint(
  entrypoint: string,
  outdir: string,
  publicPath: string,
): Promise<BuildResult> {
  const buildStart = performance.now();

  try {
    const result = await Bun.build({
      entrypoints: [entrypoint],
      outdir,
      minify: {
        whitespace: true,
        syntax: true,
        identifiers: true,
      },
      sourcemap: BUILD_CONFIG.sourcemap,
      target: BUILD_CONFIG.target,
      splitting: BUILD_CONFIG.splitting,
      format: BUILD_CONFIG.format,
      naming: {
        entry: "[dir]/[name].[ext]",
        chunk: "[name]-[hash].[ext]",
        asset: "[name]-[hash].[ext]",
      },
      publicPath,
      external: [],
    });

    if (!result.success) {
      return {
        success: false,
        outputs: [],
        duration: performance.now() - buildStart,
        errors: result.logs.map((log) => String(log)),
      };
    }

    const outputs = await Promise.all(
      result.outputs.map(async (output) => ({
        path: output.path,
        size: output.size || 0,
      })),
    );

    return {
      success: true,
      outputs,
      duration: performance.now() - buildStart,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      outputs: [],
      duration: performance.now() - buildStart,
      errors: [String(error)],
    };
  }
}

async function buildMainSite(): Promise<boolean> {
  logger.start("Building main site");

  const result = await buildEntrypoint(
    "./index.html",
    BUILD_CONFIG.outdir,
    "/",
  );

  if (!result.success) {
    logger.error("Main site build failed");
    result.errors.forEach((err) => logger.error(err));
    return false;
  }

  const totalSize = result.outputs.reduce((sum, out) => sum + out.size, 0);
  logger.success(
    "Main site built",
    `${result.outputs.length} files, ${formatBytes(totalSize)}`,
  );

  return true;
}

async function buildTerminalSite(): Promise<boolean> {
  logger.start("Building terminal interface");

  const result = await buildEntrypoint(
    "./terminal/index.html",
    join(BUILD_CONFIG.outdir, "terminal"),
    "/terminal/",
  );

  if (!result.success) {
    logger.error("Terminal site build failed");
    result.errors.forEach((err) => logger.error(err));
    return false;
  }

  const totalSize = result.outputs.reduce((sum, out) => sum + out.size, 0);
  logger.success(
    "Terminal interface built",
    `${result.outputs.length} files, ${formatBytes(totalSize)}`,
  );

  return true;
}

async function copyStaticAssets(): Promise<void> {
  logger.start("Copying static assets");

  const assetsDir = "./assets";
  const destDir = join(BUILD_CONFIG.outdir, "assets");

  if (!existsSync(assetsDir)) {
    logger.info("No assets directory found, skipping");
    return;
  }

  await copyDirectoryRecursive(assetsDir, destDir);
  logger.success("Static assets copied");
}

async function copyDirectoryRecursive(
  src: string,
  dest: string,
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectoryRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        await copyFile(srcPath, destPath);
      }
    }),
  );
}

async function generateBuildManifest(): Promise<void> {
  logger.start("Generating build manifest");

  const manifest = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    buildTool: "bun",
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    configuration: {
      target: BUILD_CONFIG.target,
      format: BUILD_CONFIG.format,
      minify: BUILD_CONFIG.minify,
      sourcemap: BUILD_CONFIG.sourcemap,
      splitting: BUILD_CONFIG.splitting,
      treeshaking: BUILD_CONFIG.treeshaking,
    },
    git: await getGitInfo(),
  };

  await Bun.write(
    join(BUILD_CONFIG.outdir, "build-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  logger.success("Build manifest generated");
}

async function getGitInfo(): Promise<Record<string, string>> {
  try {
    const [branch, commit, commitDate] = await Promise.all([
      Bun.$`git rev-parse --abbrev-ref HEAD`.text().catch(() => "unknown"),
      Bun.$`git rev-parse --short HEAD`.text().catch(() => "unknown"),
      Bun.$`git log -1 --format=%cd --date=iso`.text().catch(() => "unknown"),
    ]);

    return {
      branch: branch.trim(),
      commit: commit.trim(),
      commitDate: commitDate.trim(),
    };
  } catch {
    return { branch: "unknown", commit: "unknown", commitDate: "unknown" };
  }
}

async function generateBuildStatistics(): Promise<void> {
  logger.start("Calculating build statistics");

  const stats = await calculateDirectoryStats(BUILD_CONFIG.outdir);

  const report = {
    files: {
      total: stats.fileCount,
      byType: stats.filesByType,
    },
    size: {
      total: formatBytes(stats.totalSize),
      totalBytes: stats.totalSize,
      byType: Object.entries(stats.sizeByType).reduce(
        (acc, [type, size]) => ({
          ...acc,
          [type]: formatBytes(size),
        }),
        {} as Record<string, string>,
      ),
    },
  };

  await Bun.write(
    join(BUILD_CONFIG.outdir, "build-stats.json"),
    JSON.stringify(report, null, 2),
  );

  logger.success("Build statistics generated");
  logger.info(`Total files: ${stats.fileCount}`);
  logger.info(`Total size: ${formatBytes(stats.totalSize)}`);

  Object.entries(stats.filesByType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const size = stats.sizeByType[type] || 0;
      logger.info(`  ${type}: ${count} files (${formatBytes(size)})`);
    });
}

interface DirectoryStats {
  fileCount: number;
  totalSize: number;
  filesByType: Record<string, number>;
  sizeByType: Record<string, number>;
}

async function calculateDirectoryStats(dir: string): Promise<DirectoryStats> {
  const stats: DirectoryStats = {
    fileCount: 0,
    totalSize: 0,
    filesByType: {},
    sizeByType: {},
  };

  async function traverse(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (entry.isFile()) {
          const stat = statSync(fullPath);
          const ext = entry.name.split(".").pop() || "unknown";

          stats.fileCount++;
          stats.totalSize += stat.size;
          stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;
          stats.sizeByType[ext] = (stats.sizeByType[ext] || 0) + stat.size;
        }
      }),
    );
  }

  await traverse(dir);
  return stats;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function validateBuildOutput(): Promise<boolean> {
  logger.start("Validating build output");

  const requiredFiles = [
    "index.html",
    "terminal/index.html",
    "build-manifest.json",
    "build-stats.json",
  ];

  const missingFiles = requiredFiles.filter(
    (file) => !existsSync(join(BUILD_CONFIG.outdir, file)),
  );

  if (missingFiles.length > 0) {
    logger.error(`Missing required files: ${missingFiles.join(", ")}`);
    return false;
  }

  logger.success("Build output validated");
  return true;
}

async function main(): Promise<void> {
  console.log(
    "================================================================================",
  );
  console.log("RainyXeon Portfolio - Production Build System");
  console.log("Powered by Bun v" + Bun.version);
  console.log(
    "================================================================================\n",
  );

  const buildStart = performance.now();

  try {
    // Phase 1: Preparation
    await cleanBuildDirectory();

    // Phase 2: Compilation
    const mainSuccess = await buildMainSite();
    if (!mainSuccess) {
      throw new Error("Main site build failed");
    }

    const terminalSuccess = await buildTerminalSite();
    if (!terminalSuccess) {
      throw new Error("Terminal site build failed");
    }

    // Phase 3: Asset Management
    await copyStaticAssets();

    // Phase 4: Metadata Generation
    await generateBuildManifest();
    await generateBuildStatistics();

    // Phase 5: Validation
    const isValid = await validateBuildOutput();
    if (!isValid) {
      throw new Error("Build validation failed");
    }

    const totalDuration = ((performance.now() - buildStart) / 1000).toFixed(2);

    console.log(
      "\n================================================================================",
    );
    console.log(`[SUCCESS] Build completed successfully in ${totalDuration}s`);
    console.log(`[OUTPUT] ${BUILD_CONFIG.outdir}/`);
    console.log(
      "================================================================================\n",
    );
  } catch (error) {
    const totalDuration = ((performance.now() - buildStart) / 1000).toFixed(2);

    console.error(
      "\n================================================================================",
    );
    console.error(`[FAILURE] Build failed after ${totalDuration}s`);
    console.error(
      "================================================================================",
    );
    logger.error("Build process encountered an error", error);

    process.exit(1);
  }
}

// Execute build process
main();
