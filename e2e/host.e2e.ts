import { expect, test } from "@playwright/test";

// The stand-in host is served from the same server, since browsers block public pages from embedding local ones.
const HOST_ORIGIN = "http://localhost:5192";

/** A page standing in for Dojo: it embeds the course, introduces itself and answers run requests. */
const HOST_PAGE = `<!doctype html><html><body>
<iframe id="course" style="width:1360px;height:860px;border:0" src="http://localhost:5192/?hostOrigin=${HOST_ORIGIN}"></iframe>
<script>
  const frame = document.getElementById("course");
  const received = [];
  window.received = received;
  const send = (type, payload) =>
    frame.contentWindow.postMessage({ source: "muro", protocol: 1, type, payload }, "*");
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message?.source !== "muro") return;
    received.push(message.type);
    if (message.type === "course:ready") {
      send("host:init", {
        locale: "en",
        programmingLanguage: "python",
        capabilities: { remoteExecution: true },
      });
    }
    if (message.type === "course:runRequested") {
      send("host:runResult", {
        requestId: message.payload.requestId,
        outcome: {
          kind: "executed",
          durationMs: 12,
          tests: [
            { name: "Order completes its happy path", status: "passed", message: null },
            { name: "Order rejects PlaceOrder", status: "passed", message: null },
          ],
        },
      });
    }
  });
</script></body></html>`;

test("embedded in a host, the course takes its choices and runs tests there", async ({ page }) => {
  await page.route(`${HOST_ORIGIN}/host`, (route) =>
    route.fulfill({ contentType: "text/html", body: HOST_PAGE }),
  );
  await page.goto(`${HOST_ORIGIN}/host`);
  const course = page.frameLocator("#course");

  await expect(course.getByRole("navigation", { name: "Course" })).toBeVisible();
  await expect(course.getByLabel("Code")).toHaveValue("python");

  await course
    .getByRole("navigation", { name: "Course" })
    .getByRole("button", { name: /Tactical building blocks/ })
    .click();
  const next = course.getByRole("button", { name: /^Next step/ });
  while (await next.isEnabled()) await next.click();
  await course.getByRole("button", { name: "Show the reference" }).click();
  const reference = await course.locator(".codeboard__reference code").innerText();
  await course.getByLabel("Your code").fill(reference);
  await course.getByRole("button", { name: "Run the tests" }).click();

  await expect(course.getByText("2 of 2 tests passed")).toBeVisible();
  const heard = await page.evaluate(() => (window as unknown as { received: string[] }).received);
  expect(heard).toContain("course:ready");
  expect(heard).toContain("course:runRequested");
  expect(heard).toContain("course:conceptCompleted");
});

test("a page that is not named as the host is ignored", async ({ page }) => {
  await page.route(`${HOST_ORIGIN}/host`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: HOST_PAGE.replace(`hostOrigin=${HOST_ORIGIN}`, "hostOrigin=http://localhost:9"),
    }),
  );
  await page.goto(`${HOST_ORIGIN}/host`);
  const course = page.frameLocator("#course");

  await expect(
    course.getByRole("heading", { name: /language should the course speak/i }),
  ).toBeVisible();
  await expect(course.getByLabel("Code")).toHaveCount(0);
});
