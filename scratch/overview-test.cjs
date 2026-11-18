const fs = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");
const cssFile = fs.readdirSync("dist/assets").find((f) => f.endsWith(".css"));
const scrollY = Number(process.argv[2] || 0);
const width = Number(process.argv[3] || 437);
const out = process.argv[4] || "scratch/shot.png";
const stat = (t) => `<div class="stat summary-stat"><span>${t}</span><strong>৳26,080</strong><small>x</small></div>`;
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="../dist/assets/${cssFile}"></head><body>
<div id="app-shell" class="app premium-theme"><aside class="sidebar"></aside>
<main class="main overview-page">
<header class="app-page-header overview-page-header">
<button type="button" class="icon-btn menu-btn"><svg width="22" height="22"></svg></button>
<div class="header-actions">
<button type="button" class="icon-btn theme-mode-toggle"><svg width="18" height="18"></svg></button>
<div class="notice-bell-wrap"><button class="icon-btn notice-bell"><svg width="18" height="18"></svg></button></div>
<div class="month-picker"><button type="button" class="month-picker-trigger"><svg width="17" height="17"></svg><span class="month-picker-value">Nov 2026</span><svg class="month-picker-chevron" width="16" height="16"></svg></button></div>
</div>
<div class="header-page-tools header-page-tools-overview">
<div class="app-page-heading page-heading-with-mark header-page-heading overview-header-heading"><span class="page-heading-mark page-heading-mark-overview"><span class="page-heading-mark-inner"><svg width="21" height="21"></svg></span></span><h2>Overview</h2><p>Manage your home</p></div>
<div class="welcome-actions"><button class="secondary overview-export-btn overview-export-csv">Export CSV</button><button class="primary overview-export-btn overview-export-pdf">Export PDF</button><button class="danger overview-export-btn overview-reset-btn">Reset Hisab</button></div>
</div>
</header>
<div class="overview-mobile-actions"><button class="secondary overview-export-btn overview-export-csv">Export CSV</button><button class="primary overview-export-btn overview-export-pdf">Export PDF</button><button class="danger overview-export-btn overview-reset-btn">Reset Hisab</button></div>
<div class="stats overview-stats">${stat("Total Rent")}${stat("Rent Paid")}${stat("Meal")}${stat("Due")}${stat("A")}${stat("B")}</div>
<div style="height:1200px"></div>
<footer class="app-footer"><span class="footer-credit">x</span></footer>
</main></div>
<script>
window.scrollTo(0, ${scrollY});
setTimeout(()=>{
const q=(s)=>{const e=document.querySelector(s);if(!e)return s+':none';const r=e.getBoundingClientRect();return s+' x='+Math.round(r.left)+' w='+Math.round(r.width)+' y='+Math.round(r.top)+' h='+Math.round(r.height)};
document.title=[q('.main'),q('.app-page-header'),q('.overview-mobile-actions'),q('.overview-stats'),'scrollY='+scrollY,'main overflow='+getComputedStyle(document.querySelector('.main')).overflowY+'/'+getComputedStyle(document.querySelector('.main')).overflowX].join(' || ');
},100);
</script></body></html>`;
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/t.html", html);
const url = "file:///" + path.resolve("scratch/t.html").replace(/\\/g, "/");
const r = spawnSync(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--no-sandbox", "--disable-gpu", `--window-size=${width},760`, "--allow-file-access-from-files", "--virtual-time-budget=3000", `--screenshot=${path.resolve(out)}`, url],
  { encoding: "utf8" },
);
const d = spawnSync(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--no-sandbox", "--disable-gpu", `--window-size=${width},760`, "--allow-file-access-from-files", "--virtual-time-budget=3000", "--dump-dom", url],
  { encoding: "utf8" },
);
const m = /<title>(.*?)<\/title>/s.exec(d.stdout || "");
console.log(m ? m[1] : "no title");
