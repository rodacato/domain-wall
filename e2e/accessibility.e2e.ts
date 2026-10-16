import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function violations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return result.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
}

async function onboard(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the course" }).click();
  await expect(page.getByRole("navigation", { name: "Course" })).toBeVisible();
}

test("onboarding has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /language should the course speak/i }),
  ).toBeVisible();
  await page.waitForTimeout(600);

  expect(await violations(page)).toEqual([]);
});

test("the wall and its narration have none", async ({ page }) => {
  await onboard(page);
  await page.waitForTimeout(1500);

  expect(await violations(page)).toEqual([]);
});

test("the code stage has none", async ({ page }) => {
  await onboard(page);
  await page
    .getByRole("navigation", { name: "Course" })
    .getByRole("button", { name: /Tactical building blocks/ })
    .click();
  await page.waitForTimeout(1500);

  expect(await violations(page)).toEqual([]);
});

test("every step of every module has none", async ({ page }) => {
  test.setTimeout(240_000);
  await onboard(page);
  const rail = page.getByRole("navigation", { name: "Course" });
  const modules = await rail.getByRole("button").count();
  const found: string[] = [];

  for (let module = 0; module < modules; module += 1) {
    await rail.getByRole("button").nth(module).click();
    const next = page.getByRole("button", { name: /^Next step/ });
    for (let step = 0; ; step += 1) {
      await page.waitForTimeout(1300);
      for (const violation of await violations(page))
        found.push(`module ${module + 1}, step ${step + 1}: ${violation.slice(0, 200)}`);
      if (!(await next.isEnabled())) break;
      await next.click();
    }
  }

  expect(found).toEqual([]);
});
