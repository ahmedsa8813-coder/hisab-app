import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, setDoc, deleteDoc, getDocs,
  onSnapshot, query, where,
} from "firebase/firestore";

/* ============================================================
   برنامج محاسبة — صندوقان: المقاولات + الشركاء
   • صندوق المقاولات: مشاريع بالدينار والدولار (استلام/صرف).
   • صندوق الشركاء: 4 شركاء (إيهاب 30٪، نور 30٪، محمد 30٪، أحمد 10٪).
   • عند إغلاق مشروع: نافذة توزيع الربح (نسب منفصلة للدينار والدولار)
     بين المقاولات والشركاء، وحصة الشركاء تتوزّع عليهم حسب نسبهم.
   • كل شريك يقدر يسحب من رصيده.
   ============================================================ */

/* ---------- إعداد Firebase (عبّئ بياناتك هنا) ---------- */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};
const app = initializeApp(firebaseConfig);
/* كاش محلي دائم: يعرض الكتابات فوراً من الذاكرة قبل تأكيد الخادم + يعمل بدون إنترنت */
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

/* ---------- ثوابت ---------- */
const FUNDS = [
  { id: "contracting", name: "صندوق المقاولات", icon: "🏗️", color: "#D97706", light: "#FFFBEB" },
  { id: "partners",    name: "صندوق الشركاء",  icon: "👥", color: "#9333EA", light: "#FAF5FF" },
];
const PARTNERS = [
  { id: "ihab",     name: "م. إيهاب", share: 30, color: "#2563EB", light: "#EFF6FF" },
  { id: "nour",     name: "م. نور",   share: 30, color: "#059669", light: "#ECFDF5" },
  { id: "mohammed", name: "محمد",     share: 30, color: "#7C3AED", light: "#F5F3FF" },
  { id: "ahmed",    name: "م. أحمد",  share: 10, color: "#D97706", light: "#FFFBEB" },
];
const PASS = "1234"; // باسورد الحذف والسحب — غيّره

/* ---------- أدوات مساعدة ---------- */
const toAr = (n) => {
  const s = String(Math.round(Math.abs(Number(n) || 0)));
  let r = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ",";
    r += s[i];
  }
  return r;
};
const today = () => new Date().toISOString().split("T")[0];
/* ترتيب من الأحدث للأقدم — نرتّب بالكود بدل orderBy حتى ما نحتاج فهرس Firestore */
const byNewest = (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
const fmtDin = (n) => toAr(n) + " د.ع";
const fmtDol = (n) => toAr(n) + " $";
const askPass = (label) => {
  const pw = window.prompt("🔒 " + label + "\nأدخل الباسورد:");
  if (pw === null) return false;
  if (pw !== PASS) { window.alert("❌ باسورد غلط"); return false; }
  return true;
};

/* ---------- ستايلات مشتركة ---------- */
const S = {
  page: { minHeight: "100vh", background: "#F1F5F9", fontFamily: "Tahoma, sans-serif", direction: "rtl" },
  wrap: { maxWidth: 760, margin: "0 auto", padding: "20px 14px" },
  card: { background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  lbl: { fontSize: 12, color: "#64748B", fontWeight: 600, marginBottom: 5 },
  inp: {
    width: "100%", border: "1px solid #E2E8F0", borderRadius: 10, padding: "11px 14px",
    fontSize: 15, background: "#F8FAFC", color: "#1E293B", outline: "none",
    boxSizing: "border-box", fontFamily: "Tahoma", direction: "rtl", marginBottom: 10,
  },
  btn: (bg, color) => ({
    border: "none", borderRadius: 10, padding: "11px 16px", fontSize: 14,
    fontWeight: 700, fontFamily: "Tahoma", cursor: "pointer", background: bg, color: color || "#fff",
  }),
};
const Lbl = ({ children }) => <div style={S.lbl}>{children}</div>;
const Inp = ({ style, ...p }) => <input style={{ ...S.inp, ...style }} {...p} />;
const BackBtn = ({ onClick, label = "رجوع" }) => (
  <button onClick={onClick} style={{ ...S.btn("#fff"), color: "#64748B", border: "1px solid #E2E8F0",
    marginBottom: 18, display: "flex", alignItems: "center", gap: 6 }}>→ {label}</button>
);
const CurrBtn = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
    {["دينار", "دولار"].map((c) => (
      <button key={c} onClick={() => onChange(c)} style={{
        flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontFamily: "Tahoma",
        fontSize: 13, fontWeight: 700,
        border: "1.5px solid " + (value === c ? (c === "دينار" ? "#16A34A" : "#2563EB") : "#E2E8F0"),
        background: value === c ? (c === "دينار" ? "#F0FDF4" : "#EFF6FF") : "transparent",
        color: value === c ? (c === "دينار" ? "#16A34A" : "#2563EB") : "#64748B",
      }}>{c === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}</button>
    ))}
  </div>
);
const Num = ({ label, val, fmt, color = "#1E293B", bg = "#F8FAFC" }) => (
  <div style={{ background: bg, borderRadius: 10, padding: "10px", textAlign: "center" }}>
    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(val)}</div>
  </div>
);

/* ============================================================
   المكوّن الرئيسي
   ============================================================ */
