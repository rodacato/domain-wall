import { expect, finishOnboarding, goToLastStep, openModule, test } from "./support";

test(
  "the cover starts the course and the player moves through it",
  { tag: "@smoke" },
  async ({ page }) => {
    await finishOnboarding(page);

    await expect(page.getByRole("heading", { name: "Cost of change" })).toBeVisible();
    await page.getByRole("button", { name: /^Next step/ }).click();
    await expect(page.getByText("Step 2 of")).toBeVisible();
    await page.getByRole("button", { name: /Previous step/ }).click();
    await expect(page.getByText("Step 1 of")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Step 2 of")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Step 1 of")).toBeVisible();
  },
);

test(
  "every module opens on its first step with its narration",
  { tag: "@smoke" },
  async ({ page }) => {
    await finishOnboarding(page);
    const modules = page.getByRole("navigation", { name: "Course" }).getByRole("button");

    for (let module = 0; module < (await modules.count()); module += 1) {
      await modules.nth(module).click();
      await expect(modules.nth(module)).toHaveAttribute("aria-current", "true");
      await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible();
      await expect(page.locator(".narration")).not.toBeEmpty();
    }
  },
);

test("changing the language keeps the progress and translates the course", async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole("button", { name: /^Next step/ }).click();
  const rail = page.getByRole("navigation", { name: "Course" });
  await expect(rail.getByText("2/4").first()).toBeVisible();

  await page.getByLabel("Language").selectOption("es-MX");

  await expect(page.getByRole("button", { name: "Siguiente paso →" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Curso" }).getByText("2/4").first(),
  ).toBeVisible();
});

test("choices and progress survive a reload", async ({ page }) => {
  await finishOnboarding(page, { industry: "Neighborhood Clinic" });
  await page.getByLabel(/^Code/).selectOption("ruby");
  await page.getByRole("button", { name: /^Next step/ }).click();
  await page.getByLabel("Language").selectOption("es-MX");

  await page.reload();

  const rail = page.getByRole("navigation", { name: "Curso" });
  await expect(rail).toBeVisible();
  await expect(page.locator(".app__business-name")).toHaveText("Clínica Vecinal");
  await expect(page.getByLabel(/^Código/)).toHaveValue("ruby");
  await expect(rail.getByText("2/4").first()).toBeVisible();
});

test("the arrow keys move the course but not while typing code", async ({ page }) => {
  await finishOnboarding(page);
  await openModule(page, "Tactical building blocks");
  await goToLastStep(page);
  const position = page.locator(".player__position");
  const before = await position.innerText();

  const editor = page.getByLabel("Your code");
  await editor.click();
  await editor.press("ArrowLeft");
  await editor.press("ArrowRight");

  await expect(position).toHaveText(before);
});

test("the demo plays the course by itself and stops when asked", async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole("button", { name: /Demo/ }).click();

  await expect(page.getByRole("button", { name: /Pause/ })).toBeVisible();
  await expect(page.getByText("Step 2 of")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Pause/ }).click();
  await expect(page.getByRole("button", { name: /Demo/ })).toBeVisible();
});

test("describing a business generates one, checks it, sends a pass back and then teaches with it", async ({
  page,
}) => {
  await page.goto("/?tour=off");

  await page.getByRole("button", { name: /Describe your business/ }).click();
  await page
    .getByLabel("Describe your business")
    .fill("A neighborhood clinic where people book visits");
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  await expect(page.getByText(/Sent back to “Model”/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/is ready: it passed every check/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Learn with this business" }).click();
  await page.getByRole("button", { name: "Start the workshop" }).click();

  await expect(page.getByRole("button", { name: "Neighborhood Clinic" })).toBeVisible();
});
