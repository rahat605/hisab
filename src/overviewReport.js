const REPORT_WIDTH = 1120;
const REPORT_HEIGHT = 792;

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const formatMoney = (value) => {
  const amount = numberValue(value);
  const formatted = Math.abs(amount).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "-" : ""}\u09F3${formatted}`;
};

const formatCompactMoney = (value) => {
  const amount = Math.abs(numberValue(value));
  if (amount >= 1000000) return `\u09F3${(amount / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
  if (amount >= 1000) return `\u09F3${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `\u09F3${Math.round(amount)}`;
};

const safePercent = (value) => Math.max(0, Math.min(100, numberValue(value)));

const slugify = (value) =>
  String(value || "overview")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "overview";

const buildRingSegments = (items, total, radius = 44) => {
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;
  return items.map((item) => {
    const length = total > 0 ? (numberValue(item.value) / total) * circumference : 0;
    const segment = length > 0
      ? `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${escapeHtml(item.color)}" stroke-width="14" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-consumed).toFixed(2)}" transform="rotate(-90 60 60)" />`
      : "";
    consumed += length;
    return segment;
  }).join("");
};

export function openOverviewReport({
  month,
  generatedBy,
  propertyName = "MridhaBari 6B",
  propertyAddress = "Ka/164, Kuratoli, Kuril, Vatara, Dhaka 1229",
  metrics = {},
  costMix = [],
  bazarTrend = [],
  members = [],
  costDrivers = [],
  libraries = {},
}) {
  const reportWindow = window.open("", "_blank", "width=1280,height=920");
  const popupBlocked = !reportWindow;
  if (reportWindow) {
    try {
      reportWindow.__html2canvas = libraries.html2canvas;
      reportWindow.__jsPDF = libraries.jsPDF;
    } catch {
      // The print fallback below remains available if popup isolation blocks shared libraries.
    }
  }

  const reportDocument = reportWindow
    ? reportWindow.document
    : document.implementation.createHTMLDocument("Monthly Overview");
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const totalCharges = numberValue(metrics.totalCharges);
  const totalCovered = numberValue(metrics.totalCovered);
  const outstanding = numberValue(metrics.outstanding);
  const collectionRate = safePercent(metrics.collectionRate);
  const activeCostMix = costMix.filter((item) => numberValue(item.value) > 0);
  const costMixTotal = activeCostMix.reduce((sum, item) => sum + numberValue(item.value), 0);
  const ringSegments = buildRingSegments(activeCostMix, costMixTotal);
  const ringCircumference = 2 * Math.PI * 45;
  const ringProgress = (collectionRate / 100) * ringCircumference;
  const sortedMembers = [...members]
    .sort((a, b) => numberValue(b.balance) - numberValue(a.balance))
    .slice(0, 6);
  const maxMemberBalance = Math.max(
    1,
    ...sortedMembers.map((member) => Math.abs(numberValue(member.balance))),
  );
  const maxTrendValue = Math.max(1, ...bazarTrend.map((entry) => numberValue(entry.value)));
  const maxDriverValue = Math.max(1, ...costDrivers.map((entry) => numberValue(entry.value)));
  const highestDueMember = [...members]
    .filter((member) => numberValue(member.balance) > 0)
    .sort((a, b) => numberValue(b.balance) - numberValue(a.balance))[0];
  const largestCost = [...costDrivers]
    .sort((a, b) => numberValue(b.value) - numberValue(a.value))[0];

  const costLegend = activeCostMix.length
    ? activeCostMix.map((item) => {
        const percentage = costMixTotal > 0 ? (numberValue(item.value) / costMixTotal) * 100 : 0;
        return `<div class="legend-row"><span class="legend-key"><i style="background:${escapeHtml(item.color)}"></i>${escapeHtml(item.label)}</span><span class="legend-amount"><b>${escapeHtml(formatMoney(item.value))}</b><small>${percentage.toFixed(0)}%</small></span></div>`;
      }).join("")
    : '<div class="empty-state">No monthly costs recorded</div>';

  const trendBars = bazarTrend.length
    ? bazarTrend.slice(-8).map((entry) => {
        const height = Math.max(7, (numberValue(entry.value) / maxTrendValue) * 100);
        return `<div class="trend-column"><span>${escapeHtml(formatCompactMoney(entry.value))}</span><div class="trend-track"><i style="height:${height.toFixed(1)}%"></i></div><small>${escapeHtml(entry.label)}</small></div>`;
      }).join("")
    : '<div class="chart-empty">No bazar purchases recorded this month</div>';

  const memberRows = sortedMembers.length
    ? sortedMembers.map((member) => {
        const balance = numberValue(member.balance);
        const barWidth = Math.max(balance === 0 ? 0 : 5, (Math.abs(balance) / maxMemberBalance) * 100);
        const initials = String(member.name || "M")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase();
        return `<tr><td><div class="member-cell"><span class="member-avatar">${escapeHtml(initials)}</span><span class="member-copy"><b>${escapeHtml(member.name || "Member")}</b><small>${escapeHtml(member.username || "House member")}</small><span class="member-balance-track"><i class="${balance < 0 ? "credit" : "due"}" style="width:${barWidth.toFixed(1)}%"></i></span></span></div></td><td>${escapeHtml(formatMoney(member.charge))}</td><td>${escapeHtml(formatMoney(member.covered))}</td><td><strong class="balance-value ${balance < 0 ? "credit" : balance > 0 ? "due" : "settled"}">${balance < 0 ? `${escapeHtml(formatMoney(Math.abs(balance)))} credit` : balance > 0 ? escapeHtml(formatMoney(balance)) : "Settled"}</strong></td></tr>`;
      }).join("")
    : '<tr><td colspan="4" class="table-empty">No active members</td></tr>';

  const driverRows = costDrivers.slice(0, 5).map((driver) => {
    const width = numberValue(driver.value) > 0
      ? Math.max(4, (numberValue(driver.value) / maxDriverValue) * 100)
      : 0;
    return `<div class="driver-row"><div class="driver-label"><span>${escapeHtml(driver.label)}</span><b>${escapeHtml(formatMoney(driver.value))}</b></div><div class="driver-track"><i style="width:${width.toFixed(1)}%;background:${escapeHtml(driver.color || "#16815b")}"></i></div></div>`;
  }).join("") || '<div class="empty-state">No expense drivers available</div>';

  const kpiCards = [
    {
      label: "Total charges",
      value: formatMoney(totalCharges),
      note: `${numberValue(metrics.memberCount)} active members`,
      tone: "forest",
      icon: '<path d="M4 19V8l8-5 8 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M9 21v-7h6v7"/>',
    },
    {
      label: "Covered / settled",
      value: formatMoney(totalCovered),
      note: `${collectionRate.toFixed(0)}% of charges`,
      tone: "teal",
      icon: '<path d="M20 6 9 17l-5-5"/>',
    },
    {
      label: "Outstanding",
      value: formatMoney(outstanding),
      note: `${numberValue(metrics.pendingMemberCount)} members pending`,
      tone: "amber",
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    },
    {
      label: "Monthly bazar",
      value: formatMoney(metrics.bazarTotal),
      note: `${numberValue(metrics.bazarCount)} purchases`,
      tone: "blue",
      icon: '<path d="m5 8 2 12h10l2-12Z"/><path d="M9 8a3 3 0 0 1 6 0M4 8h16"/>',
    },
    {
      label: "Cash in hand",
      value: formatMoney(metrics.cashInHand),
      note: "After bazar & settlements",
      tone: numberValue(metrics.cashInHand) < 0 ? "rose" : "mint",
      icon: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h5M7 10h5"/>',
    },
  ].map((card) => `<article class="kpi-card ${card.tone}"><span class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${card.icon}</svg></span><div><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong><small>${escapeHtml(card.note)}</small></div></article>`).join("");

  const insightItems = [
    {
      label: "Highest outstanding",
      value: highestDueMember
        ? `${highestDueMember.name} · ${formatMoney(highestDueMember.balance)}`
        : "Everyone is settled",
    },
    {
      label: "Largest cost driver",
      value: largestCost
        ? `${largestCost.label} · ${formatMoney(largestCost.value)}`
        : "No costs recorded",
    },
    {
      label: "Average bazar purchase",
      value: formatMoney(metrics.averageBazar),
    },
    {
      label: "Meal participation",
      value: `${numberValue(metrics.mealMemberCount)} of ${numberValue(metrics.memberCount)} members`,
    },
  ].map((item) => `<div class="insight-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("");

  const fileName = `Monthly-Overview-${slugify(month)}.pdf`;
  reportDocument.open();
  reportDocument.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Monthly Overview · ${escapeHtml(month)}</title>
  <style>
    :root{color-scheme:light;font-family:"Segoe UI","Hind Siliguri",Arial,sans-serif}
    *{box-sizing:border-box}
    html,body{margin:0;min-height:100%;background:#e9efeb;color:#16251d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    button{font:inherit}
    .report-toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:flex-end;gap:9px;min-height:56px;padding:10px 20px;border-bottom:1px solid #d7e1da;background:rgba(247,250,248,.94);backdrop-filter:blur(14px)}
    .report-toolbar button{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 14px;border:1px solid #d7e2db;border-radius:10px;background:#fff;color:#385046;font-weight:700;cursor:pointer}
    .report-toolbar button.primary{border-color:#0c7650;background:linear-gradient(135deg,#13855d,#086542);color:#fff;box-shadow:0 7px 18px rgba(9,105,69,.18)}
    .report-toolbar button:disabled{opacity:.68;cursor:wait}
    .report-toolbar svg{width:15px;height:15px}
    .report-stage{position:relative;margin:18px auto 28px}
    .report-page{position:absolute;top:0;left:0;display:grid;width:${REPORT_WIDTH}px;height:${REPORT_HEIGHT}px;grid-template-rows:66px 80px 212px minmax(0,1fr) 20px;gap:12px;padding:21px 26px 17px;overflow:hidden;border:1px solid #dce6df;border-radius:22px;background:linear-gradient(155deg,#fbfdfb 0%,#f6faf7 100%);box-shadow:0 24px 70px rgba(22,64,43,.14);transform-origin:top left}
    .report-header{display:grid;grid-template-columns:310px minmax(0,1fr) 230px;align-items:center;gap:18px;padding-bottom:12px;border-bottom:1px solid #dce5df}
    .brand-lockup{display:flex;align-items:center;gap:11px;min-width:0}
    .brand-mark{display:grid;width:46px;height:46px;flex:0 0 46px;place-items:center;border-radius:14px;background:linear-gradient(145deg,#159467,#086544);color:#fff;box-shadow:0 8px 18px rgba(8,101,68,.2)}
    .brand-mark svg{width:25px;height:25px}
    .brand-copy{min-width:0}.brand-copy strong{display:block;overflow:hidden;font-size:16px;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}.brand-copy span{display:block;margin-top:4px;overflow:hidden;color:#728078;font-size:9.5px;line-height:1.3;text-overflow:ellipsis;white-space:nowrap}
    .report-title{text-align:center}.report-title span{color:#13815a;font-size:9px;font-weight:800;letter-spacing:.17em;text-transform:uppercase}.report-title h1{margin:3px 0 0;font-size:23px;line-height:1.12;letter-spacing:-.035em}
    .generated{text-align:right}.generated span{display:block;color:#829087;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.generated strong{display:block;margin-top:3px;font-size:12px}.generated small{display:block;margin-top:2px;color:#7a8880;font-size:9px}
    .kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
    .kpi-card{display:flex;align-items:center;gap:10px;min-width:0;padding:11px 12px;border:1px solid #e0e8e2;border-radius:14px;background:#fff;box-shadow:0 5px 14px rgba(29,65,45,.045)}
    .kpi-icon{display:grid;width:35px;height:35px;flex:0 0 35px;place-items:center;border-radius:10px;background:#ecf5ef;color:#0d7a52}.kpi-icon svg{width:18px;height:18px}
    .kpi-card>div{min-width:0}.kpi-card span:not(.kpi-icon){display:block;color:#748178;font-size:9px;font-weight:700;letter-spacing:.035em;text-transform:uppercase}.kpi-card strong{display:block;margin-top:3px;overflow:hidden;font-size:17px;line-height:1.1;letter-spacing:-.025em;text-overflow:ellipsis;white-space:nowrap}.kpi-card small{display:block;margin-top:3px;overflow:hidden;color:#87938c;font-size:8.5px;text-overflow:ellipsis;white-space:nowrap}
    .kpi-card.amber .kpi-icon{background:#fff4e4;color:#b66c17}.kpi-card.blue .kpi-icon{background:#edf4fb;color:#286b9d}.kpi-card.mint .kpi-icon{background:#e8f7f0;color:#0b8057}.kpi-card.rose .kpi-icon{background:#fff0f1;color:#bd4f5b}.kpi-card.teal .kpi-icon{background:#e8f6f3;color:#087768}
    .analytics-grid{display:grid;grid-template-columns:1.04fr 1.42fr .92fr;gap:12px;min-height:0}
    .detail-grid{display:grid;grid-template-columns:1.58fr .92fr;gap:12px;min-height:0}
    .panel{min-width:0;overflow:hidden;border:1px solid #dde7e0;border-radius:16px;background:rgba(255,255,255,.9);box-shadow:0 6px 18px rgba(31,65,46,.045)}
    .panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 15px 8px}.panel-head h2{margin:0;font-size:13.5px;line-height:1.2;letter-spacing:-.01em}.panel-head p{margin:3px 0 0;color:#819087;font-size:8.7px}.panel-badge{padding:4px 7px;border-radius:999px;background:#edf5f0;color:#177653;font-size:8px;font-weight:800;letter-spacing:.04em;white-space:nowrap;text-transform:uppercase}
    .mix-body{display:grid;grid-template-columns:132px minmax(0,1fr);align-items:center;gap:8px;padding:2px 14px 12px}
    .donut-wrap{position:relative;width:126px;height:126px}.donut-wrap svg{display:block;width:126px;height:126px}.donut-center{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none}.donut-center strong{font-size:14px;line-height:1}.donut-center span{margin-top:4px;color:#849087;font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
    .legend-list{display:grid;gap:8px}.legend-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:7px;border-bottom:1px solid #edf1ee}.legend-row:last-child{padding-bottom:0;border-bottom:0}.legend-key{display:flex;align-items:center;gap:7px;color:#5e6e65;font-size:9.5px}.legend-key i{width:8px;height:8px;flex:0 0 8px;border-radius:3px}.legend-amount{text-align:right}.legend-amount b{display:block;font-size:10.5px}.legend-amount small{display:block;margin-top:1px;color:#89958e;font-size:8px}
    .trend-body{display:flex;height:156px;align-items:stretch;padding:2px 14px 13px}.trend-bars{display:flex;width:100%;align-items:stretch;justify-content:space-around;gap:7px;border-bottom:1px solid #dfe7e1;background:repeating-linear-gradient(to top,transparent 0,transparent 34px,#edf2ee 35px)}
    .trend-column{display:grid;min-width:0;flex:1;grid-template-rows:20px minmax(0,1fr) 18px;align-items:end;text-align:center}.trend-column>span{overflow:hidden;color:#586a60;font-size:7.5px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.trend-column small{align-self:center;overflow:hidden;color:#849087;font-size:7.5px;text-overflow:ellipsis;white-space:nowrap}.trend-track{display:flex;width:100%;height:100%;align-items:flex-end;justify-content:center}.trend-track i{display:block;width:min(24px,72%);min-height:4px;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#35ad7e,#0c7650);box-shadow:0 5px 10px rgba(12,118,80,.13)}
    .chart-empty,.empty-state{display:grid;width:100%;min-height:70px;place-items:center;color:#89958e;font-size:9px;text-align:center}
    .collection-body{display:grid;grid-template-columns:118px minmax(0,1fr);align-items:center;gap:4px;padding:1px 12px 12px}.progress-ring{position:relative;width:112px;height:112px}.progress-ring svg{width:112px;height:112px}.progress-copy{position:absolute;inset:0;display:grid;place-content:center;text-align:center}.progress-copy strong{font-size:20px;line-height:1}.progress-copy span{margin-top:4px;color:#7f8d85;font-size:7.5px;font-weight:800;text-transform:uppercase}.collection-list{display:grid;gap:8px}.collection-item{padding-bottom:7px;border-bottom:1px solid #edf1ee}.collection-item:last-child{padding-bottom:0;border-bottom:0}.collection-item span{display:block;color:#829087;font-size:8px;text-transform:uppercase}.collection-item strong{display:block;margin-top:2px;font-size:10.5px}.collection-item strong.due{color:#b66c17}.collection-item strong.credit{color:#0a8057}
    .members-panel{display:flex;min-height:0;flex-direction:column}.members-table-wrap{min-height:0;flex:1;padding:0 13px 10px}table{width:100%;border-collapse:collapse;table-layout:fixed}th{padding:6px 8px;border-bottom:1px solid #e3eae5;color:#7d8b83;font-size:8px;font-weight:800;text-align:right;text-transform:uppercase}th:first-child{width:46%;text-align:left}td{height:38px;padding:5px 8px;border-bottom:1px solid #edf1ee;font-size:9.5px;text-align:right;vertical-align:middle}tbody tr:last-child td{border-bottom:0}.member-cell{display:flex;align-items:center;gap:8px;text-align:left}.member-avatar{display:grid;width:27px;height:27px;flex:0 0 27px;place-items:center;border-radius:9px;background:#edf5f0;color:#0f7953;font-size:8px;font-weight:800}.member-copy{display:block;min-width:0;flex:1}.member-copy b,.member-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.member-copy b{font-size:9.5px}.member-copy small{margin-top:1px;color:#8a968f;font-size:7.5px}.member-balance-track{display:block;height:3px;margin-top:3px;overflow:hidden;border-radius:99px;background:#eef2ef}.member-balance-track i{display:block;height:100%;border-radius:inherit}.member-balance-track i.due{background:#d99a45}.member-balance-track i.credit{background:#1a9a6c}.balance-value{font-size:9px}.balance-value.due{color:#ad681d}.balance-value.credit{color:#087a54}.balance-value.settled{color:#718078}.table-empty{height:130px;color:#89958e;text-align:center}
    .insights-panel{display:grid;min-height:0;grid-template-rows:auto auto 1px minmax(0,1fr)}.drivers{display:grid;gap:7px;padding:0 14px 10px}.driver-label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px;color:#5f7066;font-size:8.5px}.driver-label b{color:#273b30;font-size:9px}.driver-track{height:5px;overflow:hidden;border-radius:99px;background:#edf2ee}.driver-track i{display:block;height:100%;border-radius:inherit}.panel-divider{margin:0 14px;background:#e5ebe7}.insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:10px 14px 13px}.insight-item{min-width:0;padding:8px;border:1px solid #e6ece8;border-radius:10px;background:#f8faf8}.insight-item span{display:block;color:#839087;font-size:7.3px;font-weight:800;letter-spacing:.035em;text-transform:uppercase}.insight-item strong{display:block;margin-top:4px;overflow:hidden;font-size:8.7px;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}
    .report-footer{display:flex;align-items:center;justify-content:space-between;color:#8a968f;font-size:8px}.report-footer strong{color:#167653}.confidential{display:flex;align-items:center;gap:5px}.confidential i{width:5px;height:5px;border-radius:50%;background:#24a976}
    @page{size:A4 landscape;margin:0}
    @media print{
      html,body{width:297mm!important;height:210mm!important;min-height:0!important;overflow:hidden!important;background:#fff!important}
      .report-toolbar{display:none!important}
      .report-stage{position:static!important;width:297mm!important;height:210mm!important;margin:0!important}
      .report-page{position:static!important;width:297mm!important;height:210mm!important;border:0!important;border-radius:0!important;box-shadow:none!important;transform:none!important}
    }
  </style>
</head>
<body>
  <div class="report-toolbar" data-html2canvas-ignore="true">
    <button type="button" onclick="${popupBlocked ? "window.history.back()" : "window.close()"}">${popupBlocked ? "Back to app" : "Close"}</button>
    <button type="button" onclick="window.print()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>Print</button>
    <button class="primary" type="button" onclick="window.downloadOverviewPdf(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 20h14"/></svg>Download PDF</button>
  </div>
  <div class="report-stage" id="reportStage">
    <main class="report-page" id="overviewReportPage">
      <header class="report-header">
        <div class="brand-lockup">
          <span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></svg></span>
          <div class="brand-copy"><strong>${escapeHtml(propertyName)}</strong><span>${escapeHtml(propertyAddress)}</span></div>
        </div>
        <div class="report-title"><span>Monthly financial overview</span><h1>${escapeHtml(month)}</h1></div>
        <div class="generated"><span>Prepared by</span><strong>${escapeHtml(generatedBy || "Administrator")}</strong><small>${escapeHtml(generatedDate)}</small></div>
      </header>

      <section class="kpi-grid">${kpiCards}</section>

      <section class="analytics-grid">
        <article class="panel">
          <div class="panel-head"><div><h2>Monthly cost mix</h2><p>Where this month's charges are concentrated</p></div><span class="panel-badge">${escapeHtml(formatMoney(costMixTotal))}</span></div>
          <div class="mix-body">
            <div class="donut-wrap"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="44" fill="none" stroke="#e9efeb" stroke-width="14"/>${ringSegments}</svg><div class="donut-center"><strong>${activeCostMix.length}</strong><span>cost groups</span></div></div>
            <div class="legend-list">${costLegend}</div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head"><div><h2>Bazar spending trend</h2><p>Daily purchase totals across the latest recorded days</p></div><span class="panel-badge">${numberValue(metrics.bazarCount)} entries</span></div>
          <div class="trend-body"><div class="trend-bars">${trendBars}</div></div>
        </article>

        <article class="panel">
          <div class="panel-head"><div><h2>Collection health</h2><p>Charges covered by payments and member credits</p></div></div>
          <div class="collection-body">
            <div class="progress-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="45" fill="none" stroke="#e8efea" stroke-width="11"/><circle cx="60" cy="60" r="45" fill="none" stroke="#159467" stroke-width="11" stroke-linecap="round" stroke-dasharray="${ringProgress.toFixed(2)} ${(ringCircumference - ringProgress).toFixed(2)}" transform="rotate(-90 60 60)"/></svg><div class="progress-copy"><strong>${collectionRate.toFixed(0)}%</strong><span>covered</span></div></div>
            <div class="collection-list"><div class="collection-item"><span>Covered</span><strong class="credit">${escapeHtml(formatMoney(totalCovered))}</strong></div><div class="collection-item"><span>Outstanding</span><strong class="due">${escapeHtml(formatMoney(outstanding))}</strong></div><div class="collection-item"><span>Recorded payments</span><strong>${escapeHtml(formatMoney(metrics.recordedPayments))}</strong></div></div>
          </div>
        </article>
      </section>

      <section class="detail-grid">
        <article class="panel members-panel">
          <div class="panel-head"><div><h2>Member balance snapshot</h2><p>Highest outstanding balances appear first · showing up to 6 members</p></div><span class="panel-badge">${numberValue(metrics.pendingMemberCount)} pending</span></div>
          <div class="members-table-wrap"><table><thead><tr><th>Member</th><th>Charges</th><th>Covered</th><th>Balance</th></tr></thead><tbody>${memberRows}</tbody></table></div>
        </article>

        <article class="panel insights-panel">
          <div class="panel-head"><div><h2>Cost drivers & insights</h2><p>Quick signals for the month</p></div></div>
          <div class="drivers">${driverRows}</div>
          <div class="panel-divider"></div>
          <div class="insight-grid">${insightItems}</div>
        </article>
      </section>

      <footer class="report-footer"><span>Monthly Hisab · Insight dashboard · ${escapeHtml(month)}</span><span class="confidential"><i></i>Private household financial report</span></footer>
    </main>
  </div>
  <script>
    (function(){
      var page = document.getElementById("overviewReportPage");
      var stage = document.getElementById("reportStage");
      var reportWidth = ${REPORT_WIDTH};
      var reportHeight = ${REPORT_HEIGHT};

      function fitPreview(){
        if (window.matchMedia("print").matches) return;
        var availableWidth = Math.max(320, window.innerWidth - 32);
        var availableHeight = Math.max(320, window.innerHeight - 92);
        var scale = Math.min(1, availableWidth / reportWidth, availableHeight / reportHeight);
        page.style.transform = "scale(" + scale + ")";
        stage.style.width = (reportWidth * scale) + "px";
        stage.style.height = (reportHeight * scale) + "px";
      }

      function resolveHtml2Canvas(){
        return window.__html2canvas || (window.opener && window.opener.__html2canvas);
      }

      function resolveJsPDF(){
        return window.__jsPDF || (window.opener && window.opener.__jsPDF);
      }

      window.downloadOverviewPdf = async function(button){
        if (button && button.disabled) return;
        var original = button ? button.innerHTML : "";
        try {
          var canvasLibrary = resolveHtml2Canvas();
          var PdfLibrary = resolveJsPDF();
          if (!canvasLibrary || !PdfLibrary) throw new Error("PDF libraries unavailable");
          if (button) {
            button.disabled = true;
            button.textContent = "Preparing PDF…";
          }
          page.style.transform = "none";
          stage.style.width = reportWidth + "px";
          stage.style.height = reportHeight + "px";
          await new Promise(function(resolve){ requestAnimationFrame(function(){ requestAnimationFrame(resolve); }); });
          var canvas = await canvasLibrary(page, {
            backgroundColor: "#f7faf8",
            scale: 2,
            useCORS: true,
            logging: false,
            width: reportWidth,
            height: reportHeight,
            windowWidth: reportWidth,
            windowHeight: reportHeight,
          });
          var pdf = new PdfLibrary({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
          var pageWidth = pdf.internal.pageSize.getWidth();
          var pageHeight = pdf.internal.pageSize.getHeight();
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
          pdf.save(${JSON.stringify(fileName)});
        } catch (error) {
          console.error("Overview PDF export failed:", error);
          window.print();
        } finally {
          if (button) {
            button.disabled = false;
            button.innerHTML = original;
          }
          fitPreview();
        }
      };

      window.addEventListener("resize", fitPreview);
      window.addEventListener("afterprint", fitPreview);
      window.addEventListener("load", fitPreview);
      fitPreview();
    })();
  </script>
</body>
</html>`);
  reportDocument.close();

  if (popupBlocked) {
    const reportBlob = new Blob(
      [`<!doctype html>${reportDocument.documentElement.outerHTML}`],
      { type: "text/html" },
    );
    window.location.assign(URL.createObjectURL(reportBlob));
  }
}