export default function App() {
  const [page, setPage] = useState("home");        // home | contracting | project | partners
  const [selProject, setSelProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projTxs, setProjTxs] = useState([]);
  const [partnerTxs, setPartnerTxs] = useState([]);
  const [balances, setBalances] = useState({});    // fund_balances
  const [loading, setLoading] = useState(true);

  /* أرصدة الصناديق */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 4000);
    const u = onSnapshot(collection(db, "fund_balances"), (snap) => {
      const b = {};
      snap.docs.forEach((d) => { const x = d.data(); b[d.id] = { din: x.din || 0, dol: x.dol || 0 }; });
      setBalances(b); setLoading(false);
    }, () => setLoading(false));
    return () => { u(); clearTimeout(t); };
  }, []);

  /* مشاريع المقاولات — بدون orderBy (نرتّب بالكود) حتى ما نحتاج فهرس مركّب */
  useEffect(() => {
    const u = onSnapshot(
      query(collection(db, "projects"), where("fundId", "==", "contracting")),
      (snap) => setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest)),
      (err) => console.error("projects listener:", err)
    );
    return () => u();
  }, []);

  /* حركات المشروع المفتوح */
  useEffect(() => {
    if (!selProject) { setProjTxs([]); return; }
    const u = onSnapshot(
      query(collection(db, "project_txs"), where("projectId", "==", selProject.id)),
      (snap) => setProjTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest)),
      (err) => console.error("project_txs listener:", err)
    );
    return () => u();
  }, [selProject?.id]);

  /* مزامنة المشروع المفتوح مع اللقطة الحية — حتى تتحدّث أرقامه فوراً */
  useEffect(() => {
    if (!selProject) return;
    const fresh = projects.find((p) => p.id === selProject.id);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(selProject)) setSelProject(fresh);
  }, [projects, selProject]);

  /* حركات الشركاء */
  useEffect(() => {
    if (page !== "partners") { setPartnerTxs([]); return; }
    const ids = ["partners", ...PARTNERS.map((p) => "partner_" + p.id)];
    const us = ids.map((pId) => onSnapshot(
      query(collection(db, "fund_transactions"), where("fundId", "==", pId)),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPartnerTxs((prev) => [...prev.filter((t) => t.fundId !== pId), ...rows].sort(byNewest));
      },
      (err) => console.error("fund_transactions listener:", err)
    ));
    return () => us.forEach((u) => u());
  }, [page]);

  const getBal = (id) => balances[id] || { din: 0, dol: 0 };

  /* ---------- مشاريع ---------- */
  const addProject = async (data) => {
    await addDoc(collection(db, "projects"), {
      fundId: "contracting", name: data.name.trim(), province: data.province || "", client: data.client || "",
      totalDin: Number(data.totalDin) || 0, totalDol: Number(data.totalDol) || 0, note: data.note || "",
      status: "نشط", recDin: 0, recDol: 0, spdDin: 0, spdDol: 0, createdAt: new Date().toISOString(),
    });
  };

  const addProjectTx = async (proj, type, currency, amount, note, date) => {
    const amt = Math.round(Number(amount)); if (!amt || amt <= 0) return;
    const isDol = currency === "دولار"; const isRec = type === "إيداع";
    const key = isDol ? (isRec ? "recDol" : "spdDol") : (isRec ? "recDin" : "spdDin");
    await setDoc(doc(db, "projects", proj.id), { [key]: (proj[key] || 0) + amt }, { merge: true });
    await addDoc(collection(db, "project_txs"), {
      projectId: proj.id, projectName: proj.name, type, currency, amount: amt,
      note: note || "", date: date || today(), createdAt: new Date().toISOString(),
    });
  };

  const deleteProjectTx = async (t, proj) => {
    if (!askPass("حذف الحركة")) return;
    const isDol = t.currency === "دولار"; const isRec = t.type === "إيداع";
    const key = isDol ? (isRec ? "recDol" : "spdDol") : (isRec ? "recDin" : "spdDin");
    await setDoc(doc(db, "projects", proj.id), { [key]: Math.max(0, (proj[key] || 0) - t.amount) }, { merge: true });
    await deleteDoc(doc(db, "project_txs", t.id));
  };

  const deleteProject = async (id) => {
    if (!askPass("حذف المشروع")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  /* ---------- إغلاق المشروع وتوزيع الأرباح ---------- */
  const closeProject = async (proj, distsDin, distsDol) => {
    const pDin = (proj.recDin || 0) - (proj.spdDin || 0);
    const pDol = (proj.recDol || 0) - (proj.spdDol || 0);

    const distribute = async (dists, profit, isDolR) => {
      for (const d of dists) {
        if (!d.pct || profit <= 0) continue;
        const share = Math.round(profit * d.pct / 100); if (!share) continue;
        const fb = getBal(d.fundId);
        const nDin = isDolR ? fb.din : fb.din + share;
        const nDol = isDolR ? fb.dol + share : fb.dol;
        await setDoc(doc(db, "fund_balances", d.fundId), { din: nDin, dol: nDol }, { merge: true });
        await addDoc(collection(db, "fund_transactions"), {
          fundId: d.fundId, fundName: FUNDS.find((f) => f.id === d.fundId)?.name || "",
          type: "إيداع أرباح", currency: isDolR ? "دولار" : "دينار", amount: share,
          note: d.pct + "٪ ربح — " + proj.name, date: today(), createdAt: new Date().toISOString(),
        });
        /* توزيع حصة الشركاء على الأربعة */
        if (d.fundId === "partners") {
          for (const p of PARTNERS) {
            const ps = Math.round(share * p.share / 100); if (!ps) continue;
            const pId = "partner_" + p.id; const pb = getBal(pId);
            const pDin2 = isDolR ? pb.din : pb.din + ps;
            const pDol2 = isDolR ? pb.dol + ps : pb.dol;
            await setDoc(doc(db, "fund_balances", pId), { din: pDin2, dol: pDol2 }, { merge: true });
            await addDoc(collection(db, "fund_transactions"), {
              fundId: pId, fundName: p.name, type: "إيداع أرباح",
              currency: isDolR ? "دولار" : "دينار", amount: ps,
              note: "حصة " + p.share + "٪ — " + proj.name, date: today(), createdAt: new Date().toISOString(),
            });
          }
        }
      }
    };

    if (pDin > 0) await distribute(distsDin, pDin, false);
    if (pDol > 0) await distribute(distsDol, pDol, true);
    await setDoc(doc(db, "projects", proj.id), { status: "منتهي", closedAt: today() }, { merge: true });
  };

  /* ---------- سحب شريك ---------- */
  const withdrawPartner = async (partnerId, amount, currency, note, date) => {
    const amt = Math.round(Number(amount)); if (!amt || amt <= 0) return false;
    if (!askPass("سحب من رصيد الشريك")) return false;
    const isDol = currency === "دولار";
    const pId = "partner_" + partnerId; const pb = getBal(pId);
    if (isDol && amt > pb.dol) { window.alert("رصيد الدولار غير كافٍ. المتاح: " + fmtDol(pb.dol)); return false; }
    if (!isDol && amt > pb.din) { window.alert("رصيد الدينار غير كافٍ. المتاح: " + fmtDin(pb.din)); return false; }
    const nDin = isDol ? pb.din : pb.din - amt;
    const nDol = isDol ? pb.dol - amt : pb.dol;
    const mb = getBal("partners");
    await setDoc(doc(db, "fund_balances", pId), { din: nDin, dol: nDol }, { merge: true });
    await setDoc(doc(db, "fund_balances", "partners"),
      { din: isDol ? mb.din : mb.din - amt, dol: isDol ? mb.dol - amt : mb.dol }, { merge: true });
    await addDoc(collection(db, "fund_transactions"), {
      fundId: pId, fundName: PARTNERS.find((p) => p.id === partnerId)?.name || "",
      type: "سحب", currency, amount: amt, note: note || "", date: date || today(),
      createdAt: new Date().toISOString(),
    });
    return true;
  };

  const deletePartnerTx = async (tx) => {
    if (!askPass("حذف المعاملة")) return;
    const isDol = tx.currency === "دولار"; const isIn = tx.type === "إيداع أرباح";
    const pb = getBal(tx.fundId);
    const nDin = isDol ? pb.din : (isIn ? pb.din - tx.amount : pb.din + tx.amount);
    const nDol = isDol ? (isIn ? pb.dol - tx.amount : pb.dol + tx.amount) : pb.dol;
    await setDoc(doc(db, "fund_balances", tx.fundId), { din: nDin, dol: nDol }, { merge: true });
    /* عكس الأثر على مجموع الشركاء أيضاً */
    if (tx.fundId.startsWith("partner_")) {
      const mb = getBal("partners");
      const mDin = isDol ? mb.din : (isIn ? mb.din - tx.amount : mb.din + tx.amount);
      const mDol = isDol ? (isIn ? mb.dol - tx.amount : mb.dol + tx.amount) : mb.dol;
      await setDoc(doc(db, "fund_balances", "partners"), { din: mDin, dol: mDol }, { merge: true });
    }
    await deleteDoc(doc(db, "fund_transactions", tx.id));
  };

  /* ---------- تصفية شاملة (مسح كل البيانات) ---------- */
  const resetAll = async () => {
    const pw = window.prompt("⚠️ تصفية شاملة — سيتم مسح كل المشاريع والحركات والأرصدة!\nأدخل الباسورد:");
    if (pw === null) return;
    if (pw !== PASS) { window.alert("❌ باسورد غلط"); return; }
    const c2 = window.prompt('للتأكيد اكتب كلمة: تصفية');
    if (c2 !== "تصفية") { window.alert("تم الإلغاء"); return; }
    try {
      /* تصفير الأرصدة */
      const ids = ["contracting", "partners", ...PARTNERS.map((p) => "partner_" + p.id)];
      for (const id of ids) await setDoc(doc(db, "fund_balances", id), { din: 0, dol: 0 }, { merge: true });
      /* حذف كل الوثائق من المجموعات */
      for (const col of ["projects", "project_txs", "fund_transactions"]) {
        const snap = await getDocs(collection(db, col));
        for (const d of snap.docs) await deleteDoc(doc(db, col, d.id));
      }
      window.alert("✅ تمت التصفية الشاملة — كل البيانات انمسحت");
    } catch (e) {
      window.alert("صار خطأ أثناء التصفية: " + e.message);
    }
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ fontSize: 46 }}>🏗️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>برنامج الحسابات</div>
      <div style={{ fontSize: 13, color: "#64748B" }}>جاري التحميل...</div>
    </div>
  );

  if (page === "partners") return <PartnersPage
    balances={balances} txs={partnerTxs}
    onBack={() => { setPage("home"); setPartnerTxs([]); }}
    onWithdraw={withdrawPartner} onDeleteTx={deletePartnerTx} />;

  if (page === "project" && selProject) return <ProjectDetail
    project={selProject} txs={projTxs}
    onBack={() => { setPage("contracting"); setSelProject(null); }}
    onAddTx={addProjectTx} onDeleteTx={(t) => deleteProjectTx(t, selProject)}
    onClose={closeProject}
    onDelete={(id) => { deleteProject(id); setPage("contracting"); setSelProject(null); }} />;

  if (page === "contracting") return <ContractingPage
    fund={FUNDS[0]} balances={balances} projects={projects}
    onBack={() => setPage("home")}
    onAddProject={addProject}
    onOpenProject={(p) => { setSelProject(p); setPage("project"); }} />;

  return <Home funds={FUNDS} balances={balances}
    onSelect={(id) => setPage(id === "partners" ? "partners" : "contracting")}
    onResetAll={resetAll} />;
}

