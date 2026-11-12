import { expect, test } from "@playwright/test";

test("dashboard shell loads and filters are kept in the URL", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.getByLabel("Mode").click();
  await page.getByRole("option", { name: "Ranked" }).click();
  await expect(page).toHaveURL(/mode=RANKED/);
});
