import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
  onSnapshot, query, where, orderBy,
} from "firebase/firestore";

/* ============================================================
   برنامج محاسبة — صندوق المقاولات فقط
   يدعم إضافة المشاريع والحركات بالدينار العراقي والدولار
   ============================================================ */

/* ---------- إعداد Firebase ----------
   ضع بيانات مشروعك هنا (من Firebase Console → Project settings)
   أو استخدم نفس بيانات تطبيقك الحالي */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- ثوابت ---------- */
const COMPANY = { name: "صندوق المقاولات", color: "#D97706", light: "#FFFBEB" };
const PASS = "1234"; // باسورد الحذف — غيّره

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
  wrap: { maxWidth: 720, margin: "0 auto", padding: "20px 14px" },
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
    marginBottom: 18, display: "flex", alignItems: "center", gap: 6 }}>
    → {label}
  </button>
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
      }}>
        {c === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
      </button>
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
  const [page, setPage] = useState("list");      // list | project
  const [selProject, setSelProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projTxs, setProjTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  /* جلب المشاريع */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 4000);
    const u = onSnapshot(
      query(collection(db, "projects"), where("fundId", "==", "contracting"), orderBy("createdAt", "desc")),
      (snap) => { setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => { u(); clearTimeout(t); };
  }, []);

  /* جلب حركات المشروع المفتوح */
  useEffect(() => {
    if (!selProject) { setProjTxs([]); return; }
    const u = onSnapshot(
      query(collection(db, "project_txs"), where("projectId", "==", selProject.id), orderBy("createdAt", "desc")),
      (snap) => setProjTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => u();
  }, [selProject]);

  /* إضافة مشروع */
  const addProject = async (data) => {
    await addDoc(collection(db, "projects"), {
      fundId: "contracting",
      name: data.name.trim(),
      province: data.province || "",
      client: data.client || "",
      totalDin: Number(data.totalDin) || 0,
      totalDol: Number(data.totalDol) || 0,
      note: data.note || "",
      status: "نشط",
      recDin: 0, recDol: 0, spdDin: 0, spdDol: 0,
      createdAt: new Date().toISOString(),
    });
  };

  /* إضافة حركة (استلام/صرف) */
  const addTx = async (proj, type, currency, amount, note, date) => {
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) return;
    const isDol = currency === "دولار";
    const isRec = type === "إيداع";
    const key = isDol ? (isRec ? "recDol" : "spdDol") : (isRec ? "recDin" : "spdDin");
    await setDoc(doc(db, "projects", proj.id), { [key]: (proj[key] || 0) + amt }, { merge: true });
    await addDoc(collection(db, "project_txs"), {
      projectId: proj.id, projectName: proj.name,
      type, currency, amount: amt, note: note || "", date: date || today(),
      createdAt: new Date().toISOString(),
    });
  };

  /* حذف حركة */
  const deleteTx = async (t, proj) => {
    if (!askPass("حذف الحركة")) return;
    const isDol = t.currency === "دولار";
    const isRec = t.type === "إيداع";
    const key = isDol ? (isRec ? "recDol" : "spdDol") : (isRec ? "recDin" : "spdDin");
    await setDoc(doc(db, "projects", proj.id), { [key]: Math.max(0, (proj[key] || 0) - t.amount) }, { merge: true });
    await deleteDoc(doc(db, "project_txs", t.id));
  };

  /* حذف مشروع */
  const deleteProject = async (id) => {
    if (!askPass("حذف المشروع")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ fontSize: 46 }}>🏗️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>{COMPANY.name}</div>
      <div style={{ fontSize: 13, color: "#64748B" }}>جاري التحميل...</div>
    </div>
  );

  if (page === "project" && selProject)
    return <ProjectDetail
      project={selProject}
      txs={projTxs}
      onBack={() => { setPage("list"); setSelProject(null); }}
      onAddTx={addTx}
      onDeleteTx={(t) => deleteTx(t, selProject)}
      onDelete={(id) => { deleteProject(id); setPage("list"); setSelProject(null); }}
    />;

  return <ProjectsList
    projects={projects}
    onAddProject={addProject}
    onOpenProject={(p) => { setSelProject(p); setPage("project"); }}
  />;
}

/* ============================================================
   شاشة قائمة المشاريع + إضافة مشروع
   ============================================================ */
