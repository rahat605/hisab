const EXACT_BN = new Map(Object.entries({
  "Monthly Hisab": "মাসিক হিসাব",
  "Preparing your account": "আপনার অ্যাকাউন্ট প্রস্তুত হচ্ছে",
  "Manage Your Shared Home Expenses": "শেয়ার করা বাসার খরচ সহজে পরিচালনা করুন",
  "Track rent, meals, utilities and member balances, all in one place.": "ভাড়া, খাবার, ইউটিলিটি ও সদস্যদের হিসাব—সব এক জায়গায় দেখুন।",
  "Manage members": "সদস্য পরিচালনা",
  "Track expenses": "খরচের হিসাব",
  "See balances": "ব্যালেন্স দেখুন",
  "Shared home expense manager": "শেয়ার করা বাসার খরচ ব্যবস্থাপনা",
  "Username": "ইউজারনেম",
  "Password": "পাসওয়ার্ড",
  "Current password": "বর্তমান পাসওয়ার্ড",
  "New password": "নতুন পাসওয়ার্ড",
  "Confirm new password": "নতুন পাসওয়ার্ড নিশ্চিত করুন",
  "Login": "লগইন",
  "Signing in…": "লগইন হচ্ছে…",
  "Send reset link": "রিসেট লিংক পাঠান",
  "Sending reset link…": "রিসেট লিংক পাঠানো হচ্ছে…",
  "Back to login": "লগইনে ফিরুন",
  "Forgot password?": "পাসওয়ার্ড ভুলে গেছেন?",
  "Reload app": "অ্যাপ রিলোড করুন",
  "Return to login": "লগইনে ফিরুন",
  "Overview": "ওভারভিউ",
  "My Account": "আমার অ্যাকাউন্ট",
  "Meal Settlement": "মিল সেটেলমেন্ট",
  "Monthly Bazar": "মাসিক বাজার",
  "Monthly Bazar Report": "মাসিক বাজার রিপোর্ট",
  "Contacts": "যোগাযোগ",
  "Inbox": "ইনবক্স",
  "Pay your rent": "ভাড়া পরিশোধ করুন",
  "Admin Management": "অ্যাডমিন ব্যবস্থাপনা",
  "Members": "সদস্যরা",
  "Utilities": "ইউটিলিটি",
  "Payments & Cash": "পেমেন্ট ও ক্যাশ",
  "Payments & Contacts": "পেমেন্ট ও যোগাযোগ",
  "Notices": "নোটিশ",
  "Member meal balances": "সদস্যদের মিল ব্যালেন্স",
  "Monthly summary of rent, meals, and bills": "ভাড়া, মিল ও বিলের মাসিক সারসংক্ষেপ",
  "Current meal balance of all members": "সব সদস্যের বর্তমান মিল ব্যালেন্স",
  "Daily groceries, expenses & shopping list": "দৈনিক বাজার, খরচ ও কেনাকাটার তালিকা",
  "Spending trends and item-by-item usage": "খরচের ধারা ও পণ্যভিত্তিক ব্যবহার",
  "Flatmates, staff, and emergency numbers": "ফ্ল্যাটমেট, কর্মী ও জরুরি নম্বর",
  "Direct messages with your housemates": "বাসার সদস্যদের সঙ্গে সরাসরি বার্তা",
  "Payment accounts for sending monthly rent": "মাসিক ভাড়া পাঠানোর পেমেন্ট অ্যাকাউন্ট",
  "Household accounts, roles & room rents": "বাসার অ্যাকাউন্ট, ভূমিকা ও রুম ভাড়া",
  "Flat rent and shared monthly utilities": "ফ্ল্যাট ভাড়া ও শেয়ার করা মাসিক ইউটিলিটি",
  "Rent payments and member cash deposits": "ভাড়া পরিশোধ ও সদস্যদের ক্যাশ জমা",
  "Member payment methods & saved contacts": "সদস্যদের পেমেন্ট মাধ্যম ও সংরক্ষিত যোগাযোগ",
  "Bulletin banners & household announcements": "বুলেটিন ও বাসার ঘোষণা",
  "Active members & monthly expense shares": "সক্রিয় সদস্য ও মাসিক খরচের ভাগ",
  "Manage your home, one month at a time.": "মাসে মাসে বাসার হিসাব পরিচালনা করুন।",
  "Notifications": "নোটিফিকেশন",
  "You're all caught up": "সব নোটিফিকেশন দেখা হয়েছে",
  "Mark all as read": "সব পঠিত করুন",
  "No notifications yet": "এখনও কোনো নোটিফিকেশন নেই",
  "Profile settings": "প্রোফাইল সেটিংস",
  "YOUR ACCOUNT": "আপনার অ্যাকাউন্ট",
  "Photo, email and password": "ছবি, ইমেইল ও পাসওয়ার্ড",
  "Change photo": "ছবি পরিবর্তন",
  "Uploading photo…": "ছবি আপলোড হচ্ছে…",
  "Email address": "ইমেইল ঠিকানা",
  "Update email": "ইমেইল আপডেট",
  "Change password": "পাসওয়ার্ড পরিবর্তন",
  "Updating password…": "পাসওয়ার্ড আপডেট হচ্ছে…",
  "Total Rent": "মোট ভাড়া",
  "Rent Paid": "পরিশোধিত ভাড়া",
  "Rent Due": "বকেয়া ভাড়া",
  "Meal Cost": "মিল খরচ",
  "Meal Paid": "মিল পরিশোধ",
  "Previous Due": "আগের বকেয়া",
  "Current Due": "বর্তমান বকেয়া",
  "This month balance": "এই মাসের ব্যালেন্স",
  "Due": "বকেয়া",
  "Paid": "পরিশোধিত",
  "Balance": "ব্যালেন্স",
  "Total": "মোট",
  "Amount": "পরিমাণ",
  "Date": "তারিখ",
  "Status": "অবস্থা",
  "Member": "সদস্য",
  "Name": "নাম",
  "Role": "ভূমিকা",
  "Room rent": "রুম ভাড়া",
  "Meal cost": "মিল খরচ",
  "Meal paid": "মিল পরিশোধ",
  "Previous due": "আগের বকেয়া",
  "Current month due": "চলতি মাসের বকেয়া",
  "Total due": "মোট বকেয়া",
  "Total Due": "মোট বকেয়া",
  "Remaining": "অবশিষ্ট",
  "Receivable": "পাওনা",
  "Payable": "দেনা",
  "Recorded payment": "রেকর্ড করা পেমেন্ট",
  "Payments + credits": "পেমেন্ট ও ক্রেডিট",
  "Carried forward": "আগের মাস থেকে এসেছে",
  "Rent + utilities": "ভাড়া ও ইউটিলিটি",
  "Your monthly breakdown": "আপনার মাসিক হিসাব",
  "Utilities breakdown": "ইউটিলিটি বিবরণ",
  "Cash Ownership": "ক্যাশের মালিকানা",
  "Available Cash in Hand by contributor": "জমাদাতা অনুযায়ী হাতে থাকা ক্যাশ",
  "Available after pending settlements": "অপেক্ষমাণ সেটেলমেন্ট বাদে উপলভ্য",
  "No cash contribution recorded this month": "এই মাসে কোনো ক্যাশ জমা রেকর্ড হয়নি",
  "Month Closing Status": "মাস সমাপ্তির অবস্থা",
  "Utilities fully paid": "সব ইউটিলিটি পরিশোধিত",
  "Current meal balances settled": "চলতি মাসের মিল ব্যালেন্স নিষ্পত্তি",
  "Previous dues cleared": "আগের বকেয়া পরিশোধিত",
  "Cash ledger reconciled": "ক্যাশ লেজার মিলেছে",
  "Pending settlements completed": "অপেক্ষমাণ সেটেলমেন্ট সম্পন্ন",
  "All utility bills are cleared": "সব ইউটিলিটি বিল পরিশোধ হয়েছে",
  "Current month meal balances are clear": "চলতি মাসের মিল ব্যালেন্স পরিশোধ হয়েছে",
  "Previous dues are loading": "আগের বকেয়া লোড হচ্ছে",
  "No previous due remains": "আগের কোনো বকেয়া নেই",
  "Cash balance matches member ownership": "ক্যাশ ব্যালেন্স সদস্যদের মালিকানার সঙ্গে মিলেছে",
  "No pending settlement remains": "কোনো অপেক্ষমাণ সেটেলমেন্ট নেই",
  "Accounting Alerts": "হিসাবের সতর্কতা",
  "Items that need admin attention": "যেসব বিষয়ে অ্যাডমিনের নজর প্রয়োজন",
  "Cash in Hand is negative": "হাতে থাকা ক্যাশ ঋণাত্মক",
  "Cash ownership mismatch": "ক্যাশ মালিকানায় অমিল",
  "Cash usage exceeds contributor balances": "ক্যাশ ব্যবহার জমাদাতাদের ব্যালেন্স ছাড়িয়েছে",
  "Complete member settlements before closing the month": "মাস শেষ করার আগে সদস্যদের সেটেলমেন্ট সম্পন্ন করুন",
  "Previous-month balances still need attention": "আগের মাসের ব্যালেন্স এখনো সমাধান করা প্রয়োজন",
  "Pending entries are reserved in the projected balance": "অপেক্ষমাণ এন্ট্রিগুলো সম্ভাব্য ব্যালেন্সে সংরক্ষিত আছে",
  "Accounts look healthy": "হিসাব ঠিক আছে",
  "No accounting issue needs attention right now": "এই মুহূর্তে কোনো হিসাবের সমস্যা নেই",
  "Payment history": "পেমেন্ট ইতিহাস",
  "Recent activity": "সাম্প্রতিক কার্যক্রম",
  "No activity yet": "এখনও কোনো কার্যক্রম নেই",
  "Settlement history": "সেটেলমেন্ট ইতিহাস",
  "Receiver-confirmed payments update paid, remaining, and status automatically.": "গ্রহণকারী নিশ্চিত করলে পরিশোধিত, অবশিষ্ট ও অবস্থা স্বয়ংক্রিয়ভাবে আপডেট হবে।",
  "Ledger": "লেজার",
  "Contribution by": "জমা দিয়েছেন",
  "Paid by": "পরিশোধ করেছেন",
  "Received by": "গ্রহণ করেছেন",
  "Cash source": "ক্যাশ উৎস",
  "Payer": "দাতা",
  "Receiver": "গ্রহণকারী",
  "Previous due payment": "আগের বকেয়া পরিশোধ",
  "Cash contribution refund": "ক্যাশ জমা ফেরত",
  "Direct transfer": "সরাসরি ট্রান্সফার",
  "Completed": "সম্পন্ন",
  "Pending": "অপেক্ষমাণ",
  "Partially Paid": "আংশিক পরিশোধিত",
  "Confirm payment": "পেমেন্ট নিশ্চিত করুন",
  "Add settlement": "সেটেলমেন্ট যোগ করুন",
  "SETTLEMENT DUE": "সেটেলমেন্ট বকেয়া",
  "Settlement method": "সেটেলমেন্ট পদ্ধতি",
  "Refund from cash contribution": "ক্যাশ জমা থেকে ফেরত",
  "Direct member transfer": "সদস্যদের সরাসরি ট্রান্সফার",
  "Pay last month's due": "গত মাসের বকেয়া পরিশোধ",
  "Contribution from": "জমার উৎস",
  "Refund to": "ফেরত পাবেন",
  "Previous due of": "যার আগের বকেয়া",
  "Paid to": "যাকে পরিশোধ",
  "Total due (৳)": "মোট বকেয়া (৳)",
  "Meal balance settlement": "মিল ব্যালেন্স সেটেলমেন্ট",
  "Create settlement": "সেটেলমেন্ট তৈরি করুন",
  "Cancel": "বাতিল",
  "Close": "বন্ধ করুন",
  "Save": "সংরক্ষণ",
  "Update": "আপডেট",
  "Edit": "সম্পাদনা",
  "Delete": "মুছুন",
  "Add": "যোগ করুন",
  "Search": "খুঁজুন",
  "Active": "সক্রিয়",
  "Inactive": "নিষ্ক্রিয়",
  "Admin": "অ্যাডমিন",
  "All": "সব",
  "None": "কোনোটিই নয়",
  "Yes": "হ্যাঁ",
  "No": "না",
  "Loading…": "লোড হচ্ছে…",
  "Saving…": "সংরক্ষণ হচ্ছে…",
  "Processing…": "প্রক্রিয়াধীন…",
  "No records found": "কোনো রেকর্ড পাওয়া যায়নি",
  "No settlements yet": "এখনও কোনো সেটেলমেন্ট নেই",
  "No new match needed": "নতুন মিল প্রয়োজন নেই",
  "Current completed and pending entries already cover the available balances.": "সম্পন্ন ও অপেক্ষমাণ এন্ট্রিগুলো বর্তমান ব্যালেন্স ইতিমধ্যে সমন্বয় করেছে।",
  "Essentials to Buy": "যা কিনতে হবে",
  "SHARED SHOPPING LIST": "সবার কেনাকাটার তালিকা",
  "Here are the items needed for the flat.": "ফ্ল্যাটের প্রয়োজনীয় জিনিসগুলো এখানে আছে।",
  "All bought": "সব কেনা হয়েছে",
  "Bought": "কেনা হয়েছে",
  "Mark an item bought when it has been collected.": "জিনিসটি সংগ্রহ হলে কেনা হয়েছে হিসেবে চিহ্নিত করুন।",
  "Got it": "বুঝেছি",
  "Cash in Hand": "হাতে থাকা ক্যাশ",
  "Cash In Hand": "হাতে থাকা ক্যাশ",
  "Available Cash": "উপলভ্য ক্যাশ",
  "Use Max Cash": "সর্বোচ্চ ক্যাশ ব্যবহার",
  "Add Bazar": "বাজার যোগ করুন",
  "Edit Bazar": "বাজার সম্পাদনা",
  "Bazar history": "বাজার ইতিহাস",
  "Item": "পণ্য",
  "Items": "পণ্যসমূহ",
  "Quantity": "পরিমাণ",
  "Unit": "একক",
  "Price": "দাম",
  "Paid from": "পরিশোধের উৎস",
  "Cash in Hand + Member": "হাতে থাকা ক্যাশ + সদস্য",
  "Monthly spending": "মাসিক খরচ",
  "Item usage": "পণ্যের ব্যবহার",
  "Top items": "শীর্ষ পণ্য",
  "Spending trend": "খরচের ধারা",
  "Download PDF": "PDF ডাউনলোড",
  "Save as PDF / Print": "PDF হিসেবে সংরক্ষণ / প্রিন্ট",
  "Monthly Financial Report": "মাসিক আর্থিক রিপোর্ট",
  "Member balances": "সদস্যদের ব্যালেন্স",
  "Expense breakdown": "খরচের বিবরণ",
  "Monthly bazar history": "মাসিক বাজার ইতিহাস",
  "Member payment history": "সদস্যদের পেমেন্ট ইতিহাস",
  "Contact list": "যোগাযোগ তালিকা",
  "Phone": "ফোন",
  "Category": "ক্যাটাগরি",
  "Emergency": "জরুরি",
  "Call": "কল করুন",
  "Messages": "বার্তা",
  "Type a message": "বার্তা লিখুন",
  "Send": "পাঠান",
  "Online": "অনলাইন",
  "Offline": "অফলাইন",
  "No messages yet": "এখনও কোনো বার্তা নেই",
  "Payment accounts": "পেমেন্ট অ্যাকাউন্ট",
  "Account number": "অ্যাকাউন্ট নম্বর",
  "Copy": "কপি",
  "Copied": "কপি হয়েছে",
  "Add member": "সদস্য যোগ করুন",
  "Edit member": "সদস্য সম্পাদনা",
  "Add utility": "ইউটিলিটি যোগ করুন",
  "Record payment": "পেমেন্ট রেকর্ড করুন",
  "Add cash contribution": "ক্যাশ জমা যোগ করুন",
  "Notice board": "নোটিশ বোর্ড",
  "Add notice": "নোটিশ যোগ করুন",
  "Publish": "প্রকাশ করুন",
  "Logout": "লগআউট",
  "Light mode": "লাইট মোড",
  "Dark mode": "ডার্ক মোড",
  "Switch to light mode": "লাইট মোডে যান",
  "Switch to dark mode": "ডার্ক মোডে যান",
  "Open navigation menu": "নেভিগেশন মেনু খুলুন",
  "Close navigation menu": "নেভিগেশন মেনু বন্ধ করুন",
  "Close notifications": "নোটিফিকেশন বন্ধ করুন",
  "Close profile settings": "প্রোফাইল সেটিংস বন্ধ করুন",
  "Designed & developed by": "ডিজাইন ও ডেভেলপ করেছেন",
}));

