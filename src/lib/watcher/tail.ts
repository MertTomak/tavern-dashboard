import fs from "node:fs";

/**
 * Reads a growing text file line by line from a byte offset onwards. Each
 * call to read() hands over the complete lines written since the last call;
 * a half-written last line waits for the next call. If the file shrinks it
 * was replaced, and reading starts over (onReset).
 */
export class TailReader {
  private pos: number;
  private leftover = Buffer.alloc(0);
  private busy = false;

  constructor(
    readonly file: string,
    start: number,
    private readonly onLine: (line: string, endOffset: number) => void,
    private readonly onReset: () => void = () => undefined,
  ) {
    this.pos = start;
  }

  /** Returns false when there was nothing to read (or a read is already running). */
  async read(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    try {
      const size = (await fs.promises.stat(this.file)).size;
      if (size < this.pos) {
        this.pos = 0;
        this.leftover = Buffer.alloc(0);
        this.onReset();
      }
      if (size === this.pos) return false;
      const fd = await fs.promises.open(this.file, "r");
      try {
        const chunk = Buffer.alloc(size - this.pos);
        await fd.read(chunk, 0, chunk.length, this.pos);
        const buf = Buffer.concat([this.leftover, chunk]);
        const base = this.pos - this.leftover.length;
        let lineStart = 0;
        for (let nl = buf.indexOf(10); nl !== -1; nl = buf.indexOf(10, lineStart)) {
          const raw = buf.subarray(lineStart, nl).toString("utf8");
          lineStart = nl + 1;
          this.onLine(raw.endsWith("\r") ? raw.slice(0, -1) : raw, base + lineStart);
        }
        this.leftover = Buffer.from(buf.subarray(lineStart));
        this.pos = size;
      } finally {
        await fd.close();
      }
      return true;
    } finally {
      this.busy = false;
    }
  }
}
