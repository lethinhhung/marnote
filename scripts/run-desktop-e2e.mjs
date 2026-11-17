import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const home = await mkdtemp(join(tmpdir(), "marnote-desktop-e2e-"));
await mkdir("artifacts/desktop-e2e", { recursive: true });
const child = spawn(join(process.cwd(), "node_modules/.bin/wdio"), ["run", "wdio.desktop.conf.ts"], {
  stdio: "inherit",
  env: { ...process.env, HOME: home },
});
child.on("exit", async (code) => {
  await rm(home, { recursive: true, force: true });
  process.exitCode = code ?? 1;
});
child.on("error", async (error) => {
  console.error(error);
  await rm(home, { recursive: true, force: true });
  process.exitCode = 1;
});