Object.entries({
  "Actions": "অ্যাকশন",
  "Add Bazar": "বাজার যোগ করুন",
  "Add bazar": "বাজার যোগ করুন",
  "Add Payment": "পেমেন্ট যোগ করুন",
  "Add Item": "পণ্য যোগ করুন",
  "Add a notice to save a draft or share an announcement with members.": "ড্রাফট রাখতে বা সদস্যদের ঘোষণা জানাতে একটি নোটিশ যোগ করুন।",
  "Add or update a contact visible to members.": "সদস্যদের জন্য যোগাযোগ যোগ বা আপডেট করুন।",
  "Add, edit, or delete quick-pick items and icons.": "দ্রুত বাছাইয়ের পণ্য ও আইকন যোগ, সম্পাদনা বা মুছুন।",
  "ADMIN CATALOG": "অ্যাডমিন ক্যাটালগ",
  "Already Paid": "ইতিমধ্যে পরিশোধিত",
  "Also display in Bulletin Notice banner": "বুলেটিন নোটিশ ব্যানারেও দেখান",
  "Amount (৳)": "পরিমাণ (৳)",
  "ANNOUNCEMENT": "ঘোষণা",
  "Back to app": "অ্যাপে ফিরুন",
  "Balance / Credit": "ব্যালেন্স / ক্রেডিট",
  "Balance due": "বকেয়া ব্যালেন্স",
  "Based on meal cost and recorded payments": "মিল খরচ ও রেকর্ড করা পেমেন্ট অনুযায়ী",
  "Bulletin Notice": "বুলেটিন নোটিশ",
  "Cash contributions": "ক্যাশ জমা",
  "Categories": "ক্যাটাগরি",
  "Category-Wise Total Spending": "ক্যাটাগরি অনুযায়ী মোট খরচ",
  "Checklist items": "চেকলিস্টের পণ্য",
  "Choose someone from the list to view or start a conversation.": "কথোপকথন দেখতে বা শুরু করতে তালিকা থেকে কাউকে বেছে নিন।",
  "Clear all": "সব মুছুন",
  "Clear, recommended transfers": "পরিষ্কার প্রস্তাবিত ট্রান্সফার",
  "Combine payment breakdown": "সমন্বিত পেমেন্ট বিবরণ",
  "Combine with Cash in Hand (Mess cash + your pocket)": "হাতে থাকা ক্যাশের সঙ্গে মিলিয়ে দিন (মেস ক্যাশ + ব্যক্তিগত টাকা)",
  "Combined purchase": "সমন্বিত কেনাকাটা",
  "Common Items": "সাধারণ পণ্য",
  "Complete the settlement database setup first.": "আগে সেটেলমেন্ট ডেটাবেস সেটআপ সম্পন্ন করুন।",
  "Compose notice": "নোটিশ লিখুন",
  "Confirm received payment": "প্রাপ্ত পেমেন্ট নিশ্চিত করুন",
  "Create the total due. The receiver can confirm full or partial payments later.": "মোট বকেয়া তৈরি করুন। গ্রহণকারী পরে পূর্ণ বা আংশিক পেমেন্ট নিশ্চিত করতে পারবেন।",
  "Current members": "বর্তমান সদস্যরা",
  "Current user count": "বর্তমান ব্যবহারকারীর সংখ্যা",
  "Current User": "বর্তমান ব্যবহারকারী",
  "Date auto-fills today. Enter items and total paid.": "তারিখ আজকের দিন অনুযায়ী পূরণ হবে। পণ্য ও মোট পরিশোধ লিখুন।",
  "Delete all": "সব মুছুন",
  "Delete bazar entry?": "বাজারের এন্ট্রি মুছবেন?",
  "Delete entry": "এন্ট্রি মুছুন",
  "Description": "বিবরণ",
  "Detailed Breakdown": "বিস্তারিত বিবরণ",
  "Details/Account": "বিস্তারিত/অ্যাকাউন্ট",
  "Due (This Month)": "বকেয়া (এই মাস)",
  "Each member pays": "প্রতি সদস্য পরিশোধ করবেন",
  "Edit bazar entry": "বাজার এন্ট্রি সম্পাদনা",
  "Estimated Total": "আনুমানিক মোট",
  "Expense Trend": "খরচের ধারা",
  "Expense": "খরচ",
  "Export PDF": "PDF এক্সপোর্ট",
  "File unavailable in storage": "স্টোরেজে ফাইলটি পাওয়া যাচ্ছে না",
  "FILTER BY MEMBER": "সদস্য অনুযায়ী ফিল্টার",
  "Final Balance Due": "চূড়ান্ত বকেয়া ব্যালেন্স",
  "Flat rent": "ফ্ল্যাট ভাড়া",
  "Flatmate, caretaker, maid and emergency contacts": "ফ্ল্যাটমেট, কেয়ারটেকার, গৃহকর্মী ও জরুরি যোগাযোগ",
  "Full name": "পুরো নাম",
  "House announcements": "বাসার ঘোষণা",
  "IMPORTANT NOTICE": "জরুরি নোটিশ",
  "Ind. meal": "ব্যক্তিগত মিল",
  "Individual meal cost": "ব্যক্তিগত মিল খরচ",
  "Individual meal": "ব্যক্তিগত মিল",
  "Instructions": "নির্দেশনা",
  "Item added": "পণ্য যোগ হয়েছে",
  "Item name": "পণ্যের নাম",
  "Item Usage Breakdown": "পণ্য ব্যবহারের বিবরণ",
  "Last active": "সর্বশেষ সক্রিয়",
  "Login details and individual rent": "লগইন তথ্য ও ব্যক্তিগত ভাড়া",
  "Manage Common Items": "সাধারণ পণ্য পরিচালনা",
  "Meal Balance": "মিল ব্যালেন্স",
  "Meal Cost (Your Share)": "মিল খরচ (আপনার ভাগ)",
  "Meal Details": "মিলের বিস্তারিত",
  "Meal payments & credits": "মিল পেমেন্ট ও ক্রেডিট",
  "Media": "মিডিয়া",
  "Member Contacts": "সদস্যদের যোগাযোগ",
  "Method": "পদ্ধতি",
  "Monthly amount": "মাসিক পরিমাণ",
  "Monthly bazar item": "মাসিক বাজারের পণ্য",
  "Monthly Bill": "মাসিক বিল",
  "Monthly flat rent is tracked separately and is not divided among current members.": "মাসিক ফ্ল্যাট ভাড়া আলাদাভাবে হিসাব করা হয় এবং বর্তমান সদস্যদের মধ্যে ভাগ হয় না।",
  "Monthly report": "মাসিক রিপোর্ট",
  "My Monthly Hisab": "আমার মাসিক হিসাব",
  "Need to buy": "কিনতে হবে",
  "No bazar entries for this month": "এই মাসে কোনো বাজার এন্ট্রি নেই",
  "No bulletin notices active": "কোনো সক্রিয় বুলেটিন নোটিশ নেই",
  "No cash contributions yet": "এখনও কোনো ক্যাশ জমা নেই",
  "No contacts added.": "কোনো যোগাযোগ যোগ করা হয়নি।",
  "No contacts saved yet. Add one to get started.": "এখনও কোনো যোগাযোগ সংরক্ষিত নেই। শুরু করতে একটি যোগ করুন।",
  "No expenses configured": "কোনো খরচ কনফিগার করা হয়নি",
  "No items are waiting to be bought.": "কেনার অপেক্ষায় কোনো পণ্য নেই।",
  "No messages yet. Send a message to start the conversation.": "এখনও কোনো বার্তা নেই। কথোপকথন শুরু করতে বার্তা পাঠান।",
  "No notices yet": "এখনও কোনো নোটিশ নেই",
  "No other active members found.": "অন্য কোনো সক্রিয় সদস্য পাওয়া যায়নি।",
  "No payments recorded for this month": "এই মাসে কোনো পেমেন্ট রেকর্ড নেই",
  "No photos or files shared yet.": "এখনও কোনো ছবি বা ফাইল শেয়ার করা হয়নি।",
  "No records for this month": "এই মাসে কোনো রেকর্ড নেই",
  "No rent payments yet": "এখনও কোনো ভাড়া পরিশোধ নেই",
  "No shared utilities": "শেয়ার করা কোনো ইউটিলিটি নেই",
  "No timeline entries yet": "এখনও কোনো টাইমলাইন এন্ট্রি নেই",
  "No utilities": "কোনো ইউটিলিটি নেই",
  "Not set": "সেট করা হয়নি",
  "Note": "নোট",
  "Optional": "ঐচ্ছিক",
  "Paid from Cash in Hand": "হাতে থাকা ক্যাশ থেকে পরিশোধ",
  "Payment Breakdown": "পেমেন্ট বিবরণ",
  "Payment details will appear here once the admin configures them.": "অ্যাডমিন কনফিগার করলে পেমেন্টের তথ্য এখানে দেখা যাবে।",
  "Payment split": "পেমেন্ট ভাগ",
  "Payments recorded by admin": "অ্যাডমিনের রেকর্ড করা পেমেন্ট",
  "Per member": "প্রতি সদস্য",
  "PERSONAL ACCOUNT": "ব্যক্তিগত অ্যাকাউন্ট",
  "Phone number": "ফোন নম্বর",
  "Plan unavailable": "পরিকল্পনা পাওয়া যাচ্ছে না",
  "Preparing monthly bill": "মাসিক বিল প্রস্তুত হচ্ছে",
  "Preparing monthly bill…": "মাসিক বিল প্রস্তুত হচ্ছে…",
  "Prev. due": "আগের বকেয়া",
  "Previous Balance": "আগের ব্যালেন্স",
  "Previous months due": "আগের মাসগুলোর বকেয়া",
  "Price (৳)": "দাম (৳)",
  "Quick Summary": "সংক্ষিপ্ত সারসংক্ষেপ",
  "RECEIVER CONFIRMATION": "গ্রহণকারীর নিশ্চিতকরণ",
  "Rent & Utilities Due": "ভাড়া ও ইউটিলিটি বকেয়া",
  "Rent & Utilities": "ভাড়া ও ইউটিলিটি",
  "Rent payments": "ভাড়া পরিশোধ",
  "Rent, shared expenses, recorded payments and estimated remaining due": "ভাড়া, শেয়ার করা খরচ, রেকর্ড করা পেমেন্ট ও আনুমানিক অবশিষ্ট বকেয়া",
  "Room rent (৳)": "রুম ভাড়া (৳)",
  "Room Rent + Utilities Share": "রুম ভাড়া + ইউটিলিটি ভাগ",
  "Save all suggested transfers": "সব প্রস্তাবিত ট্রান্সফার সংরক্ষণ",
  "Save as a draft or publish it for your members.": "ড্রাফট হিসেবে রাখুন বা সদস্যদের জন্য প্রকাশ করুন।",
  "Save as image": "ছবি হিসেবে সংরক্ষণ",
  "Save as PDF": "PDF হিসেবে সংরক্ষণ",
  "Save changes": "পরিবর্তন সংরক্ষণ",
  "Saving image...": "ছবি সংরক্ষণ হচ্ছে...",
  "Saving PDF...": "PDF সংরক্ষণ হচ্ছে...",
  "Section": "সেকশন",
  "Secure Payment Options": "নিরাপদ পেমেন্ট মাধ্যম",
  "Select a member": "একজন সদস্য বেছে নিন",
  "SELECT MONTH": "মাস বেছে নিন",
  "Selected members": "নির্বাচিত সদস্যরা",
  "Settled": "সমন্বয় হয়েছে",
  "Settlement setup is required": "সেটেলমেন্ট সেটআপ প্রয়োজন",
  "Shared Home Expenses": "শেয়ার করা বাসার খরচ",
  "Shared shopping checklist for the house": "বাসার সবার কেনাকাটার চেকলিস্ট",
  "Shared total": "শেয়ার করা মোট",
  "Shared utilities total": "শেয়ার করা ইউটিলিটির মোট",
  "Smart Matching": "স্মার্ট মিল",
  "Start a conversation": "কথোপকথন শুরু করুন",
  "Start typing an item name.": "পণ্যের নাম লেখা শুরু করুন।",
  "Statement Overview": "হিসাবের সারসংক্ষেপ",
  "Subtotal": "উপমোট",
  "Summary": "সারসংক্ষেপ",
  "The app hit an unexpected error. Reload it, or return to login to start a clean session.": "অ্যাপে অপ্রত্যাশিত সমস্যা হয়েছে। রিলোড করুন অথবা নতুনভাবে শুরু করতে লগইনে ফিরুন।",
  "These details are shown to active members.": "এই তথ্য সক্রিয় সদস্যরা দেখতে পাবেন।",
  "This account is inactive and cannot receive new messages.": "এই অ্যাকাউন্ট নিষ্ক্রিয় এবং নতুন বার্তা নিতে পারবে না।",
  "This entry will be permanently removed. This action cannot be undone.": "এন্ট্রিটি স্থায়ীভাবে মুছে যাবে। এটি আর ফেরানো যাবে না।",
  "This Month Balance": "এই মাসের ব্যালেন্স",
  "Top Items This Month": "এই মাসের শীর্ষ পণ্য",
  "Other Items": "অন্যান্য পণ্য",
  "Total Spent": "মোট খরচ",
  "Tracked Items": "ট্র্যাক করা পণ্য",
  "Top Item": "শীর্ষ পণ্য",
  "Average / Shopping Day": "প্রতি বাজারের দিনের গড়",
  "Total bazar purchased": "মোট বাজার কেনা",
  "Total Cash Contribution": "মোট ক্যাশ জমা",
  "Total Charges": "মোট চার্জ",
  "Total Monthly Bill": "মোট মাসিক বিল",
  "Total Paid": "মোট পরিশোধিত",
  "Total quantity": "মোট পরিমাণ",
  "Total Rent Payments": "মোট ভাড়া পরিশোধ",
  "Total shared expenses": "মোট শেয়ার করা খরচ",
  "Total utilities": "মোট ইউটিলিটি",
  "Track as a custom item": "কাস্টম পণ্য হিসেবে রাখুন",
  "Type a message above and click Set Bulletin to display it on the account banner.": "উপরে বার্তা লিখে অ্যাকাউন্ট ব্যানারে দেখাতে Set Bulletin চাপুন।",
  "Type": "ধরন",
  "Unable to open the dashboard": "ড্যাশবোর্ড খোলা যাচ্ছে না",
  "Unpaid": "অপরিশোধিত",
  "Update date, items and prices": "তারিখ, পণ্য ও দাম আপডেট করুন",
  "Use one of the payment methods configured by the admin": "অ্যাডমিনের কনফিগার করা পেমেন্ট মাধ্যম ব্যবহার করুন",
  "Use the suggested plan or add a partial settlement when members are ready.": "প্রস্তাবিত পরিকল্পনা ব্যবহার করুন অথবা সদস্যরা প্রস্তুত হলে আংশিক সেটেলমেন্ট যোগ করুন।",
  "User ID": "ইউজার আইডি",
  "Utilities are divided by this number for every month": "প্রতি মাসে এই সংখ্যা দিয়ে ইউটিলিটি ভাগ করা হয়",
  "Utilities per member": "প্রতি সদস্যের ইউটিলিটি",
  "Utilities share": "ইউটিলিটি ভাগ",
  "Utility name": "ইউটিলিটির নাম",
  "Utility": "ইউটিলিটি",
  "View All": "সব দেখুন",
  "Your share": "আপনার ভাগ",
}).forEach(([english, bangla]) => EXACT_BN.set(english, bangla));

