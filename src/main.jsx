import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import "./style.css";
import "./inbox.css";
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
  const [page, setPage] = useState(() => {
    const validPages = new Set([
      "overview", "my-account", "bazar", "contacts", "pay-rent",
      "members", "expenses", "payments", "payment-options", "notices", "inbox",
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
    [noticeForm, setNoticeForm] = useState({ title: "", body: "" }),
    [noticeImage, setNoticeImage] = useState(null),
    [noticeBusy, setNoticeBusy] = useState(false),
    [noticeError, setNoticeError] = useState(""),
    [noticePanelOpen, setNoticePanelOpen] = useState(false),
    [noticeComposerOpen, setNoticeComposerOpen] = useState(false),
    [noticeModal, setNoticeModal] = useState(false),
    [noticeReadBusy, setNoticeReadBusy] = useState(false),
    [noticeDraftBusy, setNoticeDraftBusy] = useState(false),
    [inboxMessages, setInboxMessages] = useState([]),
    [inboxUnreadCount, setInboxUnreadCount] = useState(0),
    [inboxOnlineIds, setInboxOnlineIds] = useState([]),
    [inboxError, setInboxError] = useState(""),
    [selectedInboxMemberId, setSelectedInboxMemberId] = useState(""),
    [inboxDraft, setInboxDraft] = useState(""),
    [inboxAttachment, setInboxAttachment] = useState(null),
    [inboxBusy, setInboxBusy] = useState(false),
    [inboxMenuOpen, setInboxMenuOpen] = useState(false),
    [inboxMediaOpen, setInboxMediaOpen] = useState(false),
    [inboxMediaFiles, setInboxMediaFiles] = useState([]),
    [inboxMediaBusy, setInboxMediaBusy] = useState(false),
    [inboxDeleteBusy, setInboxDeleteBusy] = useState(false);
  const inboxAttachmentInputRef = useRef(null);
  const lastInboxActivityAtRef = useRef(0);
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
      return;
    }
    if (!inboxPeers.some((profile) => profile.id === selectedInboxMemberId)) {
      setSelectedInboxMemberId(inboxPeers[0].id);
    }
  }, [db.users, session?.id, selectedInboxMemberId]);
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
  const filteredMonthBazar = monthBazar.filter((b) =>
    bazarFilter === "all" ||
    (bazarFilter === "cash-in-hand" ? b.paidFromCash : !b.paidFromCash && b.paidBy === bazarFilter),
  );
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
        .select("notice_id,read_at")
        .eq("user_id", profileId);
      if (readError) throw readError;
      const readAtByNotice = new Map((reads || []).map((r) => [r.notice_id, Date.parse(r.read_at)]));
      const readIds = visibleRows
        .filter((notice) => (readAtByNotice.get(notice.id) || 0) >= Date.parse(notice.created_at))
        .map((notice) => notice.id);
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
  function exportMyAccountPdf(reportUser = user) {
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
    const rows = utilityCategories.filter((category) => category.shared).map((category) => `<tr><td><span class="utility-mark" aria-hidden="true">⌁</span>${escapeHtml(category.name)}</td><td>${money(category.amount)}</td><td>${money(utilityMemberCount > 0 ? Math.ceil(Number(category.amount || 0) / utilityMemberCount) : 0)}</td></tr>`).join("");
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
      *{box-sizing:border-box}body{margin:0;padding:40px 32px;background:#fcf9f4;color:#142238;font:400 16px/1.55 Inter,"Aptos","Segoe UI",Arial,sans-serif;letter-spacing:-.01em;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;background-image:radial-gradient(ellipse at 92% 0%,rgba(211,232,216,.55),transparent 34%),radial-gradient(ellipse at 0% 0%,rgba(248,233,218,.5),transparent 32%)}
      .sheet{max-width:960px;margin:0 auto}.heading{display:flex;align-items:center;gap:20px;margin-bottom:26px}.brand-icon{width:78px;height:78px;display:grid;place-items:center;flex:none;border-radius:22px;background:#e8f3e3;color:#087343}.brand-icon svg{width:42px;height:42px}.divider{height:68px;width:1px;background:#b9b8b2}.heading h1{font:650 clamp(30px,5vw,44px)/1.08 Inter,"Aptos","Segoe UI",Arial,sans-serif;letter-spacing:-.045em;margin:0 0 5px;color:#101e34}.heading p{margin:0;color:#586779;font-size:20px;font-weight:450;letter-spacing:-.025em}
      .print{display:inline-flex;align-items:center;gap:10px;margin:2px 0 26px;padding:13px 22px;border:0;border-radius:14px;background:linear-gradient(135deg,#087547,#005d3a);color:white;font-size:16px;font-weight:650;box-shadow:0 6px 13px rgba(0,91,55,.2);cursor:pointer}.print svg{width:20px;height:20px}
      .cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:44px}.card{position:relative;display:flex;align-items:center;gap:18px;min-height:110px;padding:20px 24px;overflow:hidden;border:1px solid #e2ddd5;border-radius:19px;background:rgba(255,255,255,.48);box-shadow:0 7px 17px rgba(42,48,41,.055)}.card:after{position:absolute;content:"";height:4px;left:14px;right:14px;bottom:0;border-radius:4px;background:linear-gradient(90deg,#9fdcb4,#5dc68c,#9fdcb4)}.card-icon{width:56px;height:56px;display:grid;place-items:center;flex:none;border-radius:16px;background:#e7f2e1;color:#087343}.card-icon svg{width:31px;height:31px}.label{color:#536174;font-size:15px;font-weight:500;letter-spacing:-.015em}.value{margin-top:3px;color:#101e34;font:650 30px/1.2 Inter,"Aptos","Segoe UI",Arial,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.045em}
      .section-title{display:flex;align-items:center;gap:15px;margin:0 0 20px}.section-title:before{content:"";width:6px;height:42px;border-radius:6px;background:#087547}.section-title h2{margin:0;color:#101e34;font:650 32px/1.1 Inter,"Aptos","Segoe UI",Arial,sans-serif;letter-spacing:-.04em}
      .table-wrap{overflow:hidden;border:1px solid #e0dbd2;border-radius:17px;background:rgba(255,255,255,.48);box-shadow:0 6px 16px rgba(42,48,41,.05)}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:13px 20px;text-align:left;border-bottom:1px solid #dedbd4}th{background:linear-gradient(90deg,#edf2e8,#e5eee1);font-size:14px;font-weight:650;letter-spacing:.015em;color:#172236}td{font-size:15px;font-weight:450}tbody tr:last-child td{border-bottom:0}td:first-child{width:52%;font-weight:550}.utility-mark{display:inline-grid;place-items:center;width:34px;height:30px;margin-right:13px;border-radius:10px;background:#eaf3e3;color:#087343;font-size:22px;font-weight:700}
      .note{display:flex;align-items:center;gap:13px;margin:30px 0 0;padding:16px 21px;border-radius:16px;background:#edf2e8;color:#46576a;font-size:16px;font-style:italic}.note-icon{width:25px;height:25px;display:grid;place-items:center;flex:none;border:2px solid #087343;border-radius:50%;color:#087343;font:700 16px Georgia,serif;font-style:normal}
      @page{size:A4;margin:13mm}@media(max-width:620px){body{padding:24px 16px}.brand-icon{width:58px;height:58px;border-radius:17px}.brand-icon svg{width:34px;height:34px}.heading{gap:13px}.divider{height:54px}.heading p{font-size:16px}.cards{gap:10px}.card{min-height:96px;padding:14px 12px;gap:10px;border-radius:15px}.card-icon{width:42px;height:42px;border-radius:12px}.card-icon svg{width:25px;height:25px}.label{font-size:13px}.value{font-size:24px}.section-title h2{font-size:27px}th,td{padding:11px 9px;font-size:13px}.utility-mark{width:27px;margin-right:7px}.note{font-size:14px}}
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
      const [
        { data: profiles, error: pe },
        monthRow,
        { data: mealSetting, error: mealSettingError },
        { data: utilityCountSetting, error: utilityCountError },
        { data: sharedUtilitySetting, error: sharedUtilityError },
        { data: monthUtilitySetting, error: monthUtilityError },
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
      ]);
      if (pe) throw pe;
      if (mealSettingError) throw mealSettingError;
      if (utilityCountError) throw utilityCountError;
      if (sharedUtilityError) throw sharedUtilityError;
      if (monthUtilityError) throw monthUtilityError;
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
      const [catsRes, payRes, bazRes, cashRes, utilityPaidResult, lastLoginResult] = await Promise.all([
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
        activeProfile.role === "admin"
          ? supabase.from("profiles").select("id,last_login_at")
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const r of [catsRes, payRes, bazRes, cashRes, utilityPaidResult])
        if (r.error) throw r.error;
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
    const generatedDate = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());
    const rentDueColor = rentUtilitiesDue < 0 ? "credit" : "positive";
    const mealDueColor = mealBalance < 0 ? "credit" : "positive";
    const escapeSvg = (value) => escapeHtml(value);
    const imageText = (x, y, value, options = {}) =>
      `<text x="${x}" y="${y}" fill="${options.fill || "#17231f"}" font-family="Arial, sans-serif" font-size="${options.size || 22}" font-weight="${options.weight || 400}" text-anchor="${options.anchor || "start"}">${escapeSvg(value)}</text>`;
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
      ${imageText(122, 64, "Monthly Hisab", { size: 25, weight: 700 })}
      ${imageText(122, 86, "Shared Home Expense Manager", { size: 15, fill: "#61716b" })}
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
      <rect x="76" y="995" width="642" height="48" rx="12" fill="url(#green)"/>
      ${imageText(96, 1026, "Final Balance Due", { size: 21, weight: 700, fill: "#fff" })}
      ${imageText(700, 1026, signedMoney(finalBalance), { size: 24, weight: 700, fill: "#fff", anchor: "end" })}
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
      ${imageText(600, 1255, `Generated by Monthly Hisab  ·  ${generatedDate}`, { size: 15, anchor: "middle", fill: "#69756f" })}
    </svg>`;
    const jpgFilename = `monthly-bill-${month}-${member.name}`
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    reportDocument.open();
    reportDocument.write(`<!doctype html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Monthly Bill · ${escapeHtml(month)} · ${escapeHtml(member.name)}</title>
      <style>
        *{box-sizing:border-box}
        @page{size:A4;margin:10mm}
        body{margin:0;padding:30px 32px;color:#17231f;background:#fff;font:14px/1.4 Arial,"Segoe UI",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .sheet{max-width:1120px;margin:0 auto;position:relative}
        .toolbar{display:flex;justify-content:flex-end;margin-bottom:12px}
        .toolbar button{border:0;border-radius:10px;padding:10px 16px;background:#087747;color:#fff;font-weight:700;cursor:pointer}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:42px}
        .brand{display:flex;align-items:center;gap:12px}
        .brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,#2dc774,#00633d);color:white;box-shadow:0 5px 12px #076b4230}
        .brand-mark svg{width:27px;height:27px}
        .brand-title{font:700 20px Georgia,serif;color:#111d1a}
        .brand-subtitle{margin-top:2px;color:#61716b;font-size:11px}
        .bill-pill{display:flex;align-items:center;gap:8px;padding:9px 15px;border:1px solid #e1eee5;border-radius:25px;background:#f6fbf7;color:#153c2c;font-weight:700;box-shadow:0 4px 12px #173a2510}
        .bill-pill svg{width:17px;height:17px;color:#087343}
        .headline{display:grid;grid-template-columns:1fr 218px;align-items:center;gap:22px;margin-bottom:24px}
        .title-block{border-left:5px solid #22bd61;padding:2px 0 2px 27px}
        h1{margin:0;color:#101a18;font:700 36px/1.1 Georgia,serif;letter-spacing:-.7px}
        .month{margin-top:5px;color:#57645f;font-size:19px}
        .member-card{display:flex;align-items:center;gap:14px;min-height:70px;padding:12px 18px;border:1px solid #e3efe5;border-radius:17px;background:#eff7ef}
        .member-icon{width:30px;height:30px;color:#087343;flex:none}
        .member-caption{font-size:12px;color:#495c53}
        .member-name{margin-top:2px;font-size:21px;font-weight:750;color:#111c19;overflow-wrap:anywhere}
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
        .stat-label{color:#45534d;font-size:13px}
        .stat-value{margin-top:2px;color:#111b19;font-size:25px;font-weight:750;letter-spacing:-.4px;font-variant-numeric:tabular-nums}
        .stat:nth-child(3) .stat-value{color:#aa3b30}
        .stat.final .stat-label,.stat.final .stat-value{color:white}
        .two-columns{display:grid;grid-template-columns:1fr 1fr;gap:17px;margin-bottom:18px}
        .panel{padding:13px 15px;border:1px solid #e0e6e2;border-radius:18px;background:#fff;box-shadow:0 5px 14px #112c1a0c}
        .panel-title{display:flex;align-items:center;gap:11px;padding-bottom:8px;margin-bottom:3px;border-bottom:1px solid #edf0ed;color:#15201d;font-size:18px;font-weight:750}
        .panel-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:13px;background:#e9f7e9;color:#087343}
        .panel-icon svg{width:26px;height:26px}
        .line{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;padding:8px 10px;border-bottom:1px solid #edf0ed;color:#25332e}
        .line strong{font-size:16px;color:#18231f;font-variant-numeric:tabular-nums}
        .line.paid{margin:2px -1px;padding:8px 11px;border:0;border-radius:10px;background:#f0f7ef;color:#21602e}
        .line.paid strong,.positive{color:#08732f!important}
        .line.due{border-bottom:0;font-weight:750}
        .line.due strong{font-weight:750}
        .credit{color:#08732f!important}
        .lower-grid{display:grid;grid-template-columns:1.45fr .85fr;gap:17px}
        .summary-panel,.payment-panel{min-height:226px}
        .summary-panel .line,.payment-panel .line{min-height:35px;padding:7px 10px}
        .line.highlight{margin:3px 0;border:0;border-radius:10px;background:#edf6ec;font-weight:750}
        .line.final-line{margin:5px 0 0;padding:11px 13px;border:0;border-radius:11px;background:linear-gradient(110deg,#15965b,#004d34);color:#fff;font-size:18px;font-weight:750}
        .line.final-line strong{color:#fff;font-size:22px}
        .amount-due{position:relative;display:flex;align-items:center;gap:12px;min-height:70px;margin-top:19px;padding:12px 170px 12px 18px;overflow:hidden;border-radius:17px;background:linear-gradient(100deg,#eff8ef,#e9f6ec);color:#075d2b}
        .amount-icon{display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:12px;background:#e0f4e3}
        .amount-icon svg{width:25px;height:25px}
        .amount-title{font-size:18px;font-weight:750}
        .amount-note{margin-top:3px;color:#263a30;font-size:12px}
        .house-art{position:absolute;right:13px;bottom:0;width:148px;height:91px}
        footer{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:24px;color:#69756f;font-size:11px}
        footer:before,footer:after{content:"";height:1px;flex:1;background:#dce4df}
        footer strong{color:#087343}
        @media(max-width:650px){body{padding:18px}.topbar{margin-bottom:28px}.headline{grid-template-columns:1fr;gap:13px}.member-card{max-width:none}.stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.stat{min-height:102px;padding:11px}.stat-value{font-size:21px}.two-columns,.lower-grid{grid-template-columns:1fr;gap:11px}.summary-panel,.payment-panel{min-height:0}.bill-pill{font-size:12px}h1{font-size:31px}.amount-due{padding-right:128px}.house-art{right:4px;width:116px;height:78px}.amount-title{font-size:16px}.amount-note{font-size:11px}}
        @media print{body{padding:0}.toolbar{display:none}.sheet{max-width:none}.topbar{margin-bottom:25px}.headline{margin-bottom:18px}.stats{gap:9px;margin-bottom:18px}.stat{min-height:100px;padding:11px}.two-columns{gap:12px;margin-bottom:12px}.panel{padding:10px 12px}.summary-panel,.payment-panel{min-height:0}.amount-due{margin-top:14px}footer{margin-top:16px}}
      </style></head><body lang="en"><main class="sheet">
        <div class="toolbar">${popupBlocked ? '<button onclick="window.history.back()">Back to app</button>' : ""}<button id="save-jpg" type="button" onclick="saveBillAsJpg()">Save as JPG</button><button onclick="window.print()">Save as PDF / Print</button></div>
        <header class="topbar">
          <div class="brand"><div class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></svg></div><div><div class="brand-title">Monthly Hisab</div><div class="brand-subtitle">Shared Home Expense Manager</div></div></div>
          <div class="bill-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7m-7 4h7"/></svg>Monthly Bill</div>
        </header>
        <div class="headline">
          <div class="title-block"><h1>Monthly Bill</h1><div class="month">${escapeHtml(month)}</div></div>
          <div class="member-card"><svg class="member-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><div><div class="member-caption">Member</div><div class="member-name">${escapeHtml(member.name)}</div></div></div>
        </div>
        <div class="stats">
          <article class="stat"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg></div><div class="stat-label">Total Bill</div><div class="stat-value">${money(currentCharges)}</div></article>
          <article class="stat"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-4 5h.01M7 3h10"/></svg></div><div class="stat-label">Total Paid</div><div class="stat-value">${money(totalPaid)}</div></article>
          <article class="stat"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/></svg></div><div class="stat-label">Previous Balance</div><div class="stat-value">${signedMoney(previousBalance)}</div></article>
          <article class="stat final"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5m-16 5v5c0 1.7 3.6 3 8 3m8-8v5c0 1.7-3.6 3-8 3m-8-3v4c0 1.7 3.6 3 8 3"/></svg></div><div class="stat-label">Final Due</div><div class="stat-value">${signedMoney(finalBalance)}</div></article>
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
          </section>
          <section class="panel payment-panel"><div class="panel-title"><span class="panel-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18m-4 5h.01"/></svg></span>Payment Breakdown</div>
            <div class="line"><span>Rent Paid</span><strong>${money(rentPaid)}</strong></div>
            <div class="line"><span>Meal Paid</span><strong>${money(mealPaid)}</strong></div>
            <div class="line highlight"><span>Total Paid</span><strong class="positive">${money(totalPaid)}</strong></div>
          </section>
        </div>
        <div class="amount-due"><span class="amount-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg></span><div><div class="amount-title">Amount Due: ${signedMoney(finalBalance)}</div><div class="amount-note">${finalBalance > 0 ? "Please clear the due amount at your earliest convenience." : "Your account has a credit balance."}</div></div><svg class="house-art" viewBox="0 0 160 100" fill="none" aria-hidden="true"><path d="M5 88c22-7 36-4 53 0 20 5 41 5 58-1 16-5 27-4 39 1v12H5V88Z" fill="#B9E8A6"/><path d="m31 62 34-31 34 31v31H31V62Z" fill="#FFF9E8" stroke="#14864D" stroke-width="5" stroke-linejoin="round"/><path d="m21 62 44-40 44 40-7 7-37-33-37 33-7-7Z" fill="#078C4A"/><path d="M84 34V18h13v28" fill="#168E4A" stroke="#087342" stroke-width="4" stroke-linejoin="round"/><path d="M53 67h23v26H53z" fill="#FFF1C9" stroke="#16884B" stroke-width="3"/><path d="M64.5 68v24M54 80h21" stroke="#E8A72E" stroke-width="2"/><path d="M16 87c-8-10-4-20 2-23 7 5 9 14 4 22m-8 0c-2-12 2-19 9-21m-4 21h14" stroke="#36A84C" stroke-width="4" stroke-linecap="round"/><path d="M125 88c-5-9-2-17 4-20 7 5 8 13 3 20m-7 0c-2-10 2-16 8-18m-6 18h16" stroke="#36A84C" stroke-width="4" stroke-linecap="round"/><circle cx="21" cy="80" r="7" fill="#84D66F"/><circle cx="133" cy="78" r="8" fill="#78CE64"/></svg></div>
        <footer>Generated by <strong>Monthly Hisab</strong> · ${escapeHtml(generatedDate)}</footer>
      </main><script>
        async function saveBillAsJpg() {
          const button = document.getElementById("save-jpg");
          button.disabled = true;
          button.textContent = "Creating JPG…";
          try {
            const image = new Image();
            image.src = URL.createObjectURL(new Blob([${JSON.stringify(billSvg)}], { type: "image/svg+xml;charset=utf-8" }));
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Could not prepare the image canvas.");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
            if (!blob) throw new Error("Could not convert the bill to JPG.");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = ${JSON.stringify(jpgFilename + ".jpg")};
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (error) {
            alert("Could not save the bill as JPG: " + error.message);
          } finally {
            button.disabled = false;
            button.textContent = "Save as JPG";
          }
        }
      </script></body></html>`);
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
          <img className="login-mobile-cottage" src="/login-cottage.png" alt="" />
          <div className="login-footer-credit">Designed &amp; developed by <strong>Rahat</strong> · Monthly Hisab</div>
        </form>
        </div>
      </div>
    );
  const nav = [
    ...(admin ? [["overview", "Overview", LayoutDashboard]] : []),
    ["my-account", "My Account", Wallet],
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
    <div className="app premium-theme">
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
            className="icon-btn mobile-close bazar-action"
            type="button"
            aria-label="Close navigation menu"
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
                  <small><span className="sidebar-role-dot" />{admin ? "Administrator" : "Member"}</small>
                </span>
                <ChevronRight className="sidebar-profile-chevron" size={16} aria-hidden="true" />
              </button>
              <button className="sidebar-logout-btn bazar-action" type="button" aria-label="Logout" title="Logout" onClick={(e) => { e.stopPropagation(); logout(); }}><LogOut size={18}/></button>
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
      <main className={page === "overview" ? "main overview-page" : page === "my-account" ? "main my-account-page" : page === "contacts" ? "main contacts-page" : page === "inbox" ? "main inbox-page" : page === "pay-rent" ? "main pay-rent-app-page" : page === "bazar" ? "main bazar-page" : "main"}>
        <header className={`${page === "my-account" ? "account-header " : ""}${page === "overview" ? "overview-page-header" : ""}`}>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label="Open navigation menu"
            onClick={() => setMenu(true)}
          >
            <Menu size={22} strokeWidth={2.25} />
          </button>
          {page !== "my-account" && (
            <div className={page === "overview" ? "overview-page-heading" : "app-page-heading"}>
              {page === "inbox" && <span className="inbox-page-mark"><MessageCircle size={23} /></span>}
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
                        className="icon-btn bazar-action"
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
                <div className="overview-panel-heading">
                  <span className="overview-panel-icon"><Zap size={20} /></span>
                  <PanelHead
                    title="Utilities breakdown"
                    sub="Utilities are shared among current members"
                  />
                </div>
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
            <section className="panel account-breakdown-panel">
              <div className="overview-panel-heading">
                <span className="overview-panel-icon"><Zap size={20} /></span>
                <PanelHead title="Your monthly breakdown" sub={month} />
              </div>
              {utilityCategories.filter((c) => c.shared).length > 0 ? (
                utilityCategories
                  .filter((c) => c.shared)
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
                              className="icon-btn danger member-delete-action bazar-action"
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
            <section className="panel utilities-history-panel">
              <div className="utilities-history-head">
                <PanelHead title="Utilities list" sub={`${month} · ${utilityMemberCount} current users`} />
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

              {utilityCategories.map((c, i) => (
                <div className="break-row">
                  <span>
                    {c.name}
                    <small>{c.shared ? "Shared equally" : "Not shared"}</small>
                  </span>
                  <b>{money(c.amount)}</b>
                  <button className="icon-btn secondary" type="button" aria-label={`Edit ${c.name}`} onClick={() => setUtilityEditModal({ originalName: c.name, name: c.name, amount: String(c.amount), shared: !!c.shared })}><Edit size={15} /></button>
                  <button
                    className="icon-btn danger bazar-action"
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
              <button type="button" className="secondary full bazar-action" onClick={() => setShowAddUtility(false)}>Close</button>
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
              {db.payments.filter((p) => p.month === month).length === 0 && (
                <div className="payments-empty-state" role="status">
                  <strong>No rent payments yet</strong>
                  <span>Payments for {month} will appear here.</span>
                </div>
              )}
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
                      <button type="button" className="icon-btn danger-text bazar-action" title="Delete payment" aria-label="Delete payment" onClick={() => deletePayment(p)}><Trash2 size={15} /></button>
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
              {(db.contributions || []).filter((c) => c.month === month).length === 0 && (
                <div className="payments-empty-state" role="status">
                  <strong>No cash contributions yet</strong>
                  <span>Contributions for {month} will appear here.</span>
                </div>
              )}
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
                      <button type="button" className="icon-btn danger-text bazar-action" title="Delete contribution" aria-label="Delete contribution" onClick={() => deleteCash(c)}><Trash2 size={15} /></button>
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
                <div className="bazar-history-title">
                  <span className="bazar-history-icon"><ShoppingBasket size={21} /></span>
                  <span className="bazar-history-divider" aria-hidden="true" />
                  <PanelHead title="Monthly bazar history" sub={`${month} · purchases only`} />
                </div>
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
                      {filteredMonthBazar.length ? filteredMonthBazar.map((b) => (
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
                            <td className="bazar-history-amount">{money(b.amount)}</td>
                            <td className="row-actions">
                              <button
                                className="icon-btn bazar-view-action"
                                title="Details"
                                aria-label="View bazar details"
                                onClick={() => setBazarDetailsEntry(b)}
                              >
                                <Eye size={15} />
                              </button>
                              {(admin || (!b.paidFromCash && b.paidBy === user?.id)) && (
                                <>
                                  <button
                                    className="icon-btn bazar-edit-action"
                                    title="Edit"
                                    onClick={() => editBazar(b)}
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    className="icon-btn danger-text bazar-action"
                                    title="Delete"
                                    onClick={() => deleteBazar(b)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
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
                <div className="total-row">
                  <b>Total bazar purchased</b>
                  <b>{money(bazarTotal)}</b>
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
                        <label>Price (৳)<input type="number" min="0" step="0.01" value={row.price} placeholder="0.00" onChange={(e) => setBazarEditEntry((old) => ({...old, editItems:old.editItems.map((it,i)=>i===index?{...it,price:e.target.value}:it)}))}/></label>
                        <button type="button" className="danger-text icon-btn bazar-action" aria-label={`Remove item ${index+1}`} disabled={bazarEditEntry.editItems.length===1} onClick={() => setBazarEditEntry((old) => ({...old,editItems:old.editItems.filter((_,i)=>i!==index)}))}><Trash2 size={15}/></button>
                      </div>
                    ))}
                    <button type="button" className="secondary full" onClick={() => setBazarEditEntry((old) => ({...old,editItems:[...old.editItems,{item:"",price:""}]}))}>＋ Add item</button>
                    {admin && <label>Paid by<select value={bazarEditEntry.editPaidBy} onChange={(e) => setBazarEditEntry((old) => ({...old, editPaidBy:e.target.value}))}><option value="Cash in Hand">Cash in Hand</option>{(db.users || []).filter((member) => member.active !== false).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}
                    <div className="bazar-edit-total"><span>Total</span><strong>{money((bazarEditEntry.editItems||[]).reduce((sum,row)=>sum+(Number(row.price)||0),0))}</strong></div>
                  </div>
                  <div className="bazar-edit-actions">
                    <button type="button" className="secondary bazar-action" onClick={() => setBazarEditEntry(null)}>Cancel</button>
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
                  <button type="button" className="secondary full bazar-details-close bazar-action" onClick={() => setBazarDetailsEntry(null)}>Close</button>
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
                    <button className="secondary bazar-action" onClick={() => setPendingBazarDelete(null)}>Cancel</button>
                    <button className="danger bazar-action" onClick={async () => { const entry=pendingBazarDelete; try { const {error}=await supabase.from("bazar_entries").delete().eq("id",entry.id); if(error) throw error; setPendingBazarDelete(null); await loadCloudData(user.id,month); setBazarSuccessToast("Bazar deleted successfully"); window.setTimeout(() => setBazarSuccessToast(""), 2600); } catch(e) { alert("Could not delete bazar: "+e.message); } }}>Delete entry</button>
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
                <button className="secondary close-red bazar-action" onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}>Cancel</button>
                <button className="danger bazar-action" onClick={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}>Confirm</button>
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
            <div className="inbox-layout">
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
                              className="delete-conversation-action"
                              role="menuitem"
                              onClick={() => void deleteInboxConversation()}
                              disabled={inboxDeleteBusy || inboxMediaBusy}
                            >
                              <Trash2 size={16} />
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
                            {message.sender_id === session.id && <CheckCheck size={16} aria-label={message.read_at ? "Read" : "Sent"} />}
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
            {contactRows.length ? contactRows.map((contact) => (
              <div className="break-row saved-contact-row" key={contact.id}>
                <span className="saved-contact-info">
                  <span className="saved-contact-initial" aria-hidden="true">{contact.name?.[0]?.toUpperCase() || "?"}</span>
                  <span className="saved-contact-details">
                    <b>{contact.name}</b>
                    <span className="saved-contact-meta">
                      <small className="saved-contact-category">{contact.category}</small>
                      <small>{contact.phone}</small>
                    </span>
                  </span>
                </span>
                <div className="row-actions">
                  <button type="button" className="icon-btn saved-contact-edit" aria-label={`Edit ${contact.name}`} title="Edit contact" onClick={() => { setContactForm({ id: contact.id, category: contact.category, name: contact.name, phone: contact.phone }); setContactError(""); setContactModalOpen(true); }}>
                    <Edit size={15} />
                  </button>
                  <button type="button" className="icon-btn saved-contact-delete bazar-action" aria-label={`Delete ${contact.name}`} title="Delete contact" onClick={async () => {
                    if (!(await askConfirm(`Delete ${contact.name || "this contact"}? This cannot be undone.`, "Delete contact?"))) return;
                    const { error } = await supabase.from("member_contacts").delete().eq("id", contact.id);
                    if (error) alert("Could not delete contact: " + error.message);
                    else setContactRows((rows) => rows.filter((row) => row.id !== contact.id));
                  }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )) : <p className="hint saved-contacts-empty">No contacts saved yet. Add one to get started.</p>}
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
              {notices.length ? (
                <div className="notices-admin-list">
                {notices.map((n) => (
                  <article className="notice-card" key={n.id}>
                    <div className="notice-card-top">
                      <div>
                        <h3>{n.title || "Notice"}</h3>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                      <div className="row-actions">
                        <span className={`notice-status ${n.status === "draft" ? "is-draft" : "is-published"}`}>{n.status === "draft" ? "Draft" : "Published"}</span>
                        {n.status !== "published" && <button className="secondary" onClick={() => publishSavedNotice(n)}>Publish</button>}{n.status === "published" && <button className="secondary" onClick={() => repostNotice(n)}>Repost</button>}
                        <button className="icon-btn danger bazar-action" title="Delete notice" onClick={() => deleteNotice(n)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                    {n.body && <p>{n.body}</p>}
                    {n.image_url && <img src={n.image_url} alt="Notice" />}
                  </article>
                ))}
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
                    className="icon-btn bazar-action"
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
function getUtilityIcon(name) {
  const category = String(name || "").toLowerCase();
  if (category.includes("wifi") || category.includes("wi-fi") || category.includes("internet")) return Wifi;
  if (category.includes("gas")) return Flame;
  if (category.includes("water")) return Droplets;
  if (category.includes("lift") || category.includes("elevator")) return ArrowUpDown;
  if (category.includes("moyla") || category.includes("waste") || category.includes("garbage") || category.includes("trash")) return Trash2;
  if (category.includes("bua") || category.includes("maid") || category.includes("clean")) return Brush;
  return Zap;
}
createRoot(document.getElementById("root")).render(<App />);
