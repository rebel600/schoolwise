/**
 * Conventional Commits — see docs/04-development-guidelines.md.
 *
 * Scopes are intentionally unrestricted: the package list is still growing,
 * and a stale scope allow-list blocks legitimate commits.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "refactor",
        "test",
        "chore",
        "perf",
        "build",
        "ci",
        "revert",
      ],
    ],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
    "body-max-line-length": [0],
  },
};
