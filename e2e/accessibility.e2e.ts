import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./support";

async function violations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return result.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
}

async function onboard(page: Page, path = "/?tour=off"): Promise<void> {
  await page.goto(path);
  await page.getByRole("button", { name: "Start the workshop" }).click();
  await expect(page.getByRole("navigation", { name: "Course" })).toBeVisible();
}

test("onboarding has no accessibility violations", async ({ page }) => {
  await page.goto("/?tour=off");
  await expect(
    page.getByRole("heading", { name: /language should the course speak/i }),
  ).toBeVisible();
  await page.waitForTimeout(600);

  expect(await violations(page)).toEqual([]);
});

test("the wall and its narration have none", { tag: "@smoke" }, async ({ page }) => {
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

test("in the dark theme, every step of the context map and the architecture has none", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await onboard(page, "/?theme=dark&tour=off");
  const rail = page.getByRole("navigation", { name: "Course" });
  const found: string[] = [];

  for (const title of [/Context map/, /Architecture/]) {
    await rail.getByRole("button", { name: title }).click();
    const next = page.getByRole("button", { name: /^Next step/ });
    for (let step = 0; ; step += 1) {
      await page.waitForTimeout(1300);
      for (const violation of await violations(page))
        found.push(`${title.source}, step ${step + 1}: ${violation.slice(0, 200)}`);
      if (!(await next.isEnabled())) break;
      await next.click();
    }
  }

  expect(found).toEqual([]);
});

test("every stop of the guide has none", async ({ page }) => {
  await onboard(page, "/?tour=on");
  const guide = page.getByRole("dialog");
  const found: string[] = [];

  for (let stop = 1; (await guide.count()) > 0; stop += 1) {
    await page.waitForTimeout(500);
    for (const violation of await violations(page)) found.push(`stop ${stop}: ${violation}`);
    await guide.getByRole("button").last().click();
  }

  expect(found).toEqual([]);
});
