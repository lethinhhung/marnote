import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import http from "node:http";

const server = spawn("pnpm", ["exec", "vite", "--host", "127.0.0.1"], { stdio: "ignore" });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await new Promise((resolve) => {
        const req = http.get("http://127.0.0.1:5173", (res) => {
          resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(1000, () => { req.destroy(); resolve(false); });
      });
      ready = true;
    } catch { /* server starting */ }
    if (ready) break;
    await delay(200);
  }
  assert(ready, "web dev server did not start");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("button", { name: "New folder" }).click();
  await page.getByRole("textbox", { name: "Folder name" }).fill("Projects");
  await page.getByRole("textbox", { name: "Folder name" }).press("Enter");
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: "New folder" }).click();
  await page.getByRole("textbox", { name: "Folder name" }).fill("Research");
  await page.getByRole("textbox", { name: "Folder name" }).press("Enter");
  await page.getByRole("button", { name: "Research" }).click();
  await page.getByRole("button", { name: "New Markdown note" }).click();
  await page.getByRole("textbox", { name: "Note name" }).fill("Findings");
  await page.getByRole("textbox", { name: "Note name" }).press("Enter");
  await page.getByRole("textbox", { name: "Markdown note editor" }).waitFor();

  await context.setOffline(true);
  const editor = page.getByRole("textbox", { name: "Markdown note editor" });
  await editor.fill("# Offline acceptance\n\nA searchable browser note.");
  await page.getByText("Saved", { exact: true }).waitFor({ timeout: 5000 });
  await context.setOffline(false);
  await page.reload();
  await editor.waitFor();
  assert.match(await editor.innerText(), /Offline acceptance/);
  assert.match(await page.locator(".address-location").innerText(), /Projects.*Research.*Findings/);

  await page.getByRole("button", { name: "Toggle Markdown source view" }).click();
  assert.match(await page.getByLabel("Markdown source").innerText(), /# Offline acceptance/);
  await page.getByRole("button", { name: "Toggle Markdown source view" }).click();
  await page.getByRole("button", { name: "Search workspace" }).click();
  await page.getByRole("textbox", { name: /Search/ }).fill("Offline acceptance");
  await page.getByText("Findings", { exact: true }).last().waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Copy note link or path" }).click();
  await page.getByRole("menuitem", { name: "Copy internal link" }).waitFor();
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
