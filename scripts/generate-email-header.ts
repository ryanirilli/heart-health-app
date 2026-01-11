import { createCanvas } from "canvas";
import * as fs from "fs";
import * as path from "path";

// Simplex noise implementation (same as TopographyCanvas)
class SimplexNoise {
  private perm: number[] = [];
  private gradP: { x: number; y: number }[] = [];

  private grad3 = [
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  constructor(seed = Math.random() * 65536) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(this.seededRandom(seed + i) * 256);
    }

    this.perm = new Array(512);
    this.gradP = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.gradP[i] = this.grad3[this.perm[i] % 8];
    }
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private dot2(g: { x: number; y: number }, x: number, y: number): number {
    return g.x * x + g.y * y;
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    let n0 = 0,
      n1 = 0,
      n2 = 0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = this.gradP[ii + this.perm[jj]];
      t0 *= t0;
      n0 = t0 * t0 * this.dot2(gi0, x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = this.gradP[ii + i1 + this.perm[jj + j1]];
      t1 *= t1;
      n1 = t1 * t1 * this.dot2(gi1, x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = this.gradP[ii + 1 + this.perm[jj + 1]];
      t2 *= t2;
      n2 = t2 * t2 * this.dot2(gi2, x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  fbm(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Marching squares to extract contour lines
const getContourLines = (
  heightMap: number[][],
  threshold: number,
  cellSize: number
): { x: number; y: number }[][] => {
  const lines: { x: number; y: number }[][] = [];
  const rows = heightMap.length - 1;
  const cols = heightMap[0].length - 1;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tl = heightMap[y][x] >= threshold ? 1 : 0;
      const tr = heightMap[y][x + 1] >= threshold ? 1 : 0;
      const br = heightMap[y + 1][x + 1] >= threshold ? 1 : 0;
      const bl = heightMap[y + 1][x] >= threshold ? 1 : 0;

      const caseIndex = tl * 8 + tr * 4 + br * 2 + bl;

      if (caseIndex === 0 || caseIndex === 15) continue;

      const px = x * cellSize;
      const py = y * cellSize;

      // Interpolate edge positions
      const top = lerp(
        px,
        px + cellSize,
        (threshold - heightMap[y][x]) / (heightMap[y][x + 1] - heightMap[y][x])
      );
      const bottom = lerp(
        px,
        px + cellSize,
        (threshold - heightMap[y + 1][x]) /
          (heightMap[y + 1][x + 1] - heightMap[y + 1][x])
      );
      const left = lerp(
        py,
        py + cellSize,
        (threshold - heightMap[y][x]) / (heightMap[y + 1][x] - heightMap[y][x])
      );
      const right = lerp(
        py,
        py + cellSize,
        (threshold - heightMap[y][x + 1]) /
          (heightMap[y + 1][x + 1] - heightMap[y][x + 1])
      );

      const segments: { x: number; y: number }[][] = [];

      // Marching squares lookup
      switch (caseIndex) {
        case 1:
        case 14:
          segments.push([
            { x: px, y: left },
            { x: bottom, y: py + cellSize },
          ]);
          break;
        case 2:
        case 13:
          segments.push([
            { x: bottom, y: py + cellSize },
            { x: px + cellSize, y: right },
          ]);
          break;
        case 3:
        case 12:
          segments.push([
            { x: px, y: left },
            { x: px + cellSize, y: right },
          ]);
          break;
        case 4:
        case 11:
          segments.push([
            { x: top, y: py },
            { x: px + cellSize, y: right },
          ]);
          break;
        case 5:
          segments.push([
            { x: px, y: left },
            { x: top, y: py },
          ]);
          segments.push([
            { x: bottom, y: py + cellSize },
            { x: px + cellSize, y: right },
          ]);
          break;
        case 6:
        case 9:
          segments.push([
            { x: top, y: py },
            { x: bottom, y: py + cellSize },
          ]);
          break;
        case 7:
        case 8:
          segments.push([
            { x: px, y: left },
            { x: top, y: py },
          ]);
          break;
        case 10:
          segments.push([
            { x: top, y: py },
            { x: px + cellSize, y: right },
          ]);
          segments.push([
            { x: px, y: left },
            { x: bottom, y: py + cellSize },
          ]);
          break;
      }

      lines.push(...segments);
    }
  }

  return lines;
};

// Draw a rounded rectangle (app icon style)
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Draw the Rhythm heartbeat/activity icon
function drawRhythmIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  ctx.beginPath();
  // The heartbeat/activity path from the SVG icon
  // M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2
  ctx.moveTo(22, 12);
  ctx.lineTo(19.52, 12);
  ctx.bezierCurveTo(18.67, 12, 17.92, 12.56, 17.59, 13.46);
  ctx.lineTo(15.24, 21.82);
  ctx.bezierCurveTo(15.18, 22.02, 14.82, 22.02, 14.76, 21.82);
  ctx.lineTo(9.24, 2.18);
  ctx.bezierCurveTo(9.18, 1.98, 8.82, 1.98, 8.76, 2.18);
  ctx.lineTo(6.41, 10.54);
  ctx.bezierCurveTo(6.08, 11.44, 5.33, 12, 4.49, 12);
  ctx.lineTo(2, 12);
  ctx.stroke();
  
  ctx.restore();
}

// Generate the email header image
function generateEmailHeader() {
  // Email-friendly dimensions (600px is standard email width)
  const width = 600;
  const height = 160; // Slightly taller to fit branding
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const noise = new SimplexNoise(42); // Same seed for consistency

  // Dark theme colors (matching globals.css dark theme)
  // --background: 230 20% 10%
  const bgColor = "hsl(230, 20%, 10%)";
  // Foreground/line colors with warm undertones
  const fgH = 40;
  const fgS = 15;
  const fgL = 90;

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const cellSize = 8;
  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;
  const scale = 0.003;

  // Generate height map
  const heightMap: number[][] = [];
  for (let y = 0; y < rows; y++) {
    heightMap[y] = [];
    for (let x = 0; x < cols; x++) {
      const nx = x * scale;
      const ny = y * scale;
      const value =
        noise.fbm(nx, ny, 5) * 0.6 +
        noise.fbm(nx * 2, ny * 2 + 100, 3) * 0.3 +
        noise.fbm(nx * 4, ny * 4, 2) * 0.1;
      heightMap[y][x] = value;
    }
  }

  // Draw contour lines
  const contourLevels = 24;
  const baseOpacity = 0.06;

  for (let level = 0; level < contourLevels; level++) {
    const threshold = -0.7 + (level / contourLevels) * 1.4;
    const lines = getContourLines(heightMap, threshold, cellSize);

    const normalizedLevel = level / contourLevels;
    const opacity =
      baseOpacity +
      normalizedLevel * 0.2 * Math.sin(normalizedLevel * Math.PI);

    const adjustedL = fgL * (0.4 + normalizedLevel * 0.6);
    ctx.strokeStyle = `hsla(${fgH}, ${fgS}%, ${adjustedL}%, ${opacity})`;
    ctx.lineWidth = normalizedLevel > 0.75 ? 1.0 : 0.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    for (const segment of lines) {
      if (segment.length >= 2) {
        ctx.moveTo(segment[0].x, segment[0].y);
        ctx.lineTo(segment[1].x, segment[1].y);
      }
    }
    ctx.stroke();
  }

  // Add branding overlay - inline layout (icon + text side by side)
  const centerY = height / 2;
  
  // Dimensions for inline layout
  const iconBgSize = 52; // App icon size
  const iconBgRadius = 14; // Rounded corners like app icon
  const iconSize = 28;
  const textFontSize = 34;
  const gap = 14; // Space between icon and text
  
  // Use a font that node-canvas can actually render
  const fontFamily = "Arial, Helvetica, sans-serif";
  
  // Measure text to calculate total width
  ctx.font = `bold ${textFontSize}px ${fontFamily}`;
  const textMetrics = ctx.measureText("Rhythm");
  const textWidth = textMetrics.width;
  
  // Calculate total width and starting X position to center everything
  const totalWidth = iconBgSize + gap + textWidth;
  const startX = (width - totalWidth) / 2;
  
  // Draw icon background (rounded rectangle like app icon)
  const iconBgX = startX;
  const iconBgY = centerY - iconBgSize / 2;
  drawRoundedRect(ctx, iconBgX, iconBgY, iconBgSize, iconBgSize, iconBgRadius);
  ctx.fillStyle = "rgba(205, 127, 109, 0.2)";
  ctx.fill();

  // Draw the Rhythm icon centered in the rounded rectangle
  const iconColor = "#cd7f6d"; // Warm coral matching the app
  const iconX = iconBgX + (iconBgSize - iconSize) / 2;
  const iconY = iconBgY + (iconBgSize - iconSize) / 2;
  drawRhythmIcon(ctx, iconX, iconY, iconSize, iconColor);

  // Draw "Rhythm" text inline with icon
  ctx.font = `bold ${textFontSize}px ${fontFamily}`;
  ctx.fillStyle = "#e8e4df";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Rhythm", startX + iconBgSize + gap, centerY);

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, "..", "supabase", "templates");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save to supabase/templates folder
  const outputPath = path.join(outputDir, "email-header.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Email header image saved to ${outputPath}`);
  
  // Also save to public folder for hosting
  const publicOutputPath = path.join(__dirname, "..", "public", "email-header.png");
  fs.writeFileSync(publicOutputPath, buffer);
  console.log(`Email header image also saved to ${publicOutputPath}`);
}

generateEmailHeader();

