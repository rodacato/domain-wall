import { expect, test, type Page } from "@playwright/test";

async function finishOnboarding(page: Page, options: { industry?: string } = {}): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /language should the course speak/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  if (options.industry !== undefined) {
    await page.getByRole("button", { name: new RegExp(options.industry) }).click();
  }
  await page.getByRole("button", { name: "Start the course" }).click();
  await expect(page.getByRole("navigation", { name: "Course" })).toBeVisible();
}

async function openModule(page: Page, title: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Course" })
    .getByRole("button", { name: new RegExp(title) })
    .click();
}

async function goToLastStep(page: Page): Promise<void> {
  const next = page.getByRole("button", { name: /^Next step/ });
  while (await next.isEnabled()) await next.click();
}

test("a first visit asks three questions and then plays the course", async ({ page }) => {
  await finishOnboarding(page);

  await expect(page.getByRole("heading", { name: "Cost of change" })).toBeVisible();
  await page.getByRole("button", { name: /^Next step/ }).click();
  await expect(page.getByText("Step 2 of")).toBeVisible();
});

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

test("a curated industry changes the whole course", async ({ page }) => {
  await finishOnboarding(page, { industry: "Neighborhood Clinic" });

  await expect(page.getByRole("button", { name: "Neighborhood Clinic" })).toBeVisible();
  await expect(page.getByText(/Void invoice|Issue invoice/).first()).toBeVisible();
});

test("an exercise without code waits for every answer and then says how it went", async ({
  page,
}) => {
  await finishOnboarding(page);
  await openModule(page, "Subdomains");
  await goToLastStep(page);

  await expect(page.getByRole("heading", { name: /Core, supporting or generic/ })).toBeVisible();
  const check = page.getByRole("button", { name: "Check" });
  await expect(check).toBeDisabled();

  for (const row of await page.locator(".classify__row").all()) {
    await row.getByRole("button").first().click();
  }
  await expect(check).toBeEnabled();
  await check.click();

  await expect(page.getByText(/not in the right place yet|That is right/)).toBeVisible();
});

test("a code exercise accepts the reference solution", async ({ page }) => {
  await finishOnboarding(page);
  await openModule(page, "Tactical building blocks");
  await goToLastStep(page);

  await page.getByRole("button", { name: "Show the reference" }).click();
  const reference = await page.locator(".codeboard__reference code").innerText();
  await page.getByLabel("Your code").fill(reference);
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByText("The syntax is valid")).toBeVisible();
  await expect(page.getByText("Solved")).toBeVisible();
});

test("the demo plays the course by itself", async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole("button", { name: /Demo/ }).click();

  await expect(page.getByRole("button", { name: /Pause/ })).toBeVisible();
  await expect(page.getByText("Step 2 of")).toBeVisible({ timeout: 15_000 });
});
