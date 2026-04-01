import { FileClassification } from "./types";

interface ClassificationRule {
  pattern: RegExp;
  classification: FileClassification;
}

const RULES: ClassificationRule[] = [
  { pattern: /^javascript\/src\/routes\/.*\.ts$/, classification: "route" },
  { pattern: /^java\/.*\/controller\/.*\.java$/, classification: "route" },
  { pattern: /^javascript\/src\/types\/.*\.ts$/, classification: "type" },
  { pattern: /^java\/.*\/model\/.*\.java$/, classification: "type" },
  { pattern: /^specs\/.*\.json$/, classification: "spec" },
  { pattern: /^docs\/.*\.md$/, classification: "doc" },
  { pattern: /^javascript\/src\/app\.ts$/, classification: "config" },
  { pattern: /^docs\/mkdocs\.yml$/, classification: "config" },
  { pattern: /^java\/pom\.xml$/, classification: "config" },
  { pattern: /^AGENTS\.md$/, classification: "config" },
  { pattern: /^domain-map\.yaml$/, classification: "config" },
];

export function classifyFile(path: string): FileClassification {
  for (const rule of RULES) {
    if (rule.pattern.test(path)) {
      return rule.classification;
    }
  }
  return "unknown";
}
