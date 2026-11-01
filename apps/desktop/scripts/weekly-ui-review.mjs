import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const output = "artifacts/ui-review";
const workspace = {
  name: "Marnote Demo",
  path: "/demo",
  tags: { planning: "#526b58", research: "#7187a5" },
  entries: [
    { name: "Projects", path: "Projects", kind: "directory", children: [
      { name: "Roadmap.md", path: "Projects/Roadmap.md", kind: "file", modifiedMs: 1793500000000,
        metadata: { tags: ["planning"], favorite: true } },
    ] },
    { name: "Welcome.md", path: "Welcome.md", kind: "file", modifiedMs: 1793500000000 },
    { name: "Research.md", path: "Research.md", kind: "file", modifiedMs: 1793400000000,
      metadata: { tags: ["research"] } },
  ],
};
const contents = {
  "Welcome.md": "# Welcome to Marnote\n\nA calm place for notes that stay in your workspace.\n\n## Start here\n\n- Capture a thought\n- Organize it in a folder\n- Find it later with search\n",
  "Research.md": "# Research\n\nA few ideas to explore.\n\n| Topic | Next step |\n| --- | --- |\n| Search | Test a focused workflow |\n| Writing | Keep notes easy to scan |\n",
  "Projects/Roadmap.md": "# Roadmap\n\n## This week\n\n- Improve the writing flow\n- Review workspace navigation\n",
};

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const observations = { viewports: [], interactions: [], consoleErrors: [], pageErrors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  await page.addInitScript(({ workspace, contents }) => {
    window.isTauri = false;
    window.__TAURI_INTERNALS__ = { invoke: async (command, args = {}) => {
      if (command === "default_workspace" || command === "open_workspace" || command === "list_workspace_tree") return workspace;
      if (command === "file_read_markdown") return { path: args.path, content: contents[args.path] ?? "", modifiedMs: Date.now() };
      if (command === "file_list_trash") return [];
      if (command.startsWith("file_") || command.startsWith("folder_") || command.startsWith("save_") || command.startsWith("update_") || command.startsWith("rename_")) return undefined;
      throw new Error(`Unmocked Tauri command: ${command}`);
    } };
  }, { workspace, contents });
  page.on("console", message => { if (message.type() === "error") observations.consoleErrors.push(message.text()); });
  page.on("pageerror", error => observations.pageErrors.push(error.message));
  await page.goto("http://127.0.0.1:5173/");
  await page.getByRole("button", { name: "Welcome.md" }).waitFor();
  observations.viewports.push({ name: "desktop", width: 1440, height: 960 });
  await page.screenshot({ path: `${output}/desktop-home.png`, fullPage: true });
  await page.getByRole("button", { name: "Welcome.md" }).click();
  await page.getByRole("heading", { name: "Welcome to Marnote" }).waitFor();
  observations.interactions.push("Opened Welcome.md from the Explorer and rendered its Markdown note.");
  await page.screenshot({ path: `${output}/desktop-note.png`, fullPage: true });
  await page.setViewportSize({ width: 800, height: 900 });
  observations.viewports.push({ name: "narrow desktop", width: 800, height: 900 });
  await page.screenshot({ path: `${output}/narrow-note.png`, fullPage: true });
  observations.document = await page.evaluate(() => ({
    title: document.title,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    visibleText: document.body.innerText.slice(0, 5000),
  }));
  await writeFile(`${output}/browser-observations.json`, JSON.stringify(observations, null, 2));
} finally {
  await browser.close();
}
