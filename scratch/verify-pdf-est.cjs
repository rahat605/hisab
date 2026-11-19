const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = "E:/bachelor-hisab-react-vercel";
const scratch = path.join(root, "scratch");
fs.mkdirSync(scratch, { recursive: true });

const src = fs.readFileSync(path.join(root, "src/main.jsx"), "utf8");
const fnIdx = src.indexOf("function exportMemberBill(member)");
const startMarker = 'reportDocument.write(`<!doctype html>';
const endMarker = '<script>\n        (function() {';
const sIdx = src.indexOf(startMarker, fnIdx);
const eIdx = src.indexOf(endMarker, sIdx);
const templateBody = src.slice(sIdx + 'reportDocument.write(`'.length, eIdx) + "</body></html>";

const money = (n) => "৳" + Math.round(Number(n) || 0).toLocaleString("en-US");
const signedMoney = (n) => (n < 0 ? `−${money(Math.abs(n))}` : money(n));
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const month = "November 2026";
const member = { name: "Arni" };
const rentAndUtilities = 5270;
const mealCost = 1467;
const rentPaid = 5000;
const mealPaid = 855;
const totalPaid = rentPaid + mealPaid;
const currentCharges = rentAndUtilities + mealCost;
const previousBalance = 0;
const rentUtilitiesDue = rentAndUtilities - rentPaid;
const mealBalance = mealCost - mealPaid;
const currentBalance = rentUtilitiesDue + mealBalance;
const finalBalance = currentBalance + previousBalance;
const estimatedMealTarget = 2000;
const estimatedMealRemaining = Math.max(0, estimatedMealTarget - mealCost);
const estimatedMonthDue = finalBalance + estimatedMealRemaining;
const generatedDate = "November 19, 2026";
const toneClass = (a) => (a < 0 ? "val-credit" : a === 0 ? "val-zero" : "val-due");
const rentDueTone = toneClass(rentUtilitiesDue);
const mealDueTone = toneClass(mealBalance);
const currentBalanceTone = toneClass(currentBalance);
const prevBalanceTone = toneClass(previousBalance);
const finalBalanceTone = toneClass(finalBalance);

const paymentOptions = [
  { label: "bKash", logo: "public/payment-logos/bkash.svg", instructions: "Send Money via App", account: "01712-345678" },
  { label: "Nagad", logo: "public/payment-logos/nagad.svg", instructions: "Send Money via App", account: "01812-345678" },
  { label: "BRAC Bank", logo: "public/payment-logos/brac-bank.svg", instructions: "Account Transfer", account: "2056844908001" },
  { label: "Islami Bank", logo: "public/payment-logos/islami-bank.svg", instructions: "Account Transfer", account: "2050246700001" },
];
const paymentRowsHtml = paymentOptions.map((o) => {
  const full = path.join(root, o.logo);
  const logoHtml = fs.existsSync(full)
    ? `<img class="pay-logo" src="file:///${full.replace(/\\/g, "/")}" alt="${o.label}"/>`
    : `<span class="pay-logo-fallback">${o.label[0]}</span>`;
  return `<tr><td class="pay-method-cell">${logoHtml}<span class="pay-method-name">${o.label}</span></td><td class="pay-instructions-cell">${o.instructions}</td><td class="pay-account-cell">${o.account}</td></tr>`;
}).join("");

const window = { location: { origin: "file:///" + root } };
const rendered = eval("`" + templateBody.replace(/<script src=.*?<\/script>/g, "") + "`");

const htmlPath = path.join(scratch, "verify-pdf-est.html");
const shotPath = path.join(scratch, "verify-pdf-est.png");
const userDataDir = path.join(scratch, "chrome-pdf-est");
fs.writeFileSync(htmlPath, rendered, "utf8");

execFileSync(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--user-data-dir=${userDataDir}`,
    "--window-size=900,1210",
    "--hide-scrollbars",
    `--screenshot=${shotPath}`,
    `file:///${htmlPath.replace(/\\/g, "/")}`,
  ],
  { maxBuffer: 20 * 1024 * 1024 }
);

console.log("Screenshot saved:", shotPath);
