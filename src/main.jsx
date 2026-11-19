import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Edit,
  CalendarDays,
  Check,
  Clock3,
  ArrowRight,
  ArrowDownRight,
  Home,
  ChartNoAxesColumn,
  PieChart,
  Search,
  Download,
  CheckCircle2,
  RotateCcw,
  Menu,
  X,
  Eye,
  EyeOff,
  Bell,
  ImagePlus,
  Send,
  Utensils,
  UtensilsCrossed,
  ArrowDown,
  ChevronDown,
  Zap,
  ShoppingBasket,
  Wifi,
  Flame,
  Droplets,
  ArrowUpDown,
  Brush,
  Phone,
  Copy,
  MessageCircle,
  Paperclip,
  ChevronRight,
  FileText,
  MoreVertical,
  CheckCheck,
  Images,
  Filter,
  Layers3,
  TriangleAlert,
  Scale,
  Sparkles,
  CreditCard,
  Wrench,
  Lightbulb,
  Megaphone,
  TrendingUp,
  Star,
  Gauge,
  Calculator,
  Info,
  Pencil,
  Moon,
  Sun,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./style.css";
import "@fontsource/baloo-da-2/bengali-500.css";
import "@fontsource/baloo-da-2/bengali-600.css";
import "./inbox.css";
import "./theme.css";
import "./theme-tail.css";
import { supabase, supabaseConfigured } from "./supabase";
import { openOverviewReport } from "./overviewReport";
import {
  findBazarFoodCatalogItem,
  getBazarFoodSearchScore,
  matchesBazarHistorySearch,
  normalizeBazarFoodSearch,
  searchBazarFoodCatalog,
} from "./bazarFoodCatalog";

const getInitialColorMode = () => {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("bh-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

if (typeof window !== "undefined") {
  window.__html2canvas = html2canvas;
  window.__jsPDF = jsPDF;
  const initialColorMode = getInitialColorMode();
  document.documentElement.dataset.theme = initialColorMode;
  document.documentElement.style.colorScheme = initialColorMode;
  try {
    localStorage.removeItem("monthly-hisab-appearance");
  } catch {}
}

const cleanedFoodIconCache = new Map();

function stripWhiteBackdropFromImage(img) {
  const w0 = img.naturalWidth || 0;
  const h0 = img.naturalHeight || 0;
  if (!w0 || !h0) return "";
  const scale = Math.min(1, 160 / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const isBgCandidate = (idx) => {
    const r = d[idx];
    const g = d[idx + 1];
    const b = d[idx + 2];
    const a = d[idx + 3];
    if (a < 18) return true;
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    return minC >= 240 && (maxC - minC) <= 14;
  };

  // Seed flood fill only from the outer 1px border so white parts inside food stay solid.
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = [];
  const tryPush = (x, y) => {
    const p = y * w + x;
    if (visited[p]) return;
    if (!isBgCandidate(p * 4)) return;
    visited[p] = 1;
    queue.push(p);
  };
  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  // Require at least a handful of connected white border pixels before stripping.
  if (!queue.length) return "";
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) tryPush(x - 1, y);
    if (x + 1 < w) tryPush(x + 1, y);
    if (y > 0) tryPush(x, y - 1);
    if (y + 1 < h) tryPush(x, y + 1);
  }
  if (queue.length < Math.max(8, Math.floor((w + h) * 0.4))) return "";

  for (let i = 0; i < queue.length; i++) {
    const idx = queue[i] * 4;
    const minC = Math.min(d[idx], d[idx + 1], d[idx + 2]);
    // Soft feather on anti-aliased fringe between 240..250
    const nextAlpha = minC >= 250 ? 0 : Math.round(((250 - minC) / 10) * d[idx + 3] * 0.55);
    d[idx + 3] = nextAlpha;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

function TransparentFoodIcon({ src, className = "bazar-common-uploaded-icon", style }) {
  const [resolvedSrc, setResolvedSrc] = useState(() => cleanedFoodIconCache.get(src) || src);

  useEffect(() => {
    if (!src) {
      setResolvedSrc("");
      return undefined;
    }
    const cached = cleanedFoodIconCache.get(src);
    if (cached) {
      setResolvedSrc(cached);
      return undefined;
    }
    if (/\.svg(?:$|\?)|^data:image\/svg\+xml/i.test(src)) {
      setResolvedSrc(src);
      return undefined;
    }
    let cancelled = false;
    const loader = new Image();
    loader.crossOrigin = "anonymous";
    loader.onload = () => {
      if (cancelled) return;
      try {
        const cleaned = stripWhiteBackdropFromImage(loader) || src;
        cleanedFoodIconCache.set(src, cleaned);
        setResolvedSrc(cleaned);
      } catch {
        setResolvedSrc(src);
      }
    };
    loader.onerror = () => {
      if (!cancelled) setResolvedSrc(src);
    };
    loader.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <img
      src={resolvedSrc}
      alt=""
      className={className}
      style={style}
    />
  );
}

const OilBottleIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="bhOilBody" x1="10" y1="9" x2="26" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="55%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="bhOilLabel" x1="12" y1="17" x2="24" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF9C3" />
        <stop offset="100%" stopColor="#FDE68A" />
      </linearGradient>
    </defs>
    <rect x="13.5" y="3" width="9" height="4.2" rx="1.6" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
    <path d="M14.5 7.2h7v3.3l4.3 4.2a3.2 3.2 0 0 1 .9 2.2V29a3.5 3.5 0 0 1-3.5 3.5H12.8A3.5 3.5 0 0 1 9.3 29V16.9a3.2 3.2 0 0 1 .9-2.2l4.3-4.2V7.2Z" fill="url(#bhOilBody)" stroke="#B45309" strokeWidth="1.25" />
    <path d="M12.2 17c0-1.2.4-2.1 1.3-2.9l1.2-1.1" stroke="#FEF9C3" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <rect x="12" y="17.5" width="12" height="9.2" rx="2" fill="url(#bhOilLabel)" stroke="#D97706" strokeWidth="0.9" />
    <path d="M18 19.3c1.6 1.7 2.5 2.9 2.5 4a2.5 2.5 0 1 1-5 0c0-1.1.9-2.3 2.5-4Z" fill="#EA580C" />
  </svg>
);

function canonSpiceName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\u0981/g, "")
    .replace(/\u09A1\u09BC/g, "ড়")
    .replace(/\u09A2\u09BC/g, "ঢ়")
    .replace(/\u09AF\u09BC/g, "য়")
    .toLowerCase();
}

function getSpiceIconVariant(clean) {
  const text = canonSpiceName(clean);
  if (!text) return null;
  if (text.includes("মুরগির মসলা") || text.includes("মুরগি মসলা") || text.includes("chicken masala") || text.includes("chicken spice")) {
    return "chicken";
  }
  if (text.includes("মাছের মসলা") || text.includes("মাছ মসলা") || text.includes("fish masala") || text.includes("fish spice")) {
    return "fish";
  }
  if (text.includes("বিরিয়ানি") || text.includes("biriyani") || text.includes("biryani") || text.includes("tehari") || text.includes("তেহারি") || text.includes("কাবাব মসলা")) {
    return "biryani";
  }
  if (text.includes("গরম মসলা") || text.includes("gorom mosla") || text.includes("garam masala") || text.includes("garam mosla")) {
    return "garam";
  }
  if (text.includes("জিরা") || text.includes("jira") || text.includes("jire") || text.includes("jeera") || text.includes("cumin")) {
    return "cumin";
  }
  if (text.includes("হলুদ") || text.includes("holud") || text.includes("halud") || text.includes("turmeric")) {
    return "turmeric";
  }
  if (
    text.includes("মরিচ গুড়া") ||
    text.includes("মরিচ গুরা") ||
    text.includes("মরিচের গুড়া") ||
    text.includes("শুকনা মরিচ") ||
    text.includes("chili powder") ||
    text.includes("chilli powder") ||
    text.includes("morich gura") ||
    ((text.startsWith("মসলা") || text.startsWith("মশলা")) && (text.includes("মরিচ") || text.includes("morich")) && !text.includes("গোলমরিচ"))
  ) {
    return "chili";
  }
  if (text.includes("ধনিয়া") || text.includes("dhonia") || text.includes("dhania") || text.includes("coriander")) {
    return "coriander";
  }
  if (text.includes("পাচ ফোড়ন") || text.includes("পাচফোড়ন") || text.includes("panch phoron") || text.includes("pach foron") || text.includes("five spice")) {
    return "panchPhoron";
  }
  if (text.includes("এলাচ") || text.includes("elach") || text.includes("elaichi") || text.includes("cardamom")) {
    return "cardamom";
  }
  if (text.includes("লবঙ্গ") || text.includes("lobongo") || text.includes("labanga") || text.includes("clove")) {
    return "clove";
  }
  if (text.includes("সরিষা") || text.includes("sorisha") || text.includes("mustard seed")) {
    return "mustard";
  }
  return null;
}

const SPICE_BOWL_THEMES = {
  cumin: {
    moundLight: "#D97706",
    moundMid: "#92400E",
    moundDark: "#5C2D0C",
    bowlRim: "#F5EDE3",
    bowlFill: "#D6C5B3",
    bowlStroke: "#8C6D52",
  },
  turmeric: {
    moundLight: "#FDE047",
    moundMid: "#F59E0B",
    moundDark: "#B45309",
    bowlRim: "#FFFBEB",
    bowlFill: "#F3E5AB",
    bowlStroke: "#B45309",
  },
  chili: {
    moundLight: "#F87171",
    moundMid: "#DC2626",
    moundDark: "#7F1D1D",
    bowlRim: "#FEF2F2",
    bowlFill: "#FECACA",
    bowlStroke: "#B91C1C",
  },
  coriander: {
    moundLight: "#BEF264",
    moundMid: "#65A30D",
    moundDark: "#3F6212",
    bowlRim: "#F7FEE7",
    bowlFill: "#D9F99D",
    bowlStroke: "#4D7C0F",
  },
  garam: {
    moundLight: "#EA580C",
    moundMid: "#9A3412",
    moundDark: "#431407",
    bowlRim: "#FFF7ED",
    bowlFill: "#FED7AA",
    bowlStroke: "#9A3412",
  },
  panchPhoron: {
    moundLight: "#EAB308",
    moundMid: "#854D0E",
    moundDark: "#422006",
    bowlRim: "#FEF9C3",
    bowlFill: "#E5D3B3",
    bowlStroke: "#713F12",
  },
  mustard: {
    moundLight: "#FACC15",
    moundMid: "#CA8A04",
    moundDark: "#713F12",
    bowlRim: "#FEFCE8",
    bowlFill: "#FDE68A",
    bowlStroke: "#A16207",
  },
};

const SpiceBazarIcon = ({ variant, size = 24 }) => {
  if (variant === "chicken" || variant === "fish" || variant === "biryani") {
    const packColors =
      variant === "chicken"
        ? { top: "#FB923C", mid: "#EA580C", dark: "#9A3412", band: "#FEF3C7", stroke: "#9A3412" }
        : variant === "fish"
          ? { top: "#2DD4BF", mid: "#0D9488", dark: "#115E59", band: "#CCFBF1", stroke: "#115E59" }
          : { top: "#F59E0B", mid: "#B45309", dark: "#78350F", band: "#FEF3C7", stroke: "#78350F" };
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id={`bhPack-${variant}`} x1="8" y1="6" x2="28" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={packColors.top} />
            <stop offset="58%" stopColor={packColors.mid} />
            <stop offset="100%" stopColor={packColors.dark} />
          </linearGradient>
        </defs>
        <path d="M9 5.5l2 1.8 2.2-1.8 2.3 1.8L18 5.5l2.5 1.8 2.3-1.8L25 7.3l2-1.8v25a2.2 2.2 0 0 1-2.2 2.2H11.2A2.2 2.2 0 0 1 9 30.5v-25Z" fill={`url(#bhPack-${variant})`} stroke={packColors.stroke} strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="9.6" y="11" width="16.8" height="14" rx="1.6" fill={packColors.band} opacity="0.95" />
        {variant === "chicken" && (
          <g transform="translate(10.5, 11.8)">
            <path d="M5.2 9.4c-1.8-1.4-2-4-.3-5.6 1.7-1.6 4.4-1.3 5.7.5.9 1.2.8 2.8-.2 3.8l2.5 2.4c.4.4.4 1.1-.1 1.5s-1.2.4-1.6 0l-2.4-2.5c-1.1.8-2.6.8-3.6-.1Z" fill="#C2410C" />
            <circle cx="12.7" cy="11.2" r="1.1" fill="#FDBA74" />
          </g>
        )}
        {variant === "fish" && (
          <g transform="translate(9.5, 12.2)">
            <path d="M3 6c2.6-3.2 7.4-3.2 10 0-2.6 3.2-7.4 3.2-10 0Z" fill="#0F766E" />
            <path d="M12.5 6l3.5-2.6v5.2L12.5 6Z" fill="#0F766E" />
            <circle cx="5.8" cy="5.5" r="0.9" fill="#CCFBF1" />
          </g>
        )}
        {variant === "biryani" && (
          <g transform="translate(18, 18)">
            <path d="M0-5.4L1.5-1.7l4 .3-3 2.5.9 3.9L0 3l-3.4 2 .9-3.9-3-2.5 4-.3L0-5.4Z" fill="#B45309" stroke="#78350F" strokeWidth="0.6" strokeLinejoin="round" />
          </g>
        )}
        <rect x="11.5" y="27.2" width="13" height="2" rx="1" fill="#FFFFFF" opacity="0.4" />
      </svg>
    );
  }

  if (variant === "cardamom") {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g transform="rotate(-24 14 20)">
          <ellipse cx="14" cy="20" rx="5.2" ry="9" fill="#4ADE80" stroke="#15803D" strokeWidth="1.2" />
          <path d="M14 11.5v17M11.5 13.5c-1 4-1 9 0 13M16.5 13.5c1 4 1 9 0 13" stroke="#166534" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
        </g>
        <g transform="rotate(20 23 18)">
          <ellipse cx="23" cy="18" rx="4.6" ry="8.2" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.2" />
          <path d="M23 10.4v15.2M20.8 12.2c-.8 3.6-.8 8 0 11.6" stroke="#15803D" strokeWidth="0.95" strokeLinecap="round" opacity="0.65" />
        </g>
      </svg>
    );
  }

  if (variant === "clove") {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g transform="rotate(-20 14 19)">
          <path d="M12.6 14h2.8l-.6 15h-1.6l-.6-15Z" fill="#7C2D12" />
          <circle cx="14" cy="11.5" r="3.4" fill="#B45309" stroke="#451A03" strokeWidth="1.1" />
          <path d="M11 10.5c1.8 1 4.2 1 6 0" stroke="#FDE68A" strokeWidth="1" opacity="0.55" />
        </g>
        <g transform="rotate(24 23 18)">
          <path d="M21.8 13.8h2.4l-.5 13.5h-1.4l-.5-13.5Z" fill="#5C2D0C" />
          <circle cx="23" cy="11.4" r="3.1" fill="#92400E" stroke="#451A03" strokeWidth="1.1" />
        </g>
      </svg>
    );
  }

  const theme = SPICE_BOWL_THEMES[variant] || SPICE_BOWL_THEMES.cumin;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`bhMound-${variant}`} x1="18" y1="8" x2="18" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={theme.moundLight} />
          <stop offset="55%" stopColor={theme.moundMid} />
          <stop offset="100%" stopColor={theme.moundDark} />
        </linearGradient>
      </defs>
      {/* Spice powder mound */}
      <path d="M7.5 20.5c2-5.4 6.2-10.5 10.5-10.5s8.5 5.1 10.5 10.5H7.5Z" fill={`url(#bhMound-${variant})`} stroke={theme.moundDark} strokeWidth="0.9" strokeLinejoin="round" />
      {/* Variant-specific spice accents */}
      {variant === "cumin" && (
        <g fill="#451A03" opacity="0.82">
          <ellipse cx="15" cy="15.2" rx="1.6" ry="0.6" transform="rotate(-25 15 15.2)" />
          <ellipse cx="20.4" cy="16.4" rx="1.6" ry="0.6" transform="rotate(30 20.4 16.4)" />
          <ellipse cx="17.8" cy="12.6" rx="1.5" ry="0.55" transform="rotate(10 17.8 12.6)" />
          <ellipse cx="13.2" cy="18.2" rx="1.4" ry="0.55" transform="rotate(42 13.2 18.2)" />
          <ellipse cx="22.5" cy="18.4" rx="1.4" ry="0.55" transform="rotate(-35 22.5 18.4)" />
        </g>
      )}
      {variant === "turmeric" && (
        <g>
          <path d="M23.5 9.2c2.2-1.8 5.2-1.1 5.6.8.3 1.4-1.3 2.8-3.6 3.5-1.8.5-2.9-.8-2-4.3Z" fill="#D97706" stroke="#92400E" strokeWidth="0.9" />
          <path d="M25 10.3l2.4.7M24.6 11.7l2 .5" stroke="#FEF08A" strokeWidth="0.85" strokeLinecap="round" />
        </g>
      )}
      {variant === "chili" && (
        <g>
          <path d="M22.5 14.5c2.2-3.4 4.8-5.1 7.2-5-1.1 3.7-3.1 6.7-6 7.8-.9.3-1.8-.4-1.6-1.3l.4-1.5Z" fill="#DC2626" stroke="#7F1D1D" strokeWidth="0.9" />
          <path d="M28.8 9.6c.9-.9 1.8-1.1 2.7-.8" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
      {variant === "coriander" && (
        <g>
          <path d="M21 11.2c1.2-2.6 4.1-3.8 6-2.5-.4 2.3-2.6 4-5.2 3.8l-.8-1.3Z" fill="#16A34A" stroke="#14532D" strokeWidth="0.8" />
          <circle cx="14.5" cy="16.3" r="1.05" fill="#FEF08A" stroke="#713F12" strokeWidth="0.45" />
          <circle cx="18.4" cy="13.8" r="1.05" fill="#FEF08A" stroke="#713F12" strokeWidth="0.45" />
          <circle cx="21.5" cy="17.8" r="1.05" fill="#FEF08A" stroke="#713F12" strokeWidth="0.45" />
        </g>
      )}
      {variant === "garam" && (
        <g>
          <rect x="21" y="7.5" width="7.2" height="2.6" rx="1.2" transform="rotate(28 21 7.5)" fill="#78350F" stroke="#451A03" strokeWidth="0.8" />
          <circle cx="15.2" cy="15.5" r="1.15" fill="#FDE68A" opacity="0.85" />
          <circle cx="19.8" cy="16.8" r="1.05" fill="#451A03" opacity="0.7" />
        </g>
      )}
      {(variant === "panchPhoron" || variant === "mustard") && (
        <g>
          <circle cx="15" cy="15.5" r="1.15" fill="#1E293B" />
          <circle cx="18.2" cy="13.4" r="1.15" fill="#15803D" />
          <circle cx="21" cy="16.5" r="1.15" fill="#FACC15" />
          <circle cx="13" cy="18.4" r="1.1" fill="#78350F" />
          <circle cx="18.4" cy="18.1" r="1.1" fill="#B45309" />
        </g>
      )}
      {/* Ceramic bowl */}
      <ellipse cx="18" cy="20.4" rx="12.2" ry="2.7" fill={theme.bowlRim} stroke={theme.bowlStroke} strokeWidth="1.1" />
      <path d="M5.8 20.4c.8 6.4 5.4 10.6 12.2 10.6s11.4-4.2 12.2-10.6c-3.4 1.5-7.6 2.1-12.2 2.1s-8.8-.6-12.2-2.1Z" fill={theme.bowlFill} stroke={theme.bowlStroke} strokeWidth="1.15" strokeLinejoin="round" />
      <rect x="12.8" y="30.2" width="10.4" height="2.1" rx="1" fill={theme.bowlStroke} opacity="0.85" />
    </svg>
  );
};

const BAZAR_COMMON_ITEMS = [
  { id: "chal", name: "চাল", emoji: "🍚", defaultUnit: "kg", hint: "চালের দাম ও পরিমান লিখুন" },
  { id: "dal", name: "ডাল", emoji: "🥣", defaultUnit: "kg", hint: "ডালের দাম ও পরিমান লিখুন" },
  { id: "tel", name: "তেল", emoji: "oil", iconType: "oil", defaultUnit: "liter", hint: "তেলের দাম ও পরিমান লিখুন" },
  { id: "sobji", name: "সবজি", emoji: "🥬", defaultUnit: "kg", hint: "সবজির দাম ও পরিমান লিখুন" },
  { id: "mangsho", name: "মাংস", emoji: "🥩", defaultUnit: "kg", hint: "মাংসের দাম ও পরিমান লিখুন" },
  { id: "mach", name: "মাছ", emoji: "🐟", defaultUnit: "kg", hint: "মাছের দাম ও পরিমান লিখুন" },
  { id: "dim", name: "ডিম", emoji: "🥚", defaultUnit: "pcs", hint: "ডিমের দাম ও পরিমান লিখুন" },
  { id: "mosla", name: "মসলা", emoji: "🫙", defaultUnit: "pack", hint: "মসলার দাম ও পরিমান লিখুন" },
  { id: "peyaj", name: "পেঁয়াজ", emoji: "🧅", defaultUnit: "kg", hint: "পেঁয়াজের দাম ও পরিমান লিখুন" },
  { id: "morich", name: "মরিচ", emoji: "🌶️", defaultUnit: "gram", hint: "মরিচের দাম ও পরিমান লিখুন" },
  { id: "rosun", name: "রসুন", emoji: "🧄", defaultUnit: "gram", hint: "রসুনের দাম ও পরিমান লিখুন" },
  { id: "others", name: "অন্যান্য", emoji: "•••", defaultUnit: "pc", hint: "আইটেমের নাম, দাম ও পরিমান লিখুন", isCustom: true },
];

let latestCommonBazarItems = BAZAR_COMMON_ITEMS;

const BAZAR_UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "gram", label: "gram" },
  { value: "liter", label: "liter" },
  { value: "pcs", label: "pcs" },
  { value: "pack", label: "pack" },
  { value: "tray", label: "tray" },
  { value: "pc", label: "pc" },
];

const COMMON_UNIT_OPTIONS = BAZAR_UNIT_OPTIONS.filter((opt) => opt.value !== "tray");

/** Portal-based listbox styled to match the app's month dropdown across modals and filters. */
function PremiumDropdown({
  id,
  value,
  onChange,
  options = [],
  ariaLabel,
  menuLabel = "SELECT OPTION",
  disabled = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  minMenuWidth = 176,
  align = "right",
  leadingIcon = null,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const normalizedOptions = useMemo(
    () =>
      (options || []).map((opt) =>
        typeof opt === "string" || typeof opt === "number"
          ? { value: String(opt), label: String(opt), icon: null }
          : {
              value: String(opt?.value ?? ""),
              label: String(opt?.label ?? opt?.value ?? ""),
              icon: opt?.icon ?? null,
            },
      ),
    [options],
  );
  const activeOption =
    normalizedOptions.find((opt) => opt.value === String(value ?? "")) ||
    normalizedOptions[0] || { value: "", label: "" };

  const computeMenuPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === "undefined") return;
    const rect = triggerEl.getBoundingClientRect();
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 375;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 667;
    const width = Math.min(viewportW - 16, Math.max(rect.width, minMenuWidth));
    const preferredLeft = align === "left" ? rect.left : rect.right - width;
    const left = Math.max(8, Math.min(preferredLeft, viewportW - width - 8));
    const estimatedHeight = Math.min(350, 38 + normalizedOptions.length * 37 + 16);
    const spaceBelow = viewportH - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const openUp = spaceBelow < Math.min(estimatedHeight, 210) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(360, openUp ? spaceAbove : spaceBelow));
    setCoords({
      left: Math.round(left),
      width: Math.round(width),
      top: openUp ? undefined : Math.round(rect.bottom + 8),
      bottom: openUp ? Math.round(viewportH - rect.top + 8) : undefined,
      maxHeight: Math.round(maxHeight),
      openUp,
    });
  }, [align, minMenuWidth, normalizedOptions.length]);

  useLayoutEffect(() => {
    if (!open) return;
    computeMenuPosition();
  }, [open, computeMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleScrollOrResize = (event) => {
      if (event?.type === "scroll" && menuRef.current?.contains(event.target)) return;
      computeMenuPosition();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, computeMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const selectedBtn = menuRef.current?.querySelector(".premium-select-option.is-selected");
    const firstBtn = menuRef.current?.querySelector(".premium-select-option");
    (selectedBtn || firstBtn)?.focus({ preventScroll: true });
  }, [open]);

  const handleMenuKeyDown = (event) => {
    const items = Array.from(menuRef.current?.querySelectorAll(".premium-select-option") || []);
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  return (
    <div
      className={`premium-select-wrap${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`premium-select-trigger${open ? " is-open" : ""}${triggerClassName ? ` ${triggerClassName}` : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          if (!open) computeMenuPosition();
          setOpen((prev) => !prev);
        }}
      >
        {leadingIcon ? (
          <span className="premium-select-leading-icon" aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        <span className="premium-select-value">{activeOption.label}</span>
        <ChevronDown
          className={`premium-select-chevron${open ? " is-open" : ""}`}
          size={15}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className={`premium-select-menu${coords?.openUp ? " is-upward" : ""}${menuClassName ? ` ${menuClassName}` : ""}`}
            role="listbox"
            aria-label={ariaLabel || menuLabel}
            style={
              coords
                ? {
                    position: "fixed",
                    left: `${coords.left}px`,
                    width: `${coords.width}px`,
                    top: coords.top !== undefined ? `${coords.top}px` : "auto",
                    bottom: coords.bottom !== undefined ? `${coords.bottom}px` : "auto",
                    maxHeight: `${coords.maxHeight}px`,
                  }
                : undefined
            }
            onKeyDown={handleMenuKeyDown}
          >
            {menuLabel ? <span className="premium-select-label">{menuLabel}</span> : null}
            <div className="premium-select-options">
              {normalizedOptions.map((opt) => {
                const selected = opt.value === String(value ?? "");
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`premium-select-option${selected ? " is-selected" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange?.(opt.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    {opt.icon ? (
                      <span className="premium-select-option-icon" aria-hidden="true">
                        {opt.icon}
                      </span>
                    ) : null}
                    <span className="premium-select-option-text">{opt.label}</span>
                    {selected ? (
                      <CheckCircle2
                        className="premium-select-option-check"
                        size={15}
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function renderCommonBazarIcon(preset, size = 24) {
  if (!preset) return "🛒";
  if (preset.iconUrl) {
    return (
      <TransparentFoodIcon
        src={preset.iconUrl}
        className="bazar-common-uploaded-icon"
        style={{ width: size, height: size }}
      />
    );
  }
  if (preset.iconType === "oil" || preset.id === "tel") {
    return <OilBottleIcon size={size} />;
  }
  return preset.emoji || "🛒";
}

const BAZAR_MOSHLA_OPTIONS = [
  "জিরা গুড়া",
  "হলুদ গুড়া",
  "মরিচ গুড়া",
  "ধনিয়া গুড়া",
  "গরম মসলা",
  "মুরগির মসলা",
  "মাছের মসলা",
];

const BAZAR_MANGSHO_OPTIONS = ["মুরগি", "গরু"];

const BAZAR_SHOBJI_SUGGESTIONS = [
  { name: "আলু", aliases: ["alu", "alo", "aloo", "aalu", "potato", "potatoes"] },
  { name: "বেগুন", aliases: ["begun", "brinjal", "eggplant"] },
  { name: "পটল", aliases: ["potol", "patol", "pointed gourd"] },
  { name: "করলা", aliases: ["korola", "karela", "bitter gourd"] },
  { name: "টমেটো", aliases: ["tomato", "tometo"] },
  { name: "লাউ", aliases: ["lau", "bottle gourd"] },
  { name: "মিষ্টি কুমড়া", aliases: ["misti kumra", "mishti kumra", "kumra", "pumpkin"] },
  { name: "চাল কুমড়া", aliases: ["chal kumra", "ash gourd"] },
  { name: "ঝিঙ্গা", aliases: ["jhinga", "jhinge", "ridge gourd"] },
  { name: "চিচিঙ্গা", aliases: ["chichinga", "snake gourd"] },
  { name: "ঢেঁড়স", aliases: ["derosh", "dherosh", "bhindi", "okra"] },
  { name: "বরবটি", aliases: ["borboti", "long bean"] },
  { name: "শিম", aliases: ["shim", "sim", "bean"] },
  { name: "ফুলকপি", aliases: ["fulkopi", "phulkopi", "cauliflower"] },
  { name: "বাঁধাকপি", aliases: ["badhakopi", "bandhakopi", "cabbage"] },
  { name: "গাজর", aliases: ["gajor", "carrot"] },
  { name: "মুলা", aliases: ["mula", "radish"] },
  { name: "শসা", aliases: ["shosha", "sosa", "cucumber"] },
  { name: "পেঁপে", aliases: ["pepe", "papaya"] },
  { name: "কাঁচা কলা", aliases: ["kacha kola", "kola"] },
  { name: "কাঁকরোল", aliases: ["kakrol", "teasel gourd"] },
  { name: "কচুর মুখী", aliases: ["kochur mukhi", "mukhi", "kochu"] },
  { name: "কচুর লতি", aliases: ["kochur loti", "loti"] },
  { name: "লাল শাক", aliases: ["lal shak", "lal sak", "shak", "sak"] },
  { name: "পালং শাক", aliases: ["palong shak", "palong", "spinach", "shak"] },
  { name: "পুঁই শাক", aliases: ["pui shak", "pui", "shak"] },
  { name: "কলমি শাক", aliases: ["kolmi shak", "kolmi", "shak"] },
  { name: "লাউ শাক", aliases: ["lau shak", "shak"] },
  { name: "ডাটা", aliases: ["data", "stem"] },
  { name: "ধনেপাতা", aliases: ["dhonepata", "dhoniapata", "coriander"] },
];

const BAZAR_MACH_SUGGESTIONS = [
  { name: "রুই", aliases: ["rui", "rohu"] },
  { name: "কাতলা", aliases: ["katla", "catla"] },
  { name: "তেলাপিয়া", aliases: ["tilapia", "telapiya", "telapia"] },
  { name: "ইলিশ", aliases: ["ilish", "hilsa", "elish"] },
  { name: "পাঙ্গাস", aliases: ["pangash", "pangas"] },
  { name: "চিংড়ি", aliases: ["chingri", "shrimp", "prawn"] },
  { name: "কই", aliases: ["koi"] },
  { name: "শিং", aliases: ["shing", "sing"] },
  { name: "মাগুর", aliases: ["magur"] },
  { name: "পাবদা", aliases: ["pabda"] },
  { name: "বোয়াল", aliases: ["boal"] },
  { name: "মৃগেল", aliases: ["mrigel", "mrigal"] },
  { name: "রূপচাঁদা", aliases: ["rupchanda", "rupchada"] },
  { name: "টেংরা", aliases: ["tengra", "tangra"] },
  { name: "শোল", aliases: ["shol"] },
  { name: "চিতল", aliases: ["chital"] },
  { name: "পুঁটি", aliases: ["puti", "punti"] },
  { name: "কাচকি", aliases: ["kachki"] },
  { name: "বাটা", aliases: ["bata"] },
  { name: "কোরাল", aliases: ["koral", "bhetki"] },
];

const BAZAR_NESTED_SEARCH_OPTIONS = {
  sobji: BAZAR_SHOBJI_SUGGESTIONS,
  mach: BAZAR_MACH_SUGGESTIONS,
  mosla: BAZAR_MOSHLA_OPTIONS.map((name) => ({
    name,
    aliases: ({
      "জিরা গুড়া": ["jira", "jire", "cumin"],
      "হলুদ গুড়া": ["holud", "turmeric"],
      "মরিচ গুড়া": ["morich gura", "chili powder", "chilli powder"],
      "ধনিয়া গুড়া": ["dhonia gura", "coriander powder"],
      "গরম মসলা": ["gorom mosla", "garam masala"],
      "মুরগির মসলা": ["murgir mosla", "chicken masala"],
      "মাছের মসলা": ["macher mosla", "fish masala"],
    })[name] || [],
  })),
  mangsho: BAZAR_MANGSHO_OPTIONS.map((name) => ({
    name,
    aliases: name === "মুরগি" ? ["murgi", "chicken"] : ["goru", "beef", "cow"],
  })),
};

function isSobjiBaseName(baseName) {
  const clean = String(baseName || "").trim();
  if (!clean) return { isSobji: false, subName: "" };
  const lower = clean.toLowerCase();
  if (clean === "সবজি" || lower === "vegetables" || lower === "veg") {
    return { isSobji: true, subName: "সাধারণ সবজি" };
  }
  const prefixMatch = clean.match(/^সবজি\s*[-–:]\s*(.+)$/);
  if (prefixMatch) {
    return { isSobji: true, subName: prefixMatch[1].trim() || "সাধারণ সবজি" };
  }
  const matched = BAZAR_SHOBJI_SUGGESTIONS.find(
    (s) => s.name === clean || s.aliases.some((a) => a === lower),
  );
  if (matched) {
    return { isSobji: true, subName: matched.name };
  }
  return { isSobji: false, subName: "" };
}

function classifyBazarDashboardGroup(baseName) {
  const clean = String(baseName || "").trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();

  const sobjiInfo = isSobjiBaseName(clean);
  if (sobjiInfo.isSobji) {
    return { groupName: "সবজি", emoji: "🥬", subName: sobjiInfo.subName };
  }

  // Check মশলা before মাছ/মরিচ because "মাছের মসলা" & "মরিচ গুড়া" belong to মসলা
  if (
    clean === "মসলা" ||
    lower === "spices" ||
    lower === "masala" ||
    clean.includes("মসলা") ||
    clean.includes("গুড়া") ||
    BAZAR_MOSHLA_OPTIONS.some((opt) => clean.toLowerCase().includes(opt.toLowerCase()))
  ) {
    const subName =
      clean === "মসলা" || lower === "spices" || lower === "masala"
        ? "সাধারণ মসলা"
        : clean.replace(/^মসলা\s*[-–:]\s*/, "").trim() || "সাধারণ মসলা";
    return { groupName: "মসলা", emoji: "🫙", subName };
  }

  // Check মাংস
  if (
    clean === "মাংস" ||
    lower === "meat" ||
    lower === "chicken" ||
    lower === "beef" ||
    clean.includes("মাংস") ||
    BAZAR_MANGSHO_OPTIONS.some((opt) => clean === opt || clean.includes(opt))
  ) {
    const subName =
      clean === "মাংস" || lower === "meat"
        ? "সাধারণ মাংস"
        : clean.replace(/^মাংস\s*[-–:]\s*/, "").trim() || "সাধারণ মাংস";
    return { groupName: "মাংস", emoji: "🥩", subName };
  }

  // Check মাছ
  const machPrefix = clean.match(/^মাছ\s*[-–:]\s*(.+)$/);
  const matchedMach = BAZAR_MACH_SUGGESTIONS.find(
    (m) => clean === m.name || clean === `${m.name} মাছ` || m.aliases.some((a) => a === lower),
  );
  if (
    clean === "মাছ" ||
    lower === "fish" ||
    machPrefix ||
    matchedMach ||
    clean.includes("মাছ")
  ) {
    const subName =
      clean === "মাছ" || lower === "fish"
        ? "সাধারণ মাছ"
        : machPrefix
          ? machPrefix[1].trim() || "সাধারণ মাছ"
          : matchedMach
            ? matchedMach.name
            : clean;
    return { groupName: "মাছ", emoji: "🐟", subName };
  }

  return null;
}

function getBazarFieldSuggestions(list, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const item of list) {
    const nameLower = item.name.toLowerCase();
    if (nameLower === q) continue;
    if (nameLower.startsWith(q) || item.aliases.some((alias) => alias.startsWith(q))) {
      starts.push(item);
    } else if (nameLower.includes(q) || item.aliases.some((alias) => alias.includes(q))) {
      contains.push(item);
    }
  }
  return [...starts, ...contains].slice(0, 6);
}

function renderBazarSuggestList(list, emoji, query, onSelect, ariaLabel) {
  const suggestions = getBazarFieldSuggestions(list, query);
  if (!suggestions.length) return null;
  return (
    <div className="bazar-sobji-suggest-list" role="listbox" aria-label={ariaLabel}>
      {suggestions.map((item) => (
        <button
          key={item.name}
          type="button"
          className="bazar-sobji-suggest-item"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(item.name);
          }}
          onClick={() => onSelect(item.name)}
        >
          <span aria-hidden="true">{emoji}</span>
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  );
}

const BAZAR_ITEM_ALIAS_IDS = [
  ["rice", "chal"],
  ["dal", "dal"],
  ["lentil", "dal"],
  ["oil", "tel"],
  ["veg", "sobji"],
  ["meat", "mangsho"],
  ["beef", "mangsho"],
  ["chicken", "mangsho"],
  ["fish", "mach"],
  ["egg", "dim"],
  ["spice", "mosla"],
  ["onion", "peyaj"],
  ["chili", "morich"],
  ["chilli", "morich"],
  ["garlic", "rosun"],
];

function isOilFoodName(clean) {
  if (!clean) return false;
  if (clean.includes("নারিকেল") || clean.includes("coconut") || clean.includes("olive") || clean.includes("অলিভ") || clean.includes("সূর্যমুখী") || clean.includes("sunflower")) {
    return false;
  }
  return (
    clean === "তেল" ||
    clean === "tel" ||
    clean === "oil" ||
    clean.includes("সয়াবিন তেল") ||
    clean.includes("সরিষার তেল") ||
    /\b(oil|tel)\b/.test(clean)
  );
}

function renderBazarItemIcon(itemName, size = 18) {
  const clean = normalizeBazarFoodSearch(String(itemName || "").replace(/\([^)]*\)/g, ""));
  if (isOilFoodName(clean)) {
    const telPreset = latestCommonBazarItems.find((preset) => preset.id === "tel");
    if (telPreset?.iconUrl) return renderCommonBazarIcon(telPreset, size);
    return <OilBottleIcon size={size} />;
  }
  const spiceVariant = getSpiceIconVariant(clean);
  if (spiceVariant) return <SpiceBazarIcon variant={spiceVariant} size={size} />;
  const catalogItem = findBazarFoodCatalogItem(clean);
  if (catalogItem?.emoji) return catalogItem.emoji;
  const presets = [...latestCommonBazarItems]
    .filter((preset) => !preset.isCustom && String(preset.name || "").trim())
    .sort((a, b) => String(b.name).length - String(a.name).length);
  let matched = presets.find((preset) => {
    const presetName = String(preset.name).trim().toLowerCase();
    return (
      clean === presetName ||
      clean.startsWith(`${presetName} -`) ||
      clean.startsWith(`${presetName}:`) ||
      clean.includes(presetName)
    );
  });
  if (!matched && clean) {
    const alias = BAZAR_ITEM_ALIAS_IDS.find(([key]) => clean.includes(key));
    if (alias) matched = presets.find((preset) => preset.id === alias[1]);
  }
  if (matched) return renderCommonBazarIcon(matched, size);
  if (
    clean.includes("মসলা") ||
    clean.includes("গুড়া") ||
    BAZAR_MOSHLA_OPTIONS.some((opt) => clean.includes(opt.toLowerCase()))
  ) {
    return "🫙";
  }
  if (clean.includes("মুরগি") || clean.includes("গরু")) {
    return "🥩";
  }
  if (isSobjiBaseName(clean).isSobji) {
    return "🥬";
  }
  if (
    BAZAR_MACH_SUGGESTIONS.some(
      (m) => clean === m.name.toLowerCase() || m.aliases.some((a) => a === clean),
    )
  ) {
    return "🐟";
  }
  return "🛒";
}

function renderBazarReportIcon(itemName, size = 18) {
  const clean = normalizeBazarFoodSearch(
    String(itemName || "").replace(/\([^)]*\)/g, ""),
  );
  if (isOilFoodName(clean)) {
    const telPreset = latestCommonBazarItems.find((preset) => preset.id === "tel");
    if (telPreset?.iconUrl) return renderCommonBazarIcon(telPreset, size);
    return <OilBottleIcon size={size} />;
  }
  const spiceVariant = getSpiceIconVariant(clean);
  if (spiceVariant) return <SpiceBazarIcon variant={spiceVariant} size={size} />;
  return renderBazarItemIcon(itemName, size);
}

const starter = {
  month: "October 2026",
  currentCount: 0,
  currentMembers: [],
  users: [],
  categories: [],
  payments: [],
  expenses: [],
  bazars: [],
  contributions: [],
  settlements: [],
};
const FLAT_RENT_NAME = "Flat rent";
const isFlatRentName = (value) =>
  String(value || "").trim().toLowerCase() === FLAT_RENT_NAME.toLowerCase();
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const hasMoney = (value) => Math.abs(roundMoney(value)) >= 0.01;
const settlementPaidValue = (settlement) =>
  roundMoney(
    settlement?.paidAmount ??
      settlement?.paid_amount ??
      (settlement?.status === "completed" ? settlement?.amount : 0),
  );
const settlementRemainingValue = (settlement) =>
  Math.max(0, roundMoney(Number(settlement?.amount || 0) - settlementPaidValue(settlement)));
const settlementStatusLabel = (status) =>
  status === "completed"
    ? "Completed"
    : status === "partially_paid"
      ? "Partially Paid"
      : "Pending";
const isMissingSettlementTableError = (error) =>
  ["42P01", "PGRST205"].includes(error?.code) ||
  /member_settlements|schema cache/i.test(String(error?.message || ""));
const money = (n) => {
  const num = Number(n || 0);
  const formatted = Math.abs(num).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  return num < 0 ? `-৳${formatted}` : `৳${formatted}`;
};
const getBazarItemSummary = (raw) => {
  let entries = Array.isArray(raw) ? raw : null;
  if (!entries && typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = parsed;
    } catch {}
  }
  const getName = (entry) => {
    if (typeof entry === "string") return entry.trim();
    if (!entry || typeof entry !== "object") return "";
    const value = entry.item ?? entry.name ?? entry.title;
    return String(typeof value === "string" ? value : (value?.name ?? value?.item ?? "")).trim();
  };
  return entries
    ? entries.map(getName).filter(Boolean).join(", ")
    : String(raw || "");
};
const getBazarCombineMeta = (b) => {
  if (!b) return null;
  const items = Array.isArray(b.items) ? b.items : [];
  for (const it of items) {
    if (it && typeof it === "object" && it.combine_id) {
      return {
        combineId: it.combine_id,
        role: it.combine_role || (b.paidFromCash ? "cash" : "member"),
        cashAmount: Number(it.combine_cash_amount) || (b.paidFromCash ? b.amount : 0),
        memberAmount: Number(it.combine_member_amount) || (!b.paidFromCash ? b.amount : 0),
        memberId: it.combine_member_id || (!b.paidFromCash ? b.paidBy : null),
        fullItems: Array.isArray(it.combine_full_items) && it.combine_full_items.length ? it.combine_full_items : null,
      };
    }
  }
  return null;
};

const groupMonthBazar = (entries) => {
  if (!entries || !entries.length) return [];
  const result = [];
  const handledIds = new Set();

  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    if (handledIds.has(a.id)) continue;

    const aMeta = getBazarCombineMeta(a);
    let partner = null;

    if (aMeta?.combineId) {
      for (let j = 0; j < entries.length; j++) {
        if (i !== j && !handledIds.has(entries[j].id)) {
          const b = entries[j];
          const bMeta = getBazarCombineMeta(b);
          if (bMeta?.combineId === aMeta.combineId) {
            partner = b;
            break;
          }
        }
      }
    }

    if (!partner) {
      for (let j = 0; j < entries.length; j++) {
        if (i !== j && !handledIds.has(entries[j].id)) {
          const b = entries[j];
          if (
            a.date === b.date &&
            Boolean(a.paidFromCash) !== Boolean(b.paidFromCash) &&
            a.createdBy === b.createdBy
          ) {
            const aNames = (Array.isArray(a.items) ? a.items : []).map(it => typeof it === "string" ? it.trim() : it.item?.trim()).filter(Boolean).sort().join("|");
            const bNames = (Array.isArray(b.items) ? b.items : []).map(it => typeof it === "string" ? it.trim() : it.item?.trim()).filter(Boolean).sort().join("|");
            if (aNames && bNames && aNames === bNames) {
              partner = b;
              break;
            }
          }
        }
      }
    }

    if (partner) {
      handledIds.add(a.id);
      handledIds.add(partner.id);

      const cashEntry = a.paidFromCash ? a : partner;
      const memberEntry = a.paidFromCash ? partner : a;
      const meta = getBazarCombineMeta(cashEntry) || getBazarCombineMeta(memberEntry);
      const totalAmount = roundMoney(Number(cashEntry.amount || 0) + Number(memberEntry.amount || 0));

      let combinedItems = [];
      if (meta?.fullItems && Array.isArray(meta.fullItems) && meta.fullItems.length) {
        combinedItems = meta.fullItems;
      } else {
        const itemMap = new Map();
        const addItems = (items) => {
          (Array.isArray(items) ? items : []).forEach((it) => {
            const name = typeof it === "string" ? it.trim() : (it?.item || it?.name || "").trim();
            if (!name) return;
            const price = Number(it?.original_price ?? it?.price ?? 0) || 0;
            if (!itemMap.has(name)) {
              itemMap.set(name, { item: name, price });
            } else {
              const cur = itemMap.get(name);
              if (price > 0) cur.price = roundMoney(cur.price + price);
            }
          });
        };
        addItems(cashEntry.items);
        addItems(memberEntry.items);
        combinedItems = Array.from(itemMap.values());
      }

      result.push({
        id: `combine_${cashEntry.id}_${memberEntry.id}`,
        isCombined: true,
        combineId: meta?.combineId || `combine_${cashEntry.id}`,
        date: cashEntry.date || memberEntry.date,
        totalAmount,
        amount: totalAmount,
        cashAmount: Number(cashEntry.amount || 0),
        memberAmount: Number(memberEntry.amount || 0),
        memberId: memberEntry.paidBy,
        cashEntry,
        memberEntry,
        entries: [cashEntry, memberEntry],
        items: combinedItems,
        createdBy: cashEntry.createdBy || memberEntry.createdBy,
        month: cashEntry.month,
      });
    } else {
      handledIds.add(a.id);
      result.push(a);
    }
  }

  return result;
};

const splitBazarItems = (items, targetAmount, totalAmount) => {
  if (!items || !items.length) return [{ item: "Bazar item", price: targetAmount }];
  if (items.length === 1) {
    return [{ ...items[0], price: targetAmount }];
  }
  let running = 0;
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (i === items.length - 1) {
      const remaining = roundMoney(targetAmount - running);
      result.push({ ...it, price: Math.max(0, remaining) });
    } else {
      const share = roundMoney((it.price / totalAmount) * targetAmount);
      running = roundMoney(running + share);
      result.push({ ...it, price: share });
    }
  }
  return result;
};
const isMissingActivityNotificationSchemaError = (error) =>
  /kind|activity_type|entity_id|metadata/i.test(String(error?.message || "")) &&
  /column|schema cache|does not exist|not found/i.test(String(error?.message || ""));
const notificationDayKey = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
const formatNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const time = date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  });
  if (notificationDayKey(date) === notificationDayKey(now)) return `Today · ${time}`;
  if (notificationDayKey(date) === notificationDayKey(new Date(now.getTime() - 86400000))) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};
const getNotificationBody = (notification, currentUser) => {
  if (notification?.kind !== "activity") return notification?.body || "";
  const meta = notification.metadata && typeof notification.metadata === "object"
    ? notification.metadata
    : {};
  const memberName = String(meta.member_name || "একজন সদস্য");
  const actorName = String(meta.actor_name || memberName);
  if (notification.activity_type === "bazar_added") {
    const payer = meta.paid_from_cash ? `${actorName} Cash in Hand থেকে` : memberName;
    const itemSummary = getBazarItemSummary(meta.items)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
    return `${payer} বাজার করেছে${itemSummary ? ` (${itemSummary})` : ""}।`;
  }
  if (notification.activity_type === "payment_confirmed") {
    const paymentLabel = meta.payment_type === "meal" ? "মিল" : "রেন্ট";
    return String(meta.member_id || "") === String(currentUser?.id || "")
      ? `তোমার ${paymentLabel} পেমেন্ট Confirm হয়েছে।`
      : `${memberName}-এর ${paymentLabel} পেমেন্ট Confirm হয়েছে।`;
  }
  if (notification.activity_type === "cash_contribution_added") {
    return String(meta.member_id || "") === String(currentUser?.id || "")
      ? `তোমার Cash in Hand contribution যোগ হয়েছে।`
      : `${memberName} Cash in Hand-এ contribution করেছে।`;
  }
  return notification.body || "নতুন হিসাবের activity যোগ হয়েছে।";
};
const isBazarNotification = (notification) =>
  notification?.activity_type === "bazar_added" ||
  notification?.title === "New Bazar Added";

function NotificationGlyph({ notification }) {
  const type = notification?.activity_type;
  if (type === "bazar_added") return <ShoppingBasket size={17} />;
  if (type === "payment_confirmed") return <CheckCircle2 size={17} />;
  if (type === "cash_contribution_added") return <Wallet size={17} />;
  return <Bell size={17} />;
}
function PremiumDeleteIcon({ size = 16, className = "" }) {
  return (
    <svg
      className={`premium-delete-glyph${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path className="premium-delete-lid" d="M4.75 7.25h14.5M9.25 7.25V5.9c0-.64.51-1.15 1.15-1.15h3.2c.64 0 1.15.51 1.15 1.15v1.35" />
      <path className="premium-delete-bin" d="m7.25 7.25.7 10.15c.07 1.05.94 1.85 1.99 1.85h4.12c1.05 0 1.92-.8 1.99-1.85l.7-10.15M10.25 10.5v4.75M13.75 10.5v4.75" />
    </svg>
  );
}
const NOTIFICATION_READ_STORAGE = "bh-notification-read";
const NOTIFICATION_DISMISSED_STORAGE = "bh-notification-dismissed";
const notificationStorageKey = (prefix, profileId) =>
  `${prefix}:${String(profileId || "guest")}`;
const readStoredNotificationIds = (prefix, profileId) => {
  if (!profileId) return [];
  try {
    const stored = JSON.parse(
      localStorage.getItem(notificationStorageKey(prefix, profileId)) || "[]",
    );
    return Array.isArray(stored)
      ? stored.map((id) => String(id)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};
const writeStoredNotificationIds = (prefix, profileId, ids) => {
  if (!profileId) return;
  try {
    localStorage.setItem(
      notificationStorageKey(prefix, profileId),
      JSON.stringify(Array.from(new Set(ids.map((id) => String(id))))),
    );
  } catch {}
};
const getBazarPayerHue = (id) => {
  let hash = 0;
  for (const char of String(id || "member")) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % 360;
};
const todayForDateInput = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};
const formatLastActive = (value) => {
  if (!value) return "Never";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";
  const hours = Math.floor(Math.max(0, Date.now() - timestamp) / 3600000);
  if (hours < 1) {
    const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
    return minutes < 1 ? "Just now" : `${minutes} min ago`;
  }
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};
const BULLETIN_SPEED_OPTIONS = [
  { value: 30, label: "Slow" },
  { value: 46, label: "Normal" },
  { value: 72, label: "Fast" },
];

const dhakaDateFormatters = {
  weekday: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "long" }),
  date: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" }),
  month: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "short" }),
  day: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", day: "numeric" }),
  time: new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }),
};

function AccountTodayCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const weekday = dhakaDateFormatters.weekday.format(now);
  const formattedDate = dhakaDateFormatters.date.format(now);
  const shortMonth = dhakaDateFormatters.month.format(now).toUpperCase();
  const dayNumber = dhakaDateFormatters.day.format(now);
  const liveTime = dhakaDateFormatters.time.format(now);

  return (
    <div className="account-today-card" title="Current date and time in Dhaka">
      <span className="account-live-clock">
        <time className="account-today-time-label" dateTime={now.toISOString()}>{liveTime}</time>
      </span>
      <div className="account-today-cal-badge" aria-hidden="true">
        <span className="account-today-cal-month">{shortMonth}</span>
        <span className="account-today-cal-day">{dayNumber}</span>
      </div>
      <div className="account-today-details">
        <span className="account-today-day-label">{weekday}</span>
        <span className="account-today-date-label">{formattedDate}</span>
      </div>
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Monthly Hisab crashed:", error, info);
  }

  returnToLogin = async () => {
    try {
      sessionStorage.removeItem("bh-user");
      sessionStorage.removeItem("bh-page");
      await supabase?.auth?.signOut();
    } catch (error) {
      console.warn("Could not fully clear the previous session:", error?.message);
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="login-wrap">
        <section className="login-card" role="alert">
          <div className="brand-mark"><TriangleAlert /></div>
          <h1>Unable to open the dashboard</h1>
          <p>The app hit an unexpected error. Reload it, or return to login to start a clean session.</p>
          <div className="error">{this.state.error?.message || "Unknown application error"}</div>
          <button type="button" className="primary full" onClick={() => window.location.reload()}>
            Reload app
          </button>
          <button type="button" className="secondary full" onClick={this.returnToLogin}>
            Return to login
          </button>
        </section>
      </div>
    );
  }
}

function App() {
  const [db, setDb] = useState(starter);
  const [colorMode, setColorMode] = useState(getInitialColorMode);
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("bh-user"));
    } catch {
      return null;
    }
  });
  const [sessionBooting, setSessionBooting] = useState(() => {
    try { return Boolean(JSON.parse(sessionStorage.getItem("bh-user"))?.id); }
    catch { return false; }
  });
  const [page, setPage] = useState(() => {
    const validPages = new Set([
      "overview", "my-account", "bazar", "contacts", "pay-rent",
      "settlements", "members", "expenses", "payments", "payment-options", "notices", "inbox",
    ]);
    try {
      const savedPage = session?.id && sessionStorage.getItem("bh-page");
      return validPages.has(savedPage) ? savedPage : "overview";
    } catch {
      return "overview";
    }
  }),
    [month, setMonth] = useState(new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })),
    [menu, setMenu] = useState(false),
    [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const monthPickerRef = useRef(null);
  const monthPickerTriggerRef = useRef(null);
  const [isPhoneView, setIsPhoneView] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(max-width: 700px)").matches),
  );
  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 700px)");
    if (!query) return undefined;
    const sync = () => setIsPhoneView(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);
  const monthChoices = (() => { const now = new Date(); return [-2,-1,0,1].map(offset => new Date(now.getFullYear(), now.getMonth()+offset, 1).toLocaleDateString("en-US", {month:"long",year:"numeric"})); })();
  useEffect(() => {
    document.documentElement.dataset.theme = colorMode;
    document.documentElement.style.colorScheme = colorMode;
    try {
      localStorage.setItem("bh-theme", colorMode);
    } catch {}
  }, [colorMode]);
  const toggleColorMode = () => setColorMode((current) => current === "dark" ? "light" : "dark");
  const todayDateObj = new Date();
  const todayWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(todayDateObj);
  const todayFormattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(todayDateObj);
  const todayShortMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(todayDateObj).toUpperCase();
  const todayDayNum = new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(todayDateObj);
  useEffect(() => {
    if (!monthMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!monthPickerRef.current?.contains(event.target)) setMonthMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [monthMenuOpen]);
  const [login, setLogin] = useState({ username: "", password: "" }),
    [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profilePhotoBusy, setProfilePhotoBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [contactRows, setContactRows] = useState([]);
  const [contactForm, setContactForm] = useState({ id: "", category: "Flatmate", name: "", phone: "" });
  const [contactBusy, setContactBusy] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    if (!session?.id || !supabaseConfigured || !supabase) return undefined;

    let cancelled = false;
    supabase
      .from("member_contacts")
      .select("*")
      .order("category")
      .then(({ data, error: contactsError }) => {
        if (!cancelled && !contactsError && data) setContactRows(data);
      })
      .catch((contactsError) => {
        if (!cancelled) {
          console.warn("Could not load member contacts:", contactsError?.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  const [profileOpen, setProfileOpen] = useState(false);
  async function updateProfileEmail(e) {
    e.preventDefault();
    const requestedEmail = String(profileEmail || "").trim();
    if (!requestedEmail) { setProfileError("Enter a new email address."); return; }
    setProfileBusy(true); setProfileError(""); setProfileMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ email: requestedEmail });
      if (error) throw error;
      setProfileMessage("Email change requested. Check your inbox and confirm it to finish updating your email.");
    } catch (err) { setProfileError(err.message || "Could not update email."); }
    finally { setProfileBusy(false); }
  }
  async function updateProfilePassword(e) {
    e.preventDefault();
    if (profileBusy) return;
    setProfileBusy(true); setProfileError(""); setProfileMessage("");
    try {
      if (!profileCurrentPassword) throw new Error("Enter your current password.");
      if (!profilePassword) throw new Error("Enter a new password.");
      if (profilePassword !== profileConfirmPassword) throw new Error("New passwords do not match.");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authEmail = authData?.user?.email;
      if (!authEmail || !authData?.user?.id) throw new Error("Your session has expired. Please log in again.");
      // Re-authenticate the currently signed-in member with their old password.
      const { data: verified, error: verifyError } = await supabase.auth.signInWithPassword({ email: authEmail, password: profileCurrentPassword });
      if (verifyError) throw new Error("Current password is incorrect.");
      if (verified?.user?.id !== authData.user.id) throw new Error("Could not verify your account. Please sign in again.");
      const { data: updated, error: updateError } = await supabase.auth.updateUser({ password: profilePassword });
      if (updateError) throw updateError;
      if (updated?.user?.id !== authData.user.id) throw new Error("Password update was not confirmed. Please try again.");
      setProfileCurrentPassword(""); setProfilePassword(""); setProfileConfirmPassword("");
      setProfileMessage("Password changed successfully!");
    } catch (err) {
      setProfileError(err?.message || "Could not change password.");
    } finally { setProfileBusy(false); }
  }
  async function uploadProfilePhoto(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setProfilePhotoBusy(true); setProfileError(""); setProfileMessage("");
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const photoUrl = data.publicUrl;
      const { error: dbError } = await supabase.from("profiles").update({ photo_url: photoUrl }).eq("id", user.id);
      if (dbError) throw dbError;
      setProfilePhoto(photoUrl); setProfileMessage("Profile photo updated.");
    } catch (err) { setProfileError(err.message || "Could not upload photo."); }
    finally { setProfilePhotoBusy(false); e.target.value = ""; }
  }

  const [cloudMonthId, setCloudMonthId] = useState(null);
  const [previousDue, setPreviousDue] = useState(0);
  const [previousDueByUser, setPreviousDueByUser] = useState({});
  const [previousDueLoading, setPreviousDueLoading] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [utilityMemberCount, setUtilityMemberCount] = useState(4);
  const [utilityMemberCountInput, setUtilityMemberCountInput] = useState("4");
  const [utilityMemberCountSaving, setUtilityMemberCountSaving] = useState(false);
  const [utilityMemberCountMessage, setUtilityMemberCountMessage] = useState("");
  const [utilityPaidStatus, setUtilityPaidStatus] = useState({});
  const [utilityPaidSaving, setUtilityPaidSaving] = useState(false);
  const [flatRentInput, setFlatRentInput] = useState("");
  const [flatRentSaving, setFlatRentSaving] = useState(false);
  const [flatRentMessage, setFlatRentMessage] = useState("");
  const [editingUtilityName, setEditingUtilityName] = useState("");
  const [utilityEditModal, setUtilityEditModal] = useState(null);
  const [showAddUtility, setShowAddUtility] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
      name: "",
      amount: "",
      shared: true,
    }),
    [paymentForm, setPaymentForm] = useState({
      id: null,
      userId: "u2",
      month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      date: todayForDateInput(),
      amount: "",
      note: "Rent payment",
    });
  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    rent: "",
    role: "member",
  });
  const [showAddBazar, setShowAddBazar] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [bazarForm, setBazarForm] = useState({
    date: todayForDateInput(),
    amount: "",
    paidBy: "",
    items: "",
    combinedCashAmount: "",
    combinedMemberAmount: "",
    combinedMemberId: "",
  });
  const [bazarRows, setBazarRows] = useState([]);
  const [bazarItemPicker, setBazarItemPicker] = useState({
    itemId: "",
    customName: "",
    unitPrice: "",
    qty: "",
    unit: "kg",
  });
  const [bazarItemSearch, setBazarItemSearch] = useState("");
  const [bazarSuggestionOpen, setBazarSuggestionOpen] = useState(false);
  const [bazarPickerError, setBazarPickerError] = useState("");
  const [bazarAddCheckPop, setBazarAddCheckPop] = useState(false);
  const bazarAddCheckTimerRef = useRef(0);
  const [bazarNeededItems, setBazarNeededItems] = useState([]);
  const [bazarNeededDraft, setBazarNeededDraft] = useState("");
  const [bazarNeededPicker, setBazarNeededPicker] = useState({
    itemId: "",
    customName: "",
    unitPrice: "",
    qty: "",
    unit: "kg",
  });
  const [bazarNeededItemSearch, setBazarNeededItemSearch] = useState("");
  const [bazarNeededSuggestionOpen, setBazarNeededSuggestionOpen] = useState(false);
  const [bazarNeededPickerError, setBazarNeededPickerError] = useState("");
  const [bazarNeededBusy, setBazarNeededBusy] = useState(false);
  const [showBazarNeeded, setShowBazarNeeded] = useState(false);
  const [showBazarNeededLoginPopup, setShowBazarNeededLoginPopup] = useState(false);
  const pendingBazarNeededItems = bazarNeededItems.filter((item) => !item.done);
  const [bazarDetailsEntry, setBazarDetailsEntry] = useState(null);
  const [bazarEditEntry, setBazarEditEntry] = useState(null);
  const [bazarEditPicker, setBazarEditPicker] = useState({
    itemId: "",
    customName: "",
    unitPrice: "",
    qty: "",
    unit: "kg",
  });
  const [bazarEditItemSearch, setBazarEditItemSearch] = useState("");
  const [bazarEditSuggestionOpen, setBazarEditSuggestionOpen] = useState(false);
  const [bazarEditPickerError, setBazarEditPickerError] = useState("");
  const [bazarEditCheckPop, setBazarEditCheckPop] = useState(false);
  const bazarEditCheckTimerRef = useRef(0);
  const [bazarActionMenuId, setBazarActionMenuId] = useState(null);
  const bazarActionMenuRef = useRef(null);
  const [bazarFilterMenuOpen, setBazarFilterMenuOpen] = useState(false);
  const [bazarUsageDetailsItem, setBazarUsageDetailsItem] = useState(null);
  const [monthlyBazarHistory, setMonthlyBazarHistory] = useState([]);
  const [bazarTrendRange, setBazarTrendRange] = useState("30D");
  const [bazarTrendFocusIdx, setBazarTrendFocusIdx] = useState(null);
  const [bazarSearch, setBazarSearch] = useState("");
  const bazarFilterRef = useRef(null);
  const bazarFilterTriggerRef = useRef(null);
  const [bazarSuccessToast, setBazarSuccessToast] = useState("");
  const isDeleteSuccessToast = /\b(?:deleted|removed)\b/i.test(bazarSuccessToast);
  const [pendingBazarDelete, setPendingBazarDelete] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [commonBazarItems, setCommonBazarItems] = useState(BAZAR_COMMON_ITEMS);
  const [commonItemsModalOpen, setCommonItemsModalOpen] = useState(false);
  const [commonItemsBusy, setCommonItemsBusy] = useState(false);
  const [commonItemForm, setCommonItemForm] = useState({
    editingId: "",
    name: "",
    emoji: "🛒",
    iconUrl: "",
    defaultUnit: "kg",
  });
  const [commonIconUploading, setCommonIconUploading] = useState(false);
  latestCommonBazarItems = commonBazarItems;
  const chosenBazarPreset =
    commonBazarItems.find((item) => item.id === bazarItemPicker.itemId) || null;
  const selectedBazarPreset = chosenBazarPreset || commonBazarItems[0] || BAZAR_COMMON_ITEMS[0];
  const normalizedBazarItemSearch = normalizeBazarFoodSearch(bazarItemSearch);
  const getCommonBazarSuggestions = (query) => {
    const normalized = normalizeBazarFoodSearch(query);
    const visibleParents = commonBazarItems.filter((item) => !item.isCustom);
    if (!normalized) {
      return visibleParents.map((item, index) => ({
        ...item,
        suggestionKey: `preset-${item.id}`,
        parentName: item.name,
        subItem: "",
        searchScore: index,
      }));
    }

    const parentSuggestions = visibleParents
      .map((item, index) => {
        const aliases = BAZAR_ITEM_ALIAS_IDS
          .filter(([, itemId]) => itemId === item.id)
          .map(([alias]) => alias);
        const searchScore = getBazarFoodSearchScore(
          { name: item.name, aliases: [item.id, ...aliases] },
          normalized,
        );
        return {
          ...item,
          suggestionKey: `preset-${item.id}`,
          parentName: item.name,
          subItem: "",
          searchScore,
          sortIndex: index,
        };
      })
      .filter((item) => Number.isFinite(item.searchScore));

    const customParent = commonBazarItems.find((item) => item.isCustom) || null;
    const catalogSuggestions = searchBazarFoodCatalog(normalized, 24)
      .map((catalogItem, index) => {
        const parent = commonBazarItems.find((item) => item.id === catalogItem.parentId)
          || (catalogItem.parentId === "others" ? customParent : null);
        if (!parent) return null;
        const resolvedName = catalogItem.parentId === "sobji"
          ? `সবজি - ${catalogItem.name}`
          : catalogItem.parentId === "mach"
            ? `মাছ - ${catalogItem.name}`
            : catalogItem.name;
        return {
          ...parent,
          name: catalogItem.name,
          emoji: catalogItem.emoji,
          iconUrl: "",
          iconType: undefined,
          defaultUnit: catalogItem.defaultUnit || parent.defaultUnit,
          aliases: catalogItem.aliases || [],
          suggestionKey: `food-${catalogItem.id}`,
          parentName: parent.name,
          subItem: catalogItem.name,
          resolvedName,
          isCatalogItem: true,
          searchScore: catalogItem.searchScore,
          sortIndex: visibleParents.length + index,
        };
      })
      .filter(Boolean);

    const seen = new Set();
    return [...parentSuggestions, ...catalogSuggestions]
      .sort((a, b) => a.searchScore - b.searchScore || a.sortIndex - b.sortIndex)
      .filter((item) => {
        const key = normalizeBazarFoodSearch(item.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 15);
  };
  const getBazarPickerSuggestionPatch = (suggestion) => ({
    itemId: suggestion.id,
    customName: suggestion.isCustom && suggestion.isCatalogItem ? suggestion.name : "",
    catalogName: suggestion.resolvedName || "",
    catalogEmoji: suggestion.isCatalogItem ? suggestion.emoji : "",
    unit: suggestion.defaultUnit,
    ...(suggestion.id === "sobji" && suggestion.subItem ? { sobjiName: suggestion.subItem } : {}),
    ...(suggestion.id === "mach" && suggestion.subItem ? { machName: suggestion.subItem } : {}),
    ...(suggestion.id === "mosla" && suggestion.subItem ? { moshlaType: suggestion.subItem } : {}),
    ...(suggestion.id === "mangsho" && suggestion.subItem ? { mangshoType: suggestion.subItem } : {}),
  });
  const bazarItemSuggestions = getCommonBazarSuggestions(bazarItemSearch);
  const chosenBazarNeededPreset =
    commonBazarItems.find((item) => item.id === bazarNeededPicker.itemId) || null;
  const bazarNeededSuggestions = getCommonBazarSuggestions(bazarNeededItemSearch);
  const chosenBazarEditPreset =
    commonBazarItems.find((item) => item.id === bazarEditPicker.itemId) || null;
  const bazarEditSuggestions = getCommonBazarSuggestions(bazarEditItemSearch);
  const bazarPickerQty = Math.max(0, Number(bazarItemPicker.qty) || 0);
  const bazarPickerUnitPrice = Math.max(0, Number(bazarItemPicker.unitPrice) || 0);
  const bazarPickerSubtotal = roundMoney(bazarPickerUnitPrice);
  const applyBazarRowsUpdate = (next) => {
    setBazarRows(next);
    const filled = next.filter((row) => row.item.trim() && Number(row.price) > 0);
    const nextTotal = filled.reduce((sum, row) => sum + Number(row.price), 0);
    setBazarForm((form) => {
      let combinedMemberAmount = form.combinedMemberAmount;
      if (form.paidBy === "combine") {
        const cashNum = parseFloat(form.combinedCashAmount) || 0;
        combinedMemberAmount = String(Math.max(0, roundMoney(nextTotal - cashNum)));
      }
      return {
        ...form,
        amount: String(nextTotal),
        items: filled.map((row) => row.item.trim()).join(", "),
        combinedMemberAmount,
      };
    });
  };
  const updateBazarRow = (index, field, value) => {
    const next = bazarRows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    applyBazarRowsUpdate(next);
  };
  const removeBazarRow = (index) => {
    const next = bazarRows.filter((_, i) => i !== index);
    applyBazarRowsUpdate(next);
  };
  const resolveBazarPickerBaseName = (preset, picker) => {
    if (picker.catalogName) return picker.catalogName.trim();
    if (preset.isCustom) return picker.customName.trim();
    if (preset.id === "mosla") return picker.moshlaType || BAZAR_MOSHLA_OPTIONS[0];
    if (preset.id === "mangsho") return picker.mangshoType || BAZAR_MANGSHO_OPTIONS[0];
    if (preset.id === "sobji") {
      const extra = picker.sobjiName.trim();
      return extra ? `সবজি - ${extra}` : preset.name;
    }
    if (preset.id === "mach") {
      const extra = picker.machName.trim();
      if (!extra) return preset.name;
      return extra.includes("মাছ") ? extra : `মাছ - ${extra}`;
    }
    return preset.name;
  };
  const addPickerItemToBazarRows = () => {
    if (!chosenBazarPreset) {
      setBazarPickerError("Select an item from the suggestions.");
      setBazarSuggestionOpen(true);
      return;
    }
    const baseName = resolveBazarPickerBaseName(selectedBazarPreset, bazarItemPicker);
    if (!baseName) {
      setBazarPickerError("Please enter an item name.");
      return;
    }
    if (bazarPickerQty <= 0) {
      setBazarPickerError("Enter the item quantity.");
      return;
    }
    if (bazarPickerSubtotal <= 0) {
      setBazarPickerError("Please enter a price greater than 0.");
      return;
    }
    setBazarPickerError("");
    const next = [
      ...bazarRows.filter((row) => row.item.trim() || Number(row.price) > 0),
      {
        item: baseName,
        quantity: bazarPickerQty,
        unit: bazarItemPicker.unit || selectedBazarPreset.defaultUnit,
        price: String(bazarPickerSubtotal),
      },
    ];
    applyBazarRowsUpdate(next);
    setBazarItemPicker({
      itemId: "",
      customName: "",
      unitPrice: "",
      qty: "",
      unit: "kg",
    });
    setBazarItemSearch("");
    setBazarSuggestionOpen(false);
    if (bazarAddCheckTimerRef.current) {
      window.clearTimeout(bazarAddCheckTimerRef.current);
    }
    setBazarAddCheckPop(false);
    window.requestAnimationFrame(() => {
      setBazarAddCheckPop(true);
      bazarAddCheckTimerRef.current = window.setTimeout(() => {
        setBazarAddCheckPop(false);
      }, 850);
    });
  };
  const selectedBazarEditPreset =
    commonBazarItems.find((item) => item.id === bazarEditPicker.itemId) || commonBazarItems[0] || BAZAR_COMMON_ITEMS[0];
  const bazarEditPickerQty = Math.max(0, Number(bazarEditPicker.qty) || 0);
  const bazarEditPickerPrice = roundMoney(Math.max(0, Number(bazarEditPicker.unitPrice) || 0));
  const addPickerItemToEditBazar = () => {
    if (!bazarEditEntry) return;
    if (!chosenBazarEditPreset) {
      setBazarEditPickerError("Select an item from the suggestions.");
      setBazarEditSuggestionOpen(true);
      return;
    }
    const baseName = resolveBazarPickerBaseName(selectedBazarEditPreset, bazarEditPicker);
    if (!baseName) {
      setBazarEditPickerError("Please enter an item name.");
      return;
    }
    if (bazarEditPickerQty <= 0) {
      setBazarEditPickerError("Enter the item quantity.");
      return;
    }
    if (bazarEditPickerPrice <= 0) {
      setBazarEditPickerError("Please enter a price greater than 0.");
      return;
    }
    setBazarEditPickerError("");
    setBazarEditEntry((old) => {
      if (!old) return old;
      const nextItems = [
        ...(old.editItems || []).filter((r) => String(r.item || "").trim() || Number(r.price) > 0),
        {
          item: baseName,
          quantity: bazarEditPickerQty,
          unit: bazarEditPicker.unit || selectedBazarEditPreset.defaultUnit,
          price: String(bazarEditPickerPrice),
        },
      ];
      const nextTotal = nextItems.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
      let combinedMemberAmount = old.combinedMemberAmount;
      if (old.editPaidBy === "combine") {
        const cashNum = parseFloat(old.combinedCashAmount) || 0;
        combinedMemberAmount = String(Math.max(0, roundMoney(nextTotal - cashNum)));
      }
      return { ...old, editItems: nextItems, combinedMemberAmount };
    });
    setBazarEditPicker({ itemId: "", customName: "", unitPrice: "", qty: "", unit: "kg" });
    setBazarEditItemSearch("");
    setBazarEditSuggestionOpen(false);
    if (bazarEditCheckTimerRef.current) {
      window.clearTimeout(bazarEditCheckTimerRef.current);
    }
    setBazarEditCheckPop(false);
    window.requestAnimationFrame(() => {
      setBazarEditCheckPop(true);
      bazarEditCheckTimerRef.current = window.setTimeout(() => {
        setBazarEditCheckPop(false);
      }, 850);
    });
  };
  const updateBazarEditItem = (index, field, value) => {
    setBazarEditEntry((old) => {
      if (!old) return old;
      const nextItems = (old.editItems || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      );
      const nextTotal = nextItems.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
      let combinedMemberAmount = old.combinedMemberAmount;
      if (old.editPaidBy === "combine") {
        const cashNum = parseFloat(old.combinedCashAmount) || 0;
        combinedMemberAmount = String(Math.max(0, roundMoney(nextTotal - cashNum)));
      }
      return { ...old, editItems: nextItems, combinedMemberAmount };
    });
  };
  const removeBazarEditItem = (index) => {
    setBazarEditEntry((old) => {
      if (!old) return old;
      const nextItems = (old.editItems || []).filter((_, itemIndex) => itemIndex !== index);
      const nextTotal = nextItems.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
      let combinedMemberAmount = old.combinedMemberAmount;
      if (old.editPaidBy === "combine") {
        const cashNum = parseFloat(old.combinedCashAmount) || 0;
        combinedMemberAmount = String(Math.max(0, roundMoney(nextTotal - cashNum)));
      }
      return { ...old, editItems: nextItems, combinedMemberAmount };
    });
  };
  useEffect(() => {
    if (bazarActionMenuId == null) return undefined;
    const closeMenuOutside = (event) => {
      if (!bazarActionMenuRef.current?.contains(event.target)) setBazarActionMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenuOutside);
    return () => document.removeEventListener("pointerdown", closeMenuOutside);
  }, [bazarActionMenuId]);
  useEffect(() => {
    if (!bazarFilterMenuOpen) return undefined;
    const closeMenuOutside = (event) => {
      if (!bazarFilterRef.current?.contains(event.target)) setBazarFilterMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenuOutside);
    return () => document.removeEventListener("pointerdown", closeMenuOutside);
  }, [bazarFilterMenuOpen]);

  const [showAddCash, setShowAddCash] = useState(false);
  const [cashForm, setCashForm] = useState({
    id: null,
    date: todayForDateInput(),
    month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    amount: "",
    paidBy: "u1",
    note: "Cash contribution",
  });
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementBusy, setSettlementBusy] = useState(false);
  const [settlementPlanBusy, setSettlementPlanBusy] = useState(false);
  const [settlementLoadError, setSettlementLoadError] = useState("");
  const [settlementConfirmTarget, setSettlementConfirmTarget] = useState(null);
  const [settlementConfirmAmount, setSettlementConfirmAmount] = useState("");
  const [settlementForm, setSettlementForm] = useState({
    sourceType: "cash_contribution",
    fromUserId: "",
    toUserId: "",
    amount: "",
    date: todayForDateInput(),
    note: "Meal balance settlement",
  });
  const [editId, setEditId] = useState(null),
    [bazarFilter, setBazarFilter] = useState("all"),
    [adminOpen, setAdminOpen] = useState(() =>
      ["members", "expenses", "payments", "payment-options", "notices"].includes(page),
    );
  const [count, setCount] = useState(db.currentCount),
    [selected, setSelected] = useState(db.currentMembers);
  const [mealMemberDraft, setMealMemberDraft] = useState("1");
  const [mealActiveIds, setMealActiveIds] = useState([]);
  const [mealMemberSaving, setMealMemberSaving] = useState(false);
  const [mealMemberMessage, setMealMemberMessage] = useState("");
  const [notices, setNotices] = useState([]),
    [readNoticeIds, setReadNoticeIds] = useState([]),
    [dismissedNotificationIds, setDismissedNotificationIds] = useState([]),
    [noticeForm, setNoticeForm] = useState({ title: "", body: "", isBulletin: false }),
    [noticeImage, setNoticeImage] = useState(null),
    [noticeBusy, setNoticeBusy] = useState(false),
    [noticeError, setNoticeError] = useState(""),
    [noticePanelOpen, setNoticePanelOpen] = useState(false),
    [noticeComposerOpen, setNoticeComposerOpen] = useState(false),
    [noticeModal, setNoticeModal] = useState(false),
    [noticeReadBusy, setNoticeReadBusy] = useState(false),
    [noticeDraftBusy, setNoticeDraftBusy] = useState(false),
    [bulletinNotices, setBulletinNotices] = useState([
      {
        id: "default-bulletin-1",
        text: "This month's meal cost has been updated. Please check your balance and settle dues on time.",
        active: true,
        createdAt: new Date().toISOString(),
      },
    ]),
    [bulletinInput, setBulletinInput] = useState(""),
    [editingBulletinId, setEditingBulletinId] = useState(""),
    [bulletinSaving, setBulletinSaving] = useState(false),
    [bulletinSpeed, setBulletinSpeed] = useState(46),
    [bulletinSpeedSaving, setBulletinSpeedSaving] = useState(false),
    [bulletinIndex, setBulletinIndex] = useState(0),
    [bulletinOverflowing, setBulletinOverflowing] = useState(false),
    [bulletinMarqueeDuration, setBulletinMarqueeDuration] = useState(12),
    [bulletinLayoutVersion, setBulletinLayoutVersion] = useState(0),
    [inboxMessages, setInboxMessages] = useState([]),
    [inboxUnreadCount, setInboxUnreadCount] = useState(0),
    [inboxOnlineIds, setInboxOnlineIds] = useState([]),
    [inboxError, setInboxError] = useState(""),
    [selectedInboxMemberId, setSelectedInboxMemberId] = useState(""),
    [mobileInboxView, setMobileInboxView] = useState("members"),
    [inboxDraft, setInboxDraft] = useState(""),
    [inboxAttachment, setInboxAttachment] = useState(null),
    [inboxBusy, setInboxBusy] = useState(false),
    [inboxMenuOpen, setInboxMenuOpen] = useState(false),
    [inboxMediaOpen, setInboxMediaOpen] = useState(false),
    [inboxMediaFiles, setInboxMediaFiles] = useState([]),
    [inboxMediaBusy, setInboxMediaBusy] = useState(false),
    [inboxDeleteBusy, setInboxDeleteBusy] = useState(false);
  const bulletinTextViewportRef = useRef(null);
  const bulletinMarqueeTrackRef = useRef(null);
  const bulletinTextInnerRef = useRef(null);
  const setBulletinTextViewportRef = useCallback((node) => {
    bulletinTextViewportRef.current = node;
    if (node) setBulletinLayoutVersion((version) => version + 1);
  }, []);
  const inboxAttachmentInputRef = useRef(null);
  const inboxMessageListRef = useRef(null);
  const lastInboxActivityAtRef = useRef(0);
  const markingSeenRef = useRef(false);
  const paymentDefaults = [
    {
      provider: "bkash",
      label: "bKash",
      account_name: "",
      account_number: "",
      instructions: "Send Money",
      enabled: true,
      logo_url: "",
    },
    {
      provider: "nagad",
      label: "Nagad",
      account_name: "",
      account_number: "",
      instructions: "Send Money",
      enabled: true,
      logo_url: "",
    },
    {
      provider: "brac_bank",
      label: "BRAC Bank",
      account_name: "",
      account_number: "",
      instructions: "Account transfer",
      enabled: true,
      logo_url: "",
    },
    {
      provider: "islami_bank",
      label: "Islami Bank",
      account_name: "",
      account_number: "",
      instructions: "Account transfer",
      enabled: true,
      logo_url: "",
    },
  ];
  const [paymentOptions, setPaymentOptions] = useState(paymentDefaults);
  const [paymentOptionsBusy, setPaymentOptionsBusy] = useState(false);
  const [paymentOptionsError, setPaymentOptionsError] = useState("");
  const [paymentEditorMode, setPaymentEditorMode] = useState("");
  const [paymentEditorForm, setPaymentEditorForm] = useState(null);
  // Financial records are never persisted to browser storage. Supabase is the source of truth.
  useEffect(() => {
    if (session) sessionStorage.setItem("bh-user", JSON.stringify(session));
    else sessionStorage.removeItem("bh-user");
  }, [session]);
  useEffect(() => {
    if (session?.id) sessionStorage.setItem("bh-page", page);
    else sessionStorage.removeItem("bh-page");
  }, [page, session?.id]);
  useEffect(() => {
    if (session?.id && supabaseConfigured) {
      const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
      setMonth(currentMonth);
      loadCloudData(session.id, currentMonth)
        .then(async () => {
          await loadNotices(true, session.id).catch((err) =>
            console.warn("Notices are not configured yet:", err?.message),
          );
          await loadPaymentOptions();
        })
        .catch((err) =>
          setError(
            "Could not load shared Supabase data: " +
              (err?.message || "Unknown error"),
          ),
        )
        .finally(() => setSessionBooting(false));
    } else {
      setSessionBooting(false);
    }
  }, []);
  const user = db.users.find((u) => u.id === session?.id);
  const publishedNotifications = notices.filter(
    (notice) =>
      notice.status === "published" &&
      !dismissedNotificationIds.includes(String(notice.id)),
  );
  const unreadNotifications = publishedNotifications.filter(
    (notice) => !readNoticeIds.includes(notice.id),
  );
  const announcementNotices = notices.filter(
    (notice) => notice.kind !== "activity",
  );
  const unreadAnnouncementNotices = announcementNotices.filter(
    (notice) =>
      notice.status === "published" &&
      !dismissedNotificationIds.includes(String(notice.id)) &&
      !readNoticeIds.includes(notice.id),
  );
  const activeBulletinNotices = useMemo(
    () =>
      bulletinNotices.filter(
        (item) => item && item.active !== false && String(item.text || "").trim(),
      ),
    [bulletinNotices],
  );
  const currentBulletinText = activeBulletinNotices.length
    ? String(activeBulletinNotices[bulletinIndex % activeBulletinNotices.length]?.text || "")
    : "";
  useEffect(() => {
    const viewport = bulletinTextViewportRef.current;
    const track = bulletinMarqueeTrackRef.current;
    const text = bulletinTextInnerRef.current;
    if (!viewport || !track || !text || !currentBulletinText) {
      setBulletinOverflowing(false);
      return undefined;
    }

    let animationFrame = 0;
    let disposed = false;
    const measureOverflow = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (disposed) return;
        const viewportWidth = Math.floor(viewport.clientWidth || viewport.getBoundingClientRect().width);
        const textWidth = Math.ceil(Math.max(text.scrollWidth, text.getBoundingClientRect().width));
        if (!viewportWidth || !textWidth) return;
        const overflowing = textWidth > viewportWidth + 2;
        const gap = viewportWidth <= 480 ? 36 : 56;
        const travelDistance = Math.ceil(textWidth + gap);
        const pixelsPerSecond = Math.max(24, Math.min(90, Number(bulletinSpeed) || 46));
        const duration = Math.max(4.5, Math.min(40, travelDistance / pixelsPerSecond));

        track.style.setProperty("--bulletin-marquee-gap", `${gap}px`);
        track.style.setProperty("--bulletin-marquee-shift", `${-travelDistance}px`);
        track.style.setProperty("--bulletin-marquee-duration", `${duration}s`);
        track.removeAttribute("data-marquee-driver");
        setBulletinOverflowing(overflowing);
        setBulletinMarqueeDuration(duration);
      });
    };

    measureOverflow();
    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(measureOverflow)
      : null;
    resizeObserver?.observe(viewport);
    resizeObserver?.observe(text);
    window.addEventListener("resize", measureOverflow);
    document.fonts?.ready.then(measureOverflow).catch(() => {});

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [bulletinIndex, bulletinSpeed, currentBulletinText, page, bulletinLayoutVersion]);
  useEffect(() => {
    if (!activeBulletinNotices.length) {
      setBulletinIndex(0);
      return undefined;
    }
    if (bulletinIndex >= activeBulletinNotices.length) {
      setBulletinIndex(0);
    }
    if (activeBulletinNotices.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setBulletinIndex((prev) => (prev + 1) % activeBulletinNotices.length);
    }, bulletinOverflowing ? Math.ceil(bulletinMarqueeDuration * 1000) + 800 : 5000);
    return () => window.clearInterval(timer);
  }, [activeBulletinNotices.length, bulletinIndex, bulletinOverflowing, bulletinMarqueeDuration]);
  useEffect(() => {
    if (!session?.id || !supabaseConfigured || !supabase) {
      setNotices([]);
      setReadNoticeIds([]);
      setDismissedNotificationIds([]);
      return undefined;
    }
    let active = true;
    const refreshNotifications = () => {
      if (!active) return;
      void loadNotices(false, session.id).catch((notificationError) =>
        console.warn("Could not refresh notifications:", notificationError?.message),
      );
    };
    const channel = supabase
      .channel(`household-notifications-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notices" },
        refreshNotifications,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        refreshNotifications,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bazar_entries" },
        refreshNotifications,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rent_payments" },
        refreshNotifications,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cash_contributions" },
        refreshNotifications,
      )
      .subscribe();
    const intervalId = window.setInterval(refreshNotifications, 30000);
    window.addEventListener("focus", refreshNotifications);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshNotifications);
      void supabase.removeChannel(channel);
    };
  }, [session?.id]);
  const previousDueMembersKey = db.users
    .map((member) => `${member.id}:${Number(member.rent || 0)}`)
    .join("|");
  useEffect(() => {
    if (!session?.id || !supabaseConfigured || !user) return;
    let cancelled = false;
    const monthIndex = (value) => {
      // Safari/iOS may not parse "November 2026 1" consistently.
      // Parse the month label directly so every device gets the same index.
      const match = String(value || "").trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (!match) return -1;
      const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
      const monthNumber = monthNames.indexOf(match[1].toLowerCase());
      return monthNumber < 0 ? -1 : Number(match[2]) * 12 + monthNumber;
    };
    async function calculatePreviousDueForMembers() {
      setPreviousDueLoading(true);
      try {
        const { data: monthsRows, error: monthsError } = await supabase.from("months").select("id,label");
        if (monthsError) throw monthsError;
        const currentIndex = monthIndex(month);
        const septemberBaseline = monthIndex("September 2026");
        const pastMonths = (monthsRows || []).filter((m) => monthIndex(m.label) > septemberBaseline && monthIndex(m.label) < currentIndex);
        const balances = Object.fromEntries((db.users || []).map((member) => [member.id, 0]));
        for (const past of pastMonths) {
          const [cat, pay, baz, cash, settlements, meal, utilityList] = await Promise.all([
            supabase.from("expense_categories").select("name,amount,shared").eq("month_id", past.id),
            supabase.from("rent_payments").select("user_id,amount,note").eq("month_id", past.id),
            supabase.from("bazar_entries").select("amount,paid_by,paid_from_cash").eq("month_id", past.id),
            supabase.from("cash_contributions").select("amount,paid_by").eq("month_id", past.id),
            supabase.from("member_settlements").select("*").eq("month_id", past.id),
            supabase.from("app_settings").select("value").eq("key", `meal_active_members_${past.label}`).maybeSingle(),
            supabase.from("app_settings").select("value").eq("key", `shared_utilities_list_${past.label}`).maybeSingle(),
          ]);
          for (const result of [cat,pay,baz,cash,meal,utilityList]) if (result.error) throw result.error;
          if (settlements.error && !isMissingSettlementTableError(settlements.error)) {
            throw settlements.error;
          }
          const completedPastSettlements = settlements.error ? [] : settlements.data || [];
          let mealIds=[]; try { mealIds=JSON.parse(meal.data?.value || "[]"); } catch {}
          let utilityItems=null; try { utilityItems=JSON.parse(utilityList.data?.value || "null"); } catch {}
          const categories=cat.data || [];
          const utilities=Array.isArray(utilityItems) ? utilityItems : categories.filter(c=>String(c.name||"").toLowerCase()!=="bazar").map(c=>({name:c.name,amount:c.amount,shared:c.shared}));
          const sharedTotal=utilities.filter(c=>c.shared&&!isFlatRentName(c.name)).reduce((sum,c)=>sum+Number(c.amount||0),0);
          const utilityShare=sharedTotal / Math.max(1, Number(utilityMemberCount||4));
          const bazarTotal=(baz.data||[]).reduce((sum,b)=>sum+Number(b.amount||0),0);
          for (const member of (db.users || [])) {
            const mealCost=Array.isArray(mealIds)&&mealIds.includes(member.id) ? Math.ceil(bazarTotal/Math.max(1,mealIds.length)) : 0;
            const payments=(pay.data||[]).filter(x=>x.user_id===member.id).reduce((sum,x)=>sum+Number(x.amount||0),0);
            const mealCredits=(baz.data||[]).filter(b=>!b.paid_from_cash&&b.paid_by===member.id).reduce((sum,b)=>sum+Number(b.amount||0),0);
            const cashCredits=(cash.data||[]).filter(c=>c.paid_by===member.id).reduce((sum,c)=>sum+Number(c.amount||0),0);
            const directSettled=(completedPastSettlements||[]).filter(entry=>entry.source_type==="direct"&&entry.from_user_id===member.id).reduce((sum,entry)=>sum+settlementPaidValue(entry),0);
            const refundsReceived=(completedPastSettlements||[]).filter(entry=>entry.to_user_id===member.id).reduce((sum,entry)=>sum+settlementPaidValue(entry),0);
            balances[member.id] += Number(member.rent||0) + utilityShare + mealCost - payments - mealCredits - cashCredits - directSettled + refundsReceived;
          }
        }
        const rounded = Object.fromEntries(Object.entries(balances).map(([id, amount]) => [id, Math.ceil(amount)]));
        if (!cancelled) { setPreviousDueByUser(rounded); setPreviousDue(rounded[user.id] || 0); }
      } catch (error) {
        console.warn("Could not calculate previous due:", error?.message);
        // Keep the last known Previous Due values if a refresh/query fails.
        // Clearing them here makes My Account and the admin table show 0 on mobile
        // during temporary Supabase errors.
      } finally { if (!cancelled) setPreviousDueLoading(false); }
    }
    calculatePreviousDueForMembers();
    return () => { cancelled = true; };
  }, [session?.id, user?.id, month, utilityMemberCount, previousDueMembersKey]);
  // On refresh, the member profile arrives asynchronously from Supabase. Keep members on a page they can access.
  useEffect(() => {
    const adminPages = ["overview", "members", "expenses", "payments", "payment-options", "notices"];
    if (session?.id && user?.role === "member" && adminPages.includes(page))
      setPage("my-account");
  }, [session?.id, user?.role, page]);
  const admin = user?.role === "admin";
  const activeUsers = db.users.filter((u) => u.active && u.role === "member");
  const inboxLastMessageAt = new Map();
  for (const message of inboxMessages) {
    const memberId =
      message.sender_id === session?.id
        ? message.recipient_id
        : message.recipient_id === session?.id
          ? message.sender_id
          : null;
    if (!memberId) continue;
    const timestamp = Date.parse(message.created_at) || 0;
    inboxLastMessageAt.set(
      memberId,
      Math.max(timestamp, inboxLastMessageAt.get(memberId) || 0),
    );
  }
  const inboxPeers = db.users
    .filter(
      (profile) =>
        profile.id !== session?.id &&
        (profile.role === "member" || profile.role === "admin"),
    )
    .sort((left, right) => {
      const recentDifference =
        (inboxLastMessageAt.get(right.id) || 0) -
        (inboxLastMessageAt.get(left.id) || 0);
      return recentDifference || left.name.localeCompare(right.name);
    });
  const selectedInboxMember = inboxPeers.find((member) => member.id === selectedInboxMemberId);
  const selectedConversation = inboxMessages.filter(
    (message) =>
      (message.sender_id === selectedInboxMemberId && message.recipient_id === session?.id) ||
      (message.sender_id === session?.id && message.recipient_id === selectedInboxMemberId),
  );
  const lastConversationMessageId = selectedConversation.length
    ? selectedConversation[selectedConversation.length - 1]?.id
    : null;
  const scrollInboxToBottom = useCallback(() => {
    const el = inboxMessageListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);
  useLayoutEffect(() => {
    if (page !== "inbox" || !selectedInboxMemberId) return undefined;
    if (window.innerWidth <= 900 && mobileInboxView !== "conversation") return undefined;
    scrollInboxToBottom();
    const rafId = window.requestAnimationFrame(scrollInboxToBottom);
    const timerId = window.setTimeout(scrollInboxToBottom, 60);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
    };
  }, [
    page,
    selectedInboxMemberId,
    mobileInboxView,
    selectedConversation.length,
    lastConversationMessageId,
    scrollInboxToBottom,
  ]);
  const formatInboxMessageTime = (createdAt) => {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return { label: "", full: "" };
    const now = new Date();
    const timeOnly = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const full = d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (isToday) return { label: timeOnly, full };
    const dateLabel = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    return { label: `${dateLabel}, ${timeOnly}`, full };
  };
  useEffect(() => {
    if (!inboxPeers.length) {
      setSelectedInboxMemberId("");
      setMobileInboxView("members");
      return;
    }
    if (!inboxPeers.some((profile) => profile.id === selectedInboxMemberId)) {
      setSelectedInboxMemberId(inboxPeers[0].id);
    }
  }, [db.users, session?.id, selectedInboxMemberId]);
  useEffect(() => {
    if (page === "inbox") setMobileInboxView("members");
  }, [page]);
  useEffect(() => {
    if (!session?.id) {
      setInboxMessages([]);
      setInboxUnreadCount(0);
      setInboxOnlineIds([]);
      setInboxError("");
      return;
    }
    void refreshInbox();
    const intervalId = window.setInterval(() => void refreshInbox(), 15000);
    return () => window.clearInterval(intervalId);
  }, [session?.id]);
  useEffect(() => {
    if (!session?.id || !supabaseConfigured || !supabase) {
      setInboxOnlineIds([]);
      return;
    }
    let active = true;
    const channel = supabase.channel("household-inbox-presence", {
      config: { presence: { key: session.id } },
    });
    const updatePresence = () => {
      if (!active) return;
      const onlineIds = Object.values(channel.presenceState())
        .flat()
        .map((presence) => presence.user_id)
        .filter((id) => typeof id === "string");
      setInboxOnlineIds([...new Set(onlineIds)]);
    };
    channel
      .on("presence", { event: "sync" }, updatePresence)
      .on("presence", { event: "join" }, updatePresence)
      .on("presence", { event: "leave" }, updatePresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { error: presenceError } = await channel.track({
            user_id: session.id,
            online_at: new Date().toISOString(),
          });
          if (presenceError) console.warn("Could not publish inbox online status:", presenceError.message);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Inbox online status is unavailable:", status);
        }
      });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [session?.id]);
  useEffect(() => {
    // Mark messages as seen as soon as the receiver is looking at the open conversation (no click needed).
    if (page !== "inbox" || !session?.id || !selectedInboxMemberId || !supabaseConfigured || !supabase) return;
    if (window.innerWidth <= 900 && mobileInboxView !== "conversation") return;
    if (document.visibilityState === "hidden") return;
    const unreadIds = inboxMessages
      .filter((message) => message.sender_id === selectedInboxMemberId && message.recipient_id === session.id && !message.read_at)
      .map((message) => message.id);
    if (!unreadIds.length || markingSeenRef.current) return;
    markingSeenRef.current = true;
    const seenAt = new Date().toISOString();
    setInboxMessages((current) => current.map((message) => (unreadIds.includes(message.id) ? { ...message, read_at: seenAt } : message)));
    supabase
      .from("direct_messages")
      .update({ read_at: seenAt })
      .in("id", unreadIds)
      .is("read_at", null)
      .then(({ error: readError }) => {
        if (readError) console.error("Could not mark inbox messages as seen:", readError);
        void refreshInbox();
      })
      .finally(() => {
        markingSeenRef.current = false;
      });
  }, [inboxMessages, selectedInboxMemberId, page, mobileInboxView, session?.id]);
  useEffect(() => {
    // Live Sent -> Seen updates (and new messages) without reloading the page.
    if (!session?.id || !supabaseConfigured || !supabase) return;
    const channel = supabase
      .channel(`direct-messages-live-${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload) => {
        const updated = payload.new;
        if (!updated?.id) return;
        setInboxMessages((current) =>
          current.map((message) => (message.id === updated.id ? { ...message, read_at: updated.read_at } : message)),
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const row = payload.new;
        if (row && (row.sender_id === session.id || row.recipient_id === session.id)) void refreshInbox();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "direct_messages" }, () => void refreshInbox())
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Live message status is unavailable; falling back to polling:", status);
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.id]);
  useEffect(() => {
    if (!session?.id || !supabaseConfigured || !supabase) return;
    const recordActivity = async () => {
      if (document.visibilityState !== "visible" || Date.now() - lastInboxActivityAtRef.current < 60000) return;
      lastInboxActivityAtRef.current = Date.now();
      const { error: activityError } = await supabase.rpc("record_member_activity");
      if (activityError) {
        lastInboxActivityAtRef.current = 0;
        console.warn("Could not update last-active time:", activityError.message);
      }
    };
    const intervalId = window.setInterval(() => void recordActivity(), 60000);
    window.addEventListener("focus", recordActivity);
    document.addEventListener("visibilitychange", recordActivity);
    void recordActivity();
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", recordActivity);
      document.removeEventListener("visibilitychange", recordActivity);
    };
  }, [session?.id]);
  const allActiveUsers = db.users.filter((u) => u.active);
  const currentUsers = db.users.filter(
    (u) => selected.includes(u.id) && u.active && u.role === "member",
  );
  const monthBazar = (db.bazars || []).filter((b) => b.month === month);
  const monthSettlements = (db.settlements || []).filter(
    (settlement) => settlement.month === month,
  );
  const directSettlementPaidBy = (uid, includePending = false) =>
    monthSettlements
      .filter(
        (settlement) =>
          settlement.fromUserId === uid &&
          settlement.sourceType === "direct",
      )
      .reduce(
        (sum, settlement) =>
          sum +
          (includePending
            ? Number(settlement.amount || 0)
            : settlementPaidValue(settlement)),
        0,
      );
  const settlementReceivedBy = (uid, includePending = false) =>
    monthSettlements
      .filter((settlement) => settlement.toUserId === uid)
      .reduce(
        (sum, settlement) =>
          sum +
          (includePending
            ? Number(settlement.amount || 0)
            : settlementPaidValue(settlement)),
        0,
      );
  const bazarSearchTerm = bazarSearch.trim();
  const groupedMonthBazar = groupMonthBazar(monthBazar);
  const filteredMonthBazar = groupedMonthBazar.filter((b) => {
    let matchesMember = false;
    if (bazarFilter === "all") {
      matchesMember = true;
    } else if (bazarFilter === "cash-in-hand") {
      matchesMember = b.isCombined ? b.cashAmount > 0 : b.paidFromCash;
    } else {
      matchesMember = b.isCombined ? b.memberId === bazarFilter : (!b.paidFromCash && b.paidBy === bazarFilter);
    }
    const matchesSearch =
      !bazarSearchTerm ||
      matchesBazarHistorySearch(b.items, bazarSearchTerm, getBazarItemSummary(b.items));
    return matchesMember && matchesSearch;
  });
  const bazarTotal = monthBazar.reduce((s, b) => s + Number(b.amount || 0), 0);
  useEffect(() => {
    if (page !== "bazar-report" || !supabaseConfigured) return undefined;
    let cancelled = false;
    const parseMonthOrd = (label) => {
      const m = String(label || "").trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (!m) return -1;
      const idx = ["january","february","march","april","may","june","july","august","september","october","november","december"].indexOf(m[1].toLowerCase());
      return idx < 0 ? -1 : Number(m[2]) * 12 + idx;
    };
    (async () => {
      try {
        const [{ data: monthsRows, error: mErr }, { data: entryRows, error: eErr }] = await Promise.all([
          supabase.from("months").select("id,label"),
          supabase.from("bazar_entries").select("month_id,amount"),
        ]);
        if (mErr || eErr || cancelled) return;
        const totalsByMonthId = new Map();
        (entryRows || []).forEach((row) => {
          const mid = row.month_id;
          totalsByMonthId.set(mid, roundMoney((totalsByMonthId.get(mid) || 0) + (Number(row.amount) || 0)));
        });
        const merged = (monthsRows || [])
          .map((m) => ({
            id: m.id,
            label: m.label,
            ord: parseMonthOrd(m.label),
            amount: m.label === month ? bazarTotal : (totalsByMonthId.get(m.id) || 0),
          }))
          .filter((m) => m.ord >= 0 && (m.amount > 0 || m.label === month))
          .sort((a, b) => a.ord - b.ord);
        if (!merged.some((m) => m.label === month)) {
          merged.push({ id: "current", label: month, ord: parseMonthOrd(month), amount: bazarTotal });
          merged.sort((a, b) => a.ord - b.ord);
        }
        if (!cancelled) setMonthlyBazarHistory(merged.slice(-6));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [bazarTotal, month, page]);
  const selectedBazarTotal = monthBazar
    .filter((entry) => {
      if (bazarFilter === "all") return true;
      if (bazarFilter === "cash-in-hand") return entry.paidFromCash;
      return !entry.paidFromCash && entry.paidBy === bazarFilter;
    })
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const [showAllBazarReportItems, setShowAllBazarReportItems] = useState(false);
  const bazarItemUsageReport = useMemo(() => {
    const pickItemEmoji = (name) => {
      const lower = String(name || "").toLowerCase();
      if (/spice|masala|mosla|মসলা|হলুদ|গুড়া|জিরা|ধনিয়া/.test(lower)) return "🫙";
      if (/chal|চাল|rice/.test(lower)) return "🍚";
      if (/dal|ডাল|lentil/.test(lower)) return "🥣";
      if (/tel|oil|তেল/.test(lower)) return "oil";
      if (/onion|peyaj|পেঁয়াজ|পেয়াজ/.test(lower)) return "🧅";
      if (/morich|chili|মরিচ/.test(lower)) return "🌶️";
      if (/rosun|garlic|রসুন/.test(lower)) return "🧄";
      if (/potato|alu|আলু/.test(lower)) return "🥔";
      if (/egg|dim|ডিম/.test(lower)) return "🥚";
      if (/chicken|murgi|beef|meat|মাংস|মুরগি|গরু/.test(lower)) return "🥩";
      if (/fish|mach|মাছ/.test(lower)) return "🐟";
      if (/veg|sobji|শাক|সবজি/.test(lower)) return "🥬";
      if (/milk|dudh|দুধ/.test(lower)) return "🥛";
      return "🛒";
    };
    const buckets = new Map();
    let grandTotal = 0;
    groupedMonthBazar.forEach((entry) => {
      let parsed = Array.isArray(entry.items) ? entry.items : null;
      if (!parsed && typeof entry.items === "string") {
        try {
          const maybe = JSON.parse(entry.items);
          if (Array.isArray(maybe)) parsed = maybe;
        } catch {}
      }
      if (!parsed || parsed.length === 0) {
        const label = getBazarItemSummary(entry.items).trim() || "Bazar";
        const amt = Math.max(0, Number(entry.amount) || 0);
        if (amt <= 0) return;
        parsed = [{ item: label, price: amt }];
      }
      parsed.forEach((rawItem) => {
        const rawLabel =
          typeof rawItem === "string"
            ? rawItem.trim()
            : String(rawItem?.item ?? rawItem?.name ?? rawItem?.title ?? "").trim();
        const price =
          typeof rawItem === "object" && rawItem !== null
            ? Math.max(0, Number(rawItem.price ?? rawItem.amount) || 0)
            : 0;
        if (!rawLabel) return;
        const qtyMatch = rawLabel.match(/^(.+?)\s*\(([\d.]+)\s*([a-zA-Z]+)\)$/);
        const rawBaseName = (qtyMatch ? qtyMatch[1] : rawLabel).trim();
        const structuredQty =
          typeof rawItem === "object" && rawItem !== null
            ? Math.max(0, Number(rawItem.quantity ?? rawItem.qty) || 0)
            : 0;
        const structuredUnit =
          typeof rawItem === "object" && rawItem !== null
            ? String(rawItem.unit || "").trim().toLowerCase()
            : "";
        const qtyVal = structuredQty > 0 ? structuredQty : qtyMatch ? Number(qtyMatch[2]) || 0 : 0;
        const qtyUnit =
          structuredQty > 0
            ? structuredUnit || "pcs"
            : qtyMatch
              ? qtyMatch[3].toLowerCase()
              : "";
        const groupInfo = classifyBazarDashboardGroup(rawBaseName);
        const baseName = groupInfo ? groupInfo.groupName : rawBaseName;
        const key = baseName.toLowerCase();
        const existing = buckets.get(key) || {
          key,
          name: baseName,
          emoji: groupInfo ? groupInfo.emoji : pickItemEmoji(baseName),
          totalSpent: 0,
          count: 0,
          qtyByUnit: {},
          subMap: new Map(),
        };
        existing.totalSpent = roundMoney(existing.totalSpent + price);
        existing.count += 1;
        if (qtyVal > 0 && qtyUnit) {
          existing.qtyByUnit[qtyUnit] = roundMoney((existing.qtyByUnit[qtyUnit] || 0) + qtyVal);
        }
        if (groupInfo && groupInfo.subName) {
          const subKey = groupInfo.subName.toLowerCase();
          const subExisting = existing.subMap.get(subKey) || {
            key: subKey,
            name: groupInfo.subName,
            emoji: groupInfo.emoji,
            totalSpent: 0,
            count: 0,
            qtyByUnit: {},
          };
          subExisting.totalSpent = roundMoney(subExisting.totalSpent + price);
          subExisting.count += 1;
          if (qtyVal > 0 && qtyUnit) {
            subExisting.qtyByUnit[qtyUnit] = roundMoney(
              (subExisting.qtyByUnit[qtyUnit] || 0) + qtyVal,
            );
          }
          existing.subMap.set(subKey, subExisting);
        }
        buckets.set(key, existing);
        grandTotal = roundMoney(grandTotal + price);
      });
    });
    const list = Array.from(buckets.values())
      .sort((a, b) => b.totalSpent - a.totalSpent || b.count - a.count)
      .map((item, idx) => {
        const qtyParts = Object.entries(item.qtyByUnit).map(([u, v]) => `${v} ${u}`);
        const subItems = item.subMap
          ? Array.from(item.subMap.values())
              .sort((a, b) => b.totalSpent - a.totalSpent || b.count - a.count)
              .map((sub) => ({
                ...sub,
                qtySummary: Object.entries(sub.qtyByUnit)
                  .map(([u, v]) => `${v} ${u}`)
                  .join(" + "),
              }))
          : [];
        return {
          ...item,
          qtySummary: qtyParts.join(" + "),
          subItems,
          sharePct: grandTotal > 0 ? (item.totalSpent / grandTotal) * 100 : 0,
          colorIndex: idx % 6,
        };
      });

    const dailyMap = new Map();
    const payerMap = new Map();
    const addPayer = (key, name, amt) => {
      if (amt <= 0) return;
      const cur = payerMap.get(key) || { key, name, amount: 0, count: 0 };
      cur.amount = roundMoney(cur.amount + amt);
      cur.count += 1;
      payerMap.set(key, cur);
    };
    groupedMonthBazar.forEach((entry) => {
      const dateStr = String(entry.date || "").trim();
      const amt = Math.max(0, Number(entry.amount) || 0);
      if (dateStr && amt > 0) {
        const dCur = dailyMap.get(dateStr) || { date: dateStr, amount: 0, count: 0 };
        dCur.amount = roundMoney(dCur.amount + amt);
        dCur.count += 1;
        dailyMap.set(dateStr, dCur);
      }
      if (entry.isCombined) {
        const cashAmt = Math.max(0, Number(entry.cashAmount ?? entry.cashEntry?.amount ?? 0));
        const memAmt = Math.max(0, Number(entry.memberAmount ?? entry.memberEntry?.amount ?? 0));
        addPayer("cash-in-hand", "Cash in Hand", cashAmt);
        const mId = entry.paidBy || "member";
        const mName = db.users.find((u) => u.id === mId)?.name || "Member";
        addPayer(mId, mName, memAmt);
      } else if (entry.paidFromCash) {
        addPayer("cash-in-hand", "Cash in Hand", amt);
      } else {
        const mId = entry.paidBy || "member";
        const mName = db.users.find((u) => u.id === mId)?.name || "Member";
        addPayer(mId, mName, amt);
      }
    });
    const dailyTrend = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        label: d.date.slice(5),
      }));
    const maxDaily = dailyTrend.reduce((m, d) => Math.max(m, d.amount), 0);
    const payerTotalSum = Array.from(payerMap.values()).reduce((s, p) => s + p.amount, 0);
    const payerTotals = Array.from(payerMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((p, idx) => ({
        ...p,
        sharePct: payerTotalSum > 0 ? (p.amount / payerTotalSum) * 100 : 0,
        colorIndex: idx % 6,
      }));

    return {
      items: list,
      totalSpent: grandTotal > 0 ? grandTotal : bazarTotal,
      maxSpent: list[0]?.totalSpent || 0,
      dailyTrend,
      maxDaily,
      payerTotals,
    };
  }, [bazarTotal, db.users, groupedMonthBazar]);
  // Utilities are admin-configured expenses; bazar is tracked separately as meal cost.
  const utilityCategories = db.categories.filter(
    (c) => c.name.toLowerCase() !== "bazar",
  );
  const flatRentCategory = utilityCategories.find((category) =>
    isFlatRentName(category.name),
  );
  const flatRentAmount = Number(flatRentCategory?.amount || 0);
  const regularUtilityCategories = utilityCategories.filter(
    (category) => !isFlatRentName(category.name),
  );
  const dividedUtilityCategories = regularUtilityCategories.filter(
    (category) => category.shared,
  );
  const utilitiesTotal = regularUtilityCategories.reduce(
    (s, c) => s + Number(c.amount || 0),
    0,
  );
  const sharedUtilitiesTotal = dividedUtilityCategories.reduce(
    (sum, category) => sum + Number(category.amount || 0),
    0,
  );
  const getUtilityPaidAmount = (statusKey, totalAmount) => {
    const total = Math.max(0, Number(totalAmount || 0));
    const raw = utilityPaidStatus[statusKey];
    if (raw === true) return total;
    if (raw === false || raw == null || raw === "") return 0;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.min(numeric, total);
  };
  const utilitiesPaidTotal = utilityCategories.reduce(
    (sum, category) => {
      const statusKey = isFlatRentName(category.name)
        ? FLAT_RENT_NAME
        : category.name;
      const categoryAmount =
        category.name.toLowerCase() === "bazar" && monthBazar.length
          ? bazarTotal
          : category.amount;
      return sum + getUtilityPaidAmount(statusKey, categoryAmount);
    },
    0,
  );
  const utilitiesPerMember = utilityMemberCount > 0 ? sharedUtilitiesTotal / utilityMemberCount : 0;
  const bazarMemberCount = mealActiveIds.length;
  const individualMealCost = bazarMemberCount > 0 ? Math.ceil(bazarTotal / bazarMemberCount) : 0;
  const sharedTotal =
    db.categories
      .filter(
        (c) =>
          c.shared &&
          c.name.toLowerCase() !== "bazar" &&
          !isFlatRentName(c.name),
      )
      .reduce((s, c) => s + Number(c.amount || 0), 0) +
    (monthBazar.length
      ? bazarTotal
      : Number(
          db.categories.find((c) => c.name.toLowerCase() === "bazar")?.amount ||
            0,
        ));
  const memberCredits = (uid) =>
    monthBazar
      .filter((b) => !b.paidFromCash && b.paidBy === uid)
      .reduce((s, b) => s + Number(b.amount || 0), 0) +
    (db.contributions || [])
      .filter((c) => c.month === month && c.paidBy === uid)
      .reduce((s, c) => s + Number(c.amount || 0), 0) +
    directSettlementPaidBy(uid) -
    settlementReceivedBy(uid);
  const cashContributionsTotal = (db.contributions || [])
    .filter((contribution) => contribution.month === month)
    .reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0);
  const cashBazarSpent = monthBazar
    .filter((entry) => entry.paidFromCash)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const completedCashSettlementTotal = monthSettlements
    .filter((settlement) => settlement.sourceType === "cash_contribution")
    .reduce((sum, settlement) => sum + settlementPaidValue(settlement), 0);
  const pendingCashSettlementTotal = monthSettlements
    .filter((settlement) => settlement.sourceType === "cash_contribution")
    .reduce((sum, settlement) => sum + settlementRemainingValue(settlement), 0);
  const cashInHand = roundMoney(
    cashContributionsTotal - cashBazarSpent - completedCashSettlementTotal,
  );
  const expensesPaidTotal =
    monthBazar.reduce((s, b) => s + Number(b.amount || 0), 0) +
    (db.contributions || [])
      .filter((c) => c.month === month)
      .reduce((s, c) => s + Number(c.amount || 0), 0) -
    completedCashSettlementTotal;
  const perMember = selected.length ? sharedTotal / selected.length : 0;
  const ownRent = Number(user?.rent || 0);
  const ownPayments =
    (db.payments || [])
      .filter((p) => p.userId === user?.id && p.month === month)
      .reduce((s, p) => s + Number(p.amount), 0) + memberCredits(user?.id);
  const accountPaymentTimeline = [
    ...(db.payments || [])
      .filter((payment) => payment.userId === user?.id && payment.month === month)
      .map((payment) => ({
        ...payment,
        timelineId: `payment-${payment.id}`,
        timelineType: payment.type === "meal" ? "meal" : "rent",
      })),
    ...(db.contributions || [])
      .filter((contribution) => contribution.paidBy === user?.id && contribution.month === month)
      .map((contribution) => ({
        ...contribution,
        timelineId: `cash-${contribution.id}`,
        timelineType: "cash",
      })),
    ...monthBazar
      .filter((b) => !b.paidFromCash && b.paidBy === user?.id)
      .map((b) => ({
        id: b.id,
        amount: b.amount,
        date: b.date,
        month: b.month,
        note: Array.isArray(b.items)
          ? b.items.map((it) => (typeof it === "object" ? it.item || it.name : it)).filter(Boolean).join(", ") || "Bazar shopping"
          : String(b.items || "Bazar shopping"),
        timelineId: `bazar-${b.id}`,
        timelineType: "bazar",
      })),
    ...monthSettlements
      .filter((s) => s.sourceType === "direct" && s.fromUserId === user?.id && settlementPaidValue(s) > 0)
      .map((s) => ({
        id: s.id,
        amount: settlementPaidValue(s),
        date: s.date,
        month: s.month,
        note: s.note || `Settled meal due to ${db.users.find((u) => u.id === s.toUserId)?.name || "member"}`,
        timelineId: `settlement-paid-${s.id}`,
        timelineType: "settlement-paid",
      })),
    ...monthSettlements
      .filter((s) => s.toUserId === user?.id && settlementPaidValue(s) > 0)
      .map((s) => ({
        id: s.id,
        amount: settlementPaidValue(s),
        date: s.date,
        month: s.month,
        note: s.note || `Received meal refund from ${s.sourceType === "cash_contribution" ? "House Cash" : (db.users.find((u) => u.id === s.fromUserId)?.name || "member")}`,
        timelineId: `settlement-received-${s.id}`,
        timelineType: "settlement-received",
      })),
  ]
    .sort((a, b) => {
      const dateOrder = String(b.date || "").localeCompare(String(a.date || ""));
      return dateOrder || String(b.id || "").localeCompare(String(a.id || ""));
    });
  const accountPaymentTimelineTotal = accountPaymentTimeline.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  // Member due is room rent plus their share of utilities and bazar, less credits/payments.
  const ownTotalRent = ownRent + utilitiesPerMember;
  const ownDue = Math.ceil(ownTotalRent + (mealActiveIds.includes(user?.id) ? individualMealCost : 0) - ownPayments);
  const allDue = db.users
    .filter((u) => u.active)
    .map((u) => ({
      u,
      shared: selected.includes(u.id) ? perMember : 0,
      paid:
        (db.payments || [])
          .filter((p) => p.userId === u.id && p.month === month)
          .reduce((s, p) => s + Number(p.amount), 0) + memberCredits(u.id),
    }));
  const totalRent = db.users
      .filter((u) => u.active)
      .reduce((s, u) => s + Number(u.rent || 0), 0),
    monthPayments = (db.payments || []).filter((p) => p.month === month),
    totalPaid = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const rentPaid = monthPayments
    .filter((p) => p.type === "rent")
    .reduce((s, p) => s + Number(p.amount), 0);
  const rentInHand = rentPaid - utilitiesPaidTotal;
  const memberRentPaid = (uid) =>
    monthPayments
      .filter((p) => p.userId === uid && p.type === "rent")
      .reduce((s, p) => s + Number(p.amount || 0), 0);
  const memberMealPaid = (uid) =>
    monthPayments
      .filter((p) => p.userId === uid && p.type === "meal")
      .reduce((s, p) => s + Number(p.amount || 0), 0) +
    memberCredits(uid);
  const memberRentShare = (u) =>
    Number(u.rent || 0) + utilitiesPerMember;
  // Meal charges apply only to members explicitly active in the meal roster.
  // Being selected for the rent/overview table does not make a member a meal member.
  const memberMealShare = (u) =>
    mealActiveIds.includes(u.id) ? individualMealCost : 0;
  const memberDue = (u) =>
    memberRentShare(u) + memberMealShare(u) - memberRentPaid(u.id) - memberMealPaid(u.id);
  const memberMealBalance = (member, includePending = false) => {
    const prevDue = Number(previousDueByUser[member?.id] ?? (member?.id === user?.id ? previousDue : 0));
    const completedBalance = memberMealShare(member) - memberMealPaid(member?.id) + prevDue;
    if (!includePending) return roundMoney(completedBalance);
    const pendingDirectPaid =
      directSettlementPaidBy(member?.id, true) - directSettlementPaidBy(member?.id);
    const pendingReceived =
      settlementReceivedBy(member?.id, true) - settlementReceivedBy(member?.id);
    return roundMoney(completedBalance - pendingDirectPaid + pendingReceived);
  };
  const memberCashContribution = (uid) =>
    (db.contributions || [])
      .filter(
        (contribution) =>
          contribution.month === month && contribution.paidBy === uid,
      )
      .reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0);
  const cashSettlementAllocatedBy = (uid, includePending = true) =>
    monthSettlements
      .filter(
        (settlement) =>
          settlement.fromUserId === uid &&
          settlement.sourceType === "cash_contribution",
      )
      .reduce(
        (sum, settlement) =>
          sum +
          (includePending
            ? Number(settlement.amount || 0)
            : settlementPaidValue(settlement)),
        0,
      );
  const availableContributionForSettlement = (uid) =>
    Math.max(
      0,
      roundMoney(memberCashContribution(uid) - cashSettlementAllocatedBy(uid)),
    );
  const settlementBalanceRows = allActiveUsers.map((member) => {
    const prevDue = Number(previousDueByUser[member?.id] ?? (member?.id === user?.id ? previousDue : 0));
    return {
      member,
      mealCost: memberMealShare(member),
      mealPaid: memberMealPaid(member.id),
      previousDue: prevDue,
      balance: memberMealBalance(member),
      projectedBalance: memberMealBalance(member, true),
    };
  });
  const buildAutoSettlementSuggestions = () => {
    const balances = new Map(
      settlementBalanceRows.map((row) => [row.member.id, row.projectedBalance]),
    );
    const suggestions = [];
    let cashCapacity = Math.max(
      0,
      roundMoney(cashInHand - pendingCashSettlementTotal),
    );
    const contributors = allActiveUsers
      .map((member) => ({
        member,
        remaining: availableContributionForSettlement(member.id),
      }))
      .filter((entry) => hasMoney(entry.remaining));
    const creditors = allActiveUsers
      .map((member) => ({ member, remaining: balances.get(member.id) || 0 }))
      .filter((entry) => entry.remaining < -0.009)
      .sort((a, b) => a.remaining - b.remaining);

    for (const contributor of contributors) {
      for (const creditor of creditors) {
        if (!hasMoney(contributor.remaining) || !hasMoney(cashCapacity)) break;
        if (creditor.remaining >= -0.009) continue;
        if (contributor.member.id === creditor.member.id) continue;
        const amount = roundMoney(
          Math.min(
            contributor.remaining,
            Math.abs(creditor.remaining),
            cashCapacity,
          ),
        );
        if (!hasMoney(amount)) continue;
        suggestions.push({
          sourceType: "cash_contribution",
          fromUserId: contributor.member.id,
          toUserId: creditor.member.id,
          amount,
        });
        contributor.remaining = roundMoney(contributor.remaining - amount);
        creditor.remaining = roundMoney(creditor.remaining + amount);
        cashCapacity = roundMoney(cashCapacity - amount);
        balances.set(creditor.member.id, creditor.remaining);
      }
    }

    const debtors = allActiveUsers
      .map((member) => ({ member, remaining: balances.get(member.id) || 0 }))
      .filter((entry) => entry.remaining > 0.009)
      .sort((a, b) => b.remaining - a.remaining);
    const remainingCreditors = allActiveUsers
      .map((member) => ({ member, remaining: balances.get(member.id) || 0 }))
      .filter((entry) => entry.remaining < -0.009)
      .sort((a, b) => a.remaining - b.remaining);
    for (const debtor of debtors) {
      for (const creditor of remainingCreditors) {
        if (!hasMoney(debtor.remaining)) break;
        if (creditor.remaining >= -0.009) continue;
        if (debtor.member.id === creditor.member.id) continue;
        const amount = roundMoney(
          Math.min(debtor.remaining, Math.abs(creditor.remaining)),
        );
        if (!hasMoney(amount)) continue;
        suggestions.push({
          sourceType: "direct",
          fromUserId: debtor.member.id,
          toUserId: creditor.member.id,
          amount,
        });
        debtor.remaining = roundMoney(debtor.remaining - amount);
        creditor.remaining = roundMoney(creditor.remaining + amount);
      }
    }
    return suggestions;
  };
  const settlementSuggestions = buildAutoSettlementSuggestions();
  const expensesPaid =
    monthPayments
      .filter((p) => p.type === "meal")
      .reduce((s, p) => s + Number(p.amount), 0) + expensesPaidTotal;
  const allOwed = allDue.reduce(
    (s, x) => s + Number(x.u.rent || 0) + x.shared - x.paid,
    0,
  );
  async function ensureCloudMonth(label, createIfMissing = true) {
    if (!supabase) throw new Error("Supabase is not configured.");
    let { data, error } = await supabase
      .from("months")
      .select("id,label,current_count,current_members,is_current")
      .eq("label", label)
      .maybeSingle();
    if (error) throw error;
    if (!data && createIfMissing) {
      if (
        !session?.id ||
        db.users.find((u) => u.id === session.id)?.role !== "admin"
      )
        throw new Error(
          "This month is not set up yet. Ask the admin to create/save its monthly setup first.",
        );
      const { data: created, error: createError } = await supabase
        .from("months")
        .insert({
          label,
          current_count: 0,
          current_members: [],
          is_current: false,
        })
        .select("id,label,current_count,current_members,is_current")
        .single();
      if (createError) throw createError;
      data = created;

      // Step 2: initialize a new month with the latest earlier month's utilities.
      // Monthly rows remain independent, so later edits do not rewrite past months.
      try {
        const { data: monthRows, error: monthRowsError } = await supabase
          .from("months")
          .select("id,label");
        if (monthRowsError) throw monthRowsError;
        const monthIndex = (value) => {
          const parsed = new Date(`${value} 1`);
          return Number.isNaN(parsed.getTime())
            ? -1
            : parsed.getFullYear() * 12 + parsed.getMonth();
        };
        const targetIndex = monthIndex(label);
        const previousMonth = (monthRows || [])
          .filter((row) => row.id !== data.id && monthIndex(row.label) >= 0 && monthIndex(row.label) < targetIndex)
          .sort((a, b) => monthIndex(b.label) - monthIndex(a.label))[0];
        if (previousMonth) {
          const { data: previousUtilities, error: utilitiesError } = await supabase
            .from("expense_categories")
            .select("name,amount,shared,created_by")
            .eq("month_id", previousMonth.id);
          if (utilitiesError) throw utilitiesError;
          const copiedUtilities = (previousUtilities || [])
            .filter((category) => String(category.name).toLowerCase() !== "bazar")
            .map((category) => ({
              month_id: data.id,
              name: category.name,
              amount: Number(category.amount || 0),
              shared: !!category.shared,
              created_by: category.created_by || session.id,
            }));
          if (copiedUtilities.length) {
            const { error: copyError } = await supabase
              .from("expense_categories")
              .upsert(copiedUtilities, { onConflict: "month_id,name" });
            if (copyError) throw copyError;
          }
        }
      } catch (copyError) {
        console.warn("Could not copy previous month's utility defaults:", copyError);
      }
    }
    return data;
  }
  async function loadNotices(showForUser = false, profileId = session?.id) {
    if (!supabaseConfigured || !supabase) return [];
    let noticeResult = await supabase
      .from("notices")
      .select("id,title,body,image_url,created_at,created_by,status,kind,activity_type,entity_id,metadata")
      .order("created_at", { ascending: false })
      .limit(100);
    if (noticeResult.error && isMissingActivityNotificationSchemaError(noticeResult.error)) {
      noticeResult = await supabase
        .from("notices")
        .select("id,title,body,image_url,created_at,created_by,status")
        .order("created_at", { ascending: false })
        .limit(100);
    }
    if (noticeResult.error) {
      console.warn("Shared notices are unavailable:", noticeResult.error.message);
      noticeResult = { data: [] };
    }

    let [profilesResult, bazarResult, paymentResult, cashResult, bulletinSettingResult, bulletinSpeedSettingResult] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role,active"),
      supabase
        .from("bazar_entries")
        .select("id,amount,paid_by,paid_from_cash,items,created_by,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("rent_payments")
        .select("id,amount,user_id,payment_type,note,created_by,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("cash_contributions")
        .select("id,amount,paid_by,note,created_by,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "bulletin_notices")
        .maybeSingle(),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "bulletin_marquee_speed")
        .maybeSingle(),
    ]);
    if (!bulletinSettingResult?.error) {
      if (bulletinSettingResult?.data?.value !== undefined && bulletinSettingResult?.data?.value !== null) {
        try {
          const parsedBulletins = JSON.parse(bulletinSettingResult.data.value);
          if (Array.isArray(parsedBulletins)) {
            setBulletinNotices(
              parsedBulletins
                .map((item, idx) => {
                  if (typeof item === "string") {
                    return { id: `bulletin-${idx}`, text: item.trim(), active: true, createdAt: "" };
                  }
                  if (!item || typeof item !== "object") return null;
                  const text = String(item.text || item.body || item.title || "").trim();
                  if (!text) return null;
                  return {
                    id: String(item.id || `bulletin-${idx}`),
                    text,
                    active: item.active !== false,
                    noticeId: item.noticeId ? String(item.noticeId) : "",
                    createdAt: item.createdAt ? String(item.createdAt) : "",
                  };
                })
                .filter(Boolean),
            );
          }
        } catch (err) {
          console.warn("Could not parse bulletin notices:", err?.message);
        }
      }
    }
    if (!bulletinSpeedSettingResult?.error) {
      const savedSpeed = Number(bulletinSpeedSettingResult?.data?.value);
      if (Number.isFinite(savedSpeed)) {
        setBulletinSpeed(Math.max(24, Math.min(90, savedSpeed)));
      }
    }
    if (
      bazarResult.error &&
      /paid_from_cash/i.test(bazarResult.error.message || "") &&
      /column|schema cache|does not exist|not found/i.test(bazarResult.error.message || "")
    ) {
      bazarResult = await supabase
        .from("bazar_entries")
        .select("id,amount,paid_by,items,created_by,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
    }
    if (
      paymentResult.error &&
      /payment_type/i.test(paymentResult.error.message || "") &&
      /column|schema cache|does not exist|not found/i.test(paymentResult.error.message || "")
    ) {
      paymentResult = await supabase
        .from("rent_payments")
        .select("id,amount,user_id,note,created_by,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
    }
    for (const [label, result] of [
      ["profiles", profilesResult],
      ["bazar activity", bazarResult],
      ["payment activity", paymentResult],
      ["cash activity", cashResult],
    ]) {
      if (result.error) console.warn(`Could not load ${label}:`, result.error.message);
    }

    const profileById = new Map(
      (db.users || []).map((profile) => [
        profile.id,
        { full_name: profile.name, role: profile.role, active: profile.active },
      ]),
    );
    for (const profile of profilesResult.data || []) profileById.set(profile.id, profile);
    const profileName = (id, fallback = "A member") =>
      profileById.get(id)?.full_name || fallback;

    const rows = (noticeResult.data || []).map((notice) => ({
      ...notice,
      kind: notice.kind || "announcement",
      activity_type: notice.activity_type || "",
      metadata:
        notice.metadata && typeof notice.metadata === "object"
          ? notice.metadata
          : {},
      source: "notice",
    }));

    const derivedActivities = [
      ...(bazarResult.data || []).map((entry) => ({
        id: `activity:bazar:${entry.id}`,
        title: "New Bazar Added",
        body: "",
        image_url: null,
        created_at: entry.created_at,
        created_by: entry.created_by,
        status: "published",
        kind: "activity",
        activity_type: "bazar_added",
        entity_id: entry.id,
        metadata: {
          member_id: entry.paid_by,
          member_name: profileName(entry.paid_by),
          actor_id: entry.created_by,
          actor_name: profileName(entry.created_by, profileName(entry.paid_by)),
          amount: Number(entry.amount || 0),
          items: entry.items,
          paid_from_cash: Boolean(entry.paid_from_cash),
        },
        source: "derived",
      })),
      ...(paymentResult.data || []).map((payment) => ({
        id: `activity:payment:${payment.id}`,
        title: "Payment Confirmed",
        body: "",
        image_url: null,
        created_at: payment.created_at,
        created_by: payment.created_by,
        status: "published",
        kind: "activity",
        activity_type: "payment_confirmed",
        entity_id: payment.id,
        metadata: {
          member_id: payment.user_id,
          member_name: profileName(payment.user_id),
          actor_id: payment.created_by,
          actor_name: profileName(payment.created_by, "Administrator"),
          amount: Number(payment.amount || 0),
          payment_type:
            payment.payment_type ||
            (String(payment.note || "").toLowerCase().includes("rent") ? "rent" : "meal"),
          note: payment.note || "",
        },
        source: "derived",
      })),
      ...(cashResult.data || []).map((contribution) => ({
        id: `activity:cash:${contribution.id}`,
        title: "Cash Contribution Added",
        body: "",
        image_url: null,
        created_at: contribution.created_at,
        created_by: contribution.created_by,
        status: "published",
        kind: "activity",
        activity_type: "cash_contribution_added",
        entity_id: contribution.id,
        metadata: {
          member_id: contribution.paid_by,
          member_name: profileName(contribution.paid_by),
          actor_id: contribution.created_by,
          actor_name: profileName(contribution.created_by, "Administrator"),
          amount: Number(contribution.amount || 0),
          note: contribution.note || "",
        },
        source: "derived",
      })),
    ];
    const serverActivityKeys = new Set(
      rows
        .filter((notice) => notice.kind === "activity" && notice.entity_id)
        .map((notice) => `${notice.activity_type}:${notice.entity_id}`),
    );
    const mergedRows = [
      ...rows,
      ...derivedActivities.filter(
        (notice) =>
          !serverActivityKeys.has(`${notice.activity_type}:${notice.entity_id}`),
      ),
    ]
      .sort(
        (left, right) =>
          (Date.parse(right.created_at) || 0) - (Date.parse(left.created_at) || 0),
      )
      .slice(0, 100);

    const role = profileById.get(profileId)?.role || db.users.find((u) => u.id === profileId)?.role;
    const visibleRows = role === "admin"
      ? mergedRows
      : mergedRows.filter((notice) => notice.status === "published");
    const dismissedIds = readStoredNotificationIds(
      NOTIFICATION_DISMISSED_STORAGE,
      profileId,
    );
    setDismissedNotificationIds(dismissedIds);
    setNotices(visibleRows);
    if (profileId) {
      const { data: reads, error: readError } = await supabase
        .from("notice_reads")
        .select("notice_id,read_at")
        .eq("user_id", profileId);
      if (readError) console.warn("Shared notification read status is unavailable:", readError.message);
      const readAtByNotice = new Map((reads || []).map((r) => [r.notice_id, Date.parse(r.read_at)]));
      const localReadIds = readStoredNotificationIds(NOTIFICATION_READ_STORAGE, profileId);
      const readIds = Array.from(new Set([
        ...localReadIds,
        ...visibleRows
          .filter(
            (notice) =>
              notice.source === "notice" &&
              (readAtByNotice.get(notice.id) || 0) >= Date.parse(notice.created_at),
          )
          .map((notice) => String(notice.id)),
      ]));
      setReadNoticeIds(readIds);
      if (
        showForUser &&
        role === "member" &&
        visibleRows.some(
          (n) =>
            n.status === "published" &&
            n.kind !== "activity" &&
            !dismissedIds.includes(String(n.id)) &&
            !readIds.includes(n.id),
        )
      )
        setNoticeModal(true);
    } else setReadNoticeIds([]);
    return visibleRows;
  }
  async function refreshInbox() {
    if (!session?.id || !supabaseConfigured || !supabase) return;
    try {
      const baseMessageFields = "id,sender_id,recipient_id,body,created_at,read_at";
      let attachmentSchemaAvailable = true;
      let messagesResult = await supabase
          .from("direct_messages")
          .select(`${baseMessageFields},attachment_path,attachment_name,attachment_type,attachment_size`)
          .or(`sender_id.eq.${session.id},recipient_id.eq.${session.id}`)
          .order("created_at", { ascending: false })
          .limit(500);
      if (
        messagesResult.error &&
        /attachment_(path|name|type|size)/i.test(messagesResult.error.message || "") &&
        /column|schema cache|does not exist|not found/i.test(messagesResult.error.message || "")
      ) {
        attachmentSchemaAvailable = false;
        messagesResult = await supabase
          .from("direct_messages")
          .select(baseMessageFields)
          .or(`sender_id.eq.${session.id},recipient_id.eq.${session.id}`)
          .order("created_at", { ascending: false })
          .limit(500);
      }
      const [unreadResult, activityResult] = await Promise.all([
        supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", session.id)
          .is("read_at", null),
        supabase.from("profiles").select("id,last_login_at"),
      ]);
      const queryError = messagesResult.error || unreadResult.error;
      if (queryError) throw queryError;
      const messagesWithAttachments = await Promise.all(
        (messagesResult.data || []).map(async (message) => {
          if (!message.attachment_path) return message;
          const { data: signedFile, error: signedUrlError } = await supabase.storage
            .from("inbox-attachments")
            .createSignedUrl(message.attachment_path, 3600);
          if (signedUrlError) {
            console.error("Could not open an Inbox attachment:", signedUrlError);
            return { ...message, attachment_url: "", attachment_error: signedUrlError.message };
          }
          return { ...message, attachment_url: signedFile.signedUrl };
        }),
      );
      setInboxMessages(messagesWithAttachments.reverse());
      setInboxUnreadCount(unreadResult.count || 0);
      if (activityResult.error) {
        console.warn("Could not refresh Inbox last-active times:", activityResult.error.message);
      } else {
        const activityById = new Map(
          (activityResult.data || []).map((profile) => [profile.id, profile.last_login_at]),
        );
        setDb((current) => ({
          ...current,
          users: current.users.map((profile) => ({
            ...profile,
            lastLoginAt: activityById.get(profile.id) || profile.lastLoginAt,
          })),
        }));
      }
      setInboxError(
        !attachmentSchemaAvailable
          ? "Messages loaded, but Inbox attachments are not set up yet. Apply supabase/migrations/20261104_inbox_attachments.sql in Supabase."
          : "",
      );
    } catch (queryError) {
      console.error("Could not load inbox messages:", queryError);
      setInboxError(`Inbox could not load: ${queryError?.message || "Unknown Supabase error"}`);
    }
  }
  async function selectInboxMember(memberId) {
    setSelectedInboxMemberId(memberId);
    setMobileInboxView("conversation");
    setInboxError("");
    setInboxMenuOpen(false);
    setInboxMediaOpen(false);
    const hasUnreadFromMember = inboxMessages.some(
      (message) =>
        message.sender_id === memberId &&
        message.recipient_id === session?.id &&
        !message.read_at,
    );
    if (!hasUnreadFromMember) return;
    try {
      const { error: readError } = await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", memberId)
        .eq("recipient_id", session.id)
        .is("read_at", null);
      if (readError) throw readError;
      await refreshInbox();
    } catch (readError) {
      console.error("Could not mark inbox messages as read:", readError);
      setInboxError("Could not mark these messages as read. Please try again.");
    }
  }
  async function loadInboxMedia(memberId = selectedInboxMemberId) {
    if (!session?.id || !memberId) return;
    setInboxMediaBusy(true);
    setInboxError("");
    try {
      const allAttachments = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error: mediaError } = await supabase
          .from("direct_messages")
          .select("id,attachment_path,attachment_name,attachment_type,attachment_size,created_at")
          .not("attachment_path", "is", null)
          .or(
            `and(sender_id.eq.${session.id},recipient_id.eq.${memberId}),and(sender_id.eq.${memberId},recipient_id.eq.${session.id})`,
          )
          .order("created_at", { ascending: false })
          .range(offset, offset + 499);
        if (mediaError) throw mediaError;
        allAttachments.push(...(data || []));
        if (!data || data.length < 500) break;
      }
      const signedAttachments = await Promise.all(
        allAttachments.map(async (attachment) => {
          const { data, error: urlError } = await supabase.storage
            .from("inbox-attachments")
            .createSignedUrl(attachment.attachment_path, 3600);
          if (urlError) throw urlError;
          return { ...attachment, url: data.signedUrl };
        }),
      );
      setInboxMediaFiles(signedAttachments);
      setInboxMediaOpen(true);
      setInboxMenuOpen(false);
    } catch (mediaError) {
      console.error("Could not load conversation media:", mediaError);
      setInboxError(mediaError?.message || "Could not load conversation media.");
    } finally {
      setInboxMediaBusy(false);
    }
  }
  async function deleteInboxConversation() {
    if (!selectedInboxMember || !session?.id || inboxDeleteBusy) return;
    const confirmed = await askConfirm(
      `Delete every message and attached file in your conversation with ${selectedInboxMember.name}? This permanently removes the conversation for both people and cannot be undone.`,
      "Delete conversation?",
    );
    if (!confirmed) return;
    setInboxDeleteBusy(true);
    setInboxError("");
    try {
      const conversationMessages = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error: fetchError } = await supabase
          .from("direct_messages")
          .select("id,attachment_path")
          .or(
            `and(sender_id.eq.${session.id},recipient_id.eq.${selectedInboxMember.id}),and(sender_id.eq.${selectedInboxMember.id},recipient_id.eq.${session.id})`,
          )
          .range(offset, offset + 499);
        if (fetchError) throw fetchError;
        conversationMessages.push(...(data || []));
        if (!data || data.length < 500) break;
      }
      const attachments = conversationMessages
        .map((message) => message.attachment_path)
        .filter(Boolean);
      for (let offset = 0; offset < attachments.length; offset += 100) {
        const { error: storageError } = await supabase.storage
          .from("inbox-attachments")
          .remove(attachments.slice(offset, offset + 100));
        if (storageError) throw storageError;
      }
      if (conversationMessages.length) {
        const { error: deleteError } = await supabase
          .from("direct_messages")
          .delete()
          .or(
            `and(sender_id.eq.${session.id},recipient_id.eq.${selectedInboxMember.id}),and(sender_id.eq.${selectedInboxMember.id},recipient_id.eq.${session.id})`,
          );
        if (deleteError) throw deleteError;
      }
      await refreshInbox();
      setInboxMediaFiles([]);
      setInboxMediaOpen(false);
      setInboxMenuOpen(false);
      setBazarSuccessToast("Conversation deleted successfully");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (deleteError) {
      console.error("Could not delete inbox conversation:", deleteError);
      setInboxError(deleteError?.message || "Could not delete conversation. Please try again.");
    } finally {
      setInboxDeleteBusy(false);
    }
  }
  async function sendInboxMessage(event) {
    event.preventDefault();
    const body = inboxDraft.trim();
    const file = inboxAttachment;
    if ((!body && !file) || body.length > 2000 || !selectedInboxMemberId || !session?.id) return;
    setInboxBusy(true);
    setInboxError("");
    let uploadedPath = "";
    try {
      let attachment = {};
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Choose a file smaller than 10 MB.");
        }
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
        uploadedPath = `${session.id}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
        const { error: uploadError } = await supabase.storage
          .from("inbox-attachments")
          .upload(uploadedPath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        attachment = {
          attachment_path: uploadedPath,
          attachment_name: file.name,
          attachment_type: file.type || "application/octet-stream",
          attachment_size: file.size,
        };
      }
      const { error: sendError } = await supabase.from("direct_messages").insert({
        sender_id: session.id,
        recipient_id: selectedInboxMemberId,
        body: body || null,
        ...attachment,
      });
      if (sendError) throw sendError;
      setInboxDraft("");
      setInboxAttachment(null);
      if (inboxAttachmentInputRef.current) inboxAttachmentInputRef.current.value = "";
      await refreshInbox();
    } catch (sendError) {
      console.error("Could not send inbox message:", sendError);
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("inbox-attachments")
          .remove([uploadedPath]);
        if (cleanupError) console.error("Could not clean up the unsent attachment:", cleanupError);
      }
      setInboxError(sendError?.message || "Message could not be sent. Please try again.");
    } finally {
      setInboxBusy(false);
    }
  }
  async function markAllNoticesRead(
    profileId = session?.id,
    targetNotices = publishedNotifications,
  ) {
    if (!profileId || !supabase || noticeReadBusy) return;
    setNoticeReadBusy(true);
    try {
      const unread = targetNotices.filter(
        (n) => !readNoticeIds.includes(n.id),
      );
      const nextReadIds = Array.from(
        new Set([...readNoticeIds, ...unread.map((notice) => String(notice.id))]),
      );
      writeStoredNotificationIds(
        NOTIFICATION_READ_STORAGE,
        profileId,
        nextReadIds,
      );
      const sharedUnread = unread.filter((notice) => notice.source === "notice");
      if (sharedUnread.length) {
        const payload = sharedUnread.map((n) => ({
          user_id: profileId,
          notice_id: n.id,
          read_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("notice_reads")
          .upsert(payload, { onConflict: "user_id,notice_id" });
        if (error) console.warn("Could not sync notification read status:", error.message);
      }
      setReadNoticeIds(nextReadIds);
      setNoticePanelOpen(false);
      setNoticeModal(false);
    } finally {
      setNoticeReadBusy(false);
    }
  }

  async function markNoticeRead(notice, profileId = session?.id) {
    if (!profileId || !notice) return;
    const noticeIdStr = String(notice.id);
    if (readNoticeIds.includes(noticeIdStr)) return;
    const nextReadIds = Array.from(new Set([...readNoticeIds, noticeIdStr]));
    writeStoredNotificationIds(
      NOTIFICATION_READ_STORAGE,
      profileId,
      nextReadIds,
    );
    if (notice.source === "notice" && supabase) {
      try {
        await supabase
          .from("notice_reads")
          .upsert([{ user_id: profileId, notice_id: notice.id, read_at: new Date().toISOString() }], { onConflict: "user_id,notice_id" });
      } catch (err) {
        console.warn("Could not sync single notice read:", err?.message);
      }
    }
    setReadNoticeIds(nextReadIds);
  }

  async function handleNotificationClick(n) {
    if (!n) return;
    void markNoticeRead(n, user?.id || session?.id);
    if (n.activity_type === "bazar_added" || n.title === "New Bazar Added") {
      let targetBazar = (db.bazars || []).find((b) => String(b.id) === String(n.entity_id));
      if (!targetBazar && n.entity_id && supabase) {
        try {
          const { data: bData } = await supabase
            .from("bazar_entries")
            .select("id,entry_date,amount,paid_by,paid_from_cash,items,created_by")
            .eq("id", n.entity_id)
            .maybeSingle();
          if (bData) {
            targetBazar = {
              id: bData.id,
              date: bData.entry_date,
              amount: Number(bData.amount),
              paidBy: bData.paid_by,
              paidFromCash: Boolean(bData.paid_from_cash),
              createdBy: bData.created_by,
              items: (() => {
                const raw = bData.items;
                if (Array.isArray(raw)) return raw;
                const text = String(raw || "");
                try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parsed; } catch {}
                return text.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
              })(),
            };
          }
        } catch (err) {
          console.warn("Could not fetch clicked bazar:", err);
        }
      }
      if (!targetBazar && n.metadata) {
        targetBazar = {
          id: n.entity_id || n.id,
          date: n.created_at ? n.created_at.slice(0, 10) : todayForDateInput(),
          amount: Number(n.metadata.amount || 0),
          paidBy: n.metadata.member_id,
          paidFromCash: Boolean(n.metadata.paid_from_cash),
          createdBy: n.metadata.actor_id,
          items: n.metadata.items,
        };
      }
      setNoticePanelOpen(false);
      setPage("bazar");
      if (targetBazar) {
        setBazarDetailsEntry(targetBazar);
      }
    } else if (n.activity_type === "payment_confirmed") {
      setNoticePanelOpen(false);
      setPage("account");
    } else if (n.activity_type === "cash_contribution_added") {
      setNoticePanelOpen(false);
      setPage("account");
    }
  }

  async function markNoticeRead(notice, profileId = session?.id) {
    if (!profileId || !notice) return;
    const noticeIdStr = String(notice.id);
    if (readNoticeIds.includes(noticeIdStr)) return;
    const nextReadIds = Array.from(new Set([...readNoticeIds, noticeIdStr]));
    writeStoredNotificationIds(
      NOTIFICATION_READ_STORAGE,
      profileId,
      nextReadIds,
    );
    if (notice.source === "notice" && supabase) {
      try {
        await supabase
          .from("notice_reads")
          .upsert([{ user_id: profileId, notice_id: notice.id, read_at: new Date().toISOString() }], { onConflict: "user_id,notice_id" });
      } catch (err) {
        console.warn("Could not sync single notice read:", err?.message);
      }
    }
    setReadNoticeIds(nextReadIds);
  }

  async function handleNotificationClick(n) {
    if (!n) return;
    void markNoticeRead(n, user?.id || session?.id);
    if (isBazarNotification(n)) {
      setNoticePanelOpen(false);
      setPage("bazar");
      let targetBazar = (db.bazars || []).find((b) => String(b.id) === String(n.entity_id));
      if (!targetBazar && n.entity_id && supabase) {
        try {
          const { data: bData } = await supabase
            .from("bazar_entries")
            .select("id,entry_date,amount,paid_by,paid_from_cash,items,created_by")
            .eq("id", n.entity_id)
            .maybeSingle();
          if (bData) {
            targetBazar = {
              id: bData.id,
              date: bData.entry_date,
              amount: Number(bData.amount),
              paidBy: bData.paid_by,
              paidFromCash: Boolean(bData.paid_from_cash),
              createdBy: bData.created_by,
              items: (() => {
                const raw = bData.items;
                if (Array.isArray(raw)) return raw;
                const text = String(raw || "");
                try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parsed; } catch {}
                return text.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
              })(),
            };
          }
        } catch (err) {
          console.warn("Could not fetch clicked bazar:", err);
        }
      }
      if (!targetBazar && n.metadata) {
        targetBazar = {
          id: n.entity_id || n.id,
          date: n.created_at ? n.created_at.slice(0, 10) : todayForDateInput(),
          amount: Number(n.metadata.amount || 0),
          paidBy: n.metadata.member_id,
          paidFromCash: Boolean(n.metadata.paid_from_cash),
          createdBy: n.metadata.actor_id,
          items: n.metadata.items,
        };
      }
      if (targetBazar) {
        setBazarDetailsEntry(targetBazar);
      }
    } else if (n.activity_type === "payment_confirmed") {
      setNoticePanelOpen(false);
      setPage("account");
    } else if (n.activity_type === "cash_contribution_added") {
      setNoticePanelOpen(false);
      setPage("account");
    }
  }
  async function clearAllNotifications(profileId = session?.id) {
    if (!profileId || noticeReadBusy || !publishedNotifications.length) return;
    setNoticeReadBusy(true);
    try {
      const visibleIds = publishedNotifications.map((notice) => String(notice.id));
      const nextDismissedIds = Array.from(
        new Set([...dismissedNotificationIds, ...visibleIds]),
      );
      const nextReadIds = Array.from(new Set([...readNoticeIds, ...visibleIds]));
      writeStoredNotificationIds(
        NOTIFICATION_DISMISSED_STORAGE,
        profileId,
        nextDismissedIds,
      );
      writeStoredNotificationIds(
        NOTIFICATION_READ_STORAGE,
        profileId,
        nextReadIds,
      );
      setDismissedNotificationIds(nextDismissedIds);
      setReadNoticeIds(nextReadIds);

      const sharedNotifications = publishedNotifications.filter(
        (notice) => notice.source === "notice",
      );
      if (sharedNotifications.length && supabase) {
        const { error } = await supabase.from("notice_reads").upsert(
          sharedNotifications.map((notice) => ({
            user_id: profileId,
            notice_id: notice.id,
            read_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,notice_id" },
        );
        if (error) console.warn("Could not sync cleared notifications:", error.message);
      }
      setNoticePanelOpen(false);
      setNoticeModal(false);
    } finally {
      setNoticeReadBusy(false);
    }
  }
  async function toggleNoticePanel() {
    const shouldOpen = !noticePanelOpen;
    setNoticePanelOpen(shouldOpen);
    if (shouldOpen && session?.id) {
      await loadNotices(false, session.id).catch((notificationError) =>
        console.warn("Could not refresh notifications:", notificationError?.message),
      );
    }
  }

  const noticeBellWrapRef = useRef(null);

  useEffect(() => {
    if (!noticePanelOpen) return;
    function handleOutsideClick(event) {
      if (noticeBellWrapRef.current && !noticeBellWrapRef.current.contains(event.target)) {
        setNoticePanelOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setNoticePanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [noticePanelOpen]);
  function exportLegacyMyAccountPdf(reportUser = user) {
    if (previousDueLoading) { alert("Previous months due is still loading. Please try again in a moment."); return; }
    if (!reportUser) return;
    const signedInUserId = user?.id;
    const popup = window.open("", "_blank", "width=900,height=700");
    const popupBlocked = !popup;
    const reportDocument = popup
      ? popup.document
      : document.implementation.createHTMLDocument("My Monthly Hisab");
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
    const rows = utilityCategories.filter((category) => category.shared && !isFlatRentName(category.name)).map((category) => `<tr><td><span class="utility-mark" aria-hidden="true">⌁</span>${escapeHtml(category.name)}</td><td>${money(category.amount)}</td><td>${money(utilityMemberCount > 0 ? Math.ceil(Number(category.amount || 0) / utilityMemberCount) : 0)}</td></tr>`).join("");
    const reportMember = reportUser;
    const ownTotalRent = Number(reportUser.rent || 0) + utilitiesPerMember;
    const mealCost = mealActiveIds.includes(reportUser.id) ? individualMealCost : 0;
    const ownPayments =
      (db.payments || [])
        .filter((payment) => payment.userId === reportUser.id && payment.month === month)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) +
      memberCredits(reportUser.id);
    const currentDue = Math.ceil(ownTotalRent + mealCost - ownPayments);
    const pastDue = previousDueByUser[reportUser.id] ?? (reportUser.id === signedInUserId ? previousDue : 0);
    const totalDue = currentDue + pastDue;
    const icons = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/></svg>',
      meal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3m-3 7v11M17 3v18m0-18c3 2 3 7 0 9"/></svg>',
      paid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.7 2.7 3 6 3s6-1.3 6-3V6m-12 5v5c0 1.7 2.7 3 6 3 1.2 0 2.4-.2 3.3-.6"/><path d="M15 10c3.3 0 6 1.3 6 3v5c0 1.7-2.7 3-6 3s-6-1.3-6-3"/></svg>',
      due: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 5h.01"/></svg>',
      total: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18m5-13H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    };
    reportDocument.open();
    reportDocument.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My Monthly Hisab - ${escapeHtml(month)}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}body{margin:0;padding:40px 32px;background:#fcf9f4;color:#142238;font:400 16px/1.55 "Hind Siliguri",sans-serif;letter-spacing:-.01em;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;background-image:radial-gradient(ellipse at 92% 0%,rgba(211,232,216,.55),transparent 34%),radial-gradient(ellipse at 0% 0%,rgba(248,233,218,.5),transparent 32%)}
      .sheet{max-width:960px;margin:0 auto}.heading{display:flex;align-items:center;gap:20px;margin-bottom:26px}.brand-icon{width:78px;height:78px;display:grid;place-items:center;flex:none;border-radius:22px;background:#e8f3e3;color:#087343}.brand-icon svg{width:42px;height:42px}.divider{height:68px;width:1px;background:#b9b8b2}.heading h1{font:650 clamp(30px,5vw,44px)/1.08 "Hind Siliguri",sans-serif;letter-spacing:-.045em;margin:0 0 5px;color:#101e34}.heading p{margin:0;color:#586779;font-size:20px;font-weight:450;letter-spacing:-.025em}
      .print{display:inline-flex;align-items:center;gap:10px;margin:2px 0 26px;padding:13px 22px;border:0;border-radius:14px;background:linear-gradient(135deg,#087547,#005d3a);color:white;font-size:17px;font-weight:650;box-shadow:0 6px 13px rgba(0,91,55,.2);cursor:pointer}.print svg{width:20px;height:20px}
      .cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:44px}.card{position:relative;display:flex;align-items:center;gap:18px;min-height:110px;padding:20px 24px;overflow:hidden;border:1px solid #e2ddd5;border-radius:19px;background:rgba(255,255,255,.48);box-shadow:0 7px 17px rgba(42,48,41,.055)}.card:after{position:absolute;content:"";height:4px;left:14px;right:14px;bottom:0;border-radius:4px;background:linear-gradient(90deg,#9fdcb4,#5dc68c,#9fdcb4)}.card-icon{width:56px;height:56px;display:grid;place-items:center;flex:none;border-radius:16px;background:#e7f2e1;color:#087343}.card-icon svg{width:31px;height:31px}.label{color:#536174;font-size:16px;font-weight:500;letter-spacing:-.015em}.value{margin-top:3px;color:#101e34;font:650 30px/1.2 "Hind Siliguri",sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.045em}
      .section-title{display:flex;align-items:center;gap:15px;margin:0 0 20px}.section-title:before{content:"";width:6px;height:42px;border-radius:6px;background:#087547}.section-title h2{margin:0;color:#101e34;font:650 32px/1.1 "Hind Siliguri",sans-serif;letter-spacing:-.04em}
      .table-wrap{overflow:hidden;border:1px solid #e0dbd2;border-radius:17px;background:rgba(255,255,255,.48);box-shadow:0 6px 16px rgba(42,48,41,.05)}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:13px 20px;text-align:left;border-bottom:1px solid #dedbd4}th{background:linear-gradient(90deg,#edf2e8,#e5eee1);font-size:15px;font-weight:650;letter-spacing:.015em;color:#172236}td{font-size:16px;font-weight:450}tbody tr:last-child td{border-bottom:0}td:first-child{width:52%;font-weight:550}.utility-mark{display:inline-grid;place-items:center;width:34px;height:30px;margin-right:13px;border-radius:10px;background:#eaf3e3;color:#087343;font-size:22px;font-weight:700}
      .note{display:flex;align-items:center;gap:13px;margin:30px 0 0;padding:16px 21px;border-radius:16px;background:#edf2e8;color:#46576a;font-size:17px;font-style:italic}.note-icon{width:25px;height:25px;display:grid;place-items:center;flex:none;border:2px solid #087343;border-radius:50%;color:#087343;font:700 16px "Hind Siliguri",sans-serif;font-style:normal}
      @page{size:A4;margin:13mm}@media(max-width:620px){body{padding:24px 16px}.brand-icon{width:58px;height:58px;border-radius:17px}.brand-icon svg{width:34px;height:34px}.heading{gap:13px}.divider{height:54px}.heading p{font-size:17px}.cards{gap:10px}.card{min-height:96px;padding:14px 12px;gap:10px;border-radius:15px}.card-icon{width:42px;height:42px;border-radius:12px}.card-icon svg{width:25px;height:25px}.label{font-size:14px}.value{font-size:24px}.section-title h2{font-size:27px}th,td{padding:11px 9px;font-size:14px}.utility-mark{width:27px;margin-right:7px}.note{font-size:15px}}
      @media print{body{padding:0;background:#fcf9f4!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print{display:none}.sheet{max-width:none}.cards{gap:12px;margin-bottom:32px}.card{min-height:96px;padding:15px 18px;break-inside:avoid}.section-title{break-after:avoid}.table-wrap{break-inside:avoid}.note{break-inside:avoid}}
      </style></head><body><main class="sheet"><header class="heading"><span class="brand-icon">${icons.home}</span><span class="divider"></span><div><h1>My Monthly Hisab</h1><p>${escapeHtml(month)} · ${escapeHtml(reportMember.name)}</p></div></header>${popupBlocked ? '<button class="print" onclick="window.history.back()">Back to app</button>' : ''}<button class="print" onclick="window.print()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v3h14v-3"/></svg>Save as PDF / Print</button><section class="cards"><article class="card"><span class="card-icon">${icons.home}</span><div><div class="label">Total rent</div><div class="value">${money(ownTotalRent)}</div></div></article><article class="card"><span class="card-icon">${icons.meal}</span><div><div class="label">Individual meal cost</div><div class="value">${money(mealCost)}</div></div></article><article class="card"><span class="card-icon">${icons.paid}</span><div><div class="label">Paid</div><div class="value">${money(ownPayments)}</div></div></article><article class="card"><span class="card-icon">${icons.due}</span><div><div class="label">Current month due</div><div class="value">${money(currentDue)}</div></div></article><article class="card"><span class="card-icon">${icons.due}</span><div><div class="label">Previous months due</div><div class="value">${money(pastDue)}</div></div></article><article class="card"><span class="card-icon">${icons.total}</span><div><div class="label">Total due</div><div class="value">${money(totalDue)}</div></div></article></section><section><div class="section-title"><h2>Utilities breakdown</h2></div><div class="table-wrap"><table><thead><tr><th>Utility</th><th>Total</th><th>Your share</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No utilities</td></tr>'}</tbody></table></div></section><aside class="note"><span class="note-icon">i</span><span>Individual meal cost = total bazar divided by ${bazarMemberCount} meal members.</span></aside></main><script>window.onafterprint=()=>${popupBlocked ? "window.history.back()" : "window.close()"};</script></body></html>`);
    reportDocument.close();
    if (popupBlocked) {
      const reportBlob = new Blob(
        [`<!doctype html>${reportDocument.documentElement.outerHTML}`],
        { type: "text/html" },
      );
      window.location.assign(URL.createObjectURL(reportBlob));
    }
  }
  async function saveMealMemberCount() {
    if (!supabaseConfigured) { setMealMemberMessage("Connect Supabase to save this setting."); return; }
    setMealMemberSaving(true); setMealMemberMessage("");
    try {
      const { error } = await supabase.from("app_settings").upsert(
        { key: `meal_active_members_${month}`, value: JSON.stringify(mealActiveIds), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      if (error) throw error;
      setMealMemberMessage(`Saved. ${mealActiveIds.length} active meal members; meal cost updated.`);
    } catch (error) {
      setMealMemberMessage(error.message || "Could not save active meal members.");
    } finally { setMealMemberSaving(false); }
  }
  const utilitySaveTimerRef = useRef(null);
  async function persistUtilityPaidStatus(nextStatus, previousStatus, utilityName) {
    setUtilityPaidSaving(true);
    try {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: `utility_paid_status_${month}`,
          value: JSON.stringify(nextStatus),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
    } catch (error) {
      setUtilityPaidStatus(previousStatus);
      alert(`Could not save payment status for ${utilityName}: ${error.message}`);
    } finally {
      setUtilityPaidSaving(false);
    }
  }
  async function saveUtilityPaidStatus(utilityName, valueOrBool, immediate = true) {
    if (!admin) return;
    const previousStatus = utilityPaidStatus;
    const nextStatus = { ...previousStatus, [utilityName]: valueOrBool };
    setUtilityPaidStatus(nextStatus);
    if (utilitySaveTimerRef.current) window.clearTimeout(utilitySaveTimerRef.current);
    if (immediate) {
      await persistUtilityPaidStatus(nextStatus, previousStatus, utilityName);
    } else {
      utilitySaveTimerRef.current = window.setTimeout(() => {
        void persistUtilityPaidStatus(nextStatus, previousStatus, utilityName);
      }, 450);
    }
  }

  async function loadCloudData(profileId, label = month) {
    if (!supabaseConfigured) return;
    setCloudBusy(true);
    try {
      const [
        { data: profiles, error: pe },
        monthRow,
        { data: mealSetting, error: mealSettingError },
        { data: utilityCountSetting, error: utilityCountError },
        { data: sharedUtilitySetting, error: sharedUtilityError },
        { data: monthUtilitySetting, error: monthUtilityError },
        { data: bazarNeededSetting, error: bazarNeededError },
        { data: commonBazarSetting, error: commonBazarError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,username,role,active,rent,photo_url,last_login_at")
          .order("full_name"),
        ensureCloudMonth(label),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", `meal_active_members_${label}`)
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "utilities_current_users")
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "shared_utilities_list")
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", `shared_utilities_list_${label}`)
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "bazar_needed_items")
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "bazar_common_items")
          .maybeSingle(),
      ]);
      if (pe) throw pe;
      if (mealSettingError) throw mealSettingError;
      if (utilityCountError) throw utilityCountError;
      if (sharedUtilityError) throw sharedUtilityError;
      if (monthUtilityError) throw monthUtilityError;
      if (bazarNeededError) throw bazarNeededError;
      if (!commonBazarError && commonBazarSetting?.value) {
        try {
          const parsedCommon = JSON.parse(commonBazarSetting.value);
          if (Array.isArray(parsedCommon) && parsedCommon.length > 0) {
            const normalizedCommon = parsedCommon
              .filter((item) => item && typeof item === "object" && String(item.name || "").trim())
              .map((item, idx) => ({
                id: String(item.id || `custom_${idx}`),
                name: String(item.name).trim(),
                emoji: String(item.emoji || "🛒").trim() || "🛒",
                iconUrl: item.iconUrl ? String(item.iconUrl).trim() : "",
                iconType: item.iconType ? String(item.iconType) : undefined,
                defaultUnit: String(item.defaultUnit || "kg"),
                hint: item.hint ? String(item.hint) : `${String(item.name).trim()} এর দাম ও পরিমান লিখুন`,
                isCustom: Boolean(item.isCustom),
              }));
            if (normalizedCommon.length > 0) {
              setCommonBazarItems(normalizedCommon);
            }
          }
        } catch (err) {
          console.warn("Could not parse bazar_common_items:", err?.message);
        }
      }
      const activeProfile = (profiles || []).find(
        (p) => p.id === profileId && p.active,
      );
      if (!activeProfile)
        throw new Error("Your profile is inactive or unavailable.");
      // Restore the signed-in member's persisted photo whenever cloud profile data loads.
      setProfilePhoto(activeProfile.photo_url || "");
      if (!monthRow) throw new Error("Could not load monthly setup.");
      let savedMealIds = [];
      try { savedMealIds = JSON.parse(mealSetting?.value || "[]"); } catch { savedMealIds = []; }
      if (Array.isArray(savedMealIds)) setMealActiveIds(savedMealIds);
      const savedUtilityCount = Number(utilityCountSetting?.value || 4);
      if (Number.isFinite(savedUtilityCount) && savedUtilityCount > 0) { setUtilityMemberCount(savedUtilityCount); setUtilityMemberCountInput(String(savedUtilityCount)); }
      let savedBazarNeededItems = [];
      try {
        const parsedNeededItems = JSON.parse(bazarNeededSetting?.value || "[]");
        if (Array.isArray(parsedNeededItems)) {
          savedBazarNeededItems = parsedNeededItems
            .map((item, index) => {
              if (typeof item === "string") {
                return {
                  id: `legacy-${index}`,
                  name: item.trim(),
                  quantity: 0,
                  unit: "",
                  estimatedPrice: 0,
                  done: false,
                };
              }
              if (!item || typeof item !== "object") return null;
              return {
                id: String(item.id || `legacy-${index}`),
                name: String(item.name || item.item || "").trim(),
                quantity: Math.max(0, Number(item.quantity ?? item.qty) || 0),
                unit: String(item.unit || "").trim(),
                estimatedPrice: Math.max(0, Number(item.estimatedPrice ?? item.price) || 0),
                done: Boolean(item.done),
                addedBy: item.addedBy ? String(item.addedBy) : "",
                boughtBy: item.boughtBy ? String(item.boughtBy) : "",
                boughtByName: item.boughtByName ? String(item.boughtByName) : "",
                boughtPrice: Number.isFinite(Number(item.boughtPrice)) ? Number(item.boughtPrice) : 0,
                createdAt: item.createdAt ? String(item.createdAt) : "",
                completedAt: item.completedAt ? String(item.completedAt) : "",
              };
            })
            .filter((item) => item?.name);
        }
      } catch (error) {
        console.warn("Could not read the shared need-to-buy list:", error?.message);
      }
      setBazarNeededItems(savedBazarNeededItems);
      setShowBazarNeededLoginPopup(
        activeProfile.role === "member" && savedBazarNeededItems.length > 0,
      );
      const [catsRes, payRes, bazRes, cashRes, settlementRes, utilityPaidResult, lastLoginResult] = await Promise.all([
        supabase
          .from("expense_categories")
          .select("*")
          .eq("month_id", monthRow.id),
        supabase
          .from("rent_payments")
          .select("*")
          .eq("month_id", monthRow.id)
          .order("paid_at", { ascending: false }),
        supabase
          .from("bazar_entries")
          .select("*")
          .eq("month_id", monthRow.id)
          .order("entry_date", { ascending: false }),
        supabase
          .from("cash_contributions")
          .select("*")
          .eq("month_id", monthRow.id)
          .order("entry_date", { ascending: false }),
        supabase
          .from("member_settlements")
          .select("*")
          .eq("month_id", monthRow.id)
          .order("settlement_date", { ascending: false }),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", `utility_paid_status_${label}`)
          .maybeSingle(),
        activeProfile.role === "admin"
          ? supabase.from("profiles").select("id,last_login_at")
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const r of [catsRes, payRes, bazRes, cashRes, utilityPaidResult])
        if (r.error) throw r.error;
      if (settlementRes.error) {
        const migrationHint = isMissingSettlementTableError(settlementRes.error)
          ? "Run supabase/migrations/20261105_member_settlements.sql in Supabase."
          : settlementRes.error.message;
        setSettlementLoadError(migrationHint);
        console.warn("Meal settlement data is unavailable:", settlementRes.error.message);
      } else {
        setSettlementLoadError("");
      }
      if (lastLoginResult.error) {
        console.warn(
          "Last-login tracking is unavailable. Run supabase/migrations/20261102_member_last_login.sql:",
          lastLoginResult.error.message,
        );
      }
      const lastLoginById = new Map(
        (lastLoginResult.data || []).map((profile) => [
          profile.id,
          profile.last_login_at,
        ]),
      );
      let savedUtilityPaidStatus = {};
      try {
        const parsedUtilityStatus = JSON.parse(utilityPaidResult.data?.value || "{}");
        if (parsedUtilityStatus && typeof parsedUtilityStatus === "object" && !Array.isArray(parsedUtilityStatus)) {
          savedUtilityPaidStatus = parsedUtilityStatus;
        }
      } catch (error) {
        console.warn(`Could not read saved utility payment status for ${label}:`, error?.message);
      }
      setUtilityPaidStatus(savedUtilityPaidStatus);
      const users = (profiles || []).map((p) => ({
        id: p.id,
        name: p.full_name,
        username: p.username,
        role: p.role,
        active: p.active,
        rent: Number(p.rent || 0),
        photo_url: p.photo_url || "",
        lastLoginAt: p.last_login_at || lastLoginById.get(p.id) || null,
        paid: 0,
      }));
      let sharedUtilities = null;
      try { sharedUtilities = JSON.parse(monthUtilitySetting?.value || sharedUtilitySetting?.value || "null"); } catch { sharedUtilities = null; }
      if (!Array.isArray(sharedUtilities)) {
        sharedUtilities = (catsRes.data || [])
          .filter((c) => String(c.name || "").toLowerCase() !== "bazar")
          .map((c) => ({ name: c.name, amount: Number(c.amount || 0), shared: !!c.shared }));
        if (activeProfile.role === "admin" && sharedUtilities.length) {
          const { error: seedUtilityError } = await supabase.from("app_settings").upsert(
            { key: "shared_utilities_list", value: JSON.stringify(sharedUtilities), updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
          if (seedUtilityError) throw seedUtilityError;
        }
      }
      const categories = (sharedUtilities || []).map((c, index) => ({
        id: `shared-utility-${index}`,
        name: String(c.name || ""),
        amount: Number(c.amount || 0),
        shared: !!c.shared,
      }));
      const loadedFlatRent = categories.find((category) =>
        isFlatRentName(category.name),
      );
      setFlatRentInput(
        loadedFlatRent ? String(Number(loadedFlatRent.amount || 0)) : "",
      );
      const payments = (payRes.data || []).map((x) => ({
        id: x.id,
        userId: x.user_id,
        amount: Number(x.amount),
        note: x.note,
        type:
          x.payment_type ||
          (String(x.note || "").toLowerCase().includes("rent")
            ? "rent"
            : "meal"),
        date: x.paid_at,
        month: label,
      }));
      const bazars = (bazRes.data || []).map((x) => ({
        id: x.id,
        date: x.entry_date,
        amount: Number(x.amount),
        paidBy: x.paid_by,
        paidFromCash: Boolean(x.paid_from_cash),
        createdBy: x.created_by,
        items: (() => {
          const raw = x.items;
          if (Array.isArray(raw)) return raw;
          const text = String(raw || "");
          try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parsed; } catch {}
          return text.split(/[,\\n]/).map((v) => v.trim()).filter(Boolean);
        })(),
        month: label,
      }));
      const contributions = (cashRes.data || []).map((x) => ({
        id: x.id,
        date: x.entry_date,
        amount: Number(x.amount),
        paidBy: x.paid_by,
        note: x.note,
        month: label,
        createdBy: x.created_by,
      }));
      const settlements = (settlementRes.error ? [] : settlementRes.data || []).map(
        (x) => ({
          id: x.id,
          date: x.settlement_date,
          amount: Number(x.amount),
          fromUserId: x.from_user_id,
          toUserId: x.to_user_id,
          sourceType: x.source_type || "direct",
          status: x.status || "pending",
          paidAmount: roundMoney(
            x.paid_amount ?? (x.status === "completed" ? x.amount : 0),
          ),
          confirmedBy: x.confirmed_by || null,
          confirmedAt: x.confirmed_at || null,
          note: x.note || "Meal balance settlement",
          month: label,
          createdBy: x.created_by,
        }),
      );
      setDb((d) => ({
        ...d,
        month: label,
        currentCount: Number(monthRow.current_count || 0),
        currentMembers: monthRow.current_members || [],
        users,
        categories,
        payments,
        bazars,
        contributions,
        settlements,
        expenses: [],
      }));
      setPaymentForm((f) => ({
        ...f,
        userId: users.some((u) => u.id === f.userId && u.active)
          ? f.userId
          : users.find((u) => u.active && u.role === "member")?.id || profileId,
      }));
      // Use the freshly fetched profile role; `admin` can be stale during first login.
      const isAdminProfile = activeProfile.role === "admin";
      const firstActiveMemberId =
        users.find((u) => u.active && u.role === "member")?.id || "";
      setBazarForm((f) => ({
        ...f,
        paidBy: isAdminProfile
          ? users.some((u) => u.id === f.paidBy && u.active)
            ? f.paidBy
            : profileId
          : profileId,
      }));
      setCashForm((f) => ({
        ...f,
        paidBy: users.some((u) => u.id === f.paidBy && u.active)
          ? f.paidBy
          : isAdminProfile
            ? firstActiveMemberId || profileId
            : profileId,
      }));
      setSettlementForm((form) => ({
        ...form,
        fromUserId: users.some((u) => u.id === form.fromUserId && u.active)
          ? form.fromUserId
          : firstActiveMemberId || profileId,
        toUserId: users.some((u) => u.id === form.toUserId && u.active)
          ? form.toUserId
          : users.find(
              (u) =>
                u.active &&
                u.id !== (firstActiveMemberId || profileId),
            )?.id || profileId,
      }));
      setMonth(label);
      setCount(Number(monthRow.current_count || 0));
      setSelected(monthRow.current_members || []);
      setCloudMonthId(monthRow.id);
      return activeProfile;
    } catch (err) {
      setError(err.message || "Could not load shared data from Supabase.");
      throw err;
    } finally {
      setCloudBusy(false);
    }
  }
  async function monthIdFor(label = month) {
    const row = await ensureCloudMonth(label);
    if (!row) throw new Error("Month not found");
    if (label === month) setCloudMonthId(row.id);
    return row.id;
  }
  async function signIn(e) {
    e.preventDefault();
    setError("");
    setAuthMessage("");
    if (!supabaseConfigured) {
      setError(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the app.",
      );
      return;
    }
    setAuthBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "username-login",
        { body: { username: login.username.trim(), password: login.password } },
      );
      if (fnError || !data?.access_token || !data?.refresh_token) {
        let message = data?.error;
        if (!message && fnError) {
          try { message = (await fnError.context?.json?.())?.error; } catch {}
          if (!message && /invalid|credentials|password|401/i.test(fnError.message || ""))
            message = "Invalid username or password.";
        }
        throw new Error(message || "Unable to sign in. Please try again.");
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;
      const profile = await loadCloudData(data.user.id, month);
      if (!profile)
        throw new Error("Could not load your profile. Contact the admin.");
      const mapped = {
        id: profile.id,
        name: profile.full_name,
        username: profile.username,
        role: profile.role,
        active: profile.active,
        rent: Number(profile.rent || 0),
        paid: 0,
      };
      setError("");
      setSession({ id: data.user.id });
      setPage(mapped.role === "member" ? "my-account" : "overview");
      // Non-critical extras should not keep the login button in its loading state.
      // The app is already routed to the user's page; load these in the background.
      void loadNotices(true, mapped.id).catch((err) =>
        console.warn("Notices are not configured yet:", err?.message),
      );
      void loadPaymentOptions().catch((err) =>
        console.warn("Payment options could not be loaded:", err?.message),
      );
    } catch (err) {
      setError(
        err.message || "Unable to sign in. Check your username and password.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  async function requestPasswordReset(e) {
    e.preventDefault();
    setError("");
    setAuthMessage("");
    if (!supabaseConfigured) {
      setError("Supabase is not configured. Add your .env settings first.");
      return;
    }
    if (!login.username.trim()) {
      setError("Enter your username first.");
      return;
    }
    setAuthBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "username-password-reset",
        { body: { username: login.username.trim() } },
      );
      if (fnError || data?.error)
        throw new Error(
          data?.error ||
            fnError?.message ||
            "Could not request password reset.",
        );
      setAuthMessage(
        "If this username has a recovery email, a password reset link will be sent to it. Check your inbox and spam folder.",
      );
    } catch (err) {
      setError(err.message || "Could not request password reset.");
    } finally {
      setAuthBusy(false);
    }
  }
  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setPage("overview");
    setCloudMonthId(null);
  }
  async function saveMonth() {
    if (!admin) return;
    try {
      const row = await ensureCloudMonth(month);
      const { error } = await supabase
        .from("months")
        .update({
          current_count: selected.length,
          current_members: selected,
          is_current: true,
        })
        .eq("id", row.id);
      if (error) throw error;
      await loadCloudData(user.id, month);
      alert("Monthly member setup saved.");
    } catch (e) {
      alert("Could not save monthly setup: " + e.message);
    }
  }
  async function saveUtilityMemberCount(e) {
    e.preventDefault();
    const count = Number(utilityMemberCountInput);
    if (!admin || !Number.isInteger(count) || count < 1) { setUtilityMemberCountMessage("Enter a whole number greater than 0."); return; }
    setUtilityMemberCountSaving(true); setUtilityMemberCountMessage("");
    try {
      const { error } = await supabase.from("app_settings").upsert({ key: "utilities_current_users", value: String(count), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      setUtilityMemberCount(count); setUtilityMemberCountInput(String(count)); setUtilityMemberCountMessage("Saved. Utilities share updated for all months.");
    } catch (error) { setUtilityMemberCountMessage(error.message || "Could not save current user count."); }
    finally { setUtilityMemberCountSaving(false); }
  }

  useEffect(() => {
    setEditingUtilityName("");
    setUtilityEditModal(null);
    setExpenseForm({ name: "", amount: "", shared: true });
    setFlatRentMessage("");
  }, [month]);

  async function getUtilitiesForMonth() {
    const { data: monthSetting, error: monthError } = await supabase.from("app_settings").select("value").eq("key", `shared_utilities_list_${month}`).maybeSingle();
    if (monthError) throw monthError;
    if (monthSetting?.value) {
      try { const parsed = JSON.parse(monthSetting.value); if (Array.isArray(parsed)) return parsed; } catch {}
    }
    const { data: baseSetting, error: baseError } = await supabase.from("app_settings").select("value").eq("key", "shared_utilities_list").maybeSingle();
    if (baseError) throw baseError;
    try { const parsed = JSON.parse(baseSetting?.value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }

  async function saveFlatRent(e) {
    e.preventDefault();
    const amount = Number(flatRentInput);
    if (!admin || !Number.isFinite(amount) || amount < 0) {
      setFlatRentMessage("Enter a valid flat rent amount.");
      return;
    }
    setFlatRentSaving(true);
    setFlatRentMessage("");
    try {
      const utilities = [...(await getUtilitiesForMonth())].map((item) => ({
        ...item,
      }));
      const flatRent = {
        name: FLAT_RENT_NAME,
        amount,
        shared: false,
      };
      const existingIndex = utilities.findIndex((item) =>
        isFlatRentName(item.name),
      );
      if (existingIndex >= 0) utilities[existingIndex] = flatRent;
      else utilities.unshift(flatRent);
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: `shared_utilities_list_${month}`,
          value: JSON.stringify(utilities),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
      await loadCloudData(user.id, month);
      setFlatRentMessage("Flat rent saved. It is not divided among members.");
    } catch (error) {
      setFlatRentMessage(error.message || "Could not save flat rent.");
    } finally {
      setFlatRentSaving(false);
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!admin || !expenseForm.name || Number(expenseForm.amount) < 0) return;
    if (isFlatRentName(expenseForm.name)) {
      alert("Use the separate Flat rent section to update flat rent.");
      return;
    }
    try {
      const utilities = [...(await getUtilitiesForMonth())];
      const utility = { name: expenseForm.name.trim(), amount: Number(expenseForm.amount), shared: !!expenseForm.shared };
      const existingIndex = utilities.findIndex((item) => String(item.name || "").toLowerCase() === String(utility.name).toLowerCase());
      if (existingIndex >= 0) utilities[existingIndex] = utility; else utilities.push(utility);
      const { error } = await supabase.from("app_settings").upsert(
        { key: `shared_utilities_list_${month}`, value: JSON.stringify(utilities), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      if (error) throw error;
      await loadCloudData(user.id, month);
      setExpenseForm({ name: "", amount: "", shared: true });
      setEditingUtilityName("");
      setShowAddUtility(false);
      setBazarSuccessToast("Utility saved successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert("Could not save expense: " + e.message);
    }
  }
  async function saveUtilityEdit() {
    if (!admin || !utilityEditModal?.name || Number(utilityEditModal.amount) < 0) return;
    try {
      const utilities = [...(await getUtilitiesForMonth())].map((item) => ({ ...item }));
      const index = utilities.findIndex((item) => String(item.name || "").toLowerCase() === String(utilityEditModal.originalName || utilityEditModal.name).toLowerCase());
      if (index < 0) throw new Error("Utility was not found in this month.");
      utilities[index] = { ...utilities[index], name: utilityEditModal.name.trim(), amount: Number(utilityEditModal.amount), shared: !!utilityEditModal.shared };
      const { error } = await supabase.from("app_settings").upsert(
        { key: `shared_utilities_list_${month}`, value: JSON.stringify(utilities), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      if (error) throw error;
      setUtilityEditModal(null);
      await loadCloudData(user.id, month);
      setBazarSuccessToast("Utility updated successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) { alert("Could not save utility: " + e.message); }
  }

  async function addPayment(e) {
    e.preventDefault();
    if (
      !admin ||
      !/^\d{4}-\d{2}-\d{2}$/.test(paymentForm.date) ||
      !Number.isFinite(Number(paymentForm.amount)) ||
      Number(paymentForm.amount) <= 0
    ) {
      alert("Enter a valid payment date and amount.");
      return;
    }
    try {
      const wasEditing = Boolean(paymentForm.id);
      const selectedMonth = paymentForm.month || month;
      const mid = await monthIdFor(selectedMonth);
      const payment = {
        month_id: mid,
        user_id: paymentForm.userId,
        amount: Number(paymentForm.amount),
        payment_type: "rent",
        note: paymentForm.note,
        paid_at: paymentForm.date,
      };
      const { error } = paymentForm.id
        ? await supabase
            .from("rent_payments")
            .update(payment)
            .eq("id", paymentForm.id)
        : await supabase
            .from("rent_payments")
            .insert({ ...payment, created_by: user.id });
      if (error) throw error;
      void loadNotices(false, user.id).catch((notificationError) =>
        console.warn("Could not refresh payment notifications:", notificationError?.message),
      );
      await loadCloudData(user.id, month);
      setPaymentForm((form) => ({ ...form, id: null, amount: "" }));
      setShowAddPayment(false);
      setBazarSuccessToast(
        wasEditing ? "Payment updated successfully" : "Payment saved successfully",
      );
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert(`Could not ${paymentForm.id ? "update" : "save"} payment: ${e.message}`);
    }
  }
  function editPayment(p) {
    if (!admin) return;
    setPaymentForm({
      id: p.id,
      userId: p.userId,
      month: p.month || month,
      date: p.date || todayForDateInput(),
      amount: String(p.amount),
      note: p.note || "",
    });
    setShowAddPayment(true);
  }
  function askConfirm(message, title = "Are you sure?", variant = "") {
    return new Promise((resolve) => setConfirmDialog({ message, title, variant, resolve }));
  }
  function openCommonItemsModal() {
    if (!admin) return;
    setCommonItemForm({
      editingId: "",
      name: "",
      emoji: "🛒",
      iconUrl: "",
      defaultUnit: "kg",
    });
    setCommonItemsModalOpen(true);
  }
  async function handleCommonItemIconUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !admin) return;
    setCommonIconUploading(true);
    try {
      let uploadedUrl = "";
      if (supabaseConfigured) {
        try {
          const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
          const path = `common-item-icons/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("profile-photos")
            .upload(path, file, { upsert: true });
          if (!uploadError) {
            const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
            if (data?.publicUrl) {
              uploadedUrl = `${data.publicUrl}?t=${Date.now()}`;
            }
          }
        } catch {
          // Fall back to compact data URL below if storage bucket rejects upload.
        }
      }
      if (!uploadedUrl) {
        uploadedUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Could not read icon file."));
          reader.onload = () => {
            const rawDataUrl = String(reader.result || "");
            if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
              resolve(rawDataUrl);
              return;
            }
            const img = new Image();
            img.onload = () => {
              const size = 96;
              const canvas = document.createElement("canvas");
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(rawDataUrl);
                return;
              }
              const scale = Math.min(size / img.width, size / img.height);
              const w = img.width * scale;
              const h = img.height * scale;
              ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
              resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve(rawDataUrl);
            img.src = rawDataUrl;
          };
          reader.readAsDataURL(file);
        });
      }
      if (uploadedUrl) {
        setCommonItemForm((prev) => ({ ...prev, iconUrl: uploadedUrl }));
      }
    } catch (err) {
      alert(err?.message || "Could not upload icon.");
    } finally {
      setCommonIconUploading(false);
    }
  }
  async function saveCommonBazarItems(nextItems, successMessage = "") {
    if (!admin || commonItemsBusy) return false;
    const previousItems = commonBazarItems;
    setCommonBazarItems(nextItems);
    if (!supabaseConfigured) {
      if (successMessage) {
        setBazarSuccessToast(successMessage);
        window.setTimeout(() => setBazarSuccessToast(""), 2400);
      }
      return true;
    }
    setCommonItemsBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: "bazar_common_items",
          value: JSON.stringify(nextItems),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
      if (successMessage) {
        setBazarSuccessToast(successMessage);
        window.setTimeout(() => setBazarSuccessToast(""), 2400);
      }
      return true;
    } catch (error) {
      setCommonBazarItems(previousItems);
      alert(`Could not update common items: ${error.message}`);
      return false;
    } finally {
      setCommonItemsBusy(false);
    }
  }
  async function submitCommonItemForm(event) {
    if (event) event.preventDefault();
    if (!admin || commonItemsBusy) return;
    const trimmedName = commonItemForm.name.trim();
    const trimmedEmoji = commonItemForm.emoji.trim() || "🛒";
    const trimmedIconUrl = String(commonItemForm.iconUrl || "").trim();
    if (!trimmedName) return;
    if (commonItemForm.editingId) {
      const nextItems = commonBazarItems.map((item) =>
        item.id === commonItemForm.editingId
          ? {
              ...item,
              name: trimmedName,
              emoji: trimmedEmoji,
              iconUrl: trimmedIconUrl,
              iconType: trimmedIconUrl ? undefined : item.iconType,
              defaultUnit: commonItemForm.defaultUnit || item.defaultUnit || "kg",
              hint: `${trimmedName} এর দাম ও পরিমান লিখুন`,
            }
          : item,
      );
      const ok = await saveCommonBazarItems(nextItems, `Updated "${trimmedName}"`);
      if (ok) {
        setCommonItemForm({ editingId: "", name: "", emoji: "🛒", iconUrl: "", defaultUnit: "kg" });
      }
      return;
    }
    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const newId = `${slug || "item"}_${Date.now().toString(36)}`;
    const newItem = {
      id: newId,
      name: trimmedName,
      emoji: trimmedEmoji,
      iconUrl: trimmedIconUrl,
      defaultUnit: commonItemForm.defaultUnit || "kg",
      hint: `${trimmedName} এর দাম ও পরিমান লিখুন`,
    };
    const othersIdx = commonBazarItems.findIndex((item) => item.isCustom);
    const nextItems =
      othersIdx >= 0
        ? [
            ...commonBazarItems.slice(0, othersIdx),
            newItem,
            ...commonBazarItems.slice(othersIdx),
          ]
        : [...commonBazarItems, newItem];
    const ok = await saveCommonBazarItems(nextItems, `Added "${trimmedName}"`);
    if (ok) {
      setCommonItemForm({ editingId: "", name: "", emoji: "🛒", iconUrl: "", defaultUnit: "kg" });
    }
  }
  function editCommonItemRow(item) {
    if (!admin) return;
    setCommonItemForm({
      editingId: item.id,
      name: item.name,
      emoji: item.iconType === "oil" ? "🫗" : item.emoji || "🛒",
      iconUrl: item.iconUrl || "",
      defaultUnit: item.defaultUnit || "kg",
    });
  }
  async function deleteCommonItemRow(item) {
    if (!admin || commonItemsBusy) return;
    if (commonBazarItems.length <= 1) {
      alert("At least one common item must remain.");
      return;
    }
    const confirmed = await askConfirm(
      `Remove "${item.name}" from Common Items?`,
      "Delete common item?",
      "danger",
    );
    if (!confirmed) return;
    const nextItems = commonBazarItems.filter((entry) => entry.id !== item.id);
    if (bazarItemPicker.itemId === item.id && nextItems[0]) {
      setBazarItemPicker((prev) => ({
        ...prev,
        itemId: nextItems[0].id,
        unit: nextItems[0].defaultUnit,
      }));
    }
    if (bazarEditPicker.itemId === item.id && nextItems[0]) {
      setBazarEditPicker((prev) => ({
        ...prev,
        itemId: nextItems[0].id,
        unit: nextItems[0].defaultUnit,
      }));
    }
    if (commonItemForm.editingId === item.id) {
      setCommonItemForm({ editingId: "", name: "", emoji: "🛒", defaultUnit: "kg" });
    }
    await saveCommonBazarItems(nextItems, `Deleted "${item.name}"`);
  }
  async function resetCommonBazarItems() {
    if (!admin || commonItemsBusy) return;
    const confirmed = await askConfirm(
      "Restore the default Common Items list (names and icons)?",
      "Reset common items?",
      "",
    );
    if (!confirmed) return;
    await saveCommonBazarItems(BAZAR_COMMON_ITEMS, "Restored default common items");
    setCommonItemForm({ editingId: "", name: "", emoji: "🛒", defaultUnit: "kg" });
  }
  async function saveBazarNeededItems(nextItems, successMessage = "") {
    if (!supabaseConfigured || bazarNeededBusy) return false;
    const previousItems = bazarNeededItems;
    setBazarNeededItems(nextItems);
    setBazarNeededBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: "bazar_needed_items",
          value: JSON.stringify(nextItems),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
      if (successMessage) {
        setBazarSuccessToast(successMessage);
        window.setTimeout(() => setBazarSuccessToast(""), 2600);
      }
      return true;
    } catch (error) {
      setBazarNeededItems(previousItems);
      alert(`Could not update the need-to-buy list: ${error.message}`);
      return false;
    } finally {
      setBazarNeededBusy(false);
    }
  }
  async function addBazarNeededItem(event) {
    if (event) event.preventDefault();
    if (bazarNeededBusy) return;
    if (!chosenBazarNeededPreset) {
      setBazarNeededPickerError("Select an item from the suggestions.");
      setBazarNeededSuggestionOpen(true);
      return;
    }
    const name = resolveBazarPickerBaseName(chosenBazarNeededPreset, bazarNeededPicker);
    const quantity = Math.max(0, Number(bazarNeededPicker.qty) || 0);
    const estimatedPrice = 0;
    const unit = bazarNeededPicker.unit || chosenBazarNeededPreset.defaultUnit || "kg";
    if (!name) {
      setBazarNeededPickerError("Please enter an item name.");
      return;
    }
    if (quantity <= 0) {
      setBazarNeededPickerError("Enter the item quantity.");
      return;
    }
    setBazarNeededPickerError("");
    const existing = bazarNeededItems.find(
      (item) => item.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing && !existing.done) {
      alert(`${name} is already in the need-to-buy list.`);
      return;
    }
    const nextItems = existing
      ? bazarNeededItems.map((item) => item.id === existing.id
        ? {
            ...item,
            quantity,
            unit,
            estimatedPrice,
            done: false,
            boughtBy: "",
            boughtByName: "",
            boughtPrice: 0,
            completedAt: "",
          }
        : item)
      : [
          {
            id: globalThis.crypto?.randomUUID?.() || `need-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            quantity,
            unit,
            estimatedPrice,
            done: false,
            addedBy: user.id,
            boughtBy: "",
            boughtByName: "",
            boughtPrice: 0,
            createdAt: new Date().toISOString(),
            completedAt: "",
          },
          ...bazarNeededItems,
        ];
    if (await saveBazarNeededItems(nextItems)) {
      setBazarNeededDraft("");
      setBazarNeededPicker({ itemId: "", customName: "", unitPrice: "", qty: "", unit: "kg" });
      setBazarNeededItemSearch("");
      setBazarNeededSuggestionOpen(false);
    }
  }
  function toggleBazarNeededPanel() {
    const nextOpen = !showBazarNeeded;
    setShowBazarNeeded(nextOpen);
  }
  async function toggleBazarNeededItem(itemId) {
    const nextItems = bazarNeededItems.map((item) => item.id === itemId
      ? {
          ...item,
          done: !item.done,
          boughtBy: item.done ? "" : (user?.id || ""),
          boughtByName: item.done ? "" : (user?.name || ""),
          boughtPrice: 0,
          completedAt: item.done ? "" : new Date().toISOString(),
        }
      : item);
    await saveBazarNeededItems(nextItems);
  }
  async function removeBazarNeededItem(itemId) {
    const item = bazarNeededItems.find((candidate) => candidate.id === itemId);
    if (
      !item ||
      !(await askConfirm(
        `Remove “${item.name}” from the need-to-buy list?`,
        "Remove item?",
        "bazar-needed-item",
      ))
    ) return;
    await saveBazarNeededItems(
      bazarNeededItems.filter((candidate) => candidate.id !== itemId),
      `Removed "${item.name}" from need-to-buy list`,
    );
  }
  async function clearAllBazarNeededItems() {
    if (!bazarNeededItems.length || bazarNeededBusy) return;
    if (
      !(await askConfirm(
        `Delete all ${bazarNeededItems.length} items from the need-to-buy list? This cannot be undone.`,
        "Delete all items?",
        "bazar-needed-delete-all",
      ))
    ) return;
    await saveBazarNeededItems([], "All items deleted from need-to-buy list");
  }
  async function deletePayment(p) {
    if (!admin) return;
    if (
      !(await askConfirm(`Delete ${db.users.find((u) => u.id === p.userId)?.name || "member"}’s payment of ${money(p.amount)}? This cannot be undone.`, "Delete payment?"))
    )
      return;
    try {
      const { error } = await supabase
        .from("rent_payments")
        .delete()
        .eq("id", p.id);
      if (error) throw error;
      await loadCloudData(user.id, month);
      setBazarSuccessToast("Payment deleted successfully");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert("Could not delete payment: " + e.message);
    }
  }
  async function addBazar(e) {
    e.preventDefault();
    const validItems = bazarRows
      .filter((row) => row.item.trim() && Number(row.price) > 0)
      .map((row) => ({
        item: row.item.trim(),
        quantity: Math.max(0, Number(row.quantity) || 0),
        unit: String(row.unit || "").trim(),
        price: Number(row.price),
      }));
    const itemTotal = validItems.reduce((sum, row) => sum + row.price, 0);
    if (validItems.some((row) => row.quantity <= 0 || !row.unit)) {
      setBazarPickerError("Every tracked item needs a quantity and unit.");
      return;
    }
    if (itemTotal <= 0 || !validItems.length) {
      setBazarPickerError("Select an item, enter quantity and price, then press Add item.");
      return;
    }
    try {
      if (bazarForm.paidBy === "combine") {
        const cashAmount = roundMoney(Number(bazarForm.combinedCashAmount) || 0);
        const memberAmount = roundMoney(Number(bazarForm.combinedMemberAmount) || 0);
        const memberId = admin ? (bazarForm.combinedMemberId || user.id) : user.id;

        if (cashAmount <= 0) throw new Error("Cash in Hand amount must be greater than 0.");
        if (memberAmount <= 0) throw new Error("Member amount must be greater than 0.");
        if (Math.abs(roundMoney(cashAmount + memberAmount) - roundMoney(itemTotal)) > 0.05) {
          throw new Error(`Cash amount (${money(cashAmount)}) + Member amount (${money(memberAmount)}) must equal total bazar (${money(itemTotal)}).`);
        }
        const cashBalance = roundMoney(cashInHand - pendingCashSettlementTotal);
        if (cashAmount > cashBalance) {
          throw new Error(`Not enough cash in hand. Available balance: ${money(Math.max(0, cashBalance))}.`);
        }
        if (!memberId || !allActiveUsers.some((u) => u.id === memberId && u.active)) {
          throw new Error("Please select an active member in Member paying the balance.");
        }

        const mid = await monthIdFor();
        const combineId = `combine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const cashItems = splitBazarItems(validItems, cashAmount, itemTotal).map((it) => ({
          ...it,
          combine_id: combineId,
          combine_role: "cash",
          combine_cash_amount: cashAmount,
          combine_member_amount: memberAmount,
          combine_member_id: memberId,
          combine_full_items: validItems,
        }));
        const memberItems = splitBazarItems(validItems, memberAmount, itemTotal).map((it) => ({
          ...it,
          combine_id: combineId,
          combine_role: "member",
          combine_cash_amount: cashAmount,
          combine_member_amount: memberAmount,
          combine_member_id: memberId,
          combine_full_items: validItems,
        }));

        const { data: insertedCash, error: errorCash } = await supabase
          .from("bazar_entries")
          .insert({
            month_id: mid,
            entry_date: bazarForm.date,
            amount: cashAmount,
            paid_by: user.id,
            paid_from_cash: true,
            items: JSON.stringify(cashItems),
            created_by: user.id,
          })
          .select("id,month_id,entry_date,amount,paid_by,paid_from_cash,items,created_by")
          .single();
        if (errorCash) throw errorCash;

        const { data: insertedMember, error: errorMember } = await supabase
          .from("bazar_entries")
          .insert({
            month_id: mid,
            entry_date: bazarForm.date,
            amount: memberAmount,
            paid_by: memberId,
            paid_from_cash: false,
            items: JSON.stringify(memberItems),
            created_by: user.id,
          })
          .select("id,month_id,entry_date,amount,paid_by,paid_from_cash,items,created_by")
          .single();
        if (errorMember) throw errorMember;

        void loadNotices(false, user.id).catch((notificationError) =>
          console.warn("Could not refresh bazar notifications:", notificationError?.message),
        );
        await loadCloudData(user.id, month);
        setBazarRows([]);
        setBazarItemPicker({ itemId: "", customName: "", unitPrice: "", qty: "", unit: "kg" });
        setBazarItemSearch("");
        setBazarSuggestionOpen(false);
        setBazarPickerError("");
        setBazarForm((f) => ({
          ...f,
          amount: "",
          items: "",
          date: todayForDateInput(),
          paidBy: user.id,
          combinedCashAmount: "",
          combinedMemberAmount: "",
          combinedMemberId: user.id,
        }));
        setShowAddBazar(false);
        const memName = db.users.find((u) => u.id === memberId)?.name || "Member";
        setBazarSuccessToast(`Combined bazar saved (${money(cashAmount)} Cash + ${money(memberAmount)} ${memName})`);
        window.setTimeout(() => setBazarSuccessToast(""), 2800);
        return;
      }

      const paidFromCash = admin && bazarForm.paidBy === "cash-in-hand";
      const paidBy = paidFromCash ? user.id : admin ? bazarForm.paidBy : user.id;
      if (!paidBy || !allActiveUsers.some((u) => u.id === paidBy && u.active)) {
        throw new Error("Please select an active user in Paid by.");
      }
      if (paidFromCash) {
        const cashBalance = roundMoney(cashInHand - pendingCashSettlementTotal);
        if (Number(bazarForm.amount) > cashBalance) {
          throw new Error(`Not enough cash in hand. Available balance: ${money(Math.max(0, cashBalance))}.`);
        }
      }
      const mid = await monthIdFor();
      const { data: inserted, error } = await supabase
        .from("bazar_entries")
        .insert({
          month_id: mid,
          entry_date: bazarForm.date,
          amount: itemTotal,
          paid_by: paidBy,
          paid_from_cash: paidFromCash,
          items: JSON.stringify(validItems),
          created_by: user.id,
        })
        .select("id,month_id,entry_date,amount,paid_by,paid_from_cash,items,created_by")
        .single();
      if (error) throw error;
      if (!inserted || inserted.paid_by !== paidBy || Boolean(inserted.paid_from_cash) !== paidFromCash)
        throw new Error(
          "Saved entry could not be verified. Refresh and check the bazar history.",
        );
      void loadNotices(false, user.id).catch((notificationError) =>
        console.warn("Could not refresh bazar notifications:", notificationError?.message),
      );
      await loadCloudData(user.id, month);
      setBazarRows([]);
      setBazarItemPicker({ itemId: "", customName: "", unitPrice: "", qty: "", unit: "kg" });
      setBazarItemSearch("");
      setBazarSuggestionOpen(false);
      setBazarPickerError("");
      setBazarForm((f) => ({
        ...f,
        amount: "",
        items: "",
        date: todayForDateInput(),
        paidBy: f.paidBy || user.id,
        combinedCashAmount: "",
        combinedMemberAmount: "",
        combinedMemberId: user.id,
      }));
      setShowAddBazar(false);
      setBazarSuccessToast("Bazar saved successfully");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert("Could not save bazar entry: " + e.message);
    }
  }
  function editBazar(b) {
    if (!admin && b.createdBy !== user?.id) { alert("You can edit only entries you created."); return; }
    setBazarEditPicker({ itemId: "", customName: "", unitPrice: "", qty: "", unit: "kg" });
    setBazarEditItemSearch("");
    setBazarEditSuggestionOpen(false);
    setBazarEditPickerError("");
    let raw = b.items;
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch {} }
    let items = Array.isArray(raw) ? raw.map((row) => typeof row === "string"
      ? { item: row.trim(), quantity: 1, unit: "pcs", price: "" }
      : {
          item: String(row?.item || ""),
          quantity: Number(row?.quantity ?? row?.qty) > 0 ? row?.quantity ?? row?.qty : 1,
          unit: String(row?.unit || "pcs"),
          price: String(row?.price ?? ""),
        })
      : String(raw || "").split(",").map((item) => ({ item: item.trim(), quantity: 1, unit: "pcs", price: "" })).filter((row) => row.item);
    items = items.filter((row) => row.item || row.price);
    if (!items.length) items = [{ item: "", quantity: 1, unit: "pcs", price: "" }];

    if (b.isCombined) {
      setBazarEditEntry({
        ...b,
        id: b.cashEntry?.id || b.id,
        partnerId: b.memberEntry?.id,
        editDate: String(b.date || ""),
        editItems: items,
        editPaidBy: "combine",
        combinedCashAmount: String(b.cashAmount || ""),
        combinedMemberAmount: String(b.memberAmount || ""),
        combinedMemberId: b.memberId || user?.id,
      });
      return;
    }
    const isCashInHand = Boolean(b.paidFromCash) ||
      String(b.paidBy || "").toLowerCase() === "cash-in-hand" ||
      String(b.paidBy || "").toLowerCase() === "cash in hand";
    const editPaidBy = isCashInHand ? "cash-in-hand" : String(b.paidBy || b.paid_by || user?.id || "");
    const totalAmount = items.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
    const oldCash = isCashInHand ? Number(b.amount || 0) : 0;
    const availCash = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + oldCash));
    const defaultCash = isCashInHand ? Number(b.amount || 0) : Math.min(totalAmount, availCash);
    const defaultMember = Math.max(0, roundMoney(totalAmount - defaultCash));
    setBazarEditEntry({
      ...b,
      paidFromCash: isCashInHand,
      editDate: String(b.date || ""),
      editItems: items,
      editPaidBy,
      combinedCashAmount: String(defaultCash > 0 ? defaultCash : ""),
      combinedMemberAmount: String(defaultMember > 0 ? defaultMember : ""),
      combinedMemberId: isCashInHand ? (b.createdBy || user?.id) : (b.paidBy || user?.id),
    });
  }

  async function saveBazarEdit() {
    if (!bazarEditEntry) return;
    const rows = (bazarEditEntry.editItems || []).map((row) => ({
      item: String(row.item || "").trim(),
      quantity: Math.max(0, Number(row.quantity) || 0),
      unit: String(row.unit || "").trim(),
      price: Number(row.price) || 0,
    })).filter((row) => row.item && row.price > 0);
    const amount = rows.reduce((sum, row) => sum + row.price, 0);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(bazarEditEntry.editDate || "")) || !rows.length) { alert("Enter a valid date and at least one item with a price."); return; }
    if (rows.some((row) => row.quantity <= 0 || !row.unit)) { alert("Enter a quantity and unit for every item."); return; }
    try {
      if (bazarEditEntry.editPaidBy === "combine") {
        const cashAmount = roundMoney(Number(bazarEditEntry.combinedCashAmount) || 0);
        const memberAmount = roundMoney(Number(bazarEditEntry.combinedMemberAmount) || 0);
        const memberId = admin ? (bazarEditEntry.combinedMemberId || user?.id) : user?.id;

        if (cashAmount <= 0) throw new Error("Cash in Hand amount must be greater than 0.");
        if (memberAmount <= 0) throw new Error("Member amount must be greater than 0.");
        if (Math.abs(roundMoney(cashAmount + memberAmount) - roundMoney(amount)) > 0.05) {
          throw new Error(`Cash amount (${money(cashAmount)}) + Member amount (${money(memberAmount)}) must equal total bazar (${money(amount)}).`);
        }
        const oldCash = bazarEditEntry.isCombined
          ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0)
          : bazarEditEntry.paidFromCash
            ? Number(bazarEditEntry.amount || 0)
            : 0;
        const availableCash = roundMoney(cashInHand - pendingCashSettlementTotal + oldCash);
        if (cashAmount > availableCash) {
          throw new Error(`Not enough cash in hand. Available balance: ${money(Math.max(0, availableCash))}.`);
        }
        if (!memberId || !allActiveUsers.some((u) => u.id === memberId && u.active)) {
          throw new Error("Please select an active member in Member paying balance.");
        }

        const combineId = bazarEditEntry.combineId || `combine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const cashItems = splitBazarItems(rows, cashAmount, amount).map((it) => ({
          ...it,
          combine_id: combineId,
          combine_role: "cash",
          combine_cash_amount: cashAmount,
          combine_member_amount: memberAmount,
          combine_member_id: memberId,
          combine_full_items: rows,
        }));
        const memberItems = splitBazarItems(rows, memberAmount, amount).map((it) => ({
          ...it,
          combine_id: combineId,
          combine_role: "member",
          combine_cash_amount: cashAmount,
          combine_member_amount: memberAmount,
          combine_member_id: memberId,
          combine_full_items: rows,
        }));

        const cashEntryId = bazarEditEntry.isCombined ? bazarEditEntry.cashEntry?.id : (bazarEditEntry.paidFromCash ? bazarEditEntry.id : null);
        const memberEntryId = bazarEditEntry.isCombined ? bazarEditEntry.memberEntry?.id : (bazarEditEntry.partnerId || (!bazarEditEntry.paidFromCash ? bazarEditEntry.id : null));

        if (cashEntryId && memberEntryId) {
          const { error: err1 } = await supabase.from("bazar_entries").update({
            entry_date: bazarEditEntry.editDate,
            amount: cashAmount,
            paid_by: user.id,
            paid_from_cash: true,
            items: JSON.stringify(cashItems),
            updated_at: new Date().toISOString(),
          }).eq("id", cashEntryId);
          if (err1) throw err1;

          const { error: err2 } = await supabase.from("bazar_entries").update({
            entry_date: bazarEditEntry.editDate,
            amount: memberAmount,
            paid_by: memberId,
            paid_from_cash: false,
            items: JSON.stringify(memberItems),
            updated_at: new Date().toISOString(),
          }).eq("id", memberEntryId);
          if (err2) throw err2;
        } else if (cashEntryId) {
          const { error: err1 } = await supabase.from("bazar_entries").update({
            entry_date: bazarEditEntry.editDate,
            amount: cashAmount,
            items: JSON.stringify(cashItems),
            updated_at: new Date().toISOString(),
          }).eq("id", cashEntryId);
          if (err1) throw err1;

          const mid = await monthIdFor();
          const { error: err2 } = await supabase.from("bazar_entries").insert({
            month_id: mid,
            entry_date: bazarEditEntry.editDate,
            amount: memberAmount,
            paid_by: memberId,
            paid_from_cash: false,
            items: JSON.stringify(memberItems),
            created_by: bazarEditEntry.createdBy || user.id,
          });
          if (err2) throw err2;
        } else {
          const { error: err1 } = await supabase.from("bazar_entries").update({
            entry_date: bazarEditEntry.editDate,
            amount: memberAmount,
            paid_by: memberId,
            items: JSON.stringify(memberItems),
            updated_at: new Date().toISOString(),
          }).eq("id", memberEntryId);
          if (err1) throw err1;

          const mid = await monthIdFor();
          const { error: err2 } = await supabase.from("bazar_entries").insert({
            month_id: mid,
            entry_date: bazarEditEntry.editDate,
            amount: cashAmount,
            paid_by: user.id,
            paid_from_cash: true,
            items: JSON.stringify(cashItems),
            created_by: bazarEditEntry.createdBy || user.id,
          });
          if (err2) throw err2;
        }

        setBazarEditEntry(null);
        await loadCloudData(user.id, month);
        const memName = db.users.find((u) => u.id === memberId)?.name || "Member";
        setBazarSuccessToast(`Combined bazar updated (${money(cashAmount)} Cash + ${money(memberAmount)} ${memName})`);
        window.setTimeout(() => setBazarSuccessToast(""), 2800);
        return;
      }

      const update = { entry_date: bazarEditEntry.editDate, amount, items: JSON.stringify(rows), updated_at: new Date().toISOString() };
      if (admin) {
        const rawPaidBy = String(bazarEditEntry.editPaidBy || "").trim();
        const isCash = rawPaidBy.toLowerCase() === "cash-in-hand" || rawPaidBy.toLowerCase() === "cash in hand";
        const validUsers = db.users || [];
        const isUuid = (val) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        let paidBy = user?.id;
        if (isCash) {
          // Cash in Hand bazar must store a valid user UUID in paid_by (the creator or current admin), never string literal "Cash in Hand"
          const creatorId = bazarEditEntry.createdBy;
          if (creatorId && isUuid(creatorId) && validUsers.some((u) => u.id === creatorId)) {
            paidBy = creatorId;
          } else {
            paidBy = user?.id;
          }
          const oldCash = bazarEditEntry.isCombined
          ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0)
          : bazarEditEntry.paidFromCash
            ? Number(bazarEditEntry.amount || 0)
            : 0;
          const availableCash = roundMoney(cashInHand - pendingCashSettlementTotal + oldCash);
          if (amount > availableCash) {
            throw new Error(`Not enough cash in hand. Available balance: ${money(Math.max(0, availableCash))}.`);
          }
        } else {
          if (!rawPaidBy || !validUsers.some((u) => u.id === rawPaidBy)) {
            throw new Error("Please select who paid for this bazar.");
          }
          paidBy = rawPaidBy;
        }
        update.paid_from_cash = isCash;
        update.paid_by = paidBy;
      }
      const { error } = await supabase.from("bazar_entries").update(update).eq("id", bazarEditEntry.id);
      if (error) throw error;
      setBazarEditEntry(null);
      await loadCloudData(user.id, month);
      setBazarSuccessToast("Bazar updated successfully");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) { alert("Could not update bazar: " + e.message); }
  }
  async function deleteBazar(b) {
    if (!admin && b.createdBy !== user?.id) {
      alert("You can delete only entries you created.");
      return;
    }
    setPendingBazarDelete(b);
  }
  async function resetMonth() {
    if (!admin) return;
    if (
      !(await askConfirm(`Are you sure you want to reset ${month}? This will clear its bazar entries, cash contributions, settlements, payments and expense amounts. This cannot be undone.`, "Reset month?"))
    )
      return;
    try {
      const mid = await monthIdFor();
      const { error: settlementDeleteError } = await supabase
        .from("member_settlements")
        .delete()
        .eq("month_id", mid);
      if (
        settlementDeleteError &&
        !isMissingSettlementTableError(settlementDeleteError)
      )
        throw settlementDeleteError;
      for (const table of [
        "bazar_entries",
        "cash_contributions",
        "rent_payments",
      ]) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("month_id", mid);
        if (error) throw error;
      }
      const { error: categoryError } = await supabase
        .from("expense_categories")
        .update({ amount: 0 })
        .eq("month_id", mid);
      if (categoryError) throw categoryError;
      await loadCloudData(user.id, month);
      alert(`${month} has been reset.`);
    } catch (e) {
      alert("Could not reset month: " + e.message);
    }
  }
  async function addCash(e) {
    e.preventDefault();
    if (
      !admin ||
      !/^\d{4}-\d{2}-\d{2}$/.test(cashForm.date) ||
      !Number.isFinite(Number(cashForm.amount)) ||
      Number(cashForm.amount) <= 0 ||
      !cashForm.paidBy
    ) {
      alert("Enter a valid contribution date, member, and amount.");
      return;
    }
    try {
      const wasEditing = Boolean(cashForm.id);
      const previousContribution = wasEditing
        ? (db.contributions || []).find(
            (contribution) => contribution.id === cashForm.id,
          )
        : null;
      const nextAmount = Number(cashForm.amount);
      const affectedMemberIds = new Set(
        [previousContribution?.paidBy, cashForm.paidBy].filter(Boolean),
      );
      for (const memberId of affectedMemberIds) {
        const nextMemberContribution = roundMoney(
          memberCashContribution(memberId) -
            (previousContribution?.paidBy === memberId
              ? Number(previousContribution.amount || 0)
              : 0) +
            (cashForm.paidBy === memberId ? nextAmount : 0),
        );
        const allocated = cashSettlementAllocatedBy(memberId);
        if (nextMemberContribution + 0.009 < allocated) {
          const memberName =
            db.users.find((member) => member.id === memberId)?.name || "This member";
          throw new Error(
            `${memberName} already has ${money(allocated)} assigned to settlement plans. Delete or complete those entries before reducing or moving this contribution.`,
          );
        }
      }
      const nextCashContributionsTotal = roundMoney(
        cashContributionsTotal -
          Number(previousContribution?.amount || 0) +
          nextAmount,
      );
      const committedCash = roundMoney(
        cashBazarSpent + completedCashSettlementTotal + pendingCashSettlementTotal,
      );
      if (nextCashContributionsTotal + 0.009 < committedCash) {
        throw new Error(
          `${money(committedCash)} is already spent or reserved. The total cash contributions cannot be reduced below that amount.`,
        );
      }
      const selectedMonth = cashForm.month || month;
      const mid = await monthIdFor(selectedMonth);
      const contribution = {
        month_id: mid,
        entry_date: cashForm.date,
        amount: Number(cashForm.amount),
        paid_by: cashForm.paidBy,
        note: cashForm.note,
      };
      const { error } = cashForm.id
        ? await supabase
            .from("cash_contributions")
            .update(contribution)
            .eq("id", cashForm.id)
        : await supabase
            .from("cash_contributions")
            .insert({ ...contribution, created_by: user.id });
      if (error) throw error;
      void loadNotices(false, user.id).catch((notificationError) =>
        console.warn("Could not refresh cash notifications:", notificationError?.message),
      );
      await loadCloudData(user.id, month);
      setCashForm((form) => ({
        ...form,
        id: null,
        amount: "",
        note: "Cash contribution",
      }));
      setShowAddCash(false);
      setBazarSuccessToast(
        wasEditing
          ? "Cash contribution updated successfully"
          : "Cash contribution saved successfully",
      );
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert(`Could not ${cashForm.id ? "update" : "save"} cash contribution: ${e.message}`);
    }
  }
  function editCash(c) {
    if (!admin) return;
    setCashForm({
      id: c.id,
      date: c.date || todayForDateInput(),
      month: c.month || month,
      amount: String(c.amount),
      paidBy: c.paidBy,
      note: c.note || "",
    });
    setShowAddCash(true);
  }
  async function deleteCash(c) {
    if (!admin) return;
    const remainingMemberContribution = roundMoney(
      memberCashContribution(c.paidBy) - Number(c.amount || 0),
    );
    const allocated = cashSettlementAllocatedBy(c.paidBy);
    if (remainingMemberContribution + 0.009 < allocated) {
      alert(
        `${money(allocated)} from this member is assigned to settlement entries. Delete those settlements before deleting the contribution.`,
      );
      return;
    }
    const remainingCashContributions = roundMoney(
      cashContributionsTotal - Number(c.amount || 0),
    );
    const committedCash = roundMoney(
      cashBazarSpent + completedCashSettlementTotal + pendingCashSettlementTotal,
    );
    if (remainingCashContributions + 0.009 < committedCash) {
      alert(
        `${money(committedCash)} is already spent or reserved. This cash contribution cannot be deleted yet.`,
      );
      return;
    }
    if (
      !(await askConfirm(`Delete ${db.users.find((u) => u.id === c.paidBy)?.name || "member"}’s cash contribution of ${money(c.amount)}? This cannot be undone.`, "Delete contribution?"))
    )
      return;
    try {
      const { error } = await supabase
        .from("cash_contributions")
        .delete()
        .eq("id", c.id);
      if (error) throw error;
      await loadCloudData(user.id, month);
      setBazarSuccessToast("Cash contribution deleted successfully");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert("Could not delete cash contribution: " + e.message);
    }
  }
  function openSettlementModal(prefill = {}) {
    const defaultFrom =
      prefill.fromUserId ||
      allActiveUsers.find((member) => member.id !== prefill.toUserId)?.id ||
      "";
    const defaultTo =
      prefill.toUserId ||
      allActiveUsers.find((member) => member.id !== defaultFrom)?.id ||
      "";
    setSettlementForm({
      sourceType: prefill.sourceType || "cash_contribution",
      fromUserId: defaultFrom,
      toUserId: defaultTo,
      amount: prefill.amount ? String(prefill.amount) : "",
      date: todayForDateInput(),
      note: prefill.note || "Meal balance settlement",
    });
    setShowSettlementModal(true);
  }
  function settlementWriteError(error) {
    if (
      /confirm_settlement_payment|paid_amount|partially_paid|member_settlement_payments/i.test(
        String(error?.message || ""),
      )
    ) {
      return "Partial settlement confirmation is not installed. Run supabase/migrations/202611081900_member_settlement_partial_confirmation.sql in Supabase.";
    }
    return isMissingSettlementTableError(error)
      ? "Settlement setup is incomplete. Run the member settlement migrations in Supabase first."
      : error?.message || "Could not save settlement.";
  }
  async function saveSettlement(e) {
    e.preventDefault();
    if (!admin || settlementBusy) return;
    const amount = roundMoney(settlementForm.amount);
    const fromMember = allActiveUsers.find(
      (member) => member.id === settlementForm.fromUserId,
    );
    const toMember = allActiveUsers.find(
      (member) => member.id === settlementForm.toUserId,
    );
    if (
      !fromMember ||
      !toMember ||
      fromMember.id === toMember.id ||
      amount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(settlementForm.date)
    ) {
      alert("Choose two different members and enter a valid date and amount.");
      return;
    }
    if (settlementForm.sourceType === "cash_contribution") {
      const memberAvailable = availableContributionForSettlement(fromMember.id);
      const cashAvailable = Math.max(
        0,
        roundMoney(cashInHand - pendingCashSettlementTotal),
      );
      const refundableBalance = Math.max(
        0,
        roundMoney(-Math.min(0, memberMealBalance(toMember, true))),
      );
      if (amount > memberAvailable + 0.009) {
        alert(
          `${fromMember.name} has ${money(memberAvailable)} of unallocated cash contributions available.`,
        );
        return;
      }
      if (amount > cashAvailable + 0.009) {
        alert(`Only ${money(cashAvailable)} cash is currently available for a new refund.`);
        return;
      }
      if (amount > refundableBalance + 0.009) {
        alert(
          `${toMember.name} can currently receive at most ${money(refundableBalance)}.`,
        );
        return;
      }
    } else {
      const payerBalance = memberMealBalance(fromMember, true);
      const receiverBalance = memberMealBalance(toMember, true);
      const allowed = Math.max(
        0,
        roundMoney(Math.min(payerBalance, Math.abs(Math.min(0, receiverBalance)))),
      );
      if (amount > allowed + 0.009) {
        alert(
          `This direct settlement can be at most ${money(allowed)} based on the current meal balances.`,
        );
        return;
      }
    }
    setSettlementBusy(true);
    try {
      const mid = await monthIdFor();
      const { error } = await supabase.from("member_settlements").insert({
        month_id: mid,
        from_user_id: fromMember.id,
        to_user_id: toMember.id,
        amount,
        source_type: settlementForm.sourceType,
        status: "pending",
        settlement_date: settlementForm.date,
        note: settlementForm.note.trim() || "Meal balance settlement",
        created_by: user.id,
      });
      if (error) throw error;
      setShowSettlementModal(false);
      await loadCloudData(user.id, month);
      setBazarSuccessToast("Settlement created. The receiver can now confirm payments.");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (error) {
      alert(settlementWriteError(error));
    } finally {
      setSettlementBusy(false);
    }
  }
  async function createAutoSettlementPlan() {
    if (!admin || settlementPlanBusy) return;
    if (!settlementSuggestions.length) {
      alert("No new settlement match is available for the current balances.");
      return;
    }
    setSettlementPlanBusy(true);
    try {
      const mid = await monthIdFor();
      const rows = settlementSuggestions.map((suggestion) => ({
        month_id: mid,
        from_user_id: suggestion.fromUserId,
        to_user_id: suggestion.toUserId,
        amount: suggestion.amount,
        source_type: suggestion.sourceType,
        status: "pending",
        settlement_date: todayForDateInput(),
        note:
          suggestion.sourceType === "cash_contribution"
            ? "Auto plan: cash contribution refund"
            : "Auto plan: direct member settlement",
        created_by: user.id,
      }));
      const { error } = await supabase.from("member_settlements").insert(rows);
      if (error) throw error;
      await loadCloudData(user.id, month);
      setBazarSuccessToast(
        `${rows.length} settlement ${rows.length === 1 ? "plan" : "plans"} created`,
      );
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (error) {
      alert(settlementWriteError(error));
    } finally {
      setSettlementPlanBusy(false);
    }
  }
  function openSettlementConfirmation(settlement) {
    const remaining = settlementRemainingValue(settlement);
    if (!hasMoney(remaining) || settlementBusy) return;
    setSettlementConfirmTarget(settlement);
    setSettlementConfirmAmount(String(remaining));
  }
  async function confirmSettlementPayment(e) {
    e.preventDefault();
    if (!settlementConfirmTarget || settlementBusy) return;
    const amount = roundMoney(settlementConfirmAmount);
    const remaining = settlementRemainingValue(settlementConfirmTarget);
    const canConfirm =
      admin || settlementConfirmTarget.toUserId === user?.id;
    if (!canConfirm) {
      alert("Only the receiver can confirm this payment.");
      return;
    }
    if (!hasMoney(amount) || amount > remaining + 0.009) {
      alert(`Enter an amount from ${money(0.01)} to ${money(remaining)}.`);
      return;
    }
    setSettlementBusy(true);
    try {
      const { error } = await supabase.rpc("confirm_settlement_payment", {
        p_settlement_id: settlementConfirmTarget.id,
        p_amount: amount,
      });
      if (error) throw error;
      const completed = amount >= remaining - 0.009;
      setSettlementConfirmTarget(null);
      setSettlementConfirmAmount("");
      await loadCloudData(user.id, month);
      setBazarSuccessToast(
        completed
          ? "Payment confirmed. Settlement completed."
          : "Partial payment confirmed successfully.",
      );
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (error) {
      alert(settlementWriteError(error));
    } finally {
      setSettlementBusy(false);
    }
  }
  async function deleteSettlement(settlement) {
    if (!admin || settlementBusy) return;
    const fromName =
      db.users.find((member) => member.id === settlement.fromUserId)?.name ||
      "Member";
    const toName =
      db.users.find((member) => member.id === settlement.toUserId)?.name ||
      "member";
    if (
      !(await askConfirm(
        `Delete the ${money(settlement.amount)} settlement from ${fromName} to ${toName}?${settlementPaidValue(settlement) > 0 ? " Confirmed payments and balances will be reversed." : ""}`,
        "Delete settlement?",
      ))
    )
      return;
    setSettlementBusy(true);
    try {
      const { error } = await supabase
        .from("member_settlements")
        .delete()
        .eq("id", settlement.id);
      if (error) throw error;
      await loadCloudData(user.id, month);
      setBazarSuccessToast("Settlement deleted successfully");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (error) {
      alert(settlementWriteError(error));
    } finally {
      setSettlementBusy(false);
    }
  }
  async function saveUser(e) {
    e.preventDefault();
    if (!admin || !newUser.name.trim() || !newUser.username.trim()) return;
    const wasEditing = Boolean(editId);
    try {
      if (!editId) {
        if (!newUser.email?.trim() || !newUser.password)
          throw new Error(
            "Enter an email address and a temporary password for the new account.",
          );
        const { data, error } = await supabase.functions.invoke(
          "admin-create-member",
          {
            body: {
              full_name: newUser.name.trim(),
              username: newUser.username.trim(),
              email: newUser.email.trim(),
              password: newUser.password,
              rent: Number(newUser.rent || 0),
              role: newUser.role || "member",
            },
          },
        );
        if (error) {
          let detail = error.message || "Could not create member.";
          try {
            const payload = await error.context?.json();
            if (payload?.error) detail = payload.error;
          } catch {}
          throw new Error(data?.error || detail);
        }
        if (data?.error) throw new Error(data.error);
      } else {
        if (newUser.password) {
          const { data, error } = await supabase.functions.invoke("admin-update-member", {
            body: {
              id: editId,
              full_name: newUser.name.trim(),
              username: newUser.username.trim(),
              rent: Number(newUser.rent || 0),
              role: newUser.role,
              password: newUser.password,
            },
          });
          if (error) {
            let detail = error.message || "Could not update member.";
            try {
              const payload = await error.context?.json();
              if (payload?.error) detail = payload.error;
            } catch {}
            if (error.name === "FunctionsFetchError" || /failed to send a request/i.test(detail)) {
              detail = "Could not reach admin-update-member. Deploy it with `supabase functions deploy admin-update-member`, then try again.";
            }
            throw new Error(data?.error || detail);
          }
          if (data?.error) throw new Error(data.error);
        } else {
          const { error } = await supabase
            .from("profiles")
            .update({
              full_name: newUser.name.trim(),
              username: newUser.username.trim(),
              rent: Number(newUser.rent || 0),
              role: newUser.role,
            })
            .eq("id", editId);
          if (error) throw error;
        }
      }
      await loadCloudData(user.id, month);
      setEditId(null);
      setNewUser({
        name: "",
        username: "",
        email: "",
        password: "",
        rent: "",
        role: "member",
      });
      setShowMemberModal(false);
      setBazarSuccessToast(wasEditing ? "Member updated successfully" : "Member added successfully");
      window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert("Could not save member: " + e.message);
    }
  }
  function editUser(u) {
    setEditId(u.id);
    setNewUser({
      name: u.name,
      username: u.username,
      email: "",
      password: "",
      rent: String(u.rent),
      role: u.role,
    });
    setShowMemberModal(true);
  }
  async function removeUser(id) {
    if (!admin) return;
    if (id === session.id) {
      alert("Admin cannot deactivate the currently logged in account.");
      return;
    }
    if (!confirm("Deactivate this user? Past history will remain.")) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
      await loadCloudData(user.id, month);
    } catch (e) {
      alert("Could not deactivate member: " + e.message);
    }
  }
  async function persistBulletinNotices(nextItems, toastMsg = "") {
    setBulletinNotices(nextItems);
    if (!supabaseConfigured || !supabase || !admin) return;
    setBulletinSaving(true);
    try {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: "bulletin_notices",
          value: JSON.stringify(nextItems),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
      if (toastMsg) {
        setBazarSuccessToast(toastMsg);
        window.setTimeout(() => setBazarSuccessToast(""), 2600);
      }
    } catch (err) {
      alert("Could not save bulletin notice: " + (err?.message || "Unknown error"));
    } finally {
      setBulletinSaving(false);
    }
  }
  async function saveBulletinSpeed(nextSpeed) {
    if (!admin || bulletinSpeedSaving) return;
    const normalizedSpeed = Math.max(24, Math.min(90, Number(nextSpeed) || 46));
    const previousSpeed = bulletinSpeed;
    setBulletinSpeed(normalizedSpeed);
    if (!supabaseConfigured || !supabase) return;
    setBulletinSpeedSaving(true);
    try {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: "bulletin_marquee_speed",
          value: String(normalizedSpeed),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
      setBazarSuccessToast("Bulletin speed updated");
      window.setTimeout(() => setBazarSuccessToast(""), 2200);
    } catch (err) {
      setBulletinSpeed(previousSpeed);
      alert("Could not save bulletin speed: " + (err?.message || "Unknown error"));
    } finally {
      setBulletinSpeedSaving(false);
    }
  }
  async function saveBulletinNotice(e) {
    e?.preventDefault();
    const trimmed = String(bulletinInput || "").trim();
    if (!admin || !trimmed) return;
    if (editingBulletinId) {
      const next = bulletinNotices.map((item) =>
        item.id === editingBulletinId ? { ...item, text: trimmed } : item,
      );
      setBulletinInput("");
      setEditingBulletinId("");
      await persistBulletinNotices(next, "Bulletin notice updated");
    } else {
      const next = [
        {
          id: `bulletin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: trimmed,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...bulletinNotices,
      ];
      setBulletinInput("");
      setBulletinIndex(0);
      await persistBulletinNotices(next, "Bulletin notice published");
    }
  }
  async function toggleBulletinNoticeActive(id) {
    if (!admin) return;
    const next = bulletinNotices.map((item) =>
      item.id === id ? { ...item, active: item.active === false } : item,
    );
    await persistBulletinNotices(next, "Bulletin status updated");
  }
  async function deleteBulletinNoticeItem(id) {
    if (!admin || !(await askConfirm("Remove this bulletin notice from the banner?", "Delete bulletin notice?"))) return;
    const next = bulletinNotices.filter((item) => item.id !== id);
    if (editingBulletinId === id) {
      setEditingBulletinId("");
      setBulletinInput("");
    }
    await persistBulletinNotices(next, "Bulletin notice removed");
  }
  async function toggleSavedNoticeBulletin(n) {
    if (!admin) return;
    const exists = bulletinNotices.some((item) => String(item.noticeId) === String(n.id));
    if (exists) {
      const next = bulletinNotices.filter((item) => String(item.noticeId) !== String(n.id));
      await persistBulletinNotices(next, "Removed from Bulletin Notice banner");
    } else {
      const text = [String(n.title || "").trim(), String(n.body || "").trim()]
        .filter((part) => part && part.toLowerCase() !== "notice")
        .join(" — ") || String(n.body || n.title || "Notice").trim();
      const next = [
        {
          id: `bulletin-notice-${n.id}`,
          noticeId: String(n.id),
          text,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...bulletinNotices,
      ];
      setBulletinIndex(0);
      await persistBulletinNotices(next, "Added to Bulletin Notice banner");
    }
  }
  async function saveNoticeDraft(e) {
    e?.preventDefault();
    if (!admin || (!noticeForm.title.trim() && !noticeForm.body.trim() && !noticeImage)) return;
    setNoticeDraftBusy(true); setNoticeError("");
    try {
      let imageUrl = null;
      if (noticeImage) {
        const ext = (noticeImage.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("notices").upload(path, noticeImage, { upsert: false, contentType: noticeImage.type || "image/jpeg" });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("notices").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("notices").insert({ title: noticeForm.title.trim() || "Notice", body: noticeForm.body.trim(), image_url: imageUrl, created_by: user.id, status: "draft" });
      if (error) throw error;
      await loadNotices(false); setNoticeForm({ title: "", body: "", isBulletin: false }); setNoticeImage(null); setNoticeComposerOpen(false);
      const fileInput = document.getElementById("notice-image-input"); if (fileInput) fileInput.value = "";
      setBazarSuccessToast("Notice saved as draft. Members have not been notified."); window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (err) { setNoticeError(err.message || "Could not save draft. Apply the notice SQL setup first."); }
    finally { setNoticeDraftBusy(false); }
  }
  async function postNotice(e) {
    e.preventDefault();
    if (!admin || (!noticeForm.title.trim() && !noticeForm.body.trim() && !noticeImage)) return;
    setNoticeBusy(true); setNoticeError("");
    try {
      let imageUrl = null;
      if (noticeImage) {
        const ext = (noticeImage.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("notices").upload(path, noticeImage, { upsert: false, contentType: noticeImage.type || "image/jpeg" });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("notices").getPublicUrl(path).data.publicUrl;
      }
      const { data: insertedNotice, error } = await supabase.from("notices").insert({ title: noticeForm.title.trim() || "Notice", body: noticeForm.body.trim(), image_url: imageUrl, created_by: user.id, status: "published" }).select("id").maybeSingle();
      if (error) throw error;
      if (noticeForm.isBulletin) {
        const bulletinText = [noticeForm.title.trim(), noticeForm.body.trim()]
          .filter((part) => part && part.toLowerCase() !== "notice")
          .join(" — ") || noticeForm.body.trim() || noticeForm.title.trim();
        if (bulletinText) {
          const nextBulletins = [
            {
              id: insertedNotice?.id ? `bulletin-notice-${insertedNotice.id}` : `bulletin-${Date.now()}`,
              noticeId: insertedNotice?.id ? String(insertedNotice.id) : "",
              text: bulletinText,
              active: true,
              createdAt: new Date().toISOString(),
            },
            ...bulletinNotices,
          ];
          await persistBulletinNotices(nextBulletins, "");
        }
      }
      await loadNotices(false); setNoticeForm({ title: "", body: "", isBulletin: false }); setNoticeImage(null); setNoticeComposerOpen(false);
      const fileInput = document.getElementById("notice-image-input"); if (fileInput) fileInput.value = "";
      setBazarSuccessToast(noticeForm.isBulletin ? "Notice & Bulletin published successfully" : "Notice published successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (err) { setNoticeError(err.message || "Could not publish notice. Apply the notice SQL/storage setup first."); }
    finally { setNoticeBusy(false); }
  }
  async function publishSavedNotice(n) {
    if (!admin || !(await askConfirm("Publish this saved notice for all members? They will be able to see it.", "Publish notice?"))) return;
    try {
      const { error } = await supabase.from("notices").update({ status: "published" }).eq("id", n.id);
      if (error) throw error;
      await loadNotices(false); setBazarSuccessToast("Notice published successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) { alert("Could not publish notice: " + e.message); }
  }
  async function repostNotice(n) {
    if (!admin || !(await askConfirm("Repost this notice to all members? They will receive it again.", "Repost notice?"))) return;
    try {
      const { error } = await supabase
        .from("notices")
        .update({ created_at: new Date().toISOString() })
        .eq("id", n.id)
        .eq("status", "published");
      if (error) throw error;
      await loadNotices(false);
      setBazarSuccessToast("Notice reposted successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert("Could not repost notice: " + e.message);
    }
  }
  async function deleteNotice(n) {
    if (!admin || !(await askConfirm("Delete this notice for all members? This cannot be undone.", "Delete notice?"))) return;
    try {
      const { error } = await supabase.from("notices").delete().eq("id", n.id);
      if (error) throw error;
      await loadNotices(false);
      setBazarSuccessToast("Notice deleted successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
    } catch (e) {
      alert("Could not delete notice: " + e.message);
    }
  }
  async function loadPaymentOptions() {
    if (!supabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from("payment_options")
        .select(
          "provider,label,account_name,account_number,instructions,enabled,logo_url",
        )
        .order("sort_order");
      if (error) throw error;
      const saved = data || [];
      setPaymentOptions(
        [
          ...paymentDefaults.map((d) => ({
            ...d,
            ...(saved.find((x) => x.provider === d.provider) || {}),
          })),
          ...saved
            .filter((option) => !paymentDefaults.some((d) => d.provider === option.provider))
            .map((option) => ({
              ...option,
              account_name: option.account_name || "",
              account_number: option.account_number || "",
              instructions: option.instructions || "",
              enabled: option.enabled !== false,
              logo_url: option.logo_url || "",
            })),
        ],
      );
      setPaymentOptionsError("");
      return true;
    } catch (e) {
      setPaymentOptionsError(
        "Payment options database is not set up yet. Run PAYMENT-OPTIONS-SETUP.sql in Supabase SQL Editor.",
      );
      console.warn("Could not load payment options:", e.message);
      return false;
    }
  }
  function openPaymentEditor(mode) {
    setPaymentOptionsError("");
    setPaymentEditorMode(mode);
    setPaymentEditorForm(
      mode === "add"
        ? {
            provider: "",
            label: "",
            account_name: "",
            account_number: "",
            instructions: "",
            enabled: true,
            logo_url: "",
          }
        : { ...(paymentOptions[0] || paymentDefaults[0]) },
    );
  }
  async function savePaymentEditor(e) {
    e.preventDefault();
    if (!admin) return;
    setPaymentOptionsBusy(true);
    setPaymentOptionsError("");
    try {
      const label = paymentEditorForm.label.trim();
      const provider =
        paymentEditorMode === "add"
          ? label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `custom_${Date.now()}`
          : paymentEditorForm.provider;
      if (!label || !provider) throw new Error("Enter a payment option name.");
      if (
        paymentEditorMode === "add" &&
        paymentOptions.some((option) => option.provider === provider)
      ) {
        throw new Error("A payment option with this name already exists.");
      }
      const payload = {
        provider,
        label,
        account_name: paymentEditorForm.account_name.trim(),
        account_number: paymentEditorForm.account_number.trim(),
        instructions: paymentEditorForm.instructions.trim(),
        enabled: !!paymentEditorForm.enabled,
        logo_url: paymentEditorForm.logo_url.trim(),
        sort_order:
          paymentEditorMode === "add"
            ? paymentOptions.length
            : Math.max(0, paymentOptions.findIndex((o) => o.provider === provider)),
        updated_by: user.id,
      };
      const { error } = await supabase
        .from("payment_options")
        .upsert(payload, { onConflict: "provider" });
      if (error) throw error;
      if (!(await loadPaymentOptions())) return;
      setPaymentEditorMode("");
      setPaymentEditorForm(null);
    } catch (e) {
      setPaymentOptionsError(e.message || "Could not save this payment option.");
    } finally {
      setPaymentOptionsBusy(false);
    }
  }
  function openContactEditor(mode) {
    setContactError("");
    setContactForm(
      mode === "edit" && contactRows[0]
        ? {
            id: contactRows[0].id,
            category: contactRows[0].category,
            name: contactRows[0].name,
            phone: contactRows[0].phone,
          }
        : { id: "", category: "Flatmate", name: "", phone: "" },
    );
    setContactModalOpen(true);
  }
  async function saveContact(e) {
    e.preventDefault();
    setContactBusy(true);
    setContactError("");
    try {
      const payload = {
        category: contactForm.category,
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim(),
      };
      const result = contactForm.id
        ? await supabase.from("member_contacts").update(payload).eq("id", contactForm.id).select().single()
        : await supabase.from("member_contacts").insert(payload).select().single();
      if (result.error) throw result.error;
      setContactRows((rows) =>
        contactForm.id
          ? rows.map((row) => row.id === contactForm.id ? result.data : row)
          : [...rows, result.data],
      );
      setContactModalOpen(false);
    } catch (error) {
      setContactError("Could not save contact: " + error.message);
    } finally {
      setContactBusy(false);
    }
  }
  function PaymentBrand({ provider, logoUrl }) {
    const brand = {
      bkash: { src: "/payment-logos/bkash.svg", alt: "bKash" },
      nagad: { src: "/payment-logos/nagad.svg", alt: "Nagad" },
      brac_bank: { src: "/payment-logos/brac-bank.svg", alt: "BRAC Bank" },
      islami_bank: {
        src: "/payment-logos/islami-bank.svg",
        alt: "Islami Bank",
      },
    }[provider];
    const src = logoUrl || brand?.src;
    return src ? (
      <span className={"pay-logo pay-logo-image pay-logo-" + provider}>
        <img src={src} alt={brand?.alt || provider + " logo"} />
      </span>
    ) : (
      <span className="pay-logo pay-logo-generic" aria-label={provider}>
        ৳
      </span>
    );
  }
  function exportCsv() {
    let rows = [
      ["Month", "Member", "Rent", "Shared expense", "Paid", "Due"],
      ...allDue.map((x) => [
        month,
        x.u.name,
        x.u.rent,
        x.shared,
        x.paid,
        Number(x.u.rent) + x.shared - x.paid,
      ]),
    ];
    let csv = rows
      .map((r) =>
        r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\n");
    let a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "monthly-hisab-" + month + ".csv";
    a.click();
  }
  function exportMemberBill(member) {
    if (previousDueLoading) {
      alert("Previous months balance is still loading. Please try again in a moment.");
      return;
    }

    const reportWindow = window.open("", "_blank", "width=900,height=900");
    if (reportWindow) {
      try {
        reportWindow.__html2canvas = html2canvas;
        reportWindow.__jsPDF = jsPDF;
      } catch (e) {
        // popup isolation fallback
      }
    }
    const popupBlocked = !reportWindow;
    const reportDocument = reportWindow
      ? reportWindow.document
      : document.implementation.createHTMLDocument("Monthly Bill");
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character]));
    const rentAndUtilities = memberRentShare(member);
    const mealCost = memberMealShare(member);
    const rentPaid = memberRentPaid(member.id);
    const mealPaid = memberMealPaid(member.id);
    const totalPaid = rentPaid + mealPaid;
    const currentCharges = rentAndUtilities + mealCost;
    const previousBalance = previousDueByUser[member.id] || 0;
    const rentUtilitiesDue = rentAndUtilities - rentPaid;
    const mealBalance = mealCost - mealPaid;
    const currentBalance = rentUtilitiesDue + mealBalance;
    const finalBalance = currentBalance + previousBalance;
    const signedMoney = (amount) =>
      amount < 0 ? `−${money(Math.abs(amount))}` : money(amount);
    const estimatedMealTarget = 2000;
    const estimatedMealRemaining = Math.max(0, estimatedMealTarget - mealCost);
    const estimatedMonthDue = finalBalance + estimatedMealRemaining;
    const generatedDate = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Dhaka",
    }).format(new Date());
    const reportPaymentOptions = paymentOptions.filter(
      (option) => option.enabled && String(option.account_number || "").trim(),
    );
    const paymentLogoByProvider = {
      bkash: "/payment-logos/bkash.svg",
      nagad: "/payment-logos/nagad.svg",
      brac_bank: "/payment-logos/brac-bank.svg",
      islami_bank: "/payment-logos/islami-bank.svg",
    };
    const paymentRowsHtml = reportPaymentOptions.length
      ? reportPaymentOptions.map((option) => {
          const label = String(option.label || option.provider || "Payment").trim();
          const logoSrc = option.logo_url || paymentLogoByProvider[option.provider] || "";
          const logo = logoSrc
            ? `<img class="pay-logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(label)}"/>`
            : `<span class="pay-logo-fallback">${escapeHtml(label.charAt(0).toUpperCase() || "P")}</span>`;
          return `<tr>
            <td class="pay-method-cell">${logo}<span class="pay-method-name">${escapeHtml(label)}</span></td>
            <td class="pay-instructions-cell">${escapeHtml(option.instructions || "Transfer")}</td>
            <td class="pay-account-cell">${escapeHtml(option.account_number)}</td>
          </tr>`;
        }).join("")
      : "";
    const toneClass = (amount) => (amount < 0 ? "val-credit" : amount === 0 ? "val-zero" : "val-due");
    const rentDueTone = toneClass(rentUtilitiesDue);
    const mealDueTone = toneClass(mealBalance);
    const currentBalanceTone = toneClass(currentBalance);
    const prevBalanceTone = toneClass(previousBalance);
    const finalBalanceTone = toneClass(finalBalance);

    reportDocument.open();
    reportDocument.write(`<!doctype html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Residence Summary · ${escapeHtml(month)} · ${escapeHtml(member.name)}</title>
      <base href="${escapeHtml(window.location.origin)}/">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');
        *{box-sizing:border-box}
        :root{color-scheme:light}
        @page{size:A4 portrait;margin:0}
        html{min-width:0;background:#dce7e4}
        body{margin:0;padding:24px;display:flex;justify-content:center;min-height:100vh;background:radial-gradient(circle at 50% 0,#eef6f3 0,#dde9e5 65%,#d2e0dc 100%);color:#10221f;font-family:"Manrope","Hind Siliguri",system-ui,-apple-system,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}

        /* Floating Export Toolbar */
        body>.toolbar{position:fixed;z-index:1000;top:16px;right:16px;display:flex;gap:8px;padding:7px;border:1px solid rgba(15,79,71,.16);border-radius:15px;background:rgba(255,255,255,.94);box-shadow:0 12px 32px rgba(10,55,49,.16);backdrop-filter:blur(12px)}
        body>.toolbar button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;padding:0 14px;border:1px solid #0f564d;border-radius:10px;background:linear-gradient(135deg,#16685d,#0c453e);color:#fff;font:700 13.5px/1 "Manrope","Hind Siliguri",sans-serif;white-space:nowrap;cursor:pointer;transition:transform .15s,opacity .15s,background .15s}
        body>.toolbar button:hover{transform:translateY(-1px);background:linear-gradient(135deg,#1a786c,#0f524a)}
        body>.toolbar button:disabled{opacity:.65;cursor:wait;transform:none}
        body>.toolbar button.btn-save-image{border-color:#c4dbd5;background:#fff;color:#113631}
        body>.toolbar button.btn-save-image:hover{background:#f1f8f6}
        body>.toolbar button svg{width:17px;height:17px;flex:none}
        .toolbar-spinner{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,.32);border-top-color:#fff;border-radius:50%;animation:tb-spin .7s linear infinite;flex:none}
        body>.toolbar button.btn-save-image .toolbar-spinner{border-color:rgba(15,86,77,.25);border-top-color:#0f564d}
        @keyframes tb-spin{to{transform:rotate(360deg)}}

        /* A4 Statement Sheet */
        .sheet{position:relative;isolation:isolate;display:flex;flex-direction:column;width:min(100%,210mm);min-height:297mm;padding:24px 30px 20px;overflow:hidden;border:1px solid #cddfda;border-radius:22px;background:linear-gradient(160deg,#edf4f2 0%,#f5f9f8 46%,#e8f1ee 100%);box-shadow:0 28px 80px rgba(10,54,48,.16)}
        .sheet-watermark{position:absolute;right:-10px;bottom:-10px;z-index:0;width:340px;height:390px;pointer-events:none;opacity:.08;color:#0e4f47}
        .sheet>*:not(.sheet-watermark){position:relative;z-index:1}

        /* Header */
        .doc-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
        .brand-wrap{display:flex;align-items:center;gap:14px;min-width:0}
        .brand-logo{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;color:#0f574e}
        .brand-logo svg{width:46px;height:46px}
        .brand-sep{width:1.5px;height:42px;flex:0 0 1.5px;background:#b9cdc7}
        .brand-copy{min-width:0}
        .brand-name{margin:0;color:#0c201d;font-size:25px;font-weight:800;letter-spacing:-.035em;line-height:1.08;white-space:nowrap}
        .brand-address{display:flex;align-items:center;gap:6px;margin-top:4px;color:#556b66;font-size:12px;font-weight:550;line-height:1.2}
        .brand-address svg{width:13px;height:13px;flex:none;color:#115a50}
        .header-month{flex:0 0 auto;color:#0f2522;font-size:18px;font-weight:750;letter-spacing:-.02em;white-space:nowrap}

        /* Main Title */
        .summary-title{margin:0 0 15px;color:#0b1f1c;font-size:24px;font-weight:750;letter-spacing:-.03em;line-height:1.2}

        /* Top Rent & Utilities + Member Pill Bar */
        .member-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px 10px 16px;margin-bottom:13px;border:1px solid #d9e6e2;border-radius:16px;background:#ffffff;box-shadow:0 8px 22px rgba(13,62,54,.065)}
        .bar-left{display:flex;align-items:center;gap:12px;min-width:0}
        .badge-icon{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#186159,#0d3f3a);color:#ffffff;box-shadow:0 4px 10px rgba(13,63,58,.2)}
        .badge-icon svg{width:18px;height:18px}
        .bar-title{color:#0f221f;font-size:17px;font-weight:750;letter-spacing:-.02em}
        .member-pill{display:flex;align-items:center;gap:10px;min-width:184px;padding:7px 16px 7px 12px;border:1px solid #c3e2d6;border-radius:13px;background:linear-gradient(120deg,#f4fbf8 0%,#ddf1e8 100%)}
        .member-pill svg{width:24px;height:24px;flex:none;color:#125950}
        .member-pill-label{display:block;color:#526b65;font-size:11px;font-weight:600;line-height:1.1}
        .member-pill-name{display:block;margin-top:2px;color:#0c201d;font-size:17px;font-weight:800;letter-spacing:-.02em;line-height:1.15;white-space:nowrap}

        /* Shared Card Surface */
        .card{margin-bottom:13px;padding:14px 16px 10px;border:1px solid #d9e6e2;border-radius:18px;background:#ffffff;box-shadow:0 8px 22px rgba(13,62,54,.065)}
        .card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .card-head h2{margin:0;color:#0e211e;font-size:16.5px;font-weight:750;letter-spacing:-.02em}

        /* Detailed Breakdown Dual-Column Table */
        .breakdown-table{width:100%;border-collapse:collapse;table-layout:fixed}
        .breakdown-table thead th{padding:8px 10px;background:#e4eeeb;color:#1b332f;font-size:12.5px;font-weight:750;text-align:left;line-height:1.2}
        .breakdown-table thead th:first-child{border-radius:8px 0 0 8px}
        .breakdown-table thead th:last-child{border-radius:0 8px 8px 0;text-align:right}
        .breakdown-table thead th.col-num{text-align:right}
        .breakdown-table tbody td{padding:8px 10px;border-bottom:1px solid #ebf1ef;color:#1c2e2b;font-size:13px;font-weight:550;line-height:1.25}
        .breakdown-table tbody tr:last-child td{border-bottom:0}
        .breakdown-table tbody td.col-num{text-align:right;font-weight:750;font-variant-numeric:tabular-nums;white-space:nowrap;color:#0f2320}
        .breakdown-table tbody td.col-split{padding-left:18px}

        /* Two-Column Middle Grid */
        .mid-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:13px}
        .mid-grid .card{margin-bottom:0;display:flex;flex-direction:column}
        .mini-table{width:100%;border-collapse:collapse}
        .mini-table thead th{padding:8px 10px;background:#e4eeeb;color:#1b332f;font-size:12.5px;font-weight:750;text-align:left}
        .mini-table thead th:first-child{border-radius:8px 0 0 8px}
        .mini-table thead th:last-child{border-radius:0 8px 8px 0;text-align:right}
        .mini-table tbody td{padding:8px 10px;border-bottom:1px solid #ebf1ef;color:#223532;font-size:13px;font-weight:550;line-height:1.2}
        .mini-table tbody td:last-child{text-align:right;font-weight:750;font-variant-numeric:tabular-nums;white-space:nowrap;color:#0f2320}
        .mini-table tbody tr.row-total td{border-bottom:0;padding-top:9px;font-weight:800;color:#0b1f1c}

        /* Value Accent Colors */
        .val-credit,.val-zero{color:#0f7c56!important}
        .val-due{color:#0f2320!important}
        .row-total .val-due{color:#b43a47!important}
        .val-paid{color:#0f7c56!important}

        /* Secure Payment Options Table */
        .pay-table{width:100%;border-collapse:collapse}
        .pay-table thead th{padding:8px 10px;background:#e4eeeb;color:#1b332f;font-size:12.5px;font-weight:750;text-align:left}
        .pay-table thead th:first-child{border-radius:8px 0 0 8px;width:30%}
        .pay-table thead th:nth-child(2){width:36%}
        .pay-table thead th:last-child{border-radius:0 8px 8px 0;width:34%}
        .pay-table tbody td{padding:8px 10px;border-bottom:1px solid #ebf1ef;color:#203330;font-size:13px;font-weight:550;vertical-align:middle}
        .pay-table tbody tr:last-child td{border-bottom:0}
        .pay-method-cell{display:flex;align-items:center;gap:10px}
        .pay-logo{width:32px;height:22px;flex:0 0 32px;object-fit:contain;border-radius:5px;background:#fff}
        .pay-logo-fallback{width:26px;height:22px;flex:0 0 26px;display:grid;place-items:center;border-radius:6px;background:#e4f2ec;color:#0f5a4f;font-size:11.5px;font-weight:800}
        .pay-method-name{color:#0d211e;font-weight:750}
        .pay-instructions-cell{color:#354c48}
        .pay-account-cell{color:#0c201d;font-weight:750;font-variant-numeric:tabular-nums;letter-spacing:.01em}

        /* Signature Split Amount Due Banner */
        .amount-banner{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 56%;align-items:stretch;min-height:60px;margin-top:auto;overflow:hidden;border:1px solid #c9dcd6;border-radius:16px;background:#eef5f3;box-shadow:0 8px 22px rgba(10,58,51,.12)}
        .amount-banner-left{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#eef5f3}
        .amount-banner-label{color:#0d221f;font-size:18px;font-weight:800;letter-spacing:-.02em}
        .amount-banner-right{position:relative;display:flex;align-items:center;justify-content:flex-end;padding:10px 24px 10px 44px;background:linear-gradient(120deg,#185e56 0%,#0b3b36 100%);color:#ffffff}
        .amount-banner-curve{position:absolute;top:0;bottom:0;left:-1px;width:42px;height:100%;display:block;pointer-events:none}
        .amount-banner-value{position:relative;z-index:1;font-size:26px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap}

        /* Estimated Total Strip */
        .estimate-strip{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:9px;padding:9px 16px;border:1px dashed #9fc3b8;border-radius:13px;background:rgba(255,255,255,.78)}
        .estimate-left{display:flex;align-items:center;gap:9px;min-width:0}
        .estimate-dot{width:24px;height:24px;flex:0 0 24px;display:grid;place-items:center;border-radius:50%;background:#e0f1eb;color:#0f5c52;font-size:12px;font-weight:800}
        .estimate-copy{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;min-width:0}
        .estimate-copy strong{color:#0f2622;font-size:13.5px;font-weight:800}
        .estimate-copy small{color:#526b65;font-size:12px;font-weight:600}
        .estimate-value{flex:0 0 auto;color:#0e4f47;font-size:17px;font-weight:850;font-variant-numeric:tabular-nums;white-space:nowrap}

        /* Footer */
        .doc-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding-top:2px;color:#556b66;font-size:12.5px;font-weight:550}
        .doc-footer strong{color:#0f2622;font-weight:800}

        @media(max-width:650px){
          body{padding:0;background:#edf4f2}
          body>.toolbar{top:auto;right:12px;bottom:12px;left:12px;justify-content:center}
          .sheet{width:100%;min-height:100svh;padding:18px 14px 76px;border:0;border-radius:0;box-shadow:none}
          .doc-header{margin-bottom:16px;gap:10px}
          .brand-logo{width:38px;height:38px;flex-basis:38px}
          .brand-logo svg{width:36px;height:36px}
          .brand-sep{height:34px}
          .brand-name{font-size:19px}
          .brand-address{font-size:10px}
          .header-month{font-size:13.5px}
          .summary-title{margin-bottom:14px;font-size:19px}
          .member-bar{padding:10px 12px;border-radius:14px;margin-bottom:12px}
          .badge-icon{width:32px;height:32px;flex-basis:32px}
          .badge-icon svg{width:16px;height:16px}
          .bar-title{font-size:14.5px}
          .member-pill{min-width:128px;padding:6px 10px;gap:8px;border-radius:11px}
          .member-pill svg{width:20px;height:20px}
          .member-pill-label{font-size:9.5px}
          .member-pill-name{font-size:14px}
          .card{margin-bottom:12px;padding:12px 12px 10px;border-radius:15px}
          .card-head{gap:9px;margin-bottom:10px}
          .card-head h2{font-size:15px}
          .breakdown-table thead th,.mini-table thead th,.pay-table thead th{padding:7px 8px;font-size:11px}
          .breakdown-table tbody td,.mini-table tbody td,.pay-table tbody td{padding:8px 8px;font-size:11.5px}
          .breakdown-table tbody td.col-split{padding-left:10px}
          .mid-grid{grid-template-columns:1fr;gap:12px;margin-bottom:12px}
          .amount-banner{min-height:56px;border-radius:14px}
          .amount-banner-label{font-size:15px}
          .amount-banner-value{font-size:21px}
          .doc-footer{margin-top:16px;font-size:11.5px}
        }

        @media print{
          html,body{width:210mm;height:100%;margin:0!important;padding:0!important;background:#edf4f2}
          body{display:block;min-height:297mm}
          body>.toolbar{display:none!important}
          .sheet{width:210mm;min-height:297mm;margin:0;padding:10mm 10mm 9mm;border:0;border-radius:0;box-shadow:none}
        }
      </style></head><body lang="en">
        <div class="toolbar" data-html2canvas-ignore="true">
          <button type="button" class="btn-save-pdf" onclick="window.saveBillAsPdf(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6m-3 3 3 3 3-3"/></svg><span>Save as PDF</span></button>
          <button type="button" class="btn-save-image" onclick="window.saveBillAsImage(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Save as image</span></button>
        </div>
        <main class="sheet">
          <svg class="sheet-watermark" viewBox="0 0 360 420" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M210 420V92l118-48v376"/>
            <path d="M110 420V165l100-38"/>
            <path d="M40 420V250l70-22"/>
            <path d="M236 130h66M236 168h66M236 206h66M236 244h66M236 282h66M236 320h66M236 358h66"/>
            <path d="M132 198h56M132 232h56M132 266h56M132 300h56M132 334h56M132 368h56"/>
            <path d="M268 78v342M160 148v272"/>
          </svg>

          <header class="doc-header">
            <div class="brand-wrap">
              <div class="brand-logo" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 29 32 9l24 20" stroke-width="3.8"/>
                  <path d="M14 26v28h36V26" stroke-width="3.8"/>
                  <path d="M32 52V31" stroke-width="2.8"/>
                  <path d="M31 42c-9-1-14-6-15-15 9 0 15 5 17 13" fill="currentColor" stroke="none"/>
                  <path d="M33 42c9-1 14-6 15-15-9 0-15 5-17 13" fill="currentColor" stroke="none"/>
                </svg>
              </div>
              <span class="brand-sep" aria-hidden="true"></span>
              <div class="brand-copy">
                <div class="brand-name">MridhaBari 6B</div>
                <div class="brand-address">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  <span>Ka/164, Kuratoli, Kuril, Vatara, Dhaka 1229</span>
                </div>
              </div>
            </div>
            <div class="header-month">${escapeHtml(month)}</div>
          </header>

          <h1 class="summary-title">Your Residence Summary - ${escapeHtml(month)}</h1>

          <section class="member-bar">
            <div class="bar-left">
              <span class="badge-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></svg>
              </span>
              <span class="bar-title">Rent &amp; Utilities</span>
            </div>
            <div class="member-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
              <div>
                <span class="member-pill-label">Member</span>
                <span class="member-pill-name">${escapeHtml(member.name)}</span>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <span class="badge-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
              </span>
              <h2>Detailed Breakdown</h2>
            </div>
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th style="width:33%">Statement Overview</th>
                  <th class="col-num" style="width:17%">Amount</th>
                  <th class="col-split" style="width:33%">Meal Details</th>
                  <th class="col-num" style="width:17%">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Room Rent + Utilities Share</td>
                  <td class="col-num">${money(rentAndUtilities)}</td>
                  <td class="col-split">Meal Cost (Your Share)</td>
                  <td class="col-num">${money(mealCost)}</td>
                </tr>
                <tr>
                  <td>Paid</td>
                  <td class="col-num">${money(rentPaid)}</td>
                  <td class="col-split">Meal Paid</td>
                  <td class="col-num">${money(mealPaid)}</td>
                </tr>
                <tr>
                  <td>Due (This Month)</td>
                  <td class="col-num ${rentDueTone}">${signedMoney(rentUtilitiesDue)}</td>
                  <td class="col-split">Balance / Credit</td>
                  <td class="col-num ${mealDueTone}">${signedMoney(mealBalance)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div class="mid-grid">
            <section class="card">
              <div class="card-head">
                <span class="badge-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V11m5 8V6m5 13v-7m5 7V4"/></svg>
                </span>
                <h2>Summary</h2>
              </div>
              <table class="mini-table">
                <thead>
                  <tr><th>Description</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  <tr><td>Rent &amp; Utilities Due</td><td class="${rentDueTone}">${signedMoney(rentUtilitiesDue)}</td></tr>
                  <tr><td>Meal Balance</td><td class="${mealDueTone}">${signedMoney(mealBalance)}</td></tr>
                  <tr><td>This Month Balance</td><td class="${currentBalanceTone}">${signedMoney(currentBalance)}</td></tr>
                  <tr><td>Previous Balance</td><td class="${prevBalanceTone}">${signedMoney(previousBalance)}</td></tr>
                  <tr class="row-total"><td>Final Balance Due</td><td class="${finalBalanceTone}">${signedMoney(finalBalance)}</td></tr>
                </tbody>
              </table>
            </section>

            <section class="card">
              <div class="card-head">
                <span class="badge-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-4 4h.01"/></svg>
                </span>
                <h2>Payment Breakdown</h2>
              </div>
              <table class="mini-table">
                <thead>
                  <tr><th>Description</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  <tr><td>Total Charges</td><td>${money(currentCharges)}</td></tr>
                  <tr><td>Rent Paid</td><td>${money(rentPaid)}</td></tr>
                  <tr><td>Meal Paid</td><td>${money(mealPaid)}</td></tr>
                  <tr class="row-total"><td>Total Paid</td><td class="val-paid">${money(totalPaid)}</td></tr>
                </tbody>
              </table>
            </section>
          </div>

          ${paymentRowsHtml ? `<section class="card">
            <div class="card-head">
              <span class="badge-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>
              </span>
              <h2>Secure Payment Options</h2>
            </div>
            <table class="pay-table">
              <thead>
                <tr><th>Method</th><th>Instructions</th><th>Details/Account</th></tr>
              </thead>
              <tbody>${paymentRowsHtml}</tbody>
            </table>
          </section>` : ""}

          <section class="amount-banner">
            <div class="amount-banner-left">
              <span class="badge-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h14a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3h12"/><path d="M16 12h6v4h-6a2 2 0 0 1 0-4Z"/></svg>
              </span>
              <span class="amount-banner-label">${finalBalance < 0 ? "Credit Balance" : "Amount Due"}</span>
            </div>
            <div class="amount-banner-right">
              <svg class="amount-banner-curve" viewBox="0 0 44 76" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 0 H44 C26 0 24 76 0 76 Z" fill="#eef5f3"/>
              </svg>
              <span class="amount-banner-value">${signedMoney(finalBalance)}</span>
            </div>
          </section>

          <section class="estimate-strip">
            <div class="estimate-left">
              <span class="estimate-dot" aria-hidden="true">≈</span>
              <div class="estimate-copy">
                <strong>Estimated Total</strong>
                <small>(if Meal Cost reaches ${money(estimatedMealTarget)})</small>
              </div>
            </div>
            <strong class="estimate-value ${toneClass(estimatedMonthDue)}">${signedMoney(estimatedMonthDue)}</strong>
          </section>

          <footer class="doc-footer">
            <span>${escapeHtml(generatedDate)}</span>
            <span>Generated by <strong>MridhaBari 6B</strong></span>
          </footer>
        </main>
      <script>
        (function() {
          var billMonth = ${JSON.stringify(month || "Monthly")};
          var billMember = ${JSON.stringify(member?.name || "Member")};
          var safeMonth = String(billMonth).trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
          var safeMember = String(billMember).trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

          function resolveHtml2Canvas() {
            return window.__html2canvas || (window.opener && window.opener.__html2canvas) || window.html2canvas;
          }

          function resolveJsPDF() {
            return window.__jsPDF || (window.opener && window.opener.__jsPDF) || (window.jspdf && window.jspdf.jsPDF);
          }

          async function ensureHtml2Canvas() {
            var lib = resolveHtml2Canvas();
            if (lib) return lib;
            for (var i = 0; i < 25; i++) {
              await new Promise(function(r) { setTimeout(r, 120); });
              lib = resolveHtml2Canvas();
              if (lib) return lib;
            }
            throw new Error("html2canvas library unavailable");
          }

          async function ensureJsPDF() {
            var lib = resolveJsPDF();
            if (lib) return lib;
            for (var i = 0; i < 25; i++) {
              await new Promise(function(r) { setTimeout(r, 120); });
              lib = resolveJsPDF();
              if (lib) return lib;
            }
            throw new Error("jsPDF library unavailable");
          }

          window.saveBillAsPdf = async function(btn) {
            if (btn && btn.disabled) return;
            var origHtml = btn ? btn.innerHTML : "";
            try {
              if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="toolbar-spinner"></span><span>Saving PDF...</span>';
              }
              if (document.fonts && document.fonts.ready) {
                try { await document.fonts.ready; } catch(e) {}
              }
              window.scrollTo(0, 0);

              var sheet = document.querySelector(".sheet");
              var h2c = await ensureHtml2Canvas();
              var JsPDF = await ensureJsPDF();

              var canvas = await h2c(sheet, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: "#ffffff",
                ignoreElements: function(el) {
                  return Boolean(el && el.classList && el.classList.contains("toolbar"));
                }
              });

              var imgData = canvas.toDataURL("image/png");
              var pdf = new JsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true
              });

              var pageWidth = 210;
              var pageHeight = 297;
              var imgWidth = pageWidth;
              var imgHeight = (canvas.height * pageWidth) / canvas.width;

              if (imgHeight <= pageHeight) {
                pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
              } else {
                var pagePixelHeight = Math.floor(canvas.width * pageHeight / pageWidth);
                var sourceY = 0;
                var pageIndex = 0;

                while (sourceY < canvas.height) {
                  var sliceHeight = Math.min(pagePixelHeight, canvas.height - sourceY);
                  var pageCanvas = document.createElement("canvas");
                  pageCanvas.width = canvas.width;
                  pageCanvas.height = sliceHeight;
                  var pageContext = pageCanvas.getContext("2d");
                  pageContext.fillStyle = "#ffffff";
                  pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                  pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

                  if (pageIndex > 0) pdf.addPage("a4", "portrait");
                  var sliceHeightMm = sliceHeight * pageWidth / canvas.width;
                  pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, sliceHeightMm, undefined, "FAST");

                  sourceY += sliceHeight;
                  pageIndex += 1;
                }
              }

              pdf.save("Monthly-Bill-" + safeMonth + "-" + safeMember + ".pdf");
            } catch (err) {
              console.error("Save as PDF error:", err);
              window.print();
            } finally {
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
              }
            }
          };

          window.saveBillAsImage = async function(btn) {
            if (btn && btn.disabled) return;
            var origHtml = btn ? btn.innerHTML : "";
            try {
              if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="toolbar-spinner"></span><span>Saving image...</span>';
              }
              if (document.fonts && document.fonts.ready) {
                try { await document.fonts.ready; } catch(e) {}
              }
              window.scrollTo(0, 0);

              var sheet = document.querySelector(".sheet");
              var h2c = await ensureHtml2Canvas();

              var canvas = await h2c(sheet, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: "#ffffff",
                ignoreElements: function(el) {
                  return Boolean(el && el.classList && el.classList.contains("toolbar"));
                }
              });

              var fileName = "Monthly-Bill-" + safeMonth + "-" + safeMember + ".png";

              if (canvas.toBlob) {
                canvas.toBlob(function(blob) {
                  if (!blob) {
                    var dataUrl = canvas.toDataURL("image/png");
                    var a = document.createElement("a");
                    a.download = fileName;
                    a.href = dataUrl;
                    a.click();
                    return;
                  }
                  var url = URL.createObjectURL(blob);
                  var a = document.createElement("a");
                  a.download = fileName;
                  a.href = url;
                  a.click();
                  setTimeout(function() { URL.revokeObjectURL(url); }, 15000);
                }, "image/png");
              } else {
                var dataUrl = canvas.toDataURL("image/png");
                var a = document.createElement("a");
                a.download = fileName;
                a.href = dataUrl;
                a.click();
              }
            } catch (err) {
              console.error("Save as image error:", err);
              alert("Could not generate image: " + (err.message || err));
            } finally {
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
              }
            }
          };
        })();
      </script>
    </body></html>`);
    reportDocument.close();
    if (popupBlocked) {
      const reportBlob = new Blob(
        [`<!doctype html>${reportDocument.documentElement.outerHTML}`],
        { type: "text/html" },
      );
      window.location.assign(URL.createObjectURL(reportBlob));
    }
  }
  async function exportMemberLastMonthBill(member) {
    const reportWindow = window.open("", "_blank");
    const popupBlocked = !reportWindow;
    const reportDocument = reportWindow
      ? reportWindow.document
      : document.implementation.createHTMLDocument("Preparing monthly bill");
    if (reportWindow) {
      reportDocument.write(
        "<!doctype html><title>Preparing monthly bill</title><p style='font:16px \"Hind Siliguri\",sans-serif;padding:32px'>Preparing monthly bill…</p>",
      );
    }
    try {
      if (!supabaseConfigured) throw new Error("Supabase is not configured.");
      const previousMonthDate = new Date();
      previousMonthDate.setDate(1);
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      const reportMonth = previousMonthDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const { data: monthRow, error: monthError } = await supabase
        .from("months")
        .select("id")
        .eq("label", reportMonth)
        .maybeSingle();
      if (monthError) throw monthError;
      if (!monthRow) throw new Error(`No monthly data found for ${reportMonth}.`);

      const [
        categoriesResult,
        paymentsResult,
        bazarsResult,
        contributionsResult,
        settlementsResult,
        mealSettingResult,
        monthUtilitiesResult,
        sharedUtilitiesResult,
        utilityCountResult,
      ] = await Promise.all([
        supabase
          .from("expense_categories")
          .select("name,amount,shared")
          .eq("month_id", monthRow.id),
        supabase
          .from("rent_payments")
          .select("user_id,amount,note,payment_type")
          .eq("month_id", monthRow.id),
        supabase
          .from("bazar_entries")
          .select("amount,paid_by,paid_from_cash")
          .eq("month_id", monthRow.id),
        supabase
          .from("cash_contributions")
          .select("amount,paid_by")
          .eq("month_id", monthRow.id),
        supabase
          .from("member_settlements")
          .select("*")
          .eq("month_id", monthRow.id),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", `meal_active_members_${reportMonth}`)
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", `shared_utilities_list_${reportMonth}`)
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "shared_utilities_list")
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "utilities_current_users")
          .maybeSingle(),
      ]);
      for (const result of [
        categoriesResult,
        paymentsResult,
        bazarsResult,
        contributionsResult,
        mealSettingResult,
        monthUtilitiesResult,
        sharedUtilitiesResult,
        utilityCountResult,
      ]) {
        if (result.error) throw result.error;
      }
      if (
        settlementsResult.error &&
        !isMissingSettlementTableError(settlementsResult.error)
      ) {
        throw settlementsResult.error;
      }

      const parseSetting = (setting, fallback) => {
        if (!setting?.value) return fallback;
        try {
          return JSON.parse(setting.value);
        } catch {
          throw new Error(`Invalid monthly settings for ${reportMonth}.`);
        }
      };
      const configuredUtilities = parseSetting(
        monthUtilitiesResult.data || sharedUtilitiesResult.data,
        null,
      );
      const utilities = Array.isArray(configuredUtilities)
        ? configuredUtilities
        : (categoriesResult.data || [])
            .filter(
              (category) =>
                String(category.name || "").toLowerCase() !== "bazar",
            )
            .map((category) => ({
              name: category.name,
              amount: category.amount,
              shared: category.shared,
            }));
      const mealMemberIds = parseSetting(mealSettingResult.data, []);
      if (!Array.isArray(mealMemberIds))
        throw new Error(`Invalid meal-member settings for ${reportMonth}.`);
      const utilityMemberCount = Number(utilityCountResult.data?.value || 4);
      if (!Number.isFinite(utilityMemberCount) || utilityMemberCount <= 0)
        throw new Error("Utility-sharing member count is invalid.");

      const sharedUtilitiesForReport = utilities.filter(
        (utility) => utility.shared && !isFlatRentName(utility.name),
      );
      const utilitiesShare = sharedUtilitiesForReport.reduce(
        (sum, utility) =>
          sum + Number(utility.amount || 0) / utilityMemberCount,
        0,
      );
      const bazars = bazarsResult.data || [];
      const contributions = contributionsResult.data || [];
      const reportSettlements = settlementsResult.error
        ? []
        : settlementsResult.data || [];
      const payments = paymentsResult.data || [];
      const rentPayments = payments
        .filter(
          (payment) =>
            payment.user_id === member.id &&
            (payment.payment_type ||
              (String(payment.note || "").toLowerCase().includes("rent")
                ? "rent"
                : "meal")) === "rent",
        )
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const mealPayments = payments
        .filter(
          (payment) =>
            payment.user_id === member.id &&
            (payment.payment_type ||
              (String(payment.note || "").toLowerCase().includes("rent")
                ? "rent"
                : "meal")) === "meal",
        )
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const mealCredits =
        bazars
          .filter(
            (bazar) =>
              !bazar.paid_from_cash && bazar.paid_by === member.id,
          )
          .reduce((sum, bazar) => sum + Number(bazar.amount || 0), 0) +
        contributions
          .filter((contribution) => contribution.paid_by === member.id)
          .reduce(
            (sum, contribution) => sum + Number(contribution.amount || 0),
            0,
          ) +
        reportSettlements
          .filter(
            (settlement) =>
              settlement.source_type === "direct" &&
              settlement.from_user_id === member.id,
          )
          .reduce(
            (sum, settlement) => sum + settlementPaidValue(settlement),
            0,
          ) -
        reportSettlements
          .filter((settlement) => settlement.to_user_id === member.id)
          .reduce(
            (sum, settlement) => sum + settlementPaidValue(settlement),
            0,
          );
      const mealCost = mealMemberIds.includes(member.id)
        ? Math.ceil(
            bazars.reduce((sum, bazar) => sum + Number(bazar.amount || 0), 0) /
              Math.max(1, mealMemberIds.length),
          )
        : 0;
      const totalMonthlyBill =
        Number(member.rent || 0) + utilitiesShare + mealCost;
      const mealPaid = mealPayments + mealCredits;
      const balanceDue = Math.ceil(
        totalMonthlyBill - rentPayments - mealPaid,
      );
      const escapeHtml = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (character) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character]);
      const utilityRows = sharedUtilitiesForReport
        .map(
          (utility) =>
            `<tr><td>${escapeHtml(utility.name)}</td><td>${money(utility.amount)}</td><td>${money(Number(utility.amount || 0) / utilityMemberCount)}</td></tr>`,
        )
        .join("");
      const generatedDate = new Date().toLocaleDateString();
      reportDocument.open();
      reportDocument.write(`<!doctype html>
        <html><head><meta charset="utf-8">
        <title>Monthly Bill · ${escapeHtml(reportMonth)} · ${escapeHtml(member.name)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
          @page{size:A4;margin:13mm}
          body{margin:0;padding:32px;color:#162a25;background:#fff;font:13px/1.5 "Hind Siliguri",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .sheet{max-width:920px;margin:0 auto}
          .toolbar{display:flex;justify-content:flex-end;margin-bottom:16px}
          .toolbar button{border:0;border-radius:9px;padding:10px 16px;background:#075d43;color:#fff;font-weight:650;cursor:pointer}
          .header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:20px 0 42px}
          .brand{display:flex;align-items:center;gap:14px}
          .brand-mark{display:grid;place-items:center;width:54px;height:54px;border-radius:17px;background:#e5f3eb;color:#075d43}
          .brand-mark svg{width:30px;height:30px}
          .brand-copy{border-left:1px solid #dfe8e2;padding-left:18px}
          h1{margin:0;color:#101820;font:700 32px/1.1 "Hind Siliguri",sans-serif;letter-spacing:-.7px}
          .brand-copy p{margin:5px 0 0;color:#44534f;font-size:16px}
          .member-tag{padding:10px 15px;border:1px solid #e6ebe7;border-radius:24px;color:#38443f;box-shadow:0 4px 14px #10271a0b;font-size:13px}
          .layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(270px,.95fr);align-items:start;gap:22px}
          .section-title{display:flex;align-items:center;gap:12px;margin:0 0 14px;font:700 25px "Hind Siliguri",sans-serif;color:#15251f}
          .section-title:before{content:"";width:4px;height:26px;border-radius:4px;background:#08734f}
          .utility-card,.summary-card,.total-card{border:1px solid #e8ece8;border-radius:17px;background:#fff;box-shadow:0 8px 22px #10271a0a;overflow:hidden}
          table{width:100%;border-collapse:collapse}
          th{padding:13px 15px;background:#f4f7f4;color:#596660;text-align:left;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
          td{padding:13px 15px;border-bottom:1px solid #edf0ed;color:#17221e}
          th:not(:first-child),td:not(:first-child){text-align:right}
          tbody tr:last-child td{border-bottom:0}
          .summary{display:grid;gap:10px}
          .total-card{padding:20px 22px;background:linear-gradient(145deg,#f7fbf8,#e8f4ec);border-color:#e1eee5}
          .total-card span{display:block;color:#63716b;font-size:14px}
          .total-card strong{display:block;margin-top:8px;color:#075d43;font:700 38px/1.1 "Hind Siliguri",sans-serif;letter-spacing:-.5px}
          .summary-card{padding:14px 16px}
          .line{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #edf0ed;color:#44514b;font-size:13px}
          .line strong{color:#17221e;font-variant-numeric:tabular-nums}
          .line.total{margin:4px -5px;padding:12px 8px;border:0;border-radius:9px;background:#edf6ef;color:#174e38;font-weight:700}
          .line.total strong{color:#075d43}
          .line:last-child{border-bottom:0}
          .line.due{margin:8px -6px -4px;padding:14px 11px;border:0;border-radius:11px;background:#075d43;color:#fff;font-weight:700}
          .line.due strong{color:#fff;font-size:18px}
          footer{display:flex;justify-content:space-between;gap:12px;margin-top:42px;padding-top:14px;border-top:1px solid #e8ece8;color:#68756f;font-size:13px}
          @media(max-width:650px){body{padding:20px}.header{align-items:flex-start;flex-direction:column;margin:8px 0 26px}.layout{grid-template-columns:1fr}.section-title{font-size:22px}.total-card strong{font-size:34px}}
          @media print{body{padding:0}.toolbar{display:none}.header{margin-top:0}.layout{grid-template-columns:minmax(0,1.3fr) minmax(260px,.9fr)}footer{margin-top:34px}}
        </style></head>
        <body><main class="sheet">
          <div class="toolbar">${popupBlocked ? '<button onclick="window.history.back()">Back to app</button>' : ''}<button onclick="window.print()">Save as PDF / Print</button></div>
          <header class="header">
            <div class="brand"><div class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M25 6C15 6 8 10 7 19c-.4 3.8 2.3 6.5 6 6 9-1 13-8 12-19Z" stroke="currentColor" stroke-width="2.5"/><path d="M8 24 20 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></div>
              <div class="brand-copy"><h1>Monthly Bill</h1><p>Monthly Hisab</p></div></div>
            <div class="member-tag">${escapeHtml(reportMonth)} · ${escapeHtml(member.name)} (${escapeHtml(member.username || "")})</div>
          </header>
          <div class="layout">
            <section><h2 class="section-title">Utilities</h2><div class="utility-card"><table>
              <thead><tr><th>Utility</th><th>Total</th><th>Your share</th></tr></thead>
              <tbody>${utilityRows || '<tr><td colspan="3">No shared utilities</td></tr>'}</tbody>
            </table></div></section>
            <section class="summary">
              <div class="total-card"><span>Total Monthly Bill</span><strong>${money(totalMonthlyBill)}</strong></div>
              <div class="summary-card">
                <div class="line"><span>Room rent</span><strong>${money(member.rent)}</strong></div>
                <div class="line"><span>Utilities share</span><strong>${money(utilitiesShare)}</strong></div>
                <div class="line"><span>Meal cost</span><strong>${money(mealCost)}</strong></div>
                <div class="line total"><span>Total monthly bill</span><strong>${money(totalMonthlyBill)}</strong></div>
                <div class="line"><span>Rent payments</span><strong>${money(rentPayments)}</strong></div>
                <div class="line"><span>Meal payments &amp; credits</span><strong>${money(mealPaid)}</strong></div>
                <div class="line due"><span>Balance due</span><strong>${money(balanceDue)}</strong></div>
              </div>
            </section>
          </div>
          <footer><span>Monthly Hisab · ${escapeHtml(reportMonth)}</span><span>Generated ${escapeHtml(generatedDate)}</span></footer>
        </main></body></html>`);
      reportDocument.close();
      if (popupBlocked) {
        const reportBlob = new Blob(
          [`<!doctype html>${reportDocument.documentElement.outerHTML}`],
          { type: "text/html" },
        );
        window.location.assign(URL.createObjectURL(reportBlob));
      }
    } catch (error) {
      if (reportWindow) reportWindow.close();
      alert(`Could not generate ${member.name}'s previous-month bill: ${error.message}`);
    }
  }
  function exportLegacyPremiumPdf() {
    const reportWindow = window.open("", "_blank");
    const popupBlocked = !reportWindow;
    const reportDocument = reportWindow
      ? reportWindow.document
      : document.implementation.createHTMLDocument("Monthly Hisab Report");
    const esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    const totalDue = allDue.reduce((s, x) => s + memberDue(x.u), 0);
    const cashTotal = (db.contributions || [])
      .filter((c) => c.month === month)
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const memberRows = allDue
      .map(
        (x) =>
          `<tr><td><strong>${esc(x.u.name)}</strong><small>${esc(x.u.username || "House member")}</small></td><td>${money(memberRentShare(x.u))}</td><td>${money(memberMealShare(x.u))}</td><td class="green">${money(memberRentPaid(x.u.id))}</td><td class="green">${money(memberMealPaid(x.u.id))}</td><td class="due">${money(memberDue(x.u))}</td></tr>`,
      )
      .join("");
    const expenseRows = db.categories
      .map(
        (c) =>
          `<tr><td>${esc(c.name)}</td><td>${c.shared ? "Shared" : "Individual"}</td><td>${money(c.name.toLowerCase() === "bazar" && monthBazar.length ? bazarTotal : c.amount)}</td></tr>`,
      )
      .join("");
    const formatBazarItems = (items) => {
      let parsedItems = items;
      if (typeof parsedItems === "string") {
        try {
          const parsed = JSON.parse(parsedItems);
          if (Array.isArray(parsed)) parsedItems = parsed;
        } catch {}
      }
      if (!Array.isArray(parsedItems)) return String(parsedItems || "");
      return parsedItems
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (!entry || typeof entry !== "object") return "";
          const item = entry.item ?? entry.name ?? entry.title;
          return typeof item === "string" ? item : item?.name ?? item?.item ?? "";
        })
        .filter(Boolean)
        .join(", ");
    };
    const bazarRows = monthBazar
      .map(
        (b) =>
          `<tr><td>${esc(b.date)}</td><td>${esc(formatBazarItems(b.items))}</td><td>${esc(db.users.find((u) => u.id === b.paidBy)?.name || "Member")}</td><td>${money(b.amount)}</td></tr>`,
      )
      .join("");
    const paymentRows = db.payments
      .filter((p) => p.month === month)
      .map(
        (p) =>
          `<tr><td>${esc(p.date || "")}</td><td>${esc(db.users.find((u) => u.id === p.userId)?.name || "Member")}</td><td>${esc(p.note || "Payment")}</td><td>${money(p.amount)}</td></tr>`,
      )
      .join("");
    const tableEmpty =
      '<tr><td colspan="5" class="empty">No records for this month</td></tr>';
    reportDocument.open();
    reportDocument
      .write(`<!doctype html><html><head><meta charset="utf-8"><title>Monthly Hisab · ${esc(month)} Report</title><style>
   @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#18233b;font:12px/1.5 "Hind Siliguri",sans-serif;background:#f4f7fc;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{max-width:900px;margin:0 auto;background:white;min-height:100vh}.hero{padding:30px 32px 26px;color:#fff;background:linear-gradient(125deg,#283b91,#4f46e5 55%,#8b5cf6);position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;right:-45px;top:-100px;background:#ffffff20}.brand{font-size:13px;text-transform:uppercase;letter-spacing:2px;font-weight:800;opacity:.85}.hero h1{font-size:29px;line-height:1.15;margin:10px 0 5px}.hero p{margin:0;color:#e4e9ff;font-size:14px}.hero .tag{display:inline-block;margin-top:17px;padding:5px 10px;border:1px solid #ffffff55;border-radius:99px;font-size:13px;font-weight:700}.content{padding:24px 30px 30px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}.stat{border:1px solid #e4e9f4;border-radius:12px;padding:13px;background:linear-gradient(145deg,#fff,#f7f8ff);border-top:3px solid #6366f1}.stat:nth-child(2){border-top-color:#8b5cf6}.stat:nth-child(3){border-top-color:#10b981}.stat:nth-child(4){border-top-color:#f59e0b}.stat span{display:block;color:#66728a;font-size:13px;margin-bottom:7px}.stat strong{font-size:18px;color:#17213a;letter-spacing:-.3px}.section{margin-top:21px;break-inside:avoid}.section h2{font-size:16px;margin:0 0 3px;color:#1e2b49}.section .sub{margin:0 0 10px;color:#77839a;font-size:13px}.section-title{display:flex;align-items:center;gap:9px}.section-title i{display:inline-block;width:4px;height:19px;border-radius:4px;background:linear-gradient(#6366f1,#a78bfa)}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;color:#fff;background:#27356f;padding:9px 8px;font-weight:700}td{padding:8px;border-bottom:1px solid #e8edf5;color:#27344d;vertical-align:top}tbody tr:nth-child(even){background:#f7f9fd}td small{display:block;color:#8a95a8;font-size:13px}.green{color:#059669;font-weight:700}.due{color:#d97706;font-weight:700}.empty{text-align:center;color:#8993a5;padding:14px}.footer{margin-top:26px;padding-top:12px;border-top:1px solid #e8edf5;display:flex;justify-content:space-between;color:#8b95a7;font-size:13px}.footer strong{color:#4f46e5}.printbar{display:flex;justify-content:flex-end;gap:8px;padding:12px 30px;background:#eef2ff}.printbar button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.printbtn{background:#4f46e5;color:#fff}.closebtn{background:#fff;color:#334155;border:1px solid #dbe2ef!important}@media print{body{background:white}.sheet{max-width:none}.printbar{display:none}.hero{padding:24px 28px}.content{padding:20px 28px}.section{break-inside:avoid}.stats{gap:8px}.stat{padding:10px}.stat strong{font-size:16px}}
   </style></head><body><div class="sheet"><div class="printbar"><button class="closebtn" onclick="${popupBlocked ? "window.history.back()" : "window.close()"}">${popupBlocked ? "Back to app" : "Close report"}</button><button class="printbtn" onclick="window.print()">Save as PDF / Print</button></div><header class="hero"><div class="brand">Monthly Hisab · Household finance</div><h1>Monthly Financial Report</h1><p>${esc(month)} · A clear snapshot of your shared home expenses</p><span class="tag">PREPARED BY RAHAT · ${esc(new Date().toLocaleDateString())}</span></header><main class="content"><div class="stats"><div class="stat"><span>Monthly bazar</span><strong>${money(bazarTotal)}</strong></div><div class="stat"><span>Total rent</span><strong>${money(totalRent)}</strong></div><div class="stat"><span>Rent paid</span><strong>${money(rentPaid)}</strong></div><div class="stat"><span>Cash contributions</span><strong>${money(cashTotal)}</strong></div></div><section class="section"><div class="section-title"><i></i><h2>Member balances</h2></div><p class="sub">Rent, shared expenses, recorded payments and estimated remaining due</p><table><thead><tr><th>Member</th><th>Rent</th><th>Individual meal</th><th>Rent paid</th><th>Meal paid</th><th>Due</th></tr></thead><tbody>${memberRows || tableEmpty}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Expense breakdown</h2></div><p class="sub">Expenses configured for ${esc(month)}</p><table><thead><tr><th>Expense</th><th>Type</th><th>Amount</th></tr></thead><tbody>${expenseRows || '<tr><td colspan="3" class="empty">No expenses configured</td></tr>'}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Monthly bazar history</h2></div><p class="sub">Recorded purchases for ${esc(month)} · total ${money(bazarTotal)}</p><table><thead><tr><th>Date</th><th>Items</th><th>Paid by</th><th>Amount</th></tr></thead><tbody>${bazarRows || '<tr><td colspan="4" class="empty">No bazar entries for this month</td></tr>'}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Member payment history</h2></div><p class="sub">Payments recorded by admin</p><table><thead><tr><th>Date</th><th>Member</th><th>Note</th><th>Amount</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="4" class="empty">No payments recorded for this month</td></tr>'}</tbody></table></section><div class="footer"><span>Designed &amp; developed by <strong>Rahat</strong> · Monthly Hisab</span><span>Private household report · ${esc(month)}</span></div></main></div><script>window.addEventListener('load',()=>{document.title='Monthly-Hisab-${esc(month).replace(/[^a-zA-Z0-9-]/g, "-")}-Report'});</script></body></html>`);
    const premiumReportStyles = reportDocument.createElement("style");
    premiumReportStyles.textContent = `
      @page{size:A4;margin:12mm}
      *{box-sizing:border-box}
      body{background:#f7f8f4;color:#17251f;font-family:"Hind Siliguri",sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
      .sheet{max-width:960px;background:#fffefa;border:1px solid #e7e9df;border-radius:18px;overflow:hidden;box-shadow:0 18px 55px rgba(27,52,38,.1)}
      .hero{padding:34px 38px 32px;background:linear-gradient(125deg,#075b40,#087a50 58%,#15946a);color:#fff}
      .hero:after{width:280px;height:280px;right:-60px;top:-130px;background:radial-gradient(circle,#ffffff22,transparent 68%)}
      .brand{font-size:13px;letter-spacing:2.2px;font-weight:700;color:#d4eee1}
      .hero h1{margin:15px 0 7px;font-size:34px;font-weight:700;letter-spacing:-1.15px}
      .hero p{font-size:15px;color:#e3f1e8}
      .hero .tag{margin-top:19px;border-color:#ffffff55;background:#ffffff12;font-size:13px;letter-spacing:.7px}
      .content{padding:28px 34px 30px}
      .stats{gap:12px;margin-bottom:26px}
      .stat{padding:16px;border:1px solid #e5e9df;border-top:3px solid #0b8154;border-radius:13px;background:linear-gradient(145deg,#fff,#f7faf5);box-shadow:0 5px 15px rgba(36,67,48,.045)}
      .stat:nth-child(2){border-top-color:#5c9b73}.stat:nth-child(3){border-top-color:#16825c}.stat:nth-child(4){border-top-color:#d39543}
      .stat span{color:#68776c;font-size:13px;text-transform:uppercase;letter-spacing:.55px}
      .stat strong{color:#13251c;font-size:18px;font-weight:700;letter-spacing:-.35px;font-variant-numeric:tabular-nums}
      .section{margin-top:24px}
      .section-title{gap:10px;margin-bottom:5px}
      .section-title i{width:4px;height:20px;background:#08764e}
      .section h2{color:#17291f;font-size:17px;font-weight:700;letter-spacing:-.2px}
      .section .sub{margin:3px 0 11px;color:#79867b;font-size:13px}
      table{border:1px solid #e4e9e1;border-radius:10px;overflow:hidden;font-size:13px}
      th{padding:10px 9px;background:#eaf1e9;color:#344b3b;font-size:13px;letter-spacing:.45px;text-transform:uppercase}
      td{padding:9px;border-bottom:1px solid #e9ede7;color:#36453b}
      tbody tr:nth-child(even){background:#f8faf6}
      td small{color:#849087}
      .green{color:#087b55}.due{color:#b96b20}
      .empty{color:#849087}
      .footer{margin-top:28px;padding-top:13px;border-color:#e4e9e1;color:#849087}
      .footer strong{color:#08764e}
      .printbar{padding:12px 34px;background:#f0f4ee}
      .printbar button{border-radius:9px;padding:10px 15px}
      .printbtn{background:#08764e;color:#fff}
      .closebtn{color:#47564b;background:#fff;border-color:#dce4da!important}
      @media(max-width:680px){.hero{padding:27px 22px}.hero h1{font-size:29px}.content{padding:22px 18px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.printbar{padding:10px 18px}}
      @media print{body{background:#fffefa!important}.sheet{max-width:none;border:0;border-radius:0;box-shadow:none}.hero{padding:24px 28px}.content{padding:20px 24px}.section{break-inside:avoid}.stats{gap:8px}.stat{padding:11px}.stat strong{font-size:16px}.printbar{display:none}}
    `;
    reportDocument.head.append(premiumReportStyles);
    reportDocument.close();
    if (popupBlocked) {
      const reportBlob = new Blob(
        [`<!doctype html>${reportDocument.documentElement.outerHTML}`],
        { type: "text/html" },
      );
      window.location.assign(URL.createObjectURL(reportBlob));
    }
  }
  function exportPremiumPdf() {
    if (previousDueLoading) {
      alert("Previous balances are still loading. Please try the PDF export again in a moment.");
      return;
    }
    const reportMembers = db.users
      .filter((member) => member.active)
      .map((member) => {
        const roomRent = roundMoney(Number(member.rent || 0));
        const utilityShare = roundMoney(utilitiesPerMember);
        const rentCharge = roundMoney(memberRentShare(member));
        const mealCharge = roundMoney(memberMealShare(member));
        const rentPayment = roundMoney(memberRentPaid(member.id));
        const mealPayment = roundMoney(memberMealPaid(member.id));
        const previousBalance = roundMoney(previousDueByUser[member.id] || 0);
        const charge = roundMoney(rentCharge + mealCharge);
        const covered = roundMoney(rentPayment + mealPayment);
        const currentBalance = roundMoney(charge - covered);
        return {
          id: member.id,
          name: member.name || "Member",
          username: member.username || "House member",
          roomRent,
          utilityShare,
          rentCharge,
          mealCharge,
          rentPaid: rentPayment,
          mealPaid: mealPayment,
          previousBalance,
          charge,
          covered,
          currentBalance,
          balance: roundMoney(currentBalance + previousBalance),
        };
      });
    const totalCharges = roundMoney(
      reportMembers.reduce((sum, member) => sum + member.charge, 0),
    );
    const totalCovered = roundMoney(
      reportMembers.reduce((sum, member) => sum + member.covered, 0),
    );
    const outstanding = roundMoney(
      reportMembers.reduce(
        (sum, member) => sum + Math.max(0, member.balance),
        0,
      ),
    );
    const pendingMemberCount = reportMembers.filter(
      (member) => member.balance > 0.01,
    ).length;
    const collectionRate = totalCharges > 0
      ? Math.min(100, (totalCovered / totalCharges) * 100)
      : 0;

    const costMix = [
      { label: "Room rent", value: roundMoney(totalRent), color: "#0b7650" },
      { label: "Meal bazar", value: roundMoney(bazarTotal), color: "#2faa7b" },
      { label: "Utilities", value: roundMoney(utilitiesTotal), color: "#d99a45" },
    ];

    const dailyBazar = new Map();
    monthBazar.forEach((entry) => {
      const dateKey = String(entry.date || "No date");
      dailyBazar.set(
        dateKey,
        roundMoney((dailyBazar.get(dateKey) || 0) + Number(entry.amount || 0)),
      );
    });
    const reportDateLabel = (value) => {
      const raw = String(value || "");
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(`${raw}T00:00:00`)
        : new Date(raw);
      if (Number.isNaN(parsed.getTime())) return raw.slice(0, 9) || "No date";
      return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
    };
    const bazarTrend = [...dailyBazar.entries()]
      .sort(([dateA], [dateB]) => {
        const timeA = Date.parse(dateA);
        const timeB = Date.parse(dateB);
        if (Number.isFinite(timeA) && Number.isFinite(timeB)) return timeA - timeB;
        return dateA.localeCompare(dateB);
      })
      .slice(-8)
      .map(([date, value]) => ({ label: reportDateLabel(date), value }));

    const utilityColors = ["#d99a45", "#4e91a8", "#7d78c9", "#cf7182", "#6f9b61"];
    const costDrivers = [
      { label: "Room rent", value: roundMoney(totalRent), color: "#0b7650" },
      { label: "Meal bazar", value: roundMoney(bazarTotal), color: "#2faa7b" },
      ...regularUtilityCategories.map((category, index) => ({
        label: category.name,
        value: roundMoney(category.amount),
        color: utilityColors[index % utilityColors.length],
      })),
    ]
      .filter((item) => Number(item.value) > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const reportUtilities = regularUtilityCategories.map((category) => {
      const total = roundMoney(category.amount);
      const paid = roundMoney(getUtilityPaidAmount(category.name, total));
      return {
        name: category.name,
        shared: Boolean(category.shared),
        total,
        paid,
        outstanding: roundMoney(Math.max(0, total - paid)),
        perMember: category.shared && utilityMemberCount > 0
          ? roundMoney(total / utilityMemberCount)
          : 0,
      };
    });
    const reportUtilitiesPaid = roundMoney(
      reportUtilities.reduce((sum, utility) => sum + Number(utility.paid || 0), 0),
    );
    const normalizeReportItems = (rawItems) => {
      let items = rawItems;
      if (typeof items === "string") {
        try {
          const parsed = JSON.parse(items);
          if (Array.isArray(parsed)) items = parsed;
        } catch {
          items = [{ item: items }];
        }
      }
      if (!Array.isArray(items)) return [];
      return items.map((entry) => {
        if (typeof entry === "string") return { name: entry, quantity: 0, unit: "", price: 0 };
        const rawName = entry?.item ?? entry?.name ?? entry?.title ?? "Bazar item";
        return {
          name: typeof rawName === "string" ? rawName : rawName?.name || rawName?.item || "Bazar item",
          quantity: roundMoney(entry?.quantity ?? entry?.qty ?? 0),
          unit: String(entry?.unit || "").trim(),
          price: roundMoney(entry?.original_price ?? entry?.price ?? entry?.amount ?? 0),
        };
      }).filter((item) => item.name);
    };
    const memberName = (memberId) =>
      db.users.find((member) => member.id === memberId)?.name || "Member";
    const reportBazarEntries = groupedMonthBazar
      .map((entry) => ({
        id: entry.id,
        date: entry.date || "",
        amount: roundMoney(entry.amount || entry.totalAmount),
        payer: entry.isCombined
          ? `Cash in Hand + ${memberName(entry.memberId)}`
          : entry.paidFromCash
            ? "Cash in Hand"
            : memberName(entry.paidBy),
        source: entry.isCombined ? "Combined" : entry.paidFromCash ? "Cash" : "Member",
        items: normalizeReportItems(entry.items),
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const reportPayments = monthPayments
      .map((payment) => ({
        date: payment.date || "",
        member: memberName(payment.userId),
        type: payment.type === "meal" ? "Meal payment" : "Rent payment",
        note: payment.note || "Payment",
        amount: roundMoney(payment.amount),
        status: "Recorded",
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const reportContributions = (db.contributions || [])
      .filter((contribution) => contribution.month === month)
      .map((contribution) => ({
        date: contribution.date || "",
        member: memberName(contribution.paidBy),
        type: "Cash contribution",
        note: contribution.note || "Cash contribution",
        amount: roundMoney(contribution.amount),
        status: "Deposited",
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const reportSettlements = monthSettlements
      .map((settlement) => ({
        date: settlement.date || "",
        member: `${memberName(settlement.fromUserId)} → ${memberName(settlement.toUserId)}`,
        type: settlement.sourceType === "cash_contribution" ? "Cash refund" : "Direct settlement",
        note: settlement.note || "Balance settlement",
        amount: roundMoney(settlement.amount),
        paid: roundMoney(settlementPaidValue(settlement)),
        remaining: roundMoney(settlementRemainingValue(settlement)),
        status: settlementStatusLabel(settlement.status),
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    openOverviewReport({
      month,
      generatedBy: user?.name || "Administrator",
      metrics: {
        totalCharges,
        totalCovered,
        outstanding,
        collectionRate,
        memberCount: reportMembers.length,
        pendingMemberCount,
        bazarTotal: roundMoney(bazarTotal),
        bazarCount: groupedMonthBazar.length,
        cashInHand: roundMoney(cashInHand),
        recordedPayments: roundMoney(totalPaid),
        averageBazar: groupedMonthBazar.length
          ? roundMoney(bazarTotal / groupedMonthBazar.length)
          : 0,
        mealMemberCount: mealActiveIds.length,
        utilitiesTotal: roundMoney(utilitiesTotal),
        utilitiesPaid: reportUtilitiesPaid,
        cashContributions: roundMoney(cashContributionsTotal),
        cashBazarSpent: roundMoney(cashBazarSpent),
        completedCashSettlements: roundMoney(completedCashSettlementTotal),
        pendingCashSettlements: roundMoney(pendingCashSettlementTotal),
      },
      costMix,
      bazarTrend,
      members: reportMembers,
      costDrivers,
      utilities: reportUtilities,
      bazarEntries: reportBazarEntries,
      payments: reportPayments,
      contributions: reportContributions,
      settlements: reportSettlements,
      libraries: { html2canvas, jsPDF },
    });
  }
  if (sessionBooting)
    return (
      <div className="app-loading-backdrop" role="status" aria-live="polite">
        <div className="app-loading-popup">
          <div className="app-loading-mark"><span className="app-loading-ring" /><span className="app-loading-core">৳</span></div>
          <div className="app-loading-title">Monthly Hisab</div>
          <div className="app-loading-caption">Preparing your account</div>
          <div className="app-loading-track"><span /></div>
        </div>
      </div>
    );
  if (!session || !user)
    return (
      <div className="login-wrap">
        <button
          type="button"
          className="theme-toggle login-theme-toggle"
          onClick={toggleColorMode}
          aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={colorMode === "dark" ? "Light mode" : "Dark mode"}
        >
          {colorMode === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="login-shell">
          <aside className="login-brand-panel">
            <div className="login-brand-name"><Home size={27} /> <strong>Monthly Hisab</strong></div>
            <h2>Manage Your<br />Shared Home Expenses</h2>
            <p>Track rent, meals, utilities and<br />member balances, all in one place.</p>
            <ul>
              <li><Users size={20} />Manage members</li>
              <li><ChartNoAxesColumn size={20} />Track expenses</li>
              <li><PieChart size={20} />See balances</li>
            </ul>
            <img className="login-cottage" src="/login-cottage.png" alt="" />
          </aside>
          <form
          className="login-card"
          onSubmit={resetMode ? requestPasswordReset : signIn}
        >
          <div className="brand-mark">
            <Home />
          </div>
          <h1>Monthly Hisab</h1>
          <p>Shared home expense manager</p>
          <label>
            Username
            <input
              autoComplete="username"
              value={login.username}
              onChange={(e) => setLogin({ ...login, username: e.target.value })}
              required
            />
          </label>
          {!resetMode && (
            <label>
              Password
              <div className="password-field">
                <input
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  value={login.password}
                  onChange={(e) =>
                    setLogin({ ...login, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
          )}
          {error && !authBusy && <div className="error">{error}</div>}
          {authMessage && <div className="success-message">{authMessage}</div>}
          <button className={`primary full login-submit${authBusy ? " is-loading" : ""}`} disabled={authBusy}>
            {authBusy
              ? <><span className="login-spinner" aria-hidden="true" />{resetMode ? "Sending reset link…" : "Signing in…"}</>
              : resetMode
                ? "Send reset link"
                : "Login"}
          </button>
          <button
            type="button"
            className="login-link"
            onClick={() => {
              setResetMode((v) => !v);
              setError("");
              setAuthMessage("");
            }}
          >
            {resetMode ? "Back to login" : "Forgot password?"}
          </button>
          <img className="login-mobile-cottage" src="/login-cottage.png" alt="" />
          <div className="login-footer-credit">Designed &amp; developed by <strong>Rahat</strong> · Monthly Hisab</div>
        </form>
        </div>
      </div>
    );
  const nav = [
    ...(admin ? [["overview", "Overview", LayoutDashboard]] : []),
    ["my-account", "My Account", Wallet],
    ["settlements", "Meal Settlement", ArrowUpDown],
    ["bazar", "Monthly Bazar", Receipt],
    ["bazar-report", "Monthly Bazar Report", ChartNoAxesColumn],
    ["contacts", "Contacts", Users],
    ["inbox", "Inbox", MessageCircle],
    ...(!admin ? [["pay-rent", "Pay your rent", Wallet]] : []),
    ...(admin
      ? [
          ["admin-toggle", "Admin Management", Settings],
          ...(adminOpen
            ? [
                ["members", "Members", Users],
                ["expenses", "Utilities", Receipt],
                ["payments", "Payments & Cash", ArrowDownRight],
                ["payment-options", "Payments & Contacts", Wallet],
                ["notices", "Notices", Bell],
              ]
            : []),
        ]
      : []),
  ];
  const headerIconByPage = {
    overview: LayoutDashboard,
    "my-account": Wallet,
    settlements: Utensils,
    bazar: ShoppingBasket,
    "bazar-report": ChartNoAxesColumn,
    contacts: Phone,
    inbox: MessageCircle,
    "pay-rent": CreditCard,
    members: Users,
    expenses: Zap,
    payments: Wallet,
    "payment-options": Settings,
    notices: Megaphone,
  };
  const headerSubtitleByPage = {
    overview: "Monthly summary of rent, meals, and bills",
    settlements: "Current meal balance of all members",
    bazar: "Daily groceries, expenses & shopping list",
    "bazar-report": "Spending trends and item-by-item usage",
    contacts: "Flatmates, staff, and emergency numbers",
    inbox: "Direct messages with your housemates",
    "pay-rent": "Payment accounts for sending monthly rent",
    members: "Household accounts, roles & room rents",
    expenses: "Flat rent and shared monthly utilities",
    payments: "Rent payments and member cash deposits",
    "payment-options": "Member payment methods & saved contacts",
    notices: "Bulletin banners & household announcements",
    monthly: "Active members & monthly expense shares",
  };
  const ActiveHeaderIcon = headerIconByPage[page] || nav.find(([key]) => key === page)?.[2] || Home;
  const activeHeaderTitle = page === "settlements"
    ? "Member meal balances"
    : nav.find(([key]) => key === page)?.[1] || "My Account";
  const activeHeaderSubtitle = headerSubtitleByPage[page] || "Manage your home, one month at a time.";
  return (
    <div id="app-shell" className="app premium-theme">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand sidebar-property-card">
          <div className="brand-mark sidebar-property-mark">
            <Home className="sidebar-residence-home-icon" size={36} aria-hidden="true" />
          </div>
          <div className="sidebar-property-copy">
            <b>MridhaBari 6B</b>
            <span className="sidebar-property-address-line">Ka/164, Kuratoli, Kuril, Vatara, Dhaka 1229</span>
          </div>
          <button
            className="icon-btn mobile-close"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        {nav.map(([key, label, Icon]) => (
          <button
            key={key}
            className={
              `nav-item nav-${key} ` +
              (page === key ? "active" : "") +
              ([
                "members",
                "expenses",
                "payments",
                "cash",
                "notices",
                "payment-options",
              ].includes(key)
                ? " admin-subitem"
                : "") +
              (key === "admin-toggle" ? " admin-parent" : "")
            }
            onClick={() => {
              if (key === "admin-toggle") {
                setAdminOpen((v) => !v);
                return;
              }
              setPage(key);
              setMenu(false);
            }}
          >
            <Icon size={18} />
            {label}
            {key === "inbox" && inboxUnreadCount > 0 && (
              <span className="inbox-nav-badge" aria-label={`${inboxUnreadCount} unread messages`}>
                {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
              </span>
            )}
            {key === "admin-toggle" && (
              <span className="nav-chevron">{adminOpen ? "−" : "+"}</span>
            )}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="sidebar-account-row">
            <div className="sidebar-account-card">
              <button className="profile profile-trigger premium-sidebar-profile" type="button" onClick={() => { setProfileOpen(true); setProfileError(""); setProfileMessage(""); }}>
                <span className="sidebar-profile-avatar">
                  {profilePhoto ? <img className="avatar profile-avatar-image" src={profilePhoto} alt="" /> : <span className="avatar">{user.name[0]}</span>}
                  <i aria-hidden="true" />
                </span>
                <span className="profile-trigger-info">
                  <b>{user.name}</b>
                </span>
                <ChevronRight className="sidebar-profile-chevron" size={16} aria-hidden="true" />
              </button>
              <button className="sidebar-logout-btn" type="button" aria-label="Logout" title="Logout" onClick={(e) => { e.stopPropagation(); logout(); }}><LogOut size={18}/></button>
            </div>
          </div>
        </div>
      </aside>
      {profileOpen && (
        <div className="profile-modal-backdrop">
          <section className="profile-modal" role="dialog" aria-modal="true" aria-label="Profile settings" onClick={e => e.stopPropagation()}>
            <header className="profile-modal-header">
              <div><span className="eyebrow">YOUR ACCOUNT</span><h2>Profile settings</h2><p>Photo, email and password</p></div>
              <div className="profile-modal-header-actions">
                
                <button className="icon-btn bazar-action" type="button" aria-label="Close profile settings" onClick={() => setProfileOpen(false)}><X size={18}/></button>
              </div>
            </header>
            <section className="panel profile-settings-panel">
              <div className="profile-settings-photo">
                {profilePhoto ? <img src={profilePhoto} alt="Profile" /> : <div className="avatar profile-large">{user.name?.[0] || "M"}</div>}
                <label className="btn secondary profile-upload-label">
                  <ImagePlus size={16} /> {profilePhotoBusy ? "Uploading photo…" : "Change photo"}
                  <input type="file" accept="image/*" onChange={uploadProfilePhoto} disabled={profilePhotoBusy} />
                </label>
              </div>
              <form className="profile-settings-form" onSubmit={updateProfileEmail}>
                <label>Email address<input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="Enter new email" required /></label>
                <button className="btn secondary" disabled={profileBusy || !profileEmail.trim()}>Update email</button>
              </form>
              <form className="profile-settings-form" onSubmit={updateProfilePassword}>
                <label>Current password<div className="password-field-wrap"><input type={showCurrentPassword ? "text" : "password"} value={profileCurrentPassword} onChange={e => setProfileCurrentPassword(e.target.value)} placeholder="Enter current password" required /><button type="button" className="password-eye-btn" aria-label={showCurrentPassword ? "Hide current password" : "Show current password"} onClick={() => setShowCurrentPassword(v => !v)}>{showCurrentPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
                <label>New password<div className="password-field-wrap"><input type={showNewPassword ? "text" : "password"} value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Enter new password" required /><button type="button" className="password-eye-btn" aria-label={showNewPassword ? "Hide new password" : "Show new password"} onClick={() => setShowNewPassword(v => !v)}>{showNewPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
                <label>Confirm new password<div className="password-field-wrap"><input type={showConfirmPassword ? "text" : "password"} value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} placeholder="Repeat new password" required /><button type="button" className="password-eye-btn" aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} onClick={() => setShowConfirmPassword(v => !v)}>{showConfirmPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
                <button type="submit" className="btn secondary" disabled={profileBusy || !profileCurrentPassword || !profilePassword || !profileConfirmPassword}>{profileBusy ? "Updating password…" : "Change password"}</button>
              </form>
              {profileError && <div className="error">{profileError}</div>}
              {profileMessage && <div className="success-message">{profileMessage}</div>}
            </section>
          </section>
        </div>
      )}
      {page === "bazar-report" && bazarUsageDetailsItem && (
        <div
          className="modal-backdrop bazar-usage-details-backdrop"
          role="presentation"
          onClick={() => setBazarUsageDetailsItem(null)}
        >
          <section
            className="modal panel bazar-usage-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bazar-usage-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="bazar-usage-details-close-icon"
              aria-label="Close item details"
              onClick={() => setBazarUsageDetailsItem(null)}
            >
              <X size={19} />
            </button>
            <div className="bazar-usage-details-head">
              <span className="bazar-usage-details-icon" aria-hidden="true">
                {renderBazarReportIcon(bazarUsageDetailsItem.name, 58)}
              </span>
              <div>
                <small>Monthly bazar item</small>
                <h3 id="bazar-usage-details-title">{bazarUsageDetailsItem.name}</h3>
                <p>
                  {bazarUsageDetailsItem.count}× bought
                  {bazarUsageDetailsItem.qtySummary
                    ? ` • ${bazarUsageDetailsItem.qtySummary}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="bazar-usage-details-summary">
              <div>
                <span>Total amount</span>
                <strong>{money(bazarUsageDetailsItem.totalSpent)}</strong>
              </div>
              <div>
                <span>Total quantity</span>
                <strong>{bazarUsageDetailsItem.qtySummary || "—"}</strong>
              </div>
            </div>
            {Array.isArray(bazarUsageDetailsItem.subItems) &&
            bazarUsageDetailsItem.subItems.length > 0 ? (
              <div className="bazar-usage-details-list">
                {bazarUsageDetailsItem.subItems.map((sub) => (
                  <article className="bazar-usage-details-row" key={sub.key}>
                    <span className="bazar-usage-details-row-icon" aria-hidden="true">
                      {renderBazarItemIcon(
                        `${bazarUsageDetailsItem.name} - ${sub.name}`,
                        28,
                      )}
                    </span>
                    <div>
                      <strong>{sub.name}</strong>
                      <small>
                        {sub.count}× bought
                        {sub.qtySummary ? ` • ${sub.qtySummary}` : ""}
                      </small>
                    </div>
                    <b>{money(sub.totalSpent)}</b>
                  </article>
                ))}
              </div>
            ) : (
              <p className="bazar-usage-details-empty">
                No separate sub-item breakdown was recorded for this item.
              </p>
            )}
            <button
              type="button"
              className="secondary full bazar-usage-details-close"
              onClick={() => setBazarUsageDetailsItem(null)}
            >
              Close
            </button>
          </section>
        </div>
      )}
      <main className={page === "overview" ? "main overview-page" : page === "my-account" ? "main my-account-page" : page === "settlements" ? "main settlement-page" : page === "contacts" ? "main contacts-page" : page === "inbox" ? "main inbox-page" : page === "pay-rent" ? "main pay-rent-app-page" : page === "bazar" ? "main bazar-page" : page === "bazar-report" ? "main bazar-report-page" : page === "payments" ? "main payments-page" : "main"}>
        <header className={`app-page-header ${page === "my-account" ? "account-header " : ""}${page === "overview" ? "overview-page-header" : ""}${page === "settlements" ? "settlement-page-header" : ""}`}>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label="Open navigation menu"
            onClick={() => setMenu(true)}
          >
            <Menu size={22} strokeWidth={2.25} />
          </button>
          {page !== "my-account" && page !== "overview" && page !== "settlements" && page !== "bazar" && (
            <div className="app-page-heading page-heading-with-mark header-page-heading">
              <span className={`page-heading-mark page-heading-mark-${page}`} aria-hidden="true">
                <span className="page-heading-mark-inner">
                  <ActiveHeaderIcon size={21} />
                </span>
              </span>
              <h2>{activeHeaderTitle}</h2>
              <p>{activeHeaderSubtitle}</p>
            </div>
          )}
          <div className="header-actions">
            <button
              type="button"
              className="icon-btn header-theme-toggle"
              onClick={toggleColorMode}
              aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={colorMode === "dark" ? "Light mode" : "Dark mode"}
            >
              {colorMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="notice-bell-wrap" ref={noticeBellWrapRef}>
              <button
                className="icon-btn notice-bell"
                onClick={toggleNoticePanel}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadNotifications.length > 0 && (
                  <span className="notice-badge">
                    {unreadNotifications.length > 9
                      ? "9+"
                      : unreadNotifications.length}
                  </span>
                )}
              </button>
              {noticePanelOpen && (
                <div className="notice-popover">
                  <div className="notice-popover-head">
                    <div className="notice-popover-heading">
                      <span className="notice-popover-heading-icon" aria-hidden="true">
                        <Bell size={17} />
                      </span>
                      <span className="notice-popover-heading-copy">
                        <b>Notifications</b>
                        <small>
                          {publishedNotifications.length
                            ? `${unreadNotifications.length} unread · ${publishedNotifications.length} total`
                            : "You're all caught up"}
                        </small>
                      </span>
                    </div>
                    <button
                      className="icon-btn bazar-action notice-popover-close"
                      onClick={() => setNoticePanelOpen(false)}
                      aria-label="Close notifications"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="notice-popover-tools">
                    <button
                      className="read-all-btn"
                      onClick={() => markAllNoticesRead(user.id)}
                      disabled={noticeReadBusy || !unreadNotifications.length}
                    >
                      <span className="notice-action-icon" aria-hidden="true">
                        <Check size={15} strokeWidth={2.4} />
                      </span>
                      <span className="notice-action-label">
                        {noticeReadBusy ? "Saving…" : "Mark all read"}
                      </span>
                    </button>
                    <button
                      className="clear-all-btn"
                      onClick={() => clearAllNotifications(user.id)}
                      disabled={noticeReadBusy || !publishedNotifications.length}
                    >
                      <span className="notice-action-icon" aria-hidden="true">
                        <PremiumDeleteIcon size={15} />
                      </span>
                      <span className="notice-action-label">Clear all</span>
                    </button>
                  </div>
                  <div className="notice-popover-list">
                    {publishedNotifications.length ? (
                      publishedNotifications.map((n) => (
                        <article
                          className={
                            `notice-mini notice-kind-${n.kind || "announcement"} ` +
                            (readNoticeIds.includes(n.id)
                              ? "is-read"
                              : "is-unread") +
                            (isBazarNotification(n) ? " is-actionable" : "")
                          }
                          key={n.id}
                          role={isBazarNotification(n) ? "button" : undefined}
                          tabIndex={isBazarNotification(n) ? 0 : undefined}
                          aria-label={isBazarNotification(n) ? `View bazar details: ${getNotificationBody(n, user)}` : undefined}
                          onClick={isBazarNotification(n) ? () => void handleNotificationClick(n) : undefined}
                          onKeyDown={isBazarNotification(n) ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              void handleNotificationClick(n);
                            }
                          } : undefined}
                        >
                          <span className={`notice-mini-icon notice-mini-icon-${n.activity_type || "announcement"}`}>
                            <NotificationGlyph notification={n} />
                          </span>
                          <div className="notice-mini-content">
                            <div className="notice-mini-title">
                              <b>{n.title || "Notice"}</b>
                              {!readNoticeIds.includes(n.id) && (
                                <span className="unread-dot" title="Unread" />
                              )}
                            </div>
                            <p>{getNotificationBody(n, user)}</p>
                            <small>{formatNotificationTime(n.created_at)}</small>
                            {n.image_url && (
                              <img src={n.image_url} alt="Notice attachment" />
                            )}
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="notice-empty">
                        <span aria-hidden="true"><CheckCircle2 size={18} /></span>
                        No notifications yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="month-picker" ref={monthPickerRef}>
              <button
                type="button"
                className="month-picker-trigger"
                ref={monthPickerTriggerRef}
                aria-haspopup="listbox"
                aria-expanded={monthMenuOpen}
                aria-controls="month-picker-options"
                onClick={() => setMonthMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setMonthMenuOpen(false);
                  if (event.key === "ArrowDown" && !monthMenuOpen) {
                    event.preventDefault();
                    setMonthMenuOpen(true);
                    requestAnimationFrame(() => monthPickerRef.current?.querySelector('[role="option"]')?.focus());
                  }
                }}
              >
                <CalendarDays size={17} aria-hidden="true" />
                <span className="month-picker-value">
                  {isPhoneView ? month.replace(/^([A-Za-z]{3})[A-Za-z]*\s+/, "$1 ") : month}
                </span>
                <ChevronRight className={`month-picker-chevron${monthMenuOpen ? " is-open" : ""}`} size={16} aria-hidden="true" />
              </button>
              {monthMenuOpen && (
                <div
                  className="month-picker-menu"
                  id="month-picker-options"
                  role="listbox"
                  aria-label="Select month"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setMonthMenuOpen(false);
                      monthPickerTriggerRef.current?.focus();
                      return;
                    }
                    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const options = Array.from(event.currentTarget.querySelectorAll('[role="option"]'));
                    const currentIndex = options.indexOf(document.activeElement);
                    const nextIndex = event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? options.length - 1
                        : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                    options[nextIndex]?.focus();
                  }}
                >
                  <span className="month-picker-label">SELECT MONTH</span>
                  {monthChoices.map((choice) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={month === choice}
                      className={`month-picker-option${month === choice ? " is-selected" : ""}`}
                      key={choice}
                      onClick={async () => {
                        setMonth(choice);
                        setMonthMenuOpen(false);
                        requestAnimationFrame(() => monthPickerTriggerRef.current?.focus());
                        if (session?.id) await loadCloudData(session.id, choice);
                      }}
                    >
                      <CalendarDays size={16} aria-hidden="true" />
                      <span>{choice}</span>
                      {month === choice && <CheckCircle2 size={16} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={`header-page-tools header-page-tools-${page}`}>
            {page === "bazar" && (
              <>
                <div className="app-page-heading page-heading-with-mark header-page-heading bazar-header-heading">
                  <span className="page-heading-mark page-heading-mark-bazar" aria-hidden="true">
                    <span className="page-heading-mark-inner">
                      <ShoppingBasket size={21} />
                    </span>
                  </span>
                  <h2>Monthly Bazar</h2>
                  <p>{headerSubtitleByPage.bazar}</p>
                </div>
                <div className="bazar-header-actions">
                  <button
                    type="button"
                    className={`secondary bazar-needed-trigger${showBazarNeeded ? " is-active" : ""}`}
                    aria-controls="bazar-needed-panel"
                    aria-expanded={showBazarNeeded}
                    onClick={toggleBazarNeededPanel}
                  >
                    <ShoppingBasket size={16} />
                    <span>Need to buy</span>
                    <small>{bazarNeededItems.filter((item) => !item.done).length}</small>
                  </button>
                  <button type="button" className="primary bazar-header-add" onClick={() => {
                    setBazarActionMenuId(null);
                    setBazarForm((form) => ({ ...form, date: todayForDateInput() }));
                    setShowAddBazar(true);
                  }}><Plus size={16}/> Add Bazar</button>
                </div>
              </>
            )}
            {page === "settlements" && (
              <div className="app-page-heading page-heading-with-mark header-page-heading settlement-header-heading">
                <span className="page-heading-mark page-heading-mark-settlements" aria-hidden="true">
                  <span className="page-heading-mark-inner">
                    <Utensils size={21} />
                  </span>
                </span>
                <h2>Member meal balances</h2>
                <p>Current meal balance of all members</p>
              </div>
            )}
            {page === "overview" && admin && (
              <>
                <div className="app-page-heading page-heading-with-mark header-page-heading overview-header-heading">
                  <span className="page-heading-mark page-heading-mark-overview" aria-hidden="true">
                    <span className="page-heading-mark-inner">
                      <LayoutDashboard size={21} />
                    </span>
                  </span>
                  <h2>Overview</h2>
                  <p>{headerSubtitleByPage.overview}</p>
                </div>
                <div className="welcome-actions">
                  <button className="secondary overview-export-btn overview-export-csv" onClick={exportCsv}>
                    <Download size={16} /> Export CSV
                  </button>
                  <button className="primary overview-export-btn overview-export-pdf" onClick={exportPremiumPdf}>
                    <Download size={16} /> Export PDF
                  </button>
                  <button
                    type="button"
                    className="danger reset-month-btn overview-export-btn overview-reset-btn"
                    onClick={resetMonth}
                  >
                    <RotateCcw size={16} /> Reset Hisab
                  </button>
                </div>
              </>
            )}
            {page === "my-account" && (
              <>
                <div className="account-header-welcome">
                  <span className="eyebrow">PERSONAL ACCOUNT</span>
                  <h1>Hello, {user.name}<span className="account-wave" aria-hidden="true"> 👋</span></h1>
                  <p>Your room rent, utilities, and meal cost for {month}.</p>
                </div>
                <div className="account-welcome-actions">
                  <AccountTodayCard />
                  <button className="btn secondary account-pdf-btn" type="button" onClick={() => exportMemberBill(user)}>
                    <span className="account-pdf-icon" aria-hidden="true"><Download size={16} /></span>
                    <span className="account-pdf-copy"><strong>Export PDF</strong><small>Monthly report</small></span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        {page === "overview" && admin && (
          <div className="overview-mobile-actions" aria-label="Overview export actions">
            <button className="secondary overview-export-btn overview-export-csv" onClick={exportCsv}>
              <Download size={16} /> Export CSV
            </button>
            <button className="primary overview-export-btn overview-export-pdf" onClick={exportPremiumPdf}>
              <Download size={16} /> Export PDF
            </button>
            <button
              type="button"
              className="danger reset-month-btn overview-export-btn overview-reset-btn"
              onClick={resetMonth}
            >
              <RotateCcw size={16} /> Reset Hisab
            </button>
          </div>
        )}
        {page === "my-account" && (
          <div className="account-mobile-actions" aria-label="My Account date and report actions">
            <AccountTodayCard />
            <button className="btn secondary account-pdf-btn" type="button" onClick={() => exportMemberBill(user)}>
              <span className="account-pdf-icon" aria-hidden="true"><Download size={16} /></span>
              <span className="account-pdf-copy"><strong>Export PDF</strong><small>Monthly report</small></span>
            </button>
          </div>
        )}
        {page === "bazar" && (
          <div className="bazar-mobile-actions" aria-label="Bazar quick actions">
            <button
              type="button"
              className={`secondary bazar-needed-trigger${showBazarNeeded ? " is-active" : ""}`}
              aria-controls="bazar-needed-panel"
              aria-expanded={showBazarNeeded}
              onClick={toggleBazarNeededPanel}
            >
              <ShoppingBasket size={16} />
              <span>Need to buy</span>
              <small>{bazarNeededItems.filter((item) => !item.done).length}</small>
            </button>
            <button
              type="button"
              className="primary bazar-header-add"
              onClick={() => {
                setBazarActionMenuId(null);
                setBazarForm((form) => ({ ...form, date: todayForDateInput() }));
                setShowAddBazar(true);
              }}
            >
              <Plus size={16} /> Add Bazar
            </button>
          </div>
        )}
        {page === "overview" && admin && (
          <>
            <div className="stats overview-stats">
              <Stat
                title="Total Rent"
                value={money(totalRent + utilitiesTotal)}
                icon={Home}
                watermarkIcon={Home}
                tone="purple"
                hint="Rent + utilities"
                className="summary-stat summary-indigo"
                showAction
              />
              <Stat
                title="Rent Paid"
                value={money(utilitiesPaidTotal)}
                icon={ArrowDownRight}
                watermarkIcon={CheckCircle2}
                tone="green"
                hint="Utilities paid"
                className="summary-stat summary-cyan"
                showAction
                actionKind="check"
              />
              <Stat
                title="Rent in Hand"
                value={money(rentInHand)}
                icon={Wallet}
                watermarkIcon={Wallet}
                tone="green"
                hint="Available rent"
                className="summary-stat summary-green"
                showAction
              />
              <Stat
                title="Rent Due"
                value={money(Math.max(0, totalRent + utilitiesTotal - rentPaid))}
                icon={Wallet}
                watermarkIcon={TriangleAlert}
                tone="orange"
                hint="Outstanding rent"
                className="summary-stat summary-amber"
                showAction
                actionKind="alert"
              />
              <Stat
                title="Meal Cost"
                value={money(bazarTotal)}
                icon={Receipt}
                watermarkIcon={ShoppingBasket}
                tone="blue"
                hint="Monthly bazar"
                className="summary-stat summary-rose"
                showAction
              />
              <Stat
                title="Cash in Hand"
                value={money(cashInHand)}
                icon={Wallet}
                watermarkIcon={Wallet}
                tone="purple"
                hint="Available cash"
                className="summary-stat summary-violet"
                showAction
              />
            </div>
            <div className="grid-two">
              <section className="panel member-balances-panel overview-member-panel">
                <div className="overview-panel-heading">
                  <span className="overview-panel-icon"><Users size={20} /></span>
                  <PanelHead
                    title="Member balances"
                    sub="Rent includes room rent + utilities; meal cost is shared separately"
                  />
                </div>
                <div className="table-wrap">
                  <table className="member-balances-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Rent</th>
                        <th>Ind. meal</th>
                        <th>Rent paid</th>
                        <th>Meal paid</th>
                        <th>Prev. due</th>
                        <th>Due</th>
                        <th className="member-balance-report-col">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDue.map((x) => (
                        <tr key={x.u.id}>
                          <td>
                            <div className="person">
                              {x.u.photo_url ? (
                                <img
                                  className="avatar small profile-avatar-image"
                                  src={x.u.photo_url}
                                  alt=""
                                />
                              ) : (
                                <span className="avatar small">
                                  {x.u.name[0]}
                                </span>
                              )}
                              <b>{x.u.name}</b>
                            </div>
                            <div className="mobile-balance-actions">
                              <span className="mobile-due">
                                {money(memberDue(x.u) + (previousDueByUser[x.u.id] || 0))}
                              </span>
                              <button
                                type="button"
                                className="icon-btn member-report-download mobile-report-download"
                                title={`Download ${x.u.name} ${month} bill PDF`}
                                aria-label={`Download ${x.u.name} ${month} bill PDF`}
                                onClick={() => exportMemberBill(x.u)}
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </td>
                          <td>{money(memberRentShare(x.u))}</td>
                          <td>{money(memberMealShare(x.u))}</td>
                          <td className="green-text">{money(memberRentPaid(x.u.id))}</td>
                          <td className="green-text">{money(memberMealPaid(x.u.id))}</td>
                          <td>{previousDueLoading ? "Loading…" : money(previousDueByUser[x.u.id] || 0)}</td>
                          <td className="due">{money(memberDue(x.u) + (previousDueByUser[x.u.id] || 0))}</td>
                          <td className="member-balance-report-cell">
                            <button
                              type="button"
                              className="icon-btn member-report-download"
                              title={`Download ${x.u.name} ${month} bill PDF`}
                              aria-label={`Download ${x.u.name} ${month} bill PDF`}
                              onClick={() => exportMemberBill(x.u)}
                            >
                              <Download size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel overview-utilities-panel">
                <div className="overview-panel-heading overview-utilities-heading">
                  <div className="overview-utilities-heading-main">
                    <span className="overview-panel-icon"><Zap size={20} /></span>
                    <PanelHead title="Utilities breakdown" />
                  </div>
                  <div className="overview-utilities-total-badge" aria-label="Total utilities">
                    <span>Total utilities</span>
                    <strong>{money(utilitiesTotal)}</strong>
                  </div>
                </div>
                <div className="overview-utilities-list">
                {(() => {
                  const flatPaid = getUtilityPaidAmount(FLAT_RENT_NAME, flatRentAmount);
                  const flatIsPaid = flatRentAmount > 0 && flatPaid >= flatRentAmount;
                  const flatIsPartial = flatPaid > 0 && flatPaid < flatRentAmount;
                  return (
                    <div className={`break-row utility-payment-row flat-rent-payment-row tone-${getUtilityTone(FLAT_RENT_NAME)}${flatIsPaid ? " is-paid" : flatIsPartial ? " is-partial" : " is-unpaid"}`}>
                      <div
                        className="utility-payment-check"
                        role={admin && flatRentAmount > 0 ? "button" : undefined}
                        tabIndex={admin && flatRentAmount > 0 ? 0 : undefined}
                        onClick={() => {
                          if (!admin || flatRentAmount <= 0) return;
                          void saveUtilityPaidStatus(FLAT_RENT_NAME, !flatIsPaid, true);
                        }}
                        onKeyDown={(event) => {
                          if (!admin || flatRentAmount <= 0) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void saveUtilityPaidStatus(FLAT_RENT_NAME, !flatIsPaid, true);
                          }
                        }}
                        title={admin && flatRentAmount > 0 ? (flatIsPaid ? "Click to mark unpaid" : "Click to mark fully paid") : undefined}
                      >
                        <span className={`utility-category-icon tone-${getUtilityTone(FLAT_RENT_NAME)}`} aria-hidden="true">
                          <Home size={19} />
                        </span>
                        <span className="utility-category-name">{FLAT_RENT_NAME}</span>
                      </div>
                      <b className="utility-partial-amount">
                        <input
                          type="number"
                          className="utility-paid-input"
                          min="0"
                          max={Math.max(0, flatRentAmount)}
                          step="any"
                          placeholder="0"
                          aria-label={`Paid amount for ${FLAT_RENT_NAME}`}
                          disabled={!admin || flatRentAmount <= 0}
                          value={flatPaid > 0 ? flatPaid : ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === "") {
                              void saveUtilityPaidStatus(FLAT_RENT_NAME, 0, false);
                              return;
                            }
                            const clamped = Math.min(Math.max(0, Number(raw) || 0), Math.max(0, flatRentAmount));
                            void saveUtilityPaidStatus(FLAT_RENT_NAME, clamped >= flatRentAmount && flatRentAmount > 0 ? true : clamped, false);
                          }}
                        />
                        <span className="utility-paid-slash">/</span>
                        <span className="utility-total-value">{money(flatRentAmount)}</span>
                      </b>
                      <button
                        type="button"
                        className={`utility-status-pill${flatIsPaid ? " is-paid" : flatIsPartial ? " is-partial" : " is-unpaid"}`}
                        disabled={!admin || flatRentAmount <= 0}
                        onClick={() => void saveUtilityPaidStatus(FLAT_RENT_NAME, !flatIsPaid, true)}
                        title={admin && flatRentAmount > 0 ? (flatIsPaid ? "Mark unpaid" : "Mark fully paid") : undefined}
                      >
                        {flatRentAmount <= 0 ? (
                          <span>Not set</span>
                        ) : flatIsPaid ? (
                          <>
                            <span className="utility-status-badge-icon check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                            <span>Paid</span>
                          </>
                        ) : flatIsPartial ? (
                          <>
                            <span className="utility-status-badge-icon alert" aria-hidden="true">!</span>
                            <span>Due {money(flatRentAmount - flatPaid)}</span>
                          </>
                        ) : (
                          <>
                            <span className="utility-status-badge-icon alert" aria-hidden="true">!</span>
                            <span>Unpaid</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}
                {regularUtilityCategories.map((c) => {
                  const catTotal = c.name.toLowerCase() === "bazar" && monthBazar.length ? bazarTotal : Number(c.amount || 0);
                  const paidAmt = getUtilityPaidAmount(c.name, catTotal);
                  const isPaid = catTotal > 0 && paidAmt >= catTotal;
                  const isPartial = paidAmt > 0 && paidAmt < catTotal;
                  const UtilityIcon = getUtilityIcon(c.name);
                  const tone = getUtilityTone(c.name);
                  return (
                    <div className={`break-row utility-payment-row tone-${tone}${isPaid ? " is-paid" : isPartial ? " is-partial" : " is-unpaid"}`} key={c.id || c.name}>
                      <div
                        className="utility-payment-check"
                        role={admin && catTotal > 0 ? "button" : undefined}
                        tabIndex={admin && catTotal > 0 ? 0 : undefined}
                        onClick={() => {
                          if (!admin || catTotal <= 0) return;
                          void saveUtilityPaidStatus(c.name, !isPaid, true);
                        }}
                        onKeyDown={(event) => {
                          if (!admin || catTotal <= 0) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void saveUtilityPaidStatus(c.name, !isPaid, true);
                          }
                        }}
                        title={admin && catTotal > 0 ? (isPaid ? "Click to mark unpaid" : "Click to mark fully paid") : undefined}
                      >
                        <span className={`utility-category-icon tone-${tone}`} aria-hidden="true">
                          <UtilityIcon size={19} />
                        </span>
                        <span className="utility-category-name">{c.name}</span>
                      </div>
                      <b className="utility-partial-amount">
                        <input
                          type="number"
                          className="utility-paid-input"
                          min="0"
                          max={Math.max(0, catTotal)}
                          step="any"
                          placeholder="0"
                          aria-label={`Paid amount for ${c.name}`}
                          disabled={!admin || catTotal <= 0}
                          value={paidAmt > 0 ? paidAmt : ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === "") {
                              void saveUtilityPaidStatus(c.name, 0, false);
                              return;
                            }
                            const clamped = Math.min(Math.max(0, Number(raw) || 0), Math.max(0, catTotal));
                            void saveUtilityPaidStatus(c.name, clamped >= catTotal && catTotal > 0 ? true : clamped, false);
                          }}
                        />
                        <span className="utility-paid-slash">/</span>
                        <span className="utility-total-value">{money(catTotal)}</span>
                      </b>
                      <button
                        type="button"
                        className={`utility-status-pill${isPaid ? " is-paid" : isPartial ? " is-partial" : " is-unpaid"}`}
                        disabled={!admin || catTotal <= 0}
                        onClick={() => void saveUtilityPaidStatus(c.name, !isPaid, true)}
                        title={admin && catTotal > 0 ? (isPaid ? "Mark unpaid" : "Mark fully paid") : undefined}
                      >
                        {isPaid ? (
                          <>
                            <span className="utility-status-badge-icon check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                            <span>Paid</span>
                          </>
                        ) : isPartial ? (
                          <>
                            <span className="utility-status-badge-icon alert" aria-hidden="true">!</span>
                            <span>Due {money(catTotal - paidAmt)}</span>
                          </>
                        ) : (
                          <>
                            <span className="utility-status-badge-icon alert" aria-hidden="true">!</span>
                            <span>Unpaid</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
                </div>                <div className="total-row light">
                  <span>Utilities per member</span>
                  <b>{money(utilitiesPerMember)}</b>
                </div>
              </section>
            </div>
          </>
        )}
        {page === "my-account" && (
          <>
            {activeBulletinNotices.length > 0 && (
              <div className="bulletin-notice-bar" role="region" aria-label="Bulletin notice">
                <span className="bulletin-notice-badge">
                  <Megaphone size={14} aria-hidden="true" />
                  <span>Bulletin Notice</span>
                </span>
                <span className="bulletin-notice-divider" aria-hidden="true" />
                <div className="bulletin-notice-content">
                  <span className="bulletin-notice-megaphone" aria-hidden="true">📢</span>
                  <div className="bulletin-notice-text-viewport" ref={setBulletinTextViewportRef}>
                    <p
                      key={`${bulletinIndex}-${currentBulletinText}`}
                      className="bulletin-notice-text"
                    >
                      <span className="bulletin-notice-marquee-track" ref={bulletinMarqueeTrackRef}>
                        <span className="bulletin-notice-text-inner" ref={bulletinTextInnerRef}>
                          {currentBulletinText}
                        </span>
                        <span className="bulletin-notice-text-clone" aria-hidden="true">
                          {currentBulletinText}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="stats account-stats">
              <Stat
                title="Total Rent"
                value={money(ownTotalRent)}
                icon={Home}
                tone="blue"
                hint="Rent + utilities"
                className="summary-stat summary-indigo"
                showAction
              />
              <Stat
                title="Rent Paid"
                value={money(memberRentPaid(user.id))}
                icon={Wallet}
                watermarkIcon={Wallet}
                tone="green"
                hint="Recorded payment"
                className="summary-stat summary-cyan"
                showAction
                actionKind="check"
              />
              <Stat
                title="Meal Cost"
                value={money(mealActiveIds.includes(user.id) ? individualMealCost : 0)}
                icon={Utensils}
                watermarkIcon={Utensils}
                tone="orange"
                hint={`${bazarMemberCount} members`}
                className="summary-stat summary-rose"
                showAction
              />
              <Stat
                title="Meal Paid"
                value={money(memberMealPaid(user.id))}
                icon={Utensils}
                watermarkIcon={CheckCircle2}
                tone="green"
                hint="Payments + credits"
                className="summary-stat summary-green"
                showAction
                actionKind="check"
              />
              <Stat
                title="Previous Due"
                value={previousDueLoading ? "Loading…" : money(previousDueByUser[user.id] ?? previousDue)}
                icon={FileText}
                watermarkIcon={Clock3}
                tone="orange"
                hint="Carried forward"
                className="summary-stat summary-violet"
                showAction
              />
              <Stat
                title="Due"
                value={money(ownDue + (previousDueByUser[user.id] ?? previousDue))}
                icon={Wallet}
                watermarkIcon={TriangleAlert}
                tone="orange"
                hint={`${money(previousDueByUser[user.id] ?? previousDue)} + ${money(ownDue)}`}
                className="summary-stat summary-amber"
                showAction
                actionKind="alert"
              />
            </div>
            <div className="account-details-grid">
            <section className="panel account-breakdown-panel">
              <div className="overview-panel-heading">
                <span className="overview-panel-icon"><Zap size={20} /></span>
                <PanelHead title="Your monthly breakdown" sub={month} />
              </div>
              <div className="account-breakdown-scroll">
                {dividedUtilityCategories.length > 0 ? (
                  dividedUtilityCategories
                    .map((c) => (
                      <div
                        className={`break-row expense-detail-row tone-${getUtilityTone(c.name)}`}
                        key={c.id || c.name}
                      >
                        <span className="account-expense-icon">
                          {React.createElement(getUtilityIcon(c.name), { size: 17 })}
                        </span>
                        <div className="account-expense-info">
                          {c.name}
                          <small>Full expense: {money(c.amount)}</small>
                        </div>
                        <div className="expense-share">
                          <small>Your share</small>
                          <b>
                            {money(
                              utilityMemberCount > 0
                                ? Number(c.amount) / utilityMemberCount
                                : 0,
                            )}
                          </b>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="hint">
                    No utilities have been added by the admin for this month yet.
                  </p>
                )}
                <div className={`break-row expense-detail-row tone-${getUtilityTone(FLAT_RENT_NAME)}`}>
                  <span className="account-expense-icon"><Home size={17} /></span>
                  <div className="account-expense-info">Room rent</div>
                  <div className="expense-share">
                    <small>Amount</small>
                    <b>{money(ownRent)}</b>
                  </div>
                </div>
              </div>
            </section>
            <section className="panel account-payment-timeline-panel">
              <div className="account-payment-timeline-heading">
                <div className="overview-panel-heading">
                  <span className="overview-panel-icon account-payment-heading-icon">
                    <Receipt size={20} />
                  </span>
                  <PanelHead
                    title="Spending & Payment Timeline"
                  />
                </div>
                <div className="account-payment-timeline-total">
                  <small>
                    {accountPaymentTimeline.length} transaction{accountPaymentTimeline.length === 1 ? "" : "s"}
                  </small>
                  <strong>{money(accountPaymentTimelineTotal)}</strong>
                </div>
              </div>
              {accountPaymentTimeline.length ? (
                <div className="account-payment-timeline" role="list">
                  {accountPaymentTimeline.map((payment) => {
                    const paymentDate = new Date(`${payment.date}T00:00:00`);
                    const validDate = !Number.isNaN(paymentDate.getTime());
                    const isCashContribution = payment.timelineType === "cash";
                    const isMealPayment = payment.timelineType === "meal";
                    const isBazar = payment.timelineType === "bazar";
                    const isSettlementPaid = payment.timelineType === "settlement-paid";
                    const isSettlementReceived = payment.timelineType === "settlement-received";
                    const paymentLabel = isCashContribution
                      ? "Cash contribution"
                      : isMealPayment
                        ? "Meal payment"
                        : isBazar
                          ? "Bazar purchase"
                          : isSettlementPaid
                            ? "Meal settlement paid"
                            : isSettlementReceived
                              ? "Meal settlement received"
                              : "Rent payment";
                    const statusLabel = isBazar
                      ? "Bazar credit"
                      : isSettlementReceived
                        ? "Refund credit"
                        : isSettlementPaid
                          ? "Settled"
                          : isCashContribution
                            ? "Recorded"
                            : "Confirmed";
                    return (
                      <article
                        className={`account-payment-event ${payment.timelineType || "rent"}`}
                        key={payment.timelineId || payment.id}
                        role="listitem"
                      >
                        <time className="account-payment-date" dateTime={payment.date || undefined}>
                          <strong>
                            {validDate
                              ? paymentDate.toLocaleDateString("en-US", { day: "2-digit" })
                              : "--"}
                          </strong>
                          <span>
                            {validDate
                              ? paymentDate.toLocaleDateString("en-US", { month: "short" })
                              : "Date"}
                          </span>
                        </time>
                        <span className="account-payment-marker" aria-hidden="true">
                          {isBazar
                            ? <ShoppingBasket size={15} />
                            : isCashContribution
                              ? <Wallet size={15} />
                              : isMealPayment
                                ? <Utensils size={15} />
                                : isSettlementPaid || isSettlementReceived
                                  ? <ArrowUpDown size={15} />
                                  : <Receipt size={15} />}
                        </span>
                        <div className="account-payment-content">
                          <div className="account-payment-title-row">
                            <strong>{paymentLabel}</strong>
                          </div>
                          <p>{payment.note || `${paymentLabel} recorded for ${month}`}</p>
                          <small>
                            {validDate
                              ? paymentDate.toLocaleDateString("en-BD", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : payment.date || "Payment date unavailable"}
                          </small>
                        </div>
                        <div className="account-payment-value">
                          <span className="account-payment-status">
                            <CheckCircle2 size={12} /> {statusLabel}
                          </span>
                          <strong className="account-payment-amount">{money(payment.amount)}</strong>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="account-payment-empty">
                  <span><Receipt size={22} /></span>
                  <div>
                    <strong>No timeline entries yet</strong>
                    <p>Your rent, meal, and cash contributions for {month} will appear here.</p>
                  </div>
                </div>
              )}
            </section>
            </div>
          </>
        )}
        {page === "settlements" && (
          <>
            {settlementLoadError && (
              <section className="panel settlement-setup-warning" role="alert">
                <div>
                  <strong>Settlement setup is required</strong>
                  <p>{settlementLoadError}</p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => loadCloudData(user.id, month)}
                  disabled={cloudBusy}
                >
                  {cloudBusy ? "Checking…" : "Check again"}
                </button>
              </section>
            )}

            <div className="settlement-dashboard settlement-dashboard-v2 settlement-dashboard-compact">
            <div className="settlement-balance-row">
              <section className="panel settlement-surface settlement-members-panel">
                <div className="settlement-section-heading settlement-members-toolbar">
                  <div className="settlement-heading-main">
                    <span className="settlement-panel-icon members"><Utensils size={18} /></span>
                    <div>
                      <h3>Member Meal Balances</h3>
                      <p>Current meal balance of all members</p>
                    </div>
                  </div>
                  <div className="settlement-heading-actions">
                    <span className="settlement-count-chip">
                      <Users size={14} aria-hidden="true" />
                      {settlementBalanceRows.length} members
                    </span>
                    {admin && (
                      <button
                        type="button"
                        className="secondary settlement-add-action"
                        onClick={() => openSettlementModal()}
                        disabled={Boolean(settlementLoadError)}
                      >
                        <Plus size={15} /> Add settlement
                      </button>
                    )}
                  </div>
                </div>
                <div className="table-wrap settlement-table-wrap">
                  <table className="settlement-member-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Meal cost</th>
                        <th>Meal paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlementBalanceRows.map((row) => (
                        <tr
                          key={row.member.id}
                          className={
                            row.balance > 0.009
                              ? "balance-row-pay"
                              : row.balance < -0.009
                                ? "balance-row-receive"
                                : "balance-row-settled"
                          }
                        >
                          <td>
                            <div className="person settlement-person">
                              {row.member.photo_url ? (
                                <img className="avatar small profile-avatar-image" src={row.member.photo_url} alt="" />
                              ) : (
                                <span className="avatar small">{row.member.name?.[0] || "M"}</span>
                              )}
                              <span>
                                <b>{row.member.name}</b>
                              </span>
                            </div>
                          </td>
                          <td>{money(row.mealCost)}</td>
                          <td>{money(row.mealPaid)}</td>
                          <td>
                            <div className="settlement-balance-col">
                              <span
                                className={`settlement-balance-amount ${
                                  row.balance > 0.009
                                    ? "is-pay"
                                    : row.balance < -0.009
                                      ? "is-receive"
                                      : "is-settled"
                                }`}
                              >
                                {money(Math.abs(row.balance))}
                              </span>
                              {row.previousDue !== 0 && (
                                <small
                                  className="settlement-balance-prev-due"
                                  title={`Previous balance adjustment: ${money(row.previousDue)}`}
                                >
                                  {row.previousDue > 0
                                    ? `+${money(row.previousDue)} due`
                                    : `-${money(Math.abs(row.previousDue))} credit`}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="settlement-status-col">
                              <span
                                className={`settlement-balance-pill ${
                                  row.balance > 0.009
                                    ? "will-pay"
                                    : row.balance < -0.009
                                      ? "will-receive"
                                      : "is-settled"
                                }`}
                              >
                                {row.balance > 0.009 ? (
                                  <>
                                    <span>Will pay</span>
                                    <strong>{money(row.balance)}</strong>
                                  </>
                                ) : row.balance < -0.009 ? (
                                  <>
                                    <span>Will receive</span>
                                    <strong>{money(Math.abs(row.balance))}</strong>
                                  </>
                                ) : (
                                  <>
                                    <Check size={13} className="settlement-pill-chevron" aria-hidden="true" />
                                    <span>Settled</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="settlement-balance-footer" aria-label="Meal balance summary">
                  <span className="settlement-footer-layers" aria-hidden="true">
                    <Layers3 size={15} />
                  </span>
                  <span className="is-paying">
                    <strong>{settlementBalanceRows.filter((row) => row.balance > 0.009).length}</strong> paying
                  </span>
                  <span className="is-receiving">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <strong>{settlementBalanceRows.filter((row) => row.balance < -0.009).length}</strong> receiving
                  </span>
                  <small>Based on meal cost and recorded payments</small>
                </div>
              </section>
              <section className="panel settlement-surface settlement-plan-panel">
                <div className="settlement-section-heading">
                  <div className="settlement-heading-main">
                    <span className="settlement-panel-icon plan"><Zap size={20} /></span>
                    <div>
                      <h3>Smart Matching</h3>
                      <p>Clear, recommended transfers</p>
                    </div>
                  </div>
                  <span className="settlement-count-chip">
                    <Wallet size={13} aria-hidden="true" />
                    {settlementSuggestions.length} match{settlementSuggestions.length === 1 ? "" : "es"}
                  </span>
                </div>
                {settlementLoadError ? (
                  <div className="settlement-plan-empty">
                    <span><ArrowUpDown size={22} /></span>
                    <strong>Plan unavailable</strong>
                    <p>Complete the settlement database setup first.</p>
                  </div>
                ) : settlementSuggestions.length > 0 ? (
                  <>
                    <div className="settlement-suggestion-list settlement-plan-list">
                      {settlementSuggestions.map((suggestion, index) => {
                        const fromMember = db.users.find((member) => member.id === suggestion.fromUserId);
                        const toMember = db.users.find((member) => member.id === suggestion.toUserId);
                        return (
                          <button
                            type="button"
                            className={`settlement-suggestion-row ${suggestion.sourceType === "cash_contribution" ? "cash-refund" : "direct-transfer"}`}
                            key={`${suggestion.sourceType}-${suggestion.fromUserId}-${suggestion.toUserId}-${index}`}
                            onClick={admin ? () => openSettlementModal(suggestion) : undefined}
                            disabled={!admin}
                            title={admin ? "Open settlement" : "Only an admin can change settlement plans"}
                          >
                            <span className="settlement-match-number" aria-hidden="true">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="settlement-suggestion-route">
                              <span className="settlement-suggestion-person payer">
                                <span className="settlement-mini-avatar payer">
                                  {fromMember?.photo_url ? <img className="settlement-mini-avatar-img" src={fromMember.photo_url} alt="" /> : (fromMember?.name?.[0] || "M")}
                                </span>
                                <span className="settlement-suggestion-person-copy">
                                  <small>Payer</small>
                                  <b>{fromMember?.name || "Member"}</b>
                                </span>
                              </span>
                              <span className="settlement-suggestion-arrow" aria-hidden="true">
                                <ArrowRight size={15} />
                              </span>
                              <span className="settlement-suggestion-person receiver">
                                <span className="settlement-mini-avatar receiver">
                                  {toMember?.photo_url ? <img className="settlement-mini-avatar-img" src={toMember.photo_url} alt="" /> : (toMember?.name?.[0] || "M")}
                                </span>
                                <span className="settlement-suggestion-person-copy">
                                  <small>Receiver</small>
                                  <b>{toMember?.name || "Member"}</b>
                                </span>
                              </span>
                            </span>
                            <span className="settlement-suggestion-value">
                              <small>
                                {suggestion.sourceType === "cash_contribution" ? (
                                  <>
                                    <Wallet size={13} aria-hidden="true" />
                                    Cash refund
                                  </>
                                ) : (
                                  <>
                                    <Send size={13} aria-hidden="true" />
                                    Direct transfer
                                  </>
                                )}
                              </small>
                              <strong>{money(suggestion.amount)}</strong>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {admin && (
                      <div className="settlement-plan-actionbar">
                        <button
                          type="button"
                          className="primary settlement-plan-action premium-settlement-plan-action"
                          onClick={createAutoSettlementPlan}
                          disabled={settlementPlanBusy}
                        >
                          <span className="settlement-plan-action-icon" aria-hidden="true">
                            <Sparkles size={18} />
                          </span>
                          <span className="settlement-plan-action-copy">
                            <strong>{settlementPlanBusy ? "Creating plan..." : "Create settlement plan"}</strong>
                            <small>Save all suggested transfers</small>
                          </span>
                          <span className="settlement-plan-action-arrow" aria-hidden="true">
                            <ArrowRight size={18} />
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="settlement-plan-empty is-settled">
                    <div className="settlement-empty-illustration" aria-hidden="true">
                      <span className="settlement-empty-document"><FileText size={42} /></span>
                      <span className="settlement-empty-check"><CheckCircle2 size={27} /></span>
                    </div>
                    <strong>No new match needed</strong>
                    <p>Current completed and pending entries already cover the available balances.</p>
                  </div>
                )}
              </section>
            </div>
            <div className="settlement-history-section-row">

              <section
                className={`panel settlement-surface settlement-history-panel settlement-ledger-panel${monthSettlements.length === 0 ? " is-empty" : ""}`}
              >
                <div className="settlement-section-heading">
                  <div className="settlement-heading-main">
                    <span className="settlement-panel-icon history"><FileText size={20} /></span>
                    <div>
                      <span className="eyebrow">Ledger</span>
                      <h3>Settlement history</h3>
                      <p>Receiver-confirmed payments update paid, remaining, and status automatically.</p>
                    </div>
                  </div>
                  <span className="settlement-count-chip">
                    {monthSettlements.length} entr{monthSettlements.length === 1 ? "y" : "ies"}
                  </span>
                </div>
                {monthSettlements.length === 0 ? (
                  <div className="settlement-empty-state">
                    <span className="settlement-empty-state-icon" aria-hidden="true"><ArrowUpDown size={22} /></span>
                    <strong>No settlements yet</strong>
                    <p>Use the suggested plan or add a partial settlement when members are ready.</p>
                  </div>
                ) : (
                  <div className="settlement-history-list">
                    {[...monthSettlements]
                      .sort((a, b) => {
                        const statusOrder = { pending: 0, partially_paid: 1, completed: 2 };
                        if (a.status !== b.status)
                          return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
                        return String(b.date).localeCompare(String(a.date));
                      })
                      .map((settlement) => {
                        const fromMember = db.users.find((member) => member.id === settlement.fromUserId);
                        const toMember = db.users.find((member) => member.id === settlement.toUserId);
                        const fromName = fromMember?.name || "Member";
                        const toName = toMember?.name || "Member";
                        const isCashRefund = settlement.sourceType === "cash_contribution";
                        const paidAmount = settlementPaidValue(settlement);
                        const remainingAmount = settlementRemainingValue(settlement);
                        const canConfirmPayment =
                          settlement.status !== "completed" &&
                          (admin || settlement.toUserId === user?.id);
                        const transferSentence = isCashRefund
                          ? settlement.status === "completed"
                             ? `Cash in Hand fully refunded ${toName} ${money(settlement.amount)} using ${fromName}'s contribution.`
                             : paidAmount > 0
                               ? `${toName} confirmed ${money(paidAmount)} received; ${money(remainingAmount)} remains.`
                               : `Cash in Hand owes ${toName} ${money(settlement.amount)} using ${fromName}'s contribution.`
                          : settlement.status === "completed"
                             ? `${fromName} fully paid ${toName} ${money(settlement.amount)}.`
                             : paidAmount > 0
                               ? `${toName} confirmed ${money(paidAmount)} from ${fromName}; ${money(remainingAmount)} remains.`
                               : `${fromName} owes ${toName} ${money(settlement.amount)}.`;
                        return (
                          <article
                            className={`settlement-ledger-card ${settlement.status} ${isCashRefund ? "cash-refund" : "direct-transfer"}`}
                            key={settlement.id}
                            aria-label={transferSentence}
                          >
                            <div className="settlement-ledger-top-box">
                              <div className="settlement-ledger-route">
                                <div className="settlement-ledger-party payer">
                                  <small>{isCashRefund ? "Contribution by" : "Paid by"}</small>
                                  <div>
                                    <span className="settlement-ledger-avatar payer">{fromName[0] || "M"}</span>
                                    <span>
                                      <strong>{fromName}</strong>
                                      <em>{isCashRefund ? "Cash source" : "Payer"}</em>
                                    </span>
                                  </div>
                                </div>
                                <div className="settlement-ledger-transfer">
                                  <small>{isCashRefund ? "Total refund due" : "Total due"}</small>
                                  <div>
                                    <span className="settlement-transfer-dash" aria-hidden="true">—</span>
                                    <strong>{money(settlement.amount)}</strong>
                                    <span className="settlement-transfer-dash" aria-hidden="true">—</span>
                                  </div>
                                </div>
                                <div className="settlement-ledger-party receiver">
                                  <small>Received by</small>
                                  <div>
                                    <span>
                                      <strong>{toName}</strong>
                                      <em>Receiver</em>
                                    </span>
                                    <span className="settlement-ledger-avatar receiver">{toName[0] || "M"}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="settlement-ledger-sentence">
                                <CheckCircle2 size={15} aria-hidden="true" />
                                <strong>{transferSentence}</strong>
                              </div>
                            </div>
                            <div className="settlement-payment-summary" aria-label="Settlement payment progress">
                              <span className="is-due">
                                <i className="settlement-summary-icon due" aria-hidden="true"><Scale size={15} /></i>
                                <div>
                                  <small>Total Due</small>
                                  <strong>{money(settlement.amount)}</strong>
                                </div>
                              </span>
                              <span className="is-paid">
                                <i className="settlement-summary-icon paid" aria-hidden="true"><CreditCard size={15} /></i>
                                <div>
                                  <small>Paid</small>
                                  <strong>{money(paidAmount)}</strong>
                                </div>
                              </span>
                              <span className="is-remaining">
                                <i className="settlement-summary-icon remaining" aria-hidden="true"><Clock3 size={15} /></i>
                                <div>
                                  <small>Remaining</small>
                                  <strong>{money(remainingAmount)}</strong>
                                </div>
                              </span>
                            </div>
                            <footer className="settlement-ledger-footer">
                              <div className="settlement-ledger-meta">
                                <span className={`settlement-status ${settlement.status}`}>
                                  {settlementStatusLabel(settlement.status)}
                                </span>
                                <span className="settlement-method-badge">
                                  {isCashRefund ? "Cash contribution refund" : "Direct transfer"}
                                </span>
                                <small>{settlement.date}{settlement.note ? ` · ${settlement.note}` : ""}</small>
                              </div>
                              {(canConfirmPayment || admin) && (
                                <div className="settlement-history-actions">
                                  {canConfirmPayment && (
                                    <button
                                      type="button"
                                      className="primary settlement-history-complete"
                                      onClick={() => openSettlementConfirmation(settlement)}
                                      disabled={settlementBusy}
                                    >
                                      <CheckCircle2 size={14} /> <span>Confirm payment</span>
                                    </button>
                                  )}
                                  {admin && (
                                    <button
                                      type="button"
                                      className="icon-btn danger-text premium-delete-action bazar-action"
                                      aria-label="Delete settlement"
                                      title="Delete settlement"
                                      onClick={() => deleteSettlement(settlement)}
                                      disabled={settlementBusy}
                                    >
                                      <PremiumDeleteIcon size={15} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </footer>
                          </article>
                        );
                      })}
                  </div>
                )}
              </section>
            </div>
            </div>
            {showSettlementModal && admin && (
              <div
                className="modal-backdrop settlement-modal-backdrop"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget && !settlementBusy)
                    setShowSettlementModal(false);
                }}
              >
                <section
                  className="modal panel settlement-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="settlement-modal-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="settlement-modal-heading">
                    <div>
                      <span className="eyebrow">SETTLEMENT DUE</span>
                      <h2 id="settlement-modal-title">Add settlement</h2>
                      <p>Create the total due. The receiver can confirm full or partial payments later.</p>
                    </div>
                    <button
                      type="button"
                      className="icon-btn bazar-action"
                      aria-label="Close settlement form"
                      onClick={() => setShowSettlementModal(false)}
                      disabled={settlementBusy}
                    >
                      <X size={18} />
                    </button>
                  </header>
                  <form className="settlement-form" onSubmit={saveSettlement}>
                    <label>
                      Settlement method
                      <PremiumDropdown
                        ariaLabel="Settlement method"
                        menuLabel="SETTLEMENT METHOD"
                        value={settlementForm.sourceType}
                        options={[
                          { value: "cash_contribution", label: "Refund from cash contribution" },
                          { value: "direct", label: "Direct member transfer" },
                        ]}
                        onChange={(nextType) =>
                          setSettlementForm({
                            ...settlementForm,
                            sourceType: nextType,
                          })
                        }
                        minMenuWidth={240}
                        align="left"
                      />
                    </label>
                    <div className="settlement-form-grid">
                      <label>
                        {settlementForm.sourceType === "cash_contribution"
                          ? "Contribution from"
                          : "Paid by"}
                        <PremiumDropdown
                          ariaLabel={
                            settlementForm.sourceType === "cash_contribution"
                              ? "Contribution from"
                              : "Paid by"
                          }
                          menuLabel={
                            settlementForm.sourceType === "cash_contribution"
                              ? "CONTRIBUTION FROM"
                              : "PAID BY"
                          }
                          value={settlementForm.fromUserId}
                          options={allActiveUsers.map((member) => ({
                            value: member.id,
                            label: `${member.name}${
                              settlementForm.sourceType === "cash_contribution"
                                ? ` · ${money(availableContributionForSettlement(member.id))} available`
                                : ` · balance ${money(memberMealBalance(member, true))}`
                            }`,
                          }))}
                          onChange={(nextId) =>
                            setSettlementForm({
                              ...settlementForm,
                              fromUserId: nextId,
                            })
                          }
                          minMenuWidth={230}
                          align="left"
                        />
                      </label>
                      <label>
                        {settlementForm.sourceType === "cash_contribution"
                          ? "Refund to"
                          : "Paid to"}
                        <PremiumDropdown
                          ariaLabel={
                            settlementForm.sourceType === "cash_contribution"
                              ? "Refund to"
                              : "Paid to"
                          }
                          menuLabel={
                            settlementForm.sourceType === "cash_contribution"
                              ? "REFUND TO"
                              : "PAID TO"
                          }
                          value={settlementForm.toUserId}
                          options={allActiveUsers.map((member) => ({
                            value: member.id,
                            label: `${member.name} · balance ${money(memberMealBalance(member, true))}`,
                          }))}
                          onChange={(nextId) =>
                            setSettlementForm({
                              ...settlementForm,
                              toUserId: nextId,
                            })
                          }
                          minMenuWidth={230}
                          align="left"
                        />
                      </label>
                    </div>
                    <div className="settlement-form-grid">
                      <label>
                        Total due (৳)
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={settlementForm.amount}
                          onChange={(event) =>
                            setSettlementForm({ ...settlementForm, amount: event.target.value })
                          }
                          required
                        />
                      </label>
                      <label>
                        Date
                        <input
                          type="date"
                          value={settlementForm.date}
                          onChange={(event) =>
                            setSettlementForm({ ...settlementForm, date: event.target.value })
                          }
                          required
                        />
                      </label>
                    </div>
                    <label>
                      Note
                      <input
                        value={settlementForm.note}
                        onChange={(event) =>
                          setSettlementForm({ ...settlementForm, note: event.target.value })
                        }
                        placeholder="Meal balance settlement"
                      />
                    </label>
                    <div className="settlement-form-note">
                      {settlementForm.sourceType === "cash_contribution"
                        ? "The receiver can confirm full or partial refunds. Confirmed amounts reduce cash in hand and the remaining balance automatically."
                        : "The receiver can confirm full or partial payments. Status and remaining due update automatically after each confirmation."}
                    </div>
                    <div className="settlement-modal-actions">
                      <button
                        type="button"
                        className="secondary bazar-action"
                        onClick={() => setShowSettlementModal(false)}
                        disabled={settlementBusy}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="primary" disabled={settlementBusy}>
                        {settlementBusy ? "Saving…" : "Create settlement"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
            {settlementConfirmTarget && (
              <div
                className="modal-backdrop settlement-modal-backdrop"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget && !settlementBusy) {
                    setSettlementConfirmTarget(null);
                    setSettlementConfirmAmount("");
                  }
                }}
              >
                <section
                  className="modal panel settlement-modal settlement-confirm-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="settlement-confirm-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="settlement-modal-heading">
                    <div>
                      <span className="eyebrow">RECEIVER CONFIRMATION</span>
                      <h2 id="settlement-confirm-title">Confirm received payment</h2>
                      <p>
                        Confirm the amount you received from {db.users.find((member) => member.id === settlementConfirmTarget.fromUserId)?.name || "the payer"}.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-btn bazar-action"
                      aria-label="Close payment confirmation"
                      onClick={() => {
                        setSettlementConfirmTarget(null);
                        setSettlementConfirmAmount("");
                      }}
                      disabled={settlementBusy}
                    >
                      <X size={18} />
                    </button>
                  </header>
                  <form className="settlement-form" onSubmit={confirmSettlementPayment}>
                    <div className="settlement-confirm-summary">
                      <span>
                        <small>Total Due</small>
                        <strong>{money(settlementConfirmTarget.amount)}</strong>
                      </span>
                      <span>
                        <small>Already Paid</small>
                        <strong>{money(settlementPaidValue(settlementConfirmTarget))}</strong>
                      </span>
                      <span>
                        <small>Remaining</small>
                        <strong>{money(settlementRemainingValue(settlementConfirmTarget))}</strong>
                      </span>
                    </div>
                    <label>
                      Amount received (৳)
                      <input
                        type="number"
                        min="0.01"
                        max={settlementRemainingValue(settlementConfirmTarget)}
                        step="0.01"
                        value={settlementConfirmAmount}
                        onChange={(event) => setSettlementConfirmAmount(event.target.value)}
                        autoFocus
                        required
                      />
                    </label>
                    <div className="settlement-form-note">
                      A smaller amount marks this settlement as Partially Paid. Confirming the full remaining amount marks it Completed.
                    </div>
                    <div className="settlement-modal-actions">
                      <button
                        type="button"
                        className="secondary bazar-action"
                        onClick={() => {
                          setSettlementConfirmTarget(null);
                          setSettlementConfirmAmount("");
                        }}
                        disabled={settlementBusy}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="primary" disabled={settlementBusy}>
                        {settlementBusy ? "Confirming…" : "Confirm payment"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </>
        )}
        {page === "pay-rent" && user.role === "member" && (
          <section className="panel member-payment-options pay-rent-page">
            <div className="pay-rent-heading">
              <span className="pay-rent-heading-icon"><Wallet size={27} strokeWidth={2} /></span>
              <div>
                <h3>Pay your rent</h3>
                <p>Use one of the payment methods configured by the admin</p>
              </div>
            </div>
            {paymentOptions.filter((o) => o.enabled && o.account_number)
              .length ? (
              <div className="payment-method-grid">
                {paymentOptions
                  .filter((o) => o.enabled && o.account_number)
                  .map((o) => (
                    <article className="payment-method-card" key={o.provider}>
                      <div className="pay-rent-brand">
                        <PaymentBrand
                          provider={o.provider}
                          logoUrl={o.logo_url}
                        />
                      </div>
                      <div className="payment-method-info">
                        <b>{o.label}</b>
                        <strong>{o.account_number}</strong>
                        {o.account_name && (
                          <small>Account name: {o.account_name}</small>
                        )}
                        {o.instructions && <small>{o.instructions}</small>}
                      </div>
                      <button
                        className="secondary copy-payment"
                        type="button"
                        aria-label={`Copy ${o.label} account number`}
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(o.account_number)
                            .then(() => alert("Account number copied."))
                            .catch(() =>
                              alert(
                                "Copy failed. Please copy the number manually.",
                              ),
                            );
                        }}
                      >
                        <Copy size={17} /> Copy
                      </button>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="pay-rent-empty-state">
                <Wallet size={22} />
                <p>Payment details will appear here once the admin configures them.</p>
              </div>
            )}
          </section>
        )}
        {page === "members" && admin && (
          <>
          <div className="content-grid member-page-grid">
            <section className="panel member-accounts-panel">
              <div className="member-accounts-heading">
                <PanelHead
                  title="Member accounts"
                  sub="Add, edit, or deactivate household users"
                />
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setNewUser({ name: "", username: "", email: "", password: "", rent: "", role: "member" });
                    setShowMemberModal(true);
                  }}
                >
                  <Plus size={16} /> Add member
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>User ID</th>
                      <th>Rent</th>
                      <th>Meal</th>
                      <th>Status</th>
                      <th>Last active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <b>{u.name}</b>
                          <small className="role">{u.role}</small>
                        </td>
                        <td>{u.username}</td>
                        <td>{money(u.rent)}</td>
                        <td>
                          <label className="meal-table-toggle" title={`Include ${u.name} in ${month} meal calculation`}>
                            <input
                              type="checkbox"
                              checked={mealActiveIds.includes(u.id)}
                              disabled={!u.active}
                              onChange={(e) => setMealActiveIds((prev) => e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id))}
                            />
                          </label>
                        </td>
                        <td>
                          <span
                            className={"status " + (u.active ? "on" : "off")}
                          >
                            {u.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td title={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "No recorded login"}>
                          {formatLastActive(u.lastLoginAt)}
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="icon-btn member-edit-action"
                              title="Edit"
                              onClick={() => editUser(u)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-btn danger member-delete-action premium-delete-action bazar-action"
                              title="Deactivate"
                              onClick={() => removeUser(u.id)}
                            >
                              <PremiumDeleteIcon size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="meal-table-footer">
                <span>{mealActiveIds.length} meal members selected · {month}</span>
                <button className="btn primary" type="button" onClick={saveMealMemberCount} disabled={mealMemberSaving}>
                  {mealMemberSaving ? "Saving…" : "Save Changes"}
                </button>
                {mealMemberMessage && <small className={mealMemberMessage.startsWith("Saved") ? "meal-setting-success" : "meal-setting-message"}>{mealMemberMessage}</small>}
              </div>
            </section>
          </div>
          {showMemberModal && (
            <div className="modal-backdrop member-modal-backdrop" role="presentation">
              <section className="panel member-modal" role="dialog" aria-modal="true" aria-labelledby="member-modal-title" onClick={(event) => event.stopPropagation()}>
                <header className="member-modal-heading">
                  <div>
                    <h2 id="member-modal-title">{editId ? "Edit member" : "Add member"}</h2>
                    <p>Login details and individual rent</p>
                  </div>
                  <button type="button" className="icon-btn member-modal-close bazar-action" aria-label="Close member form" onClick={() => setShowMemberModal(false)}><X size={19} /></button>
                </header>
                <form className="member-modal-form" onSubmit={saveUser}>
                  <label>Full name<input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required /></label>
                  <label>User ID<input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required /></label>
                  {!editId && <label>Email address<input type="email" value={newUser.email || ""} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required /></label>}
                  <label>Password<input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder={editId ? "Leave blank to keep current password" : "Temporary password (min 6 characters)"} type="password" required={!editId} minLength={6} /></label>
                  <label>Room rent (৳)<input type="number" min="0" value={newUser.rent} onChange={(e) => setNewUser({ ...newUser, rent: e.target.value })} /></label>
                  <label>Role<select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}><option value="member">Member</option><option value="admin">Admin</option></select></label>
                  <div className="member-modal-actions">
                    <button type="button" className="secondary member-modal-cancel bazar-action" onClick={() => { setShowMemberModal(false); setEditId(null); }}>Cancel</button>
                    <button className="primary" type="submit">{editId ? "Update member" : "Add member"}</button>
                  </div>
                </form>
              </section>
            </div>
          )}
          </>
        )}
        {page === "expenses" && admin && (
          <div className="utilities-layout-step1">
            <section className="panel flat-rent-panel">
              <div className="flat-rent-heading">
                <span className="flat-rent-icon"><Home size={21} /></span>
                <div>
                  <h3>Flat rent</h3>
                  <p>Monthly flat rent is tracked separately and is not divided among current members.</p>
                </div>
              </div>
              <form className="flat-rent-form" onSubmit={saveFlatRent}>
                <label htmlFor="flat-rent-amount">Monthly amount</label>
                <div className="flat-rent-input-wrap">
                  <span aria-hidden="true">৳</span>
                  <input
                    id="flat-rent-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={flatRentInput}
                    onChange={(event) => setFlatRentInput(event.target.value)}
                    placeholder="Enter flat rent"
                    required
                  />
                </div>
                <button type="submit" className="primary" disabled={flatRentSaving}>
                  {flatRentSaving ? "Saving…" : "Save flat rent"}
                </button>
                {flatRentMessage && <small role="status">{flatRentMessage}</small>}
              </form>
            </section>
            <section className="panel utilities-history-panel">
              <div className="utilities-history-head">
                <PanelHead title="Member utilities" sub={`${month} · shared items are divided among ${utilityMemberCount} current users`} />
                <div className="utilities-header-actions">
                  <form onSubmit={saveUtilityMemberCount} className="utilities-member-inline">
                    <label htmlFor="utilities-current-members">Current members</label>
                    <input
                      id="utilities-current-members"
                      type="number"
                      min="1"
                      step="1"
                      value={utilityMemberCountInput}
                      onChange={(e) => setUtilityMemberCountInput(e.target.value)}
                      required
                    />
                    <button type="submit" className="utilities-member-save" disabled={utilityMemberCountSaving}>
                      {utilityMemberCountSaving ? "Saving…" : "Save"}
                    </button>
                    {utilityMemberCountMessage && <small role="status">{utilityMemberCountMessage}</small>}
                  </form>
                  <button type="button" className="primary" onClick={() => setShowAddUtility(true)}><Plus size={16}/> Add Utility</button>
                </div>
              </div>

              {regularUtilityCategories.map((c) => (
                <div className="break-row" key={c.id || c.name}>
                  <span>
                    {c.name}
                    <small>{c.shared ? "Shared equally" : "Not shared"}</small>
                  </span>
                  <b>{money(c.amount)}</b>
                  <button className="icon-btn secondary" type="button" aria-label={`Edit ${c.name}`} onClick={() => setUtilityEditModal({ originalName: c.name, name: c.name, amount: String(c.amount), shared: !!c.shared })}><Edit size={15} /></button>
                  <button
                    className="icon-btn danger premium-delete-action bazar-action"
                    title={`Delete ${c.name}`}
                    aria-label={`Delete ${c.name}`}
                    onClick={async () => {
                      if (!admin) return;
                      if (!(await askConfirm(`Are you sure you want to delete "${c.name}" from ${month}?`, "Delete utility?"))) return;
                      try {
                        const utilities = [...(await getUtilitiesForMonth())].filter((item) => String(item.name || "").toLowerCase() !== String(c.name || "").toLowerCase()).map((item) => ({ ...item }));
                        const { error } = await supabase.from("app_settings").upsert(
                          { key: `shared_utilities_list_${month}`, value: JSON.stringify(utilities), updated_at: new Date().toISOString() },
                          { onConflict: "key" },
                        );
                        if (error) throw error;
                        await loadCloudData(user.id, month);
                        setBazarSuccessToast("Utility deleted successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
                      } catch (e) {
                        alert("Could not delete utility: " + e.message);
                      }
                    }}
                  >
                    <PremiumDeleteIcon size={15} />
                  </button>
                </div>
              ))}
              <div className="total-row">
                <b>Shared utilities total</b>
                <b>{money(sharedUtilitiesTotal)}</b>
              </div>
            </section>
          </div>
        )}
        {page === "expenses" && admin && showAddUtility && (
          <div className="modal-backdrop" role="presentation">
            <section className="panel form-panel utility-add-modal" role="dialog" aria-modal="true">
              <PanelHead title="Add utility" sub="Add utilities such as WiFi, gas, electricity, and water" />
              <form onSubmit={addCategory}>
                <label>Utility name<input value={expenseForm.name} onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} required /></label>
                <label>Amount (৳)<input type="number" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required /></label>
                <label className="check"><input type="checkbox" checked={expenseForm.shared} onChange={(e) => setExpenseForm({ ...expenseForm, shared: e.target.checked })} /> Split among current members</label>
                <button className="primary full">{editingUtilityName ? "Save changes" : <><Plus size={16} /> Add utility</>}</button>
              </form>
              <button type="button" className="secondary full bazar-action" onClick={() => setShowAddUtility(false)}>Close</button>
            </section>
          </div>
        )}
        {page === "payments" && admin && (
          <div className="grid-two payments-cash-grid">
            <section className="panel rent-payment-history-panel">
              <div className="payments-panel-head">
                <div className="payments-panel-title-wrap">
                  <span className="payments-panel-icon" aria-hidden="true"><Home size={24} /></span>
                  <PanelHead title="Rent payment history" sub={month} />
                </div>
                <button type="button" className="primary rent-history-add-button" onClick={() => {
                  setPaymentForm((form) => ({
                    ...form,
                    id: null,
                    month,
                    date: todayForDateInput(),
                    amount: "",
                    note: "Rent payment",
                  }));
                  setShowAddPayment(true);
                }}><Plus size={16} /> Add Payment</button>
              </div>
              <div className="payments-entry-list">
                {db.payments.filter((p) => p.month === month).length === 0 && (
                  <div className="payments-empty-state" role="status">
                    <strong>No rent payments yet</strong>
                    <span>Payments for {month} will appear here.</span>
                  </div>
                )}
                {db.payments
                  .filter((p) => p.month === month)
                  .map((p) => {
                    const parsedDate = new Date(`${p.date}T00:00:00`);
                    const validDate = !Number.isNaN(parsedDate.getTime());
                    const dayText = validDate ? parsedDate.toLocaleDateString("en-US", { day: "2-digit" }) : "--";
                    const monthText = validDate ? parsedDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "DATE";
                    return (
                      <div className="break-row payments-entry-row" key={p.id}>
                        <time className="payments-date-tile" dateTime={p.date || undefined}>
                          <strong>{dayText}</strong>
                          <span>{monthText}</span>
                        </time>
                        <span className="payments-entry-copy">
                          <b>{db.users.find((u) => u.id === p.userId)?.name || "Member"}</b>
                          <small>{p.date} · {p.note}</small>
                        </span>
                        <b className="green-text payments-entry-amount">{money(p.amount)}</b>
                        <div className="row-actions payments-entry-actions">
                          <button type="button" className="icon-btn payments-edit-btn" title="Edit payment" aria-label="Edit payment" onClick={() => editPayment(p)}><Edit size={15} /></button>
                          <button type="button" className="icon-btn danger-text premium-delete-action bazar-action payments-delete-btn" title="Delete payment" aria-label="Delete payment" onClick={() => deletePayment(p)}><PremiumDeleteIcon size={15} /></button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="payments-total-banner" aria-label="Total rent payments">
                <span className="payments-total-label">
                  <span className="payments-total-info-badge" aria-hidden="true">i</span>
                  <b>Total Rent Payments</b>
                </span>
                <strong className="payments-total-value">
                  {money(db.payments.filter((p) => p.month === month).reduce((s, p) => s + Number(p.amount || 0), 0))}
                </strong>
              </div>
            </section>
            <section className="panel payments-cash-history-panel">
              <div className="payments-panel-head">
                <div className="payments-panel-title-wrap">
                  <span className="payments-panel-icon" aria-hidden="true"><Users size={24} /></span>
                  <PanelHead title="Cash contribution history" sub={`${month} · deposits only`} />
                </div>
                <button type="button" className="primary rent-history-add-button" onClick={() => {
                  setCashForm((form) => ({
                    ...form,
                    id: null,
                    date: todayForDateInput(),
                    month,
                    amount: "",
                    note: "Cash contribution",
                  }));
                  setShowAddCash(true);
                }}>
                  <Plus size={16} /> Add Cash
                </button>
              </div>
              <div className="payments-entry-list">
                {(db.contributions || []).filter((c) => c.month === month).length === 0 && (
                  <div className="payments-empty-state" role="status">
                    <strong>No cash contributions yet</strong>
                    <span>Contributions for {month} will appear here.</span>
                  </div>
                )}
                {(db.contributions || [])
                  .filter((c) => c.month === month)
                  .map((c) => {
                    const parsedDate = new Date(`${c.date}T00:00:00`);
                    const validDate = !Number.isNaN(parsedDate.getTime());
                    const dayText = validDate ? parsedDate.toLocaleDateString("en-US", { day: "2-digit" }) : "--";
                    const monthText = validDate ? parsedDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "DATE";
                    return (
                      <div className="break-row payments-entry-row" key={c.id}>
                        <time className="payments-date-tile" dateTime={c.date || undefined}>
                          <strong>{dayText}</strong>
                          <span>{monthText}</span>
                        </time>
                        <span className="payments-entry-copy">
                          <b>{db.users.find((u) => u.id === c.paidBy)?.name || "Member"}</b>
                          <small>{c.date} · {c.note || "Cash contribution"}</small>
                        </span>
                        <b className="green-text payments-entry-amount">{money(c.amount)}</b>
                        <div className="row-actions payments-entry-actions">
                          <button type="button" className="icon-btn payments-edit-btn" title="Edit contribution" aria-label="Edit contribution" onClick={() => editCash(c)}><Edit size={15} /></button>
                          <button type="button" className="icon-btn danger-text premium-delete-action bazar-action payments-delete-btn" title="Delete contribution" aria-label="Delete contribution" onClick={() => deleteCash(c)}><PremiumDeleteIcon size={15} /></button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="payments-total-banner" aria-label="Total cash contribution">
                <span className="payments-total-label">
                  <span className="payments-total-wallet-badge" aria-hidden="true"><Wallet size={16} /></span>
                  <b>Total Cash Contribution</b>
                </span>
                <strong className="payments-total-value">
                  {money((db.contributions || []).filter((c) => c.month === month).reduce((s, c) => s + Number(c.amount || 0), 0))}
                </strong>
              </div>
            </section>
          </div>
        )}
        {showAddCash && page === "payments" && admin && (
          <div className="modal-backdrop cash-modal-backdrop" role="presentation">
            <section className="modal panel form-panel rent-payment-modal cash-contribution-modal" role="dialog" aria-modal="true" aria-label="Add cash contribution" onClick={(e) => e.stopPropagation()}>
              <div className="cash-modal-heading">
                <PanelHead title={cashForm.id ? "Edit cash contribution" : "Add cash contribution"} sub="Money given for future monthly bazar" />
                <button type="button" className="icon-btn bazar-action" aria-label="Close" onClick={() => setShowAddCash(false)}>×</button>
              </div>
              <form onSubmit={addCash}>
                <label>
                  Date
                  <input
                    type="date"
                    value={cashForm.date}
                    onChange={(e) =>
                      setCashForm({ ...cashForm, date: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Month
                  <select value={cashForm.month} onChange={async (e) => { const v = e.target.value; setCashForm({ ...cashForm, month: v }); if (session?.id) await loadCloudData(session.id, v); }}>
                    {monthChoices.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label>
                  Amount (৳)
                  <input
                    type="number"
                    min="1"
                    value={cashForm.amount}
                    onChange={(e) =>
                      setCashForm({ ...cashForm, amount: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Paid by
                  <select
                    name="paidBy"
                    value={cashForm.paidBy}
                    onChange={(e) =>
                      setCashForm({ ...cashForm, paidBy: e.target.value })
                    }
                  >
                    {allActiveUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {u.role === "admin" ? " (Admin)" : ""} — {money(memberRentShare(u))}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Note
                  <input
                    value={cashForm.note}
                    onChange={(e) =>
                      setCashForm({ ...cashForm, note: e.target.value })
                    }
                  />
                </label>
                <button className="primary full">
                  {cashForm.id ? "Save changes" : <><Plus size={16} /> Save cash</>}
                </button>
              </form>
            </section>
          </div>
        )}
        {showAddPayment && page === "payments" && admin && (
          <div className="modal-backdrop" role="presentation">
            <div onClick={(e) => e.stopPropagation()}>
              <section className="modal panel form-panel rent-payment-modal" role="dialog" aria-modal="true" aria-label={paymentForm.id ? "Edit rent payment" : "Record rent payment"}>
                <PanelHead title={paymentForm.id ? "Edit rent payment" : "Record rent payment"} sub="Admin records money received from a member" />
                <button type="button" className="icon-btn bazar-action" aria-label="Close" onClick={() => setShowAddPayment(false)}>×</button>
                <form onSubmit={addPayment}>
                <label>
                  Date
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, date: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Member
                  <select
                    value={paymentForm.userId}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, userId: e.target.value })
                    }
                  >
                    {allActiveUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {u.role === "admin" ? " (Admin)" : ""} — {money(memberRentShare(u))}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Month
                  <select value={paymentForm.month} onChange={async (e) => { const v = e.target.value; setPaymentForm({ ...paymentForm, month: v }); if (session?.id) await loadCloudData(session.id, v); }}>
                    {monthChoices.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label>
                  Amount (৳)
                  <input
                    type="number"
                    min="1"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Note
                  <input
                    value={paymentForm.note}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, note: e.target.value })
                    }
                  />
                </label>
                <button className="primary full">{paymentForm.id ? "Save changes" : "Save payment"}</button>
              </form>
              </section>
            </div>
          </div>
        )}
        {page === "monthly" && admin && (
          <div className="grid-two">
            <section className="panel form-panel">
              <PanelHead
                title="Monthly member setup"
                sub="Choose who shares this month's expenses"
              />
              <label>
                Month
                <select
                  value={month}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setMonth(v);
                    if (session?.id) await loadCloudData(session.id, v);
                  }}
                >
                  {monthChoices.map((m) => (
                    <option>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Current member count
                <input
                  type="number"
                  min="1"
                  max={activeUsers.length}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </label>
              <p className="hint">
                Select the members who will share this month's expenses. The
                count updates from your selection.
              </p>
              {activeUsers.map((u) => (
                <label className="member-check">
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, u.id]
                          : selected.filter((id) => id !== u.id),
                      )
                    }
                  />
                  <span>{u.name}</span>
                </label>
              ))}
              <div className="total-row light">
                <span>Selected members</span>
                <b>{selected.length}</b>
              </div>
              <div className="total-row">
                <span>Shared total</span>
                <b>{money(sharedTotal)}</b>
              </div>
              <div className="total-row light">
                <span>Per member</span>
                <b>
                  {money(selected.length ? sharedTotal / selected.length : 0)}
                </b>
              </div>
              <button
                type="button"
                className="secondary full"
                onClick={async () => {
                  try {
                    const createdMonth = await ensureCloudMonth(month, true);
                    await loadCloudData(session.id, month);
                    setAuthMessage("");
                    alert(`Monthly hisab is ready for ${month}.`);
                  } catch (error) {
                    alert(error.message || "Could not create monthly hisab.");
                  }
                }}
              >
                Create new month's hisab
              </button>
              <button className="primary full" onClick={saveMonth}>
                Save monthly setup
              </button>
            </section>
            <section className="panel">
              <PanelHead
                title="How the split works"
                sub="Monthly calculation"
              />
              <div className="calc">
                <span>Total shared expenses</span>
                <b>{money(sharedTotal)}</b>
                <span>÷ Current selected members</span>
                <b>{selected.length}</b>
                <hr />
                <span>Each member pays</span>
                <strong>
                  {money(selected.length ? sharedTotal / selected.length : 0)}
                </strong>
              </div>
              <p className="hint">
                Changing this month's member list affects this month's split
                only. Past months keep their saved member count and expenses.
              </p>
            </section>
          </div>
        )}
        {page === "bazar" && (admin || user.role === "member") && (
          <>
            <div className="bazar-layout-full">
              <section className="panel bazar-history-panel">
                {showBazarNeeded && (
                  <div
                    className="modal-backdrop bazar-needed-backdrop"
                    role="presentation"
                    onClick={(event) => {
                      if (event.target === event.currentTarget && !bazarNeededBusy) {
                        setShowBazarNeeded(false);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && !bazarNeededBusy) {
                        setShowBazarNeeded(false);
                      }
                    }}
                  >
                  <section
                    className="panel bazar-needed-panel bazar-needed-modal is-open"
                    id="bazar-needed-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="bazar-needed-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                  <button
                    type="button"
                    className="icon-btn bazar-needed-modal-close"
                    aria-label="Close need-to-buy list"
                    onClick={() => setShowBazarNeeded(false)}
                    disabled={bazarNeededBusy}
                  >
                    <X size={18} />
                  </button>
                  <div className="bazar-needed-head">
                    <span className="bazar-needed-icon"><ShoppingBasket size={19} /></span>
                    <div>
                      <h3 id="bazar-needed-title">Need to buy</h3>
                      <p>Shared shopping checklist for the house</p>
                    </div>
                    <span className="bazar-needed-count">
                      {bazarNeededItems.filter((item) => !item.done).length} pending
                    </span>
                  </div>
                  <div className="add-bazar-modal bazar-inline-builder-skin">
                  <form className="bazar-needed-form bazar-simple-builder" onSubmit={addBazarNeededItem}>
                    <div className="bazar-simple-fields">
                      <div
                        className="bazar-simple-field bazar-item-autocomplete"
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            setBazarNeededSuggestionOpen(false);
                          }
                        }}
                      >
                        <div className="bazar-simple-label-row">
                          <label htmlFor="bazar-needed-item-search">Item</label>
                          {admin && (
                            <button type="button" className="bazar-simple-manage-items" onClick={openCommonItemsModal}>
                              <Pencil size={13} /> Manage items
                            </button>
                          )}
                        </div>
                        <div className={`bazar-item-search-control${chosenBazarNeededPreset ? " has-selection" : ""}`}>
                          <span className="bazar-item-search-icon" aria-hidden="true">
                            {chosenBazarNeededPreset
                              ? (bazarNeededPicker.catalogEmoji || renderCommonBazarIcon(chosenBazarNeededPreset, 22))
                              : <Search size={18} />}
                          </span>
                          <input
                            id="bazar-needed-item-search"
                            type="text"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={bazarNeededSuggestionOpen}
                            aria-controls="bazar-needed-item-suggestions"
                            autoComplete="off"
                            placeholder="Search potato, alu, alo..."
                            value={bazarNeededItemSearch}
                            onFocus={() => setBazarNeededSuggestionOpen(true)}
                            onChange={(event) => {
                              setBazarNeededItemSearch(event.target.value);
                              setBazarNeededSuggestionOpen(true);
                              setBazarNeededPickerError("");
                              setBazarNeededPicker((prev) => ({
                                ...prev,
                                itemId: "",
                                customName: "",
                                catalogName: "",
                                catalogEmoji: "",
                              }));
                            }}
                            disabled={bazarNeededBusy}
                          />
                          {chosenBazarNeededPreset && <CheckCircle2 className="bazar-item-selected-check" size={17} />}
                        </div>
                        {bazarNeededSuggestionOpen && (
                          <div className="bazar-item-suggestions" id="bazar-needed-item-suggestions" role="listbox">
                            {bazarNeededSuggestions.map((preset) => (
                              <button
                                type="button"
                                role="option"
                                aria-selected={chosenBazarNeededPreset?.id === preset.id}
                                className="bazar-item-suggestion"
                                key={preset.suggestionKey || preset.id}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setBazarNeededItemSearch(preset.name);
                                  setBazarNeededPicker((prev) => ({
                                    ...prev,
                                    ...getBazarPickerSuggestionPatch(preset),
                                  }));
                                  setBazarNeededPickerError("");
                                  setBazarNeededSuggestionOpen(false);
                                }}
                              >
                                <span className="bazar-item-suggestion-icon" aria-hidden="true">
                                  {renderCommonBazarIcon(preset, 23)}
                                </span>
                                <span className="bazar-item-suggestion-copy">
                                  <strong>{preset.name}</strong>
                                  <small>{preset.subItem ? preset.parentName : preset.id} · {preset.defaultUnit}</small>
                                </span>
                                <ChevronRight size={15} aria-hidden="true" />
                              </button>
                            ))}
                            {bazarNeededItemSearch.trim() && (
                              <button
                                type="button"
                                role="option"
                                aria-selected={chosenBazarNeededPreset?.isCustom || false}
                                className="bazar-item-suggestion is-custom"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  const customPreset = commonBazarItems.find((item) => item.isCustom) || BAZAR_COMMON_ITEMS.find((item) => item.isCustom);
                                  setBazarNeededPicker((prev) => ({
                                    ...prev,
                                    itemId: customPreset.id,
                                    customName: bazarNeededItemSearch.trim(),
                                    catalogName: "",
                                    catalogEmoji: "",
                                    unit: customPreset.defaultUnit,
                                  }));
                                  setBazarNeededPickerError("");
                                  setBazarNeededSuggestionOpen(false);
                                }}
                              >
                                <span className="bazar-item-suggestion-icon" aria-hidden="true">
                                  {renderCommonBazarIcon(commonBazarItems.find((item) => item.isCustom), 23)}
                                </span>
                                <span className="bazar-item-suggestion-copy">
                                  <strong>Use “{bazarNeededItemSearch.trim()}”</strong>
                                  <small>Track as a custom item</small>
                                </span>
                                <Plus size={15} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="bazar-simple-field">
                        <label htmlFor="bazar-needed-quantity">Quantity</label>
                        <div className="bazar-simple-quantity">
                          <input
                            id="bazar-needed-quantity"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="1"
                            value={bazarNeededPicker.qty}
                            onChange={(event) => {
                              setBazarNeededPickerError("");
                              setBazarNeededPicker((prev) => ({ ...prev, qty: event.target.value }));
                            }}
                            disabled={bazarNeededBusy}
                          />
                          <PremiumDropdown
                            ariaLabel="Quantity unit"
                            menuLabel="SELECT UNIT"
                            className="bazar-unit-select"
                            value={bazarNeededPicker.unit}
                            options={BAZAR_UNIT_OPTIONS}
                            onChange={(nextUnit) =>
                              setBazarNeededPicker((prev) => ({ ...prev, unit: nextUnit }))
                            }
                            disabled={bazarNeededBusy}
                            minMenuWidth={168}
                            align="right"
                          />
                        </div>
                      </div>

                      <button type="submit" className="bazar-simple-add" disabled={bazarNeededBusy}>
                        <Plus size={17} /> Add item
                      </button>
                    </div>
                    {bazarNeededPickerError && <p className="bazar-simple-error">{bazarNeededPickerError}</p>}
                  </form>
                  </div>
                  {bazarNeededItems.length ? (
                    <div className="bazar-needed-toolbar">
                      <div className="bazar-needed-toolbar-title">
                        <span>Checklist items</span>
                        <span className="bazar-needed-toolbar-badge">
                          {bazarNeededItems.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="bazar-needed-delete-all-btn"
                        onClick={clearAllBazarNeededItems}
                        disabled={bazarNeededBusy}
                        title="Delete all items from the list"
                      >
                        <PremiumDeleteIcon size={14} />
                        <span>Delete all</span>
                      </button>
                    </div>
                  ) : null}
                  {bazarNeededItems.length ? (
                    <div className="bazar-needed-list">
                      {[...bazarNeededItems]
                        .sort((a, b) => Number(a.done) - Number(b.done))
                        .map((item) => (
                          <div className={`bazar-needed-item${item.done ? " is-done" : ""}`} key={item.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleBazarNeededItem(item.id)}
                                disabled={bazarNeededBusy}
                              />
                              <span className="bazar-added-item-icon" aria-hidden="true">
                                {renderBazarItemIcon(item.name, 17)}
                              </span>
                              <span>
                                <b>{item.name}</b>
                                <small>
                                  {item.done
                                    ? `Bought${
                                        item.boughtBy || item.boughtByName
                                          ? ` by ${db.users.find((u) => u.id === item.boughtBy)?.name || item.boughtByName}`
                                          : ""
                                      }`
                                    : `${Number(item.quantity) || 1} ${item.unit || "pcs"}`}
                                </small>
                              </span>
                            </label>
                            <button
                              type="button"
                              className="icon-btn danger-text premium-delete-action bazar-action"
                              aria-label={`Remove ${item.name}`}
                              title="Remove item"
                              onClick={() => removeBazarNeededItem(item.id)}
                              disabled={bazarNeededBusy}
                            >
                              <PremiumDeleteIcon size={15} />
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="bazar-needed-empty">No items are waiting to be bought.</p>
                  )}
                  </section>
                  </div>
                )}
                <div className="total-row bazar-total-row bazar-total-split-banner">
                  <div className="bazar-total-left">
                    <span className="bazar-total-badge" aria-hidden="true">
                      <ShoppingBasket size={18} />
                    </span>
                    <b className="bazar-total-label">Total bazar purchased</b>
                  </div>
                  <div className="bazar-total-right">
                    <svg className="bazar-total-curve" viewBox="0 0 44 76" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M0 0 H44 C26 0 24 76 0 76 Z" fill="currentColor" />
                    </svg>
                    <b className="bazar-total-value"><span>{money(selectedBazarTotal)}</span></b>
                  </div>
                </div>
                <div className="bazar-mobile-table-tools">
                  <label className="bazar-search">
                    <Search size={17} aria-hidden="true" />
                    <input
                      type="search"
                      value={bazarSearch}
                      onChange={(event) => setBazarSearch(event.target.value)}
                      placeholder="Search bazar items"
                      aria-label="Search bazar items"
                    />
                  </label>
                  <label className="bazar-mobile-member-filter">
                    <Users size={16} aria-hidden="true" />
                    <PremiumDropdown
                      className="bazar-mobile-member-select"
                      ariaLabel="Filter bazar by member"
                      menuLabel="FILTER BY MEMBER"
                      value={bazarFilter}
                      options={[
                        { value: "all", label: "All members" },
                        ...allActiveUsers.map((member) => ({
                          value: member.id,
                          label: `${member.name}${member.role === "admin" ? " (Admin)" : ""}`,
                        })),
                        { value: "cash-in-hand", label: "Cash in Hand" },
                      ]}
                      onChange={(nextFilter) => setBazarFilter(nextFilter)}
                      minMenuWidth={210}
                      align="right"
                    />
                  </label>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="bazar-date-heading"><CalendarDays size={14} aria-hidden="true" /> Date</th>
                        <th className="bazar-amount-heading"><Wallet size={14} aria-hidden="true" /> Amount</th>
                        <th className="bazar-items-heading">
                          <div className="bazar-items-header-content">
                            <span className="bazar-table-heading-label"><ShoppingBasket size={14} aria-hidden="true" /> Items</span>
                            <label className="bazar-search bazar-table-search">
                              <Search size={16} aria-hidden="true" />
                              <input
                                type="search"
                                value={bazarSearch}
                                onChange={(event) => setBazarSearch(event.target.value)}
                                placeholder="Search items..."
                                aria-label="Search bazar items"
                              />
                            </label>
                          </div>
                        </th>
                        <th className="bazar-paid-heading">
                          <span className="bazar-filter-select bazar-table-member-filter" ref={bazarFilterRef}>
                            <button
                              type="button"
                              className="bazar-filter-trigger"
                              ref={bazarFilterTriggerRef}
                              aria-label="Filter bazar by member"
                              aria-haspopup="listbox"
                              aria-expanded={bazarFilterMenuOpen}
                              aria-controls="bazar-member-filter-options"
                              onClick={() => setBazarFilterMenuOpen((open) => !open)}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") setBazarFilterMenuOpen(false);
                                if (event.key === "ArrowDown" && !bazarFilterMenuOpen) {
                                  event.preventDefault();
                                  setBazarFilterMenuOpen(true);
                                  requestAnimationFrame(() => bazarFilterRef.current?.querySelector('[role="option"]')?.focus());
                                }
                              }}
                            >
                              <span className="bazar-paid-trigger-label">
                                <Users size={14} aria-hidden="true" />
                                <span>Paid by</span>
                              </span>
                              <ChevronDown className={`bazar-filter-select-chevron${bazarFilterMenuOpen ? " is-open" : ""}`} size={14} aria-hidden="true" />
                            </button>
                            {bazarFilterMenuOpen && (
                              <div
                                className="bazar-filter-menu"
                                id="bazar-member-filter-options"
                                role="listbox"
                                aria-label="Filter by member"
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    setBazarFilterMenuOpen(false);
                                    bazarFilterTriggerRef.current?.focus();
                                    return;
                                  }
                                  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                                  event.preventDefault();
                                  const options = Array.from(event.currentTarget.querySelectorAll('[role="option"]'));
                                  const currentIndex = options.indexOf(document.activeElement);
                                  const nextIndex = event.key === "Home"
                                    ? 0
                                    : event.key === "End"
                                      ? options.length - 1
                                      : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                                  options[nextIndex]?.focus();
                                }}
                              >
                                <span className="bazar-filter-menu-label">FILTER BY MEMBER</span>
                                {[
                                  { value: "all", label: "All members" },
                                  ...allActiveUsers.map((member) => ({
                                    value: member.id,
                                    label: `${member.name}${member.role === "admin" ? " (Admin)" : ""}`,
                                  })),
                                  { value: "cash-in-hand", label: "Cash in Hand" },
                                ].map((option) => (
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={bazarFilter === option.value}
                                    tabIndex={-1}
                                    className={`bazar-filter-option${bazarFilter === option.value ? " is-selected" : ""}`}
                                    key={option.value}
                                    onClick={() => {
                                      setBazarFilter(option.value);
                                      setBazarFilterMenuOpen(false);
                                      requestAnimationFrame(() => bazarFilterTriggerRef.current?.focus());
                                    }}
                                  >
                                    <Users size={16} aria-hidden="true" />
                                    <span>{option.label}</span>
                                    {bazarFilter === option.value && <CheckCircle2 size={16} aria-hidden="true" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </span>
                        </th>
                        <th className="bazar-actions-heading"><Zap size={14} aria-hidden="true" /> Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMonthBazar.length ? filteredMonthBazar.map((b) => (
                          b.isCombined ? (
                            <tr key={b.id} className="bazar-row-combined">
                              <td className="bazar-date-cell">
                                <span className="bazar-date-label"><CalendarDays size={13} aria-hidden="true" />{b.date}</span>
                                <time className="bazar-date-tile" dateTime={b.date || undefined}>
                                  <strong>
                                    {Number.isNaN(new Date(`${b.date}T00:00:00`).getTime())
                                      ? "--"
                                      : new Date(`${b.date}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit" })}
                                  </strong>
                                  <span>
                                    {Number.isNaN(new Date(`${b.date}T00:00:00`).getTime())
                                      ? "Date"
                                      : new Date(`${b.date}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}
                                  </span>
                                </time>
                              </td>
                              <td className="bazar-history-amount bazar-amount-cell bazar-combined-amount-cell">
                                <div
                                  className="bazar-combined-amount-box"
                                  title={`Combined total: ${money(b.totalAmount)}`}
                                >
                                  <span className="bazar-combined-amount-line cash">
                                    <small>Cash in Hand</small>
                                    <strong>{money(b.cashAmount)}</strong>
                                  </span>
                                  <span className="bazar-combined-amount-line member">
                                    <small>{db.users.find((u) => u.id === b.memberId)?.name || "Member"}</small>
                                    <strong>{money(b.memberAmount)}</strong>
                                  </span>
                                </div>
                              </td>
                              <td className="bazar-items-cell">
                                <span className="bazar-item-summary">
                                  {getBazarItemSummary(b.items)}
                                </span>
                              </td>
                              <td className="bazar-paid-cell bazar-combined-paid-cell">
                                <div className="bazar-combined-payers-box">
                                  <span
                                    className="bazar-paid-by bazar-combined-payer"
                                    style={{ "--bazar-payer-hue": getBazarPayerHue("cash-in-hand") }}
                                  >
                                    <span className="bazar-paid-avatar"><Wallet size={12} aria-hidden="true" /></span>
                                    <span className="bazar-combined-payer-copy">
                                      <small>Paid by</small>
                                      <strong>Cash in Hand</strong>
                                    </span>
                                  </span>
                                  {(() => {
                                    const mem = db.users.find((u) => u.id === b.memberId);
                                    const memName = mem?.name || "Member";
                                    return (
                                      <span
                                        className="bazar-paid-by bazar-combined-payer"
                                        style={{ "--bazar-payer-hue": getBazarPayerHue(b.memberId) }}
                                      >
                                        <span className="bazar-paid-avatar">
                                          {mem?.photo_url ? (
                                            <img className="bazar-paid-avatar-image" src={mem.photo_url} alt="" />
                                          ) : (
                                            memName.slice(0, 1).toUpperCase()
                                          )}
                                        </span>
                                        <span className="bazar-combined-payer-copy">
                                          <small>Paid by</small>
                                          <strong>{memName}</strong>
                                        </span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="row-actions">
                                <div className="bazar-actions-group">
                                  <button
                                    type="button"
                                    className="icon-btn bazar-combined-view-action"
                                    title="View combined bazar details"
                                    aria-label={`View combined bazar details for ${b.date}`}
                                    onClick={() => setBazarDetailsEntry(b)}
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <div
                                    className={`bazar-row-menu${admin || b.createdBy === user?.id ? "" : " is-view-only"}`}
                                    ref={bazarActionMenuId === b.id ? bazarActionMenuRef : null}
                                    onBlur={(event) => {
                                      if (!event.currentTarget.contains(event.relatedTarget)) setBazarActionMenuId(null);
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Escape") setBazarActionMenuId(null);
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="icon-btn bazar-row-menu-trigger"
                                      title="More actions"
                                      aria-label={`More actions for bazar entry on ${b.date}`}
                                      aria-haspopup="menu"
                                      aria-expanded={bazarActionMenuId === b.id}
                                      onClick={() => setBazarActionMenuId((openId) => openId === b.id ? null : b.id)}
                                    >
                                      <MoreVertical size={18} />
                                    </button>
                                    {bazarActionMenuId === b.id && (
                                      <div className="bazar-row-menu-popover" role="menu">
                                        {(admin || b.createdBy === user?.id) && (
                                          <>
                                            <button
                                              type="button"
                                              role="menuitem"
                                              onClick={() => {
                                                setBazarActionMenuId(null);
                                                editBazar(b);
                                              }}
                                            >
                                              <Edit size={16} /> Edit entry
                                            </button>
                                            <button
                                              type="button"
                                              className="bazar-row-menu-delete premium-delete-menu-action"
                                              role="menuitem"
                                              onClick={() => {
                                                setBazarActionMenuId(null);
                                                void deleteBazar(b);
                                              }}
                                            >
                                              <PremiumDeleteIcon size={16} /> Delete entry
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                          <tr key={b.id}>
                            <td className="bazar-date-cell">
                              <span className="bazar-date-label"><CalendarDays size={13} aria-hidden="true" />{b.date}</span>
                              <time className="bazar-date-tile" dateTime={b.date || undefined}>
                                <strong>
                                  {Number.isNaN(new Date(`${b.date}T00:00:00`).getTime())
                                    ? "--"
                                    : new Date(`${b.date}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit" })}
                                </strong>
                                <span>
                                  {Number.isNaN(new Date(`${b.date}T00:00:00`).getTime())
                                    ? "Date"
                                    : new Date(`${b.date}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}
                                </span>
                              </time>
                            </td>
                            <td className="bazar-history-amount bazar-amount-cell">
                              <span className="bazar-amount-value">{money(b.amount)}</span>
                            </td>
                            <td className="bazar-items-cell">
                              <span className="bazar-item-summary">
                                {getBazarItemSummary(b.items)}
                              </span>
                            </td>
                            <td className="bazar-paid-cell">
                              <span
                                className="bazar-paid-by"
                                style={{
                                  "--bazar-payer-hue": getBazarPayerHue(
                                    b.paidFromCash ? "cash-in-hand" : b.paidBy,
                                  ),
                                }}
                              >
                                <span className="bazar-paid-avatar">
                                  {!b.paidFromCash && db.users.find((u) => u.id === b.paidBy)?.photo_url ? (
                                    <img className="bazar-paid-avatar-image" src={db.users.find((u) => u.id === b.paidBy).photo_url} alt="" />
                                  ) : (b.paidFromCash ? "Cash" : db.users.find((u) => u.id === b.paidBy)?.name || "Member").slice(0, 1).toUpperCase()}
                                </span>
                                {b.paidFromCash
                                  ? "Cash in Hand"
                                  : db.users.find((u) => u.id === b.paidBy)?.name || "Member"}
                              </span>
                            </td>
                            <td className="row-actions">
                              <div className="bazar-actions-group">
                              <div className="bazar-row-actions-desktop">
                                <button
                                  type="button"
                                  className="icon-btn bazar-desktop-action"
                                  title="View bazar details"
                                  aria-label={`View bazar details for ${b.date}`}
                                  onClick={() => setBazarDetailsEntry(b)}
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                              <div
                                className={`bazar-row-menu${admin || b.createdBy === user?.id ? "" : " is-view-only"}`}
                                ref={bazarActionMenuId === b.id ? bazarActionMenuRef : null}
                                onBlur={(event) => {
                                  if (!event.currentTarget.contains(event.relatedTarget)) setBazarActionMenuId(null);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") setBazarActionMenuId(null);
                                }}
                              >
                                <button
                                  type="button"
                                  className="icon-btn bazar-row-menu-trigger"
                                  title="More actions"
                                  aria-label={`More actions for bazar entry on ${b.date}`}
                                  aria-haspopup="menu"
                                  aria-expanded={bazarActionMenuId === b.id}
                                  onClick={() => setBazarActionMenuId((openId) => openId === b.id ? null : b.id)}
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {bazarActionMenuId === b.id && (
                                  <div className="bazar-row-menu-popover" role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="bazar-menu-view-mobile"
                                      onClick={() => {
                                        setBazarActionMenuId(null);
                                        setBazarDetailsEntry(b);
                                      }}
                                    >
                                      <Eye size={16} /> View details
                                    </button>
                                    {(admin || b.createdBy === user?.id) && (
                                      <>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            setBazarActionMenuId(null);
                                            editBazar(b);
                                          }}
                                        >
                                          <Edit size={16} /> Edit entry
                                        </button>
                                        <button
                                          type="button"
                                          className="bazar-row-menu-delete premium-delete-menu-action"
                                          role="menuitem"
                                          onClick={() => {
                                            setBazarActionMenuId(null);
                                            void deleteBazar(b);
                                          }}
                                        >
                                          <PremiumDeleteIcon size={16} /> Delete entry
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              </div>
                            </td>
                          </tr>
                          )
                        )) : (
                          <tr className="bazar-history-empty-row">
                            <td colSpan="5">
                              <div className="bazar-history-empty">
                                <span><Receipt size={19} /></span>
                                <strong>{monthBazar.length ? "No purchases for this filter" : "No bazar entries yet"}</strong>
                                <small>{monthBazar.length ? "Choose another member to see their purchases." : `Add a purchase to start ${month}'s history.`}</small>
                              </div>
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            {showAddBazar && <div
              className="modal-backdrop add-bazar-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setShowAddBazar(false);
              }}
            >
              <section
                className="modal panel form-panel add-bazar-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-bazar-title"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setShowAddBazar(false);
                }}
              >
                {bazarAddCheckPop && (
                  <div className="bazar-add-check-overlay" aria-hidden="true">
                    <div className="bazar-add-check-pop">
                      <span className="bazar-add-check-circle">
                        <Check size={34} strokeWidth={3} />
                      </span>
                      <span className="bazar-add-check-label">Item added</span>
                    </div>
                  </div>
                )}
                <div className="panel-head add-bazar-modal-heading">
                  <span className="add-bazar-modal-mark"><ShoppingBasket size={24} /></span>
                  <div>
                    <h3 id="add-bazar-title">Add bazar</h3>
                    <p>Date auto-fills today. Enter items and total paid.</p>
                  </div>
                  <button
                    type="button"
                    className="icon-btn add-bazar-close"
                    aria-label="Close Add Bazar"
                    title="Close"
                    onClick={() => setShowAddBazar(false)}
                  >
                    <X size={19} />
                  </button>
                </div>
                <form
                  onSubmit={addBazar}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
                      e.preventDefault();
                    }
                  }}
                >
                  <label>
                    Date
                    <span className="add-bazar-date-input">
                      <CalendarDays size={18} aria-hidden="true" />
                      <input
                        type="date"
                        value={bazarForm.date}
                        onChange={(e) =>
                          setBazarForm({ ...bazarForm, date: e.target.value })
                        }
                        required
                      />
                    </span>
                  </label>
                  <div className="bazar-simple-builder">
                    <div className="bazar-simple-fields">
                      <div
                        className="bazar-simple-field bazar-item-autocomplete"
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            setBazarSuggestionOpen(false);
                          }
                        }}
                      >
                        <div className="bazar-simple-label-row">
                          <label htmlFor="bazar-item-search">Item</label>
                          {admin && (
                            <button
                              type="button"
                              className="bazar-simple-manage-items"
                              onClick={openCommonItemsModal}
                            >
                              <Pencil size={13} /> Manage items
                            </button>
                          )}
                        </div>
                        <div className={`bazar-item-search-control${chosenBazarPreset ? " has-selection" : ""}`}>
                          <span className="bazar-item-search-icon" aria-hidden="true">
                            {chosenBazarPreset
                              ? (bazarItemPicker.catalogEmoji || renderCommonBazarIcon(chosenBazarPreset, 22))
                              : <Search size={18} />}
                          </span>
                          <input
                            id="bazar-item-search"
                            type="text"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={bazarSuggestionOpen}
                            aria-controls="bazar-item-suggestions"
                            autoComplete="off"
                            placeholder="Search potato, alu, alo..."
                            value={bazarItemSearch}
                            onFocus={() => setBazarSuggestionOpen(true)}
                            onChange={(event) => {
                              const value = event.target.value;
                              setBazarItemSearch(value);
                              setBazarSuggestionOpen(true);
                              setBazarPickerError("");
                              setBazarItemPicker((prev) => ({
                                ...prev,
                                itemId: "",
                                customName: "",
                                catalogName: "",
                                catalogEmoji: "",
                              }));
                            }}
                          />
                          {chosenBazarPreset && <CheckCircle2 className="bazar-item-selected-check" size={17} />}
                        </div>
                        {bazarSuggestionOpen && (
                          <div className="bazar-item-suggestions" id="bazar-item-suggestions" role="listbox">
                            {bazarItemSuggestions.map((preset) => (
                              <button
                                type="button"
                                role="option"
                                aria-selected={chosenBazarPreset?.id === preset.id}
                                className="bazar-item-suggestion"
                                key={preset.suggestionKey || preset.id}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setBazarItemSearch(preset.name);
                                  setBazarItemPicker((prev) => ({
                                    ...prev,
                                    ...getBazarPickerSuggestionPatch(preset),
                                  }));
                                  setBazarPickerError("");
                                  setBazarSuggestionOpen(false);
                                }}
                              >
                                <span className="bazar-item-suggestion-icon" aria-hidden="true">
                                  {renderCommonBazarIcon(preset, 23)}
                                </span>
                                <span className="bazar-item-suggestion-copy">
                                  <strong>{preset.name}</strong>
                                  <small>{preset.subItem ? preset.parentName : preset.id} · {preset.defaultUnit}</small>
                                </span>
                                <ChevronRight size={15} aria-hidden="true" />
                              </button>
                            ))}
                            {normalizedBazarItemSearch && (
                              <button
                                type="button"
                                role="option"
                                aria-selected={chosenBazarPreset?.isCustom || false}
                                className="bazar-item-suggestion is-custom"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  const customPreset = commonBazarItems.find((item) => item.isCustom) || BAZAR_COMMON_ITEMS.find((item) => item.isCustom);
                                  setBazarItemPicker((prev) => ({
                                    ...prev,
                                    itemId: customPreset.id,
                                    customName: bazarItemSearch.trim(),
                                    catalogName: "",
                                    catalogEmoji: "",
                                    unit: customPreset.defaultUnit,
                                  }));
                                  setBazarPickerError("");
                                  setBazarSuggestionOpen(false);
                                }}
                              >
                                <span className="bazar-item-suggestion-icon" aria-hidden="true">
                                  {renderCommonBazarIcon(commonBazarItems.find((item) => item.isCustom), 23)}
                                </span>
                                <span className="bazar-item-suggestion-copy">
                                  <strong>Use “{bazarItemSearch.trim()}”</strong>
                                  <small>Track as a custom item</small>
                                </span>
                                <Plus size={15} aria-hidden="true" />
                              </button>
                            )}
                            {!bazarItemSuggestions.length && !normalizedBazarItemSearch && (
                              <span className="bazar-item-suggestion-empty">Start typing an item name.</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="bazar-simple-field">
                        <label htmlFor="bazar-simple-quantity">পরিমাণ</label>
                        <div className="bazar-simple-quantity">
                          <input
                            id="bazar-simple-quantity"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="1"
                            value={bazarItemPicker.qty}
                            onChange={(event) => {
                              setBazarPickerError("");
                              setBazarItemPicker((prev) => ({ ...prev, qty: event.target.value }));
                            }}
                          />
                          <PremiumDropdown
                            ariaLabel="Quantity unit"
                            menuLabel="SELECT UNIT"
                            className="bazar-unit-select"
                            value={bazarItemPicker.unit}
                            options={BAZAR_UNIT_OPTIONS}
                            onChange={(nextUnit) =>
                              setBazarItemPicker((prev) => ({ ...prev, unit: nextUnit }))
                            }
                            minMenuWidth={168}
                            align="right"
                          />
                        </div>
                      </div>

                      <div className="bazar-simple-field">
                        <label htmlFor="bazar-simple-price">দাম (৳)</label>
                        <input
                          id="bazar-simple-price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={bazarItemPicker.unitPrice}
                          onChange={(event) => {
                            setBazarPickerError("");
                            setBazarItemPicker((prev) => ({ ...prev, unitPrice: event.target.value }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addPickerItemToBazarRows();
                            }
                          }}
                        />
                      </div>

                      <button type="button" className="bazar-simple-add" onClick={addPickerItemToBazarRows}>
                        <Plus size={17} /> Add item
                      </button>
                    </div>

                    {bazarPickerError && <p className="bazar-simple-error">{bazarPickerError}</p>}

                    {bazarRows.length > 0 && (
                      <div className="bazar-tracked-items">
                        <div className="bazar-tracked-head">
                          <span>Item</span><span>পরিমাণ</span><span>দাম</span><span />
                        </div>
                        {bazarRows.map((row, index) => (
                          <div className="bazar-tracked-row" key={`${row.item}-${index}`}>
                            <span className="bazar-tracked-item">
                              <span aria-hidden="true">{renderBazarItemIcon(row.item, 19)}</span>
                              <strong>{row.item}</strong>
                            </span>
                            <span className="bazar-tracked-quantity">
                              <input
                                aria-label={`Quantity for ${row.item}`}
                                type="number"
                                min="0"
                                step="any"
                                value={row.quantity ?? ""}
                                onChange={(event) => updateBazarRow(index, "quantity", event.target.value)}
                              />
                              <PremiumDropdown
                                ariaLabel={`Unit for ${row.item}`}
                                menuLabel="SELECT UNIT"
                                className="bazar-unit-select"
                                value={row.unit || "kg"}
                                options={BAZAR_UNIT_OPTIONS}
                                onChange={(nextUnit) => updateBazarRow(index, "unit", nextUnit)}
                                minMenuWidth={168}
                                align="right"
                              />
                            </span>
                            <input
                              aria-label={`Price for ${row.item}`}
                              className="bazar-tracked-price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.price}
                              onChange={(event) => updateBazarRow(index, "price", event.target.value)}
                            />
                            <button
                              type="button"
                              className="icon-btn danger-text bazar-tracked-remove"
                              aria-label={`Remove ${row.item}`}
                              onClick={() => removeBazarRow(index)}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bazar-simple-total">
                      <span>{bazarRows.length} tracked item{bazarRows.length === 1 ? "" : "s"}</span>
                      <strong>Total {money(bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0))}</strong>
                    </div>
                  </div>

                  <div className="bazar-item-list bazar-card-builder bazar-legacy-builder-hidden" aria-hidden="true">
                    <div className="bazar-builder-grid">
                      <div className="bazar-common-pane">
                        <div className="bazar-common-head">
                          <span className="bazar-common-title">Common Items</span>
                          {admin && (
                            <button
                              type="button"
                              className="bazar-common-edit-btn"
                              title="Edit common items"
                              aria-label="Edit common items"
                              onClick={openCommonItemsModal}
                            >
                              <Pencil size={13} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                        <div className="bazar-common-grid" role="radiogroup" aria-label="Common bazar items">
                          {commonBazarItems.map((preset) => {
                            const active = bazarItemPicker.itemId === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`bazar-common-card${active ? " is-selected" : ""}${preset.isCustom ? " is-others" : ""}`}
                                onClick={() => {
                                  setBazarPickerError("");
                                  setBazarItemPicker((prev) => ({
                                    ...prev,
                                    itemId: preset.id,
                                    unit: preset.defaultUnit,
                                    catalogName: "",
                                    catalogEmoji: "",
                                  }));
                                }}
                              >
                                {active && (
                                  <span className="bazar-common-check" aria-hidden="true">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                )}
                                <span className={`bazar-common-icon${preset.isCustom ? " is-dots" : ""}`} aria-hidden="true">
                                  {renderCommonBazarIcon(preset, 24)}
                                </span>
                                <span className="bazar-common-name">{preset.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bazar-detail-card">
                        <div className="bazar-detail-header">
                          <span className={`bazar-detail-badge${selectedBazarPreset.isCustom ? " is-dots" : ""}`} aria-hidden="true">
                            {renderCommonBazarIcon(selectedBazarPreset, 22)}
                          </span>
                          <div className="bazar-detail-heading">
                            <strong>{selectedBazarPreset.name}</strong>
                            <small>{selectedBazarPreset.hint}</small>
                          </div>
                        </div>

                        <div className="bazar-detail-body">
                          {selectedBazarPreset.id === "mosla" && (
                            <div className="bazar-detail-field">
                              <label htmlFor="bazar-add-moshla-type">মসলার ধরন</label>
                              <PremiumDropdown
                                id="bazar-add-moshla-type"
                                ariaLabel="মসলার ধরন"
                                menuLabel="SELECT SPICE"
                                leadingIcon={renderBazarItemIcon(bazarItemPicker.moshlaType, 18)}
                                value={bazarItemPicker.moshlaType}
                                options={BAZAR_MOSHLA_OPTIONS.map((opt) => ({
                                  value: opt,
                                  label: opt,
                                  icon: renderBazarItemIcon(opt, 18),
                                }))}
                                onChange={(nextVal) => {
                                  setBazarPickerError("");
                                  setBazarItemPicker((prev) => ({ ...prev, moshlaType: nextVal }));
                                }}
                                minMenuWidth={200}
                                align="left"
                              />
                            </div>
                          )}

                          {selectedBazarPreset.id === "sobji" && (
                            <div className="bazar-detail-field bazar-sobji-field">
                              <label htmlFor="bazar-add-sobji-name">সবজির নাম</label>
                              <input
                                id="bazar-add-sobji-name"
                                type="text"
                                autoComplete="off"
                                placeholder="যেমন: alu, begun, potol..."
                                value={bazarItemPicker.sobjiName}
                                onChange={(e) => {
                                  setBazarPickerError("");
                                  setBazarItemPicker((prev) => ({ ...prev, sobjiName: e.target.value }));
                                }}
                              />
                              {renderBazarSuggestList(
                                BAZAR_SHOBJI_SUGGESTIONS,
                                "🥬",
                                bazarItemPicker.sobjiName,
                                (picked) =>
                                  setBazarItemPicker((prev) => ({ ...prev, sobjiName: picked })),
                                "সবজির নাম সাজেশন",
                              )}
                            </div>
                          )}

                          {selectedBazarPreset.id === "mangsho" && (
                            <div className="bazar-detail-field">
                              <label htmlFor="bazar-add-mangsho-type">মাংসের ধরন</label>
                              <PremiumDropdown
                                id="bazar-add-mangsho-type"
                                ariaLabel="মাংসের ধরন"
                                menuLabel="SELECT TYPE"
                                value={bazarItemPicker.mangshoType}
                                options={BAZAR_MANGSHO_OPTIONS}
                                onChange={(nextVal) => {
                                  setBazarPickerError("");
                                  setBazarItemPicker((prev) => ({ ...prev, mangshoType: nextVal }));
                                }}
                                minMenuWidth={180}
                                align="left"
                              />
                            </div>
                          )}

                          {selectedBazarPreset.id === "mach" && (
                            <div className="bazar-detail-field bazar-sobji-field">
                              <label htmlFor="bazar-add-mach-name">মাছের নাম</label>
                              <input
                                id="bazar-add-mach-name"
                                type="text"
                                autoComplete="off"
                                placeholder="যেমন: rui, katla, tilapia..."
                                value={bazarItemPicker.machName}
                                onChange={(e) => {
                                  setBazarPickerError("");
                                  setBazarItemPicker((prev) => ({ ...prev, machName: e.target.value }));
                                }}
                              />
                              {renderBazarSuggestList(
                                BAZAR_MACH_SUGGESTIONS,
                                "🐟",
                                bazarItemPicker.machName,
                                (picked) =>
                                  setBazarItemPicker((prev) => ({ ...prev, machName: picked })),
                                "মাছের নাম সাজেশন",
                              )}
                            </div>
                          )}

                          {selectedBazarPreset.isCustom && (
                            <div className="bazar-detail-field">
                              <label htmlFor="bazar-custom-item-name">আইটেমের নাম</label>
                              <input
                                id="bazar-custom-item-name"
                                type="text"
                                placeholder="যেমন: দুধ, চিনি, আলু..."
                                value={bazarItemPicker.customName}
                                onChange={(e) => {
                                  setBazarPickerError("");
                                  setBazarItemPicker((prev) => ({ ...prev, customName: e.target.value }));
                                }}
                              />
                            </div>
                          )}

                          <div className="bazar-detail-field">
                            <label htmlFor="bazar-picker-price">দাম (৳)</label>
                            <input
                              id="bazar-picker-price"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={bazarItemPicker.unitPrice}
                              onChange={(e) => {
                                setBazarPickerError("");
                                setBazarItemPicker((prev) => ({ ...prev, unitPrice: e.target.value }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addPickerItemToBazarRows();
                                }
                              }}
                            />
                          </div>

                          <div className="bazar-detail-field">
                            <label htmlFor="bazar-picker-qty">পরিমান</label>
                            <div className="bazar-qty-controls">
                              <input
                                id="bazar-picker-qty"
                                className="bazar-qty-direct-input"
                                type="number"
                                min="0"
                                step="any"
                                placeholder="1"
                                value={bazarItemPicker.qty}
                                onChange={(e) =>
                                  setBazarItemPicker((prev) => ({ ...prev, qty: e.target.value }))
                                }
                              />
                              <PremiumDropdown
                                ariaLabel="পরিমানের একক"
                                menuLabel="SELECT UNIT"
                                className="bazar-unit-select"
                                value={bazarItemPicker.unit}
                                options={BAZAR_UNIT_OPTIONS}
                                onChange={(nextUnit) =>
                                  setBazarItemPicker((prev) => ({ ...prev, unit: nextUnit }))
                                }
                                minMenuWidth={168}
                                align="right"
                              />
                            </div>
                          </div>

                          {bazarPickerError && (
                            <p className="bazar-picker-error">{bazarPickerError}</p>
                          )}
                        </div>

                        <div className="bazar-detail-subtotal">
                          <span className="bazar-detail-subtotal-label">
                            <span className="bazar-detail-calc-badge" aria-hidden="true">
                              <Calculator size={14} />
                            </span>
                            <span>Subtotal</span>
                          </span>
                          <strong>{money(bazarPickerSubtotal)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="bazar-builder-footer">
                      <div className="bazar-quick-summary">
                        <span className="bazar-quick-summary-icon" aria-hidden="true">
                          <Info size={14} strokeWidth={2.5} />
                        </span>
                        <div>
                          <strong>Quick Summary</strong>
                          <small>
                            {bazarRows.length > 0
                              ? `${bazarRows.length} item${bazarRows.length > 1 ? "s" : ""} added • Total ${money(bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0))}`
                              : "Track your monthly usage of Rice, Oil, Meat and more!"}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="bazar-add-item-pill-btn"
                        onClick={addPickerItemToBazarRows}
                      >
                        <Check size={16} strokeWidth={2.5} />
                        <span>Add Item</span>
                      </button>
                    </div>

                    {bazarRows.length > 0 && (
                      <div className="bazar-added-items-wrap">
                        <div className="bazar-item-heading">
                          <span>Added Items ({bazarRows.length})</span>
                          <span>Price (৳)</span>
                        </div>
                        {bazarRows.map((row, index) => (
                          <div className="bazar-item-row bazar-added-row" key={index}>
                            <div className="bazar-added-item-cell">
                              <span className="bazar-added-item-icon" aria-hidden="true">
                                {renderBazarItemIcon(row.item, 18)}
                              </span>
                              <input
                                aria-label={`Item ${index + 1}`}
                                placeholder={`Item ${index + 1}`}
                                value={row.item}
                                onChange={(e) => updateBazarRow(index, "item", e.target.value)}
                              />
                            </div>
                            <input
                              aria-label={`Price ${index + 1}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={row.price}
                              onChange={(e) => updateBazarRow(index, "price", e.target.value)}
                            />
                            <button
                              type="button"
                              className="icon-btn danger-text bazar-added-remove"
                              aria-label={`Remove ${row.item || `item ${index + 1}`}`}
                              title="Remove item"
                              onClick={() => removeBazarRow(index)}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bazar-item-total">
                      <span>Total</span>
                      <strong>
                        {money(
                          bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0) ||
                            bazarPickerSubtotal,
                        )}
                      </strong>
                    </div>
                  </div>

                  <label>
                    Paid by
                    {admin ? (
                      <PremiumDropdown
                        ariaLabel="Paid by"
                        menuLabel="PAID BY"
                        value={bazarForm.paidBy || user.id}
                        options={[
                          ...allActiveUsers.map((u) => ({
                            value: u.id,
                            label: `${u.name}${u.role === "admin" ? " (Admin)" : ""}`,
                          })),
                          { value: "cash-in-hand", label: "Cash in Hand" },
                          { value: "combine", label: "⚡ Combine (Cash in Hand + Member)" },
                        ]}
                        onChange={(val) => {
                          const total = bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
                          const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal));
                          if (val === "combine") {
                            const defaultCash = Math.min(total, avail);
                            const defaultMember = Math.max(0, roundMoney(total - defaultCash));
                            setBazarForm((prev) => ({
                              ...prev,
                              paidBy: "combine",
                              combinedCashAmount: defaultCash > 0 ? String(defaultCash) : "",
                              combinedMemberAmount: defaultMember > 0 ? String(defaultMember) : "",
                              combinedMemberId: prev.combinedMemberId || user.id,
                            }));
                          } else {
                            setBazarForm((prev) => ({ ...prev, paidBy: val }));
                          }
                        }}
                        minMenuWidth={240}
                        align="left"
                      />
                    ) : (
                      <input value={user.name} readOnly aria-readonly="true" />
                    )}
                  </label>

                  {!admin && roundMoney(cashInHand - pendingCashSettlementTotal) > 0 && (
                    <label className="bazar-combine-toggle">
                      <input
                        type="checkbox"
                        checked={bazarForm.paidBy === "combine"}
                        onChange={(e) => {
                          const total = bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
                          const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal));
                          if (e.target.checked) {
                            const defaultCash = Math.min(total, avail);
                            const defaultMember = Math.max(0, roundMoney(total - defaultCash));
                            setBazarForm((prev) => ({
                              ...prev,
                              paidBy: "combine",
                              combinedCashAmount: defaultCash > 0 ? String(defaultCash) : "",
                              combinedMemberAmount: defaultMember > 0 ? String(defaultMember) : "",
                              combinedMemberId: user.id,
                            }));
                          } else {
                            setBazarForm((prev) => ({ ...prev, paidBy: user.id }));
                          }
                        }}
                      />
                      <span>Combine with Cash in Hand (Mess cash + your pocket)</span>
                    </label>
                  )}

                  {bazarForm.paidBy === "combine" && (
                    <div className="bazar-combine-card">
                      <div className="bazar-combine-header">
                        <div className="bazar-combine-title">
                          <Wallet size={16} />
                          <strong>Combine payment breakdown</strong>
                        </div>
                        <span className="bazar-combine-avail">
                          Available Cash: <strong>{money(Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal)))}</strong>
                        </span>
                      </div>

                      {admin && (
                        <label className="bazar-combine-member-select">
                          Member paying balance
                          <PremiumDropdown
                            ariaLabel="Member paying balance"
                            menuLabel="SELECT MEMBER"
                            value={bazarForm.combinedMemberId || user.id}
                            options={allActiveUsers.map((u) => ({
                              value: u.id,
                              label: `${u.name}${u.role === "admin" ? " (Admin)" : ""}`,
                            }))}
                            onChange={(val) =>
                              setBazarForm((f) => ({ ...f, combinedMemberId: val }))
                            }
                            minMenuWidth={220}
                            align="left"
                          />
                        </label>
                      )}

                      <div className="bazar-combine-inputs">
                        <label>
                          From Cash in Hand (৳)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={bazarForm.combinedCashAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              const cashNum = parseFloat(val) || 0;
                              const total = bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
                              const remaining = Math.max(0, roundMoney(total - cashNum));
                              setBazarForm((f) => ({
                                ...f,
                                combinedCashAmount: val,
                                combinedMemberAmount: val === "" ? "" : String(remaining),
                              }));
                            }}
                          />
                        </label>

                        <label>
                          From {db.users.find((u) => u.id === (bazarForm.combinedMemberId || user.id))?.name || "Member"} (৳)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={bazarForm.combinedMemberAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              const memNum = parseFloat(val) || 0;
                              const total = bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
                              const remaining = Math.max(0, roundMoney(total - memNum));
                              setBazarForm((f) => ({
                                ...f,
                                combinedMemberAmount: val,
                                combinedCashAmount: val === "" ? "" : String(remaining),
                              }));
                            }}
                          />
                        </label>
                      </div>

                      <div className="bazar-combine-quick-btns">
                        <button
                          type="button"
                          className="bazar-combine-quick-btn"
                          onClick={() => {
                            const total = bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
                            const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal));
                            const maxCash = Math.min(total, avail);
                            const rem = Math.max(0, roundMoney(total - maxCash));
                            setBazarForm((f) => ({
                              ...f,
                              combinedCashAmount: String(maxCash),
                              combinedMemberAmount: String(rem),
                            }));
                          }}
                        >
                          Use Max Cash ({money(Math.min(bazarRows.reduce((s, r) => s + Number(r.price || 0), 0), Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal))))})
                        </button>
                        <button
                          type="button"
                          className="bazar-combine-quick-btn"
                          onClick={() => {
                            const total = bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
                            const half = roundMoney(total / 2);
                            const other = roundMoney(total - half);
                            setBazarForm((f) => ({
                              ...f,
                              combinedCashAmount: String(half),
                              combinedMemberAmount: String(other),
                            }));
                          }}
                        >
                          Split 50 / 50
                        </button>
                      </div>

                      <div className="bazar-combine-status">
                        {(() => {
                          const cash = Number(bazarForm.combinedCashAmount) || 0;
                          const mem = Number(bazarForm.combinedMemberAmount) || 0;
                          const total = bazarRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
                          const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal));
                          const memName = db.users.find((u) => u.id === (bazarForm.combinedMemberId || user.id))?.name || "Member";

                          if (cash > avail) {
                            return <span className="combine-error">⚠️ Cash exceeds available Cash in Hand ({money(avail)})</span>;
                          }
                          if (Math.abs(cash + mem - total) > 0.05) {
                            const diff = roundMoney(total - (cash + mem));
                            return <span className="combine-warning">Difference: {diff > 0 ? `৳${diff} remaining to assign` : `৳${Math.abs(diff)} extra`}</span>;
                          }
                          return (
                            <span className="combine-match">
                              ✓ <strong>{money(cash)}</strong> from Cash + <strong>{money(mem)}</strong> credited to {memName}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <p className="hint">
                    {bazarForm.paidBy === "combine"
                      ? "The cash portion will be deducted from Cash in Hand, and the remaining portion will be credited to the member's meal payment balance."
                      : "The person who paid gets this amount credited against their shared expense."}
                  </p>
                  <button className="primary full">
                    <Plus size={16} /> {bazarForm.paidBy === "combine" ? "Save combined bazar" : "Save bazar"}
                  </button>
                </form>

              </section>
            </div>}
            {bazarEditEntry && (
              <div className="modal-backdrop" role="presentation">
                <section className="modal panel form-panel add-bazar-modal bazar-edit-modal bazar-entry-edit-modal" role="dialog" aria-modal="true" aria-labelledby="bazar-edit-title" onClick={(e) => e.stopPropagation()}>
                  {bazarEditCheckPop && (
                    <div className="bazar-add-check-overlay" aria-hidden="true">
                      <div className="bazar-add-check-pop">
                        <span className="bazar-add-check-circle">
                          <Check size={34} strokeWidth={3} />
                        </span>
                        <span className="bazar-add-check-label">Item added</span>
                      </div>
                    </div>
                  )}
                  <div className="panel-head add-bazar-modal-heading">
                    <span className="add-bazar-modal-mark"><ShoppingBasket size={24} /></span>
                    <div>
                      <h3 id="bazar-edit-title">Edit bazar entry</h3>
                      <p>Update date, items and prices</p>
                    </div>
                    <button
                      type="button"
                      className="icon-btn add-bazar-close"
                      aria-label="Close Edit Bazar"
                      title="Close"
                      onClick={() => setBazarEditEntry(null)}
                    >
                      <X size={19} />
                    </button>
                  </div>
                  <form
                    className="bazar-edit-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveBazarEdit();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
                        e.preventDefault();
                      }
                    }}
                  >
                    <label>
                      Date
                      <span className="add-bazar-date-input">
                        <CalendarDays size={18} aria-hidden="true" />
                        <input
                          type="date"
                          value={bazarEditEntry.editDate}
                          onChange={(e) => setBazarEditEntry((old) => ({ ...old, editDate: e.target.value }))}
                          required
                        />
                      </span>
                    </label>
                    <div className="bazar-simple-builder bazar-edit-simple-builder">
                      <div className="bazar-simple-fields">
                        <div
                          className="bazar-simple-field bazar-item-autocomplete"
                          onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) {
                              setBazarEditSuggestionOpen(false);
                            }
                          }}
                        >
                          <div className="bazar-simple-label-row">
                            <label htmlFor="bazar-edit-item-search">Item</label>
                            {admin && (
                              <button type="button" className="bazar-simple-manage-items" onClick={openCommonItemsModal}>
                                <Pencil size={13} /> Manage items
                              </button>
                            )}
                          </div>
                          <div className={`bazar-item-search-control${chosenBazarEditPreset ? " has-selection" : ""}`}>
                            <span className="bazar-item-search-icon" aria-hidden="true">
                              {chosenBazarEditPreset
                                ? (bazarEditPicker.catalogEmoji || renderCommonBazarIcon(chosenBazarEditPreset, 22))
                                : <Search size={18} />}
                            </span>
                            <input
                              id="bazar-edit-item-search"
                              type="text"
                              role="combobox"
                              aria-autocomplete="list"
                              aria-expanded={bazarEditSuggestionOpen}
                              aria-controls="bazar-edit-item-suggestions"
                              autoComplete="off"
                              placeholder="Search potato, alu, alo..."
                              value={bazarEditItemSearch}
                              onFocus={() => setBazarEditSuggestionOpen(true)}
                              onChange={(event) => {
                                setBazarEditItemSearch(event.target.value);
                                setBazarEditSuggestionOpen(true);
                                setBazarEditPickerError("");
                                setBazarEditPicker((prev) => ({
                                  ...prev,
                                  itemId: "",
                                  customName: "",
                                  catalogName: "",
                                  catalogEmoji: "",
                                }));
                              }}
                            />
                            {chosenBazarEditPreset && <CheckCircle2 className="bazar-item-selected-check" size={17} />}
                          </div>
                          {bazarEditSuggestionOpen && (
                            <div className="bazar-item-suggestions" id="bazar-edit-item-suggestions" role="listbox">
                              {bazarEditSuggestions.map((preset) => (
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={chosenBazarEditPreset?.id === preset.id}
                                  className="bazar-item-suggestion"
                                  key={preset.suggestionKey || preset.id}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setBazarEditItemSearch(preset.name);
                                    setBazarEditPicker((prev) => ({
                                      ...prev,
                                      ...getBazarPickerSuggestionPatch(preset),
                                    }));
                                    setBazarEditPickerError("");
                                    setBazarEditSuggestionOpen(false);
                                  }}
                                >
                                  <span className="bazar-item-suggestion-icon" aria-hidden="true">
                                    {renderCommonBazarIcon(preset, 23)}
                                  </span>
                                  <span className="bazar-item-suggestion-copy">
                                    <strong>{preset.name}</strong>
                                    <small>{preset.subItem ? preset.parentName : preset.id} · {preset.defaultUnit}</small>
                                  </span>
                                  <ChevronRight size={15} aria-hidden="true" />
                                </button>
                              ))}
                              {bazarEditItemSearch.trim() && (
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={chosenBazarEditPreset?.isCustom || false}
                                  className="bazar-item-suggestion is-custom"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    const customPreset = commonBazarItems.find((item) => item.isCustom) || BAZAR_COMMON_ITEMS.find((item) => item.isCustom);
                                    setBazarEditPicker((prev) => ({
                                      ...prev,
                                      itemId: customPreset.id,
                                      customName: bazarEditItemSearch.trim(),
                                      catalogName: "",
                                      catalogEmoji: "",
                                      unit: customPreset.defaultUnit,
                                    }));
                                    setBazarEditPickerError("");
                                    setBazarEditSuggestionOpen(false);
                                  }}
                                >
                                  <span className="bazar-item-suggestion-icon" aria-hidden="true">
                                    {renderCommonBazarIcon(commonBazarItems.find((item) => item.isCustom), 23)}
                                  </span>
                                  <span className="bazar-item-suggestion-copy">
                                    <strong>Use “{bazarEditItemSearch.trim()}”</strong>
                                    <small>Track as a custom item</small>
                                  </span>
                                  <Plus size={15} aria-hidden="true" />
                                </button>
                              )}
                              {!bazarEditSuggestions.length && !bazarEditItemSearch.trim() && (
                                <span className="bazar-item-suggestion-empty">Start typing an item name.</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bazar-simple-field">
                          <label htmlFor="bazar-edit-simple-quantity">পরিমাণ</label>
                          <div className="bazar-simple-quantity">
                            <input
                              id="bazar-edit-simple-quantity"
                              type="number"
                              min="0"
                              step="any"
                              placeholder="1"
                              value={bazarEditPicker.qty}
                              onChange={(event) => {
                                setBazarEditPickerError("");
                                setBazarEditPicker((prev) => ({ ...prev, qty: event.target.value }));
                              }}
                            />
                            <PremiumDropdown
                              ariaLabel="Quantity unit"
                              menuLabel="SELECT UNIT"
                              className="bazar-unit-select"
                              value={bazarEditPicker.unit}
                              options={BAZAR_UNIT_OPTIONS}
                              onChange={(nextUnit) =>
                                setBazarEditPicker((prev) => ({ ...prev, unit: nextUnit }))
                              }
                              minMenuWidth={168}
                              align="right"
                            />
                          </div>
                        </div>

                        <div className="bazar-simple-field">
                          <label htmlFor="bazar-edit-simple-price">দাম (৳)</label>
                          <input
                            id="bazar-edit-simple-price"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={bazarEditPicker.unitPrice}
                            onChange={(event) => {
                              setBazarEditPickerError("");
                              setBazarEditPicker((prev) => ({ ...prev, unitPrice: event.target.value }));
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addPickerItemToEditBazar();
                              }
                            }}
                          />
                        </div>

                        <button type="button" className="bazar-simple-add" onClick={addPickerItemToEditBazar}>
                          <Plus size={17} /> Add item
                        </button>
                      </div>

                      {bazarEditPickerError && <p className="bazar-simple-error">{bazarEditPickerError}</p>}

                      {(bazarEditEntry.editItems || []).length > 0 && (
                        <div className="bazar-tracked-items">
                          <div className="bazar-tracked-head">
                            <span>Item</span><span>Quantity</span><span>Price</span><span />
                          </div>
                          {(bazarEditEntry.editItems || []).map((row, index) => (
                            <div className="bazar-tracked-row" key={`${row.item}-${index}`}>
                              <span className="bazar-tracked-item bazar-edit-tracked-item">
                                <span aria-hidden="true">{renderBazarItemIcon(row.item, 19)}</span>
                                <input
                                  aria-label={`Item ${index + 1}`}
                                  value={row.item}
                                  onChange={(event) => updateBazarEditItem(index, "item", event.target.value)}
                                />
                              </span>
                              <span className="bazar-tracked-quantity">
                                <input
                                  aria-label={`Quantity for ${row.item}`}
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ""}
                                  onChange={(event) => updateBazarEditItem(index, "quantity", event.target.value)}
                                />
                                <PremiumDropdown
                                  ariaLabel={`Unit for ${row.item}`}
                                  menuLabel="SELECT UNIT"
                                  className="bazar-unit-select"
                                  value={row.unit || "kg"}
                                  options={BAZAR_UNIT_OPTIONS}
                                  onChange={(nextUnit) => updateBazarEditItem(index, "unit", nextUnit)}
                                  minMenuWidth={168}
                                  align="right"
                                />
                              </span>
                              <input
                                aria-label={`Price for ${row.item}`}
                                className="bazar-tracked-price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.price}
                                onChange={(event) => updateBazarEditItem(index, "price", event.target.value)}
                              />
                              <button
                                type="button"
                                className="icon-btn danger-text bazar-tracked-remove"
                                aria-label={`Remove ${row.item}`}
                                onClick={() => removeBazarEditItem(index)}
                                disabled={(bazarEditEntry.editItems || []).length === 1}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bazar-simple-total">
                        <span>{(bazarEditEntry.editItems || []).length} tracked item{(bazarEditEntry.editItems || []).length === 1 ? "" : "s"}</span>
                        <strong>Total {money((bazarEditEntry.editItems || []).reduce((sum, row) => sum + Number(row.price || 0), 0))}</strong>
                      </div>
                    </div>

                    {admin ? (
                      <label>
                        Paid by
                        <PremiumDropdown
                          ariaLabel="Paid by"
                          menuLabel="PAID BY"
                          value={bazarEditEntry.editPaidBy}
                          options={[
                            ...(db.users || [])
                              .filter((member) => member.active !== false || member.id === bazarEditEntry.editPaidBy)
                              .map((member) => ({
                                value: member.id,
                                label: `${member.name}${member.role === "admin" ? " (Admin)" : ""}`,
                              })),
                            { value: "cash-in-hand", label: "Cash in Hand" },
                            { value: "combine", label: "⚡ Combine (Cash in Hand + Member)" },
                          ]}
                          onChange={(val) => {
                            const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                            const oldCash = bazarEditEntry.isCombined
          ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0)
          : bazarEditEntry.paidFromCash
            ? Number(bazarEditEntry.amount || 0)
            : 0;
                            const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + oldCash));
                            if (val === "combine") {
                              const defaultCash = Math.min(total, avail);
                              const defaultMember = Math.max(0, roundMoney(total - defaultCash));
                              setBazarEditEntry((old) => ({
                                ...old,
                                editPaidBy: "combine",
                                combinedCashAmount: defaultCash > 0 ? String(defaultCash) : "",
                                combinedMemberAmount: defaultMember > 0 ? String(defaultMember) : "",
                                combinedMemberId: old.combinedMemberId || old.paidBy || user?.id,
                              }));
                            } else {
                              setBazarEditEntry((old) => ({ ...old, editPaidBy: val }));
                            }
                          }}
                          minMenuWidth={240}
                          align="left"
                        />
                      </label>
                    ) : (
                      roundMoney(cashInHand - pendingCashSettlementTotal + (bazarEditEntry.isCombined ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0) : (bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0))) > 0 && (
                        <label className="bazar-combine-toggle">
                          <input
                            type="checkbox"
                            checked={bazarEditEntry.editPaidBy === "combine"}
                            onChange={(e) => {
                              const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                              const oldCash = bazarEditEntry.isCombined
          ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0)
          : bazarEditEntry.paidFromCash
            ? Number(bazarEditEntry.amount || 0)
            : 0;
                              const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + oldCash));
                              if (e.target.checked) {
                                const defaultCash = Math.min(total, avail);
                                const defaultMember = Math.max(0, roundMoney(total - defaultCash));
                                setBazarEditEntry((old) => ({
                                  ...old,
                                  editPaidBy: "combine",
                                  combinedCashAmount: defaultCash > 0 ? String(defaultCash) : "",
                                  combinedMemberAmount: defaultMember > 0 ? String(defaultMember) : "",
                                  combinedMemberId: user?.id,
                                }));
                              } else {
                                setBazarEditEntry((old) => ({ ...old, editPaidBy: user?.id }));
                              }
                            }}
                          />
                          <span>Combine with Cash in Hand (Mess cash + your pocket)</span>
                        </label>
                      )
                    )}

                    {bazarEditEntry.editPaidBy === "combine" && (
                      <div className="bazar-combine-card">
                        <div className="bazar-combine-header">
                          <div className="bazar-combine-title">
                            <Wallet size={16} />
                            <strong>Combine payment breakdown</strong>
                          </div>
                          <span className="bazar-combine-avail">
                            Available Cash: <strong>{money(Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + (bazarEditEntry.isCombined ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0) : (bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0)))))}</strong>
                          </span>
                        </div>

                        {admin && (
                          <label className="bazar-combine-member-select">
                            Member paying balance
                            <PremiumDropdown
                              ariaLabel="Member paying balance"
                              menuLabel="SELECT MEMBER"
                              value={bazarEditEntry.combinedMemberId || user?.id}
                              options={allActiveUsers.map((u) => ({
                                value: u.id,
                                label: `${u.name}${u.role === "admin" ? " (Admin)" : ""}`,
                              }))}
                              onChange={(val) =>
                                setBazarEditEntry((old) => ({ ...old, combinedMemberId: val }))
                              }
                              minMenuWidth={220}
                              align="left"
                            />
                          </label>
                        )}

                        <div className="bazar-combine-inputs">
                          <label>
                            From Cash in Hand (৳)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={bazarEditEntry.combinedCashAmount}
                              onChange={(e) => {
                                const val = e.target.value;
                                const cashNum = parseFloat(val) || 0;
                                const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                                const remaining = Math.max(0, roundMoney(total - cashNum));
                                setBazarEditEntry((old) => ({
                                  ...old,
                                  combinedCashAmount: val,
                                  combinedMemberAmount: val === "" ? "" : String(remaining),
                                }));
                              }}
                            />
                          </label>

                          <label>
                            From {db.users.find((u) => u.id === (bazarEditEntry.combinedMemberId || user?.id))?.name || "Member"} (৳)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={bazarEditEntry.combinedMemberAmount}
                              onChange={(e) => {
                                const val = e.target.value;
                                const memNum = parseFloat(val) || 0;
                                const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                                const remaining = Math.max(0, roundMoney(total - memNum));
                                setBazarEditEntry((old) => ({
                                  ...old,
                                  combinedMemberAmount: val,
                                  combinedCashAmount: val === "" ? "" : String(remaining),
                                }));
                              }}
                            />
                          </label>
                        </div>

                        <div className="bazar-combine-quick-btns">
                          <button
                            type="button"
                            className="bazar-combine-quick-btn"
                            onClick={() => {
                              const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                              const oldCash = bazarEditEntry.isCombined
          ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0)
          : bazarEditEntry.paidFromCash
            ? Number(bazarEditEntry.amount || 0)
            : 0;
                              const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + oldCash));
                              const maxCash = Math.min(total, avail);
                              const rem = Math.max(0, roundMoney(total - maxCash));
                              setBazarEditEntry((old) => ({
                                ...old,
                                combinedCashAmount: String(maxCash),
                                combinedMemberAmount: String(rem),
                              }));
                            }}
                          >
                            Use Max Cash ({money(Math.min((bazarEditEntry.editItems || []).reduce((s, r) => s + (Number(r.price) || 0), 0), Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + (bazarEditEntry.isCombined ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0) : (bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0))))))})
                          </button>
                          <button
                            type="button"
                            className="bazar-combine-quick-btn"
                            onClick={() => {
                              const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                              const half = roundMoney(total / 2);
                              const other = roundMoney(total - half);
                              setBazarEditEntry((old) => ({
                                ...old,
                                combinedCashAmount: String(half),
                                combinedMemberAmount: String(other),
                              }));
                            }}
                          >
                            Split 50 / 50
                          </button>
                        </div>

                        <div className="bazar-combine-status">
                          {(() => {
                            const cash = Number(bazarEditEntry.combinedCashAmount) || 0;
                            const mem = Number(bazarEditEntry.combinedMemberAmount) || 0;
                            const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                            const oldCash = bazarEditEntry.isCombined
          ? Number(bazarEditEntry.cashEntry?.amount ?? bazarEditEntry.cashAmount ?? 0)
          : bazarEditEntry.paidFromCash
            ? Number(bazarEditEntry.amount || 0)
            : 0;
                            const avail = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + oldCash));
                            const memName = db.users.find((u) => u.id === (bazarEditEntry.combinedMemberId || user?.id))?.name || "Member";

                            if (cash > avail) {
                              return <span className="combine-error">⚠️ Cash exceeds available Cash in Hand ({money(avail)})</span>;
                            }
                            if (Math.abs(cash + mem - total) > 0.05) {
                              const diff = roundMoney(total - (cash + mem));
                              return <span className="combine-warning">Difference: {diff > 0 ? `৳${diff} remaining to assign` : `৳${Math.abs(diff)} extra`}</span>;
                            }
                            return (
                              <span className="combine-match">
                                ✓ <strong>{money(cash)}</strong> from Cash + <strong>{money(mem)}</strong> credited to {memName}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="bazar-edit-actions">
                      <button type="button" className="secondary bazar-action" onClick={() => setBazarEditEntry(null)}>Cancel</button>
                      <button type="submit" className="primary">{bazarEditEntry.editPaidBy === "combine" ? "Save combined changes" : "Save changes"}</button>
                    </div>
                  </form>
                </section>
              </div>
            )}
            {bazarDetailsEntry && (
              <div className="modal-backdrop" role="presentation">
                <section className="modal panel bazar-details-modal" role="dialog" aria-modal="true" aria-labelledby="bazar-details-title" onClick={(e) => e.stopPropagation()}>
                  <PanelHead title="Bazar details" sub={bazarDetailsEntry.date} />
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Item</th><th>Quantity</th><th>Price</th></tr></thead>
                      <tbody>
                        {(() => {
                          let details = Array.isArray(bazarDetailsEntry.items) ? bazarDetailsEntry.items : null;
                          if (!details && typeof bazarDetailsEntry.items === "string") {
                            try { const parsed=JSON.parse(bazarDetailsEntry.items); details=Array.isArray(parsed)?parsed:null; } catch { details=null; }
                          }
                          const normalize = (entry) => {
                            if (typeof entry === "string") return { item: entry.trim(), quantity: null, unit: "", price: null };
                            if (!entry || typeof entry !== "object") return { item: "", quantity: null, unit: "", price: null };
                            const rawItem = entry.item ?? entry.name ?? entry.title;
                            const item = typeof rawItem === "string" ? rawItem : (rawItem?.name ?? rawItem?.item ?? "");
                            const rawQuantity = entry.quantity ?? entry.qty;
                            const quantity = rawQuantity === "" || rawQuantity == null || !Number.isFinite(Number(rawQuantity)) ? null : Number(rawQuantity);
                            const unit = String(entry.unit || "").trim();
                            const rawPrice = entry.price ?? entry.amount ?? rawItem?.price;
                            const price = rawPrice === "" || rawPrice == null || !Number.isFinite(Number(rawPrice)) ? null : Number(rawPrice);
                            return { item: String(item || "").trim(), quantity, unit, price };
                          };
                          const rows = (details || String(bazarDetailsEntry.items||"").split(",")).map(normalize).filter(row=>row.item);
                          return rows.map((entry,index)=><tr key={`${index}-${entry.item}`}><td>{entry.item}</td><td>{entry.quantity==null?"—":`${entry.quantity} ${entry.unit}`}</td><td>{entry.price==null?"—":money(entry.price)}</td></tr>);
                        })()}</tbody>
                    </table>
                  </div>
                  {bazarDetailsEntry.isCombined && (
                    <div className="bazar-details-combine-card">
                      <div className="bazar-details-combine-head">
                        <strong>Payment split</strong>
                        <span className="bazar-combine-badge">Combined purchase</span>
                      </div>
                      <div className="bazar-details-combine-rows">
                        <div className="bazar-details-combine-row cash">
                          <span>Paid from Cash in Hand</span>
                          <strong>{money(bazarDetailsEntry.cashAmount)}</strong>
                        </div>
                        <div className="bazar-details-combine-row member">
                          <span>Paid by {db.users.find((u) => u.id === bazarDetailsEntry.memberId)?.name || "Member"}</span>
                          <strong>{money(bazarDetailsEntry.memberAmount)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="total-row"><b>Total</b><b>{money(bazarDetailsEntry.isCombined ? bazarDetailsEntry.totalAmount : bazarDetailsEntry.amount)}</b></div>
                  <button type="button" className="secondary full bazar-details-close bazar-action" onClick={() => setBazarDetailsEntry(null)}>Close</button>
                </section>
              </div>
            )}
            {pendingBazarDelete && (
              <div className="modal-backdrop delete-confirm-backdrop">
                <section className="modal panel delete-confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  <div className="delete-confirm-icon delete-confirm-square">
                    <PremiumDeleteIcon size={30} />
                  </div>
                  <h3>Delete bazar entry?</h3>
                  <p>This entry will be permanently removed. This action cannot be undone.</p>
                  <div className="delete-confirm-actions">
                    <button className="secondary delete-confirm-cancel bazar-action" onClick={() => setPendingBazarDelete(null)}>Cancel</button>
                    <button className="danger delete-confirm-confirm bazar-action" onClick={async () => { const entry=pendingBazarDelete; try { const idsToDelete = entry.isCombined && entry.entries ? entry.entries.map((e) => e.id) : [entry.id]; const {error}=await supabase.from("bazar_entries").delete().in("id", idsToDelete); if(error) throw error; setPendingBazarDelete(null); await loadCloudData(user.id,month); setBazarSuccessToast(entry.isCombined ? "Combined bazar deleted successfully" : "Bazar deleted successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600); } catch(e) { alert("Could not delete bazar: "+e.message); } }}>Delete entry</button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
        {commonItemsModalOpen && admin && (
          <div
            className="modal-backdrop bazar-common-manage-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !commonItemsBusy) {
                setCommonItemsModalOpen(false);
              }
            }}
          >
            <section
              className="modal panel bazar-common-manage-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Manage common bazar items"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bazar-common-manage-head">
                <div>
                  <span className="bazar-common-manage-eyebrow">ADMIN CATALOG</span>
                  <h3>Manage Common Items</h3>
                  <p>Add, edit, or delete quick-pick items and icons.</p>
                </div>
                <button
                  type="button"
                  className="icon-btn bazar-action"
                  aria-label="Close common items manager"
                  onClick={() => setCommonItemsModalOpen(false)}
                  disabled={commonItemsBusy}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="bazar-common-manage-form" onSubmit={submitCommonItemForm}>
                <div className="bazar-common-manage-fields">
                  <div className="bazar-common-manage-field is-icon">
                    <span>Icon</span>
                    <div className="bazar-common-upload-box">
                      <span className="bazar-common-upload-preview" aria-hidden="true">
                        {commonItemForm.iconUrl ? (
                          <TransparentFoodIcon
                            src={commonItemForm.iconUrl}
                            className="bazar-common-uploaded-icon"
                            style={{ width: 22, height: 22 }}
                          />
                        ) : (
                          commonItemForm.emoji || "🛒"
                        )}
                      </span>
                      <label className="bazar-common-upload-btn" title="Upload icon image">
                        <ImagePlus size={14} />
                        <span>{commonIconUploading ? "..." : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*,.svg,.png,.webp,.jpg,.jpeg"
                          onChange={handleCommonItemIconUpload}
                          disabled={commonItemsBusy || commonIconUploading}
                          hidden
                        />
                      </label>
                      {commonItemForm.iconUrl && (
                        <button
                          type="button"
                          className="bazar-common-upload-clear"
                          title="Remove uploaded icon"
                          aria-label="Remove uploaded icon"
                          onClick={() =>
                            setCommonItemForm((prev) => ({ ...prev, iconUrl: "" }))
                          }
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <label className="bazar-common-manage-field is-name">
                    <span>Item name</span>
                    <input
                      type="text"
                      required
                      value={commonItemForm.name}
                      onChange={(e) =>
                        setCommonItemForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g. আলু, দুধ, চিনি..."
                    />
                  </label>
                  <label className="bazar-common-manage-field is-unit">
                    <span>Unit</span>
                    <PremiumDropdown
                      ariaLabel="Default unit"
                      menuLabel="SELECT UNIT"
                      className="bazar-unit-select"
                      value={commonItemForm.defaultUnit}
                      options={COMMON_UNIT_OPTIONS}
                      onChange={(nextUnit) =>
                        setCommonItemForm((prev) => ({ ...prev, defaultUnit: nextUnit }))
                      }
                      minMenuWidth={168}
                      align="right"
                    />
                  </label>
                </div>

                <div className="bazar-common-manage-submit-row">
                  {commonItemForm.editingId && (
                    <button
                      type="button"
                      className="secondary bazar-action"
                      onClick={() =>
                        setCommonItemForm({
                          editingId: "",
                          name: "",
                          emoji: "🛒",
                          iconUrl: "",
                          defaultUnit: "kg",
                        })
                      }
                      disabled={commonItemsBusy}
                    >
                      Cancel edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="primary bazar-action"
                    disabled={commonItemsBusy || commonIconUploading || !commonItemForm.name.trim()}
                  >
                    {commonItemForm.editingId ? (
                      <>
                        <Check size={15} /> Save changes
                      </>
                    ) : (
                      <>
                        <Plus size={15} /> Add item
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="bazar-common-manage-list" role="list">
                {commonBazarItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bazar-common-manage-row${commonItemForm.editingId === item.id ? " is-editing" : ""}`}
                    role="listitem"
                  >
                    <span className="bazar-common-manage-row-icon" aria-hidden="true">
                      {renderCommonBazarIcon(item, 22)}
                    </span>
                    <div className="bazar-common-manage-row-copy">
                      <strong>{item.name}</strong>
                      <small>Default unit: {item.defaultUnit || "kg"}</small>
                    </div>
                    <div className="bazar-common-manage-row-actions">
                      <button
                        type="button"
                        className="icon-btn bazar-action"
                        title={`Edit ${item.name}`}
                        aria-label={`Edit ${item.name}`}
                        onClick={() => editCommonItemRow(item)}
                        disabled={commonItemsBusy}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger bazar-action"
                        title={`Delete ${item.name}`}
                        aria-label={`Delete ${item.name}`}
                        onClick={() => deleteCommonItemRow(item)}
                        disabled={commonItemsBusy || commonBazarItems.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bazar-common-manage-footer">
                <button
                  type="button"
                  className="secondary bazar-action"
                  onClick={resetCommonBazarItems}
                  disabled={commonItemsBusy}
                >
                  <RotateCcw size={14} /> Reset defaults
                </button>
                <button
                  type="button"
                  className="primary bazar-action"
                  onClick={() => setCommonItemsModalOpen(false)}
                  disabled={commonItemsBusy}
                >
                  Done
                </button>
              </div>
            </section>
          </div>
        )}
        {confirmDialog && (
          <div
            className={`modal-backdrop delete-confirm-backdrop${confirmDialog.variant?.startsWith("bazar-needed") ? " bazar-needed-delete-backdrop" : ""}`}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                confirmDialog.resolve(false);
                setConfirmDialog(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                confirmDialog.resolve(false);
                setConfirmDialog(null);
              }
            }}
          >
            <section
              className={`modal panel delete-confirm-modal${confirmDialog.variant?.startsWith("bazar-needed") ? " bazar-needed-delete-modal" : ""}`}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="delete-confirm-icon"><PremiumDeleteIcon size={28}/></div>
              <h3>{confirmDialog.title}</h3>
              <p>{confirmDialog.message}</p>
              <div className="delete-confirm-actions">
                <button
                  className="secondary delete-confirm-cancel bazar-action"
                  autoFocus={confirmDialog.variant?.startsWith("bazar-needed")}
                  onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}
                >
                  Cancel
                </button>
                <button className="danger delete-confirm-confirm bazar-action" onClick={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}>
                  {confirmDialog.variant === "bazar-needed-delete-all" ? "Delete all" : confirmDialog.variant === "bazar-needed-item" ? "Remove item" : "Confirm"}
                </button>
              </div>
            </section>
          </div>
        )}
        {page === "payment-options" && admin && (
          <>
            <section className="panel payments-contacts-panel payments-member-preview">
              <PanelHead
                title="Member preview"
                sub="Only enabled methods with a number are displayed"
              />
              {paymentOptions.filter(
                (o) => o.enabled && o.account_number.trim(),
              ).length ? (
                <div className="payment-method-grid">
                  {paymentOptions
                    .filter((o) => o.enabled && o.account_number.trim())
                    .map((o) => (
                      <article className="payment-method-card" key={o.provider}>
                        <PaymentBrand
                          provider={o.provider}
                          logoUrl={o.logo_url}
                        />
                        <div className="payment-method-info">
                          <b>{o.label}</b>
                          <strong>{o.account_number}</strong>
                          {o.account_name && (
                            <small>Account name: {o.account_name}</small>
                          )}
                          {o.instructions && <small>{o.instructions}</small>}
                        </div>
                      </article>
                    ))}
                </div>
              ) : (
                <p className="hint">
                  Enter an account number and enable a method to preview it
                  here.
                </p>
              )}
              <p className="hint">
                These details are shared with active household users. Never
                enter a PIN, password, or OTP here.
              </p>
              <div className="payments-preview-actions">
                <button type="button" className="primary" onClick={() => openPaymentEditor("add")}>
                  <Plus size={16} /> Add Payment Option
                </button>
                <button type="button" className="secondary" onClick={() => openPaymentEditor("edit")}>
                  <Edit size={15} /> Edit Payment Option
                </button>
              </div>
            </section>
            {paymentEditorMode && paymentEditorForm && (
              <div className="modal-backdrop payment-option-editor-backdrop">
                <section className="panel payment-option-editor-modal" role="dialog" aria-modal="true" aria-labelledby="payment-editor-title">
                  <header className="payment-option-editor-heading">
                    <div>
                      <h2 id="payment-editor-title">
                        {paymentEditorMode === "add" ? "Add payment option" : "Edit payment option"}
                      </h2>
                      <p>These details are shown to active members.</p>
                    </div>
                    <button type="button" className="icon-btn bazar-action" aria-label="Close payment editor" onClick={() => { setPaymentEditorMode(""); setPaymentEditorForm(null); }}>
                      <X size={18} />
                    </button>
                  </header>
                  <form className="payment-option-editor-form" onSubmit={savePaymentEditor}>
                    {paymentEditorMode === "edit" && (
                      <label>
                        Payment option
                        <select
                          value={paymentEditorForm.provider}
                          onChange={(event) => {
                            const selected = paymentOptions.find((option) => option.provider === event.target.value);
                            if (selected) setPaymentEditorForm({ ...selected });
                          }}
                        >
                          {paymentOptions.map((option) => (
                            <option key={option.provider} value={option.provider}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Payment option name
                      <input
                        value={paymentEditorForm.label}
                        onChange={(event) => setPaymentEditorForm({ ...paymentEditorForm, label: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Account / wallet number
                      <input
                        value={paymentEditorForm.account_number}
                        onChange={(event) => setPaymentEditorForm({ ...paymentEditorForm, account_number: event.target.value })}
                        placeholder="Enter account or wallet number"
                      />
                    </label>
                    <label>
                      Account name (optional)
                      <input
                        value={paymentEditorForm.account_name}
                        onChange={(event) => setPaymentEditorForm({ ...paymentEditorForm, account_name: event.target.value })}
                        placeholder="Name on account"
                      />
                    </label>
                    <label>
                      Payment instruction
                      <input
                        value={paymentEditorForm.instructions}
                        onChange={(event) => setPaymentEditorForm({ ...paymentEditorForm, instructions: event.target.value })}
                        placeholder="e.g. Send Money / Account transfer"
                      />
                    </label>
                    <label>
                      Logo URL (optional)
                      <input
                        type="text"
                        value={paymentEditorForm.logo_url}
                        onChange={(event) => setPaymentEditorForm({ ...paymentEditorForm, logo_url: event.target.value })}
                        placeholder="https://example.com/logo.png"
                      />
                    </label>
                    <label className="payment-editor-logo-upload">
                      Or upload logo image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 500 * 1024) {
                            setPaymentOptionsError("Please choose a logo smaller than 500 KB.");
                            event.target.value = "";
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => setPaymentEditorForm((current) => ({
                            ...current,
                            logo_url: String(reader.result || ""),
                          }));
                          reader.onerror = () => setPaymentOptionsError("Could not read the selected logo image.");
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <label className="payment-editor-enabled">
                      <input
                        type="checkbox"
                        checked={!!paymentEditorForm.enabled}
                        onChange={(event) => setPaymentEditorForm({ ...paymentEditorForm, enabled: event.target.checked })}
                      />
                      Show to members
                    </label>
                    {paymentOptionsError && <div className="error">{paymentOptionsError}</div>}
                    <div className="payment-option-editor-actions">
                      <button type="button" className="secondary bazar-action" onClick={() => { setPaymentEditorMode(""); setPaymentEditorForm(null); }}>Cancel</button>
                      <button type="submit" className="primary" disabled={paymentOptionsBusy}>
                        {paymentOptionsBusy ? "Saving…" : paymentEditorMode === "add" ? "Add payment option" : "Save changes"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </>
        )}
        {page === "bazar-report" && (admin || user.role === "member") && (() => {
          const chartColors = ["#0d6f49", "#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"];
          const donutItems = bazarItemUsageReport.items.slice(0, 6);
          const donutRadius = 52;
          const donutCircumference = 2 * Math.PI * donutRadius;
          let donutOffset = 0;
          const topItem = bazarItemUsageReport.items[0];
          const monthlySeries = monthlyBazarHistory.length
            ? monthlyBazarHistory
            : [{ id: "current", label: month, amount: bazarTotal }];
          const curMonthIdx = monthlySeries.findIndex((m) => m.label === month);
          const prevMonthEntry = curMonthIdx > 0 ? monthlySeries[curMonthIdx - 1] : null;
          const momDiffPct =
            prevMonthEntry && prevMonthEntry.amount > 0
              ? Math.round(((bazarTotal - prevMonthEntry.amount) / prevMonthEntry.amount) * 100)
              : null;

          // Build Expense Trend series for 7D / 30D / 3M / 6M
          const monthShort = String(month || "").split(" ")[0].slice(0, 3) || "Mo";
          const dailyPoints = (bazarItemUsageReport.dailyTrend || []).map((d) => ({
            label: `${monthShort} ${Number(d.dayLabel)}`,
            amount: Number(d.amount || 0),
          }));
          const monthPoints = monthlySeries.map((m) => {
            const parts = String(m.label || "").split(" ");
            return {
              label: parts.length >= 2 ? `${parts[0].slice(0, 3)} '${parts[1].slice(-2)}` : m.label,
              amount: Number(m.amount || 0),
            };
          });
          let rawTrendPoints = [];
          if (bazarTrendRange === "7D") {
            rawTrendPoints = dailyPoints.slice(-7);
          } else if (bazarTrendRange === "30D") {
            // Cumulative or daily progression across the month
            let running = 0;
            rawTrendPoints = dailyPoints.map((pt) => {
              running = roundMoney(running + pt.amount);
              return { label: pt.label, amount: running };
            });
          } else if (bazarTrendRange === "3M") {
            rawTrendPoints = monthPoints.slice(-3);
          } else {
            rawTrendPoints = monthPoints.slice(-6);
          }
          if (!rawTrendPoints.length) {
            rawTrendPoints = [{ label: `${monthShort} 1`, amount: 0 }, { label: monthShort, amount: bazarTotal }];
          } else if (rawTrendPoints.length === 1) {
            rawTrendPoints = [{ label: `${monthShort} 1`, amount: 0 }, rawTrendPoints[0]];
          }

          const trendRawMax = rawTrendPoints.reduce((mx, p) => Math.max(mx, p.amount), 0);
          const stepUnit = trendRawMax <= 1000 ? 250 : trendRawMax <= 4000 ? 1000 : 2000;
          const yMax = Math.max(stepUnit * 4, Math.ceil((trendRawMax * 1.15) / stepUnit) * stepUnit);
          const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);
          const svgW = 640;
          const svgH = 184;
          const padL = 42;
          const padR = 28;
          const padT = 38;
          const padB = 26;
          const plotW = svgW - padL - padR;
          const plotH = svgH - padT - padB;
          const trendCoords = rawTrendPoints.map((pt, idx) => ({
            ...pt,
            x: padL + (idx / Math.max(1, rawTrendPoints.length - 1)) * plotW,
            y: padT + plotH - (pt.amount / yMax) * plotH,
          }));
          const trendLinePath = trendCoords.reduce((acc, pt, idx, arr) => {
            if (idx === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
            const prev = arr[idx - 1];
            const cpX = ((prev.x + pt.x) / 2).toFixed(1);
            return `${acc} C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          }, "");
          const trendAreaPath = `${trendLinePath} L ${trendCoords[trendCoords.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${trendCoords[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;
          const activeTrendIdx =
            bazarTrendFocusIdx !== null && bazarTrendFocusIdx >= 0 && bazarTrendFocusIdx < trendCoords.length
              ? bazarTrendFocusIdx
              : trendCoords.length - 1;
          const activePt = trendCoords[activeTrendIdx];
          const pillW = 84;
          const pillX = Math.max(padL + pillW / 2 - 8, Math.min(svgW - padR - pillW / 2 + 8, activePt.x));
          const pillY = Math.max(4, activePt.y - 38);

          return (
            <div className="bazar-report-shell">
              {bazarItemUsageReport.items.length > 0 ? (
                <>
                  <div className="bazar-report-charts-grid">
                    <section className="panel bazar-report-chart-card bazar-trend-card" aria-label="Expense Trend">
                      <div className="bazar-trend-head">
                        <div className="bazar-trend-title">
                          <span className="bazar-trend-icon" aria-hidden="true">
                            <TrendingUp size={17} />
                          </span>
                          <h4>Expense Trend</h4>
                        </div>
                        <div className="bazar-trend-tabs" role="tablist" aria-label="Trend range">
                          {["7D", "30D", "3M", "6M"].map((rng) => (
                            <button
                              key={rng}
                              type="button"
                              role="tab"
                              aria-selected={bazarTrendRange === rng}
                              className={`bazar-trend-tab${bazarTrendRange === rng ? " is-active" : ""}`}
                              onClick={() => {
                                setBazarTrendRange(rng);
                                setBazarTrendFocusIdx(null);
                              }}
                            >
                              {rng}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bazar-trend-svg-wrap">
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="bazar-trend-svg" role="img" aria-label="Expense trend line chart">
                          <defs>
                            <linearGradient id="bazarTrendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.24" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                            </linearGradient>
                          </defs>
                          {yTicks.map((val) => {
                            const yPos = padT + plotH - (val / yMax) * plotH;
                            const tickText = val === 0 ? "0k" : val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `${Math.round(val)}`;
                            return (
                              <g key={val}>
                                <line
                                  x1={padL}
                                  y1={yPos}
                                  x2={svgW - padR}
                                  y2={yPos}
                                  className="bazar-trend-gridline"
                                />
                                <text x={padL - 8} y={yPos + 4} textAnchor="end" className="bazar-trend-ylabel">
                                  {tickText}
                                </text>
                              </g>
                            );
                          })}
                          {trendCoords.map((pt, idx) => (
                            <line
                              key={`vg-${idx}`}
                              x1={pt.x}
                              y1={padT}
                              x2={pt.x}
                              y2={padT + plotH}
                              className="bazar-trend-vgrid"
                            />
                          ))}
                          <path d={trendAreaPath} fill="url(#bazarTrendAreaGrad)" />
                          <path d={trendLinePath} fill="none" stroke="#0d7a4f" strokeWidth="2.6" strokeLinecap="round" />
                          {trendCoords.map((pt, idx) => (
                            <g
                              key={`pt-${idx}`}
                              className="bazar-trend-point-hit"
                              onMouseEnter={() => setBazarTrendFocusIdx(idx)}
                              onClick={() => setBazarTrendFocusIdx(idx)}
                            >
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={idx === activeTrendIdx ? 5.2 : 4.2}
                                fill="#ffffff"
                                stroke="#0d7a4f"
                                strokeWidth="2.5"
                              />
                              <text
                                x={pt.x}
                                y={svgH - 8}
                                textAnchor="middle"
                                className={`bazar-trend-xlabel${idx === activeTrendIdx ? " is-active" : ""}`}
                              >
                                {pt.label}
                              </text>
                            </g>
                          ))}
                          <g className="bazar-trend-callout" pointerEvents="none">
                            <rect
                              x={pillX - pillW / 2}
                              y={pillY}
                              width={pillW}
                              height="24"
                              rx="8"
                              fill="#067647"
                            />
                            <polygon
                              points={`${activePt.x - 5},${pillY + 23.5} ${activePt.x + 5},${pillY + 23.5} ${activePt.x},${pillY + 29}`}
                              fill="#067647"
                            />
                            <text
                              x={pillX}
                              y={pillY + 15.5}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="12"
                              fontWeight="800"
                            >
                              {money(activePt.amount)}
                            </text>
                          </g>
                        </svg>
                      </div>
                    </section>

                    <section className="panel bazar-report-chart-card bazar-top-items-card bazar-top-items-card-grid" aria-label="Top Items This Month">
                      <div className="bazar-top-items-head">
                        <div className="bazar-top-items-title">
                          <span className="bazar-top-items-star" aria-hidden="true">
                            <Star size={17} fill="currentColor" />
                          </span>
                          <h4>Top Items This Month</h4>
                        </div>
                        <button
                          type="button"
                          className="bazar-top-items-viewall"
                          onClick={() => {
                            setShowAllBazarReportItems(true);
                            document.getElementById("bazar-usage-breakdown")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          <span>View All</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                      <div className="bazar-top-items-grid is-two-column">
                        {donutItems.map((item) => (
                          <div
                            className="bazar-top-item-tile bazar-top-item-wide"
                            style={{ "--spending-color": chartColors[item.colorIndex] }}
                            key={item.key}
                          >
                            <span className="bazar-top-item-emoji is-large" aria-hidden="true">
                              {renderBazarReportIcon(item.name, 38)}
                            </span>
                            <span className="bazar-top-item-copy">
                              <strong className="bazar-top-item-name">{item.name}</strong>
                              <small className="bazar-top-item-pct">{item.sharePct.toFixed(1)}% of spending</small>
                            </span>
                            <strong className="bazar-top-item-amount">{money(item.totalSpent)}</strong>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="panel bazar-report-chart-card bazar-cat-card bazar-legacy-category-card" aria-label="Category wise total spending chart">
                      <div className="bazar-report-card-head">
                        <h4>Category-Wise Total Spending</h4>
                        <span>{money(bazarTotal)} total</span>
                      </div>
                      <div className="bazar-cat-visual">
                        <div className="bazar-donut-wrap">
                          <svg viewBox="0 0 144 144" className="bazar-donut-svg" role="img" aria-label="Category wise total spending donut chart">
                            <circle
                              cx="72"
                              cy="72"
                              r={donutRadius}
                              fill="none"
                              stroke="rgba(16, 185, 129, 0.12)"
                              strokeWidth="20"
                            />
                            {donutItems.map((item) => {
                              const pct = Math.max(0, item.sharePct) / 100;
                              const segLen = pct * donutCircumference;
                              const dashArray = `${segLen} ${donutCircumference - segLen}`;
                              const dashOffset = -donutOffset;
                              donutOffset += segLen;
                              return (
                                <circle
                                  key={item.key}
                                  cx="72"
                                  cy="72"
                                  r={donutRadius}
                                  fill="none"
                                  stroke={chartColors[item.colorIndex]}
                                  strokeWidth="20"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={dashOffset}
                                  transform="rotate(-90 72 72)"
                                />
                              );
                            })}
                          </svg>
                          <div className="bazar-donut-center">
                            <small>Categories</small>
                            <strong>{bazarItemUsageReport.items.length}</strong>
                          </div>
                        </div>
                        <div className="bazar-cat-bars is-clear">
                          {donutItems.map((item) => {
                            const wPct = bazarItemUsageReport.maxSpent > 0
                              ? Math.max(6, Math.round((item.totalSpent / bazarItemUsageReport.maxSpent) * 100))
                              : 6;
                            return (
                              <div
                                className="bazar-cat-bar-item"
                                style={{ "--spending-color": chartColors[item.colorIndex] }}
                                key={item.key}
                              >
                                <div className="bazar-cat-bar-top">
                                  <span className="bazar-cat-label-wrap">
                                    <i style={{ background: chartColors[item.colorIndex] }} aria-hidden="true" />
                                    <span className="bazar-cat-emoji" aria-hidden="true">
                                      {renderBazarItemIcon(item.name, 14)}
                                    </span>
                                    <b>{item.name}</b>
                                  </span>
                                  <span className="bazar-cat-val-wrap">
                                    <strong>{money(item.totalSpent)}</strong>
                                    <small>{item.sharePct.toFixed(1)}%</small>
                                  </span>
                                </div>
                                <div className="bazar-cat-bar-track">
                                  <span
                                    className="bazar-cat-bar-fill"
                                    style={{ width: `${wPct}%`, background: chartColors[item.colorIndex] }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  </div>

                  <section className="panel bazar-top-items-card bazar-legacy-top-items-card" aria-label="Top Items This Month">
                    <div className="bazar-top-items-head">
                      <div className="bazar-top-items-title">
                        <span className="bazar-top-items-star" aria-hidden="true">
                          <Star size={17} fill="currentColor" />
                        </span>
                        <h4>Top Items This Month</h4>
                      </div>
                      <button
                        type="button"
                        className="bazar-top-items-viewall"
                        onClick={() => {
                          setShowAllBazarReportItems(true);
                          document.getElementById("bazar-usage-breakdown")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <span>View All</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="bazar-top-items-grid">
                      {donutItems.map((item) => (
                        <div
                          className="bazar-top-item-tile"
                          style={{ "--spending-color": chartColors[item.colorIndex] }}
                          key={item.key}
                        >
                          <span className="bazar-top-item-emoji" aria-hidden="true">
                            {renderBazarItemIcon(item.name, 26)}
                          </span>
                          <span className="bazar-top-item-name">{item.name}</span>
                          <strong className="bazar-top-item-amount">{money(item.totalSpent)}</strong>
                          <small className="bazar-top-item-pct">{item.sharePct.toFixed(1)}%</small>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section id="bazar-usage-breakdown" className="panel bazar-usage-dashboard is-minimal" aria-label="Detailed item usage breakdown">
                    <div className="bazar-usage-min-head">
                      <div className="bazar-usage-min-title">
                        <h4>Item Usage Breakdown</h4>
                        <span>{bazarItemUsageReport.items.length} items · tap Details on categories for sub-items</span>
                      </div>
                      {bazarItemUsageReport.items.length > 6 && (
                        <button
                          type="button"
                          className="bazar-usage-min-toggle"
                          onClick={() => setShowAllBazarReportItems((prev) => !prev)}
                        >
                          {showAllBazarReportItems
                            ? "Show top 6"
                            : `View all (${bazarItemUsageReport.items.length})`}
                        </button>
                      )}
                    </div>

                    <div className="bazar-usage-bars is-two-col is-minimal-grid">
                      {(showAllBazarReportItems
                        ? bazarItemUsageReport.items
                        : bazarItemUsageReport.items.slice(0, 6)
                      ).map((item) => {
                        const hasCategoryDetails =
                          Array.isArray(item.subItems) && item.subItems.length > 0;
                        return (
                          <div
                            className="bazar-usage-row-wrap"
                            style={{ "--spending-color": chartColors[item.colorIndex] }}
                            key={item.key}
                          >
                            <div className="bazar-usage-row">
                              <div className="bazar-usage-item-info">
                                <span className="bazar-usage-item-emoji" aria-hidden="true">
                                  {renderBazarReportIcon(item.name, 70)}
                                </span>
                              </div>
                              <div className="bazar-usage-amount">
                                <strong>{money(item.totalSpent)}</strong>
                                {hasCategoryDetails ? (
                                  <button
                                    type="button"
                                    className="bazar-usage-details-chip"
                                    aria-haspopup="dialog"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setBazarUsageDetailsItem(item);
                                    }}
                                  >
                                    Details
                                  </button>
                                ) : null}
                              </div>
                              <div className="bazar-usage-item-copy">
                                <strong className="bazar-usage-item-name">{item.name}</strong>
                                <small className="bazar-usage-quantity">
                                  {item.count}× bought
                                  {item.qtySummary ? ` • ${item.qtySummary}` : ""}
                                </small>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {bazarItemUsageReport.items.length > 6 && (
                      <div className="bazar-usage-more">
                        <button
                          type="button"
                          className="bazar-usage-more-btn"
                          onClick={() => setShowAllBazarReportItems((prev) => !prev)}
                        >
                          {showAllBazarReportItems
                            ? "Show top 6 items"
                            : `Show all ${bazarItemUsageReport.items.length} items`}
                        </button>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <section className="panel bazar-report-chart-card">
                  <p className="bazar-usage-empty">
                    No bazar items recorded for {month} yet. Add a bazar entry on Monthly Bazar to see charts and detailed reports.
                  </p>
                </section>
              )}
            </div>
          );
        })()}
        {page === "contacts" && (
          <section className="panel contacts-directory">
            <div className="contacts-directory-heading">
              <span className="contacts-directory-mark"><Users size={24} /></span>
              <div><h3>Member Contacts</h3><p>Flatmate, caretaker, maid and emergency contacts</p></div>
            </div>
            {["Flatmate", "Caretaker", "Maid", "Emergency"].map(category => {
              const rows = contactRows.filter(c => c.category === category);
              const CategoryIcon = category === "Caretaker" ? Home : category === "Maid" ? Brush : category === "Emergency" ? Bell : Users;
              return <section className={`contact-section contact-category-card category-${category.toLowerCase()} ${rows.length < 3 ? "few-contacts" : "many-contacts"}`} key={category}>
                <div className="contact-category-heading"><span className="contact-category-icon"><CategoryIcon size={20}/></span><h3>{category}</h3><small>{rows.length} {rows.length === 1 ? "contact" : "contacts"}</small></div>
                {rows.length ? <div className="contact-people-grid">{rows.map(c => <div className="contact-person-card" key={c.id}><div className="contact-person-avatar">{c.name?.trim()?.[0]?.toUpperCase() || "?"}</div><div className="contact-person-info"><b>{c.name}</b><a href={"tel:" + c.phone}>{c.phone}</a></div><a className="contact-call-btn" href={"tel:" + c.phone} aria-label={`Call ${c.name}`}><Phone size={15}/></a></div>)}</div> : <p className="muted">No contacts added.</p>}
              </section>;
            })}
          </section>
        )}
        {page === "inbox" && (
          <section className="inbox-panel">
            {inboxError && <div className="error inbox-error" role="alert">{inboxError}</div>}
            <div className={`inbox-layout${mobileInboxView === "conversation" ? " mobile-conversation-open" : ""}`}>
              <aside className="inbox-member-list" aria-label="Member conversations">
                <h3>Members</h3>
                {inboxPeers.length ? inboxPeers.map((member) => {
                  const unread = inboxMessages.filter(
                    (message) =>
                      message.sender_id === member.id &&
                      message.recipient_id === session.id &&
                      !message.read_at,
                  ).length;
                  const latestMessage = [...inboxMessages].reverse().find(
                    (message) =>
                      (message.sender_id === member.id && message.recipient_id === session.id) ||
                      (message.sender_id === session.id && message.recipient_id === member.id),
                  );
                  const isOnline = inboxOnlineIds.includes(member.id);
                  return (
                    <button
                      type="button"
                      key={member.id}
                      className={`inbox-member${selectedInboxMemberId === member.id ? " selected" : ""}${isOnline ? " is-online" : ""}`}
                      onClick={() => void selectInboxMember(member.id)}
                      aria-label={`${member.name}${member.active ? "" : " (inactive)"}`}
                    >
                      <span className={`inbox-avatar-wrap${isOnline ? " is-online" : ""}`}>
                        {member.photo_url ? (
                          <img className="inbox-avatar inbox-avatar-image" src={member.photo_url} alt="" />
                        ) : (
                          <span className="inbox-avatar">{member.name?.[0]?.toUpperCase() || "M"}</span>
                        )}
                        {isOnline && <i className="inbox-online-dot" aria-label="Online" title="Online" />}
                      </span>
                      <span className="inbox-member-copy">
                        <b>{member.name}</b>
                        <small className="inbox-member-status">
                          <span>{isOnline ? "Online" : `Last active ${formatLastActive(member.lastLoginAt)}`}</span>
                          {!latestMessage && <span className="inbox-member-preview">Start a conversation</span>}
                          {latestMessage && <span className="inbox-member-preview">{latestMessage.body || latestMessage.attachment_name || "Attachment"}</span>}
                        </small>
                      </span>
                      {unread > 0 && <span className="inbox-unread-count">{unread > 99 ? "99+" : unread}</span>}
                    </button>
                  );
                }) : <p className="muted inbox-no-members">No other active members found.</p>}
              </aside>
              <section className="inbox-conversation" aria-label="Message conversation">
                {selectedInboxMember ? (
                  <>
                    <header className="inbox-conversation-header">
                      <button
                        type="button"
                        className="inbox-mobile-back"
                        aria-label="Back to member list"
                        onClick={() => {
                          setMobileInboxView("members");
                          setInboxMenuOpen(false);
                        }}
                      >
                        <ChevronRight size={20} />
                      </button>
                      <span className={`inbox-avatar-wrap inbox-header-avatar${inboxOnlineIds.includes(selectedInboxMember.id) ? " is-online" : ""}`}>
                        {selectedInboxMember.photo_url ? (
                          <img className="inbox-avatar inbox-avatar-image" src={selectedInboxMember.photo_url} alt="" />
                        ) : (
                          <span className="inbox-avatar">{selectedInboxMember.name?.[0]?.toUpperCase() || "M"}</span>
                        )}
                        {inboxOnlineIds.includes(selectedInboxMember.id) && <i className="inbox-online-dot" aria-label="Online" title="Online" />}
                      </span>
                      <div className={`inbox-conversation-person${inboxOnlineIds.includes(selectedInboxMember.id) ? " is-online" : ""}`}>
                        <b>{selectedInboxMember.name}</b>
                        <small>
                          {inboxOnlineIds.includes(selectedInboxMember.id)
                            ? "Online"
                            : `Last active ${formatLastActive(selectedInboxMember.lastLoginAt)}`}
                        </small>
                      </div>
                      <div className="inbox-conversation-actions">
                        <button
                          type="button"
                          className="inbox-conversation-menu"
                          aria-label="Conversation options"
                          aria-expanded={inboxMenuOpen}
                          onClick={() => setInboxMenuOpen((open) => !open)}
                        >
                          <MoreVertical size={19} />
                        </button>
                        {inboxMenuOpen && (
                          <div className="inbox-conversation-menu-popover" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => void loadInboxMedia()}
                              disabled={inboxMediaBusy || inboxDeleteBusy}
                            >
                              <Images size={16} />
                              {inboxMediaBusy ? "Loading media…" : "Media"}
                            </button>
                            <button
                              type="button"
                              className="delete-conversation-action premium-delete-menu-action"
                              role="menuitem"
                              onClick={() => void deleteInboxConversation()}
                              disabled={inboxDeleteBusy || inboxMediaBusy}
                            >
                              <PremiumDeleteIcon size={16} />
                              {inboxDeleteBusy ? "Deleting…" : "Delete conversation"}
                            </button>
                          </div>
                        )}
                      </div>
                    </header>
                    <div ref={inboxMessageListRef} className="inbox-message-list" aria-live="polite">
                      {selectedConversation.length ? selectedConversation.map((message) => {
                        const msgTime = formatInboxMessageTime(message.created_at);
                        return (
                        <article
                          key={message.id}
                          className={`inbox-message${message.sender_id === session.id ? " sent" : " received"}`}
                        >
                          {message.body && <p>{message.body}</p>}
                          {message.attachment_url && (
                            <a
                              className="inbox-attachment"
                              href={message.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open attachment ${message.attachment_name}`}
                            >
                              {message.attachment_type?.startsWith("image/") ? (
                                <img
                                  src={message.attachment_url}
                                  alt={message.attachment_name}
                                  onLoad={() => {
                                    const el = inboxMessageListRef.current;
                                    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 220) {
                                      scrollInboxToBottom();
                                    }
                                  }}
                                />
                              ) : (
                                <span className="inbox-file-chip">
                                  <FileText size={17} />
                                  <span>{message.attachment_name}</span>
                                </span>
                              )}
                            </a>
                          )}
                          {message.attachment_path && !message.attachment_url && (
                            <span className="inbox-file-chip inbox-file-unavailable" role="status">
                              <FileText size={17} />
                              <span>
                                {message.attachment_name || "Attachment"}
                                <small>File unavailable in storage</small>
                              </span>
                            </span>
                          )}
                          <span className="inbox-message-meta">
                            <time dateTime={message.created_at} title={msgTime.full}>{msgTime.label}</time>
                            {message.sender_id === session.id && (
                              <span className={`inbox-message-status ${message.read_at ? "is-seen" : "is-sent"}`} title={message.read_at ? `Seen ${new Date(message.read_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}` : "Sent"}>
                                {message.read_at ? <CheckCheck size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                                {message.read_at ? "Seen" : "Sent"}
                              </span>
                            )}
                          </span>
                        </article>
                        );
                      }) : <p className="inbox-empty-thread">No messages yet. Send a message to start the conversation.</p>}
                    </div>
                    {selectedInboxMember.active ? <form className="inbox-compose" onSubmit={sendInboxMessage}>
                      <input
                        ref={inboxAttachmentInputRef}
                        className="inbox-file-input"
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          if (file && file.size > 10 * 1024 * 1024) {
                            setInboxError("Choose a file smaller than 10 MB.");
                            event.target.value = "";
                            setInboxAttachment(null);
                            return;
                          }
                          setInboxError("");
                          setInboxAttachment(file);
                        }}
                        aria-label="Choose image or file"
                      />
                      <button
                        className="inbox-attach-button"
                        type="button"
                        onClick={() => inboxAttachmentInputRef.current?.click()}
                        disabled={inboxBusy}
                        aria-label="Attach an image or file"
                        title="Attach image or file (max 10 MB)"
                      >
                        <Paperclip size={18} />
                      </button>
                      <div className="inbox-compose-fields">
                        {inboxAttachment && (
                          <div className="inbox-pending-attachment">
                            <FileText size={14} />
                            <span>{inboxAttachment.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setInboxAttachment(null);
                                if (inboxAttachmentInputRef.current) inboxAttachmentInputRef.current.value = "";
                              }}
                              aria-label="Remove attachment"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        <textarea
                          value={inboxDraft}
                          onChange={(event) => setInboxDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              event.currentTarget.form?.requestSubmit();
                            }
                          }}
                          maxLength={2000}
                          placeholder={`Message ${selectedInboxMember.name}...`}
                          aria-label="Write a message"
                        />
                      </div>
                      <button className="primary" type="submit" disabled={inboxBusy || (!inboxDraft.trim() && !inboxAttachment)}>
                        <Send size={16} /> {inboxBusy ? "Sending…" : "Send"}
                      </button>
                    </form> : <p className="inbox-inactive-notice">This account is inactive and cannot receive new messages.</p>}
                  </>
                ) : (
                  <div className="inbox-select-prompt">
                    <MessageCircle size={30} />
                    <b>Select a member</b>
                    <span>Choose someone from the list to view or start a conversation.</span>
                  </div>
                )}
              </section>
            </div>
            {inboxMediaOpen && (
              <div
                className="inbox-media-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setInboxMediaOpen(false);
                }}
              >
                <section
                  className="inbox-media-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="inbox-media-title"
                >
                  <header className="inbox-media-heading">
                    <div><h3 id="inbox-media-title">Media</h3><p>Photos and files shared with {selectedInboxMember?.name}</p></div>
                    <button type="button" className="icon-btn" aria-label="Close media" onClick={() => setInboxMediaOpen(false)}>
                      <X size={18} />
                    </button>
                  </header>
                  {inboxMediaFiles.length ? (
                    <div className="inbox-media-grid">
                      {inboxMediaFiles.map((file) => (
                        <a
                          className="inbox-media-item"
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          title={file.attachment_name}
                        >
                          {file.attachment_type?.startsWith("image/") ? (
                            <img src={file.url} alt={file.attachment_name} />
                          ) : (
                            <span className="inbox-media-file-icon"><FileText size={30} /></span>
                          )}
                          <span className="inbox-media-file-name">{file.attachment_name}</span>
                          <small>{new Date(file.created_at).toLocaleDateString()}</small>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="inbox-media-empty"><Images size={27} /><p>No photos or files shared yet.</p></div>
                  )}
                </section>
              </div>
            )}
          </section>
        )}
        {page === "payment-options" && admin && (
          <>
          <section className="panel payments-contacts-panel saved-contacts-panel">
            <div className="saved-contacts-heading">
              <PanelHead title="Saved contacts" sub="Manage the contacts members can see" />
              <div className="saved-contacts-actions">
                <button type="button" className="primary" onClick={() => openContactEditor("add")}>
                  <Plus size={16} /> Add Contact
                </button>
                <button type="button" className="secondary" disabled={!contactRows.length} onClick={() => openContactEditor("edit")}>
                  <Edit size={15} /> Edit Contact
                </button>
              </div>
            </div>
            {contactRows.length ? (
              <div className="saved-contacts-groups">
                {[
                  "Flatmate",
                  "Emergency",
                  "Maid",
                  "Caretaker",
                  ...new Set(
                    contactRows
                      .map((contact) => contact.category || "Other")
                      .filter((category) => !["Flatmate", "Caretaker", "Maid", "Emergency"].includes(category)),
                  ),
                ].map((category) => {
                  const groupedContacts = contactRows.filter((contact) => (contact.category || "Other") === category);
                  if (!groupedContacts.length) return null;
                  return (
                    <section className={`saved-contact-group category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={category}>
                      <header className="saved-contact-group-heading">
                        <h4>{category}</h4>
                        <small>{groupedContacts.length} {groupedContacts.length === 1 ? "contact" : "contacts"}</small>
                      </header>
                      <div className="saved-contact-group-list">
                        {groupedContacts.map((contact) => (
                          <div className="break-row saved-contact-row" key={contact.id}>
                            <span className="saved-contact-info">
                              <span className="saved-contact-initial" aria-hidden="true">{contact.name?.[0]?.toUpperCase() || "?"}</span>
                              <span className="saved-contact-details">
                                <b>{contact.name}</b>
                                <span className="saved-contact-meta"><small>{contact.phone}</small></span>
                              </span>
                            </span>
                            <div className="row-actions">
                              <button type="button" className="icon-btn saved-contact-edit" aria-label={`Edit ${contact.name}`} title="Edit contact" onClick={() => { setContactForm({ id: contact.id, category: contact.category, name: contact.name, phone: contact.phone }); setContactError(""); setContactModalOpen(true); }}>
                                <Edit size={15} />
                              </button>
                              <button type="button" className="icon-btn saved-contact-delete premium-delete-action bazar-action" aria-label={`Delete ${contact.name}`} title="Delete contact" onClick={async () => {
                                if (!(await askConfirm(`Delete ${contact.name || "this contact"}? This cannot be undone.`, "Delete contact?"))) return;
                                const { error } = await supabase.from("member_contacts").delete().eq("id", contact.id);
                                if (error) alert("Could not delete contact: " + error.message);
                                else {
                                  setContactRows((rows) => rows.filter((row) => row.id !== contact.id));
                                  setBazarSuccessToast("Contact deleted successfully");
                                  window.setTimeout(() => setBazarSuccessToast(""), 2600);
                                }
                              }}>
                                <PremiumDeleteIcon size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : <p className="hint saved-contacts-empty">No contacts saved yet. Add one to get started.</p>}
          </section>
          {contactModalOpen && (
            <div className="modal-backdrop contact-editor-backdrop">
              <section className="panel contact-editor-modal" role="dialog" aria-modal="true" aria-labelledby="contact-editor-title">
                <header className="contact-editor-heading">
                  <div>
                    <h2 id="contact-editor-title">{contactForm.id ? "Edit contact" : "Add contact"}</h2>
                    <p>Add or update a contact visible to members.</p>
                  </div>
                  <button type="button" className="icon-btn contact-editor-close bazar-action" aria-label="Close contact form" onClick={() => { setContactModalOpen(false); setContactError(""); }}>
                    <X size={18} />
                  </button>
                </header>
                <form className="contact-editor-form" onSubmit={saveContact}>
                  {contactForm.id && (
                    <label>
                      Saved contact
                      <select value={contactForm.id} onChange={(event) => {
                        const selected = contactRows.find((row) => row.id === event.target.value);
                        if (selected) setContactForm({ id: selected.id, category: selected.category, name: selected.name, phone: selected.phone });
                      }}>
                        {contactRows.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.category}</option>)}
                      </select>
                    </label>
                  )}
                  <label>Section<select value={contactForm.category} onChange={(event) => setContactForm({ ...contactForm, category: event.target.value })}>{["Flatmate", "Caretaker", "Maid", "Emergency"].map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label>Name<input value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} required /></label>
                  <label>Phone number<input type="tel" value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} required /></label>
                  {contactError && <div className="error">{contactError}</div>}
                  <div className="contact-editor-actions">
                    <button type="button" className="secondary bazar-action" onClick={() => { setContactModalOpen(false); setContactError(""); }}>Cancel</button>
                    <button type="submit" className="primary" disabled={contactBusy}>{contactBusy ? "Saving…" : contactForm.id ? "Save changes" : "Add contact"}</button>
                  </div>
                </form>
              </section>
            </div>
          )}
          </>
        )}
        {page === "notices" && admin && (
          <div className="notices-page">
            <section className="panel notices-admin-panel bulletin-admin-panel">
              <div className="notices-admin-heading bulletin-admin-heading">
                <div className="bulletin-admin-title-wrap">
                  <span className="bulletin-admin-icon" aria-hidden="true">
                    <Megaphone size={19} />
                  </span>
                  <PanelHead
                    title="Bulletin Notice"
                    sub="Set the scrolling bulletin banner shown on member accounts"
                  />
                </div>
                <div className="bulletin-admin-heading-actions">
                  <div className="bulletin-speed-control" role="group" aria-label="Bulletin animation speed">
                    <span className="bulletin-speed-control-label">
                      <Gauge size={14} aria-hidden="true" />
                      {bulletinSpeedSaving ? "Saving…" : "Speed"}
                    </span>
                    <span className="bulletin-speed-options">
                      {BULLETIN_SPEED_OPTIONS.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          className={`bulletin-speed-option${bulletinSpeed === option.value ? " is-active" : ""}`}
                          aria-pressed={bulletinSpeed === option.value}
                          disabled={bulletinSpeedSaving}
                          onClick={() => saveBulletinSpeed(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </span>
                  </div>
                  <span className="bulletin-admin-count-badge">
                    {activeBulletinNotices.length} active
                  </span>
                </div>
              </div>
              <form className="bulletin-admin-form" onSubmit={saveBulletinNotice}>
                <input
                  type="text"
                  className="bulletin-admin-input"
                  value={bulletinInput}
                  onChange={(e) => setBulletinInput(e.target.value)}
                  placeholder="e.g. This month's meal cost has been updated. Please check your balance and settle dues on time."
                  disabled={bulletinSaving}
                />
                {editingBulletinId && (
                  <button
                    type="button"
                    className="secondary bulletin-cancel-btn"
                    onClick={() => {
                      setEditingBulletinId("");
                      setBulletinInput("");
                    }}
                    disabled={bulletinSaving}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="primary bulletin-submit-btn"
                  disabled={bulletinSaving || !String(bulletinInput || "").trim()}
                >
                  <Megaphone size={15} />
                  {bulletinSaving
                    ? "Saving…"
                    : editingBulletinId
                      ? "Update Bulletin"
                      : "Set Bulletin"}
                </button>
              </form>
              {bulletinNotices.length ? (
                <div className="bulletin-admin-list">
                  {bulletinNotices.map((item) => {
                    const isActive = item.active !== false;
                    return (
                      <div
                        className={`bulletin-admin-row${isActive ? " is-active" : " is-muted"}`}
                        key={item.id}
                      >
                        <div className="bulletin-admin-row-main">
                          <span className="bulletin-notice-megaphone" aria-hidden="true">📢</span>
                          <p>{item.text}</p>
                        </div>
                        <div className="bulletin-admin-row-actions">
                          <button
                            type="button"
                            className={`bulletin-status-toggle ${isActive ? "is-active" : "is-hidden"}`}
                            onClick={() => toggleBulletinNoticeActive(item.id)}
                            disabled={bulletinSaving}
                            title={isActive ? "Click to hide from banner" : "Click to show on banner"}
                          >
                            {isActive ? "Active" : "Hidden"}
                          </button>
                          <button
                            type="button"
                            className="icon-btn bazar-action bulletin-row-edit"
                            title="Edit bulletin notice"
                            aria-label="Edit bulletin notice"
                            onClick={() => {
                              setEditingBulletinId(item.id);
                              setBulletinInput(item.text);
                            }}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger premium-delete-action bazar-action notice-delete-button"
                            title="Delete bulletin notice"
                            aria-label="Delete bulletin notice"
                            onClick={() => deleteBulletinNoticeItem(item.id)}
                          >
                            <PremiumDeleteIcon size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="notices-admin-empty bulletin-admin-empty">
                  <span className="notices-empty-icon"><Megaphone size={20} /></span>
                  <strong>No bulletin notices active</strong>
                  <p>Type a message above and click Set Bulletin to display it on the account banner.</p>
                </div>
              )}
            </section>
            <section className="panel notices-admin-panel">
              <div className="notices-admin-heading">
                <PanelHead
                  title="Saved Notices"
                  sub="Manage drafts and announcements shared with your members"
                />
                <button type="button" className="primary notices-add-button" onClick={() => { setNoticeError(""); setNoticeComposerOpen(true); }}>
                  <Plus size={16} /> Add Notice
                </button>
              </div>
              {announcementNotices.length ? (
                <div className="notices-admin-list">
                {announcementNotices.map((n) => {
                  const isPinnedToBulletin = bulletinNotices.some(
                    (b) => String(b.noticeId) === String(n.id),
                  );
                  return (
                  <article className="notice-card" key={n.id}>
                    <div className="notice-card-top">
                      <div>
                        <h3>{n.title || "Notice"}</h3>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                    </div>
                    {n.body && <p>{n.body}</p>}
                    {n.image_url && <img src={n.image_url} alt="Notice" />}
                    <div className="notice-card-footer">
                      <span className={`notice-status ${n.status === "draft" ? "is-draft" : "is-published"}`}>
                        {n.status === "draft" ? "Draft" : "Published"}
                      </span>
                      <div className="notice-card-actions">
                        <button
                          type="button"
                          className={`secondary bulletin-pin-btn${isPinnedToBulletin ? " is-pinned" : ""}`}
                          onClick={() => toggleSavedNoticeBulletin(n)}
                        >
                          <Megaphone size={14} />
                          {isPinnedToBulletin ? "In Bulletin" : "Set as Bulletin"}
                        </button>
                        {n.status !== "published" && (
                          <button type="button" className="secondary" onClick={() => publishSavedNotice(n)}>
                            Publish
                          </button>
                        )}
                        {n.status === "published" && (
                          <button type="button" className="secondary" onClick={() => repostNotice(n)}>
                            Repost
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-btn danger premium-delete-action bazar-action notice-delete-button"
                          title="Delete notice"
                          aria-label="Delete notice"
                          onClick={() => deleteNotice(n)}
                        >
                          <PremiumDeleteIcon size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                  );
                })}
                </div>
              ) : (
                <div className="notices-admin-empty">
                  <span className="notices-empty-icon"><Bell size={20} /></span>
                  <strong>No notices yet</strong>
                  <p>Add a notice to save a draft or share an announcement with members.</p>
                </div>
              )}
            </section>
            {noticeComposerOpen && (
              <div className="notice-composer-backdrop" role="presentation" onClick={() => !noticeBusy && !noticeDraftBusy && setNoticeComposerOpen(false)}>
                <section className="panel notice-composer-modal" role="dialog" aria-modal="true" aria-labelledby="notice-composer-title" onClick={(event) => event.stopPropagation()}>
                  <header className="notice-composer-heading">
                    <div>
                      <span className="eyebrow">ANNOUNCEMENT</span>
                      <h2 id="notice-composer-title">Compose notice</h2>
                      <p>Save as a draft or publish it for your members.</p>
                    </div>
                    <button type="button" className="icon-btn notice-composer-close bazar-action" aria-label="Close notice composer" disabled={noticeBusy || noticeDraftBusy} onClick={() => setNoticeComposerOpen(false)}>
                      <X size={18} />
                    </button>
                  </header>
                  <form className="notice-composer-form" onSubmit={postNotice}>
                    <label>
                      Notice title
                      <input
                        value={noticeForm.title}
                        onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                        placeholder="e.g. Rent payment reminder"
                      />
                    </label>
                    <label>
                      Message
                      <textarea
                        rows="5"
                        value={noticeForm.body}
                        onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
                        placeholder="Write an announcement for your members..."
                      />
                    </label>
                    <label>
                      Photo <span className="notice-optional-label">Optional</span>
                      <input
                        id="notice-image-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNoticeImage(e.target.files?.[0] || null)}
                      />
                    </label>
                    <label className="notice-bulletin-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(noticeForm.isBulletin)}
                        onChange={(e) => setNoticeForm({ ...noticeForm, isBulletin: e.target.checked })}
                      />
                      <span>Also display in Bulletin Notice banner</span>
                    </label>
                    {noticeImage && <div className="notice-file-name">Selected: {noticeImage.name}</div>}
                    {noticeError && <div className="error">{noticeError}</div>}
                    <div className="notice-composer-actions">
                      <button type="button" className="secondary" disabled={noticeDraftBusy || noticeBusy} onClick={saveNoticeDraft}>
                        {noticeDraftBusy ? "Saving…" : "Save as draft"}
                      </button>
                      <button type="submit" className="primary" disabled={noticeBusy || noticeDraftBusy}>
                        <Send size={15} /> {noticeBusy ? "Publishing…" : "Publish notice"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </div>
        )}
        {noticeModal &&
          user?.role === "member" &&
          unreadAnnouncementNotices.length > 0 && (
            <div className="notice-modal-backdrop" role="presentation">
              <section
                className="notice-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Latest notices"
              >
                <div className="notice-modal-head">
                  <div>
                    <span className="eyebrow">IMPORTANT NOTICE</span>
                    <h2>House announcements</h2>
                  </div>
                  <button
                    className="icon-btn bazar-action"
                    onClick={() => setNoticeModal(false)}
                    aria-label="Close notices"
                  >
                    <X />
                  </button>
                </div>
                <div className="notice-modal-list">
                  {unreadAnnouncementNotices
                    .slice(0, 10)
                    .map((n) => (
                      <article className="notice-card" key={n.id}>
                        <div className="notice-card-top">
                          <div>
                            <h3>{n.title || "Notice"}</h3>
                            <small>
                              {new Date(n.created_at).toLocaleString()}
                            </small>
                          </div>
                        </div>
                        {n.body && <p>{n.body}</p>}
                        {n.image_url && (
                          <img src={n.image_url} alt="Notice attachment" />
                        )}
                      </article>
                    ))}
                </div>
                <button
                  className="primary full"
                  onClick={async () => {
                    await markAllNoticesRead(user.id, unreadAnnouncementNotices);
                    setNoticeModal(false);
                  }}
                >
                  Got it
                </button>
              </section>
            </div>
          )}
        {showBazarNeededLoginPopup &&
          user?.role === "member" &&
          bazarNeededItems.length > 0 && (
            <div
              className="bazar-needed-login-backdrop"
              role="presentation"
              onClick={(event) => {
                if (event.target === event.currentTarget && !bazarNeededBusy) {
                  setShowBazarNeededLoginPopup(false);
                }
              }}
            >
              <section
                className="bazar-needed-login-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bazar-needed-login-title"
                aria-describedby="bazar-needed-login-description"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="bazar-needed-login-close"
                  aria-label="Close essentials to buy"
                  onClick={() => setShowBazarNeededLoginPopup(false)}
                  disabled={bazarNeededBusy}
                >
                  <X size={21} />
                </button>
                <header className="bazar-needed-login-hero">
                  <span className="bazar-needed-login-mark" aria-hidden="true">
                    <ShoppingBasket size={34} />
                    <Sparkles size={18} />
                  </span>
                  <span className="bazar-needed-login-divider" aria-hidden="true" />
                  <span className="bazar-needed-login-heading">
                    <span className="bazar-needed-login-eyebrow">SHARED SHOPPING LIST</span>
                    <h2 id="bazar-needed-login-title">Essentials to Buy</h2>
                    <p id="bazar-needed-login-description">
                      Here are the items needed for the flat.
                    </p>
                  </span>
                  <span className="bazar-needed-login-count">
                    {pendingBazarNeededItems.length > 0
                      ? `${pendingBazarNeededItems.length} pending`
                      : "All bought"}
                  </span>
                </header>
                <div className="bazar-needed-login-list">
                  {[...bazarNeededItems]
                    .sort((a, b) => Number(a.done) - Number(b.done))
                    .map((item, index) => {
                      const buyerName = item.done
                        ? db.users.find((u) => u.id === item.boughtBy)?.name ||
                          item.boughtByName ||
                          "Member"
                        : "";
                      return (
                        <article
                          className={`bazar-needed-login-item${item.done ? " is-bought" : ""}`}
                          key={item.id}
                        >
                          <div className="bazar-needed-login-item-main">
                            <span className="bazar-needed-login-item-number" aria-hidden="true">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="bazar-needed-login-item-icon" aria-hidden="true">
                              {renderBazarItemIcon(item.name, 20)}
                            </span>
                            <span className="bazar-needed-login-item-copy">
                              <strong>{item.name}</strong>
                              <small>
                                {item.done
                                  ? "Bought"
                                  : `${Number(item.quantity) || 1} ${item.unit || "pcs"}`}
                              </small>
                            </span>
                            {item.done ? (
                              <span className="bazar-needed-login-buyer-pill">
                                <Check size={14} aria-hidden="true" />
                                <span>Bought by {buyerName}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="bazar-needed-login-mark-bought"
                                onClick={() => void toggleBazarNeededItem(item.id)}
                                disabled={bazarNeededBusy}
                                aria-label={`Mark ${item.name} as bought`}
                              >
                                <Check size={15} />
                                <span>Bought</span>
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                </div>
                <footer className="bazar-needed-login-footer">
                  <span className="bazar-needed-login-note">
                    <CheckCircle2 size={17} aria-hidden="true" />
                    Mark an item bought when it has been collected.
                  </span>
                  <button
                    type="button"
                    className="bazar-needed-login-got-it"
                    onClick={() => setShowBazarNeededLoginPopup(false)}
                    disabled={bazarNeededBusy}
                  >
                    <ShoppingBasket size={17} />
                    Got it
                  </button>
                </footer>
              </section>
            </div>
          )}
        {bazarSuccessToast && (
          <div
            className="app-success-layer"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className={`app-success-popup${isDeleteSuccessToast ? " app-delete-success-popup" : ""}`}>
              {isDeleteSuccessToast ? (
                <span className="app-success-visual app-delete-visual" aria-hidden="true">
                  <span className="app-delete-trash">
                    <span className="app-delete-trash-lid" />
                    <span className="app-delete-trash-bin"><i /><i /><i /></span>
                  </span>
                  <i className="app-delete-piece app-delete-piece-one" />
                  <i className="app-delete-piece app-delete-piece-two" />
                  <i className="app-delete-piece app-delete-piece-three" />
                </span>
              ) : (
                <span className="app-success-visual" aria-hidden="true">
                  <span className="app-success-halo" />
                  <svg viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="21" />
                    <path d="m14.5 24.5 6.1 6.2 13-14" />
                  </svg>
                </span>
              )}
              <span className="app-success-copy">
                <small><i /> {isDeleteSuccessToast ? "Delete completed" : "Action completed"}</small>
                <strong>{bazarSuccessToast}</strong>
                <span>{isDeleteSuccessToast ? "The selected data has been safely removed." : "Your latest changes are now up to date."}</span>
              </span>
              <span className="app-success-progress" aria-hidden="true" />
            </div>
          </div>
        )}
            {utilityEditModal && (
              <div className="modal-backdrop" role="presentation">
                <section className="modal panel bazar-edit-modal" role="dialog" aria-modal="true" aria-labelledby="utility-edit-title" onClick={(e) => e.stopPropagation()}>
                  <PanelHead title="Edit utility" sub="Update utility name, amount and sharing" />
                  <div className="bazar-edit-fields">
                    <label>Utility name<input value={utilityEditModal.name} onChange={(e) => setUtilityEditModal(old => ({...old, name:e.target.value}))} /></label>
                    <label>Amount (৳)<input type="number" min="0" value={utilityEditModal.amount} onChange={(e) => setUtilityEditModal(old => ({...old, amount:e.target.value}))} /></label>
                    <label className="check"><input type="checkbox" checked={utilityEditModal.shared} onChange={(e) => setUtilityEditModal(old => ({...old, shared:e.target.checked}))} /> Split among current members</label>
                  </div>
                  <div className="bazar-edit-actions">
                    <button type="button" className="secondary bazar-action" onClick={() => setUtilityEditModal(null)}>Cancel</button>
                    <button type="button" className="primary" onClick={saveUtilityEdit}>Save changes</button>
                  </div>
                </section>
              {showAddUtility && <div className="modal-backdrop"><div onClick={(e)=>e.stopPropagation()}>
            <section className="panel form-panel utility-add-modal">
              <PanelHead
                title="Add utility"
                sub="Add utilities such as WiFi, gas, electricity, and water"
              />
              <form onSubmit={addCategory}>
                <label>
                  Utility name
                  <input
                    value={expenseForm.name}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, name: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Amount (৳)
                  <input
                    type="number"
                    min="0"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={expenseForm.shared}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        shared: e.target.checked,
                      })
                    }
                  />{" "}
                  Split among current members
                </label>
                <button className="primary full">
                  {editingUtilityName ? "Save changes" : <><Plus size={16} /> Add utility</>}
                </button>
              </form>
              <div className="utility-member-settings">
                <div className="utility-member-heading">
                  <span className="utility-member-icon"><Users size={17} /></span>
                  <div><strong>Current User</strong><small>Utilities are divided by this number for every month</small></div>
                </div>
                <form onSubmit={saveUtilityMemberCount} className="utility-member-form">
                  <label>Current user count<input type="number" min="1" step="1" value={utilityMemberCountInput} onChange={(e) => setUtilityMemberCountInput(e.target.value)} required /></label>
                  <button className="primary" disabled={utilityMemberCountSaving}>{utilityMemberCountSaving ? "Saving..." : "Save"}</button>
                  {utilityMemberCountMessage && <small>{utilityMemberCountMessage}</small>}
                </form>
              </div>
            </section>

<button type="button" className="secondary full bazar-action" onClick={()=>setShowAddUtility(false)}>Close</button></div></div>}
          </div>
            )}

        <footer className="app-footer">
          <span className="footer-credit">
            Designed &amp; developed by <strong>Rahat</strong> · Monthly Hisab
          </span>
        </footer>
      </main>
    </div>
  );
}
function Stat({ title, value, icon: Icon, watermarkIcon: WatermarkIcon, tone, hint, className = "", showAction = false, actionKind = "arrow" }) {
  return (
    <div className={`stat${className ? ` ${className}` : ""}`}>
      <div className={"stat-icon " + tone}>
        <Icon size={19} />
      </div>
      {showAction && (
        <span className={`stat-action is-${actionKind}`} aria-hidden="true">
          {actionKind === "check" ? <Check size={18} /> : actionKind === "alert" ? "!" : <ArrowRight size={17} />}
        </span>
      )}
      {showAction && WatermarkIcon && <WatermarkIcon className="stat-watermark" aria-hidden="true" />}
      <span>{title}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
function PanelHead({ title, sub }) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
    </div>
  );
}
function getUtilityIcon(name) {
  const category = String(name || "").toLowerCase();
  if (category.includes("flat") || category.includes("rent")) return Home;
  if (category.includes("wifi") || category.includes("wi-fi") || category.includes("internet")) return Wifi;
  if (category.includes("gas")) return Flame;
  if (category.includes("water")) return Droplets;
  if (category.includes("lift") || category.includes("elevator") || category.includes("service")) return Wrench;
  if (category.includes("moyla") || category.includes("waste") || category.includes("garbage") || category.includes("trash")) return Lightbulb;
  if (category.includes("bua") || category.includes("maid") || category.includes("clean")) return Droplets;
  return Zap;
}
function getUtilityTone(name) {
  const category = String(name || "").toLowerCase();
  if (category.includes("flat") || category.includes("rent")) return "mint";
  if (category.includes("wifi") || category.includes("wi-fi") || category.includes("internet")) return "sky";
  if (category.includes("gas")) return "orange";
  if (category.includes("water")) return "azure";
  if (category.includes("lift") || category.includes("elevator") || category.includes("service")) return "purple";
  if (category.includes("moyla") || category.includes("waste") || category.includes("garbage") || category.includes("trash")) return "yellow";
  if (category.includes("bua") || category.includes("maid") || category.includes("clean")) return "teal";
  return "amber";
}
createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
