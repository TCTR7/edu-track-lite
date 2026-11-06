import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const env = { ...process.env };
const args = [];
for (const arg of process.argv.slice(2)) {
  if (arg === "--ai") env.AI_AGENT = "1";
  else if (arg === "--headless") env.E2E_HEADLESS = "1";
  else if (arg === "--mobile") env.E2E_MOBILE = "1";
  else if (arg === "--fresh") env.E2E_FRESH_SERVER = "1";
  else args.push(arg);
}

// Launch Node directly: no shell quoting or platform-specific env syntax.
const child = spawn(process.execPath, [require.resolve("@playwright/test/cli"), "test", ...args], {
  stdio: "inherit",
  env,
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
