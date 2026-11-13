import { describe, expect, it } from "vitest";
import { DEFAULT_EFFECTS, effectsFlags, effectsLevelSchema } from "@/lib/effects";

describe("effects levels", () => {
  it("Full runs everything", () => {
    expect(effectsFlags("FULL")).toEqual({ motion: true, rich: true });
  });

  it("Light keeps the transitions but drops the shader, embers and blur", () => {
    expect(effectsFlags("LIGHT")).toEqual({ motion: true, rich: false });
  });

  it("Off drops both", () => {
    expect(effectsFlags("OFF")).toEqual({ motion: false, rich: false });
  });

  it("defaults to Full and rejects unknown values", () => {
    expect(DEFAULT_EFFECTS).toBe("FULL");
    expect(effectsLevelSchema.safeParse("ULTRA").success).toBe(false);
  });
});
