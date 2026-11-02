#!/usr/bin/env node
/**
 * test-runner.js
 * Node executable shim delegating to test-runner.ts via tsx.
 */

const { spawn } = require("child_process");
const path = require("path");

const runnerTsPath = path.resolve(__dirname, "test-runner.ts");
const projectDir = path.resolve(__dirname, "../../");

let command;
let args;

if (process.platform === "win32") {
  command = "cmd.exe";
  args = [
    "/c",
    "npx",
    "--prefix",
    "NYC-HACKATHON-ROUND-2-",
    "tsx",
    runnerTsPath,
    ...process.argv.slice(2),
  ];
} else {
  command = "npx";
  args = [
    "--prefix",
    "NYC-HACKATHON-ROUND-2-",
    "tsx",
    runnerTsPath,
    ...process.argv.slice(2),
  ];
}

const child = spawn(command, args, {
  cwd: projectDir,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
