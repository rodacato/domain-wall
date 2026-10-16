import type { Page } from "@playwright/test";
import { expect, finishOnboarding, test } from "./support";

const STOPS = [
  "The wall",
  "What is happening",
  "The ten modules",
  "Moving through the course",
  "Your choices",
];

function guide(page: Page) {
  return page.getByRole("dialog", { name: /./ });
}

test(
  "a first visit opens the guide; once closed it stays closed, and “?” opens it again",
  {
    tag: "@smoke",
  },
  async ({ page }) => {
    await finishOnboarding(page, { path: "/" });
    await expect(guide(page)).toBeVisible();
    await expect(guide(page).getByRole("heading", { name: "The wall" })).toBeVisible();
    await expect(guide(page).getByRole("button", { name: /^Next/ })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(guide(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "How to use the course" })).toBeFocused();

    await page.reload();
    await expect(page.getByRole("navigation", { name: "Course" })).toBeVisible();
    await expect(guide(page)).toHaveCount(0);

    await page.getByRole("button", { name: "How to use the course" }).click();
    await expect(guide(page)).toBeVisible();
  },
);

test("the guide visits every part of the course and its keys never move the course behind it", async ({
  page,
}) => {
  await finishOnboarding(page, { path: "/" });

  for (const [index, title] of STOPS.entries()) {
    await expect(guide(page).getByRole("heading", { name: title })).toBeVisible();
    await expect(guide(page).getByText(`Guide · ${index + 1} of ${STOPS.length}`)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Step 1 of")).toBeVisible();
    await guide(page)
      .getByRole("button", { name: index === STOPS.length - 1 ? "Start" : /^Next/ })
      .click();
  }

  await expect(guide(page)).toHaveCount(0);
});

test("the focus stays inside the guide while it is open", async ({ page }) => {
  await finishOnboarding(page, { path: "/" });
  await guide(page).getByRole("button", { name: /^Next/ }).click();

  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press("Tab");
    const inside = await guide(page).evaluate((card) => card.contains(document.activeElement));
    expect(inside).toBe(true);
  }
});

test("?tour=off never opens the guide and ?tour=on always does", async ({ page }) => {
  await finishOnboarding(page, { path: "/?tour=off" });
  await expect(guide(page)).toHaveCount(0);

  await page.goto("/?tour=on");
  await expect(guide(page)).toBeVisible();
  await guide(page).getByRole("button", { name: "Skip the guide" }).click();
  await page.reload();
  await expect(guide(page)).toBeVisible();
});
