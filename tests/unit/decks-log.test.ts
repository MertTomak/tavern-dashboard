import { describe, expect, it } from "vitest";
import { DecksLogReader } from "@/lib/tracker/decks-log";

const CODE = "AAECAf0EBIoBnALJxgKZ0wIN7AKGBMsEnwfAwQKmzwKC4gL2uwOX0gOo0gOe1AOgBATLyAQA";

const feed = (lines: string[]) => {
  const r = new DecksLogReader();
  return lines.map((l) => r.feed(l)).filter((d) => d !== null);
};

describe("Decks.log", () => {
  it("reads the deck a game is queued with", () => {
    expect(
      feed([
        "I 21:40:02.1234567 Finding Game With Deck:",
        "I 21:40:02.1234567 ### Big Spell Mage",
        "I 21:40:02.1234567 # Deck ID: 1234567890",
        `I 21:40:02.1234567 ${CODE}`,
      ]),
    ).toEqual([{ clock: (21 * 3600 + 40 * 60 + 2) * 1000 + 123, name: "Big Spell Mage", code: CODE }]);
  });

  it("ignores the deck list printed at login", () => {
    expect(feed(["I 21:00:00.0000000 Deck Contents Received:", "I 21:00:00.0000000 ### Other", `I 21:00:00.0000000 ${CODE}`])).toEqual([]);
  });

  it("keeps only the newest of several queues", () => {
    const decks = feed([
      "D 21:40:02.1 Finding Game With Deck:",
      "D 21:40:02.1 ### First",
      `D 21:40:02.1 ${CODE}`,
      "D 21:50:00.1 Finding Game With Deck:",
      "D 21:50:00.1 ### Second",
      "D 21:50:00.1 # Deck ID: 1",
      `D 21:50:00.1 ${CODE}`,
    ]);
    expect(decks.map((d) => d.name)).toEqual(["First", "Second"]);
  });
});
