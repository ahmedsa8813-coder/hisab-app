import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, deleteDoc,
         onSnapshot, query, orderBy, limit } from "firebase/firestore";

// ══════════════════════════════════════════
// Firebase
// ══════════════════════════════════════════
const app = initializeApp({
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
});
const db = getFirestore(app);

// ══════════════════════════════════════════
// ثوابت
// ══════════════════════════════════════════
const C = {
  bg:     "#F7F4EF",
  card:   "#FFFFFF",
  border: "#E5DDD4",
  text:   "#1C1410",
  muted:  "#8A7060",
  gold:   "#B8860B",
  green:  "#166534",
  red:    "#991B1B",
};

const toAr = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const today = () => new Date().toISOString().split("T")[0];
const fmtN  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ"));
const fmtD  = n => fmtN(n) + " د.ع";
const fmt   = (n, c) => c === "دولار" ? fmtN(n) + " $" : fmtD(n);

// ══════════════════════════════════════════
// Styles
// ══════════════════════════════════════════
const S = {
  page:  { minHeight:"100vh", background:C.bg,
           fontFamily:"Tahoma, Arial, sans-serif",
           direction:"rtl", color:C.text, paddingBottom:80 },
  card:  { background:C.card, border:`1px solid ${C.border}`,
           borderRadius:16, padding:16, marginBottom:12,
           boxShadow:"0 1px 6px rgba(0,0,0,0.05)" },
  inp:   { width:"100%", border:`1px solid ${C.border}`, borderRadius:10,
           padding:"12px 14px", fontSize:15, background:C.bg, color:C.text,
           outline:"none", boxSizing:"border-box",
           fontFamily:"Tahoma, Arial, sans-serif", direction:"rtl" },
  sel:   { width:"100%", border:`1px solid ${C.border}`, borderRadius:10,
           padding:"12px 14px", fontSize:14, background:C.bg, color:C.text,
           outline:"none", boxSizing:"border-box", direction:"rtl" },
  btn:   { border:"none", borderRadius:12, padding:"14px 20px", fontSize:15,
           fontWeight:700, cursor:"pointer",
           fontFamily:"Tahoma, Arial, sans-serif",
           width:"100%", transition:"opacity 0.15s" },
  lbl:   { fontSize:12, color:"#8A7060", fontWeight:700,
           marginBottom:6, display:"block" },
};

// ══════════════════════════════════════════
// مكونات مشتركة
// ══════════════════════════════════════════
const Lbl = ({children}) => <div style={S.lbl}>{children}</div>;

const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{
    background:"transparent", border:`1px solid ${C.border}`,
    borderRadius:10, padding:"8px 16px", fontSize:13,
    color:C.muted, cursor:"pointer", fontFamily:"Tahoma",
  }}>← رجوع</button>
);

const Empty = ({icon, text}) => (
  <div style={{textAlign:"center", padding:"60px 20px", color:C.muted}}>
    <div style={{fontSize:48, marginBottom:10}}>{icon}</div>
    <div style={{fontWeight:600, fontSize:15}}>{text}</div>
  </div>
);

