/**
 * Paints the two faces of the 3D featured card onto canvases (used as textures).
 * Colours and fonts come from the CSS tokens at runtime, so the card matches the page.
 */

export type CardBackData = {
  name: string;
  set: string;
  featuredLabel: string;
  backTitle: string;
  rateLabel: string;
  rate: string;
  wins: string;
  losses: string;
  games: string;
  streakLabel: string;
  streak: string;
  streakResult: "WIN" | "LOSS" | null;
  appName: string;
};

/** Texture size; 5:7 like a real card. */
export const FACE_W = 1000;
export const FACE_H = 1400;
/** Corner radius as a share of the card width (matches the 3D outline). */
export const CORNER = 0.056;

type Tokens = Record<"parchment" | "inkMuted" | "brass" | "brassLight" | "brassDim" | "titleGold" | "oak" | "oakDeep" | "win" | "loss", string> & {
  display: string;
  stat: string;
};

function readTokens(): Tokens {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    parchment: v("--color-parchment", "#f3e6cc"),
    inkMuted: v("--color-ink-muted", "#bfae90"),
    brass: v("--color-brass", "#e0a84a"),
    brassLight: v("--color-brass-light", "#fbe3a4"),
    brassDim: v("--color-brass-dim", "#d9b877"),
    titleGold: v("--color-title-gold", "#f6d896"),
    oak: v("--color-oak", "#1c1410"),
    oakDeep: v("--color-oak-deep", "#120d0a"),
    win: v("--win", "#6dc5b0"),
    loss: v("--loss", "#ee7b52"),
    display: v("--font-fraunces", "Georgia, serif"),
    stat: v("--font-barlow-condensed", "system-ui, sans-serif"),
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** The brass frame shared by both faces: bevelled gold edge around an oak field. */
function frame(ctx: CanvasRenderingContext2D, k: Tokens) {
  const r = FACE_W * CORNER;
  const gold = ctx.createLinearGradient(0, 0, FACE_W, FACE_H);
  gold.addColorStop(0, k.brassLight);
  gold.addColorStop(0.28, k.brass);
  gold.addColorStop(0.52, "#6e4614");
  gold.addColorStop(0.74, k.brass);
  gold.addColorStop(1, k.brassLight);
  roundRect(ctx, 0, 0, FACE_W, FACE_H, r);
  ctx.fillStyle = gold;
  ctx.fill();
  roundRect(ctx, 26, 26, FACE_W - 52, FACE_H - 52, r - 18);
  const field = ctx.createRadialGradient(FACE_W / 2, FACE_H * 0.42, 60, FACE_W / 2, FACE_H / 2, FACE_H * 0.7);
  field.addColorStop(0, "#2e2016");
  field.addColorStop(1, k.oakDeep);
  ctx.fillStyle = field;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00000099";
  ctx.stroke();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, maxWidth: number) {
  let s = size;
  ctx.font = font(s);
  while (s > 20 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = font(s);
  }
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, k: Tokens) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  const g = ctx.createLinearGradient(-size, -size, size, size);
  g.addColorStop(0, k.brassLight);
  g.addColorStop(1, "#8a5a1e");
  ctx.fillStyle = g;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Front: the card art in a brass frame with a name plate, like a golden card. */
export async function paintFront(artUrl: string, d: CardBackData): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const k = readTokens();
  const c = document.createElement("canvas");
  c.width = FACE_W;
  c.height = FACE_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  frame(ctx, k);

  const art = { x: 56, y: 56, w: FACE_W - 112, h: 860 };
  ctx.save();
  roundRect(ctx, art.x, art.y, art.w, art.h, 34);
  ctx.clip();
  const img = await loadImage(artUrl);
  if (img) {
    // 512x art is often letterboxed: zoom 1.32 so the subject fills the window (same as ArtCrop).
    const zoom = 1.32 * Math.max(art.w / img.width, art.h / img.height);
    const w = img.width * zoom;
    const h = img.height * zoom;
    ctx.drawImage(img, art.x + (art.w - w) / 2, art.y + (art.h - h) * 0.4, w, h);
  } else {
    const g = ctx.createLinearGradient(0, art.y, 0, art.y + art.h);
    g.addColorStop(0, "#5a3a12");
    g.addColorStop(1, k.oakDeep);
    ctx.fillStyle = g;
    ctx.fillRect(art.x, art.y, art.w, art.h);
  }
  const shade = ctx.createLinearGradient(0, art.y + art.h * 0.55, 0, art.y + art.h);
  shade.addColorStop(0, "#00000000");
  shade.addColorStop(1, "#000000b3");
  ctx.fillStyle = shade;
  ctx.fillRect(art.x, art.y, art.w, art.h);
  ctx.restore();
  roundRect(ctx, art.x, art.y, art.w, art.h, 34);
  ctx.lineWidth = 6;
  ctx.strokeStyle = k.brass;
  ctx.stroke();

  // Name plate.
  const plate = { x: 90, y: 950, w: FACE_W - 180, h: 132 };
  const pg = ctx.createLinearGradient(0, plate.y, 0, plate.y + plate.h);
  pg.addColorStop(0, "#3a2614");
  pg.addColorStop(1, "#1c1209");
  roundRect(ctx, plate.x, plate.y, plate.w, plate.h, 22);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = k.brass;
  ctx.stroke();
  diamond(ctx, plate.x, plate.y + plate.h / 2, 26, k);
  diamond(ctx, plate.x + plate.w, plate.y + plate.h / 2, 26, k);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = k.titleGold;
  fitText(ctx, d.name, (s) => `600 ${s}px ${k.display}`, 72, plate.w - 90);
  ctx.fillText(d.name, FACE_W / 2, plate.y + plate.h / 2 + 4);

  ctx.fillStyle = k.brassDim;
  ctx.font = `500 40px ${k.stat}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(d.featuredLabel.toUpperCase(), FACE_W / 2, 1160);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = k.inkMuted;
  fitText(ctx, d.set, (s) => `500 ${s}px ${k.stat}`, 40, FACE_W - 200);
  ctx.fillText(d.set, FACE_W / 2, 1222);
  diamond(ctx, FACE_W / 2, 1300, 22, k);
  return c;
}

/** Back: our own brass design carrying the win rate, record and streak. */
export async function paintBack(d: CardBackData): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const k = readTokens();
  const c = document.createElement("canvas");
  c.width = FACE_W;
  c.height = FACE_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  frame(ctx, k);

  // Engraved double border with corner studs.
  ctx.strokeStyle = `${k.brass}99`;
  ctx.lineWidth = 3;
  roundRect(ctx, 70, 70, FACE_W - 140, FACE_H - 140, 30);
  ctx.stroke();
  ctx.strokeStyle = `${k.brass}44`;
  roundRect(ctx, 88, 88, FACE_W - 176, FACE_H - 176, 22);
  ctx.stroke();
  for (const [x, y] of [
    [70, 70],
    [FACE_W - 70, 70],
    [70, FACE_H - 70],
    [FACE_W - 70, FACE_H - 70],
  ] as const)
    diamond(ctx, x, y, 22, k);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = k.brassDim;
  ctx.font = `500 42px ${k.stat}`;
  ctx.letterSpacing = "8px";
  ctx.fillText(d.backTitle.toUpperCase(), FACE_W / 2, 200);
  ctx.letterSpacing = "0px";

  // Medallion with the win rate.
  const cx = FACE_W / 2;
  const cy = 560;
  const ring = ctx.createLinearGradient(cx - 300, cy - 300, cx + 300, cy + 300);
  ring.addColorStop(0, k.brassLight);
  ring.addColorStop(0.5, "#7a4f19");
  ring.addColorStop(1, k.brass);
  ctx.beginPath();
  ctx.arc(cx, cy, 290, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  const inner = ctx.createRadialGradient(cx - 60, cy - 80, 20, cx, cy, 270);
  inner.addColorStop(0, "#3a2a1c");
  inner.addColorStop(1, "#140e0a");
  ctx.beginPath();
  ctx.arc(cx, cy, 266, 0, Math.PI * 2);
  ctx.fillStyle = inner;
  ctx.fill();

  ctx.fillStyle = k.brassDim;
  ctx.font = `500 38px ${k.stat}`;
  ctx.fillText(d.rateLabel, cx, cy - 150);
  const goldText = ctx.createLinearGradient(0, cy - 90, 0, cy + 90);
  goldText.addColorStop(0, "#fff3d0");
  goldText.addColorStop(0.55, "#f0c36b");
  goldText.addColorStop(1, "#b07a2a");
  ctx.fillStyle = goldText;
  fitText(ctx, d.rate, (s) => `600 ${s}px ${k.display}`, 190, 480);
  ctx.fillText(d.rate, cx, cy + 10);
  ctx.fillStyle = k.inkMuted;
  ctx.font = `500 40px ${k.stat}`;
  ctx.fillText(d.games, cx, cy + 150);

  // Record: colour plus the W / L letters (never colour alone).
  ctx.font = `700 96px ${k.stat}`;
  const winText = `W ${d.wins}`;
  const lossText = `${d.losses} L`;
  const dash = "  –  ";
  const total = ctx.measureText(winText + dash + lossText).width;
  let x = cx - total / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = k.win;
  ctx.fillText(winText, x, 1000);
  x += ctx.measureText(winText).width;
  ctx.fillStyle = k.inkMuted;
  ctx.fillText(dash, x, 1000);
  x += ctx.measureText(dash).width;
  ctx.fillStyle = k.loss;
  ctx.fillText(lossText, x, 1000);
  ctx.textAlign = "center";

  ctx.fillStyle = k.brassDim;
  ctx.font = `500 38px ${k.stat}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(d.streakLabel.toUpperCase(), cx, 1115);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = d.streakResult === "WIN" ? k.win : d.streakResult === "LOSS" ? k.loss : k.parchment;
  ctx.font = `700 70px ${k.stat}`;
  ctx.fillText(d.streak, cx, 1180);

  ctx.fillStyle = k.inkMuted;
  ctx.font = `600 36px ${k.display}`;
  ctx.fillText(d.appName, cx, 1270);
  return c;
}