const WORD_BN = [
  ["Previous month", "আগের মাস"], ["Current month", "চলতি মাস"],
  ["Cash in Hand", "হাতে থাকা ক্যাশ"], ["Cash In Hand", "হাতে থাকা ক্যাশ"],
  ["Meal Settlement", "মিল সেটেলমেন্ট"], ["Monthly Bazar", "মাসিক বাজার"],
  ["Previous due", "আগের বকেয়া"], ["Total Due", "মোট বকেয়া"],
  ["Total due", "মোট বকেয়া"], ["Total amount", "মোট পরিমাণ"],
  ["Contribution", "জমা"], ["Settlement", "সেটেলমেন্ট"],
  ["Remaining", "অবশিষ্ট"], ["Completed", "সম্পন্ন"],
  ["Pending", "অপেক্ষমাণ"], ["Received", "গ্রহণ করা হয়েছে"],
  ["Payment", "পেমেন্ট"], ["Payments", "পেমেন্টসমূহ"],
  ["Member", "সদস্য"], ["Members", "সদস্যরা"],
  ["Monthly", "মাসিক"], ["Report", "রিপোর্ট"],
  ["Balance", "ব্যালেন্স"], ["Amount", "পরিমাণ"],
  ["Paid", "পরিশোধিত"], ["Due", "বকেয়া"],
  ["Rent", "ভাড়া"], ["Meal", "মিল"], ["Cash", "ক্যাশ"],
  ["Active", "সক্রিয়"], ["Inactive", "নিষ্ক্রিয়"],
  ["Search", "খুঁজুন"], ["Save", "সংরক্ষণ"], ["Cancel", "বাতিল"],
  ["Close", "বন্ধ করুন"], ["Delete", "মুছুন"], ["Edit", "সম্পাদনা"],
  ["Add", "যোগ করুন"], ["History", "ইতিহাস"], ["Details", "বিস্তারিত"],
];

