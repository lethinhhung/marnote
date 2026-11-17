describe("workspace note workflow", () => {
  it("creates and edits a Markdown note in the desktop app", async () => {
    const welcome = await $("h1#empty-note-title");
    await expect(welcome).toHaveText("Nothing open yet");
    await $("button.empty-note-create").click();

    const name = `Desktop QA ${Date.now()}`;
    const nameInput = await $("input[aria-label='Note name']");
    await nameInput.setValue(name);
    await browser.execute(() => {
      document.querySelector<HTMLFormElement>("input[aria-label='Note name']")?.form?.requestSubmit();
    });

    const editor = await $("[aria-label='Markdown note editor']");
    await editor.waitForDisplayed();
    await editor.setValue("# Desktop workflow\n\nCreated through the native app.");
    await expect($(".note-footer-save")).toHaveText("Saved");
    await expect($(`button[aria-label="${name}.md"]`)).toBeDisplayed();
  });
});
