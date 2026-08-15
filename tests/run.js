#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const TEST_DIRECTORY = __dirname;
const testFiles = fs.readdirSync(TEST_DIRECTORY)
  .filter((name) => name.endsWith(".test.js"))
  .sort()
  .map((name) => path.join(TEST_DIRECTORY, name));

if (testFiles.length === 0) {
  process.stderr.write("No test suites were found.\n");
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: path.resolve(TEST_DIRECTORY, ".."),
    stdio: "inherit"
  });

  if (result.error) {
    process.stderr.write(`${result.error.stack || result.error}\n`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status === null ? 1 : result.status;
  }
}
