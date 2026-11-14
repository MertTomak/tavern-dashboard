import { describe, expect, it } from "vitest";
import { fixLogConfig, logConfigChanges } from "@/lib/logs/log-config";

const POWER = "[Power]\nLogLevel=1\nFilePrinting=true\nConsolePrinting=false\nScreenPrinting=false\nVerbose=true\n";
const DECKS = "[Decks]\nLogLevel=1\nFilePrinting=true\nConsolePrinting=false\nScreenPrinting=false\nVerbose=false\n";

describe("log.config", () => {
  it("is fine when both sections are right", () => {
    expect(logConfigChanges(`${POWER}\n${DECKS}`)).toEqual([]);
  });

  it("adds a missing [Decks] section and keeps the rest", () => {
    const changes = logConfigChanges(POWER);
    expect(changes).toEqual([{ kind: "add-section", section: "Decks", lines: DECKS.trim().split("\n") }]);
    expect(fixLogConfig(POWER)).toBe(`${POWER}\n${DECKS}`);
  });

  it("writes both sections into an empty or missing file", () => {
    expect(fixLogConfig(null)).toBe(`${POWER}\n${DECKS}`);
    expect(logConfigChanges(fixLogConfig(""))).toEqual([]);
  });

  it("fixes wrong and missing keys in place without touching other sections", () => {
    const text = "[Achievements]\nLogLevel=1\n\n[Power]\nLogLevel=1\nFilePrinting=false\n\n[Zone]\nLogLevel=1\n";
    const fixed = fixLogConfig(text);
    expect(fixed).toContain("[Achievements]\nLogLevel=1\n\n[Power]\nLogLevel=1\nFilePrinting=true\nConsolePrinting=false\nScreenPrinting=false\nVerbose=true\n\n[Zone]\nLogLevel=1\n");
    expect(logConfigChanges(fixed)).toEqual([]);
  });

  it("accepts True/False in any case", () => {
    expect(logConfigChanges(`${POWER.replace("Verbose=true", "Verbose=True")}\n${DECKS}`)).toEqual([]);
  });
});
