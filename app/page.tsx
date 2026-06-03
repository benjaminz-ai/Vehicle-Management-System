"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  Car, Users, Wrench, AlertTriangle, FileText, Bell, Shield, Kanban,
  Network, LayoutDashboard, Check, X, Cloud, Smartphone, Lock,
  CheckCircle2, Calendar, ArrowLeft,
} from "lucide-react";

const NAVY = "#032147";
const GOLD = "#ecad0a";

// ─────────────────────────────────────────────────────────────────────────────
// Embedded login panel (reuses the real auth flow)
// ─────────────────────────────────────────────────────────────────────────────
function LoginPanel() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      // On success, the global AuthGuard redirects to /dashboard automatically.
    } catch {
      setError("אימייל או סיסמה שגויים");
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-[#032147]/10 border border-gray-100 p-7 w-full max-w-sm">
      <h2 className="text-lg font-bold text-[#032147]">כניסת לקוחות</h2>
      <p className="text-sm text-gray-400 mt-0.5 mb-5">התחברו עם פרטי הארגון שלכם</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">אימייל</label>
          <input
            type="email" required
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm text-[#032147] focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7] transition-all"
            placeholder="name@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">סיסמה</label>
          <input
            type="password" required
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm text-[#032147] focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7] transition-all"
            placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">{error}</div>
        )}
        <button
          type="submit" disabled={busy}
          className="h-10 rounded-xl bg-[#032147] text-white text-sm font-semibold hover:bg-[#032147]/90 disabled:opacity-50 transition-all mt-1"
        >
          {busy ? "מתחבר..." : "כניסה למערכת"}
        </button>
        <div className="text-center">
          <a href="/forgot-password" className="text-xs text-[#209dd7] hover:text-[#1880b0] transition-colors">שכחתי סיסמה</a>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI helpers
// ─────────────────────────────────────────────────────────────────────────────
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs font-medium text-white/80 border border-white/20 rounded-full px-3 py-1.5">
      {children}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-[#209dd7]/30 transition-all">
      <div className="w-10 h-10 rounded-xl bg-[#032147]/5 flex items-center justify-center mb-3">
        <Icon size={18} className="text-[#209dd7]" />
      </div>
      <h3 className="text-sm font-bold text-[#032147] mb-1">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded mockup: mini vehicle board (dummy data)
// ─────────────────────────────────────────────────────────────────────────────
function MiniBoard() {
  const cols = [
    { name: "זמין", color: "#22c55e", cars: [["טויוטה קורולה", "12-345-67"], ["יונדאי i20", "88-221-04"]] },
    { name: "בשימוש", color: "#209dd7", cars: [["מאזדה 3", "45-902-11"], ["סקודה אוקטביה", "73-118-90"]] },
    { name: "בטיפול", color: "#ecad0a", cars: [["פורד טרנזיט", "61-540-22"]] },
  ];
  return (
    <div className="bg-[#f8fafc] rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Kanban size={14} className="text-[#209dd7]" />
        <span className="text-xs font-bold text-[#032147]">לוח רכבים</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cols.map(c => (
          <div key={c.name}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              <span className="text-[10px] font-semibold text-[#032147]">{c.name}</span>
            </div>
            <div className="space-y-1.5">
              {c.cars.map(([m, p]) => (
                <div key={p} className="bg-white rounded-lg border border-gray-100 px-2 py-1.5">
                  <div className="text-[10px] font-semibold text-[#032147] truncate">{m}</div>
                  <div className="text-[9px] text-gray-400 font-mono">{p}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded mockup: mini alerts (dummy data)
// ─────────────────────────────────────────────────────────────────────────────
function MiniAlerts() {
  const rows = [
    { icon: Calendar, label: "טסט רישוי · מאזדה 3", sub: "45-902-11", days: "3 ימים", tone: "red" },
    { icon: Shield, label: "ביטוח חובה · טויוטה קורולה", sub: "12-345-67", days: "12 ימים", tone: "amber" },
    { icon: Calendar, label: "טסט רישוי · סקודה אוקטביה", sub: "73-118-90", days: "26 ימים", tone: "gray" },
  ];
  const toneCls: Record<string, string> = {
    red: "bg-red-100 text-red-600", amber: "bg-amber-100 text-amber-700", gray: "bg-gray-100 text-gray-500",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={14} className="text-[#ecad0a]" />
        <span className="text-xs font-bold text-[#032147]">התראות פקיעה</span>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-2.5 bg-[#f8fafc] rounded-xl px-3 py-2">
            <r.icon size={14} className="text-[#032147] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#032147] truncate">{r.label}</div>
              <div className="text-[9px] text-gray-400 font-mono">{r.sub}</div>
            </div>
            <span className={"text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 " + toneCls[r.tone]}>{r.days}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing page
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const features = [
    { icon: LayoutDashboard, title: "דשבורד", desc: "תמונת מצב חיה: רכבים, נהגים, תאונות וטיפולים במבט אחד." },
    { icon: Kanban, title: "לוח רכבים", desc: "תצוגת Board ויזואלית של כלל הרכבים לפי סטטוס, עם גרירה." },
    { icon: Car, title: "רכבים", desc: "כרטיס רכב מלא — יצרן, דגם, בעלות, רישוי, ביטוח וסטטוס." },
    { icon: Users, title: "נהגים", desc: "ניהול מצבת הנהגים, פרטי קשר, מייל לדיוור ורישיונות." },
    { icon: Network, title: "שיבוץ נהגים", desc: "שיוך נהג לרכב בזמן אמת, עם תיעוד והיסטוריה מלאה." },
    { icon: Wrench, title: "טיפולים", desc: "רשומות טיפול ותחזוקה, מוסכים, עלויות ופירוט מלא." },
    { icon: AlertTriangle, title: "תאונות", desc: "דוחות תאונה מנוהלים מדיווח ועד סגירה מול הביטוח." },
    { icon: Bell, title: "התראות", desc: "טסט, רישוי וביטוחים שמתקרבים לתוקף — לפני שמאוחר." },
    { icon: FileText, title: "מסמכים", desc: "מאגר מסמכים מרכזי — העלאה, צפייה והורדה לכל ישות." },
  ];

  const without = [
    "מידע מפוזר בין אקסלים, מיילים וניירת",
    "תוקף רישוי וביטוח מתפספס — קנסות וסיכון",
    "אין מעקב טיפולים והוצאות תחזוקה",
    "שיבוץ נהגים ידני ולא מתועד",
    "דוחות תאונה שמתגלגלים בלי מעקב מול הביטוח",
  ];
  const withSys = [
    "מקור אמת אחד לכל הצי, נגיש מכל מקום",
    "התראות אוטומטיות על טסט, רישוי וביטוח",
    "היסטוריית טיפולים והוצאות לכל רכב",
    "שיבוץ נהג-רכב מתועד עם היסטוריה מלאה",
    "ניהול דוחות תאונה מקצה לקצה מול הביטוח",
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#f0f4f8] overflow-y-auto">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: NAVY, color: GOLD }}>FM</div>
            <div>
              <div className="text-[#032147] font-bold text-sm leading-tight">ניהול צי רכבים</div>
              <div className="text-[#ecad0a] text-[9px] font-semibold tracking-widest uppercase">Fleet Manager</div>
            </div>
          </div>
          <a href="#login" className="text-sm font-semibold text-[#032147] hover:text-[#209dd7] transition-colors flex items-center gap-1">
            כניסת לקוחות <ArrowLeft size={14} />
          </a>
        </div>
      </header>

      {/* Hero with embedded login */}
      <section className="relative overflow-hidden" style={{ background: NAVY }}>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(32,157,215,0.25), transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(236,173,10,0.12), transparent 70%)" }} />
        <div className="relative max-w-6xl mx-auto px-5 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Marketing (right in RTL) */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              הצי שלך,<br /><span style={{ color: GOLD }}>בשליטה מלאה.</span>
            </h1>
            <p className="text-white/70 text-base lg:text-lg mt-5 leading-relaxed max-w-lg">
              פלטפורמה חכמה לניהול צי רכבים ארגוני — רכבים, נהגים, טיפולים, תאונות, מסמכים והתראות, הכל במערכת ענן אחת, בעברית מלאה, נגישה מכל מכשיר.
            </p>
            <div className="flex flex-wrap gap-2 mt-7">
              <Pill><Cloud size={12} className="ml-1.5" /> מבוסס ענן</Pill>
              <Pill><Shield size={12} className="ml-1.5" /> ריבוי לקוחות</Pill>
              <Pill><Smartphone size={12} className="ml-1.5" /> מותאם נייד</Pill>
              <Pill><Lock size={12} className="ml-1.5" /> אבטחה ברמת ארגון</Pill>
            </div>
          </div>
          {/* Login (left in RTL) */}
          <div id="login" className="flex lg:justify-start justify-center">
            <LoginPanel />
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-widest uppercase text-[#209dd7]">למה צריך את זה</span>
          <h2 className="text-2xl lg:text-3xl font-bold text-[#032147] mt-2">ניהול צי על אקסל זה כסף שנשפך</h2>
          <p className="text-gray-500 text-sm mt-3 max-w-2xl mx-auto leading-relaxed">
            רישוי שפג, ביטוח שלא חודש, טיפול שנשכח, נהג שלא ברור לאיזה רכב שובץ — כל אחד מאלה עולה בכסף, בזמן ובסיכון. המערכת מרכזת הכל במקום אחד ומתריעה לפני שמשהו נופל.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-red-100 p-6">
            <div className="text-sm font-bold text-red-500 mb-4">המצב בלי המערכת</div>
            <ul className="space-y-3">
              {without.map(t => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <X size={16} className="text-red-400 shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 p-6">
            <div className="text-sm font-bold text-emerald-600 mb-4">המצב עם המערכת</div>
            <ul className="space-y-3">
              {withSys.map(t => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest uppercase text-[#209dd7]">מה יש במערכת</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#032147] mt-2">מודול אחד לכל היבט בצי</h2>
            <p className="text-gray-500 text-sm mt-3 max-w-2xl mx-auto">מודולים משלימים שעובדים יחד — מהמבט-על בדשבורד ועד תיעוד הטיפול הבודד.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* Mockups */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-widest uppercase text-[#209dd7]">מסכי תצוגה</span>
          <h2 className="text-2xl lg:text-3xl font-bold text-[#032147] mt-2">ככה זה נראה בפועל</h2>
          <p className="text-gray-500 text-sm mt-3">תצוגה לדוגמה עם נתוני דמה — הנתונים האמיתיים נטענים רק לאחר התחברות.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <MiniBoard />
          <MiniAlerts />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="rounded-3xl px-8 py-12 text-center" style={{ background: NAVY }}>
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: GOLD }} />
          <h2 className="text-2xl font-bold text-white">מוכנים לקחת שליטה על הצי?</h2>
          <p className="text-white/60 text-sm mt-2 mb-6">לקוחות רשומים — התחברו וגשו לכל הנתונים שלכם.</p>
          <a href="#login" className="inline-flex items-center gap-2 bg-white text-[#032147] text-sm font-bold rounded-xl px-6 py-3 hover:bg-gray-100 transition-colors">
            כניסה למערכת <ArrowLeft size={15} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-6 flex items-center justify-between text-xs text-gray-400">
          <span>מערכת לשותפים וספקים</span>
          <span>benjaminz-ai · כל הזכויות שמורות</span>
        </div>
      </footer>
    </div>
  );
}