function ProjectsList({ projects, onAddProject, onOpenProject }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", province: "", client: "", totalDin: "", totalDol: "", note: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim() || saving) return;
    if (!form.totalDin && !form.totalDol) { window.alert("أدخل قيمة المشروع بالدينار أو الدولار"); return; }
    setSaving(true);
    await onAddProject(form);
    setSaving(false);
    setForm({ name: "", province: "", client: "", totalDin: "", totalDol: "", note: "" });
    setShowForm(false);
  };

  /* الإجماليات */
  const tRD = projects.reduce((s, p) => s + (p.recDin || 0), 0);
  const tSD = projects.reduce((s, p) => s + (p.spdDin || 0), 0);
  const tRL = projects.reduce((s, p) => s + (p.recDol || 0), 0);
  const tSL = projects.reduce((s, p) => s + (p.spdDol || 0), 0);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* الترويسة */}
        <div style={{ ...S.card, padding: "18px 22px", marginBottom: 16, borderTop: "5px solid " + COMPANY.color }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: COMPANY.light,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏗️</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>{COMPANY.name}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{projects.length} مشروع</div>
            </div>
          </div>

          {/* ملخص إجمالي */}
          {projects.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
              <Num label="↓ استلام" val={tRD} fmt={fmtDin} color="#16A34A" bg="#F0FDF4" />
              <Num label="↑ صرف" val={tSD} fmt={fmtDin} color="#DC2626" bg="#FFF1F2" />
              <Num label="💰 صافي د.ع" val={tRD - tSD} fmt={fmtDin} color={(tRD - tSD) >= 0 ? COMPANY.color : "#DC2626"} bg="#FFFBEB" />
              {(tRL > 0 || tSL > 0) && <>
                <Num label="↓ استلام $" val={tRL} fmt={fmtDol} color="#2563EB" bg="#EFF6FF" />
                <Num label="↑ صرف $" val={tSL} fmt={fmtDol} color="#DC2626" bg="#FEF2F2" />
                <Num label="💰 صافي $" val={tRL - tSL} fmt={fmtDol} color={(tRL - tSL) >= 0 ? "#2563EB" : "#DC2626"} bg="#EFF6FF" />
              </>}
            </div>
          )}
        </div>

        {/* زر إضافة */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>المشاريع</div>
          <button onClick={() => setShowForm((v) => !v)} style={{ ...S.btn(showForm ? "#64748B" : COMPANY.color), fontSize: 13 }}>
            {showForm ? "✕ إلغاء" : "+ مشروع جديد"}
          </button>
        </div>

        {/* نموذج الإضافة */}
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
              style={{ ...S.btn(form.name.trim() ? COMPANY.color : "#E2E8F0"), width: "100%", borderRadius: 12, padding: "13px",
                color: form.name.trim() ? "#fff" : "#94A3B8" }}>
              {saving ? "جاري..." : "✅ إنشاء المشروع"}
            </button>
          </div>
        )}

        {/* القائمة */}
        {projects.length === 0 && !showForm && (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#94A3B8" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🏗️</div>
            ما في مشاريع بعد — أضف أول مشروع
          </div>
        )}
        {projects.map((p) => <ProjCard key={p.id} proj={p} onOpen={onOpenProject} />)}
      </div>
    </div>
  );
}

