import React, { useEffect, useMemo, useState } from "react";
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
  ArrowUpRight,
  ArrowDownRight,
  Home,
  ChartNoAxesColumn,
  PieChart,
  Search,
  Download,
  CheckCircle2,
  Menu,
  X,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Bell,
  ImagePlus,
  Send,
  Utensils,
} from "lucide-react";
import "./style.css";
import { supabase, supabaseConfigured } from "./supabase";

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
};
const money = (n) =>
  "৳" + Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
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
function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bh-theme") || "light",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bh-theme", theme);
  }, [theme]);
  const [db, setDb] = useState(starter);
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
  const [page, setPage] = useState("overview"),
    [month, setMonth] = useState(new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })),
    [menu, setMenu] = useState(false);
  const monthChoices = (() => { const now = new Date(); return [-2,-1,0,1].map(offset => new Date(now.getFullYear(), now.getMonth()+offset, 1).toLocaleDateString("en-US", {month:"long",year:"numeric"})); })();
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
  });
  const [bazarRows, setBazarRows] = useState([{ item: "", price: "" }, { item: "", price: "" }, { item: "", price: "" }]);
  const [bazarDetailsEntry, setBazarDetailsEntry] = useState(null);
  const [bazarEditEntry, setBazarEditEntry] = useState(null);
  const [bazarSuccessToast, setBazarSuccessToast] = useState("");
  const [pendingBazarDelete, setPendingBazarDelete] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const updateBazarRow = (index, field, value) => {
    const next = bazarRows.map((row, i) => i === index ? { ...row, [field]: value } : row);
    setBazarRows(next);
    const filled = next.filter((row) => row.item.trim() && Number(row.price) > 0);
    setBazarForm((form) => ({ ...form, amount: String(filled.reduce((sum, row) => sum + Number(row.price), 0)), items: filled.map((row) => row.item.trim()).join(", ") }));
  };

  const [showAddCash, setShowAddCash] = useState(false);
  const [cashForm, setCashForm] = useState({
    id: null,
    date: todayForDateInput(),
    month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    amount: "",
    paidBy: "u1",
    note: "Cash contribution",
  });
  const [editId, setEditId] = useState(null),
    [bazarFilter, setBazarFilter] = useState("all"),
    [adminOpen, setAdminOpen] = useState(false);
  const [count, setCount] = useState(db.currentCount),
    [selected, setSelected] = useState(db.currentMembers);
  const [mealMemberDraft, setMealMemberDraft] = useState("1");
  const [mealActiveIds, setMealActiveIds] = useState([]);
  const [mealMemberSaving, setMealMemberSaving] = useState(false);
  const [mealMemberMessage, setMealMemberMessage] = useState("");
  const [notices, setNotices] = useState([]),
    [readNoticeIds, setReadNoticeIds] = useState([]),
    [noticeForm, setNoticeForm] = useState({ title: "", body: "" }),
    [noticeImage, setNoticeImage] = useState(null),
    [noticeBusy, setNoticeBusy] = useState(false),
    [noticeError, setNoticeError] = useState(""),
    [noticePanelOpen, setNoticePanelOpen] = useState(false),
    [noticeComposerOpen, setNoticeComposerOpen] = useState(false),
    [noticeModal, setNoticeModal] = useState(false),
    [noticeReadBusy, setNoticeReadBusy] = useState(false),
    [noticeDraftBusy, setNoticeDraftBusy] = useState(false);
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
  // Financial records are never persisted to browser storage. Supabase is the source of truth.
  useEffect(() => {
    if (session) sessionStorage.setItem("bh-user", JSON.stringify(session));
    else sessionStorage.removeItem("bh-user");
  }, [session]);
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
          const [cat, pay, baz, cash, meal, utilityList] = await Promise.all([
            supabase.from("expense_categories").select("name,amount,shared").eq("month_id", past.id),
            supabase.from("rent_payments").select("user_id,amount,note").eq("month_id", past.id),
            supabase.from("bazar_entries").select("amount,paid_by,paid_from_cash").eq("month_id", past.id),
            supabase.from("cash_contributions").select("amount,paid_by").eq("month_id", past.id),
            supabase.from("app_settings").select("value").eq("key", `meal_active_members_${past.label}`).maybeSingle(),
            supabase.from("app_settings").select("value").eq("key", `shared_utilities_list_${past.label}`).maybeSingle(),
          ]);
          for (const result of [cat,pay,baz,cash,meal,utilityList]) if (result.error) throw result.error;
          let mealIds=[]; try { mealIds=JSON.parse(meal.data?.value || "[]"); } catch {}
          let utilityItems=null; try { utilityItems=JSON.parse(utilityList.data?.value || "null"); } catch {}
          const categories=cat.data || [];
          const utilities=Array.isArray(utilityItems) ? utilityItems : categories.filter(c=>String(c.name||"").toLowerCase()!=="bazar").map(c=>({name:c.name,amount:c.amount,shared:c.shared}));
          const sharedTotal=utilities.filter(c=>c.shared).reduce((sum,c)=>sum+Number(c.amount||0),0);
          const utilityShare=sharedTotal / Math.max(1, Number(utilityMemberCount||4));
          const bazarTotal=(baz.data||[]).reduce((sum,b)=>sum+Number(b.amount||0),0);
          for (const member of (db.users || [])) {
            const mealCost=Array.isArray(mealIds)&&mealIds.includes(member.id) ? Math.ceil(bazarTotal/Math.max(1,mealIds.length)) : 0;
            const payments=(pay.data||[]).filter(x=>x.user_id===member.id).reduce((sum,x)=>sum+Number(x.amount||0),0);
            const mealCredits=(baz.data||[]).filter(b=>!b.paid_from_cash&&b.paid_by===member.id).reduce((sum,b)=>sum+Number(b.amount||0),0);
            const cashCredits=(cash.data||[]).filter(c=>c.paid_by===member.id).reduce((sum,c)=>sum+Number(c.amount||0),0);
            balances[member.id] += Number(member.rent||0) + utilityShare + mealCost - payments - mealCredits - cashCredits;
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
  }, [session?.id, user?.id, user?.rent, month, utilityMemberCount, db.users]);
  // On refresh, the member profile arrives asynchronously from Supabase. Route members back to My Account once their role is loaded.
  useEffect(() => {
    if (session?.id && user?.role === "member" && page === "overview")
      setPage("my-account");
  }, [session?.id, user?.role, page]);
  const admin = user?.role === "admin";
  const activeUsers = db.users.filter((u) => u.active && u.role === "member");
  const allActiveUsers = db.users.filter((u) => u.active);
  const currentUsers = db.users.filter(
    (u) => selected.includes(u.id) && u.active && u.role === "member",
  );
  const monthBazar = (db.bazars || []).filter((b) => b.month === month);
  const bazarTotal = monthBazar.reduce((s, b) => s + Number(b.amount || 0), 0);
  // Utilities are admin-configured expenses; bazar is tracked separately as meal cost.
  const utilityCategories = db.categories.filter(
    (c) => c.name.toLowerCase() !== "bazar",
  );
  const utilitiesTotal = utilityCategories.reduce(
    (s, c) => s + Number(c.amount || 0),
    0,
  );
  const utilitiesPerMember = utilityMemberCount > 0 ? utilitiesTotal / utilityMemberCount : 0;
  const bazarMemberCount = mealActiveIds.length;
  const individualMealCost = bazarMemberCount > 0 ? Math.ceil(bazarTotal / bazarMemberCount) : 0;
  const sharedTotal =
    db.categories
      .filter((c) => c.shared && c.name.toLowerCase() !== "bazar")
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
      .reduce((s, c) => s + Number(c.amount || 0), 0);
  const expensesPaidTotal =
    monthBazar.reduce((s, b) => s + Number(b.amount || 0), 0) +
    (db.contributions || [])
      .filter((c) => c.month === month)
      .reduce((s, c) => s + Number(c.amount || 0), 0);
  const perMember = selected.length ? sharedTotal / selected.length : 0;
  const ownRent = Number(user?.rent || 0);
  const ownPayments =
    (db.payments || [])
      .filter((p) => p.userId === user?.id && p.month === month)
      .reduce((s, p) => s + Number(p.amount), 0) + memberCredits(user?.id);
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
    const { data, error } = await supabase
      .from("notices")
      .select("id,title,body,image_url,created_at,created_by,status")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    const rows = data || [];
    let role = db.users.find((u) => u.id === profileId)?.role;
    if (profileId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", profileId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role) role = profile.role;
    }
    const visibleRows = role === "admin" ? rows : rows.filter((n) => n.status === "published");
    setNotices(visibleRows);
    if (profileId) {
      const { data: reads, error: readError } = await supabase
        .from("notice_reads")
        .select("notice_id")
        .eq("user_id", profileId);
      if (readError) throw readError;
      const readIds = (reads || []).map((r) => r.notice_id);
      setReadNoticeIds(readIds);
      if (
        showForUser &&
        role === "member" &&
        visibleRows.some((n) => !readIds.includes(n.id))
      )
        setNoticeModal(true);
    } else setReadNoticeIds([]);
    return visibleRows;
  }
  async function markAllNoticesRead(profileId = session?.id) {
    if (!profileId || !supabase || noticeReadBusy) return;
    setNoticeReadBusy(true);
    try {
      const unread = notices.filter((n) => !readNoticeIds.includes(n.id));
      if (unread.length) {
        const payload = unread.map((n) => ({
          user_id: profileId,
          notice_id: n.id,
          read_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("notice_reads")
          .upsert(payload, { onConflict: "user_id,notice_id" });
        if (error) throw error;
      }
      setReadNoticeIds((ids) =>
        Array.from(new Set([...ids, ...unread.map((n) => n.id)])),
      );
      setNoticePanelOpen(false);
      setNoticeModal(false);
    } catch (err) {
      alert(
        "Could not mark notifications as read. Run SUPABASE-NOTICE-READS-SETUP.sql in Supabase SQL Editor. Details: " +
          (err?.message || "Unknown error"),
      );
    } finally {
      setNoticeReadBusy(false);
    }
  }
  async function toggleNoticePanel() {
    setNoticePanelOpen((open) => !open);
  }
  function exportMyAccountPdf() {
    if (previousDueLoading) { alert("Previous months due is still loading. Please try again in a moment."); return; }
    const popup = window.open("", "_blank", "width=900,height=700");
    const popupBlocked = !popup;
    const reportDocument = popup
      ? popup.document
      : document.implementation.createHTMLDocument("My Monthly Hisab");
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
    const rows = utilityCategories.filter((category) => category.shared).map((category) => `<tr><td><span class="utility-mark" aria-hidden="true">⌁</span>${escapeHtml(category.name)}</td><td>${money(category.amount)}</td><td>${money(utilityMemberCount > 0 ? Math.ceil(Number(category.amount || 0) / utilityMemberCount) : 0)}</td></tr>`).join("");
    const mealCost = mealActiveIds.includes(user.id) ? individualMealCost : 0;
    const pastDue = previousDueByUser[user.id] ?? previousDue;
    const currentDue = Math.ceil(ownDue);
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
      *{box-sizing:border-box}body{margin:0;padding:40px 32px;background:#fcf9f4;color:#142238;font:400 16px/1.55 Inter,"Aptos","Segoe UI",Arial,sans-serif;letter-spacing:-.01em;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;background-image:radial-gradient(ellipse at 92% 0%,rgba(211,232,216,.55),transparent 34%),radial-gradient(ellipse at 0% 0%,rgba(248,233,218,.5),transparent 32%)}
      .sheet{max-width:960px;margin:0 auto}.heading{display:flex;align-items:center;gap:20px;margin-bottom:26px}.brand-icon{width:78px;height:78px;display:grid;place-items:center;flex:none;border-radius:22px;background:#e8f3e3;color:#087343}.brand-icon svg{width:42px;height:42px}.divider{height:68px;width:1px;background:#b9b8b2}.heading h1{font:650 clamp(30px,5vw,44px)/1.08 Inter,"Aptos","Segoe UI",Arial,sans-serif;letter-spacing:-.045em;margin:0 0 5px;color:#101e34}.heading p{margin:0;color:#586779;font-size:20px;font-weight:450;letter-spacing:-.025em}
      .print{display:inline-flex;align-items:center;gap:10px;margin:2px 0 26px;padding:13px 22px;border:0;border-radius:14px;background:linear-gradient(135deg,#087547,#005d3a);color:white;font-size:16px;font-weight:650;box-shadow:0 6px 13px rgba(0,91,55,.2);cursor:pointer}.print svg{width:20px;height:20px}
      .cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:44px}.card{position:relative;display:flex;align-items:center;gap:18px;min-height:110px;padding:20px 24px;overflow:hidden;border:1px solid #e2ddd5;border-radius:19px;background:rgba(255,255,255,.48);box-shadow:0 7px 17px rgba(42,48,41,.055)}.card:after{position:absolute;content:"";height:4px;left:14px;right:14px;bottom:0;border-radius:4px;background:linear-gradient(90deg,#9fdcb4,#5dc68c,#9fdcb4)}.card-icon{width:56px;height:56px;display:grid;place-items:center;flex:none;border-radius:16px;background:#e7f2e1;color:#087343}.card-icon svg{width:31px;height:31px}.label{color:#536174;font-size:15px;font-weight:500;letter-spacing:-.015em}.value{margin-top:3px;color:#101e34;font:650 30px/1.2 Inter,"Aptos","Segoe UI",Arial,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.045em}
      .section-title{display:flex;align-items:center;gap:15px;margin:0 0 20px}.section-title:before{content:"";width:6px;height:42px;border-radius:6px;background:#087547}.section-title h2{margin:0;color:#101e34;font:650 32px/1.1 Inter,"Aptos","Segoe UI",Arial,sans-serif;letter-spacing:-.04em}
      .table-wrap{overflow:hidden;border:1px solid #e0dbd2;border-radius:17px;background:rgba(255,255,255,.48);box-shadow:0 6px 16px rgba(42,48,41,.05)}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:13px 20px;text-align:left;border-bottom:1px solid #dedbd4}th{background:linear-gradient(90deg,#edf2e8,#e5eee1);font-size:14px;font-weight:650;letter-spacing:.015em;color:#172236}td{font-size:15px;font-weight:450}tbody tr:last-child td{border-bottom:0}td:first-child{width:52%;font-weight:550}.utility-mark{display:inline-grid;place-items:center;width:34px;height:30px;margin-right:13px;border-radius:10px;background:#eaf3e3;color:#087343;font-size:22px;font-weight:700}
      .note{display:flex;align-items:center;gap:13px;margin:30px 0 0;padding:16px 21px;border-radius:16px;background:#edf2e8;color:#46576a;font-size:16px;font-style:italic}.note-icon{width:25px;height:25px;display:grid;place-items:center;flex:none;border:2px solid #087343;border-radius:50%;color:#087343;font:700 16px Georgia,serif;font-style:normal}
      @page{size:A4;margin:13mm}@media(max-width:620px){body{padding:24px 16px}.brand-icon{width:58px;height:58px;border-radius:17px}.brand-icon svg{width:34px;height:34px}.heading{gap:13px}.divider{height:54px}.heading p{font-size:16px}.cards{gap:10px}.card{min-height:96px;padding:14px 12px;gap:10px;border-radius:15px}.card-icon{width:42px;height:42px;border-radius:12px}.card-icon svg{width:25px;height:25px}.label{font-size:13px}.value{font-size:24px}.section-title h2{font-size:27px}th,td{padding:11px 9px;font-size:13px}.utility-mark{width:27px;margin-right:7px}.note{font-size:14px}}
      @media print{body{padding:0;background:#fcf9f4!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print{display:none}.sheet{max-width:none}.cards{gap:12px;margin-bottom:32px}.card{min-height:96px;padding:15px 18px;break-inside:avoid}.section-title{break-after:avoid}.table-wrap{break-inside:avoid}.note{break-inside:avoid}}
      </style></head><body><main class="sheet"><header class="heading"><span class="brand-icon">${icons.home}</span><span class="divider"></span><div><h1>My Monthly Hisab</h1><p>${escapeHtml(month)} · ${escapeHtml(user.name)}</p></div></header>${popupBlocked ? '<button class="print" onclick="window.history.back()">Back to app</button>' : ''}<button class="print" onclick="window.print()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v3h14v-3"/></svg>Save as PDF / Print</button><section class="cards"><article class="card"><span class="card-icon">${icons.home}</span><div><div class="label">Total rent</div><div class="value">${money(ownTotalRent)}</div></div></article><article class="card"><span class="card-icon">${icons.meal}</span><div><div class="label">Individual meal cost</div><div class="value">${money(mealCost)}</div></div></article><article class="card"><span class="card-icon">${icons.paid}</span><div><div class="label">Paid</div><div class="value">${money(ownPayments)}</div></div></article><article class="card"><span class="card-icon">${icons.due}</span><div><div class="label">Current month due</div><div class="value">${money(currentDue)}</div></div></article><article class="card"><span class="card-icon">${icons.due}</span><div><div class="label">Previous months due</div><div class="value">${money(pastDue)}</div></div></article><article class="card"><span class="card-icon">${icons.total}</span><div><div class="label">Total due</div><div class="value">${money(totalDue)}</div></div></article></section><section><div class="section-title"><h2>Utilities breakdown</h2></div><div class="table-wrap"><table><thead><tr><th>Utility</th><th>Total</th><th>Your share</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No utilities</td></tr>'}</tbody></table></div></section><aside class="note"><span class="note-icon">i</span><span>Individual meal cost = total bazar divided by ${bazarMemberCount} meal members.</span></aside></main><script>window.onafterprint=()=>${popupBlocked ? "window.history.back()" : "window.close()"};</script></body></html>`);
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
  async function saveUtilityPaidStatus(utilityName, isPaid) {
    if (!admin || utilityPaidSaving) return;
    const previousStatus = utilityPaidStatus;
    const nextStatus = { ...previousStatus, [utilityName]: isPaid };
    setUtilityPaidStatus(nextStatus);
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

  async function loadCloudData(profileId, label = month) {
    if (!supabaseConfigured) return;
    setCloudBusy(true);
    try {
      const { data: profiles, error: pe } = await supabase
        .from("profiles")
        .select("id,full_name,username,role,active,rent,photo_url")
        .order("full_name");
      if (pe) throw pe;
      const activeProfile = (profiles || []).find(
        (p) => p.id === profileId && p.active,
      );
      if (!activeProfile)
        throw new Error("Your profile is inactive or unavailable.");
      // Restore the signed-in member's persisted photo whenever cloud profile data loads.
      setProfilePhoto(activeProfile.photo_url || "");
      const { data: lastLoginRows, error: lastLoginError } = await supabase
        .from("profiles")
        .select("id,last_login_at");
      if (lastLoginError) {
        console.warn(
          "Last-login tracking is unavailable. Run supabase/migrations/20261102_member_last_login.sql:",
          lastLoginError.message,
        );
      }
      const lastLoginById = new Map(
        (lastLoginRows || []).map((profile) => [
          profile.id,
          profile.last_login_at,
        ]),
      );
      const monthRow = await ensureCloudMonth(label);
      if (!monthRow) throw new Error("Could not load monthly setup.");
      const { data: mealSetting, error: mealSettingError } = await supabase
        .from("app_settings").select("value").eq("key", `meal_active_members_${label}`).maybeSingle();
      if (mealSettingError) throw mealSettingError;
      let savedMealIds = [];
      try { savedMealIds = JSON.parse(mealSetting?.value || "[]"); } catch { savedMealIds = []; }
      if (Array.isArray(savedMealIds)) setMealActiveIds(savedMealIds);
      const { data: utilityCountSetting, error: utilityCountError } = await supabase.from("app_settings").select("value").eq("key", "utilities_current_users").maybeSingle();
      if (utilityCountError) throw utilityCountError;
      const savedUtilityCount = Number(utilityCountSetting?.value || 4);
      if (Number.isFinite(savedUtilityCount) && savedUtilityCount > 0) { setUtilityMemberCount(savedUtilityCount); setUtilityMemberCountInput(String(savedUtilityCount)); }
      const [catsRes, payRes, bazRes, cashRes, utilityPaidResult] = await Promise.all([
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
          .from("app_settings")
          .select("value")
          .eq("key", `utility_paid_status_${label}`)
          .maybeSingle(),
      ]);
      for (const r of [catsRes, payRes, bazRes, cashRes, utilityPaidResult])
        if (r.error) throw r.error;
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
        lastLoginAt: lastLoginById.get(p.id) || null,
        paid: 0,
      }));
      const { data: sharedUtilitySetting, error: sharedUtilityError } = await supabase
        .from("app_settings").select("value").eq("key", "shared_utilities_list").maybeSingle();
      if (sharedUtilityError) throw sharedUtilityError;
      const { data: monthUtilitySetting, error: monthUtilityError } = await supabase
        .from("app_settings").select("value").eq("key", `shared_utilities_list_${label}`).maybeSingle();
      if (monthUtilityError) throw monthUtilityError;
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
      setMonth(label);
      setCount(Number(monthRow.current_count || 0));
      setSelected(monthRow.current_members || []);
      setCloudMonthId(monthRow.id);
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
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name,username,role,active,rent,photo_url")
        .eq("id", data.user.id)
        .single();
      if (profileError)
        throw new Error(`Could not load your profile: ${profileError.message}`);
      if (!profile || !profile.active)
        throw new Error("Your profile is inactive. Contact the admin.");
      const mapped = {
        id: profile.id,
        name: profile.full_name,
        username: profile.username,
        role: profile.role,
        active: profile.active,
        rent: Number(profile.rent || 0),
        paid: 0,
      };
      setSession({ id: mapped.id });
      await loadCloudData(mapped.id, month);
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

  async function addCategory(e) {
    e.preventDefault();
    if (!admin || !expenseForm.name || Number(expenseForm.amount) < 0) return;
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
  function askConfirm(message, title = "Are you sure?") {
    return new Promise((resolve) => setConfirmDialog({ message, title, resolve }));
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
      const paidFromCash = admin && bazarForm.paidBy === "cash-in-hand";
      const paidBy = paidFromCash ? user.id : admin ? bazarForm.paidBy : user.id;
      if (!paidBy || !allActiveUsers.some((u) => u.id === paidBy && u.active)) {
        throw new Error("Please select an active user in Paid by.");
      }
      if (paidFromCash) {
        const cashBalance = (db.contributions || [])
          .filter((c) => c.month === month)
          .reduce((sum, c) => sum + Number(c.amount || 0), 0) -
          (db.bazars || [])
            .filter((b) => b.month === month && b.paidFromCash)
            .reduce((sum, b) => sum + Number(b.amount || 0), 0);
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
      await loadCloudData(user.id, month);
      setBazarRows([{ item: "", price: "" }, { item: "", price: "" }, { item: "", price: "" }]);
      setBazarForm((f) => ({
        ...f,
        amount: "",
        items: "",
        date: todayForDateInput(),
        paidBy: f.paidBy || user.id,
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
    setBazarEditEntry({ ...b, editDate: String(b.date || ""), editItems: items, editPaidBy: String(b.paidBy || b.paid_by || "") });
  }

  async function saveBazarEdit() {
    if (!bazarEditEntry) return;
    const rows = (bazarEditEntry.editItems || []).map((row) => ({ item: String(row.item || "").trim(), price: Number(row.price) || 0 })).filter((row) => row.item && row.price > 0);
    const amount = rows.reduce((sum, row) => sum + row.price, 0);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(bazarEditEntry.editDate || "")) || !rows.length) { alert("Enter a valid date and at least one item with a price."); return; }
    try {
      const update = { entry_date: bazarEditEntry.editDate, amount, items: JSON.stringify(rows), updated_at: new Date().toISOString() };
      if (admin) update.paid_by = bazarEditEntry.editPaidBy.trim();
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
      !(await askConfirm(`Are you sure you want to reset ${month}? This will clear its bazar entries, cash contributions, payments and expense amounts. This cannot be undone.`, "Reset month?"))
    )
      return;
    try {
      const mid = await monthIdFor();
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
      await loadNotices(false); setNoticeForm({ title: "", body: "" }); setNoticeImage(null); setNoticeComposerOpen(false);
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
      const { error } = await supabase.from("notices").insert({ title: noticeForm.title.trim() || "Notice", body: noticeForm.body.trim(), image_url: imageUrl, created_by: user.id, status: "published" });
      if (error) throw error;
      await loadNotices(false); setNoticeForm({ title: "", body: "" }); setNoticeImage(null); setNoticeComposerOpen(false);
      const fileInput = document.getElementById("notice-image-input"); if (fileInput) fileInput.value = "";
      setBazarSuccessToast("Notice published successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600);
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
      const { error } = await supabase.from("notices").insert({
        title: n.title || "Notice",
        body: n.body || "",
        image_url: n.image_url || null,
        created_by: user.id,
        status: "published",
      });
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
        paymentDefaults.map((d) => ({
          ...d,
          ...(saved.find((x) => x.provider === d.provider) || {}),
        })),
      );
      setPaymentOptionsError("");
    } catch (e) {
      setPaymentOptionsError(
        "Payment options database is not set up yet. Run PAYMENT-OPTIONS-SETUP.sql in Supabase SQL Editor.",
      );
      console.warn("Could not load payment options:", e.message);
    }
  }
  async function savePaymentOptions(e) {
    e.preventDefault();
    if (!admin) return;
    setPaymentOptionsBusy(true);
    setPaymentOptionsError("");
    try {
      const payload = paymentOptions.map((o, i) => ({
        provider: o.provider,
        label: o.label,
        account_name: o.account_name.trim(),
        account_number: o.account_number.trim(),
        instructions: o.instructions.trim(),
        enabled: !!o.enabled,
        logo_url: o.logo_url || "",
        sort_order: i,
        updated_by: user.id,
      }));
      const { error } = await supabase
        .from("payment_options")
        .upsert(payload, { onConflict: "provider" });
      if (error) throw error;
      await loadPaymentOptions();
      alert(
        "Payment options saved. All members can now see the updated details.",
      );
    } catch (e) {
      setPaymentOptionsError(
        e.message ||
          "Could not save payment options. Run PAYMENT-OPTIONS-SETUP.sql first.",
      );
    } finally {
      setPaymentOptionsBusy(false);
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
  async function exportMemberLastMonthBill(member) {
    const reportWindow = window.open("", "_blank");
    const popupBlocked = !reportWindow;
    const reportDocument = reportWindow
      ? reportWindow.document
      : document.implementation.createHTMLDocument("Preparing monthly bill");
    if (reportWindow) {
      reportDocument.write(
        "<!doctype html><title>Preparing monthly bill</title><p style='font:16px sans-serif;padding:32px'>Preparing monthly bill…</p>",
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
        (utility) => utility.shared,
      );
      const utilitiesShare = sharedUtilitiesForReport.reduce(
        (sum, utility) =>
          sum + Number(utility.amount || 0) / utilityMemberCount,
        0,
      );
      const bazars = bazarsResult.data || [];
      const contributions = contributionsResult.data || [];
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
          *{box-sizing:border-box}
          @page{size:A4;margin:13mm}
          body{margin:0;padding:32px;color:#162a25;background:#fff;font:13px/1.5 "Segoe UI",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .sheet{max-width:920px;margin:0 auto}
          .toolbar{display:flex;justify-content:flex-end;margin-bottom:16px}
          .toolbar button{border:0;border-radius:9px;padding:10px 16px;background:#075d43;color:#fff;font-weight:650;cursor:pointer}
          .header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:20px 0 42px}
          .brand{display:flex;align-items:center;gap:14px}
          .brand-mark{display:grid;place-items:center;width:54px;height:54px;border-radius:17px;background:#e5f3eb;color:#075d43}
          .brand-mark svg{width:30px;height:30px}
          .brand-copy{border-left:1px solid #dfe8e2;padding-left:18px}
          h1{margin:0;color:#101820;font:700 32px/1.1 Georgia,serif;letter-spacing:-.7px}
          .brand-copy p{margin:5px 0 0;color:#44534f;font-size:15px}
          .member-tag{padding:10px 15px;border:1px solid #e6ebe7;border-radius:24px;color:#38443f;box-shadow:0 4px 14px #10271a0b;font-size:12px}
          .layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(270px,.95fr);align-items:start;gap:22px}
          .section-title{display:flex;align-items:center;gap:12px;margin:0 0 14px;font:700 25px Georgia,serif;color:#15251f}
          .section-title:before{content:"";width:4px;height:26px;border-radius:4px;background:#08734f}
          .utility-card,.summary-card,.total-card{border:1px solid #e8ece8;border-radius:17px;background:#fff;box-shadow:0 8px 22px #10271a0a;overflow:hidden}
          table{width:100%;border-collapse:collapse}
          th{padding:13px 15px;background:#f4f7f4;color:#596660;text-align:left;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
          td{padding:13px 15px;border-bottom:1px solid #edf0ed;color:#17221e}
          th:not(:first-child),td:not(:first-child){text-align:right}
          tbody tr:last-child td{border-bottom:0}
          .summary{display:grid;gap:10px}
          .total-card{padding:20px 22px;background:linear-gradient(145deg,#f7fbf8,#e8f4ec);border-color:#e1eee5}
          .total-card span{display:block;color:#63716b;font-size:13px}
          .total-card strong{display:block;margin-top:8px;color:#075d43;font:700 38px/1.1 Georgia,serif;letter-spacing:-.5px}
          .summary-card{padding:14px 16px}
          .line{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #edf0ed;color:#44514b;font-size:12px}
          .line strong{color:#17221e;font-variant-numeric:tabular-nums}
          .line.total{margin:4px -5px;padding:12px 8px;border:0;border-radius:9px;background:#edf6ef;color:#174e38;font-weight:700}
          .line.total strong{color:#075d43}
          .line:last-child{border-bottom:0}
          .line.due{margin:8px -6px -4px;padding:14px 11px;border:0;border-radius:11px;background:#075d43;color:#fff;font-weight:700}
          .line.due strong{color:#fff;font-size:17px}
          footer{display:flex;justify-content:space-between;gap:12px;margin-top:42px;padding-top:14px;border-top:1px solid #e8ece8;color:#68756f;font-size:10px}
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
  function exportPremiumPdf() {
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
   @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#18233b;font:12px/1.5 Inter,"Segoe UI",Arial,sans-serif;background:#f4f7fc;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{max-width:900px;margin:0 auto;background:white;min-height:100vh}.hero{padding:30px 32px 26px;color:#fff;background:linear-gradient(125deg,#283b91,#4f46e5 55%,#8b5cf6);position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;right:-45px;top:-100px;background:#ffffff20}.brand{font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:800;opacity:.85}.hero h1{font-size:29px;line-height:1.15;margin:10px 0 5px}.hero p{margin:0;color:#e4e9ff;font-size:13px}.hero .tag{display:inline-block;margin-top:17px;padding:5px 10px;border:1px solid #ffffff55;border-radius:99px;font-size:10px;font-weight:700}.content{padding:24px 30px 30px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}.stat{border:1px solid #e4e9f4;border-radius:12px;padding:13px;background:linear-gradient(145deg,#fff,#f7f8ff);border-top:3px solid #6366f1}.stat:nth-child(2){border-top-color:#8b5cf6}.stat:nth-child(3){border-top-color:#10b981}.stat:nth-child(4){border-top-color:#f59e0b}.stat span{display:block;color:#66728a;font-size:10px;margin-bottom:7px}.stat strong{font-size:17px;color:#17213a;letter-spacing:-.3px}.section{margin-top:21px;break-inside:avoid}.section h2{font-size:15px;margin:0 0 3px;color:#1e2b49}.section .sub{margin:0 0 10px;color:#77839a;font-size:10px}.section-title{display:flex;align-items:center;gap:9px}.section-title i{display:inline-block;width:4px;height:19px;border-radius:4px;background:linear-gradient(#6366f1,#a78bfa)}table{width:100%;border-collapse:collapse;font-size:10px}th{text-align:left;color:#fff;background:#27356f;padding:9px 8px;font-weight:700}td{padding:8px;border-bottom:1px solid #e8edf5;color:#27344d;vertical-align:top}tbody tr:nth-child(even){background:#f7f9fd}td small{display:block;color:#8a95a8;font-size:9px}.green{color:#059669;font-weight:700}.due{color:#d97706;font-weight:700}.empty{text-align:center;color:#8993a5;padding:14px}.footer{margin-top:26px;padding-top:12px;border-top:1px solid #e8edf5;display:flex;justify-content:space-between;color:#8b95a7;font-size:9px}.footer strong{color:#4f46e5}.printbar{display:flex;justify-content:flex-end;gap:8px;padding:12px 30px;background:#eef2ff}.printbar button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.printbtn{background:#4f46e5;color:#fff}.closebtn{background:#fff;color:#334155;border:1px solid #dbe2ef!important}@media print{body{background:white}.sheet{max-width:none}.printbar{display:none}.hero{padding:24px 28px}.content{padding:20px 28px}.section{break-inside:avoid}.stats{gap:8px}.stat{padding:10px}.stat strong{font-size:15px}}
   </style></head><body><div class="sheet"><div class="printbar"><button class="closebtn" onclick="${popupBlocked ? "window.history.back()" : "window.close()"}">${popupBlocked ? "Back to app" : "Close report"}</button><button class="printbtn" onclick="window.print()">Save as PDF / Print</button></div><header class="hero"><div class="brand">Monthly Hisab · Household finance</div><h1>Monthly Financial Report</h1><p>${esc(month)} · A clear snapshot of your shared home expenses</p><span class="tag">PREPARED BY RAHAT · ${esc(new Date().toLocaleDateString())}</span></header><main class="content"><div class="stats"><div class="stat"><span>Monthly bazar</span><strong>${money(bazarTotal)}</strong></div><div class="stat"><span>Total rent</span><strong>${money(totalRent)}</strong></div><div class="stat"><span>Rent paid</span><strong>${money(rentPaid)}</strong></div><div class="stat"><span>Cash contributions</span><strong>${money(cashTotal)}</strong></div></div><section class="section"><div class="section-title"><i></i><h2>Member balances</h2></div><p class="sub">Rent, shared expenses, recorded payments and estimated remaining due</p><table><thead><tr><th>Member</th><th>Rent</th><th>Individual meal</th><th>Rent paid</th><th>Meal paid</th><th>Due</th></tr></thead><tbody>${memberRows || tableEmpty}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Expense breakdown</h2></div><p class="sub">Expenses configured for ${esc(month)}</p><table><thead><tr><th>Expense</th><th>Type</th><th>Amount</th></tr></thead><tbody>${expenseRows || '<tr><td colspan="3" class="empty">No expenses configured</td></tr>'}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Monthly bazar history</h2></div><p class="sub">Recorded purchases for ${esc(month)} · total ${money(bazarTotal)}</p><table><thead><tr><th>Date</th><th>Items</th><th>Paid by</th><th>Amount</th></tr></thead><tbody>${bazarRows || '<tr><td colspan="4" class="empty">No bazar entries for this month</td></tr>'}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Member payment history</h2></div><p class="sub">Payments recorded by admin</p><table><thead><tr><th>Date</th><th>Member</th><th>Note</th><th>Amount</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="4" class="empty">No payments recorded for this month</td></tr>'}</tbody></table></section><div class="footer"><span>Designed &amp; developed by <strong>Rahat</strong> · Monthly Hisab</span><span>Private household report · ${esc(month)}</span></div></main></div><script>window.addEventListener('load',()=>{document.title='Monthly-Hisab-${esc(month).replace(/[^a-zA-Z0-9-]/g, "-")}-Report'});</script></body></html>`);
    const premiumReportStyles = reportDocument.createElement("style");
    premiumReportStyles.textContent = `
      @page{size:A4;margin:12mm}
      *{box-sizing:border-box}
      body{background:#f7f8f4;color:#17251f;font-family:"DM Sans","Segoe UI",Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
      .sheet{max-width:960px;background:#fffefa;border:1px solid #e7e9df;border-radius:18px;overflow:hidden;box-shadow:0 18px 55px rgba(27,52,38,.1)}
      .hero{padding:34px 38px 32px;background:linear-gradient(125deg,#075b40,#087a50 58%,#15946a);color:#fff}
      .hero:after{width:280px;height:280px;right:-60px;top:-130px;background:radial-gradient(circle,#ffffff22,transparent 68%)}
      .brand{font-size:10px;letter-spacing:2.2px;font-weight:700;color:#d4eee1}
      .hero h1{margin:15px 0 7px;font-size:34px;font-weight:700;letter-spacing:-1.15px}
      .hero p{font-size:14px;color:#e3f1e8}
      .hero .tag{margin-top:19px;border-color:#ffffff55;background:#ffffff12;font-size:9px;letter-spacing:.7px}
      .content{padding:28px 34px 30px}
      .stats{gap:12px;margin-bottom:26px}
      .stat{padding:16px;border:1px solid #e5e9df;border-top:3px solid #0b8154;border-radius:13px;background:linear-gradient(145deg,#fff,#f7faf5);box-shadow:0 5px 15px rgba(36,67,48,.045)}
      .stat:nth-child(2){border-top-color:#5c9b73}.stat:nth-child(3){border-top-color:#16825c}.stat:nth-child(4){border-top-color:#d39543}
      .stat span{color:#68776c;font-size:10px;text-transform:uppercase;letter-spacing:.55px}
      .stat strong{color:#13251c;font-size:18px;font-weight:700;letter-spacing:-.35px;font-variant-numeric:tabular-nums}
      .section{margin-top:24px}
      .section-title{gap:10px;margin-bottom:5px}
      .section-title i{width:4px;height:20px;background:#08764e}
      .section h2{color:#17291f;font-size:16px;font-weight:700;letter-spacing:-.2px}
      .section .sub{margin:3px 0 11px;color:#79867b;font-size:10px}
      table{border:1px solid #e4e9e1;border-radius:10px;overflow:hidden;font-size:9.5px}
      th{padding:10px 9px;background:#eaf1e9;color:#344b3b;font-size:9px;letter-spacing:.45px;text-transform:uppercase}
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
      @media print{body{background:#fffefa!important}.sheet{max-width:none;border:0;border-radius:0;box-shadow:none}.hero{padding:24px 28px}.content{padding:20px 24px}.section{break-inside:avoid}.stats{gap:8px}.stat{padding:11px}.stat strong{font-size:15px}.printbar{display:none}}
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
        </form>
        </div>
        <div className="login-footer-credit">Designed &amp; developed by <strong>Rahat</strong> · Monthly Hisab</div>
      </div>
    );
  const nav = [
    ...(admin ? [["overview", "Overview", LayoutDashboard]] : []),
    ["my-account", "My Account", Wallet],
    ["bazar", "Monthly Bazar", Receipt],
    ["contacts", "Contacts", Users],
    ...(!admin ? [["pay-rent", "Pay your rent", Wallet]] : []),
    ...(admin
      ? [
          ["admin-toggle", "Admin Management", Settings],
          ...(adminOpen
            ? [
                ["members", "Members", Users],
                ["expenses", "Utilities", Receipt],
                ["payments", "Payments & Cash", ArrowDownRight],
                ["payment-options", "Payment Options", Wallet],
                ["notices", "Notices", Bell],
                ["contact-management", "Contact Management", Users],
              ]
            : []),
        ]
      : []),
  ];
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">
            <Home size={20} />
          </div>
          <div>
            <b>MridhaBari 6B</b>
            <small>Ka/164, Kuratoli, Kuril, Vatara, Dhaka 1229</small>
          </div>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        {nav.map(([key, label, Icon]) => (
          <button
            key={key}
            className={
              "nav-item " +
              (page === key ? "active" : "") +
              ([
                "members",
                "expenses",
                "payments",
                "cash",
                "notices",
                "payment-options",
                "contact-management",
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
            {key === "admin-toggle" && (
              <span className="nav-chevron">{adminOpen ? "−" : "+"}</span>
            )}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="sidebar-account-row">
            <div className="sidebar-account-card">
              <button className="profile profile-trigger" type="button" onClick={() => { setProfileOpen(true); setProfileError(""); setProfileMessage(""); }}>
                {profilePhoto ? <img className="avatar profile-avatar-image" src={profilePhoto} alt="" /> : <div className="avatar">{user.name[0]}</div>}
                <span className="profile-trigger-info">
                  <b>{user.name}</b>
                  <small>{admin ? "Administrator" : "Member"}</small>
                </span>
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
                
                <button className="icon-btn" type="button" aria-label="Close profile settings" onClick={() => setProfileOpen(false)}><X size={18}/></button>
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
      <main className="main">
        <header className={page === "my-account" ? "account-header" : ""}>
          <button className="icon-btn menu-btn" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          {page !== "my-account" && (
            <div>
              <h2>{nav.find((x) => x[0] === page)?.[1] || "My Account"}</h2>
              <p>Manage your home, one month at a time.</p>
            </div>
          )}
          <div className="header-actions">
            <div className="notice-bell-wrap">
              <button
                className="icon-btn notice-bell"
                onClick={toggleNoticePanel}
                title="Notifications"
              >
                <Bell size={18} />
                {notices.filter((n) => !readNoticeIds.includes(n.id)).length >
                  0 && (
                  <span className="notice-badge">
                    {notices.filter((n) => !readNoticeIds.includes(n.id))
                      .length > 9
                      ? "9+"
                      : notices.filter((n) => !readNoticeIds.includes(n.id))
                          .length}
                  </span>
                )}
              </button>
              {noticePanelOpen && (
                <div className="notice-popover">
                  <div className="notice-popover-head">
                    <b>Notifications</b>
                    <div className="notice-popover-tools">
                      <button
                        className="read-all-btn"
                        onClick={() => markAllNoticesRead(user.id)}
                        disabled={noticeReadBusy}
                      >
                        {noticeReadBusy ? "Saving…" : "Read all notifications"}
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setNoticePanelOpen(false)}
                        aria-label="Close notifications"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  {notices.length ? (
                    notices.map((n) => (
                      <article
                        className={
                          "notice-mini " +
                          (readNoticeIds.includes(n.id)
                            ? "is-read"
                            : "is-unread")
                        }
                        key={n.id}
                      >
                        <div className="notice-mini-title">
                          <b>{n.title || "Notice"}</b>
                          {!readNoticeIds.includes(n.id) && (
                            <span className="unread-dot" title="Unread" />
                          )}
                        </div>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                        {n.body && <p>{n.body}</p>}
                        {n.image_url && (
                          <img src={n.image_url} alt="Notice attachment" />
                        )}
                      </article>
                    ))
                  ) : (
                    <p className="notice-empty">No notifications yet.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title="Toggle theme"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <select
              value={month}
              onChange={async (e) => {
                const v = e.target.value;
                setMonth(v);
                if (session?.id) await loadCloudData(session.id, v);
              }}
            >
              {monthChoices.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
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
                  <Trash2 size={16} /> Reset Hisab
                </button>
              </div>
            </section>
            <div className="stats">
              <Stat
                title="Meal cost"
                value={money(bazarTotal)}
                icon={Receipt}
                tone="blue"
                hint="Monthly bazar total"
              />
              <Stat
                title="Total Rent"
                value={money(totalRent + utilitiesTotal)}
                icon={Home}
                tone="purple"
                hint="Total rent for this month"
              />
              <Stat
                title="Rent paid"
                value={money(rentPaid)}
                icon={ArrowDownRight}
                tone="green"
                hint="This month"
              />
              <Stat
                title="Rent due"
                value={money(Math.max(0, totalRent + utilitiesTotal - rentPaid))}
                icon={Wallet}
                tone="orange"
                hint="Rent remaining"
              />
              <Stat
                title="Cash in hand"
                value={money(
                  (db.contributions || [])
                    .filter((c) => c.month === month)
                    .reduce((s, c) => s + Number(c.amount || 0), 0) -
                  (db.bazars || [])
                    .filter((b) => b.month === month && b.paidFromCash)
                    .reduce((s, b) => s + Number(b.amount || 0), 0),
                )}
                icon={Wallet}
                tone="purple"
                hint="Contributions less cash purchases"
              />
            </div>
            <div className="grid-two">
              <section className="panel">
                <PanelHead
                  title="Member balances"
                  sub="Rent includes room rent + utilities; meal cost is shared separately"
                />
                <div className="table-wrap">
                  <table>
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
                              <span className="avatar small">
                                {x.u.name[0]}
                              </span>
                              <b>{x.u.name}</b>
                            </div>
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
              <section className="panel">
                <PanelHead
                  title="Utilities breakdown"
                  sub="Utilities are shared among current members"
                />
                {utilityCategories.map((c) => (
                  <div className={`break-row utility-payment-row${utilityPaidStatus[c.name] ? " is-paid" : ""}`} key={c.id || c.name}>
                    <label className="utility-payment-check">
                      <input
                        type="checkbox"
                        checked={Boolean(utilityPaidStatus[c.name])}
                        disabled={utilityPaidSaving}
                        onChange={(event) => saveUtilityPaidStatus(c.name, event.target.checked)}
                      />
                      <span>{c.name}</span>
                    </label>
                    <b>
                      {money(
                        c.name.toLowerCase() === "bazar" && monthBazar.length
                          ? bazarTotal
                          : c.amount,
                      )}
                    </b>
                    <small>{utilityPaidStatus[c.name] ? "Paid" : "Unpaid"}</small>
                  </div>
                ))}
                <div className="total-row">
                  <b>Total utilities</b>
                  <b>{money(utilitiesTotal)}</b>
                </div>
                <div className="total-row light">
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
                <h1>Hello, {user.name}</h1>
                <p>Your room rent, utilities, and meal cost for {month}.</p>
              </div>
              <button className="btn secondary account-pdf-btn" type="button" onClick={exportMyAccountPdf}><Download size={16} /> Export PDF</button>
            </section>
            <div className="stats account-stats">
              <Stat
                title="Total rent"
                value={money(ownTotalRent)}
                icon={Home}
                tone="blue"
                hint={`Room rent + utilities share`}
              />
              <Stat
                title="Rent Paid"
                value={money(memberRentPaid(user.id))}
                icon={ArrowDownRight}
                tone="green"
                hint="Rent payment"
              />
              <Stat
                title="Meal Cost"
                value={money(mealActiveIds.includes(user.id) ? individualMealCost : 0)}
                icon={Utensils}
                tone="orange"
                hint={`${bazarMemberCount} members sharing bazar`}
              />
              <Stat
                title="Meal Paid"
                value={money(memberMealPaid(user.id))}
                icon={Utensils}
                tone="green"
                hint="Cash contributions and bazar credits"
              />
              <Stat
                title="Previous Due"
                value={previousDueLoading ? "Loading…" : money(previousDueByUser[user.id] ?? previousDue)}
                icon={Wallet}
                tone="orange"
                hint="Unpaid balance from past months"
              />
              <Stat
                title="Due"
                value={money(ownDue + (previousDueByUser[user.id] ?? previousDue))}
                icon={Wallet}
                tone="orange"
                hint={`${money(previousDueByUser[user.id] ?? previousDue)} + ${money(ownDue)}`}
              />
            </div>
            <section className="panel">
              <PanelHead title="Your monthly breakdown" sub={month} />
              {utilityCategories.filter((c) => c.shared).length > 0 ? (
                utilityCategories
                  .filter((c) => c.shared)
                  .map((c) => (
                    <div
                      className="break-row expense-detail-row"
                      key={c.id || c.name}
                    >
                      <span>
                        {c.name}
                        <small>Full expense: {money(c.amount)}</small>
                      </span>
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
                <span>Room rent</span>
                <div className="expense-share">
                  <small>Amount</small>
                  <b>{money(ownRent)}</b>
                </div>
              </div>
            </section>
            <section className="panel">
              <PanelHead
                title="Payment history"
                sub="Payments recorded by admin"
              />
              {db.payments
                .filter((p) => p.userId === user.id)
                .map((p) => (
                  <div className="break-row">
                    <span>
                      {p.date} · {p.note}
                    </span>
                    <b className="green-text">{money(p.amount)}</b>
                  </div>
                ))}
            </section>
          </>
        )}
        {page === "pay-rent" && user.role === "member" && (
          <section className="panel member-payment-options pay-rent-page">
            <PanelHead
              title="Pay your rent"
              sub="Use one of the payment methods configured by the admin"
            />
            {paymentOptions.filter((o) => o.enabled && o.account_number)
              .length ? (
              <div className="payment-method-grid">
                {paymentOptions
                  .filter((o) => o.enabled && o.account_number)
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
                      <button
                        className="secondary copy-payment"
                        type="button"
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
                        Copy
                      </button>
                    </article>
                  ))}
              </div>
            ) : (
              <p className="hint">
                Payment details will appear here once the admin configures them.
              </p>
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
                            title={`Download ${u.name} previous month bill`}
                            aria-label={`Download ${u.name} previous month bill`}
                            onClick={() => exportMemberLastMonthBill(u)}
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
                              className="icon-btn danger member-delete-action"
                              title="Deactivate"
                              onClick={() => removeUser(u.id)}
                            >
                              <Trash2 size={16} />
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
                  <button type="button" className="icon-btn member-modal-close" aria-label="Close member form" onClick={() => setShowMemberModal(false)}><X size={19} /></button>
                </header>
                <form className="member-modal-form" onSubmit={saveUser}>
                  <label>Full name<input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required /></label>
                  <label>User ID<input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required /></label>
                  {!editId && <label>Email address<input type="email" value={newUser.email || ""} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required /></label>}
                  <label>Password<input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder={editId ? "Leave blank to keep current password" : "Temporary password (min 6 characters)"} type="password" required={!editId} minLength={6} /></label>
                  <label>Room rent (৳)<input type="number" min="0" value={newUser.rent} onChange={(e) => setNewUser({ ...newUser, rent: e.target.value })} /></label>
                  <label>Role<select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}><option value="member">Member</option><option value="admin">Admin</option></select></label>
                  <div className="member-modal-actions">
                    <button type="button" className="secondary" onClick={() => { setShowMemberModal(false); setEditId(null); }}>Cancel</button>
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
            <section className="panel utilities-history-panel">
              <div className="utilities-history-head"><PanelHead title="Utilities list" sub={`${month} · ${utilityMemberCount} current users`} /><button type="button" className="primary" onClick={() => setShowAddUtility(true)}><Plus size={16}/> Add Utility</button></div>

              {utilityCategories.map((c, i) => (
                <div className="break-row">
                  <span>
                    {c.name}
                    <small>{c.shared ? "Shared equally" : "Not shared"}</small>
                  </span>
                  <b>{money(c.amount)}</b>
                  <button className="icon-btn secondary" type="button" aria-label={`Edit ${c.name}`} onClick={() => setUtilityEditModal({ originalName: c.name, name: c.name, amount: String(c.amount), shared: !!c.shared })}><Edit size={15} /></button>
                  <button
                    className="icon-btn danger"
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
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <div className="total-row">
                <b>Total utilities</b>
                <b>{money(utilitiesTotal)}</b>
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
              <button type="button" className="secondary full" onClick={() => setShowAddUtility(false)}>Close</button>
            </section>
          </div>
        )}
        {page === "payments" && admin && (
          <div className="grid-two payments-cash-grid">
            <section className="panel rent-payment-history-panel">
              <PanelHead title="Rent payment history" sub={month} />
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
              {db.payments
                .filter((p) => p.month === month)
                .map((p) => (
                  <div className="break-row" key={p.id}>
                    <span>
                      {db.users.find((u) => u.id === p.userId)?.name ||
                        "Member"}
                      <small>
                        {p.date} · {p.note}
                      </small>
                    </span>
                    <b className="green-text">{money(p.amount)}</b>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" title="Edit payment" aria-label="Edit payment" onClick={() => editPayment(p)}><Edit size={15} /></button>
                      <button type="button" className="icon-btn danger-text" title="Delete payment" aria-label="Delete payment" onClick={() => deletePayment(p)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
            </section>
            <section className="panel payments-cash-history-panel">
              <PanelHead
                title="Cash contribution history"
                sub={`${month} · deposits only`}
              />
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
              {(db.contributions || [])
                .filter((c) => c.month === month)
                .map((c) => (
                  <div className="break-row" key={c.id}>
                    <span>
                      {db.users.find((u) => u.id === c.paidBy)?.name ||
                        "Member"}
                      <small>
                        {c.date} · {c.note || "Cash contribution"}
                      </small>
                    </span>
                    <b className="green-text">{money(c.amount)}</b>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" title="Edit contribution" aria-label="Edit contribution" onClick={() => editCash(c)}><Edit size={15} /></button>
                      <button type="button" className="icon-btn danger-text" title="Delete contribution" aria-label="Delete contribution" onClick={() => deleteCash(c)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
            </section>
          </div>
        )}
        {showAddCash && page === "payments" && admin && (
          <div className="modal-backdrop cash-modal-backdrop" role="presentation">
            <section className="modal panel form-panel rent-payment-modal cash-contribution-modal" role="dialog" aria-modal="true" aria-label="Add cash contribution" onClick={(e) => e.stopPropagation()}>
              <div className="cash-modal-heading">
                <PanelHead title={cashForm.id ? "Edit cash contribution" : "Add cash contribution"} sub="Money given for future monthly bazar" />
                <button type="button" className="icon-btn" aria-label="Close" onClick={() => setShowAddCash(false)}>×</button>
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
                        {u.role === "admin" ? " (Admin)" : ""}
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
                <button type="button" className="icon-btn" aria-label="Close" onClick={() => setShowAddPayment(false)}>×</button>
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
                        {u.role === "admin" ? " (Admin)" : ""}
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
                <PanelHead title="Monthly bazar history" sub={`${month} · purchases only`} />
                <button type="button" className="primary" onClick={() => {
                  setBazarForm((form) => ({ ...form, date: todayForDateInput() }));
                  setShowAddBazar(true);
                }}><Plus size={16}/> Add Bazar</button>
              </div>
                <label className="history-filter">
                  Filter by member
                  <select
                    value={bazarFilter}
                    onChange={(e) => setBazarFilter(e.target.value)}
                  >
                    <option value="all">All members</option>
                    {allActiveUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {u.role === "admin" ? " (Admin)" : ""}
                      </option>
                    ))}
                    <option value="cash-in-hand">Cash in Hand</option>
                  </select>
                </label>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Paid by</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthBazar
                        .filter(
                          (b) =>
                            bazarFilter === "all" ||
                            (bazarFilter === "cash-in-hand" ? b.paidFromCash : !b.paidFromCash && b.paidBy === bazarFilter),
                        )
                        .map((b) => (
                          <tr key={b.id}>
                            <td>{b.date}</td>
                            <td>
                              {(() => {
                                const raw = b.items;
                                let entries = Array.isArray(raw) ? raw : null;
                                if (!entries && typeof raw === "string") {
                                  try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) entries = parsed; } catch {}
                                }
                                const getName = (entry) => {
                                  if (typeof entry === "string") return entry.trim();
                                  if (!entry || typeof entry !== "object") return "";
                                  const value = entry.item ?? entry.name ?? entry.title;
                                  return String(typeof value === "string" ? value : (value?.name ?? value?.item ?? "")).trim();
                                };
                                return entries ? entries.map(getName).filter(Boolean).join(", ") : String(raw || "");
                              })()}
                            </td>
                            <td>
                              {b.paidFromCash
                                ? "Cash in Hand"
                                : db.users.find((u) => u.id === b.paidBy)?.name || "Member"}
                            </td>
                            <td>{money(b.amount)}</td>
                            <td className="row-actions">
                              <button
                                className="icon-btn"
                                title="Details"
                                aria-label="View bazar details"
                                onClick={() => setBazarDetailsEntry(b)}
                              >
                                <Eye size={15} />
                              </button>
                              {(admin || (!b.paidFromCash && b.paidBy === user?.id)) && (
                                <>
                                  <button
                                    className="icon-btn"
                                    title="Edit"
                                    onClick={() => editBazar(b)}
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    className="icon-btn danger-text"
                                    title="Delete"
                                    onClick={() => deleteBazar(b)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="total-row">
                  <b>Total bazar purchased</b>
                  <b>{money(bazarTotal)}</b>
                </div>
              </section>
            </div>
            {showAddBazar && <div className="modal-backdrop" role="presentation"><div onClick={(e)=>e.stopPropagation()}>
              <section className="modal panel form-panel" role="dialog" aria-modal="true" aria-labelledby="add-bazar-title">
                <PanelHead
                  title="Add bazar"
                  sub="Date auto-fills today. Enter items and total paid."
                />
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
                    <input
                      type="date"
                      value={bazarForm.date}
                      onChange={(e) =>
                        setBazarForm({ ...bazarForm, date: e.target.value })
                      }
                      required
                    />
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
                        onChange={(e) => setBazarForm({ ...bazarForm, paidBy: e.target.value })}
                      >
                        {allActiveUsers.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role === "admin" ? " (Admin)" : ""}</option>)}
                        <option value="cash-in-hand">Cash in Hand</option>
                      </select>
                    ) : (
                      <input value={user.name} readOnly aria-readonly="true" />
                    )}
                  </label>
                  <p className="hint">
                    The person who paid gets this amount credited against their
                    shared expense.
                  </p>
                  <button className="primary full">
                    <Plus size={16} /> Save bazar
                  </button>
                </form>

              </section>
              <button type="button" className="secondary full" onClick={()=>setShowAddBazar(false)}>Close</button>
            </div></div>}
            {bazarEditEntry && (
              <div className="modal-backdrop" role="presentation">
                <section className="modal panel bazar-edit-modal" role="dialog" aria-modal="true" aria-labelledby="bazar-edit-title" onClick={(e) => e.stopPropagation()}>
                  <PanelHead title="Edit bazar entry" sub="Update date, items and prices" />
                  <div className="bazar-edit-fields">
                    <label>Date<input type="date" value={bazarEditEntry.editDate} onChange={(e) => setBazarEditEntry((old) => ({...old, editDate:e.target.value}))}/></label>
                    {bazarEditEntry.editItems.map((row, index) => (
                      <div className="bazar-edit-item-row" key={index}>
                        <label>Item {index + 1}<input value={row.item} placeholder={`Item ${index + 1}`} onChange={(e) => setBazarEditEntry((old) => ({...old, editItems:old.editItems.map((it,i)=>i===index?{...it,item:e.target.value}:it)}))}/></label>
                        <label>Price (৳)<input type="number" min="0" step="0.01" value={row.price} placeholder="0.00" onChange={(e) => setBazarEditEntry((old) => ({...old, editItems:old.editItems.map((it,i)=>i===index?{...it,price:e.target.value}:it)}))}/></label>
                        <button type="button" className="danger-text icon-btn" aria-label={`Remove item ${index+1}`} disabled={bazarEditEntry.editItems.length===1} onClick={() => setBazarEditEntry((old) => ({...old,editItems:old.editItems.filter((_,i)=>i!==index)}))}><Trash2 size={15}/></button>
                      </div>
                    ))}
                    <button type="button" className="secondary full" onClick={() => setBazarEditEntry((old) => ({...old,editItems:[...old.editItems,{item:"",price:""}]}))}>＋ Add item</button>
                    {admin && <label>Paid by<select value={bazarEditEntry.editPaidBy} onChange={(e) => setBazarEditEntry((old) => ({...old, editPaidBy:e.target.value}))}><option value="Cash in Hand">Cash in Hand</option>{(db.users || []).filter((member) => member.active !== false).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}
                    <div className="bazar-edit-total"><span>Total</span><strong>{money((bazarEditEntry.editItems||[]).reduce((sum,row)=>sum+(Number(row.price)||0),0))}</strong></div>
                  </div>
                  <div className="bazar-edit-actions">
                    <button type="button" className="secondary" onClick={() => setBazarEditEntry(null)}>Cancel</button>
                    <button type="button" className="primary" onClick={saveBazarEdit}>Save changes</button>
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
                  <div className="total-row"><b>Total</b><b>{money(bazarDetailsEntry.amount)}</b></div>
                  <button type="button" className="secondary full bazar-details-close" onClick={() => setBazarDetailsEntry(null)}>Close</button>
                </section>
              </div>
            )}
            {pendingBazarDelete && (
              <div className="modal-backdrop delete-confirm-backdrop">
                <section className="modal panel delete-confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  <div className="delete-confirm-icon delete-confirm-square">
                    <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 25.5 20 35 38 14"/></svg>
                  </div>
                  <h3>Delete bazar entry?</h3>
                  <p>This entry will be permanently removed. This action cannot be undone.</p>
                  <div className="delete-confirm-actions">
                    <button className="secondary" onClick={() => setPendingBazarDelete(null)}>Cancel</button>
                    <button className="danger" onClick={async () => { const entry=pendingBazarDelete; try { const {error}=await supabase.from("bazar_entries").delete().eq("id",entry.id); if(error) throw error; setPendingBazarDelete(null); await loadCloudData(user.id,month); setBazarSuccessToast("Bazar deleted successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600); } catch(e) { alert("Could not delete bazar: "+e.message); } }}>Delete entry</button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
        {confirmDialog && (
          <div className="modal-backdrop delete-confirm-backdrop">
            <section className="modal panel delete-confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="delete-confirm-icon"><Trash2 size={22}/></div>
              <h3>{confirmDialog.title}</h3>
              <p>{confirmDialog.message}</p>
              <div className="delete-confirm-actions">
                <button className="secondary close-red" onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}>Cancel</button>
                <button className="danger" onClick={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}>Confirm</button>
              </div>
            </section>
          </div>
        )}
        {page === "payment-options" && admin && (
          <div className="grid-two payment-options-admin">
            <section className="panel form-panel">
              <PanelHead
                title="Payment options"
                sub="Manage the account details shown to every member"
              />
              <form onSubmit={savePaymentOptions}>
                {paymentOptions.map((o, i) => (
                  <div className="payment-config-row" key={o.provider}>
                    <div className="payment-config-title">
                      <PaymentBrand
                        provider={o.provider}
                        logoUrl={o.logo_url}
                      />
                      <b>{o.label}</b>
                      <label className="check payment-enabled">
                        <input
                          type="checkbox"
                          checked={!!o.enabled}
                          onChange={(e) =>
                            setPaymentOptions((items) =>
                              items.map((x, j) =>
                                j === i
                                  ? { ...x, enabled: e.target.checked }
                                  : x,
                              ),
                            )
                          }
                        />{" "}
                        Show to members
                      </label>
                    </div>
                    <label>
                      Account / wallet number
                      <input
                        value={o.account_number}
                        onChange={(e) =>
                          setPaymentOptions((items) =>
                            items.map((x, j) =>
                              j === i
                                ? { ...x, account_number: e.target.value }
                                : x,
                            ),
                          )
                        }
                        placeholder={
                          o.provider === "brac_bank" ||
                          o.provider === "islami_bank"
                            ? "Bank account number"
                            : "Mobile banking number"
                        }
                      />
                    </label>
                    <label>
                      Account name (optional)
                      <input
                        value={o.account_name}
                        onChange={(e) =>
                          setPaymentOptions((items) =>
                            items.map((x, j) =>
                              j === i
                                ? { ...x, account_name: e.target.value }
                                : x,
                            ),
                          )
                        }
                        placeholder="Name on account"
                      />
                    </label>
                    <label>
                      Payment instruction
                      <input
                        value={o.instructions}
                        onChange={(e) =>
                          setPaymentOptions((items) =>
                            items.map((x, j) =>
                              j === i
                                ? { ...x, instructions: e.target.value }
                                : x,
                            ),
                          )
                        }
                        placeholder="e.g. Send Money / Account transfer"
                      />
                    </label>
                    <label>
                      Payment logo URL (optional)
                      <input
                        type="url"
                        value={o.logo_url || ""}
                        onChange={(e) =>
                          setPaymentOptions((items) =>
                            items.map((x, j) =>
                              j === i ? { ...x, logo_url: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="https://example.com/logo.png"
                      />
                    </label>
                    <label>
                      Or upload logo image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 500 * 1024) {
                            alert("Please choose a logo smaller than 500 KB.");
                            e.target.value = "";
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () =>
                            setPaymentOptions((items) =>
                              items.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      logo_url: String(reader.result || ""),
                                    }
                                  : x,
                              ),
                            );
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                ))}
                {paymentOptionsError && (
                  <div className="error">{paymentOptionsError}</div>
                )}
                <button className="primary full" disabled={paymentOptionsBusy}>
                  {paymentOptionsBusy ? "Saving…" : "Save payment options"}
                </button>
              </form>
            </section>
            <section className="panel">
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
            </section>
          </div>
        )}
        {page === "contacts" && (
          <section className="panel contacts-directory">
            <PanelHead title="Member Contacts" sub="Flatmate, caretaker, maid and emergency contacts" />
            {["Flatmate", "Caretaker", "Maid", "Emergency"].map(category => {
              const rows = contactRows.filter(c => c.category === category);
              return <section className="contact-section contact-category-card" key={category}>
                <div className="contact-category-heading"><span className="contact-category-icon"><Users size={17}/></span><h3>{category}</h3><small>{rows.length} {rows.length === 1 ? "contact" : "contacts"}</small></div>
                {rows.length ? rows.map(c => <div className="contact-person-card" key={c.id}><div className="contact-person-avatar"><Users size={16}/></div><div className="contact-person-info"><b>{c.name}</b><a href={"tel:" + c.phone}>{c.phone}</a></div><a className="contact-call-btn" href={"tel:" + c.phone}>Call</a></div>) : <p className="muted">No contacts added.</p>}
              </section>;
            })}
          </section>
        )}
        {page === "contact-management" && admin && (
          <div className="grid-two">
            <section className="panel form-panel">
              <PanelHead title="Contact Management" sub="Add or update contacts visible to all members" />
              <form onSubmit={async e => {
                e.preventDefault(); setContactBusy(true);
                const payload = { category: contactForm.category, name: contactForm.name.trim(), phone: contactForm.phone.trim() };
                const result = contactForm.id
                  ? await supabase.from("member_contacts").update(payload).eq("id", contactForm.id).select().single()
                  : await supabase.from("member_contacts").insert(payload).select().single();
                setContactBusy(false);
                if (result.error) { alert("Could not save contact: " + result.error.message); return; }
                setContactRows(rows => contactForm.id ? rows.map(r => r.id === contactForm.id ? result.data : r) : [...rows, result.data]);
                setContactForm({ id: "", category: "Flatmate", name: "", phone: "" });
              }}>
                <label>Section<select value={contactForm.category} onChange={e => setContactForm({...contactForm,category:e.target.value})}>{["Flatmate","Caretaker","Maid","Emergency"].map(x=><option key={x}>{x}</option>)}</select></label>
                <label>Name<input value={contactForm.name} onChange={e=>setContactForm({...contactForm,name:e.target.value})} required /></label>
                <label>Phone number<input type="tel" value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})} required /></label>
                <button className="primary" disabled={contactBusy}>{contactBusy ? "Saving…" : contactForm.id ? "Update contact" : "Add contact"}</button>
                {contactForm.id && <button type="button" className="secondary" onClick={()=>setContactForm({id:"",category:"Flatmate",name:"",phone:""})}>Cancel edit</button>}
              </form>
            </section>
            <section className="panel"><PanelHead title="Saved contacts" sub="Manage the contacts members can see" />
              {contactRows.map(c=><div className="break-row" key={c.id}><span><b>{c.name}</b><small>{c.category} · {c.phone}</small></span><div className="row-actions"><button className="icon-btn" onClick={()=>setContactForm({id:c.id,category:c.category,name:c.name,phone:c.phone})}><Edit size={15}/></button><button className="icon-btn danger-text" onClick={async()=>{if(!(await askConfirm(`Delete ${c.name || "this contact"}? This cannot be undone.`, "Delete contact?")))return;const {error}=await supabase.from("member_contacts").delete().eq("id",c.id);if(error)alert(error.message);else setContactRows(rows=>rows.filter(r=>r.id!==c.id));}}><Trash2 size={15}/></button></div></div>)}
            </section>
          </div>
        )}
        {page === "notices" && admin && (
          <div className="grid-two">
            <section className="panel form-panel">
              <PanelHead
                title="Direct Posting Notice"
                sub="Write a notice, save it as draft, or publish it to members"
              />
              <button
                type="button"
                className="secondary full notice-compose-toggle"
                onClick={() => setNoticeComposerOpen((open) => !open)}
                aria-expanded={noticeComposerOpen}
              >
                {noticeComposerOpen ? "Close notice composer" : "Compose notice"}
              </button>
              {noticeComposerOpen && <form onSubmit={postNotice}>
                <label>
                  Notice title
                  <input
                    value={noticeForm.title}
                    onChange={(e) =>
                      setNoticeForm({ ...noticeForm, title: e.target.value })
                    }
                    placeholder="e.g. Rent payment reminder"
                  />
                </label>
                <label>
                  Message
                  <textarea
                    rows="5"
                    value={noticeForm.body}
                    onChange={(e) =>
                      setNoticeForm({ ...noticeForm, body: e.target.value })
                    }
                    placeholder="Everyone must pay rent by the 10th..."
                  />
                </label>
                <label>
                  Photo (optional)
                  <input
                    id="notice-image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setNoticeImage(e.target.files?.[0] || null)
                    }
                  />
                </label>
                {noticeImage && (
                  <div className="notice-file-name">
                    Selected: {noticeImage.name}
                  </div>
                )}
                {noticeError && <div className="error">{noticeError}</div>}
                <div className="row-actions">
                  <button type="button" className="secondary" disabled={noticeDraftBusy || noticeBusy} onClick={saveNoticeDraft}>{noticeDraftBusy ? "Saving…" : "Save Notice"}</button>
                  <button className="primary" disabled={noticeBusy || noticeDraftBusy}><Send size={16} />{noticeBusy ? "Publishing…" : "Publish"}</button>
                </div>
              </form>}
            </section>
            <section className="panel">
              <PanelHead
                title="Saved Notices"
                sub="Drafts and published notices stay here until deleted"
              />
              {notices.length ? (
                notices.map((n) => (
                  <article className="notice-card" key={n.id}>
                    <div className="notice-card-top">
                      <div>
                        <h3>{n.title || "Notice"}</h3>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                      <div className="row-actions">
                        <small>{n.status === "draft" ? "Draft" : "Published"}</small>
                        {n.status !== "published" && <button className="secondary" onClick={() => publishSavedNotice(n)}>Publish</button>}{n.status === "published" && <button className="secondary" onClick={() => repostNotice(n)}>Repost</button>}
                        <button className="icon-btn danger" title="Delete notice" onClick={() => deleteNotice(n)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                    {n.body && <p>{n.body}</p>}
                    {n.image_url && <img src={n.image_url} alt="Notice" />}
                  </article>
                ))
              ) : (
                <p className="notice-empty">No notices posted yet.</p>
              )}
            </section>
          </div>
        )}
        {noticeModal &&
          user?.role === "member" &&
          notices.some((n) => !readNoticeIds.includes(n.id)) && (
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
                    className="icon-btn"
                    onClick={() => setNoticeModal(false)}
                    aria-label="Close notices"
                  >
                    <X />
                  </button>
                </div>
                <div className="notice-modal-list">
                  {notices
                    .filter((n) => !readNoticeIds.includes(n.id))
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
                    await markAllNoticesRead(user.id);
                    setNoticeModal(false);
                  }}
                >
                  Got it
                </button>
              </section>
            </div>
          )}
        {bazarSuccessToast && (
          <div className="bazar-success-toast" role="status" aria-live="polite">
            <span className="bazar-success-check" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7.5"/></svg>
            </span>
            <span>{bazarSuccessToast}</span>
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
                    <button type="button" className="secondary" onClick={() => setUtilityEditModal(null)}>Cancel</button>
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

<button type="button" className="secondary full" onClick={()=>setShowAddUtility(false)}>Close</button></div></div>}
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
function Stat({ title, value, icon: Icon, tone, hint }) {
  return (
    <div className="stat">
      <div className={"stat-icon " + tone}>
        <Icon size={19} />
      </div>
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
createRoot(document.getElementById("root")).render(<App />);
