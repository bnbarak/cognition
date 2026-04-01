#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { parseGitDiff } from "./parser";

function printUsage(): void {
  console.error("Usage: diff-analyzer <diff-file> [--pretty]");
  console.error("");
  console.error("Parses a unified diff file and outputs structured JSON.");
  console.error("");
  console.error("Arguments:");
  console.error("  <diff-file>   Path to a unified diff file (or - for stdin)");
  console.error("  --pretty      Pretty-print JSON output");
  process.exit(1);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
  }

  let diffPath: string | null = null;
  let pretty = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pretty") {
      pretty = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
    } else if (!diffPath) {
      diffPath = args[i];
    } else {
      console.error(`Unknown argument: ${args[i]}`);
      printUsage();
    }
  }

  if (!diffPath) {
    console.error("Error: diff file path is required");
    printUsage();
    return;
  }

  let diffText: string;
  if (diffPath === "-") {
    diffText = fs.readFileSync(0, "utf-8");
  } else {
    const resolved = path.resolve(diffPath);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: file not found: ${resolved}`);
      process.exit(1);
    }
    diffText = fs.readFileSync(resolved, "utf-8");
  }

  const result = parseGitDiff(diffText);

  const indent = pretty ? 2 : undefined;
  console.log(JSON.stringify(result, null, indent));
}

main();
