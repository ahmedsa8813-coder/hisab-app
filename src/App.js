import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, orderBy, query } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCN0XF9YDxLZIOMoVeZYMpXLl0rrS1HGrs",
  authDomain: "bab-fb825.firebaseapp.com",
  projectId: "bab-fb825"
});
const db = getFirestore(app);

const fNum = n => {
  const s = String(Math.round(Math.abs(Number(n) || 0)));
  let r = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ",";
    r += s[i];
  }
  return r;
};

const TYPES = [
  { val: "ديكور",   icon: "🎨", color: "#7C3AED", bg: "#F5F3FF" },
  { val: "واجهات",  icon: "🏢", color: "#2563EB", bg: "#EFF6FF" },
  { val: "مقاولات", icon: "🏗️", color: "#D97706", bg: "#FFFBEB" },
];

const typeStyle = t => TYPES.find(x => x.val === t) || {};

const emptyForm = {
  type: "", name: "", client: "", province: "",
  value: "", currency: "دينار", duration: ""
};

export default function App() {
  const [page, setPage] = useState("home");
  const [projects, setProjects] = useState([]);
  const [tab, setTab]     = useState("active");
  const [form, setForm]   = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap =>
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const valid = form.type && form.name.trim() && form.client.trim()
             && form.province.trim() && Number(form.value) > 0;

  const addProject = () => {
    if (!valid) return;
    // أغلق الفورم فوراً
    setForm(emptyForm);
    setShowForm(false);
    // Firebase في الخلفية
    addDoc(collection(db, "projects"), {
      type:     form.type,
      name:     form.name.trim(),
      client:   form.client.trim(),
      province: form.province.trim(),
      value:    Number(form.value),
      currency: form.currency,
      duration: form.duration.trim(),
      received: 0,
      spent:    0,
      status:   "active",
      createdAt: new Date().toISOString()
    });
  };

  const deleteProject = async id => {
    if (!window.confirm("حذف المشروع؟")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  const toggleStatus = async (id, current) => {
    await updateDoc(doc(db, "projects", id), {
      status: current === "active" ? "done" : "active"
    });
  };

  const active = projects.filter(p => p.status === "active");
  const done   = projects.filter(p => p.status === "done");
  const list   = tab === "active" ? active : done;

  if (page === "home") return <HomePage onSelect={setPage} />;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "22px 16px" }}>
        {/* رجوع للرئيسية */}
        <button onClick={() => setPage("home")} style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
          padding: "8px 16px", fontSize: 13, color: "#475569", cursor: "pointer",
          marginBottom: 16, fontFamily: "Tahoma", display: "flex",
          alignItems: "center", gap: 6
        }}>← رجوع للرئيسية</button>

        {/* هيدر */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px",
          marginBottom: 16, border: "1px solid #E2E8F0", borderTop: "4px solid #D97706" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>🏗️ صندوق المشاريع</div>
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 600 }}>● {active.length} قيد العمل</span>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>✓ {done.length} منتهية</span>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[["active","● قيد العمل","#16A34A"],["done","✓ منتهية","#64748B"]].map(([v,l,c]) => (
            <button key={v} onClick={() => setTab(v)} style={{
              border: tab === v ? "none" : "1px solid #E2E8F0",
              borderRadius: 10, padding: "12px", cursor: "pointer",
              fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
              background: tab === v ? c : "#fff",
              color: tab === v ? "#fff" : "#64748B"
            }}>{l} ({v === "active" ? active.length : done.length})</button>
          ))}
        </div>

        {/* زر إضافة */}
        {tab === "active" && (
          <button onClick={() => { setShowForm(v => !v); setForm(emptyForm); }} style={{
            width: "100%", background: showForm ? "#475569" : "#D97706",
            border: "none", borderRadius: 12, padding: "13px",
            color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: "pointer", fontFamily: "Tahoma", marginBottom: 14
          }}>
            {showForm ? "✕ إلغاء" : "+ إضافة مشروع جديد"}
          </button>
        )}

        {/* فورم */}
        {showForm && tab === "active" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            {/* نوع المشروع */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              نوع المشروع *
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {TYPES.map(({ val, icon, color, bg }) => (
                <button key={val} onClick={() => sf("type")(val)} style={{
                  border: "2px solid " + (form.type === val ? color : "#E2E8F0"),
                  borderRadius: 12, padding: "12px 6px", cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 13, fontWeight: 700, textAlign: "center",
                  background: form.type === val ? bg : "#fff",
                  color: form.type === val ? color : "#94A3B8"
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  {val}
                </button>
              ))}
            </div>

            {/* الحقول */}
            {[
              { label: "اسم المشروع *",  key: "name",     ph: "أدخل اسم المشروع...", type: "text" },
              { label: "اسم العميل *",   key: "client",   ph: "صاحب المشروع...",     type: "text" },
              { label: "المحافظة *",     key: "province", ph: "بغداد، البصرة...",    type: "text" },
              { label: "قيمة المشروع *", key: "value", ph: "٠", type: "number" },
              { label: "مدة الإنجاز",   key: "duration", ph: "مثال: 3 أشهر",        type: "text" },
            ].map(({ label, key, ph, type }) => (
              <div key={key}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
                  {label}
                </div>
                <input
                  type={type}
                  inputMode={type === "number" ? "decimal" : "text"}
                  placeholder={ph}
                  value={form[key]}
                  onChange={e => sf(key)(e.target.value)}
                  style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                    padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                    direction: "rtl", marginBottom: 12, boxSizing: "border-box",
                    background: "#F8FAFC", color: "#1E293B" }}
                />
                {key === "value" && (
                  <div style={{ marginTop: -8, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      {["دينار","دولار"].map(cur => (
                        <button key={cur} onClick={() => sf("currency")(cur)} style={{
                          flex: 1, padding: "8px", borderRadius: 9, cursor: "pointer",
                          fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
                          border: "2px solid " + (form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#E2E8F0"),
                          background: form.currency === cur ? (cur === "دينار" ? "#F0FDF4" : "#EFF6FF") : "#fff",
                          color: form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#94A3B8"
                        }}>
                          {cur === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                        </button>
                      ))}
                    </div>
                    {Number(form.value) > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 600,
                        color: form.currency === "دينار" ? "#D97706" : "#2563EB" }}>
                        {fNum(form.value)} {form.currency === "دينار" ? "د.ع" : "$"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button onClick={addProject} disabled={!valid} style={{
              width: "100%", border: "none", borderRadius: 10, padding: "13px",
              fontSize: 15, fontWeight: 700, fontFamily: "Tahoma",
              cursor: valid ? "pointer" : "not-allowed",
              background: valid ? "#D97706" : "#E2E8F0",
              color: valid ? "#fff" : "#94A3B8"
            }}>
              "✅ حفظ المشروع"
            </button>
          </div>
        )}

        {/* قائمة المشاريع */}
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8",
            background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{tab === "active" ? "🏗️" : "✅"}</div>
            <div style={{ fontSize: 15 }}>
              {tab === "active" ? "ما في مشاريع قيد العمل" : "ما في مشاريع منتهية"}
            </div>
          </div>
        ) : list.map(p => <ProjectCard key={p.id} p={p}
            onToggle={() => toggleStatus(p.id, p.status)}
            onDelete={() => deleteProject(p.id)} />
        )}
      </div>
    </div>
  );
}

function HomePage({ onSelect }) {
  return (
    <div style={{ minHeight: "100vh", background: "#1E293B",
      fontFamily: "Tahoma", direction: "rtl",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20 }}>

      {/* الشعار */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
          شركة باب المشاريع
        </div>
        <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>
          اختر القسم للمتابعة
        </div>
      </div>

      {/* القسمان */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 16, width: "100%", maxWidth: 500 }}>

        {/* القسم المالي */}
        <button onClick={() => onSelect("financial")} style={{
          background: "linear-gradient(135deg, #D97706, #F59E0B)",
          border: "none", borderRadius: 20, padding: "32px 16px",
          cursor: "pointer", textAlign: "center", fontFamily: "Tahoma",
          boxShadow: "0 8px 32px rgba(217,119,6,0.4)",
          transition: "transform 0.15s"
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            القسم المالي
          </div>
          <div style={{ fontSize: 12, color: "#FEF3C7" }}>
            المشاريع · الصرف · الإيرادات
          </div>
        </button>

        {/* القسم الإداري */}
        <button onClick={() => onSelect("admin")} style={{
          background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
          border: "none", borderRadius: 20, padding: "32px 16px",
          cursor: "pointer", textAlign: "center", fontFamily: "Tahoma",
          boxShadow: "0 8px 32px rgba(29,78,216,0.4)",
          transition: "transform 0.15s"
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            القسم الإداري
          </div>
          <div style={{ fontSize: 12, color: "#DBEAFE" }}>
            إدارة العمل · الموظفون · المهام
          </div>
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ p, onToggle, onDelete }) {
  const ts = typeStyle(p.type);
  const pct = p.value > 0 ? Math.min(100, Math.round((p.received || 0) / p.value * 100)) : 0;
  const sptPct = p.value > 0 ? Math.min(100, Math.round((p.spent || 0) / p.value * 100)) : 0;
  const cur = p.currency === "دولار" ? "$" : "د.ع";

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px",
      marginBottom: 14, border: "1px solid #E2E8F0",
      borderRight: "5px solid " + (ts.color || "#D97706") }}>

      {/* السطر الأول: الاسم + الأزرار */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          {/* نوع + حالة */}
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            {p.type && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 20, background: ts.bg, color: ts.color }}>
                {ts.icon} {p.type}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
              borderRadius: 20,
              background: p.status === "active" ? "#DCFCE7" : "#F1F5F9",
              color: p.status === "active" ? "#16A34A" : "#64748B" }}>
              {p.status === "active" ? "● قيد العمل" : "✓ منتهي"}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{p.name}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
            {p.client   && <span style={{ fontSize: 12, color: "#64748B" }}>👤 {p.client}</span>}
            {p.province && <span style={{ fontSize: 12, color: "#64748B" }}>📍 {p.province}</span>}
            {p.duration && <span style={{ fontSize: 12, color: "#64748B" }}>⏱️ {p.duration}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginRight: 8 }}>
          <button onClick={onToggle} style={{
            background: p.status === "active" ? "#F0FDF4" : "#FFFBEB",
            border: "1px solid " + (p.status === "active" ? "#16A34A" : "#D97706"),
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            fontSize: 11, fontFamily: "Tahoma", fontWeight: 700,
            color: p.status === "active" ? "#16A34A" : "#D97706"
          }}>
            {p.status === "active" ? "✓ إنهاء" : "↩ تفعيل"}
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none",
            color: "#DC2626", cursor: "pointer", fontSize: 11,
            fontFamily: "Tahoma", fontWeight: 600 }}>
            🗑️ حذف
          </button>
        </div>
      </div>

      {/* قيمة المشروع */}
      {p.value > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
              قيمة المشروع
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
              {fNum(p.value)} {p.currency === "دولار" ? "$" : "د.ع"}
            </span>
          </div>

          {/* المستلم */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>
                ↓ المستلم
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A" }}>
                {fNum(p.received || 0)} {cur} — {pct}%
              </span>
            </div>
            <div style={{ height: 8, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%",
                background: "linear-gradient(90deg,#16A34A,#22C55E)",
                borderRadius: 99, transition: "width 0.4s" }}/>
            </div>
          </div>

          {/* المصروف */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
                ↑ المصروف
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>
                {fNum(p.spent || 0)} {cur} — {sptPct}%
              </span>
            </div>
            <div style={{ height: 8, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: sptPct + "%",
                background: "linear-gradient(90deg,#DC2626,#F87171)",
                borderRadius: 99, transition: "width 0.4s" }}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
