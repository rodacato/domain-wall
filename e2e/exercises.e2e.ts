import type { Page } from "@playwright/test";
import {
  expect,
  finishOnboarding,
  goToLastStep,
  openModule,
  packFile,
  test,
  type PackContext,
  type PackEvent,
} from "./support";

const ZONE_TITLES = { core: "Core domain", supporting: "Supporting", generic: "Generic" } as const;

async function openExercise(page: Page, module: string): Promise<void> {
  await finishOnboarding(page);
  await openModule(page, module);
  await goToLastStep(page);
}

test(
  "a classification waits for every answer, then marks each one and explains the wrong ones",
  {
    tag: "@smoke",
  },
  async ({ page }) => {
    await openExercise(page, "Subdomains");
    await expect(page.getByRole("heading", { name: /Core, supporting or generic/ })).toBeVisible();
    const check = page.getByRole("button", { name: "Check" });
    await expect(check).toBeDisabled();

    const rows = page.locator(".classify__row");
    for (const row of await rows.all()) await row.getByRole("button").first().click();
    await expect(check).toBeEnabled();
    await check.click();

    await expect(page.getByText(/not in the right place yet/)).toBeVisible();
    await expect(rows.locator(".feedback")).toHaveCount(await rows.count());
    const wrong = page.locator(".classify__row--wrong");
    await expect(wrong.first()).toBeVisible();
    for (const row of await wrong.all()) {
      await expect(row.getByText("✗ Not yet")).toBeVisible();
      await expect(row.locator(".feedback__hint")).not.toBeEmpty();
    }
    for (const row of await page.locator(".classify__row--right").all()) {
      await expect(row.getByText("✓ Right")).toBeVisible();
      await expect(row.locator(".feedback__hint")).toHaveCount(0);
    }
  },
);

test("the right subdomains are accepted and every one keeps its reason", async ({ page }) => {
  await openExercise(page, "Subdomains");
  const { contexts } = packFile("hecho-a-mano", "20-strategy.json") as { contexts: PackContext[] };

  for (const context of contexts) {
    await page
      .getByRole("group", { name: context.label.en })
      .getByRole("button", { name: ZONE_TITLES[context.subdomain.type] })
      .click();
  }
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByText(/^Everything is in place/)).toBeVisible();
  await expect(page.locator(".classify__row--wrong")).toHaveCount(0);
  await expect(page.locator(".feedback__hint")).toHaveCount(contexts.length);
  await expect(page.locator(".exercise__badge")).toHaveText("Solved");
});

test("events out of order say which way to move, and the order of the process is accepted", async ({
  page,
}) => {
  await openExercise(page, "Event Storming");
  await expect(page.getByRole("heading", { name: "Put the events in order" })).toBeVisible();
  const check = page.getByRole("button", { name: "Check" });

  await check.click();
  await expect(page.getByText(/not in the right place yet/)).toBeVisible();
  for (const row of await page.locator(".ordering__row.classify__row--wrong").all()) {
    await expect(row.locator(".feedback__hint")).toHaveText(/move it (up|down)/);
  }

  const { events } = packFile("hecho-a-mano", "10-event-storming.json") as { events: PackEvent[] };
  const sequenceOf = new Map(events.map((event) => [event.label.en, event.sequence]));
  const labels = page.locator(".ordering__row .mini");
  const shown = await labels.allInnerTexts();
  const wanted = [...shown].sort((a, b) => (sequenceOf.get(a) ?? 0) - (sequenceOf.get(b) ?? 0));
  for (const [target, label] of wanted.entries()) {
    let position = (await labels.allInnerTexts()).indexOf(label);
    while (position > target) {
      await page
        .locator(".ordering__row")
        .nth(position)
        .getByRole("button", { name: "Move up" })
        .click();
      position -= 1;
    }
  }
  await check.click();

  await expect(page.getByText(/^Everything is in place/)).toBeVisible();
  await expect(page.locator(".exercise__badge")).toHaveText("Solved");
});

for (const language of ["typescript", "python", "ruby", "ruby-dry"] as const) {
  test(
    `a code exercise in ${language} accepts the reference solution, checked but not run`,
    { tag: language === "typescript" ? "@smoke" : [] },
    async ({ page }) => {
      await finishOnboarding(page);
      await page.getByLabel(/^Code/).selectOption(language);
      await openModule(page, "Tactical building blocks");
      await goToLastStep(page);

      await page.getByRole("button", { name: "Show the reference" }).click();
      const reference = await page.locator(".codeboard__reference code").innerText();
      await page.getByLabel("Your code").fill(reference);
      await page.getByRole("button", { name: "Check" }).click();

      await expect(page.getByText("The syntax is valid")).toBeVisible();
      await expect(page.getByText("It uses the names the solution needs")).toBeVisible();
      await expect(
        page.getByText(
          "The syntax and the shape are checked here; the generated tests run in Dojo.",
        ),
      ).toBeVisible();
      await expect(page.locator(".exercise__badge")).toHaveText("Checked, not run");
    },
  );
}

test("an answer made only of comments is not accepted", async ({ page }) => {
  await openExercise(page, "Tactical building blocks");

  await page.getByRole("button", { name: "Show the reference" }).click();
  const reference = await page.locator(".codeboard__reference code").innerText();
  const commented = reference
    .split("\n")
    .map((line) => `// ${line}`)
    .join("\n");
  await page.getByLabel("Your code").fill(commented);
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByText("Write your code: the note and comments do not count")).toBeVisible();
  await expect(page.locator(".exercise__badge")).toHaveCount(0);
});
