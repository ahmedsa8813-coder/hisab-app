import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";

const USERS = [
  { id: "u1", name: "أحمد علي", role: "manager", pin: "0000" },
  { id: "u2", name: "كرار حسين", role: "employee", pin: "1111" },
  { id: "u3", name: "علي محمد", role: "employee", pin: "2222" },
  { id: "u4", name: "زيد عمر", role: "employee", pin: "3333" },
];

const PROJECTS = [
  { id: "p1", name: "مشروع الكرادة السكني" },
  { id: "p2", name: "مشروع المنصور التجاري" },
  { id: "p3", name: "مشروع الزعفرانية الطرق" },
];

const CATEGORIES = ["مواد بناء", "نقل", "عمالة", "معدات", "وقود", "طوارئ", "أخرى"];

const fmt = (n) => Number(n).toLocaleString("ar-IQ") + " د.ع";

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("login");
  const [loginId, setLoginId] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [view, setView] = useState("home");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "صرف", projectId: "", amount: "", category: "", note: "" });
  const [formSuccess, setFormSuccess] = useState(false);
  const [filterUser, setFilterUser] = useState("all");
  const [filterProject, setFilterProject] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = () => {
    const u = USERS.find(u => u.id === loginId);
    if (u && pin === u.pin) {
      setUser(u); setScreen("app"); setView("home"); setPinError(false);
    } else { setPinError(true); setPin(""); }
  };

  const submitTransaction = async () => {
    if (!form.projectId || !form.amount || !form.category) return;
    const proj = PROJECTS.find(p => p.id === form.projectId);
    await addDoc(collection(db, "transactions"), {
      userId: user.id, userName: user.name,
      projectId: form.projectId, projectName: proj.name,
      type: form.type, amount: Number(form.amount),
      category: form.category, note: form.note,
      createdAt: serverTimestamp(),
      date: new Date().toLocaleDateString("ar-IQ"),
      time: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
    });
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setForm({ type: "صرف", projectId: "", amount: "", category: "", note: "" });
      setView("home");
    }, 1800);
  };

  const myTx = transactions.filter(t => user && t.userId === user.id);
  const myReceived = myTx.filter(t => t.type === "استلام").reduce((s, t) => s + t.amount, 0);
  const mySpent = myTx.filter(t => t.type === "صرف").reduce((s, t) => s + t.amount, 0);
  const myBalance = myReceived - mySpent;

  const filteredTx = transactions.filter(t => {
    if (filterUser !== "all" && t.userId !== filterUser) return false;
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    return true;
  });

  const employeeBalances = USERS.filter(u => u.role === "employee").map(u => {
    const tx = transactions.filter(t => t.userId === u.id);
    const rec = tx.filter(t => t.type === "استلام").reduce((s, t) => s + t.amount, 0);
    const sp = tx.filter(t => t.type === "صرف").reduce((s, t) => s + t.amount, 0);
    return { ...u, received: rec, spent: sp, balance: rec - sp };
  });

  const projectBalances = PROJECTS.map(p => {
    const sp = transactions.filter(t => t.projectId === p.id && t.type === "صرف").reduce((s, t) => s + t.amount, 0);
    return { ...p, spent: sp };
  });

  // ===== LOGIN SCREEN =====
  if (screen === "login") return (
    <div style={S.page}>
      <div style={S.loginWrap}>
        <div style={S.logo}>
          <div style={S.logoIcon}>⚡</div>
          <div style={S.logoText}>حساب</div>
          <div style={S.logoSub}>نظام المصروفيات الذكي</div>
        </div>
        {!loginId ? (
          <>
            <div style={S.label}>اختر اسمك</div>
            <div style={S.userGrid}>
              {USERS.map(u => (
                <button key={u.id} style={S.userBtn} onClick={() => { setLoginId(u.id); setPin(""); setPinError(false); }}>
                  <div style={S.avatar}>{u.name[0]}</div>
                  <div style={S.userBtnName}>{u.name}</div>
                  <div style={S.userBtnRole}>{u.role === "manager" ? "مدير" : "موظف"}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={S.selectedUser}>
              <div style={S.avatar}>{USERS.find(u => u.id === loginId)?.name[0]}</div>
              <div>{USERS.find(u => u.id === loginId)?.name}</div>
            </div>
            <div style={S.label}>أدخل رمز الدخول</div>
            <div style={S.pinDots}>
              {[0,1,2,3].map(i => <div key={i} style={{ ...S.dot, background: pin.length > i ? "#f59e0b" : "rgba(255,255,255,0.15)" }} />)}
            </div>
            {pinError && <div style={S.pinError}>رمز خاطئ، حاول مرة ثانية</div>}
            <div style={S.numpad}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
                <button key={i} style={k === "" ? S.numEmpty : S.numBtn} onClick={() => {
                  if (!k) return;
                  if (k === "⌫") { setPin(p => p.slice(0,-1)); setPinError(false); }
                  else if (pin.length < 4) setPin(p => p + k);
                }}>{k}</button>
              ))}
            </div>
            <button style={S.loginBtn} onClick={handleLogin}>دخول</button>
            <button style={S.backBtn} onClick={() => { setLoginId(null); setPin(""); }}>← رجوع</button>
          </>
        )}
      </div>
    </div>
  );

  // ===== APP SCREEN =====
  return (
    <div style={S.page}>
      <div style={S.appWrap}>
        <div style={S.header}>
          <div>
            <div style={S.headerName}>أهلاً، {user.name}</div>
            <div style={S.headerRole}>{user.role === "manager" ? "مدير" : "موظف"}</div>
          </div>
          <button style={S.logoutBtn} onClick={() => { setUser(null); setScreen("login"); setLoginId(null); setPin(""); }}>خروج</button>
        </div>

        <div style={S.content}>
          {loading && <div style={S.empty}>جاري التحميل...</div>}

          {/* EMPLOYEE HOME */}
          {!loading && user.role === "employee" && view === "home" && (
            <div>
              <div style={{ ...S.balCard, background: myBalance >= 0 ? "linear-gradient(135deg,#065f46,#047857)" : "linear-gradient(135deg,#7f1d1d,#991b1b)" }}>
                <div style={S.balLabel}>رصيدك الحالي</div>
                <div style={S.balAmount}>{fmt(Math.abs(myBalance))}</div>
                <div style={S.balSub}>{myBalance >= 0 ? "متبقي معك" : "عليك"}</div>
                <div style={S.balRow}>
                  <span style={S.balStat}>↓ استلمت {fmt(myReceived)}</span>
                  <span style={S.balStat}>↑ صرفت {fmt(mySpent)}</span>
                </div>
              </div>
              <button style={S.addBtn} onClick={() => { setView("add"); setForm({ type: "صرف", projectId: "", amount: "", category: "", note: "" }); }}>+ سجل معاملة جديدة</button>
              <div style={S.secTitle}>آخر المعاملات</div>
              {myTx.length === 0 && <div style={S.empty}>ما عندك معاملات بعد</div>}
              {myTx.map(t => <TxCard key={t.id} t={t} />)}
            </div>
          )}

          {/* EMPLOYEE ADD */}
          {!loading && user.role === "employee" && view === "add" && (
            <div>
              <div style={S.secTitle}>معاملة جديدة</div>
              {formSuccess ? (
                <div style={S.successBox}><div style={S.successIcon}>✓</div><div>تم التسجيل بنجاح!</div></div>
              ) : (
                <div style={S.formCard}>
                  <div style={S.fieldLabel}>نوع المعاملة</div>
                  <div style={S.typeRow}>
                    {["صرف","استلام"].map(t => (
                      <button key={t} style={{ ...S.typeBtn, ...(form.type === t ? S.typeBtnActive : {}) }} onClick={() => setForm(f => ({ ...f, type: t }))}>
                        {t === "صرف" ? "↑ صرف" : "↓ استلام"}
                      </button>
                    ))}
                  </div>
                  <div style={S.fieldLabel}>المشروع</div>
                  <select style={S.select} value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                    <option value="">اختر المشروع</option>
                    {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div style={S.fieldLabel}>المبلغ (دينار)</div>
                  <input style={S.input} type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  <div style={S.fieldLabel}>الفئة</div>
                  <div style={S.catGrid}>
                    {CATEGORIES.map(c => (
                      <button key={c} style={{ ...S.catBtn, ...(form.category === c ? S.catBtnActive : {}) }} onClick={() => setForm(f => ({ ...f, category: c }))}>{c}</button>
                    ))}
                  </div>
                  <div style={S.fieldLabel}>ملاحظة (اختياري)</div>
                  <textarea style={S.textarea} placeholder="تفاصيل إضافية..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} />
                  <button style={S.submitBtn} onClick={submitTransaction}>حفظ المعاملة</button>
                  <button style={S.cancelBtn} onClick={() => setView("home")}>إلغاء</button>
                </div>
              )}
            </div>
          )}

          {/* MANAGER HOME */}
          {!loading && user.role === "manager" && view === "home" && (
            <div>
              <div style={S.secTitle}>لوحة المدير</div>
              <div style={S.empSec}>تصفية حسابات الموظفين</div>
              {employeeBalances.map(e => (
                <div key={e.id} style={S.empCard}>
                  <div style={S.empTop}>
                    <div style={S.avatar}>{e.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={S.empName}>{e.name}</div>
                      <div style={S.empSub}>استلم {fmt(e.received)} · صرف {fmt(e.spent)}</div>
                    </div>
                    <div style={{ ...S.empBal, color: e.balance >= 0 ? "#34d399" : "#f87171" }}>
                      {e.balance >= 0 ? "متبقي" : "عليه"}<br />{fmt(Math.abs(e.balance))}
                    </div>
                  </div>
                </div>
              ))}
              <div style={S.empSec}>مصروفيات المشاريع</div>
              {projectBalances.map(p => (
                <div key={p.id} style={S.projCard}>
                  <div style={S.projName}>{p.name}</div>
                  <div style={S.projSpent}>إجمالي المصروف: {fmt(p.spent)}</div>
                </div>
              ))}
              <button style={S.addBtn} onClick={() => setView("allTx")}>عرض كل المعاملات</button>
            </div>
          )}

          {/* MANAGER ALL TX */}
          {!loading && user.role === "manager" && view === "allTx" && (
            <div>
              <div style={S.secTitle}>كل المعاملات</div>
              <div style={S.filterRow}>
                <select style={S.filterSel} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                  <option value="all">كل الموظفين</option>
                  {USERS.filter(u => u.role === "employee").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select style={S.filterSel} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                  <option value="all">كل المشاريع</option>
                  {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {filteredTx.length === 0 && <div style={S.empty}>ما في نتائج</div>}
              {filteredTx.map(t => <TxCard key={t.id} t={t} showUser />)}
              <button style={S.cancelBtn} onClick={() => setView("home")}>← رجوع</button>
            </div>
          )}
        </div>

        {/* BOTTOM NAV */}
        <div style={S.bottomNav}>
          {user.role === "employee" ? <>
            <button style={{ ...S.navBtn, ...(view === "home" ? S.navActive : {}) }} onClick={() => setView("home")}><span>🏠</span><span>الرئيسية</span></button>
            <button style={{ ...S.navBtn, ...(view === "add" ? S.navActive : {}) }} onClick={() => setView("add")}><span>➕</span><span>تسجيل</span></button>
          </> : <>
            <button style={{ ...S.navBtn, ...(view === "home" ? S.navActive : {}) }} onClick={() => setView("home")}><span>📊</span><span>الملخص</span></button>
            <button style={{ ...S.navBtn, ...(view === "allTx" ? S.navActive : {}) }} onClick={() => setView("allTx")}><span>📋</span><span>المعاملات</span></button>
          </>}
        </div>
      </div>
    </div>
  );
}

function TxCard({ t, showUser }) {
  return (
    <div style={S.txCard}>
      <div style={S.txTop}>
        <div style={{ ...S.txBadge, background: t.type === "صرف" ? "#7f1d1d" : "#064e3b" }}>{t.type}</div>
        <div style={S.txAmount}>{t.type === "صرف" ? "-" : "+"}{Number(t.amount).toLocaleString("ar-IQ")} د.ع</div>
      </div>
      {showUser && <div style={S.txUser}>{t.userName}</div>}
      <div style={S.txMeta}>{t.projectName}</div>
      <div style={S.txMeta2}>{t.category} · {t.date} {t.time}</div>
      {t.note && <div style={S.txNote}>{t.note}</div>}
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", display: "flex", justifyContent: "center", fontFamily: "Tahoma, 'Segoe UI', sans-serif", direction: "rtl" },
  loginWrap: { width: "100%", maxWidth: 420, padding: "40px 24px 60px", color: "#fff" },
  logo: { textAlign: "center", marginBottom: 40 },
  logoIcon: { fontSize: 48 },
  logoText: { fontSize: 36, fontWeight: 900, color: "#f59e0b" },
  logoSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  label: { fontSize: 14, color: "#9ca3af", marginBottom: 12, textAlign: "center" },
  userGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  userBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px 12px", color: "#fff", cursor: "pointer", textAlign: "center" },
  avatar: { width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, margin: "0 auto 8px" },
  userBtnName: { fontSize: 14, fontWeight: 600 },
  userBtnRole: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  selectedUser: { display: "flex", alignItems: "center", gap: 12, background: "rgba(245,158,11,0.1)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "#fff", fontSize: 16, fontWeight: 600 },
  pinDots: { display: "flex", justifyContent: "center", gap: 16, marginBottom: 8 },
  dot: { width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", transition: "background 0.15s" },
  pinError: { textAlign: "center", color: "#f87171", fontSize: 13, marginBottom: 8 },
  numpad: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "16px 0" },
  numBtn: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "18px", color: "#fff", fontSize: 22, fontWeight: 600, cursor: "pointer" },
  numEmpty: { background: "transparent", border: "none" },
  loginBtn: { width: "100%", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 14, padding: "16px", color: "#000", fontSize: 17, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  backBtn: { width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "14px", color: "#9ca3af", fontSize: 15, cursor: "pointer" },
  appWrap: { width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", minHeight: "100vh", color: "#fff" },
  header: { background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerName: { fontSize: 17, fontWeight: 700 },
  headerRole: { fontSize: 12, color: "#f59e0b", marginTop: 2 },
  logoutBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#9ca3af", fontSize: 13, cursor: "pointer" },
  content: { flex: 1, padding: "20px 16px 100px", overflowY: "auto" },
  balCard: { borderRadius: 20, padding: "24px 20px", marginBottom: 16 },
  balLabel: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8 },
  balAmount: { fontSize: 32, fontWeight: 900 },
  balSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 16 },
  balRow: { display: "flex", gap: 16 },
  balStat: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  addBtn: { width: "100%", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 14, padding: "16px", color: "#000", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 20 },
  secTitle: { fontSize: 15, fontWeight: 700, color: "#d1d5db", marginBottom: 12 },
  txCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px", marginBottom: 10 },
  txTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  txBadge: { borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  txAmount: { fontSize: 16, fontWeight: 700 },
  txUser: { fontSize: 12, color: "#f59e0b", marginBottom: 2 },
  txMeta: { fontSize: 13, color: "#9ca3af" },
  txMeta2: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  txNote: { fontSize: 13, color: "#d1d5db", marginTop: 6, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 10px" },
  empty: { textAlign: "center", color: "#6b7280", padding: 40 },
  formCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 20 },
  fieldLabel: { fontSize: 13, color: "#9ca3af", marginBottom: 8, marginTop: 16 },
  typeRow: { display: "flex", gap: 10 },
  typeBtn: { flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", color: "#9ca3af", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  typeBtnActive: { background: "rgba(245,158,11,0.15)", border: "1px solid #f59e0b", color: "#f59e0b" },
  select: { width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" },
  input: { width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" },
  catGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  catBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#9ca3af", fontSize: 13, cursor: "pointer" },
  catBtnActive: { background: "rgba(245,158,11,0.15)", border: "1px solid #f59e0b", color: "#f59e0b" },
  submitBtn: { width: "100%", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 14, padding: "16px", color: "#000", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 20 },
  cancelBtn: { width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", color: "#9ca3af", fontSize: 15, cursor: "pointer", marginTop: 10 },
  successBox: { textAlign: "center", padding: 60, color: "#34d399", fontSize: 18, fontWeight: 700 },
  successIcon: { fontSize: 56, marginBottom: 12 },
  empSec: { fontSize: 13, color: "#f59e0b", fontWeight: 700, marginBottom: 10, marginTop: 4 },
  empCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px", marginBottom: 10 },
  empTop: { display: "flex", alignItems: "center", gap: 12 },
  empName: { fontSize: 15, fontWeight: 600 },
  empSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  empBal: { fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: 1.4 },
  projCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", marginBottom: 8 },
  projName: { fontSize: 14, fontWeight: 600 },
  projSpent: { fontSize: 13, color: "#f87171", marginTop: 4 },
  filterRow: { display: "flex", gap: 10, marginBottom: 14 },
  filterSel: { flex: 1, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "rgba(10,10,15,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", padding: "10px 20px 20px" },
  navBtn: { flex: 1, background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", padding: "8px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 12 },
  navActive: { color: "#f59e0b", background: "rgba(245,158,11,0.1)" },
};
