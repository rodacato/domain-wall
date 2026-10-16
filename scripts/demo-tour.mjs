// The README demo: onboarding, then the course's own Demo mode plays the wall. Recorded by record-demo.mjs.
export const launchOptions = {};

export default async function tour(page) {
  const pause = (ms) => page.waitForTimeout(ms);

  await page.getByRole("heading", { name: /language should the course speak/i }).waitFor();
  await pause(1500);
  await page.getByRole("button", { name: "Next" }).click();
  await pause(1200);
  await page.getByRole("button", { name: "Next" }).click();
  await pause(1500);
  await page.getByRole("button", { name: "Start the course" }).click();
  await page.getByRole("navigation", { name: "Course" }).waitFor();
  await pause(2000);
  await page.getByRole("button", { name: /Demo/ }).click();
  await pause(30000);
}
