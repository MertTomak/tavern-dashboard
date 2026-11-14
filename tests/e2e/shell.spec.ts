import { expect, test } from "@playwright/test";

test("dashboard shell loads and filters are kept in the URL", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.getByLabel("Mode").click();
  await page.getByRole("option", { name: "Ranked" }).click();
  await expect(page).toHaveURL(/mode=RANKED/);
});

test("'All time' range is kept in the URL (not treated as the default)", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Date range").click();
  await page.getByRole("option", { name: "All time" }).click();
  await expect(page).toHaveURL(/range=all/);
});

test("overview shows the hero, last games, hand and matchups", async ({ page }) => {
  await page.goto("/?range=all");
  const empty = page.getByRole("heading", { name: "No games yet" });
  test.skip(await empty.isVisible(), "No games in the local database");
  await expect(page.getByRole("region", { name: "Win rate" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Last games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your hand" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Matchups" })).toBeVisible();
});

test("unbuilt pages say when they open and link back", async ({ page }) => {
  await page.goto("/arena");
  await expect(page.getByText("Opens in Phase 6").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Overview" })).toBeVisible();
});
