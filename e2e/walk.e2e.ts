import type { Page } from "@playwright/test";
import { expect, finishOnboarding, PACKS, test } from "./support";

interface Words {
  readonly course: string;
  readonly next: RegExp;
  readonly position: (current: number) => RegExp;
}

const ENGLISH: Words = {
  course: "Course",
  next: /^Next step/,
  position: (current) => new RegExp(`^Step ${current} of \\d+$`),
};

/** Visits every step of every module; the support fixture fails the test if any of them throws. */
async function walkEveryStep(page: Page, words: Words): Promise<number> {
  const modules = page.getByRole("navigation", { name: words.course }).getByRole("button");
  const next = page.getByRole("button", { name: words.next });
  let visited = 0;

  for (let module = 0; module < (await modules.count()); module += 1) {
    await modules.nth(module).click();
    for (let step = 1; ; step += 1) {
      await expect(page.locator(".player__position")).toHaveText(words.position(step));
      await expect(page.locator(".narration")).not.toBeEmpty();
      visited += 1;
      if (!(await next.isEnabled())) break;
      await next.click();
    }
    await expect(page.locator(".exercise__title")).toBeVisible();
  }
  return visited;
}

for (const { pack, name } of PACKS) {
  test(`with ${name}, every step of every module renders and ends in its exercise`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await finishOnboarding(page, { industry: name });
    await expect(page.locator(".app__business-name")).toHaveText(name);

    expect(await walkEveryStep(page, ENGLISH), pack).toBeGreaterThan(40);
  });
}

test("in Spanish, every step of every module renders", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/?tour=off");
  await page.getByRole("button", { name: /Español/ }).click();
  await page.getByRole("button", { name: "Empezar el taller" }).click();

  const visited = await walkEveryStep(page, {
    course: "Curso",
    next: /^Siguiente paso/,
    position: (current) => new RegExp(`^Paso ${current} de \\d+$`),
  });
  expect(visited).toBeGreaterThan(40);
});
