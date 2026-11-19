const fs = require("fs");
const { execSync } = require("child_process");
const root = "E:/bachelor-hisab-react-vercel";
const cur = fs.readFileSync(root + "/src/main.jsx", "utf8").replace(/\r\n/g, "\n");
const head = execSync("git show HEAD:src/main.jsx", { cwd: root, maxBuffer: 50 * 1024 * 1024 }).toString("utf8").replace(/\r\n/g, "\n");

const marker = "... [truncated for diff preview]";
const mIdx = cur.lastIndexOf(marker);
if (mIdx < 0) throw new Error("marker not found");
const good = cur.slice(0, mIdx);

// Anchor: last ~12 lines of good content must appear exactly once in HEAD.
const goodLines = good.split("\n");
goodLines.pop(); // trailing empty after final newline
let anchor = null, hIdx = -1;
for (let n = 12; n <= 60; n += 4) {
  const cand = goodLines.slice(-n).join("\n") + "\n";
  const first = head.indexOf(cand);
  if (first >= 0 && head.indexOf(cand, first + 1) < 0) { anchor = cand; hIdx = first; break; }
}
if (!anchor) throw new Error("no unique anchor");
const tail = head.slice(hIdx + anchor.length);
const restored = goodLines.join("\n") + "\n" + tail;
fs.writeFileSync(root + "/src/main.jsx", restored, "utf8");
console.log("anchor lines:", anchor.split("\n").length - 1, "restored lines:", restored.split("\n").length, "tail lines:", tail.split("\n").length);