const MONTH_BN = {
  January: "জানুয়ারি", February: "ফেব্রুয়ারি", March: "মার্চ", April: "এপ্রিল",
  May: "মে", June: "জুন", July: "জুলাই", August: "আগস্ট",
  September: "সেপ্টেম্বর", October: "অক্টোবর", November: "নভেম্বর", December: "ডিসেম্বর",
  Jan: "জানু", Feb: "ফেব্রু", Mar: "মার্চ", Apr: "এপ্রিল", Jun: "জুন",
  Jul: "জুলাই", Aug: "আগ", Sep: "সেপ্টে", Oct: "অক্টো", Nov: "নভে", Dec: "ডিসে",
  Sunday: "রবিবার", Monday: "সোমবার", Tuesday: "মঙ্গলবার", Wednesday: "বুধবার",
  Thursday: "বৃহস্পতিবার", Friday: "শুক্রবার", Saturday: "শনিবার",
};

const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const TRANSLATABLE_ATTRIBUTES = ["title", "aria-label", "placeholder"];
let originalDocumentTitle = "";

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function translateDynamic(text) {
  let match = text.match(/^(\d+) pending$/i);
  if (match) return `${match[1]}টি বাকি`;
  match = text.match(/^(\d+) of (\d+) checks completed$/i);
  if (match) return `${match[2]}টির মধ্যে ${match[1]}টি যাচাই সম্পন্ন`;
  match = text.match(/^(\d+) bills? remaining$/i);
  if (match) return `${match[1]}টি বিল বাকি`;
  match = text.match(/^(\d+) members? still unsettled$/i);
  if (match) return `${match[1]} জন সদস্যের হিসাব এখনো বাকি`;
  match = text.match(/^(\d+) members? have previous dues$/i);
  if (match) return `${match[1]} জন সদস্যের আগের বকেয়া আছে`;
  match = text.match(/^(.+) difference found$/i);
  if (match) return `${match[1]} অমিল পাওয়া গেছে`;
  match = text.match(/^(\d+) settlements? pending$/i);
  if (match) return `${match[1]}টি সেটেলমেন্ট অপেক্ষমাণ`;
  match = text.match(/^(.+) contributed\s*[·Â·â€¢]\s*(.+) used$/i);
  if (match) return `${match[1]} জমা · ${match[2]} ব্যবহৃত`;
  match = text.match(/^(.+) needs reconciliation$/i);
  if (match) return `${match[1]} সমন্বয় করা প্রয়োজন`;
  match = text.match(/^(.+) is not assigned correctly$/i);
  if (match) return `${match[1]} সঠিকভাবে বরাদ্দ হয়নি`;
  match = text.match(/^(.+) cash usage needs a contributor$/i);
  if (match) return `${match[1]} ক্যাশ ব্যবহারের জন্য একজন জমাদাতা প্রয়োজন`;
  match = text.match(/^(.+) could not be assigned to a contributor$/i);
  if (match) return `${match[1]} কোনো জমাদাতার হিসাবে বরাদ্দ করা যায়নি`;
  match = text.match(/^(\d+) utility bills? unpaid$/i);
  if (match) return `${match[1]}টি ইউটিলিটি বিল অপরিশোধিত`;
  match = text.match(/^(.+) still due$/i);
  if (match) return `${match[1]} এখনো বকেয়া`;
  match = text.match(/^(\d+) meal balances? open$/i);
  if (match) return `${match[1]}টি মিল ব্যালেন্স বাকি`;
  match = text.match(/^(\d+) previous dues? open$/i);
  if (match) return `${match[1]}টি আগের বকেয়া বাকি`;
  match = text.match(/^(\d+) settlements? awaiting completion$/i);
  if (match) return `${match[1]}টি সেটেলমেন্ট সম্পন্ন হওয়ার অপেক্ষায়`;
  match = text.match(/^(\d+) entr(?:y|ies)$/i);
  if (match) return `${match[1]}টি এন্ট্রি`;
  match = text.match(/^(\d+) unread\s*[·•]\s*(\d+) total$/i);
  if (match) return `${match[1]}টি অপঠিত · মোট ${match[2]}টি`;
  match = text.match(/^(\d+) members?$/i);
  if (match) return `${match[1]} জন সদস্য`;
  match = text.match(/^Bought by (.+)$/i);
  if (match) return `কিনেছেন ${match[1]}`;
  match = text.match(/^Will pay (.+)$/i);
  if (match) return `পরিশোধ করবে ${match[1]}`;
  match = text.match(/^Will receive (.+)$/i);
  if (match) return `পাবে ${match[1]}`;
  match = text.match(/^\+(.+) due$/i);
  if (match) return `+${match[1]} বকেয়া`;
  match = text.match(/^-([^-].+) credit$/i);
  if (match) return `-${match[1]} ক্রেডিট`;
  match = text.match(/^Cash in Hand paid (.+) of (.+)'s previous due using (.+)'s contribution\.$/i);
  if (match) return `হাতে থাকা ক্যাশ থেকে ${match[1]} দিয়ে ${match[2]}-এর আগের বকেয়া পরিশোধ হয়েছে; উৎস ${match[3]}-এর জমা।`;
  match = text.match(/^Cash in Hand will pay (.+) of (.+)'s previous due using (.+)'s contribution\.$/i);
  if (match) return `হাতে থাকা ক্যাশ থেকে ${match[1]} দিয়ে ${match[2]}-এর আগের বকেয়া পরিশোধ হবে; উৎস ${match[3]}-এর জমা।`;
  return "";
}