/* ---------- بطاقة مشروع ---------- */
function ProjCard({ proj, onOpen }) {
  const bDin = (proj.recDin || 0) - (proj.spdDin || 0);
  const bDol = (proj.recDol || 0) - (proj.spdDol || 0);
  const hasDol = (proj.recDol || 0) > 0 || (proj.spdDol || 0) > 0 || (proj.totalDol || 0) > 0;
  const c = COMPANY.color;
  return (
    <button onClick={() => onOpen(proj)} style={{
      width: "100%", background: "#fff", border: "1px solid #E2E8F0",
      borderRight: "4px solid " + c, borderRadius: 13, padding: "13px 15px", marginBottom: 10,
      cursor: "pointer", textAlign: "right", fontFamily: "Tahoma",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{proj.name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            {proj.province && <span style={{ fontSize: 11, color: "#64748B" }}>📍 {proj.province}</span>}
            {proj.client && <span style={{ fontSize: 11, color: "#64748B" }}>👤 {proj.client}</span>}
          </div>
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
   شاشة تفاصيل المشروع (استلام / صرف / سجل)
   ============================================================ */
function ProjectDetail({ project, txs, onBack, onAddTx, onDeleteTx, onDelete }) {
  const [proj, setProj] = useState(project);
  const [tab, setTab] = useState("deposit");     // deposit | withdraw | history
  const [currency, setCurrency] = useState("دينار");
  const [form, setForm] = useState({ amount: "", note: "", date: today() });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => setProj(project), [project]);

  const amtN = Number(form.amount) || 0;
  const isDol = currency === "دولار";
  const bDin = (proj.recDin || 0) - (proj.spdDin || 0);
  const bDol = (proj.recDol || 0) - (proj.spdDol || 0);
  const avail = isDol ? bDol : bDin;
  const dinTxs = txs.filter((t) => t.currency === "دينار");
  const dolTxs = txs.filter((t) => t.currency === "دولار");

  const save = async () => {
    if (!amtN || saving) return;
    if (tab === "withdraw" && amtN > avail) {
      window.alert("الرصيد غير كافٍ. المتاح: " + (isDol ? fmtDol(avail) : fmtDin(avail)));
      return;
    }
    setSaving(true);
    await onAddTx(proj, tab === "deposit" ? "إيداع" : "سحب", currency, form.amount, form.note, form.date);
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); setForm({ amount: "", note: "", date: today() }); }, 1300);
  };

  const TRow = ({ t }) => {
    const isIn = t.type === "إيداع";
    const isDolT = t.currency === "دولار";
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

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <BackBtn onClick={onBack} label="رجوع للمشاريع" />
          <button onClick={() => { if (askPass("حذف المشروع")) onDelete(proj.id); }}
            style={{ ...S.btn("#FFF1F2"), color: "#DC2626", border: "1px solid #FEE2E2", fontSize: 12 }}>🗑️ حذف المشروع</button>
        </div>

        {/* بطاقة المشروع */}
        <div style={{ ...S.card, padding: 18, marginBottom: 14, borderTop: "5px solid " + COMPANY.color }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{proj.name}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap", marginBottom: 14 }}>
            {proj.province && <span style={{ fontSize: 12, color: "#64748B" }}>📍 {proj.province}</span>}
            {proj.client && <span style={{ fontSize: 12, color: "#64748B" }}>👤 {proj.client}</span>}
          </div>

          {/* حساب الدينار */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 7 }}>🇮🇶 حساب الدينار</div>
            {proj.totalDin > 0 && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 5 }}>قيمة المشروع: <strong>{fmtDin(proj.totalDin)}</strong></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
              <Num label="↓ استلام" val={proj.recDin || 0} fmt={fmtDin} color="#16A34A" bg="#F0FDF4" />
              <Num label="↑ صرف" val={proj.spdDin || 0} fmt={fmtDin} color="#DC2626" bg="#FFF1F2" />
              <Num label="💰 صافي" val={bDin} fmt={fmtDin} color={bDin >= 0 ? COMPANY.color : "#DC2626"} bg="#FFFBEB" />
            </div>
          </div>

          {/* حساب الدولار */}
          {((proj.recDol || 0) > 0 || (proj.spdDol || 0) > 0 || (proj.totalDol || 0) > 0) && (
            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 7 }}>🇺🇸 حساب الدولار</div>
              {proj.totalDol > 0 && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 5 }}>قيمة المشروع: <strong>{fmtDol(proj.totalDol)}</strong></div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                <Num label="↓ استلام" val={proj.recDol || 0} fmt={fmtDol} color="#2563EB" bg="#EFF6FF" />
                <Num label="↑ صرف" val={proj.spdDol || 0} fmt={fmtDol} color="#DC2626" bg="#FEF2F2" />
                <Num label="💰 صافي" val={bDol} fmt={fmtDol} color={bDol >= 0 ? "#2563EB" : "#DC2626"} bg="#EFF6FF" />
              </div>
            </div>
          )}
        </div>

        {/* تبويبات */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 12 }}>
          {[["deposit", "↓ استلام", "#16A34A"], ["withdraw", "↑ صرف", "#DC2626"], ["history", "📋 السجل", "#2563EB"]].map(([id, l, c]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              border: tab === id ? "none" : "1px solid #E2E8F0", borderRadius: 10, padding: "10px 4px",
              cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "Tahoma",
              background: tab === id ? c : "#fff", color: tab === id ? "#fff" : "#64748B",
            }}>{l}</button>
          ))}
        </div>

        {/* نموذج الاستلام / الصرف */}
        {(tab === "deposit" || tab === "withdraw") && (
          <div style={{ ...S.card, padding: 18, marginBottom: 14 }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "14px 0" }}>
                <div style={{ fontSize: 34 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#16A34A", marginTop: 5 }}>تم التسجيل</div>
              </div>
            ) : (
              <>
                <Lbl>العملة</Lbl><CurrBtn value={currency} onChange={setCurrency} />
                {tab === "withdraw" && (
                  <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, background: "#F8FAFC", borderRadius: 8, padding: "7px 12px" }}>
                    المتاح: {isDol ? fmtDol(bDol) : fmtDin(bDin)}
                  </div>
                )}
                <Lbl>المبلغ</Lbl>
                <Inp type="number" placeholder="٠" value={form.amount} onChange={(e) => set("amount")(e.target.value)} autoFocus />
                {tab === "withdraw" && amtN > avail && (
                  <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10, padding: "7px 12px", background: "#FFF1F2", borderRadius: 8 }}>⚠️ تجاوز الرصيد</div>
                )}
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
        {tab === "history" && (
          <div>
            {dinTxs.length > 0 && <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 3, height: 13, background: "#16A34A", borderRadius: 2 }} /> سجل الدينار
              </div>
              {dinTxs.map((t) => <TRow key={t.id} t={t} />)}
            </>}
            {dolTxs.length > 0 && <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", marginTop: 12, marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 3, height: 13, background: "#2563EB", borderRadius: 2 }} /> سجل الدولار
              </div>
              {dolTxs.map((t) => <TRow key={t.id} t={t} />)}
            </>}
            {txs.length === 0 && <div style={{ ...S.card, padding: 24, textAlign: "center", color: "#94A3B8" }}>ما في معاملات بعد</div>}
          </div>
        )}
      </div>
    </div>
  );
}
