import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, query, where, getDocs, getDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCBGovCJ_Bx64dOjC0UWzJsBPgXEuJaizI",
  authDomain: "bab-projects-b7d04.firebaseapp.com",
  projectId: "bab-projects-b7d04",
  storageBucket: "bab-projects-b7d04.firebasestorage.app",
  messagingSenderId: "982434748534",
  appId: "1:982434748534:web:ca0e52ef0115ecfc346757"
});
const db = getFirestore(app);

function w2(n) {
  const x = Math.floor(Math.abs(Number(n) || 0));
  if (!x) return "صفر";
  const o = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t2 = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g = v => {
    if (!v) return "";
    if (v < 20) return o[v];
    if (v < 100) return t2[Math.floor(v/10)] + (v%10 ? " و" + o[v%10] : "");
    return h[Math.floor(v/100)] + (v%100 ? " و" + g(v%100) : "");
  };
  const p = [];
  if (x >= 1e9) p.push(g(Math.floor(x/1e9)) + " مليار");
  if (x%1e9 >= 1e6) p.push(g(Math.floor(x%1e9/1e6)) + " مليون");
  if (x%1e6 >= 1e3) p.push(g(Math.floor(x%1e6/1e3)) + " ألف");
  if (x%1e3) p.push(g(x%1e3));
  return p.join(" و");
}

const fNum = n => {
  const s = String(Math.round(Math.abs(Number(n) || 0)));
  let r = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ",";
    r += s[i];
  }
  return r;
};

const PROVINCES = [
  "بغداد","البصرة","نينوى","أربيل","السليمانية","دهوك","كركوك",
  "الأنبار","صلاح الدين","ديالى","واسط","ميسان","ذي قار",
  "المثنى","القادسية","بابل","كربلاء","النجف"
];

const TYPES = [
  { val: "إشراف",   icon: "👷", color: "#059669", bg: "#ECFDF5" },
  { val: "ديكور",   icon: "🎨", color: "#7C3AED", bg: "#F5F3FF" },
  { val: "مقاولات", icon: "🏗️", color: "#D97706", bg: "#FFFBEB" },
  { val: "واجهات",  icon: "🏢", color: "#2563EB", bg: "#EFF6FF" },
];

const typeStyle = t => TYPES.find(x => x.val === t) || {};

const emptyForm = {
  type: "", name: "", province: "", city: "",
  days: "",
  valueDin: "", valueDol: "",
  startDate: new Date().toISOString().split("T")[0]
};