export function translateUiText(value, language = "en") {
  if (language !== "bn" || value == null) return String(value ?? "");
  const raw = String(value);
  const whitespace = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const prefix = whitespace?.[1] || "";
  const text = whitespace?.[2] || raw;
  const suffix = whitespace?.[3] || "";
  if (!text || /^[\d\s৳.,:+\-–—/%()]+$/.test(text)) return raw;
  const exact = EXACT_BN.get(text);
  if (exact) return `${prefix}${exact}${suffix}`;
  const dynamic = translateDynamic(text);
  if (dynamic) return `${prefix}${dynamic}${suffix}`;

  let translated = text;
  Object.entries(MONTH_BN).forEach(([english, bangla]) => {
    translated = translated.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, "g"), bangla);
  });
  WORD_BN.forEach(([english, bangla]) => {
    translated = translated.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, "gi"), bangla);
  });
  return `${prefix}${translated}${suffix}`;
}

function shouldSkipNode(node) {
  const parent = node?.parentElement;
  return !parent || Boolean(parent.closest("script, style, noscript, code, pre, textarea, [contenteditable='true'], [data-no-translate]"));
}

function translateTextNode(node, language) {
  if (shouldSkipNode(node)) return;
  const current = node.nodeValue || "";
  const stored = originalText.get(node);
  if (language === "en") {
    if (stored != null && current !== stored) node.nodeValue = stored;
    return;
  }
  if (stored == null) {
    originalText.set(node, current);
  } else if (current !== translateUiText(stored, "bn")) {
    originalText.set(node, current);
  }
  const source = originalText.get(node) || "";
  const translated = translateUiText(source, "bn");
  if (translated !== current) node.nodeValue = translated;
}