/* ============================================================
   الصفحة الرئيسية — الصندوقان
   ============================================================ */
function Home({ funds, balances, onSelect, onResetAll }) {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{ ...S.card, padding: "18px 22px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 21, fontWeight: 700, color: "#1E293B" }}>برنامج الحسابات</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>صندوق المقاولات وصندوق الشركاء</div>
          </div>
          <button onClick={onResetAll} title="مسح كل البيانات"
            style={{ ...S.btn("#FFF1F2"), color: "#DC2626", border: "1px solid #FEE2E2", fontSize: 12, whiteSpace: "nowrap" }}>
            ⚠️ تصفية شاملة
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
          {funds.map((f) => {
            const bal = balances[f.id] || { din: 0, dol: 0 };
            return (
              <button key={f.id} onClick={() => onSelect(f.id)} style={{
                ...S.card, padding: "18px", cursor: "pointer", textAlign: "right", borderTop: "4px solid " + f.color }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: f.light,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{f.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>{f.name}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: bal.din >= 0 ? f.color : "#DC2626" }}>
                  {bal.din >= 0 ? "" : "-"}{fmtDin(bal.din)}
                </div>
                {bal.dol !== 0 && <div style={{ fontSize: 14, fontWeight: 700, color: bal.dol >= 0 ? "#2563EB" : "#DC2626" }}>
                  {bal.dol >= 0 ? "" : "-"}{fmtDol(bal.dol)}
                </div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   صفحة المقاولات — قائمة المشاريع + إضافة
   ============================================================ */
function ContractingPage({ fund, balances, projects, onBack, onAddProject, onOpenProject }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", province: "", client: "", totalDin: "", totalDol: "", note: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim() || saving) return;
    if (!form.totalDin && !form.totalDol) { window.alert("أدخل قيمة المشروع بالدينار أو الدولار"); return; }
    setSaving(true); await onAddProject(form); setSaving(false);
    setForm({ name: "", province: "", client: "", totalDin: "", totalDol: "", note: "" });
    setShowForm(false);
  };

  const active = projects.filter((p) => p.status === "نشط");
  const finished = projects.filter((p) => p.status === "منتهي");
  const stored = balances[fund.id] || { din: 0, dol: 0 };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <BackBtn onClick={onBack} label="رجوع للصناديق" />

        <div style={{ ...S.card, padding: 18, marginBottom: 14, borderTop: "5px solid " + fund.color }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: (stored.din !== 0 || stored.dol !== 0) ? 14 : 0 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: fund.light,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{fund.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{fund.name}</div>
          </div>
          {(stored.din !== 0 || stored.dol !== 0) && (
            <div style={{ background: fund.light, borderRadius: 9, padding: "10px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: fund.color, fontWeight: 600 }}>💎 رصيد من أرباح مشاريع مغلقة</div>
              <div style={{ textAlign: "left" }}>
                {stored.din !== 0 && <div style={{ fontSize: 14, fontWeight: 700, color: fund.color }}>{fmtDin(stored.din)}</div>}
                {stored.dol !== 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{fmtDol(stored.dol)}</div>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>مشاريع نشطة ({active.length})</div>
          <button onClick={() => setShowForm((v) => !v)} style={{ ...S.btn(showForm ? "#64748B" : fund.color), fontSize: 13 }}>
            {showForm ? "✕ إلغاء" : "+ مشروع جديد"}
          </button>
        </div>

        {showForm && (
          <div style={{ ...S.card, padding: 18, marginBottom: 14 }}>
            <Lbl>اسم المشروع *</Lbl>
            <Inp placeholder="مثال: إنشاء مبنى تجاري..." value={form.name} onChange={(e) => set("name")(e.target.value)} autoFocus />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><Lbl>المحافظة</Lbl><Inp placeholder="بغداد..." value={form.province} onChange={(e) => set("province")(e.target.value)} style={{ marginBottom: 0 }} /></div>
              <div><Lbl>العميل</Lbl><Inp placeholder="اسم العميل..." value={form.client} onChange={(e) => set("client")(e.target.value)} style={{ marginBottom: 0 }} /></div>
            </div>
            <div style={{ height: 10 }} />
            <div style={{ background: "#F8FAFC", borderRadius: 11, padding: 14, marginBottom: 10, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 10 }}>💰 قيمة المشروع الكلية</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <Lbl>🇮🇶 الدينار</Lbl>
                  <Inp type="number" placeholder="٠" value={form.totalDin} onChange={(e) => set("totalDin")(e.target.value)} style={{ marginBottom: 0, textAlign: "center", fontWeight: 700 }} />
                  {Number(form.totalDin) > 0 && <div style={{ fontSize: 10, color: "#16A34A", marginTop: 3, fontWeight: 600 }}>{fmtDin(form.totalDin)}</div>}
                </div>
                <div>
                  <Lbl>🇺🇸 الدولار</Lbl>
                  <Inp type="number" placeholder="٠" value={form.totalDol} onChange={(e) => set("totalDol")(e.target.value)} style={{ marginBottom: 0, textAlign: "center", fontWeight: 700 }} />
                  {Number(form.totalDol) > 0 && <div style={{ fontSize: 10, color: "#2563EB", marginTop: 3, fontWeight: 600 }}>{fmtDol(form.totalDol)}</div>}
                </div>
              </div>
            </div>
            <Lbl>ملاحظة</Lbl>
            <Inp placeholder="..." value={form.note} onChange={(e) => set("note")(e.target.value)} />
            <button onClick={save} disabled={!form.name.trim() || saving}
              style={{ ...S.btn(form.name.trim() ? fund.color : "#E2E8F0"), width: "100%", borderRadius: 12, padding: "13px",
                color: form.name.trim() ? "#fff" : "#94A3B8" }}>
              {saving ? "جاري..." : "✅ إنشاء المشروع"}
            </button>
          </div>
        )}

        {active.length === 0 && !showForm && (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#94A3B8", marginBottom: 14 }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🏗️</div>ما في مشاريع نشطة
          </div>
        )}
        {active.map((p) => <ProjCard key={p.id} proj={p} fund={fund} onOpen={onOpenProject} />)}

        {finished.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginTop: 20, marginBottom: 10 }}>منتهية ({finished.length})</div>
            {finished.map((p) => <ProjCard key={p.id} proj={p} fund={fund} onOpen={onOpenProject} finished />)}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- بطاقة مشروع ---------- */
function ProjCard({ proj, fund, onOpen, finished = false }) {
  const bDin = (proj.recDin || 0) - (proj.spdDin || 0);
  const bDol = (proj.recDol || 0) - (proj.spdDol || 0);
  const hasDol = (proj.recDol || 0) > 0 || (proj.spdDol || 0) > 0 || (proj.totalDol || 0) > 0;
  const c = finished ? "#94A3B8" : fund.color;
  return (
    <button onClick={() => onOpen(proj)} style={{
      width: "100%", background: finished ? "#FAFAFA" : "#fff", border: "1px solid #E2E8F0",
      borderRight: "4px solid " + c, borderRadius: 13, padding: "13px 15px", marginBottom: 10,
      cursor: "pointer", textAlign: "right", fontFamily: "Tahoma", opacity: finished ? 0.9 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: finished ? "#64748B" : "#1E293B" }}>{proj.name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            {proj.province && <span style={{ fontSize: 11, color: "#64748B" }}>📍 {proj.province}</span>}
            {proj.client && <span style={{ fontSize: 11, color: "#64748B" }}>👤 {proj.client}</span>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, marginTop: 4, display: "inline-block",
            background: finished ? "#F1F5F9" : "#DCFCE7", color: finished ? "#64748B" : "#16A34A" }}>
            {finished ? "✓ منتهي" : "● نشط"}
          </span>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 9, color: "#94A3B8" }}>الصافي</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: bDin >= 0 ? c : "#DC2626" }}>{bDin >= 0 ? "" : "-"}{fmtDin(bDin)}</div>
          {hasDol && <div style={{ fontSize: 12, fontWeight: 700, color: bDol >= 0 ? "#2563EB" : "#DC2626" }}>{bDol >= 0 ? "" : "-"}{fmtDol(bDol)}</div>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: hasDol ? "1fr 1fr 1fr 1fr" : "1fr 1fr", gap: 5 }}>
        <div style={{ background: "#F0FDF4", borderRadius: 7, padding: "5px 8px" }}>
          <div style={{ fontSize: 9, color: "#64748B" }}>↓ د.ع</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A" }}>{fmtDin(proj.recDin || 0)}</div>
        </div>
        <div style={{ background: "#FFF1F2", borderRadius: 7, padding: "5px 8px" }}>
          <div style={{ fontSize: 9, color: "#64748B" }}>↑ د.ع</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>{fmtDin(proj.spdDin || 0)}</div>
        </div>
        {hasDol && <>
          <div style={{ background: "#EFF6FF", borderRadius: 7, padding: "5px 8px" }}>
            <div style={{ fontSize: 9, color: "#64748B" }}>↓ $</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB" }}>{fmtDol(proj.recDol || 0)}</div>
          </div>
          <div style={{ background: "#FEF2F2", borderRadius: 7, padding: "5px 8px" }}>
            <div style={{ fontSize: 9, color: "#64748B" }}>↑ $</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>{fmtDol(proj.spdDol || 0)}</div>
          </div>
        </>}
      </div>
    </button>
  );
}

/* ============================================================
   تفاصيل المشروع (استلام / صرف / سجل / إغلاق)
   ============================================================ */
function ProjectDetail({ project, txs, onBack, onAddTx, onDeleteTx, onClose, onDelete }) {
  const [proj, setProj] = useState(project);
  const [tab, setTab] = useState("deposit");
  const [currency, setCurrency] = useState("دينار");
  const [form, setForm] = useState({ amount: "", note: "", date: today() });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  /* توزيع افتراضي: 0٪ مقاولات، 100٪ شركاء */
  const mkDists = () => [
    { fundId: "contracting", pct: 0, name: "صندوق المقاولات" },
    { fundId: "partners", pct: 100, name: "صندوق الشركاء" },
  ];
  const [distsDin, setDistsDin] = useState(mkDists());
  const [distsDol, setDistsDol] = useState(mkDists());

  useEffect(() => setProj(project), [project]);

  const amtN = Number(form.amount) || 0;
  const isDol = currency === "دولار";
  const bDin = (proj.recDin || 0) - (proj.spdDin || 0);
  const bDol = (proj.recDol || 0) - (proj.spdDol || 0);
  const avail = isDol ? bDol : bDin;
  const isAct = proj.status === "نشط";
  const ttlDin = distsDin.reduce((s, d) => s + Number(d.pct), 0);
  const ttlDol = distsDol.reduce((s, d) => s + Number(d.pct), 0);
  const dinTxs = txs.filter((t) => t.currency === "دينار");
  const dolTxs = txs.filter((t) => t.currency === "دولار");

  const save = async () => {
    if (!amtN || saving) return;
    if (tab === "withdraw" && amtN > avail) { window.alert("الرصيد غير كافٍ. المتاح: " + (isDol ? fmtDol(avail) : fmtDin(avail))); return; }
    /* تحديث تفاؤلي فوري — الأرقام تتغيّر باللحظة قبل رجوع Firebase */
    const amt = Math.round(amtN);
    const isRec = tab === "deposit";
    const key = isDol ? (isRec ? "recDol" : "spdDol") : (isRec ? "recDin" : "spdDin");
    setProj((prev) => ({ ...prev, [key]: (prev[key] || 0) + amt }));
    setSaving(true);
    await onAddTx(proj, isRec ? "إيداع" : "سحب", currency, form.amount, form.note, form.date);
    setSaving(false); setDone(true);
    setTimeout(() => { setDone(false); setForm({ amount: "", note: "", date: today() }); }, 900);
  };

  const doClose = async () => {
    if ((bDin > 0 && Math.round(ttlDin) !== 100) || (bDol > 0 && Math.round(ttlDol) !== 100)) {
      window.alert("مجموع النسب يجب أن يساوي 100٪"); return;
    }
    setClosing(true);
    await onClose(proj,
      bDin > 0 ? distsDin.map((d) => ({ fundId: d.fundId, pct: Number(d.pct) })) : [],
      bDol > 0 ? distsDol.map((d) => ({ fundId: d.fundId, pct: Number(d.pct) })) : []);
    setClosing(false); setShowClose(false);
  };

  /* صف نسبة داخل نافذة الإغلاق */
  const DR = ({ d, i, dists, setDists, profit, isDolR }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "#F8FAFC", borderRadius: 9, padding: "9px 12px" }}>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{d.name}</div>
      <input type="number" min="0" max="100" value={d.pct}
        onChange={(e) => { const v = [...dists]; v[i] = { ...v[i], pct: Number(e.target.value) }; setDists(v); }}
        style={{ width: 58, border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 8px", fontSize: 15, fontWeight: 700, textAlign: "center", outline: "none", fontFamily: "Tahoma" }} />
      <span style={{ fontSize: 13, color: "#64748B" }}>٪</span>
      <div style={{ fontSize: 12, fontWeight: 700, minWidth: 90, textAlign: "left", color: isDolR ? "#2563EB" : "#16A34A" }}>
        {isDolR ? fmtDol(Math.round(profit * d.pct / 100)) : fmtDin(Math.round(profit * d.pct / 100))}
      </div>
    </div>
  );

  const TRow = ({ t }) => {
    const isIn = t.type === "إيداع"; const isDolT = t.currency === "دولار";
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: "10px 13px", marginBottom: 7,
        border: "1px solid " + (isIn ? "#DCFCE7" : "#FEE2E2"), borderRight: "4px solid " + (isIn ? "#16A34A" : "#DC2626") }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: isIn ? "#16A34A" : "#DC2626" }}>{isIn ? "↓ استلام" : "↑ صرف"}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>📅 {t.date}</div>
            {t.note && <div style={{ fontSize: 11, color: "#1E293B", marginTop: 1 }}>{t.note}</div>}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: isIn ? "#16A34A" : "#DC2626" }}>
              {isIn ? "+" : "-"}{isDolT ? fmtDol(t.amount) : fmtDin(t.amount)}
            </div>
            <button onClick={() => onDeleteTx(t)} style={{ background: "transparent", border: "none", color: "#DC2626",
              fontSize: 11, cursor: "pointer", fontFamily: "Tahoma", padding: "2px 0", fontWeight: 600 }}>🗑️ حذف</button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- تقرير مطبوع (يفتح نافذة طباعة / حفظ PDF) ---------- */
  const printReport = () => {
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const rows = txs
      .slice()
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((t) => {
        const isIn = t.type === "إيداع";
        const amt = t.currency === "دولار" ? fmtDol(t.amount) : fmtDin(t.amount);
        return `<tr>
          <td>${esc(t.date)}</td>
          <td class="${isIn ? "in" : "out"}">${isIn ? "استلام" : "صرف"}</td>
          <td>${t.currency === "دولار" ? "دولار 🇺🇸" : "دينار 🇮🇶"}</td>
          <td class="num ${isIn ? "in" : "out"}">${isIn ? "+" : "−"} ${esc(amt)}</td>
          <td>${esc(t.note)}</td>
        </tr>`;
      }).join("");

    const dinBlock = `
      <div class="acc">
        <h3 class="din">🇮🇶 حساب الدينار</h3>
        ${proj.totalDin > 0 ? `<p class="sub">قيمة المشروع: <b>${fmtDin(proj.totalDin)}</b></p>` : ""}
        <table class="sum">
          <tr><td>الاستلام</td><td class="num in">${fmtDin(proj.recDin || 0)}</td></tr>
          <tr><td>الصرف</td><td class="num out">${fmtDin(proj.spdDin || 0)}</td></tr>
          <tr class="net"><td>الصافي (الربح)</td><td class="num">${bDin >= 0 ? "" : "−"}${fmtDin(bDin)}</td></tr>
        </table>
      </div>`;
    const hasDol = (proj.recDol || 0) > 0 || (proj.spdDol || 0) > 0 || (proj.totalDol || 0) > 0;
    const dolBlock = hasDol ? `
      <div class="acc">
        <h3 class="dol">🇺🇸 حساب الدولار</h3>
        ${proj.totalDol > 0 ? `<p class="sub">قيمة المشروع: <b>${fmtDol(proj.totalDol)}</b></p>` : ""}
        <table class="sum">
          <tr><td>الاستلام</td><td class="num in">${fmtDol(proj.recDol || 0)}</td></tr>
          <tr><td>الصرف</td><td class="num out">${fmtDol(proj.spdDol || 0)}</td></tr>
          <tr class="net"><td>الصافي (الربح)</td><td class="num">${bDol >= 0 ? "" : "−"}${fmtDol(bDol)}</td></tr>
        </table>
      </div>` : "";

    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
      <title>تقرير المشروع — ${esc(proj.name)}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Tahoma,Arial,sans-serif;color:#1E293B;margin:0;padding:28px;background:#fff}
        .head{text-align:center;border-bottom:3px solid #D97706;padding-bottom:14px;margin-bottom:18px}
        .head h1{margin:0;font-size:22px} .head .status{font-size:12px;color:#64748B;margin-top:4px}
        .meta{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:#475569;margin-bottom:18px}
        .meta b{color:#1E293B}
        .accs{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px}
        .acc{flex:1;min-width:240px;border:1px solid #E2E8F0;border-radius:10px;padding:14px}
        .acc h3{margin:0 0 8px;font-size:14px} .acc h3.din{color:#16A34A} .acc h3.dol{color:#2563EB}
        .acc .sub{font-size:12px;color:#64748B;margin:0 0 8px}
        table.sum{width:100%;border-collapse:collapse;font-size:13px}
        table.sum td{padding:6px 4px;border-bottom:1px solid #F1F5F9}
        table.sum tr.net td{border-top:2px solid #E2E8F0;border-bottom:none;font-weight:700;font-size:14px}
        h2{font-size:15px;margin:0 0 10px;border-right:4px solid #D97706;padding-right:8px}
        table.log{width:100%;border-collapse:collapse;font-size:12px}
        table.log th{background:#F8FAFC;text-align:right;padding:8px 6px;border-bottom:2px solid #E2E8F0;font-size:12px}
        table.log td{padding:7px 6px;border-bottom:1px solid #F1F5F9}
        .num{text-align:left;font-weight:700;white-space:nowrap} .in{color:#16A34A} .out{color:#DC2626}
        .empty{color:#94A3B8;text-align:center;padding:16px;font-size:13px}
        .foot{margin-top:26px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:10px}
        @media print{body{padding:0}}
      </style></head><body>
      <div class="head">
        <h1>${esc(proj.name)}</h1>
        <div class="status">تقرير المشروع • ${isAct ? "نشط ●" : "منتهي ✓"} • تاريخ الطباعة: ${today()}</div>
      </div>
      <div class="meta">
        ${proj.province ? `<div>📍 المحافظة: <b>${esc(proj.province)}</b></div>` : ""}
        ${proj.client ? `<div>👤 العميل: <b>${esc(proj.client)}</b></div>` : ""}
        ${proj.note ? `<div>📝 ملاحظة: <b>${esc(proj.note)}</b></div>` : ""}
      </div>
      <div class="accs">${dinBlock}${dolBlock}</div>
      <h2>سجل الحركات (${txs.length})</h2>
      ${txs.length ? `<table class="log">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>العملة</th><th>المبلغ</th><th>الملاحظة</th></tr></thead>
        <tbody>${rows}</tbody></table>` : `<div class="empty">لا توجد حركات</div>`}
      <div class="foot">تم إنشاء التقرير بواسطة برنامج الحسابات</div>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;

    const w = window.open("", "_blank");
    if (!w) { window.alert("فعّل النوافذ المنبثقة (Pop-ups) للطباعة"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <BackBtn onClick={onBack} label="رجوع للمقاولات" />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={printReport}
              style={{ ...S.btn("#EFF6FF"), color: "#2563EB", border: "1px solid #BFDBFE", fontSize: 12 }}>🖨️ طباعة التقرير</button>
            {!isAct && <button onClick={() => { if (askPass("حذف المشروع")) onDelete(proj.id); }}
              style={{ ...S.btn("#FFF1F2"), color: "#DC2626", border: "1px solid #FEE2E2", fontSize: 12 }}>🗑️ حذف المشروع</button>}
          </div>
        </div>

        {/* بطاقة المشروع */}
        <div style={{ ...S.card, padding: 18, marginBottom: 14, borderTop: "5px solid " + (isAct ? "#D97706" : "#94A3B8") }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{proj.name}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                {proj.province && <span style={{ fontSize: 12, color: "#64748B" }}>📍 {proj.province}</span>}
                {proj.client && <span style={{ fontSize: 12, color: "#64748B" }}>👤 {proj.client}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, marginTop: 5, display: "inline-block",
                background: isAct ? "#DCFCE7" : "#F1F5F9", color: isAct ? "#16A34A" : "#64748B" }}>
                {isAct ? "● نشط" : "✓ منتهي"}
              </span>
            </div>
            {isAct && <button onClick={() => setShowClose(true)} style={{ ...S.btn("#9333EA"), fontSize: 13 }}>🏁 إغلاق</button>}
          </div>

          {/* دينار */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 7 }}>🇮🇶 حساب الدينار</div>
            {proj.totalDin > 0 && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 5 }}>قيمة المشروع: <strong>{fmtDin(proj.totalDin)}</strong></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
              <Num label="↓ استلام" val={proj.recDin || 0} fmt={fmtDin} color="#16A34A" bg="#F0FDF4" />
              <Num label="↑ صرف" val={proj.spdDin || 0} fmt={fmtDin} color="#DC2626" bg="#FFF1F2" />
              <Num label="💰 ربح" val={bDin} fmt={fmtDin} color={bDin >= 0 ? "#D97706" : "#DC2626"} bg="#FFFBEB" />
            </div>
          </div>

          {/* دولار */}
          {((proj.recDol || 0) > 0 || (proj.spdDol || 0) > 0 || (proj.totalDol || 0) > 0) && (
            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 7 }}>🇺🇸 حساب الدولار</div>
              {proj.totalDol > 0 && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 5 }}>قيمة المشروع: <strong>{fmtDol(proj.totalDol)}</strong></div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                <Num label="↓ استلام" val={proj.recDol || 0} fmt={fmtDol} color="#2563EB" bg="#EFF6FF" />
                <Num label="↑ صرف" val={proj.spdDol || 0} fmt={fmtDol} color="#DC2626" bg="#FEF2F2" />
                <Num label="💰 ربح" val={bDol} fmt={fmtDol} color={bDol >= 0 ? "#2563EB" : "#DC2626"} bg="#EFF6FF" />
              </div>
            </div>
          )}
        </div>

        {/* تبويبات */}
        {isAct && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 12 }}>
            {[["deposit", "↓ استلام", "#16A34A"], ["withdraw", "↑ صرف", "#DC2626"], ["history", "📋 السجل", "#2563EB"]].map(([id, l, c]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                border: tab === id ? "none" : "1px solid #E2E8F0", borderRadius: 10, padding: "10px 4px",
                cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "Tahoma",
                background: tab === id ? c : "#fff", color: tab === id ? "#fff" : "#64748B" }}>{l}</button>
            ))}
          </div>
        )}

        {/* استلام / صرف */}
        {isAct && (tab === "deposit" || tab === "withdraw") && (
          <div style={{ ...S.card, padding: 18, marginBottom: 14 }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "14px 0" }}>
                <div style={{ fontSize: 34 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#16A34A", marginTop: 5 }}>تم التسجيل</div>
              </div>
            ) : (
              <>
                <Lbl>العملة</Lbl><CurrBtn value={currency} onChange={setCurrency} />
                {tab === "withdraw" && <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, background: "#F8FAFC", borderRadius: 8, padding: "7px 12px" }}>المتاح: {isDol ? fmtDol(bDol) : fmtDin(bDin)}</div>}
                <Lbl>المبلغ</Lbl>
                <Inp type="number" placeholder="٠" value={form.amount} onChange={(e) => set("amount")(e.target.value)} autoFocus />
                {tab === "withdraw" && amtN > avail && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10, padding: "7px 12px", background: "#FFF1F2", borderRadius: 8 }}>⚠️ تجاوز الرصيد</div>}
                <Lbl>التاريخ</Lbl><Inp type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} />
                <Lbl>ملاحظة</Lbl><Inp placeholder="..." value={form.note} onChange={(e) => set("note")(e.target.value)} />
                <button onClick={save} disabled={!amtN || saving || (tab === "withdraw" && amtN > avail)}
                  style={{ ...S.btn((amtN && (tab === "deposit" || amtN <= avail)) ? (tab === "deposit" ? "#16A34A" : "#DC2626") : "#E2E8F0"),
                    width: "100%", borderRadius: 12, padding: "13px",
                    color: (amtN && (tab === "deposit" || amtN <= avail)) ? "#fff" : "#94A3B8" }}>
                  {saving ? "جاري..." : (tab === "deposit" ? "↓ تأكيد الاستلام" : "↑ تأكيد الصرف")}
                </button>
              </>
            )}
          </div>
        )}

        {/* السجل */}
        {(!isAct || tab === "history") && (
          <div>
            {dinTxs.length > 0 && <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", marginBottom: 7 }}>سجل الدينار</div>
              {dinTxs.map((t) => <TRow key={t.id} t={t} />)}
            </>}
            {dolTxs.length > 0 && <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", marginTop: 12, marginBottom: 7 }}>سجل الدولار</div>
              {dolTxs.map((t) => <TRow key={t.id} t={t} />)}
            </>}
            {txs.length === 0 && <div style={{ ...S.card, padding: 24, textAlign: "center", color: "#94A3B8" }}>ما في معاملات بعد</div>}
          </div>
        )}

        {/* نافذة الإغلاق */}
        {showClose && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto" }}>
              <div style={{ padding: "15px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#9333EA" }}>🏁 إغلاق المشروع وتوزيع الأرباح</div>
                <button onClick={() => setShowClose(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748B" }}>✕</button>
              </div>
              <div style={{ padding: "14px 20px" }}>
                {/* ملخص */}
                <div style={{ background: "#F8FAFC", borderRadius: 11, padding: 13, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 9 }}>الحساب الختامي</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>استلام</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>{fmtDin(proj.recDin || 0)}</div>
                      {(proj.recDol || 0) > 0 && <div style={{ fontSize: 10, color: "#2563EB" }}>{fmtDol(proj.recDol)}</div>}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>صرف</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>{fmtDin(proj.spdDin || 0)}</div>
                      {(proj.spdDol || 0) > 0 && <div style={{ fontSize: 10, color: "#DC2626" }}>{fmtDol(proj.spdDol)}</div>}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>الربح</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: bDin >= 0 ? "#16A34A" : "#DC2626" }}>{bDin >= 0 ? "+" : "-"}{fmtDin(bDin)}</div>
                      {bDol !== 0 && <div style={{ fontSize: 10, fontWeight: 700, color: bDol >= 0 ? "#2563EB" : "#DC2626" }}>{bDol >= 0 ? "+" : "-"}{fmtDol(bDol)}</div>}
                    </div>
                  </div>
                </div>

                {bDin <= 0 && bDol <= 0 && (
                  <div style={{ background: "#FFF1F2", borderRadius: 9, padding: 12, marginBottom: 14, fontSize: 12, color: "#DC2626", fontWeight: 600, textAlign: "center" }}>
                    لا يوجد ربح للتوزيع — سيتم إغلاق المشروع فقط
                  </div>
                )}

                {bDin > 0 && <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", marginBottom: 7 }}>🇮🇶 توزيع ربح الدينار ({fmtDin(bDin)})</div>
                  {distsDin.map((d, i) => <DR key={d.fundId} d={d} i={i} dists={distsDin} setDists={setDistsDin} profit={bDin} isDolR={false} />)}
                  <div style={{ padding: "7px", borderRadius: 8, textAlign: "center", marginBottom: 14, background: Math.round(ttlDin) === 100 ? "#F0FDF4" : "#FFF1F2" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: Math.round(ttlDin) === 100 ? "#16A34A" : "#DC2626" }}>المجموع: {ttlDin}٪</span>
                  </div>
                </>}

                {bDol > 0 && <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", marginBottom: 7 }}>🇺🇸 توزيع ربح الدولار ({fmtDol(bDol)})</div>
                  {distsDol.map((d, i) => <DR key={d.fundId} d={d} i={i} dists={distsDol} setDists={setDistsDol} profit={bDol} isDolR={true} />)}
                  <div style={{ padding: "7px", borderRadius: 8, textAlign: "center", marginBottom: 14, background: Math.round(ttlDol) === 100 ? "#EFF6FF" : "#FFF1F2" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: Math.round(ttlDol) === 100 ? "#2563EB" : "#DC2626" }}>المجموع: {ttlDol}٪</span>
                  </div>
                </>}

                <button onClick={doClose} disabled={closing}
                  style={{ ...S.btn("#9333EA"), width: "100%", borderRadius: 12, padding: "13px" }}>
                  {closing ? "جاري الإغلاق..." : "🏁 تأكيد الإغلاق والتوزيع"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   صفحة الشركاء — أرصدة + سحب + سجل
   ============================================================ */
function PartnersPage({ balances, txs, onBack, onWithdraw, onDeleteTx }) {
  const [selP, setSelP] = useState(null);          // شريك مفتوح للسحب/السجل
  const getBal = (id) => balances[id] || { din: 0, dol: 0 };
  const total = getBal("partners");

  if (selP) {
    const pb = getBal("partner_" + selP.id);
    const myTxs = txs.filter((t) => t.fundId === "partner_" + selP.id);
    return <PartnerDetail partner={selP} bal={pb} txs={myTxs}
      onBack={() => setSelP(null)} onWithdraw={onWithdraw} onDeleteTx={onDeleteTx} />;
  }

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <BackBtn onClick={onBack} label="رجوع للصناديق" />

        <div style={{ ...S.card, padding: 18, marginBottom: 16, borderTop: "5px solid #9333EA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#FAF5FF",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👥</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>صندوق الشركاء</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Num label="💰 إجمالي الدينار" val={total.din} fmt={fmtDin} color="#9333EA" bg="#FAF5FF" />
            <Num label="💵 إجمالي الدولار" val={total.dol} fmt={fmtDol} color="#2563EB" bg="#EFF6FF" />
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>الشركاء</div>
        {PARTNERS.map((p) => {
          const b = getBal("partner_" + p.id);
          return (
            <button key={p.id} onClick={() => setSelP(p)} style={{
              width: "100%", ...S.card, borderRight: "4px solid " + p.color, padding: "14px 16px", marginBottom: 10,
              cursor: "pointer", textAlign: "right", fontFamily: "Tahoma",
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: p.light, color: p.color,
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>{p.share}٪</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>{p.name}</div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: p.color }}>{fmtDin(b.din)}</div>
                {b.dol !== 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#2563EB" }}>{fmtDol(b.dol)}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- تفاصيل شريك (سحب + سجل) ---------- */
function PartnerDetail({ partner, bal, txs, onBack, onWithdraw, onDeleteTx }) {
  const [currency, setCurrency] = useState("دينار");
  const [form, setForm] = useState({ amount: "", note: "", date: today() });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const amtN = Number(form.amount) || 0;
  const isDol = currency === "دولار";
  const avail = isDol ? bal.dol : bal.din;

  const save = async () => {
    if (!amtN || saving) return;
    setSaving(true);
    const ok = await onWithdraw(partner.id, form.amount, currency, form.note, form.date);
    setSaving(false);
    if (ok) { setDone(true); setTimeout(() => { setDone(false); setForm({ amount: "", note: "", date: today() }); }, 1300); }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <BackBtn onClick={onBack} label="رجوع للشركاء" />

        <div style={{ ...S.card, padding: 18, marginBottom: 14, borderTop: "5px solid " + partner.color }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 23, background: partner.light, color: partner.color,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{partner.share}٪</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{partner.name}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Num label="رصيد الدينار" val={bal.din} fmt={fmtDin} color={partner.color} bg={partner.light} />
            <Num label="رصيد الدولار" val={bal.dol} fmt={fmtDol} color="#2563EB" bg="#EFF6FF" />
          </div>
        </div>

        {/* سحب */}
        <div style={{ ...S.card, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", marginBottom: 12 }}>↑ سحب من الرصيد</div>
          {done ? (
            <div style={{ textAlign: "center", padding: "14px 0" }}>
              <div style={{ fontSize: 34 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#16A34A", marginTop: 5 }}>تم السحب</div>
            </div>
          ) : (
            <>
              <Lbl>العملة</Lbl><CurrBtn value={currency} onChange={setCurrency} />
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, background: "#F8FAFC", borderRadius: 8, padding: "7px 12px" }}>المتاح: {isDol ? fmtDol(bal.dol) : fmtDin(bal.din)}</div>
              <Lbl>المبلغ</Lbl>
              <Inp type="number" placeholder="٠" value={form.amount} onChange={(e) => set("amount")(e.target.value)} />
              {amtN > avail && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10, padding: "7px 12px", background: "#FFF1F2", borderRadius: 8 }}>⚠️ تجاوز الرصيد</div>}
              <Lbl>التاريخ</Lbl><Inp type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} />
              <Lbl>ملاحظة</Lbl><Inp placeholder="..." value={form.note} onChange={(e) => set("note")(e.target.value)} />
              <button onClick={save} disabled={!amtN || saving || amtN > avail}
                style={{ ...S.btn((amtN && amtN <= avail) ? "#DC2626" : "#E2E8F0"), width: "100%", borderRadius: 12, padding: "13px",
                  color: (amtN && amtN <= avail) ? "#fff" : "#94A3B8" }}>
                {saving ? "جاري..." : "↑ تأكيد السحب"}
              </button>
            </>
          )}
        </div>

        {/* السجل */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 10 }}>سجل الحركات</div>
        {txs.length === 0 && <div style={{ ...S.card, padding: 24, textAlign: "center", color: "#94A3B8" }}>ما في حركات بعد</div>}
        {txs.map((t) => {
          const isIn = t.type === "إيداع أرباح"; const isDolT = t.currency === "دولار";
          return (
            <div key={t.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 13px", marginBottom: 7,
              border: "1px solid " + (isIn ? "#DCFCE7" : "#FEE2E2"), borderRight: "4px solid " + (isIn ? "#16A34A" : "#DC2626") }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isIn ? "#16A34A" : "#DC2626" }}>{isIn ? "↓ إيداع أرباح" : "↑ سحب"}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>📅 {t.date}</div>
                  {t.note && <div style={{ fontSize: 11, color: "#1E293B", marginTop: 1 }}>{t.note}</div>}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isIn ? "#16A34A" : "#DC2626" }}>
                    {isIn ? "+" : "-"}{isDolT ? fmtDol(t.amount) : fmtDin(t.amount)}
                  </div>
                  <button onClick={() => onDeleteTx(t)} style={{ background: "transparent", border: "none", color: "#DC2626",
                    fontSize: 11, cursor: "pointer", fontFamily: "Tahoma", padding: "2px 0", fontWeight: 600 }}>🗑️ حذف</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
