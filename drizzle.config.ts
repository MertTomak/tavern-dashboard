import { defineConfig } from "drizzle-kit";
import { DB_FILE } from "./src/lib/paths";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: DB_FILE },
});