function translateElementAttributes(element, language) {
  if (!(element instanceof Element) || element.closest("[data-no-translate]")) return;
  let saved = originalAttributes.get(element);
  if (!saved) {
    saved = new Map();
    originalAttributes.set(element, saved);
  }
  TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const current = element.getAttribute(attribute) || "";
    const stored = saved.get(attribute);
    if (language === "en") {
      if (stored != null && current !== stored) element.setAttribute(attribute, stored);
      return;
    }
    if (stored == null) saved.set(attribute, current);
    else if (current !== translateUiText(stored, "bn")) saved.set(attribute, current);
    const translated = translateUiText(saved.get(attribute), "bn");
    if (translated !== current) element.setAttribute(attribute, translated);
  });
}

function translateTree(root, language) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) translateElementAttributes(root, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
    else translateElementAttributes(node, language);
    node = walker.nextNode();
  }
}

export function installUiLanguage(language) {
  if (typeof document === "undefined") return () => {};
  document.documentElement.lang = language === "bn" ? "bn" : "en";
  document.documentElement.dataset.language = language;
  if (!originalDocumentTitle) originalDocumentTitle = document.title;
  document.title = language === "bn"
    ? translateUiText(originalDocumentTitle, "bn")
    : originalDocumentTitle;
  translateTree(document.body, language);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") translateTextNode(mutation.target, language);
      mutation.addedNodes.forEach((node) => translateTree(node, language));
      if (mutation.type === "attributes") translateElementAttributes(mutation.target, language);
    });
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANSLATABLE_ATTRIBUTES,
  });

  const nativeAlert = window.alert;
  window.alert = (message) => nativeAlert(translateUiText(message, language));
  return () => {
    observer.disconnect();
    window.alert = nativeAlert;
  };
}
