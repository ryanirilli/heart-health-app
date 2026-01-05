import { createCanvas } from "canvas";
import * as fs from "fs";
import * as path from "path";

// Generate Apple Touch Icon (180x180 PNG)
function generateAppleTouchIcon() {
  const size = 180;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background - dark
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, size, size);

  // Draw simplified heartbeat/activity line
  const iconColor = "#b86b5a"; // chart-1 color (hsl 12 45% 55%)
  
  ctx.strokeStyle = iconColor;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Draw a simple heartbeat line centered in the icon
  const centerY = size / 2;
  const margin = 35;
  
  ctx.beginPath();
  // Start from left
  ctx.moveTo(margin, centerY);
  // Flat line to first bump
  ctx.lineTo(margin + 25, centerY);
  // Small bump down
  ctx.lineTo(margin + 35, centerY + 15);
  // Big spike up
  ctx.lineTo(margin + 55, centerY - 45);
  // Big spike down
  ctx.lineTo(margin + 75, centerY + 35);
  // Return to center
  ctx.lineTo(margin + 95, centerY);
  // Flat line to end
  ctx.lineTo(size - margin, centerY);
  ctx.stroke();

  // Save to public folder
  const outputPath = path.join(process.cwd(), "public", "apple-touch-icon.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Apple Touch Icon saved to ${outputPath}`);
}

generateAppleTouchIcon();