export default function App() {
  const [page, setPage]       = useState("home");
  const [selProj, setSelProj] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tab, setTab]     = useState("active");
  const [form, setForm]   = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    return onSnapshot(collection(db, "projects"),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => b.createdAt?.localeCompare(a.createdAt || "") || 0);
        setProjects(list);
      },
      err => alert("خطأ في قاعدة البيانات: " + err.message)
    );
  }, []);

  const valid = form.type && form.name.trim() && form.province && form.days
             && (Number(form.valueDin) > 0 || Number(form.valueDol) > 0)
             && form.startDate;

  const [saving, setSaving] = useState(false);

  const addProject = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const data = {
        type:      form.type,
        name:      form.name.trim(),
        province:  form.province,
        city:      form.city.trim(),
        days:      Number(form.days),
        valueDin:  Number(form.valueDin) || 0,
        valueDol:  Number(form.valueDol) || 0,
        startDate: form.startDate,
        received:  0,
        spent:     0,
        status:    "active",
        createdAt: new Date().toISOString()
      };
      const ref = await addDoc(collection(db, "projects"), data);
      // تحقق فعلي إن البيانات وصلت Firebase
      const saved = await getDoc(ref);
      if (saved.exists()) {
        setForm(emptyForm);
        setShowForm(false);
      } else {
        alert("⚠️ لم يتم الحفظ في Firebase، تحقق من الاتصال");
      }
    } catch(e) {
      alert("خطأ في الحفظ: " + e.code + " — " + e.message);
    }
    setSaving(false);
  };

  const deleteProject = async id => {
    if (!window.confirm("حذف المشروع؟")) return;
    await deleteDoc(doc(db, "projects", id));
    // حذف حركاته أيضاً
    const s = await getDocs(query(collection(db, "project_txs"), where("projectId","==",id)));
    for (const d of s.docs) await deleteDoc(doc(db, "project_txs", d.id));
  };

  const resetAllProjects = async () => {
    if (!window.confirm("حذف كل المشاريع وكل بياناتها؟")) return;
    const ps = await getDocs(collection(db, "projects"));
    for (const d of ps.docs) await deleteDoc(doc(db, "projects", d.id));
    const ts = await getDocs(collection(db, "project_txs"));
    for (const d of ts.docs) await deleteDoc(doc(db, "project_txs", d.id));
  };

  const toggleStatus = async (id, current) => {
    await updateDoc(doc(db, "projects", id), {
      status: current === "active" ? "done" : "active"
    });
  };

  const active = projects.filter(p => p.status === "active");
  const done   = projects.filter(p => p.status === "done");
  const list   = tab === "active" ? active : done;

  const testFirebase = async () => {
    try {
      const ref = await addDoc(collection(db, "test_ping"), { t: Date.now() });
      const snap = await getDoc(ref);
      if (snap.exists()) alert("Firebase OK - ID: " + ref.id);
      else alert("فشل - البيانات ما وصلت للسيرفر");
    } catch(e) { alert("خطأ: " + e.code + " - " + e.message); }
  };

  if (page === "home")    return <HomePage onSelect={setPage} />;
  if (page === "admin")   return <AdminPage onBack={() => setPage("home")} />;
  if (page === "project" && selProj)
    return <ProjectDetail proj={selProj} onBack={() => { setPage("financial"); setSelProj(null); }}/>;

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
          <div style={{ display: "flex", gap: 16, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 600 }}>● {active.length} قيد العمل</span>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>✓ {done.length} منتهية</span>
            <button onClick={testFirebase} style={{ fontSize: 11, background: "#F0FDF4", border: "1px solid #16A34A", borderRadius: 7, padding: "4px 10px", cursor: "pointer", color: "#16A34A", fontFamily: "Tahoma", fontWeight: 700 }}>🔌 اختبار</button>
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

        {/* أزرار */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {tab === "active" && (
            <button onClick={() => { setShowForm(v => !v); setForm(emptyForm); }} style={{
              flex: 1,
            width: "100%", background: showForm ? "#475569" : "#D97706",
            border: "none", borderRadius: 12, padding: "13px",
              color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "Tahoma"
            }}>
              {showForm ? "✕ إلغاء" : "+ إضافة مشروع جديد"}
            </button>
          )}
          <button onClick={resetAllProjects} style={{
            background: "#FFF1F2", border: "1px solid #FEE2E2",
            borderRadius: 12, padding: "13px 16px", cursor: "pointer",
            color: "#DC2626", fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
            whiteSpace: "nowrap"
          }}>
            🗑️ تصفير
          </button>
        </div>

        {/* فورم */}
        {showForm && tab === "active" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            {/* نوع المشروع */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              نوع المشروع *
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {TYPES.map(({ val, icon, color, bg }) => (
                <button key={val} onClick={() => sf("type")(val)} style={{
                  border: "2px solid " + (form.type === val ? color : "#E2E8F0"),
                  borderRadius: 12, padding: "14px 10px", cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: form.type === val ? bg : "#fff",
                  color: form.type === val ? color : "#94A3B8"
                }}>
                  <span style={{ fontSize: 22 }}>{icon}</span> {val}
                </button>
              ))}
            </div>

            {/* اسم المشروع */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              اسم المشروع *
            </div>
            <input autoFocus placeholder="أدخل اسم المشروع..." value={form.name}
              onChange={e => sf("name")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* المحافظة */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المحافظة *
            </div>
            <select value={form.province} onChange={e => sf("province")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: form.province ? "#1E293B" : "#94A3B8",
                appearance: "none" }}>
              <option value="">اختر المحافظة...</option>
              {PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
            </select>

            {/* المدينة */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المدينة
            </div>
            <input placeholder="اسم المنطقة أو المدينة..." value={form.city}
              onChange={e => sf("city")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* مدة المشروع بالأيام */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              مدة المشروع بالأيام *
            </div>
            <input placeholder="مثال: 90" value={form.days} inputMode="numeric"
              onChange={e => sf("days")(e.target.value.replace(/[^0-9]/g, ""))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B",
                MozAppearance: "textfield", WebkitAppearance: "none" }}/>
            {Number(form.days) > 0 && (
              <div style={{ fontSize: 12, color: "#059669", fontWeight: 600, marginBottom: 14 }}>
                ✍️ {w2(Number(form.days))} يوم
              </div>
            )}
            {!Number(form.days) && <div style={{ marginBottom: 10 }}/>}

            {/* قيمة المشروع */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              قيمة المشروع * (دينار و/أو دولار)
            </div>
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 14,
              border: "1px solid #E2E8F0", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, marginBottom: 6 }}>
                🇮🇶 الدينار العراقي
              </div>
              <input placeholder="٠" value={form.valueDin} inputMode="numeric"
                onChange={e => sf("valueDin")(e.target.value.replace(/[^0-9]/g, ""))}
                style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                  padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                  direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                  background: "#fff", color: "#1E293B",
                  MozAppearance: "textfield", WebkitAppearance: "none" }}/>
              {Number(form.valueDin) > 0 && (
                <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, marginBottom: 12 }}>
                  ✍️ {w2(Number(form.valueDin))} دينار — {fNum(form.valueDin)} د.ع
                </div>
              )}
              {!Number(form.valueDin) && <div style={{ marginBottom: 12 }}/>}
              <div style={{ fontSize: 12, color: "#2563EB", fontWeight: 600, marginBottom: 6 }}>
                🇺🇸 الدولار الأمريكي
              </div>
              <input placeholder="٠" value={form.valueDol} inputMode="numeric"
                onChange={e => sf("valueDol")(e.target.value.replace(/[^0-9]/g, ""))}
                style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                  padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                  direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                  background: "#fff", color: "#1E293B",
                  MozAppearance: "textfield", WebkitAppearance: "none" }}/>
              {Number(form.valueDol) > 0 && (
                <div style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
                  ✍️ {w2(Number(form.valueDol))} دولار — {fNum(form.valueDol)} $
                </div>
              )}
            </div>

            {/* تاريخ بداية العمل */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              تاريخ بداية العمل *
            </div>
            <input type="date" value={form.startDate}
              onChange={e => sf("startDate")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 16, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            <button onClick={addProject} disabled={!valid} style={{
              width: "100%", border: "none", borderRadius: 10, padding: "13px",
              fontSize: 15, fontWeight: 700, fontFamily: "Tahoma",
              cursor: valid && !saving ? "pointer" : "not-allowed",
              background: valid && !saving ? "#D97706" : "#E2E8F0",
              color: valid && !saving ? "#fff" : "#94A3B8"
            }}>
              {saving ? "⏳ جاري الحفظ..." : "✅ حفظ المشروع"}
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
            onOpen={() => { setSelProj(p); setPage("project"); }}
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

function AdminPage({ onBack }) {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    return onSnapshot(collection(db, "daily_tasks"), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""));
      setTasks(list);
    });
  }, []);

  const addTask = () => {
    if (!text.trim()) return;
    addDoc(collection(db, "daily_tasks"), {
      text: text.trim(),
      date: today,
      done: false,
      createdAt: new Date().toISOString()
    });
    setText("");
  };

  const toggleDone = (id, done) => {
    updateDoc(doc(db, "daily_tasks", id), { done: !done });
  };

  const deleteTask = id => {
    deleteDoc(doc(db, "daily_tasks", id));
  };

  const todayTasks = tasks.filter(t => t.date === today);
  const oldTasks   = tasks.filter(t => t.date !== today);
  const pending    = todayTasks.filter(t => !t.done).length;
  const done_count = todayTasks.filter(t => t.done).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "22px 16px" }}>

        <button onClick={onBack} style={{ background: "#fff", border: "1px solid #E2E8F0",
          borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "#475569",
          cursor: "pointer", marginBottom: 16, fontFamily: "Tahoma",
          display: "flex", alignItems: "center", gap: 6 }}>
          ← رجوع للرئيسية
        </button>

        {/* هيدر */}
        <div style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)",
          borderRadius: 16, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            📋 القسم الإداري
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#DBEAFE" }}>
              ⏳ {pending} معلقة اليوم
            </span>
            <span style={{ fontSize: 13, color: "#BBF7D0" }}>
              ✅ {done_count} منجزة اليوم
            </span>
          </div>
        </div>

        {/* إضافة مهمة */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16,
          border: "1px solid #E2E8F0", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 10 }}>
            ➕ إضافة عمل جديد
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="اكتب المهمة أو العمل المطلوب..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              style={{ flex: 1, border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "11px 14px", fontSize: 14, outline: "none",
                fontFamily: "Tahoma", direction: "rtl", background: "#F8FAFC",
                color: "#1E293B" }}
            />
            <button onClick={addTask} disabled={!text.trim()} style={{
              background: text.trim() ? "#2563EB" : "#E2E8F0",
              border: "none", borderRadius: 10, padding: "11px 18px",
              color: text.trim() ? "#fff" : "#94A3B8",
              cursor: text.trim() ? "pointer" : "not-allowed",
              fontSize: 14, fontWeight: 700, fontFamily: "Tahoma", whiteSpace: "nowrap"
            }}>
              إضافة
            </button>
          </div>
        </div>

        {/* فلتر */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6, marginBottom: 14 }}>
          {[["all","الكل"],["pending","⏳ معلقة"],["done","✅ منجزة"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              border: filter === v ? "none" : "1px solid #E2E8F0",
              borderRadius: 10, padding: "10px", cursor: "pointer",
              fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
              background: filter === v ? "#2563EB" : "#fff",
              color: filter === v ? "#fff" : "#64748B"
            }}>{l}</button>
          ))}
        </div>

        {/* مهام اليوم */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 16, background: "#2563EB", borderRadius: 2 }}/>
          أعمال اليوم — {today}
        </div>

        {todayTasks.filter(t =>
          filter === "all" ? true :
          filter === "pending" ? !t.done : t.done
        ).length === 0 ? (
          <div style={{ textAlign: "center", padding: 28, color: "#94A3B8",
            background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0",
            marginBottom: 14 }}>
            {filter === "done" ? "ما في أعمال منجزة اليوم" : "ما في أعمال بعد، أضف عملك الأول ↑"}
          </div>
        ) : (
          todayTasks.filter(t =>
            filter === "all" ? true :
            filter === "pending" ? !t.done : t.done
          ).map(t => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 12,
              padding: "13px 16px", marginBottom: 10, border: "1px solid #E2E8F0",
              borderRight: "4px solid " + (t.done ? "#16A34A" : "#2563EB"),
              opacity: t.done ? 0.75 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* تشيك بوكس */}
                <button onClick={() => toggleDone(t.id, t.done)} style={{
                  width: 26, height: 26, borderRadius: 7, cursor: "pointer",
                  border: "2px solid " + (t.done ? "#16A34A" : "#CBD5E1"),
                  background: t.done ? "#16A34A" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 14
                }}>
                  {t.done ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "#1E293B", fontWeight: 600,
                    textDecoration: t.done ? "line-through" : "none",
                    color: t.done ? "#94A3B8" : "#1E293B" }}>
                    {t.text}
                  </div>
                </div>
                <button onClick={() => deleteTask(t.id)} style={{
                  background: "none", border: "none", color: "#DC2626",
                  cursor: "pointer", fontSize: 13, fontFamily: "Tahoma"
                }}>🗑️</button>
              </div>
            </div>
          ))
        )}

        {/* أعمال سابقة */}
        {oldTasks.length > 0 && filter === "all" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8",
              marginTop: 20, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 3, height: 14, background: "#CBD5E1", borderRadius: 2 }}/>
              أعمال سابقة ({oldTasks.length})
            </div>
            {oldTasks.map(t => (
              <div key={t.id} style={{ background: "#FAFAFA", borderRadius: 12,
                padding: "11px 16px", marginBottom: 8, border: "1px solid #E2E8F0",
                borderRight: "4px solid #CBD5E1", opacity: 0.8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    background: t.done ? "#16A34A" : "#94A3B8" }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#64748B",
                      textDecoration: t.done ? "line-through" : "none" }}>
                      {t.text}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      📅 {t.date}
                    </div>
                  </div>
                  <button onClick={() => deleteTask(t.id)} style={{
                    background: "none", border: "none", color: "#DC2626",
                    cursor: "pointer", fontSize: 12
                  }}>🗑️</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ p, onOpen, onToggle, onDelete }) {
  const ts = typeStyle(p.type);

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px",
      marginBottom: 14, border: "1px solid #E2E8F0",
      borderRight: "5px solid " + (ts.color || "#D97706") }}>

      {/* السطر الأول */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
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
          <div onClick={onOpen} style={{ fontSize: 16, fontWeight: 700,
            color: "#1E293B", cursor: "pointer", textDecoration: "underline dotted" }}>
            {p.name}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
            {p.startDate && <span style={{ fontSize: 12, color: "#64748B" }}>📅 {p.startDate}</span>}
            {p.days > 0  && <span style={{ fontSize: 12, color: "#64748B" }}>⏱️ {p.days} يوم</span>}
            {p.province && <span style={{ fontSize: 12, color: "#64748B" }}>📍 {p.province}{p.city?" — "+p.city:""}</span>}
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
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
            background: "#FFF1F2", border: "1px solid #FEE2E2",
            borderRadius: 7, padding: "5px 10px",
            color: "#DC2626", cursor: "pointer", fontSize: 11,
            fontFamily: "Tahoma", fontWeight: 700
          }}>
            🗑️ حذف
          </button>
        </div>
      </div>

      {/* الميزان في القائمة */}
      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 10,
        display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ background: (p.balDin||0) >= 0 ? "#FFFBEB" : "#FFF1F2",
          borderRadius: 9, padding: "7px 12px",
          border: "1.5px solid " + ((p.balDin||0) >= 0 ? "#D97706" : "#DC2626") }}>
          <span style={{ fontSize: 10, color: "#64748B" }}>⚖️ ميزان د.ع  </span>
          <span style={{ fontSize: 13, fontWeight: 700,
            color: (p.balDin||0) >= 0 ? "#D97706" : "#DC2626" }}>
            {(p.balDin||0) >= 0 ? "+" : ""}{fNum(p.balDin||0)} د.ع
          </span>
        </div>
        <div style={{ background: (p.balDol||0) >= 0 ? "#EFF6FF" : "#FFF1F2",
          borderRadius: 9, padding: "7px 12px",
          border: "1.5px solid " + ((p.balDol||0) >= 0 ? "#2563EB" : "#DC2626") }}>
          <span style={{ fontSize: 10, color: "#64748B" }}>⚖️ ميزان $  </span>
          <span style={{ fontSize: 13, fontWeight: 700,
            color: (p.balDol||0) >= 0 ? "#2563EB" : "#DC2626" }}>
            {(p.balDol||0) >= 0 ? "+" : ""}{fNum(p.balDol||0)} $
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── صفحة تفاصيل المشروع ───────────────────────────────
function ProjectDetail({ proj, onBack }) {
  const [txs, setTxs]     = useState([]);
  const [tab, setTab]     = useState("in");  // in = مستلم، out = مصروف
  const [show, setShow]   = useState(false);
  const [form, setForm]   = useState({
    amount: "", currency: "دينار", receiver: "", date: new Date().toISOString().split("T")[0], note: ""
  });
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));
  const amt = Number(form.amount) || 0;

  // جلب الحركات
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "project_txs"), where("projectId","==",proj.id)),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => b.createdAt?.localeCompare(a.createdAt || "") || 0);
        setTxs(list);
      }
    );
  }, [proj.id]);

  const inTxs  = txs.filter(t => t.type === "in");
  const outTxs = txs.filter(t => t.type === "out");

  const totalIn  = (cur) => inTxs.filter(t=>t.currency===cur).reduce((s,t)=>s+t.amount,0);
  const totalOut = (cur) => outTxs.filter(t=>t.currency===cur).reduce((s,t)=>s+t.amount,0);

  const addTx = () => {
    if (!amt || !form.receiver.trim()) return;
    const isDol = form.currency === "دولار";
    // التحقق من عدم تجاوز قيمة المشروع للمستلمات
    if (tab === "in") {
      const projVal = isDol ? (proj.valueDol || 0) : (proj.valueDin || 0);
      const curTotal = totalIn(form.currency);
      if (projVal > 0 && curTotal + amt > projVal) {
        const rem = projVal - curTotal;
        alert("⚠️ تجاوز قيمة المشروع!\nالمتبقي المسموح: " + fNum(rem) + (isDol ? " $" : " د.ع"));
        return;
      }
    }
    const isDolCur = form.currency === "دولار";
    const isIn = tab === "in";
    // حساب الميزان الجديد
    const newBalDin = isDolCur
      ? (proj.balDin || 0)
      : (proj.balDin || 0) + (isIn ? amt : -amt);
    const newBalDol = isDolCur
      ? (proj.balDol || 0) + (isIn ? amt : -amt)
      : (proj.balDol || 0);
    // حفظ الحركة
    addDoc(collection(db, "project_txs"), {
      projectId: proj.id,
      projectName: proj.name,
      type: tab,
      amount: amt,
      currency: form.currency,
      receiver: form.receiver.trim(),
      date: form.date,
      note: form.note.trim(),
      createdAt: new Date().toISOString()
    });
    // تحديث المجاميع في المشروع
    const newRecDin = isDolCur ? (proj.recDin||0) : (proj.recDin||0) + (isIn ? amt : 0);
    const newSpdDin = isDolCur ? (proj.spdDin||0) : (proj.spdDin||0) + (isIn ? 0 : amt);
    const newRecDol = isDolCur ? (proj.recDol||0) + (isIn ? amt : 0) : (proj.recDol||0);
    const newSpdDol = isDolCur ? (proj.spdDol||0) + (isIn ? 0 : amt) : (proj.spdDol||0);
    updateDoc(doc(db, "projects", proj.id), {
      recDin: newRecDin, spdDin: newSpdDin,
      recDol: newRecDol, spdDol: newSpdDol,
      balDin: newRecDin - newSpdDin,
      balDol: newRecDol - newSpdDol
    });
    setForm({ amount: "", currency: form.currency, receiver: "", date: form.date, note: "" });
    setShow(false);
  };

  const deleteTx = async id => {
    if (!window.confirm("حذف؟")) return;
    await deleteDoc(doc(db, "project_txs", id));
  };

  const ts = typeStyle(proj.type);

  const doPrint = () => {
    const allTxs = [...inTxs, ...outTxs].sort((a,b) => (a.date||"").localeCompare(b.date||""));
    let n = 0;
    const rows = allTxs.map(t => {
      n++;
      const isIn = t.type === "in";
      const isDol = t.currency === "دولار";
      return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
        <td>${n}</td>
        <td>${t.date||""}</td>
        <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"↓ مستلم":"↑ مصروف"}</td>
        <td style="color:${isDol?"#2563EB":"#16A34A"}">${isDol?"🇺🇸 دولار":"🇮🇶 دينار"}</td>
        <td>${t.receiver||""}</td>
        <td style="text-align:right">${t.note||"—"}</td>
        <td style="font-weight:700;color:${isIn?"#16A34A":"#DC2626"}">${isIn?"+":"-"}${fNum(t.amount)} ${isDol?"$":"د.ع"}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:22px;direction:rtl}
.co{font-size:20px;font-weight:700;color:#1E293B}.ca{font-size:11px;color:#64748B}
hr{border-color:#E2E8F0;margin:10px 0}
.pt{font-size:17px;font-weight:700;color:#D97706;margin:10px 0 4px}
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.sb{border-radius:9px;padding:12px;text-align:center}
.sl{font-size:10px;color:#64748B;margin-bottom:4px}.sv{font-size:15px;font-weight:700}
table{width:100%;border-collapse:collapse}
thead tr{background:#D97706}th{color:#fff;padding:9px;font-size:11px;text-align:center}
td{padding:8px;font-size:11px;text-align:center;border-bottom:1px solid #F1F5F9}
.ft{margin-top:14px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between}
</style></head><body>
<div class="co">شركة باب المشاريع</div><div class="ca">بغداد</div><hr/>
<div class="pt">📋 كشف حساب — ${proj.name}</div>
<p style="font-size:11px;color:#64748B">
  ${proj.type?" النوع: "+proj.type+" ·":""} 
  ${proj.startDate?" بداية: "+proj.startDate+" ·":""}
  ${proj.days?" مدة: "+proj.days+" يوم":""}
</p>
<div class="sg">
  <div class="sb" style="background:#F0FDF4"><div class="sl">↓ مستلم دينار</div><div class="sv" style="color:#16A34A">${fNum(totalIn("دينار"))} د.ع</div></div>
  <div class="sb" style="background:#FFF1F2"><div class="sl">↑ مصروف دينار</div><div class="sv" style="color:#DC2626">${fNum(totalOut("دينار"))} د.ع</div></div>
  <div class="sb" style="background:#FFFBEB;border:2px solid #D97706"><div class="sl">⚖️ ميزان دينار</div><div class="sv" style="color:#D97706">${fNum(totalIn("دينار")-totalOut("دينار"))} د.ع</div></div>
  <div class="sb" style="background:#EFF6FF"><div class="sl">↓ مستلم دولار</div><div class="sv" style="color:#2563EB">${fNum(totalIn("دولار"))} $</div></div>
  <div class="sb" style="background:#FEF2F2"><div class="sl">↑ مصروف دولار</div><div class="sv" style="color:#DC2626">${fNum(totalOut("دولار"))} $</div></div>
  <div class="sb" style="background:#EFF6FF;border:2px solid #2563EB"><div class="sl">⚖️ ميزان دولار</div><div class="sv" style="color:#2563EB">${fNum(totalIn("دولار")-totalOut("دولار"))} $</div></div>
</div>
<table><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th>العملة</th><th>المستلم / صُرف على</th><th>الملاحظة</th><th>المبلغ</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${new Date().toISOString().split("T")[0]}</span></div>
</body></html>`;
    const w = window.open("","_blank","width=900,height=700");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),700);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>

        {/* رجوع */}
        <button onClick={onBack} style={{ background: "#fff", border: "1px solid #E2E8F0",
          borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "#475569",
          cursor: "pointer", marginBottom: 16, fontFamily: "Tahoma",
          display: "flex", alignItems: "center", gap: 6 }}>
          ← رجوع للمشاريع
        </button>

        {/* بطاقة المشروع */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px",
          marginBottom: 16, border: "1px solid #E2E8F0",
          borderTop: "4px solid " + (ts.color || "#D97706") }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {proj.type && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 20, background: ts.bg, color: ts.color }}>
                {ts.icon} {proj.type}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
              borderRadius: 20,
              background: proj.status === "active" ? "#DCFCE7" : "#F1F5F9",
              color: proj.status === "active" ? "#16A34A" : "#64748B" }}>
              {proj.status === "active" ? "● قيد العمل" : "✓ منتهي"}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>
            {proj.name}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {proj.startDate && <span style={{ fontSize: 12, color: "#64748B" }}>📅 {proj.startDate}</span>}
            {proj.days > 0  && <span style={{ fontSize: 12, color: "#64748B" }}>⏱️ {proj.days} يوم</span>}
            {proj.valueDin > 0 && <span style={{ fontSize: 12, color: "#D97706", fontWeight: 600 }}>
              🇮🇶 {fNum(proj.valueDin)} د.ع</span>}
            {proj.valueDol > 0 && <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
              🇺🇸 {fNum(proj.valueDol)} $</span>}
          </div>
        </div>

        {/* ملخص مالي */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16,
          border: "1px solid #E2E8F0", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
              📊 الملخص المالي
            </div>
            <button onClick={doPrint} style={{ background: "#D97706", border: "none",
              borderRadius: 9, padding: "7px 14px", color: "#fff", cursor: "pointer",
              fontSize: 12, fontFamily: "Tahoma", fontWeight: 700 }}>
              🖨️ طباعة الكشف
            </button>
          </div>
          {/* الدينار */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>🇮🇶 الدينار العراقي</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↓ مستلم</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{fNum(totalIn("دينار"))} د.ع</div>
              </div>
              <div style={{ background: "#FFF1F2", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↑ مصروف</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{fNum(totalOut("دينار"))} د.ع</div>
              </div>
              <div style={{ background: totalIn("دينار")-totalOut("دينار") >= 0 ? "#FFFBEB" : "#FFF1F2",
                borderRadius: 10, padding: "10px", textAlign: "center",
                border: "2px solid " + (totalIn("دينار")-totalOut("دينار") >= 0 ? "#D97706" : "#DC2626") }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>⚖️ الميزان</div>
                <div style={{ fontSize: 13, fontWeight: 700,
                  color: totalIn("دينار")-totalOut("دينار") >= 0 ? "#D97706" : "#DC2626" }}>
                  {totalIn("دينار")-totalOut("دينار") >= 0 ? "+" : ""}{fNum(totalIn("دينار")-totalOut("دينار"))} د.ع
                </div>
              </div>
            </div>
          </div>
          {/* الدولار */}
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>🇺🇸 الدولار الأمريكي</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↓ مستلم</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{fNum(totalIn("دولار"))} $</div>
              </div>
              <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↑ مصروف</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{fNum(totalOut("دولار"))} $</div>
              </div>
              <div style={{ background: totalIn("دولار")-totalOut("دولار") >= 0 ? "#EFF6FF" : "#FFF1F2",
                borderRadius: 10, padding: "10px", textAlign: "center",
                border: "2px solid " + (totalIn("دولار")-totalOut("دولار") >= 0 ? "#2563EB" : "#DC2626") }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>⚖️ الميزان</div>
                <div style={{ fontSize: 13, fontWeight: 700,
                  color: totalIn("دولار")-totalOut("دولار") >= 0 ? "#2563EB" : "#DC2626" }}>
                  {totalIn("دولار")-totalOut("دولار") >= 0 ? "+" : ""}{fNum(totalIn("دولار")-totalOut("دولار"))} $
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setTab("in"); setShow(false); }} style={{
            border: tab === "in" ? "none" : "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px", cursor: "pointer",
            fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "in" ? "#16A34A" : "#fff",
            color: tab === "in" ? "#fff" : "#64748B"
          }}>↓ المبالغ المستلمة ({inTxs.length})</button>
          <button onClick={() => { setTab("out"); setShow(false); }} style={{
            border: tab === "out" ? "none" : "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px", cursor: "pointer",
            fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "out" ? "#DC2626" : "#fff",
            color: tab === "out" ? "#fff" : "#64748B"
          }}>↑ المبالغ المصروفة ({outTxs.length})</button>
        </div>

        {/* زر إضافة */}
        <button onClick={() => setShow(v => !v)} style={{
          width: "100%", border: "none", borderRadius: 12, padding: "13px",
          fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Tahoma",
          marginBottom: 14,
          background: show ? "#475569" : tab === "in" ? "#16A34A" : "#DC2626",
          color: "#fff"
        }}>
          {show ? "✕ إلغاء" : tab === "in" ? "+ إضافة مبلغ مستلم" : "+ إضافة مبلغ مصروف"}
        </button>

        {/* فورم الإضافة */}
        {show && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 18,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            {/* العملة */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              العملة
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["دينار","دولار"].map(cur => (
                <button key={cur} onClick={() => sf("currency")(cur)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
                  border: "2px solid " + (form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#E2E8F0"),
                  background: form.currency === cur ? (cur === "دينار" ? "#F0FDF4" : "#EFF6FF") : "#fff",
                  color: form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#94A3B8"
                }}>
                  {cur === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                </button>
              ))}
            </div>

            {/* المبلغ */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المبلغ *
            </div>
            <input placeholder="٠" value={form.amount} inputMode="numeric"
              onChange={e => sf("amount")(e.target.value.replace(/[^0-9]/g, ""))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B",
                MozAppearance: "textfield", WebkitAppearance: "none" }}/>
            {amt > 0 && (
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12,
                color: form.currency === "دينار" ? "#16A34A" : "#2563EB" }}>
                ✍️ {w2(amt)} {form.currency === "دينار" ? "دينار عراقي" : "دولار أمريكي"}
                {" — "}{fNum(amt)} {form.currency === "دينار" ? "د.ع" : "$"}
              </div>
            )}
            {!amt && <div style={{ marginBottom: 12 }}/>}

            {/* المستلم */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              {tab === "in" ? "المستلم *" : "صُرف على *"}
            </div>
            <input placeholder={tab === "in" ? "اسم المستلم..." : "وجهة الصرف..."}
              value={form.receiver}
              onChange={e => sf("receiver")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* التاريخ */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              التاريخ *
            </div>
            <input type="date" value={form.date}
              onChange={e => sf("date")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* الملاحظات */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              ملاحظات
            </div>
            <textarea placeholder="أي تفاصيل إضافية..."
              value={form.note}
              onChange={e => sf("note")(e.target.value)}
              rows={3}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 16, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B", resize: "none" }}/>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <button onClick={addTx} disabled={!amt || !form.receiver.trim()} style={{
                border: "none", borderRadius: 10, padding: "13px",
                fontSize: 14, fontWeight: 700, fontFamily: "Tahoma",
                cursor: amt && form.receiver.trim() ? "pointer" : "not-allowed",
                background: amt && form.receiver.trim()
                  ? (tab === "in" ? "#16A34A" : "#DC2626") : "#E2E8F0",
                color: amt && form.receiver.trim() ? "#fff" : "#94A3B8"
              }}>
                {tab === "in" ? "✅ تسجيل المبلغ المستلم" : "✅ تسجيل المبلغ المصروف"}
              </button>
              {amt > 0 && form.receiver.trim() && (
                <button onClick={() => {
                  const isDol = form.currency === "دولار";
                  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:30px;direction:rtl;max-width:400px}
.top{text-align:center;border-bottom:2px dashed #E2E8F0;padding-bottom:14px;margin-bottom:14px}
.co{font-size:18px;font-weight:700;color:#1E293B}.ca{font-size:11px;color:#64748B;margin-top:3px}
.title{font-size:14px;font-weight:700;color:${tab==="in"?"#16A34A":"#DC2626"};margin:14px 0 10px}
.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F1F5F9}
.lbl{font-size:12px;color:#64748B}.val{font-size:12px;font-weight:700;color:#1E293B}
.amount{font-size:22px;font-weight:700;text-align:center;margin:14px 0;
  color:${tab==="in"?"#16A34A":"#DC2626"}}
.footer{text-align:center;font-size:10px;color:#94A3B8;margin-top:16px;border-top:2px dashed #E2E8F0;padding-top:10px}
</style></head><body>
<div class="top">
  <div class="co">شركة باب المشاريع</div>
  <div class="ca">بغداد</div>
</div>
<div class="title">${tab==="in"?"🧾 إيصال استلام":"🧾 إيصال صرف"}</div>
<div class="amount">${tab==="in"?"+":"-"}${fNum(amt)} ${isDol?"$":"د.ع"}</div>
<div style="font-size:12px;color:#64748B;text-align:center;margin-bottom:12px">
  ${w2(amt)} ${isDol?"دولار أمريكي":"دينار عراقي"}
</div>
<div class="row"><span class="lbl">المشروع</span><span class="val">${proj.name}</span></div>
<div class="row"><span class="lbl">${tab==="in"?"المستلم":"صُرف على"}</span><span class="val">${form.receiver}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${form.date}</span></div>
${form.note?`<div class="row"><span class="lbl">ملاحظة</span><span class="val">${form.note}</span></div>`:""}
<div class="footer">طُبع: ${new Date().toISOString().split("T")[0]}</div>
</body></html>`;
                  const w = window.open("","_blank","width=500,height=600");
                  if(!w){alert("السماح بالنوافذ المنبثقة");return;}
                  w.document.write(html);w.document.close();w.focus();
                  setTimeout(()=>w.print(),600);
                }} style={{ border: "none", borderRadius: 10, padding: "13px 14px",
                  background: "#F0F9FF", border: "1px solid #0EA5E9",
                  color: "#0EA5E9", cursor: "pointer", fontSize: 13,
                  fontFamily: "Tahoma", fontWeight: 700, whiteSpace: "nowrap" }}>
                  🖨️ إيصال
                </button>
              )}
            </div>
          </div>
        )}

        {/* قائمة الحركات */}
        {(tab === "in" ? inTxs : outTxs).length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#94A3B8",
            background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0" }}>
            {tab === "in" ? "ما في مبالغ مستلمة بعد" : "ما في مبالغ مصروفة بعد"}
          </div>
        ) : (
          (tab === "in" ? inTxs : outTxs).map(t => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px",
              marginBottom: 10, border: "1px solid #E2E8F0",
              borderRight: "5px solid " + (tab === "in" ? "#16A34A" : "#DC2626") }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  {/* المبلغ + العملة */}
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4,
                    color: tab === "in" ? "#16A34A" : "#DC2626" }}>
                    {tab === "in" ? "↓ " : "↑ "}
                    {fNum(t.amount)} {t.currency === "دينار" ? "د.ع" : "$"}
                  </div>
                  {/* كتابة */}
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>
                    ✍️ {w2(t.amount)} {t.currency === "دينار" ? "دينار" : "دولار"}
                  </div>
                  {/* العملة badge */}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px",
                    borderRadius: 20, marginBottom: 6, display: "inline-block",
                    background: t.currency === "دينار" ? "#F0FDF4" : "#EFF6FF",
                    color: t.currency === "دينار" ? "#16A34A" : "#2563EB" }}>
                    {t.currency === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                  </span>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>
                      👤 {t.receiver}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                      📅 {t.date}
                    </div>
                    {t.note && (
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 4,
                        background: "#F8FAFC", borderRadius: 7, padding: "5px 8px" }}>
                        📝 {t.note}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTx(t.id)} style={{
                  background: "none", border: "none", color: "#DC2626",
                  cursor: "pointer", fontSize: 13, fontFamily: "Tahoma",
                  fontWeight: 600, marginRight: 8
                }}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
