import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Moon,
  Sun,
  TriangleAlert,
  Scale,
  Sparkles,
  CreditCard,
  Wrench,
  Lightbulb,
  Megaphone,
  Gauge,
  MapPin,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./style.css";
import "@fontsource/baloo-da-2/bengali-500.css";
import "@fontsource/baloo-da-2/bengali-600.css";
import "./inbox.css";
import { supabase, supabaseConfigured } from "./supabase";
import { openOverviewReport } from "./overviewReport";

if (typeof window !== "undefined") {
  window.__html2canvas = html2canvas;
  window.__jsPDF = jsPDF;
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
    return [{ item: items[0].item, price: targetAmount }];
  }
  let running = 0;
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (i === items.length - 1) {
      const remaining = roundMoney(targetAmount - running);
      result.push({ item: it.item, price: Math.max(0, remaining) });
    } else {
      const share = roundMoney((it.price / totalAmount) * targetAmount);
      running = roundMoney(running + share);
      result.push({ item: it.item, price: share });
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
function App() {
  const [db, setDb] = useState(starter);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("bh-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem("bh-theme", theme);
    } catch {}
  }, [theme]);
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
  useEffect(() => {
    if (!session?.id) return;
    supabase.from("member_contacts").select("*").order("category").then(({ data, error }) => {
      if (!error && data) setContactRows(data);
    });
  }, [session?.id]);
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
  const monthChoices = (() => { const now = new Date(); return [-2,-1,0,1].map(offset => new Date(now.getFullYear(), now.getMonth()+offset, 1).toLocaleDateString("en-US", {month:"long",year:"numeric"})); })();
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
  const [bazarRows, setBazarRows] = useState([{ item: "", price: "" }, { item: "", price: "" }, { item: "", price: "" }]);
  const [bazarNeededItems, setBazarNeededItems] = useState([]);
  const [bazarNeededDraft, setBazarNeededDraft] = useState("");
  const [bazarNeededBusy, setBazarNeededBusy] = useState(false);
  const [showBazarNeeded, setShowBazarNeeded] = useState(false);
  const [bazarDetailsEntry, setBazarDetailsEntry] = useState(null);
  const [bazarEditEntry, setBazarEditEntry] = useState(null);
  const [bazarActionMenuId, setBazarActionMenuId] = useState(null);
  const bazarActionMenuRef = useRef(null);
  const [bazarFilterMenuOpen, setBazarFilterMenuOpen] = useState(false);
  const [bazarSearch, setBazarSearch] = useState("");
  const bazarFilterRef = useRef(null);
  const bazarFilterTriggerRef = useRef(null);
  const [bazarSuccessToast, setBazarSuccessToast] = useState("");
  const [pendingBazarDelete, setPendingBazarDelete] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const updateBazarRow = (index, field, value) => {
    const next = bazarRows.map((row, i) => i === index ? { ...row, [field]: value } : row);
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
  const bazarSearchTerm = bazarSearch.trim().toLowerCase();
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
    const matchesSearch = !bazarSearchTerm || getBazarItemSummary(b.items).toLowerCase().includes(bazarSearchTerm);
    return matchesMember && matchesSearch;
  });
  const bazarTotal = monthBazar.reduce((s, b) => s + Number(b.amount || 0), 0);
  const selectedBazarTotal = monthBazar
    .filter((entry) => {
      if (bazarFilter === "all") return true;
      if (bazarFilter === "cash-in-hand") return entry.paidFromCash;
      return !entry.paidFromCash && entry.paidBy === bazarFilter;
    })
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
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
      ]);
      if (pe) throw pe;
      if (mealSettingError) throw mealSettingError;
      if (utilityCountError) throw utilityCountError;
      if (sharedUtilityError) throw sharedUtilityError;
      if (monthUtilityError) throw monthUtilityError;
      if (bazarNeededError) throw bazarNeededError;
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
                return { id: `legacy-${index}`, name: item.trim(), done: false };
              }
              if (!item || typeof item !== "object") return null;
              return {
                id: String(item.id || `legacy-${index}`),
                name: String(item.name || item.item || "").trim(),
                done: Boolean(item.done),
                addedBy: item.addedBy ? String(item.addedBy) : "",
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
      setSession({ id: data.user.id });
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
    event.preventDefault();
    const name = bazarNeededDraft.trim();
    if (!name || bazarNeededBusy) return;
    const existing = bazarNeededItems.find(
      (item) => item.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing && !existing.done) {
      alert(`${name} is already in the need-to-buy list.`);
      return;
    }
    const nextItems = existing
      ? bazarNeededItems.map((item) => item.id === existing.id
        ? { ...item, done: false, completedAt: "" }
        : item)
      : [
          {
            id: globalThis.crypto?.randomUUID?.() || `need-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            done: false,
            addedBy: user.id,
            createdAt: new Date().toISOString(),
            completedAt: "",
          },
          ...bazarNeededItems,
        ];
    if (await saveBazarNeededItems(nextItems)) {
      setBazarNeededDraft("");
    }
  }
  function toggleBazarNeededPanel() {
    const nextOpen = !showBazarNeeded;
    setShowBazarNeeded(nextOpen);
    if (nextOpen) {
      window.setTimeout(() => {
        document.getElementById("bazar-needed-input")?.focus();
      }, 80);
    }
  }
  async function toggleBazarNeededItem(itemId) {
    const nextItems = bazarNeededItems.map((item) => item.id === itemId
      ? {
          ...item,
          done: !item.done,
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
    const validItems = bazarRows.filter(row => row.item.trim() && Number(row.price) > 0).map(row => ({ item: row.item.trim(), price: Number(row.price) }));
    const itemTotal = validItems.reduce((sum, row) => sum + row.price, 0);
    if (itemTotal <= 0 || !validItems.length) return;
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
        setBazarRows([{ item: "", price: "" }, { item: "", price: "" }, { item: "", price: "" }]);
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
      setBazarRows([{ item: "", price: "" }, { item: "", price: "" }, { item: "", price: "" }]);
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
    let raw = b.items;
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch {} }
    let items = Array.isArray(raw) ? raw.map((row) => typeof row === "string"
      ? { item: row.trim(), price: "" }
      : { item: String(row?.item || ""), price: String(row?.price ?? "") })
      : String(raw || "").split(",").map((item) => ({ item: item.trim(), price: "" })).filter((row) => row.item);
    items = items.filter((row) => row.item || row.price);
    if (!items.length) items = [{ item: "", price: "" }];

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
    const editPaidBy = b.paidFromCash ? "cash-in-hand" : String(b.paidBy || b.paid_by || user?.id || "");
    const totalAmount = items.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
    const oldCash = b.paidFromCash ? Number(b.amount || 0) : 0;
    const availCash = Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + oldCash));
    const defaultCash = b.paidFromCash ? Number(b.amount || 0) : Math.min(totalAmount, availCash);
    const defaultMember = Math.max(0, roundMoney(totalAmount - defaultCash));
    setBazarEditEntry({
      ...b,
      editDate: String(b.date || ""),
      editItems: items,
      editPaidBy,
      combinedCashAmount: String(defaultCash > 0 ? defaultCash : ""),
      combinedMemberAmount: String(defaultMember > 0 ? defaultMember : ""),
      combinedMemberId: b.paidFromCash ? (b.createdBy || user?.id) : (b.paidBy || user?.id),
    });
  }

  async function saveBazarEdit() {
    if (!bazarEditEntry) return;
    const rows = (bazarEditEntry.editItems || []).map((row) => ({ item: String(row.item || "").trim(), price: Number(row.price) || 0 })).filter((row) => row.item && row.price > 0);
    const amount = rows.reduce((sum, row) => sum + row.price, 0);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(bazarEditEntry.editDate || "")) || !rows.length) { alert("Enter a valid date and at least one item with a price."); return; }
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
        const oldCash = bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0;
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
        const isCash = bazarEditEntry.editPaidBy === "cash-in-hand" || bazarEditEntry.editPaidBy === "Cash in Hand";
        const paidBy = isCash ? (bazarEditEntry.createdBy || user?.id) : bazarEditEntry.editPaidBy.trim();
        if (!isCash && (!paidBy || !(db.users || []).some((u) => u.id === paidBy))) {
          throw new Error("Please select who paid for this bazar.");
        }
        if (isCash) {
          const oldCash = bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0;
          const availableCash = roundMoney(cashInHand - pendingCashSettlementTotal + oldCash);
          if (amount > availableCash) {
            throw new Error(`Not enough cash in hand. Available balance: ${money(Math.max(0, availableCash))}.`);
          }
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
    const estimatedMealRemaining = estimatedMealTarget - mealCost;
    const estimatedMonthDue = finalBalance + estimatedMealRemaining;
    const generatedDate = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
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
    const paymentMethodsHtml = reportPaymentOptions.length
      ? `<div class="payment-options-inline">${reportPaymentOptions.map((option) => {
          const label = String(option.label || option.provider || "Payment").trim();
          const logoSrc = option.logo_url || paymentLogoByProvider[option.provider] || "";
          const logo = logoSrc
            ? `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(label)}"/>`
            : `<span>${escapeHtml(label.charAt(0).toUpperCase() || "P")}</span>`;
          return `<div class="payment-option-line">${logo}<strong>${escapeHtml(option.account_number)}</strong><small>${escapeHtml(option.instructions || "Transfer")}</small></div>`;
        }).join("")}</div>`
      : "";
    const rentDueColor = rentUtilitiesDue < 0 ? "credit" : "positive";
    const mealDueColor = mealBalance < 0 ? "credit" : "positive";
    const escapeSvg = (value) => escapeHtml(value);
    const imageText = (x, y, value, options = {}) =>
      `<text x="${x}" y="${y}" fill="${options.fill || "#17231f"}" font-family="Hind Siliguri, sans-serif" font-size="${options.size || 22}" font-weight="${options.weight || 400}" text-anchor="${options.anchor || "start"}">${escapeSvg(value)}</text>`;
    const imageMoney = (x, y, value, options = {}) =>
      imageText(x, y, money(value), { ...options, anchor: options.anchor || "end", weight: options.weight || 700 });
    const billSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1450" viewBox="0 0 1200 1450">
      <defs>
        <linearGradient id="green" x2="1" y2="1"><stop stop-color="#0c9d59"/><stop offset="1" stop-color="#004c32"/></linearGradient>
        <linearGradient id="soft" x2="1" y2="1"><stop stop-color="#fbfdfb"/><stop offset="1" stop-color="#f0f7ef"/></linearGradient>
        <linearGradient id="warm" x2="1" y2="1"><stop stop-color="#fffdfa"/><stop offset="1" stop-color="#fff4e2"/></linearGradient>
      </defs>
      <rect width="1200" height="1450" fill="#fff"/>
      <rect x="52" y="38" width="54" height="54" rx="15" fill="url(#green)"/>
      <path d="M66 64 79 53l13 11M69 62v18h20V62m-13 18v-9h7v9" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
      ${imageText(122, 64, "MridhaBari 6B", { size: 25, weight: 700 })}
      ${imageText(122, 86, "Ka/164, Kuratoli, Kuril, Vatara, Dhaka 1229", { size: 15, fill: "#61716b" })}

      <rect x="916" y="42" width="232" height="48" rx="24" fill="#f6fbf7" stroke="#e1eee5"/>
      <g transform="translate(944 56)" fill="none" stroke="#087343" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 1h11l5 5v20H2z"/><path d="M12 1v6h6M6 13h8M6 18h8"/></g>
      ${imageText(1052, 73, "Monthly Bill", { size: 17, weight: 700, anchor: "middle", fill: "#153c2c" })}
      <rect x="58" y="148" width="6" height="96" rx="3" fill="#22bd61"/>
      ${imageText(92, 192, "Monthly Bill", { size: 48, weight: 700 })}
      ${imageText(92, 228, month, { size: 25, fill: "#57645f" })}
      <rect x="800" y="146" width="348" height="88" rx="20" fill="#eff7ef" stroke="#e3efe5"/>
      <g transform="translate(824 172)" fill="none" stroke="#087343" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="10" r="6"/><path d="M3 32v-3a12 12 0 0 1 24 0v3"/></g>
      ${imageText(836, 181, "Member", { size: 17, fill: "#495c53" })}
      ${imageText(836, 214, member.name, { size: 27, weight: 700 })}
      ${[
        ["Total Bill", currentCharges, "url(#soft)", "#e0eee4", "#078343"],
        ["Total Paid", totalPaid, "#eff8f3", "#d8eee4", "#078454"],
        ["Previous Balance", previousBalance, "url(#warm)", "#f6e8cd", "#aa3b30"],
        ["Final Due", finalBalance, "url(#green)", "#07824b", "#fff"],
      ].map(([label, amount, fill, border, color], index) => {
        const x = 52 + index * 279;
        const value = Number(amount);
        const cardColor = label === "Previous Balance" && value < 0 ? "#08732f" : color;
        return `<rect x="${x}" y="274" width="260" height="156" rx="20" fill="${fill}" stroke="${border}"/>
          <circle cx="${x + 31}" cy="309" r="19" fill="${label === "Final Due" ? "#ffffff22" : "#e7f6e9"}"/>
          <g transform="translate(${x + 17} 295)" fill="none" stroke="${label === "Final Due" ? "#fff" : index === 2 ? "#bb7600" : "#078343"}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${[
              '<path d="m14 2 12 7-12 7L2 9l12-7Z"/><path d="m2 14 12 7 12-7m-24 5 12 7 12-7"/>',
              '<rect x="2" y="5" width="24" height="19" rx="3"/><path d="M2 11h24m-6 7h.01"/>',
              '<path d="M3 13a11 11 0 1 0 3-8l-3 3"/><path d="M3 2v6h6m5-1v6l4 2"/>',
              '<ellipse cx="14" cy="6" rx="11" ry="4"/><path d="M3 6v7c0 2 5 4 11 4 2 0 4-.3 6-1m-17-3v7c0 2 5 4 11 4 2 0 4-.3 6-1m0-16c6 0 11 2 11 4v13c0 2-5 4-11 4s-11-2-11-4"/>',
            ][index]}
          </g>
          ${imageText(x + 20, 356, label, { size: 18, fill: label === "Final Due" ? "#fff" : "#45534d" })}
          ${imageText(x + 20, 400, signedMoney(value), { size: 29, weight: 700, fill: cardColor })}`;
      }).join("")}
      <rect x="52" y="462" width="536" height="250" rx="22" fill="#fff" stroke="#e0e6e2"/>
      <rect x="612" y="462" width="536" height="250" rx="22" fill="#fff" stroke="#e0e6e2"/>
      <circle cx="87" cy="500" r="22" fill="#e9f7e9"/><circle cx="647" cy="500" r="22" fill="#e9f7e9"/>
      <g transform="translate(72 485)" fill="none" stroke="#087343" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 12 13-10 13 10"/><path d="M5 10v17h20V10m-13 17V16h7v11"/></g>
      <g transform="translate(632 485)" fill="none" stroke="#087343" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v10m-4-10v5a4 4 0 0 0 8 0V2m-4 10v15m13-25v25m0-25c5 3 5 10 0 13"/></g>
      ${imageText(122, 508, "Rent & Utilities", { size: 22, weight: 700 })}
      ${imageText(682, 508, "Meal (Food)", { size: 22, weight: 700 })}
      <path d="M76 531h488M636 531h488" stroke="#edf0ed"/>
      ${imageText(82, 569, "Room Rent + Utilities Share", { size: 17 })}
      ${imageMoney(558, 569, rentAndUtilities, { size: 19 })}
      <rect x="76" y="585" width="488" height="43" rx="11" fill="#f0f7ef"/>
      ${imageText(91, 613, "Paid", { size: 17, fill: "#21602e" })}
      ${imageMoney(548, 613, rentPaid, { size: 19, fill: "#08732f" })}
      ${imageText(82, 672, "Due (This Month)", { size: 17, weight: 700 })}
      ${imageText(558, 672, signedMoney(rentUtilitiesDue), { size: 19, weight: 700, fill: rentUtilitiesDue < 0 ? "#08732f" : "#18231f", anchor: "end" })}
      ${imageText(642, 569, "Meal Cost (Your Share)", { size: 17 })}
      ${imageMoney(1118, 569, mealCost, { size: 19 })}
      <rect x="636" y="585" width="488" height="43" rx="11" fill="#f0f7ef"/>
      ${imageText(651, 613, "Meal Paid", { size: 17, fill: "#21602e" })}
      ${imageMoney(1108, 613, mealPaid, { size: 19, fill: "#08732f" })}
      ${imageText(642, 672, "Balance / Credit", { size: 17, weight: 700 })}
      ${imageText(1118, 672, signedMoney(mealBalance), { size: 19, weight: 700, fill: mealBalance < 0 ? "#08732f" : "#18231f", anchor: "end" })}
      <rect x="52" y="738" width="690" height="323" rx="22" fill="#fff" stroke="#e0e6e2"/>
      <rect x="766" y="738" width="382" height="323" rx="22" fill="#fff" stroke="#e0e6e2"/>
      <circle cx="87" cy="778" r="22" fill="#e9f7e9"/><circle cx="801" cy="778" r="22" fill="#e9f7e9"/>
      <g transform="translate(74 764)" fill="none" stroke="#087343" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 25V14m7 11V5m7 20v-9m7 9V2"/></g>
      <g transform="translate(788 764)" fill="none" stroke="#087343" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="25" height="21" rx="3"/><path d="M2 10h25m-7 8h.01"/></g>
      ${imageText(122, 786, "Summary", { size: 22, weight: 700 })}
      ${imageText(836, 786, "Payment Breakdown", { size: 21, weight: 700 })}
      <path d="M76 809h642M790 809h334" stroke="#edf0ed"/>
      ${imageText(90, 847, "Rent & Utilities Due", { size: 17 })}
      ${imageText(704, 847, signedMoney(rentUtilitiesDue), { size: 18, anchor: "end" })}
      ${imageText(90, 889, "Meal Balance (Credit)", { size: 17 })}
      ${imageText(704, 889, signedMoney(mealBalance), { size: 18, anchor: "end" })}
      <rect x="76" y="905" width="642" height="43" rx="11" fill="#edf6ec"/>
      ${imageText(91, 933, "This Month Balance", { size: 17, weight: 700 })}
      ${imageText(704, 933, signedMoney(currentBalance), { size: 19, weight: 700, fill: "#08732f", anchor: "end" })}
      ${imageText(90, 979, "Previous Month Balance (Credit)", { size: 17 })}
      ${imageText(704, 979, signedMoney(previousBalance), { size: 18, anchor: "end" })}
      <rect x="76" y="995" width="642" height="66" rx="12" fill="url(#green)"/>
      ${imageText(96, 1019, "Final Balance Due", { size: 17, weight: 700, fill: "#fff" })}
      ${imageText(700, 1019, signedMoney(finalBalance), { size: 19, weight: 700, fill: "#fff", anchor: "end" })}
      <path d="M96 1029h602" stroke="#ffffff35"/>
      ${imageText(96, 1050, `Estimated Due (Total Meal Cost ${money(estimatedMealTarget)})`, { size: 15, weight: 600, fill: "#d9f5e5" })}
      ${imageText(700, 1050, signedMoney(estimatedMonthDue), { size: 19, weight: 700, fill: "#fff", anchor: "end" })}
      ${imageText(806, 847, "Rent Paid", { size: 17 })}
      ${imageMoney(1108, 847, rentPaid, { size: 18 })}
      <path d="M790 865h334" stroke="#edf0ed"/>
      ${imageText(806, 905, "Meal Paid", { size: 17 })}
      ${imageMoney(1108, 905, mealPaid, { size: 18 })}
      <rect x="790" y="922" width="334" height="52" rx="12" fill="#edf6ec"/>
      ${imageText(806, 954, "Total Paid", { size: 17, weight: 700, fill: "#08732f" })}
      ${imageMoney(1108, 954, totalPaid, { size: 20, fill: "#08732f" })}
      <rect x="52" y="1086" width="1096" height="104" rx="22" fill="#eff8ef"/>
      <circle cx="91" cy="1138" r="22" fill="#e0f4e3"/>
      <circle cx="91" cy="1138" r="12" fill="none" stroke="#087343" stroke-width="2.5"/>
      <path d="M91 1136v9m0-14h.01" stroke="#087343" stroke-width="2.5" stroke-linecap="round"/>
      ${imageText(129, 1135, `Amount Due: ${signedMoney(finalBalance)}`, { size: 24, weight: 700, fill: "#075d2b" })}
      ${imageText(129, 1164, finalBalance > 0 ? "Please clear the due amount at your earliest convenience." : "Your account has a credit balance.", { size: 16 })}
      <path d="m930 1155 55-48 54 48v36h-109v-36Z" fill="#fff9e8" stroke="#14864d" stroke-width="5" stroke-linejoin="round"/>
      <path d="m915 1154 70-61 70 61-9 10-61-53-61 53-9-10Z" fill="#078c4a"/>
      <path d="M1001 1112v-23h17v37" fill="#168e4a" stroke="#087342" stroke-width="4"/>
      <path d="M968 1160h33v33h-33z" fill="#fff1c9" stroke="#16884b" stroke-width="3"/>
      <path d="M984 1161v31m-15-16h31" stroke="#e8a72e" stroke-width="2"/>
      ${imageText(600, 1255, `Generated by Rahat  ·  ${generatedDate}`, { size: 15, anchor: "middle", fill: "#69756f" })}
    </svg>`;
    reportDocument.open();
    reportDocument.write(`<!doctype html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Monthly Bill · ${escapeHtml(month)} · ${escapeHtml(member.name)}</title>
      <base href="${escapeHtml(window.location.origin)}/">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        @page{size:A4;margin:16mm}
        body{margin:0;padding:24px;color:#17231f;background:#fff;font:13px/1.35 "Hind Siliguri",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .sheet{width:100%;max-width:840px;margin:0 auto;position:relative}
        .toolbar{display:flex;justify-content:flex-end;margin-bottom:12px}
        .toolbar button{border:0;border-radius:10px;padding:10px 16px;background:#087747;color:#fff;font-weight:700;cursor:pointer}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .brand{display:flex;align-items:center;gap:12px}
        .brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,#2dc774,#00633d);color:white;box-shadow:0 5px 12px #076b4230}
        .brand-mark svg{width:27px;height:27px}
        .brand-title{font:700 20px "Hind Siliguri",sans-serif;color:#111d1a}
        .brand-subtitle{margin-top:2px;color:#61716b;font-size:13px}
        .bill-pill{display:flex;align-items:center;gap:8px;padding:9px 15px;border:1px solid #e1eee5;border-radius:25px;background:#f6fbf7;color:#153c2c;font-weight:700;box-shadow:0 4px 12px #173a2510}
        .bill-pill svg{width:17px;height:17px;color:#087343}
        .headline{display:grid;grid-template-columns:1fr 195px;align-items:center;gap:14px;margin-bottom:14px}
        .title-block{border-left:5px solid #22bd61;padding:2px 0 2px 27px}
        h1{margin:0;color:#101a18;font:700 31px/1.1 "Hind Siliguri",sans-serif;letter-spacing:-.6px}
        .month{margin-top:4px;color:#57645f;font-size:18px}
        .member-card{display:flex;align-items:center;gap:11px;min-height:58px;padding:9px 13px;border:1px solid #e3efe5;border-radius:15px;background:#eff7ef}
        .member-icon{width:30px;height:30px;color:#087343;flex:none}
        .member-caption{font-size:13px;color:#495c53}
        .member-name{margin-top:2px;font-size:18px;font-weight:750;color:#111c19;overflow-wrap:anywhere}
        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:24px}
        .stat{min-height:112px;padding:14px 16px;border:1px solid #e0eee4;border-radius:17px;background:linear-gradient(140deg,#fbfdfb,#f0f7ef);box-shadow:0 5px 13px #163c2010}
        .stat:nth-child(2){background:linear-gradient(140deg,#fbfdfc,#eaf7f1);border-color:#d8eee4}
        .stat:nth-child(3){background:linear-gradient(140deg,#fffdfa,#fff4e2);border-color:#f6e8cd}
        .stat.final{background:linear-gradient(145deg,#0c9d59,#004c32);border-color:#07824b;color:#fff}
        .stat-icon{display:grid;place-items:center;width:39px;height:39px;margin-bottom:6px;border-radius:13px;background:#e7f6e9;color:#078343}
        .stat:nth-child(2) .stat-icon{background:#e7f7ef;color:#078454}
        .stat:nth-child(3) .stat-icon{background:#fff3dc;color:#bb7600}
        .stat.final .stat-icon{background:transparent;color:#fff}
        .stat-icon svg{width:26px;height:26px}
        .stat-label{color:#45534d;font-size:14px}
        .stat-value{margin-top:2px;color:#111b19;font-size:25px;font-weight:750;letter-spacing:-.4px;font-variant-numeric:tabular-nums}
        .stat:nth-child(3) .stat-value{color:#aa3b30}
        .stat.final .stat-label,.stat.final .stat-value{color:white}
        .two-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
        .panel{padding:10px 12px;border:1px solid #e0e6e2;border-radius:15px;background:#fff;box-shadow:0 4px 11px #112c1a0c}
        .panel-title{display:flex;align-items:center;gap:9px;padding-bottom:7px;margin-bottom:2px;border-bottom:1px solid #edf0ed;color:#15201d;font-size:17px;font-weight:750}
        .panel-icon{display:grid;place-items:center;width:33px;height:33px;border-radius:11px;background:#e9f7e9;color:#087343}
        .panel-icon svg{width:22px;height:22px}
        .line{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:32px;padding:6px 8px;border-bottom:1px solid #edf0ed;color:#25332e}
        .line strong{font-size:15px;color:#18231f;font-variant-numeric:tabular-nums}
        .line.paid{margin:2px -1px;padding:6px 9px;border:0;border-radius:9px;background:#f0f7ef;color:#21602e}
        .line.paid strong,.positive{color:#08732f!important}
        .line.due{border-bottom:0;font-weight:750}
        .line.due strong{font-weight:750}
        .credit{color:#08732f!important}
        .lower-grid{display:grid;grid-template-columns:1.3fr .7fr;gap:10px}
        .summary-panel,.payment-panel{min-height:0}
        .summary-panel .line,.payment-panel .line{min-height:31px;padding:6px 8px}
        .line.highlight{margin:3px 0;border:0;border-radius:10px;background:#edf6ec;font-weight:750}
        .line.final-line{margin:5px 0 0;padding:10px 13px;border:0;border-radius:11px;background:linear-gradient(110deg,#15965b,#004d34);color:#fff;font-size:18px;font-weight:750}
        .line.final-line.estimated-line{margin-top:3px;background:linear-gradient(110deg,#087b4b,#003f2c)}
        .line.final-line>span{display:grid;gap:2px}
        .line.final-line small{color:#d9f5e5;font-size:13px;font-weight:500}
        .line.final-line strong{color:#fff;font-size:19px;white-space:nowrap}
        .amount-due{position:relative;display:flex;align-items:center;gap:10px;min-height:60px;margin-top:10px;padding:10px 140px 10px 14px;overflow:hidden;border-radius:15px;background:linear-gradient(100deg,#eff8ef,#e9f6ec);color:#075d2b}
        .amount-icon{display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:12px;background:#e0f4e3}
        .amount-icon svg{width:25px;height:25px}
        .amount-title{font-size:18px;font-weight:750}
        .amount-note{margin-top:3px;color:#263a30;font-size:13px}
        .house-art{position:absolute;right:8px;bottom:0;width:130px;height:82px}
        .payment-options-inline{display:grid;gap:4px;margin-top:5px;padding-top:5px;border-top:1px solid #e1e9e4}
        .payment-option-line{display:flex;align-items:center;gap:6px;min-width:0;padding:3px 5px;border-radius:8px;background:#f5faf6}
        .payment-option-line img,.payment-option-line>span{width:28px;height:20px;flex:0 0 28px;object-fit:contain}
        .payment-option-line>span{display:grid;place-items:center;border-radius:6px;background:#dff3e5;color:#087343;font-size:13px;font-weight:800}
        .payment-option-line strong{min-width:0;color:#087343;font-size:13px;line-height:1.2;overflow-wrap:anywhere}
        .payment-option-line small{margin-left:auto;color:#66766e;font-size:13px;white-space:nowrap}
        footer{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;color:#69756f;font-size:13px}
        footer:before,footer:after{content:"";height:1px;flex:1;background:#dce4df}
        footer strong{color:#087343}

        /* Minimal premium statement styling */
        body{background:#f1f3f0;color:#18201d}
        .sheet{padding:25px 27px;border:1px solid #e0e5e1;border-radius:18px;background:#fff;box-shadow:0 18px 55px rgba(24,48,36,.08)}
        .toolbar{margin-bottom:16px}
        .toolbar button{padding:9px 15px;border:1px solid #0b6848;border-radius:9px;background:#0b6848;box-shadow:none;font-size:13px}
        .topbar{padding-bottom:14px;margin-bottom:18px;border-bottom:1px solid #e4e8e5}
        .brand{gap:10px}
        .brand-mark{width:38px;height:38px;border-radius:10px;background:#0b6848;box-shadow:none}
        .brand-mark svg{width:23px;height:23px}
        .brand-title{color:#17211d;font-size:18px;letter-spacing:-.2px}
        .brand-subtitle{color:#7a8580;font-size:13px}
        .bill-pill{padding:7px 12px;border-color:#dce4df;border-radius:9px;background:#fff;box-shadow:none;color:#425149;font-size:13px;font-weight:650}
        .bill-pill svg{width:15px;height:15px;color:#0b6848}
        .headline{margin-bottom:12px}
        .title-block{padding:1px 0 1px 17px;border-left:3px solid #0b6848}
        h1{color:#17211d;font-size:28px;letter-spacing:-.55px}
        .month{color:#6c7771;font-size:16px}
        .member-card{min-height:54px;border-color:#dfe6e1;border-radius:11px;background:#fafbfa}
        .member-icon{width:26px;height:26px;color:#0b6848}
        .member-caption{color:#7a8580;font-size:13px;text-transform:uppercase;letter-spacing:.08em}
        .member-name{color:#18231e;font-size:17px}
        .panel{border-color:#dde4df;border-radius:12px;background:#fff;box-shadow:none}
        .panel-title{gap:8px;padding-bottom:7px;border-bottom-color:#e8ece9;color:#243029;font-size:15px;letter-spacing:.01em}
        .panel-icon{width:30px;height:30px;border-radius:8px;background:#eef4f0;color:#0b6848}
        .panel-icon svg{width:19px;height:19px}
        .line{border-bottom-color:#edf0ee;color:#4b5851}
        .line strong{color:#19231f;font-weight:700}
        .line.paid{margin:0;padding:6px 8px;border-bottom:1px solid #edf0ee;border-radius:0;background:transparent;color:#587067}
        .line.paid strong,.positive{color:#0b6848!important}
        .line.highlight{margin:2px 0;border-radius:7px;background:#f3f7f4}
        .line.final-line{margin-top:4px;border-radius:8px;background:#116c4d;font-size:16px}
        .line.final-line.estimated-line{margin-top:3px;background:#0a513b}
        .line.final-line small{color:#cfe4da}
        .line.final-line strong{font-size:18px}
        .amount-due{min-height:56px;padding:9px 13px;border:1px solid #dce7e0;border-radius:11px;background:#f5f8f6;color:#164f3a}
        .amount-icon{width:34px;height:34px;border-radius:9px;background:#e6f0ea}
        .amount-icon svg{width:21px;height:21px}
        .amount-title{font-size:17px}
        .amount-note{color:#65736c;font-size:13px}
        .house-art{display:none}
        .payment-options-inline{gap:5px;margin-top:6px;padding-top:6px;border-top-color:#e3e9e5}
        .payment-option-line{display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:34px;padding:5px 7px;border:1px solid #e3e9e5;border-radius:8px;background:#fbfcfb}
        .payment-option-line img,.payment-option-line>span{width:32px;height:23px;flex:none;padding:2px;border:1px solid #e5ebe7;border-radius:6px;background:#fff;object-fit:contain}
        .payment-option-line>span{display:grid;place-items:center;padding:0;background:#edf5f0;color:#0b6848;font-size:13px;font-weight:800}
        .payment-option-line strong{min-width:0;color:#164f3a;font-size:13px;font-weight:700;line-height:1.2;letter-spacing:.01em;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
        .payment-option-line small{justify-self:end;padding:3px 6px;border-radius:99px;background:#eaf3ed;color:#456357;font-size:13px;font-weight:650;line-height:1;white-space:nowrap}
        footer{color:#89918d;letter-spacing:.01em}
        footer:before,footer:after{background:#e1e6e3}
        footer strong{color:#0b6848}
        /* Mobile-first 9:16 statement, matching the supplied bill reference. */
        :root{color-scheme:light}
        html{min-width:0;background:#e8f1ec}
        body{display:flex;justify-content:center;min-width:0;min-height:100vh;padding:24px;overflow-x:hidden;background:radial-gradient(circle at 50% 0,#f7fffa 0,#e7f0eb 52%,#dbe8e1 100%);color:#07192d}
        .sheet{--page-pad:clamp(18px,3.6vw,34px);isolation:isolate;position:relative;display:flex;flex-direction:column;width:min(100%,210mm);min-height:297mm;margin:0;padding:0 0 70px;overflow:hidden;border:1px solid #bfe5d6;border-radius:28px;background:linear-gradient(180deg,#fbfffd 0,#fff 67%,#f7fffa 100%);box-shadow:0 26px 80px rgba(1,72,48,.16)}
        .hero{position:relative;min-height:clamp(170px,24vw,218px);padding:clamp(24px,3.9vw,38px) var(--page-pad) 62px;overflow:hidden;background:radial-gradient(circle at 17% -30%,rgba(36,219,127,.68) 0 25%,transparent 25.3%),radial-gradient(ellipse at 105% 2%,rgba(0,151,85,.72) 0 38%,transparent 38.3%),linear-gradient(125deg,#009452 0,#00633e 52%,#003f2f 100%);color:#fff}
        .hero:before{content:"";position:absolute;z-index:0;right:-13%;bottom:-42px;width:76%;height:94px;border-radius:50% 0 0 0/100% 0 0 0;background:linear-gradient(110deg,rgba(32,211,115,.92),rgba(170,246,193,.9));transform:rotate(-3deg)}
        .hero:after{content:"";position:absolute;z-index:1;left:-7%;right:-7%;bottom:-62px;height:102px;border-radius:50% 50% 0 0/32% 32% 0 0;background:#fbfffd;transform:rotate(-1.4deg)}
        .topbar{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) clamp(132px,24vw,185px);align-items:center;gap:clamp(14px,3vw,34px);padding:0;margin:0;border:0}
        .brand{min-width:0;gap:clamp(10px,2vw,18px)}
        .brand-mark{width:clamp(50px,7.4vw,72px);height:clamp(50px,7.4vw,72px);border:1px solid rgba(54,255,149,.78);border-radius:clamp(14px,2vw,20px);background:linear-gradient(145deg,rgba(5,90,58,.52),rgba(18,217,108,.78));box-shadow:0 8px 20px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.24)}
        .brand-mark svg{width:58%;height:58%}
        .brand>div:last-child{min-width:0;padding-left:clamp(10px,2vw,20px);border-left:1px solid rgba(255,255,255,.75)}
        .brand-title{overflow:hidden;color:#fff;font-size:clamp(22px,4vw,36px);line-height:1.08;letter-spacing:-.04em;text-overflow:ellipsis;white-space:nowrap}
        .brand-subtitle{overflow:hidden;margin-top:clamp(4px,.7vw,8px);color:rgba(255,255,255,.94);font-size:clamp(12px,2vw,20px);line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
        .toolbar{display:grid;gap:10px;width:100%;margin:0}
        .toolbar button{display:flex;align-items:center;justify-content:center;gap:8px;min-width:0;height:clamp(38px,5.7vw,52px);padding:0 12px;border:1px solid #1deb80;border-radius:999px;background:rgba(0,91,57,.45);box-shadow:0 8px 18px rgba(0,0,0,.18);color:#fff;font:700 clamp(12px,1.8vw,16px)/1 "Hind Siliguri",sans-serif;white-space:nowrap;cursor:pointer;transition:transform .15s,background .15s,opacity .15s}
        .toolbar button:hover{transform:translateY(-1px);background:rgba(0,118,74,.68)}
        .toolbar button:active{transform:translateY(0)}
        .toolbar button:disabled{opacity:.65;cursor:wait;transform:none}
        .toolbar button.btn-save-image{border-color:rgba(255,255,255,.9);background:#fff;color:#072035}
        .toolbar button.btn-save-image:hover{background:#f0faf4}
        .toolbar button svg{width:clamp(17px,2.4vw,22px);height:clamp(17px,2.4vw,22px);flex:none;color:#fff}
        .toolbar button.btn-save-image svg{color:#008550}
        .toolbar-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:tb-spin .7s linear infinite;flex:none}
        .toolbar button.btn-save-image .toolbar-spinner{border-color:rgba(0,133,80,.25);border-top-color:#008550}
        @keyframes tb-spin{to{transform:rotate(360deg)}}
        .headline{position:relative;z-index:4;display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,32%);align-items:center;gap:16px;min-height:92px;margin:-28px var(--page-pad) 17px;padding:12px 15px;border:1px solid #bce6d5;border-radius:24px;background:linear-gradient(110deg,rgba(255,255,255,.96),rgba(231,249,239,.94));box-shadow:0 11px 28px rgba(0,67,45,.08)}
        .title-block{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:15px;min-width:0;padding:0;border:0}
        .title-icon{display:grid;place-items:center;width:48px;height:48px;flex:none;border-radius:15px;background:#e0f9e9;color:#008854}
        .title-icon svg{width:29px;height:29px}
        h1{overflow:hidden;color:#07192d;font-size:clamp(23px,3.4vw,32px);line-height:1.05;letter-spacing:-.035em;text-overflow:ellipsis;white-space:nowrap}
        .month{overflow:hidden;margin-top:5px;color:#31435d;font-size:clamp(14px,2.2vw,20px);line-height:1.1;text-overflow:ellipsis;white-space:nowrap}
        .member-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;min-width:0;min-height:64px;padding:9px 12px;border:1px solid #bce8d4;border-radius:20px;background:linear-gradient(120deg,#effbf4,#e3f8ec)}
        .member-icon{width:36px;height:36px;color:#00965a}
        .member-caption{overflow:hidden;color:#41516b;font-size:clamp(10px,1.5vw,13px);line-height:1;text-overflow:ellipsis;white-space:nowrap}
        .member-name{overflow:hidden;margin-top:5px;color:#07192d;font-size:clamp(15px,2.3vw,21px);line-height:1;text-overflow:ellipsis;white-space:nowrap}
        .member-arrow{width:19px;height:19px;color:#07192d}
        .two-columns,.lower-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 var(--page-pad)}
        .two-columns{margin:0 0 13px}
        .lower-grid{margin:0}
        .panel{min-width:0;padding:12px 13px;border:1px solid #bfe0d6;border-radius:22px;background:rgba(255,255,255,.98);box-shadow:0 9px 24px rgba(0,64,47,.08)}
        .panel-title{min-width:0;gap:10px;padding:0 0 9px;margin:0 0 3px;border-bottom:1px solid #dfe9e5;color:#07192d;font-size:clamp(14px,2vw,18px);line-height:1.1;letter-spacing:-.02em;white-space:nowrap}
        .panel-title{overflow:hidden;text-overflow:ellipsis}
        .panel-icon{width:39px;height:39px;flex:none;border-radius:50%;background:linear-gradient(145deg,#effff5,#c9f6d9);color:#008b51}
        .panel-icon svg{width:23px;height:23px}
        .line{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:9px;min-width:0;min-height:39px;padding:7px 5px;border-bottom:1px solid #e4ece9;color:#15243a;font-size:clamp(11px,1.55vw,14px);line-height:1.15}
        .line>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .line>strong{color:#07192d;font-size:clamp(12px,1.75vw,16px);line-height:1;white-space:nowrap}
        .line.paid{margin:0;padding:7px 5px;border-bottom:1px solid #e4ece9;border-radius:0;background:transparent;color:#15243a}
        .line.paid strong,.positive{color:#004c38!important}
        .line.due{min-height:45px;margin:4px -4px -2px;padding:8px 10px;border:0;border-radius:12px;background:linear-gradient(90deg,#ddf8e8,#cff3dc);color:#07192d}
        .line.due strong{color:#00563b!important}
        .summary-panel,.payment-panel{min-height:300px}
        .summary-panel .line,.payment-panel .line{min-height:39px;padding:7px 5px}
        .line.highlight{min-height:47px;margin:4px -4px;padding:8px 10px;border:0;border-radius:12px;background:linear-gradient(90deg,#ddf8e8,#cef3dc);color:#07192d}
        .line.highlight strong{color:#00563b}
        .line.final-line{min-height:61px;margin:5px -1px 0;padding:11px 13px;border:0;border-radius:15px;background:linear-gradient(110deg,#009c58,#00442f);box-shadow:0 8px 18px rgba(0,103,62,.17);color:#fff;font-size:clamp(13px,1.85vw,17px)}
        .line.final-line>span:before{content:"✓";display:inline-grid;place-items:center;width:29px;height:29px;margin-right:9px;border-radius:50%;background:#4bdd66;box-shadow:0 5px 10px rgba(0,0,0,.16);color:#fff;font-weight:800;vertical-align:middle}
        .line.final-line strong{color:#fff;font-size:clamp(15px,2.1vw,19px)}
        .line.final-line.estimated-line{display:none}
        .payment-options-inline{display:grid;gap:5px;margin:5px 0 0;padding:0;border:0}
        .payment-panel .panel-title{font-size:clamp(15px,2.15vw,19px)}
        .payment-panel .line{font-size:clamp(12px,1.7vw,15px)}
        .payment-panel .line>strong{font-size:clamp(13px,1.9vw,17px)}
        .payment-option-line{display:grid;grid-template-columns:42px minmax(0,1fr) minmax(74px,auto);align-items:center;gap:8px;min-width:0;min-height:39px;padding:4px 5px;border:0;border-bottom:1px solid #e4ece9;border-radius:0;background:transparent}
        .payment-option-line:last-child{border-bottom:0}
        .payment-option-line img,.payment-option-line>span{width:42px;height:27px;padding:3px;border:1px solid #dbe8e2;border-radius:999px;background:#fff;object-fit:contain;box-shadow:0 3px 7px rgba(0,55,40,.08)}
        .payment-option-line strong{min-width:0;overflow:hidden;color:#07192d;font-size:clamp(11px,1.6vw,14px);line-height:1;text-overflow:ellipsis;white-space:nowrap}
        .payment-option-line small{min-width:0;overflow:hidden;justify-self:end;padding:6px 9px;border-radius:999px;background:#dcf7e7;color:#173a2e;font-size:clamp(10px,1.4vw,13px);font-weight:650;line-height:1;text-overflow:ellipsis;white-space:nowrap}
        .amount-due{position:relative;display:flex;align-items:center;gap:13px;min-height:86px;margin:19px var(--page-pad) 0;padding:13px 150px 13px 18px;overflow:hidden;border:1px solid #99e6bd;border-radius:24px;background:linear-gradient(95deg,#effff3 0,#d9f8e4 70%,#bff2d0 100%);color:#005237}
        .amount-due:after{content:"";position:absolute;right:-36px;bottom:-54px;width:230px;height:120px;border-radius:55% 0 0 0;background:linear-gradient(135deg,rgba(94,227,151,.44),rgba(0,178,91,.95));transform:rotate(-12deg)}
        .amount-icon{z-index:1;width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#00a85b,#006e43);box-shadow:0 7px 15px rgba(0,93,55,.2);color:#fff}
        .amount-icon svg{width:28px;height:28px}
        .amount-due>div{z-index:1;min-width:0}
        .amount-title{overflow:hidden;color:#005237;font-size:clamp(19px,2.9vw,27px);line-height:1.1;text-overflow:ellipsis;white-space:nowrap}
        .amount-note{overflow:hidden;margin-top:5px;color:#162a30;font-size:clamp(11px,1.7vw,15px);line-height:1.15;text-overflow:ellipsis;white-space:nowrap}
        .house-art{display:none}
        footer{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:13px;margin:24px var(--page-pad) 0;color:#5d6b82;font-size:clamp(10px,1.45vw,13px);line-height:1;white-space:nowrap}
        footer:before,footer:after{background:#a8b9c5}
        footer strong{color:#007446}
        .bottom-waves{position:absolute;z-index:1;right:0;bottom:0;left:0;height:58px;overflow:hidden;pointer-events:none}
        .bottom-waves:before,.bottom-waves:after{content:"";position:absolute;right:-8%;bottom:-43px;width:116%;height:94px;border-radius:50% 50% 0 0/34% 34% 0 0;transform:rotate(2deg)}
        .bottom-waves:before{bottom:-29px;background:#92edb1;transform:rotate(-2deg)}
        .bottom-waves:after{background:linear-gradient(100deg,#008a50,#00a55c)}

        @media(max-width:650px){
          body{display:block;min-height:100svh;padding:0;background:#fff}
          .sheet{--page-pad:clamp(9px,3vw,16px);width:100%;min-height:max(100svh,calc(100vw * 16 / 9));aspect-ratio:9/16;border:0;border-radius:0;box-shadow:none;padding-bottom:clamp(49px,13vw,62px)}
          .hero{min-height:clamp(116px,31vw,145px);padding:clamp(14px,4vw,21px) var(--page-pad) clamp(39px,10vw,52px)}
          .hero:before{bottom:-32px;height:65px}.hero:after{bottom:-45px;height:76px}
          .topbar{grid-template-columns:minmax(0,1fr) clamp(102px,28vw,126px);gap:8px}
          .brand{gap:8px}.brand-mark{width:clamp(42px,12vw,53px);height:clamp(42px,12vw,53px);border-radius:13px}.brand>div:last-child{padding-left:8px}
          .brand-title{font-size:clamp(17px,5.3vw,23px)}.brand-subtitle{font-size:clamp(8px,2.55vw,11px)}
          .toolbar{gap:6px}.toolbar button{height:clamp(28px,8.2vw,35px);gap:5px;padding:0 7px;font-size:clamp(8px,2.65vw,11px)}.toolbar button svg{width:clamp(13px,3.8vw,16px);height:clamp(13px,3.8vw,16px)}.toolbar-spinner{width:12px;height:12px;border-width:1.5px}
          .headline{grid-template-columns:minmax(0,1fr) minmax(121px,36%);gap:7px;min-height:clamp(57px,17vw,72px);margin:clamp(-21px,-5.3vw,-16px) var(--page-pad) 8px;padding:7px;border-radius:clamp(13px,4vw,18px)}
          .title-block{gap:7px}.title-icon{width:clamp(31px,9vw,39px);height:clamp(31px,9vw,39px);border-radius:10px}.title-icon svg{width:61%;height:61%}
          h1{font-size:clamp(15px,4.6vw,20px)}.month{margin-top:3px;font-size:clamp(9px,2.9vw,12px)}
          .member-card{gap:6px;min-height:44px;padding:5px 7px;border-radius:13px}.member-icon{width:clamp(24px,7vw,30px);height:clamp(24px,7vw,30px)}.member-caption{font-size:clamp(7px,2.1vw,9px)}.member-name{margin-top:3px;font-size:clamp(10px,3.15vw,13px)}.member-arrow{width:13px;height:13px}
          .two-columns,.lower-grid{gap:clamp(6px,2vw,9px)}.two-columns{margin-bottom:8px}
          .panel{padding:clamp(6px,2vw,9px);border-radius:clamp(13px,4vw,18px)}
          .panel-title{gap:5px;padding-bottom:5px;font-size:clamp(9px,2.85vw,12px)}.panel-icon{width:clamp(25px,7.5vw,32px);height:clamp(25px,7.5vw,32px)}.panel-icon svg{width:58%;height:58%}
          .line{gap:4px;min-height:clamp(24px,7.2vw,30px);padding:4px 2px;font-size:clamp(7.5px,2.25vw,9.6px)}.line>strong{font-size:clamp(8.5px,2.65vw,11px)}
          .line.paid{padding:4px 2px}.line.due{min-height:clamp(29px,8.3vw,36px);margin:3px -3px -1px;padding:5px;border-radius:8px}
          .summary-panel,.payment-panel{min-height:clamp(203px,58vw,248px)}.summary-panel .line,.payment-panel .line{min-height:clamp(24px,7vw,29px);padding:4px 2px}
          .line.highlight{min-height:clamp(31px,8.8vw,37px);margin:3px -3px;padding:5px;border-radius:8px}
          .line.final-line{min-height:clamp(40px,11.5vw,49px);margin-top:3px;padding:7px;border-radius:10px;font-size:clamp(8.5px,2.5vw,11px)}.line.final-line>span:before{width:clamp(19px,5.6vw,24px);height:clamp(19px,5.6vw,24px);margin-right:4px}.line.final-line strong{font-size:clamp(9px,2.8vw,12px)}
          .payment-panel .panel-title{font-size:clamp(10px,3.05vw,13px)}.payment-panel .line{font-size:clamp(8.2px,2.5vw,10.5px)}.payment-panel .line>strong{font-size:clamp(9px,2.8vw,11.7px)}
          .payment-options-inline{gap:1px;margin-top:2px}.payment-option-line{grid-template-columns:clamp(25px,7.4vw,31px) minmax(0,1fr) minmax(42px,42%);gap:3px;min-height:clamp(25px,7.5vw,31px);padding:2px 1px}.payment-option-line img,.payment-option-line>span{width:clamp(25px,7.4vw,31px);height:clamp(17px,4.9vw,21px);padding:2px}.payment-option-line strong{font-size:clamp(7.6px,2.3vw,9.7px)}.payment-option-line small{padding:4px;font-size:clamp(6.8px,2.05vw,8.7px)}
          .amount-due{min-height:clamp(49px,14vw,59px);margin:9px var(--page-pad) 0;padding:7px clamp(64px,20vw,86px) 7px 9px;border-radius:clamp(13px,4vw,18px);gap:7px}.amount-due:after{right:-34px;bottom:-50px;width:132px;height:84px}.amount-icon{width:clamp(30px,8.8vw,37px);height:clamp(30px,8.8vw,37px)}.amount-icon svg{width:58%;height:58%}.amount-title{font-size:clamp(12px,3.7vw,16px)}.amount-note{margin-top:3px;font-size:clamp(7px,2.15vw,9px)}
          footer{gap:7px;margin:clamp(12px,3.5vw,16px) var(--page-pad) 0;font-size:clamp(6.8px,2.05vw,8.7px)}.bottom-waves{height:clamp(42px,12vw,53px)}
        }
        @page{size:A4 portrait;margin:0}
        @media print{
          html,body{width:210mm;height:100%;margin:0!important;padding:0!important;background:#fff}
          body{display:block;min-height:297mm;overflow:visible}
          .sheet{--page-pad:9mm;width:210mm;height:auto;min-height:296mm;max-height:297mm;margin:0;padding-bottom:14mm;overflow:hidden;border:0;border-radius:0;box-shadow:none;page-break-after:avoid;break-after:avoid;page-break-inside:avoid;break-inside:avoid}
          .hero{min-height:57mm;padding:9mm var(--page-pad) 17mm}.topbar{grid-template-columns:1fr}.toolbar{display:none!important}.brand-mark{width:18mm;height:18mm}.brand-title{font-size:9mm}.brand-subtitle{font-size:4.8mm}
          .headline{min-height:24mm;margin:-8mm var(--page-pad) 4.5mm;padding:3mm 4mm}.title-icon{width:13mm;height:13mm}h1{font-size:8mm}.month{font-size:4.8mm}.member-card{min-height:17mm}.member-name{font-size:5.5mm}
          .two-columns,.lower-grid{gap:3.5mm}.two-columns{margin-bottom:3.5mm}.panel{padding:3.3mm 3.6mm}.panel-title{font-size:4.8mm}.line{min-height:10mm;font-size:3.7mm}.line>strong{font-size:4.2mm}.line.due{min-height:11mm}.summary-panel,.payment-panel{min-height:77mm}.payment-panel .panel-title{font-size:5.1mm}.payment-panel .line{font-size:4mm}.payment-panel .line>strong{font-size:4.5mm}.payment-option-line{min-height:9.4mm}.payment-option-line strong{font-size:3.6mm}.payment-option-line small{font-size:3.2mm}
          .amount-due{min-height:22mm;margin-top:5mm}.amount-title{font-size:7mm}.amount-note{font-size:4mm}footer{margin-top:6mm;font-size:3.4mm}.bottom-waves{height:16mm}
        }
      </style></head><body lang="en"><main class="sheet">
        <header class="hero">
          <div class="topbar">
            <div class="brand"><div class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></svg></div><div><div class="brand-title">MridhaBari 6B</div><div class="brand-subtitle">Ka/164, Kuratoli, Kuril, Vatara, Dhaka 1229</div></div></div>
            <div class="toolbar" data-html2canvas-ignore="true">
              <button type="button" class="btn-save-pdf" onclick="window.saveBillAsPdf(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6m-3 3 3 3 3-3"/></svg><span>Save as PDF</span></button>
              <button type="button" class="btn-save-image" onclick="window.saveBillAsImage(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Save as image</span></button>
            </div>
          </div>
        </header>
        <div class="headline">
          <div class="title-block"><span class="title-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg></span><div><h1>Monthly Bill</h1><div class="month">${escapeHtml(month)}</div></div></div>
          <div class="member-card"><svg class="member-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><div><div class="member-caption">Member</div><div class="member-name">${escapeHtml(member.name)}</div></div><svg class="member-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
        </div>
        <div class="two-columns">
          <section class="panel"><div class="panel-title"><span class="panel-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></svg></span>Rent &amp; Utilities</div>
            <div class="line"><span>Room Rent + Utilities Share</span><strong>${money(rentAndUtilities)}</strong></div>
            <div class="line paid"><span>Paid</span><strong>${money(rentPaid)}</strong></div>
            <div class="line due"><span>Due (This Month)</span><strong class="${rentDueColor}">${signedMoney(rentUtilitiesDue)}</strong></div>
          </section>
          <section class="panel"><div class="panel-title"><span class="panel-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3m-3 7v11M17 3v18m0-18c3 2 3 7 0 9"/></svg></span>Meal (Food)</div>
            <div class="line"><span>Meal Cost (Your Share)</span><strong>${money(mealCost)}</strong></div>
            <div class="line paid"><span>Meal Paid</span><strong>${money(mealPaid)}</strong></div>
            <div class="line due"><span>Balance / Credit</span><strong class="${mealDueColor}">${signedMoney(mealBalance)}</strong></div>
          </section>
        </div>
        <div class="lower-grid">
          <section class="panel summary-panel"><div class="panel-title"><span class="panel-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg></span>Summary</div>
            <div class="line"><span>Rent &amp; Utilities Due</span><strong>${signedMoney(rentUtilitiesDue)}</strong></div>
            <div class="line"><span>Meal Balance (Credit)</span><strong>${signedMoney(mealBalance)}</strong></div>
            <div class="line highlight"><span>This Month Balance</span><strong>${signedMoney(currentBalance)}</strong></div>
            <div class="line"><span>Previous Month Balance (Credit)</span><strong>${signedMoney(previousBalance)}</strong></div>
            <div class="line final-line"><span>Final Balance Due</span><strong>${signedMoney(finalBalance)}</strong></div>
            <div class="line final-line estimated-line"><span>Estimated Due<small>Total Meal Cost ${money(estimatedMealTarget)}</small></span><strong>${signedMoney(estimatedMonthDue)}</strong></div>
          </section>
          <section class="panel payment-panel"><div class="panel-title"><span class="panel-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18m-4 5h.01"/></svg></span>Payment Breakdown</div>
            <div class="line"><span>Rent Paid</span><strong>${money(rentPaid)}</strong></div>
            <div class="line"><span>Meal Paid</span><strong>${money(mealPaid)}</strong></div>
            <div class="line highlight"><span>Total Paid</span><strong class="positive">${money(totalPaid)}</strong></div>
            ${paymentMethodsHtml}
          </section>
        </div>
        <div class="amount-due"><span class="amount-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg></span><div><div class="amount-title">Amount Due: ${signedMoney(finalBalance)}</div><div class="amount-note">${finalBalance > 0 ? "Please clear the due amount at your earliest convenience." : "Your account has a credit balance."}</div></div><svg class="house-art" viewBox="0 0 160 100" fill="none" aria-hidden="true"><path d="M5 88c22-7 36-4 53 0 20 5 41 5 58-1 16-5 27-4 39 1v12H5V88Z" fill="#B9E8A6"/><path d="m31 62 34-31 34 31v31H31V62Z" fill="#FFF9E8" stroke="#14864D" stroke-width="5" stroke-linejoin="round"/><path d="m21 62 44-40 44 40-7 7-37-33-37 33-7-7Z" fill="#078C4A"/><path d="M84 34V18h13v28" fill="#168E4A" stroke="#087342" stroke-width="4"/><path d="M53 67h23v26H53z" fill="#FFF1C9" stroke="#16884B" stroke-width="3"/><path d="M64.5 68v24M54 80h21" stroke="#E8A72E" stroke-width="2"/><path d="M16 87c-8-10-4-20 2-23 7 5 9 14 4 22m-8 0c-2-12 2-19 9-21m-4 21h14" stroke="#36A84C" stroke-width="4" stroke-linecap="round"/><path d="M125 88c-5-9-2-17 4-20 7 5 8 13 3 20m-7 0c-2-10 2-16 8-18m-6 18h16" stroke="#36A84C" stroke-width="4" stroke-linecap="round"/><circle cx="21" cy="80" r="7" fill="#84D66F"/><circle cx="133" cy="78" r="8" fill="#78CE64"/></svg></div>
        <footer>Generated by <strong>Rahat</strong> &middot; ${escapeHtml(generatedDate)}</footer>
        <div class="bottom-waves" aria-hidden="true"></div>
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
                var scale = pageHeight / imgHeight;
                var fittedWidth = imgWidth * scale;
                var xOffset = (pageWidth - fittedWidth) / 2;
                pdf.addImage(imgData, "PNG", xOffset, 0, fittedWidth, pageHeight, undefined, "FAST");
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
    const reportMembers = db.users
      .filter((member) => member.active)
      .map((member) => {
        const charge = roundMoney(memberRentShare(member) + memberMealShare(member));
        const covered = roundMoney(memberRentPaid(member.id) + memberMealPaid(member.id));
        return {
          name: member.name || "Member",
          username: member.username || "House member",
          charge,
          covered,
          balance: roundMoney(charge - covered),
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
      },
      costMix,
      bazarTrend,
      members: reportMembers,
      costDrivers,
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
      <div className={`login-wrap${theme === "dark" ? " dark-theme" : ""}`}>
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
          {error && <div className="error">{error}</div>}
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
  return (
    <div className={`app premium-theme${theme === "dark" ? " dark-theme" : ""}`}>
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand sidebar-property-card">
          <div className="brand-mark sidebar-property-mark">
            <Home size={20} />
          </div>
          <div className="sidebar-property-copy">
            <span className="sidebar-property-kicker">Residence</span>
            <b>MridhaBari 6B</b>
          </div>
          <small className="sidebar-property-address">
            <MapPin size={14} aria-hidden="true" />
            <span>Ka/164, Kuratoli, Kuril, Vatara, Dhaka 1229</span>
          </small>
          <button
            className="icon-btn mobile-close bazar-action"
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
      <main className={page === "overview" ? "main overview-page" : page === "my-account" ? "main my-account-page" : page === "settlements" ? "main settlement-page" : page === "contacts" ? "main contacts-page" : page === "inbox" ? "main inbox-page" : page === "pay-rent" ? "main pay-rent-app-page" : page === "bazar" ? "main bazar-page" : page === "payments" ? "main payments-page" : "main"}>
        <header className={`${page === "my-account" ? "account-header " : ""}${page === "overview" ? "overview-page-header" : ""}${page === "settlements" ? "settlement-page-header" : ""}`}>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label="Open navigation menu"
            onClick={() => setMenu(true)}
          >
            <Menu size={22} strokeWidth={2.25} />
          </button>
          {page !== "my-account" && (
            <div className={page === "overview" ? "overview-page-heading" : page === "settlements" ? "settlement-page-heading" : "app-page-heading"}>
              {page === "inbox" && <span className="inbox-page-mark"><MessageCircle size={23} /></span>}
              {page === "payments" && <span className="payments-page-mark" aria-hidden="true"><span className="payments-page-mark-inner"><Wallet size={20} /></span></span>}
              {page === "settlements" && (
                <span className="settlement-page-mark" aria-hidden="true">
                  <span className="settlement-page-mark-inner">
                    <Utensils size={21} />
                  </span>
                </span>
              )}
              <h2>{page === "settlements" ? "Member meal balances" : nav.find((x) => x[0] === page)?.[1] || "My Account"}</h2>
              <p>
                {page === "settlements"
                  ? "Current meal balance of all members"
                  : "Manage your home, one month at a time."}
              </p>
            </div>
          )}
          <div className="header-actions">
            <button
              type="button"
              className="icon-btn theme-mode-toggle"
              aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
              title={theme === "dark" ? "Use light theme" : "Use dark theme"}
              onClick={() => setTheme((currentTheme) => currentTheme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
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
                <span>{month}</span>
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
        </header>
        {page === "overview" && admin && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">MONTHLY OVERVIEW</span>
              </div>
              <div className="welcome-actions">
                <button className="secondary" onClick={exportCsv}>
                  <Download size={16} /> Export CSV
                </button>
                <button className="primary" onClick={exportPremiumPdf}>
                  <Download size={16} /> Export PDF
                </button>
                <button
                  type="button"
                  className="danger reset-month-btn"
                  onClick={resetMonth}
                >
                  <RotateCcw size={16} /> Reset Hisab
                </button>
              </div>
            </section>
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
                        <th>Individual meal</th>
                        <th>Rent paid</th>
                        <th>Meal paid</th>
                        <th>Previous Due</th>
                        <th>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDue.map((x) => (
                        <tr>
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
                            <span className="mobile-due">
                              {money(memberDue(x.u) + (previousDueByUser[x.u.id] || 0))}
                            </span>
                          </td>
                          <td>{money(memberRentShare(x.u))}</td>
                          <td>{money(memberMealShare(x.u))}</td>
                          <td className="green-text">{money(memberRentPaid(x.u.id))}</td>
                          <td className="green-text">{money(memberMealPaid(x.u.id))}</td>
                          <td>{previousDueLoading ? "Loading…" : money(previousDueByUser[x.u.id] || 0)}</td>
                          <td className="due">{money(memberDue(x.u) + (previousDueByUser[x.u.id] || 0))}</td>
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
                    <div className={`break-row utility-payment-row flat-rent-payment-row${flatIsPaid ? " is-paid" : flatIsPartial ? " is-partial" : " is-unpaid"}`}>
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
                    <div className={`break-row utility-payment-row${isPaid ? " is-paid" : isPartial ? " is-partial" : " is-unpaid"}`} key={c.id || c.name}>
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
            <section className="welcome account-welcome">
              <div>
                <span className="eyebrow">PERSONAL ACCOUNT</span>
                <h1>Hello, {user.name}{<span className="account-wave" aria-hidden="true"> 👋</span>}</h1>
                <p>Your room rent, utilities, and meal cost for {month}.</p>
              </div>
              <div className="account-welcome-actions">
                <div className="account-today-card" title="Today's date and day">
                  <div className="account-today-cal-badge" aria-hidden="true">
                    <span className="account-today-cal-month">{todayShortMonth}</span>
                    <span className="account-today-cal-day">{todayDayNum}</span>
                  </div>
                  <div className="account-today-details">
                    <span className="account-today-day-label">{todayWeekday}</span>
                    <span className="account-today-date-label">{todayFormattedDate}</span>
                  </div>
                </div>
                <button className="btn secondary account-pdf-btn" type="button" onClick={() => exportMemberBill(user)}><Download size={16} /> Export PDF</button>
              </div>
            </section>
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
              {dividedUtilityCategories.length > 0 ? (
                dividedUtilityCategories
                  .map((c) => (
                    <div
                      className="break-row expense-detail-row"
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
              <div className="break-row expense-detail-row">
                <span className="account-expense-icon"><Home size={17} /></span>
                <div className="account-expense-info">Room rent</div>
                <div className="expense-share">
                  <small>Amount</small>
                  <b>{money(ownRent)}</b>
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
                    <div className="settlement-plan-overview" aria-label="Suggested settlement plan summary">
                      <span className="settlement-plan-overview-icon" aria-hidden="true">
                        <Sparkles size={17} />
                      </span>
                      <span className="settlement-plan-overview-copy">
                        <small>Recommended plan</small>
                        <strong>
                          {settlementSuggestions.length} transfer{settlementSuggestions.length === 1 ? "" : "s"} to settle balances
                        </strong>
                      </span>
                      <span className="settlement-plan-overview-total">
                        <small>Total amount</small>
                        <strong>
                          {money(settlementSuggestions.reduce(
                            (total, suggestion) => total + Number(suggestion.amount || 0),
                            0,
                          ))}
                        </strong>
                      </span>
                    </div>
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
                          className="primary settlement-plan-action"
                          onClick={createAutoSettlementPlan}
                          disabled={settlementPlanBusy}
                        >
                          <Sparkles size={15} aria-hidden="true" />
                          <span className="settlement-plan-action-copy">
                            <strong>{settlementPlanBusy ? "Creating plan..." : "Create settlement plan"}</strong>
                            <small>Save all suggested transfers</small>
                          </span>
                          <ArrowRight size={15} aria-hidden="true" />
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
                    <span><ArrowUpDown size={24} /></span>
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
                      <select
                        value={settlementForm.sourceType}
                        onChange={(event) =>
                          setSettlementForm({
                            ...settlementForm,
                            sourceType: event.target.value,
                          })
                        }
                      >
                        <option value="cash_contribution">Refund from cash contribution</option>
                        <option value="direct">Direct member transfer</option>
                      </select>
                    </label>
                    <div className="settlement-form-grid">
                      <label>
                        {settlementForm.sourceType === "cash_contribution"
                          ? "Contribution from"
                          : "Paid by"}
                        <select
                          value={settlementForm.fromUserId}
                          onChange={(event) =>
                            setSettlementForm({
                              ...settlementForm,
                              fromUserId: event.target.value,
                            })
                          }
                        >
                          {allActiveUsers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                              {settlementForm.sourceType === "cash_contribution"
                                ? ` · ${money(availableContributionForSettlement(member.id))} available`
                                : ` · balance ${money(memberMealBalance(member, true))}`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {settlementForm.sourceType === "cash_contribution"
                          ? "Refund to"
                          : "Paid to"}
                        <select
                          value={settlementForm.toUserId}
                          onChange={(event) =>
                            setSettlementForm({
                              ...settlementForm,
                              toUserId: event.target.value,
                            })
                          }
                        >
                          {allActiveUsers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} · balance {money(memberMealBalance(member, true))}
                            </option>
                          ))}
                        </select>
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
                      <th>Report</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.users.map((u) => (
                      <tr>
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
                          <button
                            className="icon-btn member-report-download"
                            title={`Download ${u.name} ${month} bill`}
                            aria-label={`Download ${u.name} ${month} bill`}
                            onClick={() => exportMemberBill(u)}
                          >
                            <Download size={16} />
                          </button>
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
                <div className="bazar-history-head">
                <div className="bazar-history-title">
                  <span className="bazar-history-icon">
                    <img
                      className="bazar-cart-artwork-icon"
                      src="/bazar-grocery-cart-transparent.png"
                      alt=""
                    />
                  </span>
                  <span className="bazar-history-divider" aria-hidden="true" />
                  <PanelHead title="Monthly bazar history" sub={`${month} · purchases only`} />
                </div>
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
                <button type="button" className="primary" onClick={() => {
                  setBazarActionMenuId(null);
                  setBazarForm((form) => ({ ...form, date: todayForDateInput() }));
                  setShowAddBazar(true);
                }}><Plus size={16}/> Add Bazar</button>
              </div>
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
                  <form className="bazar-needed-form" onSubmit={addBazarNeededItem}>
                    <input
                      id="bazar-needed-input"
                      type="text"
                      value={bazarNeededDraft}
                      onChange={(event) => setBazarNeededDraft(event.target.value)}
                      placeholder="Add an item to buy"
                      aria-label="Item that needs to be bought"
                      disabled={bazarNeededBusy}
                    />
                    <button
                      type="submit"
                      className="primary"
                      disabled={bazarNeededBusy || !bazarNeededDraft.trim()}
                    >
                      <Plus size={16} /> Add item
                    </button>
                  </form>
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
                              <span>
                                <b>{item.name}</b>
                                <small>{item.done ? "Bought" : "Need to buy"}</small>
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
                <label className="history-filter">
                  <span className="bazar-filter-label"><Filter size={16} aria-hidden="true" /> Member</span>
                  <span className="bazar-filter-select" ref={bazarFilterRef}>
                    <Users size={15} aria-hidden="true" />
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
                      <span>
                        {bazarFilter === "all"
                          ? "All members"
                          : bazarFilter === "cash-in-hand"
                            ? "Cash in Hand"
                            : (() => {
                                const member = allActiveUsers.find((candidate) => candidate.id === bazarFilter);
                                return member ? `${member.name}${member.role === "admin" ? " (Admin)" : ""}` : "All members";
                              })()}
                      </span>
                    </button>
                    <ChevronRight className={`bazar-filter-select-chevron${bazarFilterMenuOpen ? " is-open" : ""}`} size={15} aria-hidden="true" />
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
                </label>
                <label className="bazar-search">
                  <Search size={18} aria-hidden="true" />
                  <input
                    type="search"
                    value={bazarSearch}
                    onChange={(event) => setBazarSearch(event.target.value)}
                    placeholder="Search items, e.g. rice, oil, dal..."
                    aria-label="Search bazar items"
                  />
                </label>
                <div className="total-row bazar-total-row">
                  <b>Total bazar purchased</b>
                  <b><span>{money(selectedBazarTotal)}</span></b>
                  <ShoppingBasket className="bazar-total-icon" size={64} aria-hidden="true" />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="bazar-date-heading"><CalendarDays size={14} aria-hidden="true" /> Date</th>
                        <th className="bazar-amount-heading"><Wallet size={14} aria-hidden="true" /> Amount</th>
                        <th className="bazar-items-heading"><ShoppingBasket size={14} aria-hidden="true" /> Items</th>
                        <th className="bazar-paid-heading"><Users size={14} aria-hidden="true" /> Paid by</th>
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
                            <td className="bazar-history-amount bazar-amount-cell">{money(b.amount)}</td>
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
                  <div className="bazar-item-list">
              <div className="bazar-item-heading"><span>Item</span><span>Price (৳)</span></div>
              {bazarRows.map((row, index) => <div className="bazar-item-row" key={index}>
                <input aria-label={`Item ${index+1}`} placeholder={`Item ${index + 1}`} value={row.item} onChange={(e)=>updateBazarRow(index,"item",e.target.value)}/>
                <input aria-label={`Price ${index+1}`} type="number" min="0" step="0.01" placeholder="0.00" value={row.price} onChange={(e)=>updateBazarRow(index,"price",e.target.value)}/>
              </div>)}
              <button type="button" className="secondary full" onClick={()=>setBazarRows(rows=>[...rows,{item:"",price:""}])}><Plus size={15}/> Add item</button>
              <div className="bazar-item-total"><span>Total</span><strong>{money(bazarRows.reduce((sum,row)=>sum+Number(row.price||0),0))}</strong></div>
            </div>

                  <label>
                    Paid by
                    {admin ? (
                      <select
                        name="paidBy"
                        value={bazarForm.paidBy || user.id}
                        onChange={(e) => {
                          const val = e.target.value;
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
                      >
                        {allActiveUsers.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role === "admin" ? " (Admin)" : ""}</option>)}
                        <option value="cash-in-hand">Cash in Hand</option>
                        <option value="combine">⚡ Combine (Cash in Hand + Member)</option>
                      </select>
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
                          <select
                            value={bazarForm.combinedMemberId || user.id}
                            onChange={(e) => setBazarForm((f) => ({ ...f, combinedMemberId: e.target.value }))}
                          >
                            {allActiveUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}{u.role === "admin" ? " (Admin)" : ""}
                              </option>
                            ))}
                          </select>
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
                <section className="modal panel bazar-edit-modal" role="dialog" aria-modal="true" aria-labelledby="bazar-edit-title" onClick={(e) => e.stopPropagation()}>
                  <PanelHead title="Edit bazar entry" sub="Update date, items and prices" />
                  <div className="bazar-edit-fields">
                    <label>Date<input type="date" value={bazarEditEntry.editDate} onChange={(e) => setBazarEditEntry((old) => ({...old, editDate:e.target.value}))}/></label>
                    {bazarEditEntry.editItems.map((row, index) => (
                      <div className="bazar-edit-item-row" key={index}>
                        <label>Item {index + 1}<input value={row.item} placeholder={`Item ${index + 1}`} onChange={(e) => setBazarEditEntry((old) => ({...old, editItems:old.editItems.map((it,i)=>i===index?{...it,item:e.target.value}:it)}))}/></label>
                        <label>Price (৳)<input type="number" min="0" step="0.01" value={row.price} placeholder="0.00" onChange={(e) => {
                          const val = e.target.value;
                          setBazarEditEntry((old) => {
                            const nextItems = old.editItems.map((it, i) => i === index ? { ...it, price: val } : it);
                            const nextTotal = nextItems.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
                            let combinedMemberAmount = old.combinedMemberAmount;
                            if (old.editPaidBy === "combine") {
                              const cashNum = parseFloat(old.combinedCashAmount) || 0;
                              combinedMemberAmount = String(Math.max(0, roundMoney(nextTotal - cashNum)));
                            }
                            return { ...old, editItems: nextItems, combinedMemberAmount };
                          });
                        }}/></label>
                        <button type="button" className="danger-text icon-btn premium-delete-action bazar-action" aria-label={`Remove item ${index+1}`} disabled={bazarEditEntry.editItems.length===1} onClick={() => setBazarEditEntry((old) => {
                          const nextItems = old.editItems.filter((_,i)=>i!==index);
                          const nextTotal = nextItems.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
                          let combinedMemberAmount = old.combinedMemberAmount;
                          if (old.editPaidBy === "combine") {
                            const cashNum = parseFloat(old.combinedCashAmount) || 0;
                            combinedMemberAmount = String(Math.max(0, roundMoney(nextTotal - cashNum)));
                          }
                          return { ...old, editItems: nextItems, combinedMemberAmount };
                        })}><PremiumDeleteIcon size={15}/></button>
                      </div>
                    ))}
                    <button type="button" className="secondary full" onClick={() => setBazarEditEntry((old) => ({...old,editItems:[...old.editItems,{item:"",price:""}]}))}>＋ Add item</button>
                    {admin ? (
                      <label>
                        Paid by
                        <select
                          value={bazarEditEntry.editPaidBy}
                          onChange={(e) => {
                            const val = e.target.value;
                            const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                            const oldCash = bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0;
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
                        >
                          {(db.users || [])
                            .filter((member) => member.active !== false || member.id === bazarEditEntry.editPaidBy)
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}{member.role === "admin" ? " (Admin)" : ""}
                              </option>
                            ))}
                          <option value="cash-in-hand">Cash in Hand</option>
                          <option value="combine">⚡ Combine (Cash in Hand + Member)</option>
                        </select>
                      </label>
                    ) : (
                      roundMoney(cashInHand - pendingCashSettlementTotal + (bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0)) > 0 && (
                        <label className="bazar-combine-toggle">
                          <input
                            type="checkbox"
                            checked={bazarEditEntry.editPaidBy === "combine"}
                            onChange={(e) => {
                              const total = (bazarEditEntry.editItems || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);
                              const oldCash = bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0;
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
                            Available Cash: <strong>{money(Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + (bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0))))}</strong>
                          </span>
                        </div>

                        {admin && (
                          <label className="bazar-combine-member-select">
                            Member paying balance
                            <select
                              value={bazarEditEntry.combinedMemberId || user?.id}
                              onChange={(e) => setBazarEditEntry((old) => ({ ...old, combinedMemberId: e.target.value }))}
                            >
                              {allActiveUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}{u.role === "admin" ? " (Admin)" : ""}
                                </option>
                              ))}
                            </select>
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
                              const oldCash = bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0;
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
                            Use Max Cash ({money(Math.min((bazarEditEntry.editItems || []).reduce((s, r) => s + (Number(r.price) || 0), 0), Math.max(0, roundMoney(cashInHand - pendingCashSettlementTotal + (bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0)))))})
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
                            const oldCash = bazarEditEntry.paidFromCash ? Number(bazarEditEntry.amount || 0) : 0;
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
                    <div className="bazar-edit-total"><span>Total</span><strong>{money((bazarEditEntry.editItems||[]).reduce((sum,row)=>sum+(Number(row.price)||0),0))}</strong></div>
                  </div>
                  <div className="bazar-edit-actions">
                    <button type="button" className="secondary bazar-action" onClick={() => setBazarEditEntry(null)}>Cancel</button>
                    <button type="button" className="primary" onClick={saveBazarEdit}>{bazarEditEntry.editPaidBy === "combine" ? "Save combined changes" : "Save changes"}</button>
                  </div>
                </section>
              </div>
            )}
            {bazarDetailsEntry && (
              <div className="modal-backdrop" role="presentation">
                <section className="modal panel bazar-details-modal" role="dialog" aria-modal="true" aria-labelledby="bazar-details-title" onClick={(e) => e.stopPropagation()}>
                  <PanelHead title="Bazar details" sub={bazarDetailsEntry.date} />
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Item</th><th>Price</th></tr></thead>
                      <tbody>
                        {(() => {
                          let details = Array.isArray(bazarDetailsEntry.items) ? bazarDetailsEntry.items : null;
                          if (!details && typeof bazarDetailsEntry.items === "string") {
                            try { const parsed=JSON.parse(bazarDetailsEntry.items); details=Array.isArray(parsed)?parsed:null; } catch { details=null; }
                          }
                          const normalize = (entry) => {
                            if (typeof entry === "string") return { item: entry.trim(), price: null };
                            if (!entry || typeof entry !== "object") return { item: "", price: null };
                            const rawItem = entry.item ?? entry.name ?? entry.title;
                            const item = typeof rawItem === "string" ? rawItem : (rawItem?.name ?? rawItem?.item ?? "");
                            const rawPrice = entry.price ?? entry.amount ?? rawItem?.price;
                            const price = rawPrice === "" || rawPrice == null || !Number.isFinite(Number(rawPrice)) ? null : Number(rawPrice);
                            return { item: String(item || "").trim(), price };
                          };
                          const rows = (details || String(bazarDetailsEntry.items||"").split(",")).map(normalize).filter(row=>row.item);
                          return rows.map((entry,index)=><tr key={`${index}-${entry.item}`}><td>{entry.item}</td><td>{entry.price==null?"—":money(entry.price)}</td></tr>);
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
          <section className="panel inbox-panel">
            <div className="inbox-panel-heading">
              <span className="inbox-panel-mark"><MessageCircle size={23} /></span>
              <div><h3>Inbox</h3><p>Private messages between household members</p></div>
            </div>
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
                    <div className="inbox-message-list" aria-live="polite">
                      {selectedConversation.length ? selectedConversation.map((message) => (
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
                                <img src={message.attachment_url} alt={message.attachment_name} />
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
                            <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</time>
                            {message.sender_id === session.id && (
                              <span className={`inbox-message-status ${message.read_at ? "is-seen" : "is-sent"}`} title={message.read_at ? `Seen ${new Date(message.read_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}` : "Sent"}>
                                {message.read_at ? <CheckCheck size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                                {message.read_at ? "Seen" : "Sent"}
                              </span>
                            )}
                          </span>
                        </article>
                      )) : <p className="inbox-empty-thread">No messages yet. Send a message to start the conversation.</p>}
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
                                else setContactRows((rows) => rows.filter((row) => row.id !== contact.id));
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
        {bazarSuccessToast && (
          <div
            className="app-success-layer"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="app-success-popup">
              <span className="app-success-visual" aria-hidden="true">
                <span className="app-success-halo" />
                <svg viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="21" />
                  <path d="m14.5 24.5 6.1 6.2 13-14" />
                </svg>
              </span>
              <span className="app-success-copy">
                <small><i /> Action completed</small>
                <strong>{bazarSuccessToast}</strong>
                <span>Your latest changes are now up to date.</span>
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

        <footer>
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
createRoot(document.getElementById("root")).render(<App />);
