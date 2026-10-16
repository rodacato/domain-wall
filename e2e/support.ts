import { readFileSync } from "node:fs";
import { expect, test as base, type FrameLocator, type Page } from "@playwright/test";

/** Every test fails when the page throws or logs an error, even if what it asserts still shows. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await use(page);
    expect(errors, "errors raised by the page").toEqual([]);
  },
});

export { expect };

export async function finishOnboarding(
  page: Page,
  options: { industry?: string; path?: string } = {},
): Promise<void> {
  await page.goto(options.path ?? "/?tour=off");
  await expect(
    page.getByRole("heading", { name: /language should the course speak/i }),
  ).toBeVisible();
  if (options.industry !== undefined) {
    await page.getByRole("button", { name: new RegExp(options.industry) }).click();
  }
  await page.getByRole("button", { name: "Start the workshop" }).click();
  await expect(page.getByRole("navigation", { name: "Course" })).toBeVisible();
}

export async function openModule(page: Page, title: string | RegExp): Promise<void> {
  await page
    .getByRole("navigation", { name: "Course" })
    .getByRole("button", { name: typeof title === "string" ? new RegExp(title) : title })
    .click();
}

/** Whether the player shows the last step of its module, in either language. */
export async function atLastStep(page: Page | FrameLocator): Promise<boolean> {
  const position = await page.locator(".player__position").innerText();
  const [current, total] = (position.match(/\d+/g) ?? []).map(Number);
  return current !== undefined && current === total;
}

export async function goToLastStep(page: Page | FrameLocator): Promise<void> {
  const next = page.getByRole("button", { name: /^Next step/ });
  while (!(await atLastStep(page))) await next.click();
}

interface Labeled {
  readonly label: { readonly en: string };
}

/** Reads one file of a pack, so a test can derive the right answers the same way the course does. */
export function packFile(pack: string, file: string): unknown {
  const directory = pack === "hecho-a-mano" ? "packs/hecho-a-mano" : `packs/presets/${pack}`;
  return JSON.parse(readFileSync(`${directory}/${file}`, "utf8"));
}

export interface PackContext extends Labeled {
  readonly subdomain: { readonly type: "core" | "supporting" | "generic" };
}

export interface PackEvent extends Labeled {
  readonly sequence: number;
}

export const PACKS = ["hecho-a-mano", "clinic", "education", "fintech", "logistics"].map(
  (pack) => ({
    pack,
    name: (packFile(pack, "00-meta.json") as { business: { name: { en: string } } }).business.name
      .en,
  }),
);
