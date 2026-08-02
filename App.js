import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc,
  updateDoc, setDoc, query, where, getDocs, getDoc } from "firebase/firestore";
import { PASS, PROVINCES, PARTNERS, TYPES, fNum, w2 } from "./constants";
import HomePage     from "./pages/HomePage";
import AdminPage    from "./pages/AdminPage";
import ProjectCard  from "./components/ProjectCard";
import ProjectDetail from "./pages/ProjectDetail";
import ClosingModal  from "./pages/ClosingModal";
import PartnerPage   from "./pages/PartnerPage";

const typeStyle = t => TYPES.find(x => x.val === t) || {};

export default function App() {
  const [page, setPage]       = useState("home");
  const [selProj, setSelProj] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tab, setTab]     = useState("active");
  const [form, setForm]   = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));

  const [funds, setFunds] = useState({});
  const [closingProj, setClosingProj] = useState(null);
  const [partnerPage, setPartnerPage] = useState(null); // {partner, mode:"view"|"withdraw"}

  useEffect(() => {
    return onSnapshot(collection(db, "funds"), snap => {
      const f = {};
      snap.docs.forEach(d => { f[d.id] = { din: d.data().din||0, dol: d.data().dol||0 }; });
      setFunds(f);
    });
  }, []);

  // حساب رصيد الشركاء = مجموع أرصدة الشركاء الأربعة (تلقائي)
  // لا حاجة لـ useEffect — الرصيد يُحدّث مباشرة عند كل توزيع أو سحب

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
    const pw = window.prompt("🔒 حذف المشروع\nأدخل الباسورد:");
    if (pw === null) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    await deleteDoc(doc(db, "projects", id));
    const s = await getDocs(query(collection(db, "project_txs"), where("projectId","==",id)));
    for (const d of s.docs) await deleteDoc(doc(db, "project_txs", d.id));
  };

  const editProject = async (id, data) => {
    const pw = window.prompt("🔒 تعديل المشروع\nأدخل الباسورد:");
    if (pw === null) return false;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return false; }
    await updateDoc(doc(db, "projects", id), data);
    return true;
  };

  const resetAllProjects = async () => {
    const pw = window.prompt("🔒 تصفير كل المشاريع\nأدخل الباسورد:");
    if (pw === null) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    if (!window.confirm("تأكيد: حذف كل المشاريع وبياناتها؟")) return;
    const ps = await getDocs(collection(db, "projects"));
    for (const d of ps.docs) await deleteDoc(doc(db, "projects", d.id));
    const ts = await getDocs(collection(db, "project_txs"));
    for (const d of ts.docs) await deleteDoc(doc(db, "project_txs", d.id));
  };

  const toggleStatus = async (id, current) => {
    const label = current === "active" ? "إنهاء المشروع" : "إعادة تفعيل المشروع";
    const pw = window.prompt("🔒 " + label + "\nأدخل الباسورد:");
    if (pw === null) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }

    if (current === "active") {
      // فتح شاشة توزيع الأرباح
      const proj = projects.find(p => p.id === id);
      if (proj) setClosingProj(proj);
    } else {
      // إعادة تفعيل — اسحب من الصناديق
      const proj = projects.find(p => p.id === id);
      if (!proj) return;
      const dists = proj.distributions || [];
      for (const d of dists) {
        const cur = funds[d.fund] || { din: 0, dol: 0 };
        await setDoc(doc(db, "funds", d.fund),
          { din: Math.max(0, cur.din - (d.din||0)),
            dol: Math.max(0, cur.dol - (d.dol||0)) },
          { merge: true });
        if (d.fund === "شركاء") {
          for (const p of PARTNERS) {
            const pDin = Math.round((d.din||0) * p.pct / 100);
            const pDol = Math.round((d.dol||0) * p.pct / 100);
            const pId  = "partner_" + p.id;
            const pCur = funds[pId] || { din: 0, dol: 0 };
            await setDoc(doc(db, "funds", pId),
              { din: Math.max(0, pCur.din - pDin), dol: Math.max(0, pCur.dol - pDol) },
              { merge: true });
          }
        }
      }
      await updateDoc(doc(db, "projects", id),
        { status: "active", distributions: [], closedAt: null });
    }
  };

  const confirmClose = async (proj, distPcts) => {
    const balDin = proj.balDin || 0;
    const balDol = proj.balDol || 0;
    const distributions = [];
    for (const d of distPcts) {
      if (!d.pct) continue;
      const din = Math.round(balDin * d.pct / 100);
      const dol = Math.round(balDol * d.pct / 100);
      const cur = funds[d.fund] || { din: 0, dol: 0 };
      await setDoc(doc(db, "funds", d.fund),
        { din: cur.din + din, dol: cur.dol + dol }, { merge: true });
      distributions.push({ fund: d.fund, label: d.label, pct: d.pct, din, dol });
      // توزيع حصص الشركاء + تحديث إجمالي شركاء
      if (d.fund === "شركاء") {
        for (const p of PARTNERS) {
          const pDin = Math.round(din * p.pct / 100);
          const pDol = Math.round(dol * p.pct / 100);
          const pId  = "partner_" + p.id;
          const pCur = funds[pId] || { din: 0, dol: 0 };
          await setDoc(doc(db, "funds", pId),
            { din: pCur.din + pDin, dol: pCur.dol + pDol }, { merge: true });
        }
      }
      // إذا لم تكن هناك أرصدة سابقة في صناديق الشركاء، تأكد من التوزيع الصحيح
    }
    await updateDoc(doc(db, "projects", proj.id), {
      status: "done", distributions,
      closedAt: new Date().toISOString().split("T")[0]
    });
    setClosingProj(null);
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

  // تحديث المشروع المفتوح تلقائياً عند تغير البيانات
  useEffect(() => {
    if (!selProj) return;
    const updated = projects.find(p => p.id === selProj.id);
    if (updated) setSelProj(updated);
  }, [projects]);

  if (closingProj) return <ClosingModal
    proj={closingProj} funds={funds}
    onConfirm={confirmClose}
    onCancel={() => setClosingProj(null)}/>;

  if (partnerPage) return <PartnerPage
    partner={partnerPage} funds={funds}
    onBack={() => setPartnerPage(null)}
    onWithdraw={async (pid, din, dol) => {
      const pId = "partner_" + pid;
      const pf = funds[pId] || { din:0, dol:0 };
      const sf = funds["شركاء"] || { din:0, dol:0 };
      await setDoc(doc(db,"funds",pId),
        { din: Math.max(0,pf.din-din), dol: Math.max(0,pf.dol-dol) }, {merge:true});
      await setDoc(doc(db,"funds","شركاء"),
        { din: Math.max(0,sf.din-din), dol: Math.max(0,sf.dol-dol) }, {merge:true});
    }}/>;

  if (page === "home")    return <HomePage onSelect={setPage} />;
  if (page === "admin")   return <AdminPage onBack={() => setPage("home")} />;
  if (page === "proj" && selProj)
    return <ProjectDetail proj={selProj} onBack={() => { setPage("projects"); setSelProj(null); }}/>;

  // الصفحة المالية الرئيسية — تُعرض عند page==="financial"
  if (page === "financial") return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:520, margin:"0 auto", padding:"24px 16px" }}>
        <button onClick={() => setPage("home")} style={{ background:"#fff",
          border:"1px solid #E2E8F0", borderRadius:10, padding:"8px 16px",
          fontSize:13, color:"#475569", cursor:"pointer", marginBottom:20,
          fontFamily:"Tahoma", display:"flex", alignItems:"center", gap:6 }}>
          ← رجوع للرئيسية
        </button>
        <div style={{ fontSize:20, fontWeight:700, color:"#1E293B", marginBottom:16 }}>
          💰 القسم المالي
        </div>

        {/* إجمالي كل الصناديق */}
        {(() => {
          const allFunds = [
            "رأس_المال","عام","شركاء",
            ...TYPES.map(t=>t.val)
          ]; // 7 صناديق فقط — شركاء تشمل حصص الشركاء
          const totalDin = allFunds.reduce((s,f)=>(funds[f]?.din||0)+s, 0);
          const totalDol = allFunds.reduce((s,f)=>(funds[f]?.dol||0)+s, 0);
          return (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              <div style={{ background:"linear-gradient(135deg,#D97706,#F59E0B)",
                borderRadius:14, padding:"16px", textAlign:"center",
                boxShadow:"0 4px 20px rgba(217,119,6,0.3)" }}>
                <div style={{ fontSize:12, color:"#FEF3C7", marginBottom:6 }}>
                  🇮🇶 جرد إجمالي الدينار
                </div>
                <div style={{ fontSize:11, color:"#FEF3C7", marginBottom:4 }}>
                  كل الصناديق مجتمعة
                </div>
                <div style={{ fontSize:20, fontWeight:700, color:"#fff" }}>
                  {fNum(totalDin)}
                </div>
                <div style={{ fontSize:12, color:"#FEF3C7" }}>د.ع</div>
              </div>
              <div style={{ background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",
                borderRadius:14, padding:"16px", textAlign:"center",
                boxShadow:"0 4px 20px rgba(29,78,216,0.3)" }}>
                <div style={{ fontSize:12, color:"#DBEAFE", marginBottom:6 }}>
                  🇺🇸 جرد إجمالي الدولار
                </div>
                <div style={{ fontSize:11, color:"#DBEAFE", marginBottom:4 }}>
                  كل الصناديق مجتمعة
                </div>
                <div style={{ fontSize:20, fontWeight:700, color:"#fff" }}>
                  {fNum(totalDol)}
                </div>
                <div style={{ fontSize:12, color:"#DBEAFE" }}>$</div>
              </div>
            </div>
          );
        })()}
        {/* زر المشاريع */}
        <button onClick={() => setPage("projects")} style={{ width:"100%",
          background:"#fff", border:"1px solid #E2E8F0", borderTop:"4px solid #D97706",
          borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"right",
          fontFamily:"Tahoma", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"#FFFBEB",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏗️</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:"#1E293B" }}>المشاريع</div>
              <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>
                {projects.filter(p=>p.status==="active").length} نشط ·{" "}
                {projects.filter(p=>p.status==="done").length} منتهي
              </div>
            </div>
          </div>
        </button>
        {/* الصناديق الأربعة */}
        <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
          💎 الصناديق
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          {/* صندوق رأس المال */}
          {[
            { fund:"رأس_المال", label:"رأس المال",   icon:"💼", color:"#059669", bg:"#ECFDF5" },
            { fund:"عام",       label:"الصندوق العام", icon:"🏦", color:"#D97706", bg:"#FFFBEB" },
          ].map(({ fund, label, icon, color, bg }) => {
            const f = funds[fund] || { din:0, dol:0 };
            return (
              <div key={fund} style={{ background:bg, borderRadius:14, padding:"14px 16px",
                border:"1.5px solid "+color+"40" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>{icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color }}>{label}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶 دينار</div>
                    <div style={{ fontSize:14, fontWeight:700, color }}>{fNum(f.din)} د.ع</div>
                  </div>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸 دولار</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#2563EB" }}>{fNum(f.dol)} $</div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* صندوق أرباح الشركاء — بطاقة كاملة */}
          {(() => {
            const sf = funds["شركاء"] || { din:0, dol:0 };
            return (
              <div style={{ background:"#FAF5FF", borderRadius:14, padding:"14px 16px",
                border:"1.5px solid #9333EA40", gridColumn:"span 2" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:20 }}>👥</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#9333EA" }}>أرباح الشركاء</span>
                  </div>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#9333EA" }}>
                      {fNum(sf.din)} <span style={{fontSize:10}}>د.ع</span>
                    </span>
                    {sf.dol > 0 && (
                      <span style={{ fontSize:13, fontWeight:700, color:"#2563EB" }}>
                        {fNum(sf.dol)} <span style={{fontSize:10}}>$</span>
                      </span>
                    )}
                    {/* زر توزيع الرصيد الحالي لأول مرة */}
                    {sf.din + sf.dol > 0 && (() => {
                      const sumDin = PARTNERS.reduce((s,p)=>s+(funds["partner_"+p.id]?.din||0),0);
                      const sumDol = PARTNERS.reduce((s,p)=>s+(funds["partner_"+p.id]?.dol||0),0);
                      if (Math.abs(sumDin - sf.din) < 2 && Math.abs(sumDol - sf.dol) < 2) return null;
                      return (
                        <button onClick={async () => {
                          for (const p of PARTNERS) {
                            const pDin = Math.round(sf.din * p.pct / 100);
                            const pDol = Math.round(sf.dol * p.pct / 100);
                            await setDoc(doc(db,"funds","partner_"+p.id),
                              { din: pDin, dol: pDol }, { merge: true });
                          }
                        }} style={{ fontSize:10, color:"#9333EA", background:"#fff",
                          border:"1px solid #9333EA", borderRadius:6, padding:"3px 8px",
                          cursor:"pointer", fontFamily:"Tahoma", fontWeight:700 }}>
                          🔄 توزيع
                        </button>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {PARTNERS.map(p => {
                    const pf = funds["partner_"+p.id] || { din:0, dol:0 };
                    return (
                      <button key={p.id} onClick={() => setPartnerPage(p)}
                        style={{ background:p.bg, border:"1.5px solid "+p.color+"50",
                          borderRadius:12, padding:"12px", textAlign:"right",
                          cursor:"pointer", fontFamily:"Tahoma" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:p.color,
                            background:"#fff", borderRadius:20, padding:"2px 8px" }}>
                            {p.pct}%
                          </span>
                          <span style={{ fontSize:13, fontWeight:700, color:"#1E293B" }}>
                            {p.name}
                          </span>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:p.color }}>
                          {fNum(pf.din)} <span style={{fontSize:10, color:"#64748B"}}>د.ع</span>
                        </div>
                        {pf.dol > 0 && (
                          <div style={{ fontSize:12, fontWeight:700, color:"#2563EB" }}>
                            {fNum(pf.dol)} <span style={{fontSize:10, color:"#64748B"}}>$</span>
                          </div>
                        )}
                        <div style={{ fontSize:10, color:"#9333EA", marginTop:5, fontWeight:600 }}>
                          اضغط للسحب ←
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        {/* صناديق الأقسام */}
        <div style={{ fontSize:13, fontWeight:700, color:"#64748B", marginBottom:10 }}>
          صناديق الأقسام
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {TYPES.map(({ val, icon, color, bg }) => {
            const f = funds[val] || { din:0, dol:0 };
            return (
              <div key={val} style={{ background:bg, borderRadius:14, padding:"14px 16px",
                border:"1.5px solid "+color+"40" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:18 }}>{icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color }}>{val}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶</div>
                    <div style={{ fontSize:13, fontWeight:700, color }}>{fNum(f.din)} د.ع</div>
                  </div>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#2563EB" }}>{fNum(f.dol)} $</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "22px 16px" }}>
        {/* رجوع للرئيسية */}
        <button onClick={() => setPage("financial")} style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
          padding: "8px 16px", fontSize: 13, color: "#475569", cursor: "pointer",
          marginBottom: 16, fontFamily: "Tahoma", display: "flex",
          alignItems: "center", gap: 6
        }}>← رجوع للقسم المالي</button>

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
            onOpen={() => { setSelProj(p); setPage("proj"); }}
            onToggle={() => toggleStatus(p.id, p.status)}
            onDelete={() => deleteProject(p.id)}
            onEdit={editProject} />
        )}
      </div>
    </div>
  );
}

