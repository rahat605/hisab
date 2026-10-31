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
  useEffect(() => {
    if (!session?.id) return;
    supabase.from("member_contacts").select("*").order("category").then(({ data, error }) => {
      if (!error && data) setContactRows(data);
    });
  }, [session?.id]);
  const [page, setPage] = useState("overview"),
    [month, setMonth] = useState(db.month),
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
  const [cloudBusy, setCloudBusy] = useState(false);
  const [utilityMemberCount, setUtilityMemberCount] = useState(4);
  const [utilityMemberCountInput, setUtilityMemberCountInput] = useState("4");
  const [utilityMemberCountSaving, setUtilityMemberCountSaving] = useState(false);
  const [utilityMemberCountMessage, setUtilityMemberCountMessage] = useState("");
  const [editingUtilityName, setEditingUtilityName] = useState("");
  const [utilityEditModal, setUtilityEditModal] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
      name: "",
      amount: "",
      shared: true,
    }),
    [paymentForm, setPaymentForm] = useState({
      userId: "u2",
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
  const [bazarForm, setBazarForm] = useState({
    date: new Date().toISOString().slice(0, 10),
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

  const [cashForm, setCashForm] = useState({
    date: new Date().toISOString().slice(0, 10),
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
      loadCloudData(session.id, month)
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
        );
    }
  }, []);
  const user = db.users.find((u) => u.id === session?.id);
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
    .filter((p) =>
      String(p.note || "")
        .toLowerCase()
        .includes("rent"),
    )
    .reduce((s, p) => s + Number(p.amount), 0);
  // Split recorded credits into rent payments and meal/household credits so the
  // member balance table shows how each member's due is being covered.
  const memberRentPaid = (uid) =>
    monthPayments
      .filter(
        (p) =>
          p.userId === uid &&
          String(p.note || "")
            .toLowerCase()
            .includes("rent"),
      )
      .reduce((s, p) => s + Number(p.amount || 0), 0);
  const memberMealPaid = (uid) =>
    monthPayments
      .filter(
        (p) =>
          p.userId === uid &&
          !String(p.note || "")
            .toLowerCase()
            .includes("rent"),
      )
      .reduce((s, p) => s + Number(p.amount || 0), 0) +
    memberCredits(uid);
  const memberRentShare = (u) =>
    Number(u.rent || 0) + (selected.includes(u.id) ? utilitiesPerMember : 0);
  // Meal charges apply only to members explicitly active in the meal roster.
  // Being selected for the rent/overview table does not make a member a meal member.
  const memberMealShare = (u) =>
    mealActiveIds.includes(u.id) ? individualMealCost : 0;
  const memberDue = (u) =>
    memberRentShare(u) + memberMealShare(u) - memberRentPaid(u.id) - memberMealPaid(u.id);
  const expensesPaid =
    monthPayments
      .filter(
        (p) =>
          !String(p.note || "")
            .toLowerCase()
            .includes("rent"),
      )
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
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) { alert("Please allow pop-ups to export your account PDF."); return; }
    const rows = utilityCategories.filter((c) => c.shared).map((c) => `<tr><td>${String(c.name).replace(/[&<>]/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[x]))}</td><td>${money(c.amount)}</td><td>${money(utilityMemberCount > 0 ? Math.ceil(Number(c.amount || 0) / utilityMemberCount) : 0)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><title>My Monthly Hisab - ${month}</title><style>body{font:14px Arial,sans-serif;color:#172033;padding:32px}h1{margin-bottom:4px}p{color:#64748b}.cards{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;min-width:145px}.label{color:#64748b;font-size:12px}.value{font-size:22px;font-weight:700;margin-top:8px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:10px;border-bottom:1px solid #e2e8f0}th{color:#64748b}.print{margin-bottom:20px;padding:8px 14px;border:0;border-radius:8px;background:#4f5ff0;color:white;cursor:pointer}@media print{.print{display:none}body{padding:0}}
        .payments-cash-grid { align-items: stretch; gap: 22px; }
        .payments-cash-grid > .panel { border-radius: 20px; border: 1px solid var(--border, #dbe5f5); box-shadow: 0 10px 28px rgba(34, 74, 140, .06); }
        .payments-cash-grid .form-panel form { gap: 15px; }
        .payments-cash-grid .primary.full { min-height: 46px; border-radius: 12px; font-weight: 650; }
        .payments-cash-grid .break-row { padding: 15px 2px; }
        .payments-cash-grid table { min-width: 560px; }
        @media (max-width: 900px) { .payments-cash-grid { grid-template-columns: 1fr; } }
</style></head><body><button class="print" onclick="window.print()">Save as PDF / Print</button><h1>My Monthly Hisab</h1><p>${month} · ${user.name}</p><div class="cards"><div class="card"><div class="label">Total rent</div><div class="value">${money(ownTotalRent)}</div></div><div class="card"><div class="label">Individual meal cost</div><div class="value">${money(mealActiveIds.includes(user.id) ? individualMealCost : 0)}</div></div><div class="card"><div class="label">Paid</div><div class="value">${money(ownPayments)}</div></div><div class="card"><div class="label">Remaining due</div><div class="value">${money(Math.ceil(ownDue))}</div></div></div><h2>Utilities breakdown</h2><table><thead><tr><th>Utility</th><th>Total</th><th>Your share</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No utilities</td></tr>'}</tbody></table><p>Individual meal cost = total bazar divided by ${bazarMemberCount} meal members.</p><script>window.onafterprint=()=>window.close();</script></body></html>`);
    popup.document.close();
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
      const [catsRes, payRes, bazRes, cashRes] = await Promise.all([
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
      ]);
      for (const r of [catsRes, payRes, bazRes, cashRes])
        if (r.error) throw r.error;
      const users = (profiles || []).map((p) => ({
        id: p.id,
        name: p.full_name,
        username: p.username,
        role: p.role,
        active: p.active,
        rent: Number(p.rent || 0),
        photo_url: p.photo_url || "",
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
      if (profileError || !profile || !profile.active)
        throw new Error(
          "Your profile is not active or could not be loaded. Contact the admin.",
        );
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
    } catch (e) { alert("Could not save utility: " + e.message); }
  }

  async function addPayment(e) {
    e.preventDefault();
    if (!admin || Number(paymentForm.amount) <= 0) return;
    try {
      const mid = await monthIdFor();
      const { error } = await supabase
        .from("rent_payments")
        .insert({
          month_id: mid,
          user_id: paymentForm.userId,
          amount: Number(paymentForm.amount),
          note: paymentForm.note || "Rent payment",
          paid_at: new Date().toISOString().slice(0, 10),
          created_by: user.id,
        });
      if (error) throw error;
      await loadCloudData(user.id, month);
      setPaymentForm({ ...paymentForm, amount: "" });
    } catch (e) {
      alert("Could not save payment: " + e.message);
    }
  }
  async function editPayment(p) {
    if (!admin) return;
    const amount = prompt("Update payment amount (৳):", String(p.amount));
    if (amount === null) return;
    const note = prompt("Update payment note:", p.note || "Rent payment");
    if (note === null) return;
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }
    try {
      const { error } = await supabase
        .from("rent_payments")
        .update({ amount: Number(amount), note: note.trim() || "Rent payment" })
        .eq("id", p.id);
      if (error) throw error;
      await loadCloudData(user.id, month);
    } catch (e) {
      alert("Could not update payment: " + e.message);
    }
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
        date: new Date().toISOString().slice(0, 10),
        paidBy: f.paidBy || user.id,
      }));
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
    if (!admin || Number(cashForm.amount) <= 0) return;
    try {
      const mid = await monthIdFor();
      const { error } = await supabase
        .from("cash_contributions")
        .insert({
          month_id: mid,
          entry_date: cashForm.date,
          amount: Number(cashForm.amount),
          paid_by: cashForm.paidBy,
          note: cashForm.note || "Cash contribution",
          created_by: user.id,
        });
      if (error) throw error;
      await loadCloudData(user.id, month);
      setCashForm({ ...cashForm, amount: "", note: "Cash contribution" });
    } catch (e) {
      alert("Could not save cash contribution: " + e.message);
    }
  }
  async function editCash(c) {
    if (!admin) return;
    const date = prompt("Update contribution date (YYYY-MM-DD):", c.date);
    if (date === null) return;
    const amount = prompt("Update contribution amount (৳):", String(c.amount));
    if (amount === null) return;
    const note = prompt("Update note:", c.note || "Cash contribution");
    if (note === null) return;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      alert("Enter a valid date and amount.");
      return;
    }
    try {
      const { error } = await supabase
        .from("cash_contributions")
        .update({
          entry_date: date,
          amount: Number(amount),
          note: note.trim() || "Cash contribution",
        })
        .eq("id", c.id);
      if (error) throw error;
      await loadCloudData(user.id, month);
    } catch (e) {
      alert("Could not update cash contribution: " + e.message);
    }
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
    } catch (e) {
      alert("Could not delete cash contribution: " + e.message);
    }
  }
  async function saveUser(e) {
    e.preventDefault();
    if (!admin || !newUser.name.trim() || !newUser.username.trim()) return;
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
  function exportPremiumPdf() {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow pop-ups to export the PDF report.");
      return;
    }
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
    const bazarRows = monthBazar
      .map(
        (b) =>
          `<tr><td>${esc(b.date)}</td><td>${esc(Array.isArray(b.items) ? b.items.join(", ") : b.items)}</td><td>${esc(db.users.find((u) => u.id === b.paidBy)?.name || "Member")}</td><td>${money(b.amount)}</td></tr>`,
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
    w.document.open();
    w.document
      .write(`<!doctype html><html><head><meta charset="utf-8"><title>Monthly Hisab · ${esc(month)} Report</title><style>
   @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#18233b;font:12px/1.5 Inter,"Segoe UI",Arial,sans-serif;background:#f4f7fc;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{max-width:900px;margin:0 auto;background:white;min-height:100vh}.hero{padding:30px 32px 26px;color:#fff;background:linear-gradient(125deg,#283b91,#4f46e5 55%,#8b5cf6);position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;right:-45px;top:-100px;background:#ffffff20}.brand{font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:800;opacity:.85}.hero h1{font-size:29px;line-height:1.15;margin:10px 0 5px}.hero p{margin:0;color:#e4e9ff;font-size:13px}.hero .tag{display:inline-block;margin-top:17px;padding:5px 10px;border:1px solid #ffffff55;border-radius:99px;font-size:10px;font-weight:700}.content{padding:24px 30px 30px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}.stat{border:1px solid #e4e9f4;border-radius:12px;padding:13px;background:linear-gradient(145deg,#fff,#f7f8ff);border-top:3px solid #6366f1}.stat:nth-child(2){border-top-color:#8b5cf6}.stat:nth-child(3){border-top-color:#10b981}.stat:nth-child(4){border-top-color:#f59e0b}.stat span{display:block;color:#66728a;font-size:10px;margin-bottom:7px}.stat strong{font-size:17px;color:#17213a;letter-spacing:-.3px}.section{margin-top:21px;break-inside:avoid}.section h2{font-size:15px;margin:0 0 3px;color:#1e2b49}.section .sub{margin:0 0 10px;color:#77839a;font-size:10px}.section-title{display:flex;align-items:center;gap:9px}.section-title i{display:inline-block;width:4px;height:19px;border-radius:4px;background:linear-gradient(#6366f1,#a78bfa)}table{width:100%;border-collapse:collapse;font-size:10px}th{text-align:left;color:#fff;background:#27356f;padding:9px 8px;font-weight:700}td{padding:8px;border-bottom:1px solid #e8edf5;color:#27344d;vertical-align:top}tbody tr:nth-child(even){background:#f7f9fd}td small{display:block;color:#8a95a8;font-size:9px}.green{color:#059669;font-weight:700}.due{color:#d97706;font-weight:700}.empty{text-align:center;color:#8993a5;padding:14px}.footer{margin-top:26px;padding-top:12px;border-top:1px solid #e8edf5;display:flex;justify-content:space-between;color:#8b95a7;font-size:9px}.footer strong{color:#4f46e5}.printbar{display:flex;justify-content:flex-end;gap:8px;padding:12px 30px;background:#eef2ff}.printbar button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.printbtn{background:#4f46e5;color:#fff}.closebtn{background:#fff;color:#334155;border:1px solid #dbe2ef!important}@media print{body{background:white}.sheet{max-width:none}.printbar{display:none}.hero{padding:24px 28px}.content{padding:20px 28px}.section{break-inside:avoid}.stats{gap:8px}.stat{padding:10px}.stat strong{font-size:15px}}
   </style></head><body><div class="sheet"><div class="printbar"><button class="closebtn" onclick="window.close()">Close report</button><button class="printbtn" onclick="window.print()">Save as PDF / Print</button></div><header class="hero"><div class="brand">Monthly Hisab · Household finance</div><h1>Monthly Financial Report</h1><p>${esc(month)} · A clear snapshot of your shared home expenses</p><span class="tag">PREPARED BY RAHAT · ${esc(new Date().toLocaleDateString())}</span></header><main class="content"><div class="stats"><div class="stat"><span>Monthly bazar</span><strong>${money(bazarTotal)}</strong></div><div class="stat"><span>Total rent</span><strong>${money(totalRent)}</strong></div><div class="stat"><span>Rent paid</span><strong>${money(rentPaid)}</strong></div><div class="stat"><span>Cash contributions</span><strong>${money(cashTotal)}</strong></div></div><section class="section"><div class="section-title"><i></i><h2>Member balances</h2></div><p class="sub">Rent, shared expenses, recorded payments and estimated remaining due</p><table><thead><tr><th>Member</th><th>Rent</th><th>Individual meal</th><th>Rent paid</th><th>Meal paid</th><th>Due</th></tr></thead><tbody>${memberRows || tableEmpty}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Expense breakdown</h2></div><p class="sub">Expenses configured for ${esc(month)}</p><table><thead><tr><th>Expense</th><th>Type</th><th>Amount</th></tr></thead><tbody>${expenseRows || '<tr><td colspan="3" class="empty">No expenses configured</td></tr>'}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Monthly bazar history</h2></div><p class="sub">Recorded purchases for ${esc(month)} · total ${money(bazarTotal)}</p><table><thead><tr><th>Date</th><th>Items</th><th>Paid by</th><th>Amount</th></tr></thead><tbody>${bazarRows || '<tr><td colspan="4" class="empty">No bazar entries for this month</td></tr>'}</tbody></table></section><section class="section"><div class="section-title"><i></i><h2>Member payment history</h2></div><p class="sub">Payments recorded by admin</p><table><thead><tr><th>Date</th><th>Member</th><th>Note</th><th>Amount</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="4" class="empty">No payments recorded for this month</td></tr>'}</tbody></table></section><div class="footer"><span>Designed &amp; developed by <strong>Rahat</strong> · Monthly Hisab</span><span>Private household report · ${esc(month)}</span></div></main></div><script>window.addEventListener('load',()=>{document.title='Monthly-Hisab-${esc(month).replace(/[^a-zA-Z0-9-]/g, "-")}-Report'});</script></body></html>`);
    w.document.close();
  }
  if (!session || !user)
    return (
      <div className="login-wrap">
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
        <div className="profile-modal-backdrop" onClick={() => setProfileOpen(false)}>
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
                          <td className="due">{money(memberDue(x.u))}</td>
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
                  <div className="break-row">
                    <span>{c.name}</span>
                    <b>
                      {money(
                        c.name.toLowerCase() === "bazar" && monthBazar.length
                          ? bazarTotal
                          : c.amount,
                      )}
                    </b>
                    <small>{c.shared ? "Shared" : "Individual"}</small>
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
                hint="Bazar and meal credits"
              />
              <Stat
                title="Due"
                value={money(ownDue)}
                icon={Wallet}
                tone="orange"
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
          <div className="content-grid">
            <section className="panel">
              <PanelHead
                title="Member accounts"
                sub="Add, edit, or deactivate household users"
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>User ID</th>
                      <th>Rent</th>
                      <th>Meal</th>
                      <th>Status</th>
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
                        <td>
                          <button
                            className="icon-btn"
                            title={`Download ${u.name} monthly bill`}
                            aria-label={`Download ${u.name} monthly bill`}
                            onClick={() => {
                              const memberUtilities = utilityCategories.filter((c) => c.shared).map((c) => ({ name: c.name, amount: Number(c.amount || 0), share: utilityMemberCount > 0 ? Number(c.amount || 0) / utilityMemberCount : 0 }));
                              const utilitiesShare = memberUtilities.reduce((sum, c) => sum + c.share, 0);
                              const rentPayments = (db.payments || []).filter((p) => p.userId === u.id && p.month === month && String(p.note || "").toLowerCase().includes("rent")).reduce((sum, p) => sum + Number(p.amount || 0), 0);
                              const mealPaid = (db.payments || []).filter((p) => p.userId === u.id && p.month === month && !String(p.note || "").toLowerCase().includes("rent")).reduce((sum, p) => sum + Number(p.amount || 0), 0);
                              const credits = memberCredits(u.id);
                              const mealCost = mealActiveIds.includes(u.id) ? individualMealCost : 0;
                              const total = Number(u.rent || 0) + utilitiesShare + mealCost;
                              const paid = rentPayments + mealPaid + credits;
                              const billRows = memberUtilities.map((c) => `<tr><td>${c.name}</td><td>${money(c.amount)}</td><td>${money(c.share)}</td></tr>`).join("");
                              const html = `<!doctype html><html><head><meta charset="utf-8"><title>${u.name} - ${month} Bill</title><style>*{box-sizing:border-box}body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#334155;padding:24px;max-width:720px;margin:0 auto;background:#fff;font-size:13px;line-height:1.55}header{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:20px 22px;margin-bottom:22px;border-radius:16px;color:#334155;background:linear-gradient(120deg,#f0f7ff 0%,#f5f2ff 55%,#fff7ed 100%);border:1px solid #e3eaf7}h1{margin:0;font-size:26px;letter-spacing:-.5px;font-weight:800;color:#334155}header small{display:block;text-align:right;font-size:12px;color:#64748b;line-height:1.6}h3{font-size:15px;margin:0 0 10px;color:#5267a8;display:flex;align-items:center;gap:8px}h3:before{content:'';display:inline-block;width:4px;height:18px;border-radius:5px;background:linear-gradient(#93c5fd,#c4b5fd)}small{color:#718096}table{width:100%;border-collapse:separate;border-spacing:0;margin:10px 0 16px;table-layout:fixed;border:1px solid #e5eaf3;border-radius:11px;overflow:hidden}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #edf1f7}th{background:#f3f6fc;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.6px}tbody tr:nth-child(even){background:#fbfcff}tbody tr:last-child td{border-bottom:0}td:nth-child(2),td:nth-child(3),th:nth-child(2),th:nth-child(3){text-align:right}.summary{background:linear-gradient(135deg,#fbfdff,#faf8ff);border:1px solid #e5eaf5;border-radius:14px;padding:15px 18px;margin-top:16px}.line{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:9px 0;border-bottom:1px solid #edf1f7;color:#64748b}.line:nth-child(1) b{color:#6488c7}.line:nth-child(2) b{color:#8b7ac4}.line:nth-child(3) b{color:#5a9b83}.line:nth-child(4){font-weight:750;background:#f0f5ff;margin:5px -9px;padding:10px 9px;border-radius:8px;color:#5267a8}.line:nth-child(4) b{color:#5267a8}.line:last-child{border-bottom:0}.line b{font-variant-numeric:tabular-nums;white-space:nowrap;color:#475569}.due{font-size:15px;font-weight:800;color:#49689e;background:#edf5ff;border:1px solid #dbeafe;border-radius:9px;margin:10px -6px -5px;padding:12px 8px}.due b{color:#49689e}.footer{margin-top:18px;padding-top:10px;border-top:1px solid #edf1f7;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}.footer span:first-child{color:#7c8fb8;font-weight:650}@page{size:A4;margin:13mm}@media print{body{padding:0;max-width:none;font-size:12px;background:#fff}header{margin-bottom:16px;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}button{display:none}table{break-inside:avoid}th,.summary,.due{print-color-adjust:exact;-webkit-print-color-adjust:exact}.summary{break-inside:avoid}}</style></style></head><body><header><h1>Monthly Bill</h1><small>${month} · ${u.name} (${u.username})</small></header><h3>Utilities</h3><table><thead><tr><th>Utility</th><th>Total</th><th>Your share</th></tr></thead><tbody>${billRows}</tbody></table><div class="summary"><div class="line"><span>Room rent</span><b>${money(u.rent)}</b></div><div class="line"><span>Utilities share</span><b>${money(utilitiesShare)}</b></div><div class="line"><span>Meal cost</span><b>${money(mealCost)}</b></div><div class="line"><span>Total monthly bill</span><b>${money(total)}</b></div><div class="line"><span>Rent payments</span><b>${money(rentPayments)}</b></div><div class="line"><span>Meal payments & credits</span><b>${money(mealPaid + credits)}</b></div><div class="line due"><span>Balance due</span><b>${money(Math.ceil(total-paid))}</b></div></div><div class="footer"><span>Monthly Hisab · ${month}</span><span>Generated ${new Date().toLocaleDateString()}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
                              const win = window.open("", "_blank", "width=850,height=950");
                              if (!win) { alert("Please allow pop-ups to generate the monthly bill."); return; }
                              win.document.open(); win.document.write(html); win.document.close();
                            }}
                          >
                            <Download size={16} />
                          </button>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="icon-btn"
                              title="Edit"
                              onClick={() => editUser(u)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-btn danger"
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
            <section className="panel form-panel">
              <PanelHead
                title={editId ? "Edit member" : "Add member"}
                sub="Login details and individual rent"
              />
              <form onSubmit={saveUser}>
                <label>
                  Full name
                  <input
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  User ID
                  <input
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    required
                  />
                </label>
                {!editId && (
                  <label>
                    Email address
                    <input
                      type="email"
                      value={newUser.email || ""}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      required
                    />
                  </label>
                )}
                <label>
                  Password
                  <input
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder={
                      editId
                        ? "Password is managed in Supabase Auth"
                        : "Temporary password (min 6 characters)"
                    }
                    disabled={!!editId}
                    type={editId ? "text" : "password"}
                  />
                </label>
                <label>
                  Room rent (৳)
                  <input
                    type="number"
                    min="0"
                    value={newUser.rent}
                    onChange={(e) =>
                      setNewUser({ ...newUser, rent: e.target.value })
                    }
                  />
                </label>
                <label>
                  Role
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button className="primary full">
                  {editId ? "Update member" : "Add member"}
                </button>
                {editId && (
                  <button
                    type="button"
                    className="secondary full"
                    onClick={() => {
                      setEditId(null);
                      setNewUser({
                        name: "",
                        username: "",
                        email: "",
                        password: "",
                        rent: "",
                        role: "member",
                      });
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </form>
            </section>
          </div>
        )}
        {page === "expenses" && admin && (
          <div className="grid-two">
            <section className="panel form-panel">
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
            <section className="panel">
              <PanelHead
                title="Utilities list"
                sub={`${month} · ${utilityMemberCount} current users`}
              />
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
                      try {
                        const utilities = [...(await getUtilitiesForMonth())].filter((item) => String(item.name || "").toLowerCase() !== String(c.name || "").toLowerCase()).map((item) => ({ ...item }));
                        const { error } = await supabase.from("app_settings").upsert(
                          { key: `shared_utilities_list_${month}`, value: JSON.stringify(utilities), updated_at: new Date().toISOString() },
                          { onConflict: "key" },
                        );
                        if (error) throw error;
                        await loadCloudData(user.id, month);
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
        {page === "payments" && admin && (
          <div className="grid-two payments-cash-grid">
            <section className="panel form-panel payment-entry-panel">
              <PanelHead
                title="Record rent payment"
                sub="Admin records money received from a member"
              />
              <form onSubmit={addPayment}>
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
                <button className="primary full">Save payment</button>
              </form>
            </section>
            <section className="panel">
              <PanelHead title="Rent payment history" sub={month} />
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
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit payment"
                        aria-label="Edit payment"
                        onClick={() => editPayment(p)}
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger-text"
                        title="Delete payment"
                        aria-label="Delete payment"
                        onClick={() => deletePayment(p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
            </section>
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
        {page === "payments" && admin && (
          <div className="grid-two payments-cash-grid">
            <section className="panel form-panel cash-entry-panel">
              <PanelHead
                title="Add cash contribution"
                sub="Money given for future monthly bazar"
              />
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
                  <Plus size={16} /> Save cash
                </button>
              </form>
            </section>
            <section className="panel">
              <PanelHead
                title="Cash contribution history"
                sub={`${month} · deposits only`}
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Note</th>
                      <th>Paid by</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(db.contributions || [])
                      .filter((c) => c.month === month)
                      .map((c) => (
                        <tr key={c.id}>
                          <td>{c.date}</td>
                          <td>{c.note || "Cash contribution"}</td>
                          <td>
                            {db.users.find((u) => u.id === c.paidBy)?.name ||
                              "Member"}
                          </td>
                          <td>{money(c.amount)}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                title="Edit contribution"
                                aria-label="Edit contribution"
                                onClick={() => editCash(c)}
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger-text"
                                title="Delete contribution"
                                aria-label="Delete contribution"
                                onClick={() => deleteCash(c)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
        {page === "bazar" && (admin || user.role === "member") && (
          <>
            <div className="grid-two bazar-layout">
              <section className="panel form-panel">
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
              <section className="panel bazar-history-panel">
                <PanelHead
                  title="Monthly bazar history"
                  sub={`${month} · purchases only`}
                />
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
              <div className="modal-backdrop" role="presentation" onClick={() => setBazarDetailsEntry(null)}>
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
              <div className="modal-backdrop delete-confirm-backdrop" onClick={() => setPendingBazarDelete(null)}>
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
          <div className="modal-backdrop delete-confirm-backdrop" onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}>
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
