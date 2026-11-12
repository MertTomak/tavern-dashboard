import { expect, test } from "@playwright/test";

test("dashboard shell loads and filters are kept in the URL", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Genel Bakış" })).toBeVisible();
  await page.getByLabel("Mod").click();
  await page.getByRole("option", { name: "Dereceli" }).click();
  await expect(page).toHaveURL(/mode=RANKED/);
});
