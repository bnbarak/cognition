#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { parseGitDiff } from "./parser";
import { generateDiff } from "./git-diff";

function printUsage(): void {
  console.error("Usage: diff-analyzer <diff-file> [--pretty]");
  console.error("       diff-analyzer --pr <number> [--base <branch>] [--repo <path>] [--pretty]");
  console.error("       diff-analyzer --branch <name> [--base <branch>] [--repo <path>] [--pretty]");
  console.error("");
  console.error("Parses a unified diff and outputs structured JSON.");
  console.error("");
  console.error("Modes:");
  console.error("  <diff-file>       Read diff from a file (or - for stdin)");
  console.error("  --pr <number>     Generate diff from a GitHub PR number");
  console.error("  --branch <name>   Generate diff from a branch name");
  console.error("");
  console.error("Options:");
  console.error("  --base <branch>   Base branch to diff against (default: main)");
  console.error("  --repo <path>     Path to the git repository (default: cwd)");
  console.error("  --pretty          Pretty-print JSON output");
  process.exit(1);
}

interface CliArgs {
  diffPath: string | null;
  pr: number | null;
  branch: string | null;
  base: string;
  repo: string;
  pretty: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    diffPath: null,
    pr: null,
    branch: null,
    base: "main",
    repo: process.cwd(),
    pretty: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--pretty") {
      args.pretty = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
    } else if (arg === "--pr") {
      i++;
      if (i >= argv.length) {
        console.error("Error: --pr requires a PR number");
        process.exit(1);
      }
      const num = parseInt(argv[i], 10);
      if (isNaN(num) || num <= 0) {
        console.error(`Error: invalid PR number: ${argv[i]}`);
        process.exit(1);
      }
      args.pr = num;
    } else if (arg === "--branch") {
      i++;
      if (i >= argv.length) {
        console.error("Error: --branch requires a branch name");
        process.exit(1);
      }
      args.branch = argv[i];
    } else if (arg === "--base") {
      i++;
      if (i >= argv.length) {
        console.error("Error: --base requires a branch name");
        process.exit(1);
      }
      args.base = argv[i];
    } else if (arg === "--repo") {
      i++;
      if (i >= argv.length) {
        console.error("Error: --repo requires a path");
        process.exit(1);
      }
      args.repo = path.resolve(argv[i]);
    } else if (!args.diffPath) {
      args.diffPath = arg;
    } else {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
    }

    i++;
  }

  return args;
}

function main(): void {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    printUsage();
  }

  const args = parseArgs(argv);

  // Validate: exactly one input mode
  const modes = [args.diffPath, args.pr, args.branch].filter((m) => m !== null);
  if (modes.length === 0) {
    console.error("Error: specify a diff file, --pr, or --branch");
    printUsage();
    return;
  }
  if (modes.length > 1) {
    console.error("Error: specify only one of: diff file, --pr, or --branch");
    printUsage();
    return;
  }

  let diffText: string;

  if (args.pr !== null || args.branch !== null) {
    // Git diff generation mode
    try {
      diffText = generateDiff({
        pr: args.pr ?? undefined,
        branch: args.branch ?? undefined,
        base: args.base,
        cwd: args.repo,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error generating diff: ${message}`);
      process.exit(1);
    }
  } else if (args.diffPath === "-") {
    diffText = fs.readFileSync(0, "utf-8");
  } else {
    const resolved = path.resolve(args.diffPath!);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: file not found: ${resolved}`);
      process.exit(1);
    }
    diffText = fs.readFileSync(resolved, "utf-8");
  }

  const result = parseGitDiff(diffText);

  const indent = args.pretty ? 2 : undefined;
  console.log(JSON.stringify(result, null, indent));
}

main();
