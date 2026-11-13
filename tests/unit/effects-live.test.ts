import { describe, expect, it } from "vitest";
import { effectiveEffects } from "@/lib/live/game-state";

describe("effects while a game is in progress", () => {
  it("drops Full to Light during a game and leaves other levels alone", () => {
    expect(effectiveEffects("FULL", true)).toBe("LIGHT");
    expect(effectiveEffects("FULL", false)).toBe("FULL");
    expect(effectiveEffects("OFF", true)).toBe("OFF");
    expect(effectiveEffects("LIGHT", true)).toBe("LIGHT");
  });
});