// ══════════════════════════════════════════
// صفحة إضافة استلام
// ══════════════════════════════════════════
function AddReceiptPage({ projects, onBack, onSave }) {
  const [form, setForm] = useState({
    source: "",      // project id أو "" للعام
    amount: "",
    currency: "دينار",
    note: "",
    date: today(),
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const valid = form.amount && Number(form.amount) > 0 && form.date;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await onSave({
      type:      "استلام",
      amount:    Number(form.amount),
      currency:  form.currency,
      projectId: form.source,
      note:      form.note,
      date:      form.date,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setForm({ source:"", amount:"", currency:"دينار", note:"", date:today() });
    }, 1600);
  };

  if (done) return (
    <div style={{ textAlign:"center", padding:"100px 20px" }}>
      <div style={{ fontSize:64, marginBottom:12 }}>✅</div>
      <div style={{ fontSize:20, fontWeight:800, color:C.green }}>تم تسجيل الاستلام</div>
    </div>
  );

  return (
    <div style={{ padding:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <BackBtn onClick={onBack} />
        <div style={{ fontSize:19, fontWeight:800, color:C.green }}>↓ تسجيل استلام</div>
      </div>

      {/* المصدر */}
      <Lbl>المصدر</Lbl>
      <select style={{ ...S.sel, marginBottom:16 }}
        value={form.source} onChange={e => set("source")(e.target.value)}>
        <option value="">📦 صندوق عام</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>🏗️ {p.name}</option>
        ))}
      </select>

      {/* المبلغ */}
      <Lbl>المبلغ</Lbl>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input
          style={{ ...S.inp, flex:2, fontSize:22, fontWeight:800, textAlign:"center" }}
          type="number" placeholder="٠"
          value={form.amount} onChange={e => set("amount")(e.target.value)}
          autoFocus
        />
        <select style={{ ...S.sel, flex:1 }}
          value={form.currency} onChange={e => set("currency")(e.target.value)}>
          <option value="دينار">🇮🇶 دينار</option>
          <option value="دولار">🇺🇸 دولار</option>
        </select>
      </div>

      {/* ملاحظة */}
      <Lbl>ملاحظة (اختياري)</Lbl>
      <input style={{ ...S.inp, marginBottom:16 }}
        placeholder="مثال: دفعة أولى من العميل"
        value={form.note} onChange={e => set("note")(e.target.value)}
      />

      {/* التاريخ */}
      <Lbl>التاريخ</Lbl>
      <input style={{ ...S.inp, marginBottom:28 }}
        type="date" value={form.date}
        onChange={e => set("date")(e.target.value)}
      />

      {/* تأكيد */}
      <button onClick={save} disabled={!valid || saving} style={{
        ...S.btn, background:valid ? C.green : C.border,
        color:valid ? "#fff" : C.muted,
      }}>
        {saving ? "جاري الحفظ..." : "✅ تأكيد وحفظ"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
// صفحة الاستلامات (القائمة)
// ══════════════════════════════════════════
function ReceiptsPage({ receipts, projects, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false);

  const projName = id => projects.find(p => p.id === id)?.name || "صندوق عام";

  const totalDin = receipts
    .filter(r => r.currency === "دينار" || !r.currency)
    .reduce((s, r) => s + r.amount, 0);
  const totalDol = receipts
    .filter(r => r.currency === "دولار")
    .reduce((s, r) => s + r.amount, 0);

  if (adding) return (
    <AddReceiptPage
      projects={projects}
      onBack={() => setAdding(false)}
      onSave={async f => { await onAdd(f); setAdding(false); }}
    />
  );

  return (
    <div style={{ padding:20 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>↓ الاستلامات</div>
        <button onClick={() => setAdding(true)} style={{
          ...S.btn, width:"auto", padding:"10px 20px",
          background:C.green, color:"#fff", fontSize:14,
        }}>+ استلام</button>
      </div>

      {/* ملخص */}
      {receipts.length > 0 && (
        <div style={{
          background:"linear-gradient(135deg,#14532d,#166534)",
          borderRadius:18, padding:20, marginBottom:16,
          color:"#fff", boxShadow:"0 4px 20px rgba(22,101,52,0.3)",
        }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginBottom:4 }}>
            إجمالي الاستلام
          </div>
          <div style={{ fontSize:30, fontWeight:900, letterSpacing:-1, marginBottom:8 }}>
            {fmtD(totalDin)}
          </div>
          {totalDol > 0 && (
            <div style={{ fontSize:15, color:"#86efac", fontWeight:700 }}>
              + {fmt(totalDol,"دولار")}
            </div>
          )}
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:8 }}>
            {toAr(receipts.length)} معاملة
          </div>
        </div>
      )}

      {/* القائمة */}
      {receipts.length === 0
        ? <Empty icon="📥" text="ما في استلامات بعد" />
        : receipts.map(r => (
          <div key={r.id} style={{ ...S.card }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:3 }}>
                  {r.projectId ? `🏗️ ${projName(r.projectId)}` : "📦 صندوق عام"}
                </div>
                <div style={{ fontSize:12, color:C.muted }}>📅 {r.date}</div>
                {r.note && (
                  <div style={{ fontSize:13, color:C.text, marginTop:4 }}>{r.note}</div>
                )}
              </div>
              <div style={{
                fontWeight:900, fontSize:18, color:C.green,
                background:"rgba(22,101,52,0.08)",
                padding:"5px 14px", borderRadius:20,
              }}>
                +{fmt(r.amount, r.currency)}
              </div>
            </div>
            <button onClick={() => {
              if (window.confirm("تحذف هذا الاستلام؟")) onDelete(r.id);
            }} style={{
              background:"transparent", border:"none",
              color:C.red, fontSize:12, cursor:"pointer",
              padding:"4px 0", fontWeight:600,
            }}>🗑️ حذف</button>
          </div>
        ))
      }
    </div>
  );
}

// ══════════════════════════════════════════
// الصفحة الرئيسية (مؤقتة)
// ══════════════════════════════════════════
function HomePage({ receipts, onNavigate }) {
  const totalDin = receipts
    .filter(r => r.currency === "دينار" || !r.currency)
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div style={{ padding:20 }}>
      <div style={{ fontSize:22, fontWeight:900, color:C.gold, marginBottom:20 }}>
        📊 حساب
      </div>

      {/* الصندوق */}
      <div style={{
        background:"linear-gradient(135deg,#14532d,#166534)",
        borderRadius:20, padding:24, marginBottom:20,
        color:"#fff", boxShadow:"0 4px 24px rgba(22,101,52,0.25)",
      }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginBottom:4 }}>
          💰 إجمالي الاستلامات
        </div>
        <div style={{ fontSize:34, fontWeight:900, letterSpacing:-1 }}>
          {fmtD(totalDin)}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:8 }}>
          {toAr(receipts.length)} معاملة مسجلة
        </div>
      </div>

      {/* اختصار */}
      <button onClick={() => onNavigate("receipts")} style={{
        ...S.btn, background:C.green, color:"#fff", fontSize:16,
      }}>
        ↓ تسجيل استلام جديد
      </button>

      {/* آخر المعاملات */}
      {receipts.length > 0 && (
        <>
          <div style={{ fontSize:14, fontWeight:800, margin:"20px 0 10px" }}>
            آخر الاستلامات
          </div>
          {receipts.slice(0, 3).map(r => (
            <div key={r.id} style={{ ...S.card, display:"flex",
              justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>
                  {r.note || (r.projectId ? "دفعة مشروع" : "صندوق عام")}
                </div>
                <div style={{ fontSize:11, color:C.muted }}>📅 {r.date}</div>
              </div>
              <div style={{ fontWeight:900, fontSize:16, color:C.green }}>
                +{fmt(r.amount, r.currency)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// شريط التنقل السفلي
// ══════════════════════════════════════════
const NAV = [
  { id:"home",     icon:"🏠", label:"الرئيسية" },
  { id:"receipts", icon:"↓",  label:"الاستلام"  },
];

function BottomNav({ current, onChange }) {
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0,
      background:"#fff", borderTop:`1px solid ${C.border}`,
      display:"flex", height:56, zIndex:100,
      boxShadow:"0 -2px 12px rgba(0,0,0,0.06)",
    }}>
      {NAV.map(n => {
        const active = current === n.id;
        return (
          <button key={n.id} onClick={() => onChange(n.id)} style={{
            flex:1, border:"none", background:"transparent",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            gap:3, cursor:"pointer",
            color:active ? C.gold : C.muted,
          }}>
            <div style={{ fontSize:22, lineHeight:1 }}>{n.icon}</div>
            <div style={{ fontSize:10, fontWeight:active ? 800 : 600 }}>{n.label}</div>
            {active && (
              <div style={{ width:24, height:2.5,
                background:C.gold, borderRadius:999 }}/>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
// App
// ══════════════════════════════════════════
export default function App() {
  const [page,     setPage]    = useState("home");
  const [loading,  setLoading] = useState(true);
  const [receipts, setReceipts]= useState([]);
  const [projects, setProjects]= useState([]);

  useEffect(() => {
    const unsubs = [];
    const to = setTimeout(() => setLoading(false), 8000);

    // استلامات فقط
    unsubs.push(onSnapshot(
      query(collection(db, "receipts_v1"), orderBy("date","desc"), limit(300)),
      s => { setReceipts(s.docs.map(d => ({id:d.id,...d.data()}))); setLoading(false); },
      () => setLoading(false)
    ));

    // مشاريع
    unsubs.push(onSnapshot(
      collection(db, "projects_v2"),
      s => setProjects(s.docs.map(d => ({id:d.id,...d.data()})))
    ));

    return () => { unsubs.forEach(u => u()); clearTimeout(to); };
  }, []);

  const addReceipt = async data => {
    await addDoc(collection(db, "receipts_v1"), data);
  };

  const deleteReceipt = async id => {
    await deleteDoc(doc(db, "receipts_v1", id));
  };

  if (loading) return (
    <div style={{ ...S.page, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:14 }}>
      <div style={{ fontSize:56 }}>📊</div>
      <div style={{ fontSize:24, fontWeight:900, color:C.gold }}>حساب</div>
      <div style={{ fontSize:13, color:C.muted }}>جاري التحميل...</div>
    </div>
  );

  const pages = {
    home: (
      <HomePage
        receipts={receipts}
        onNavigate={setPage}
      />
    ),
    receipts: (
      <ReceiptsPage
        receipts={receipts}
        projects={projects}
        onAdd={addReceipt}
        onDelete={deleteReceipt}
      />
    ),
  };

  return (
    <div style={S.page}>
      <div style={{ maxWidth:600, margin:"0 auto", paddingBottom:56 }}>
        {pages[page] || pages.home}
      </div>
      <BottomNav current={page} onChange={setPage} />
    </div>
  );
}
