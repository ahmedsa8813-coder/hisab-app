import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, setDoc, query, where, getDocs } from "firebase/firestore";

// ─── Firebase (نفس المشروع) ───────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCBGovCJ_Bx64dOjC0UWzJsBPgXEuJaizI",
  authDomain: "bab-projects-b7d04.firebaseapp.com",
  projectId: "bab-projects-b7d04",
  storageBucket: "bab-projects-b7d04.firebasestorage.app",
  messagingSenderId: "982434748534",
  appId: "1:982434748534:web:ca0e52ef0115ecfc346757"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── ثوابت ────────────────────────────────────────────
const fNum = n => {
  if (!n && n !== 0) return "0";
  return Math.round(Number(n)).toLocaleString("en");
};

function w2(n) {
  const x = Math.floor(Math.abs(Number(n) || 0));
  if (!x) return "صفر";
  const o = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t2 = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h  = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g  = v => {
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

const PASS = "1234";

const MAIN_FUNDS = [
  { id:"رأس_المال", label:"رأس المال",     icon:"💼", color:"#059669", bg:"#ECFDF5" },
  { id:"عام",       label:"الصندوق العام", icon:"🏦", color:"#D97706", bg:"#FFFBEB" },
  { id:"شركاء",     label:"أرباح الشركاء",icon:"👥", color:"#9333EA", bg:"#FAF5FF" },
];

const DEPT_FUNDS = [
  { id:"إشراف",    label:"إشراف",    icon:"👷", color:"#0284C7", bg:"#F0F9FF" },
  { id:"ديكور",    label:"ديكور",    icon:"🎨", color:"#DB2777", bg:"#FDF2F8" },
  { id:"مقاولات",  label:"مقاولات",  icon:"🏗️", color:"#7C3AED", bg:"#F5F3FF" },
  { id:"واجهات",   label:"واجهات",   icon:"🏢", color:"#0891B2", bg:"#ECFEFF" },
];

const ALL_FUNDS = [...MAIN_FUNDS, ...DEPT_FUNDS];

// ─── التطبيق الرئيسي ─────────────────────────────────
export default function App2({ onBack }) {
  const [page, setPage] = useState("home"); // home | fund | employees
  const [selFund, setSelFund] = useState(null);
  const [funds, setFunds] = useState({});
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects]   = useState([]);

  useEffect(() => {
    return onSnapshot(collection(db, "projects"), snap => {
      setProjects(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "funds"), snap => {
      const f = {};
      snap.docs.forEach(d => { f[d.id] = { din: d.data().din||0, dol: d.data().dol||0 }; });
      setFunds(f);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "employees"), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (a.name||"").localeCompare(b.name||""));
      setEmployees(list);
    });
  }, []);

  if (page === "fund" && selFund)
    return <FundPage fund={selFund} funds={funds}
      onBack={() => { setPage("home"); setSelFund(null); }}/>;

  if (page === "employees")
    return <EmployeesPage employees={employees}
      onBack={() => setPage("home")}/>;

  // الصفحة الرئيسية
  const fundsDin    = ALL_FUNDS.reduce((s,f) => s + (funds[f.id]?.din||0), 0);
  const fundsDol    = ALL_FUNDS.reduce((s,f) => s + (funds[f.id]?.dol||0), 0);
  const activeDin   = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDin||0),0);
  const activeDol   = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDol||0),0);
  const totalDin    = fundsDin + activeDin;
  const totalDol    = fundsDol + activeDol;

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:540, margin:"0 auto", padding:"22px 16px" }}>

        {/* رجوع */}
        <button onClick={onBack} style={{ background:"#fff",
          border:"1px solid #E2E8F0", borderRadius:10, padding:"8px 16px",
          fontSize:13, color:"#475569", cursor:"pointer", marginBottom:16,
          fontFamily:"Tahoma", display:"flex", alignItems:"center", gap:6 }}>
          ← رجوع للقائمة الرئيسية
        </button>

        {/* هيدر */}
        <div style={{ background:"linear-gradient(135deg,#1E293B,#334155)",
          borderRadius:18, padding:"20px", marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:4 }}>
            🏢 شركة باب المشاريع
          </div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>نظام الحسابات الداخلي</div>
        </div>

        {/* الجرد الإجمالي */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:10, marginBottom:12 }}>
          <div style={{ background:"linear-gradient(135deg,#D97706,#F59E0B)",
            borderRadius:14, padding:16, textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#FEF3C7", marginBottom:4 }}>
              🇮🇶 جرد الدينار الكلي
            </div>
            <div style={{ fontSize:19, fontWeight:700, color:"#fff" }}>
              {fNum(totalDin)}
            </div>
            <div style={{ fontSize:10, color:"#FEF3C7" }}>د.ع</div>
          </div>
          <div style={{ background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",
            borderRadius:14, padding:16, textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#DBEAFE", marginBottom:4 }}>
              🇺🇸 جرد الدولار الكلي
            </div>
            <div style={{ fontSize:19, fontWeight:700, color:"#fff" }}>
              {fNum(totalDol)}
            </div>
            <div style={{ fontSize:10, color:"#DBEAFE" }}>$</div>
          </div>
        </div>

        {/* تفصيل الجرد */}
        <div style={{ background:"#fff", borderRadius:12, padding:"12px 16px",
          marginBottom:20, border:"1px solid #E2E8F0" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            fontSize:11, color:"#64748B", marginBottom:6 }}>
            <span>💎 الصناديق (7)</span>
            <div>
              <span style={{ color:"#D97706", fontWeight:700 }}>{fNum(fundsDin)} د.ع</span>
              <span style={{ color:"#94A3B8" }}> | </span>
              <span style={{ color:"#2563EB", fontWeight:700 }}>{fNum(fundsDol)} $</span>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between",
            fontSize:11, color:"#64748B" }}>
            <span>🏗️ مشاريع قيد التنفيذ ({projects.filter(p=>p.status==="active").length})</span>
            <div>
              <span style={{ color:"#16A34A", fontWeight:700 }}>{fNum(activeDin)} د.ع</span>
              <span style={{ color:"#94A3B8" }}> | </span>
              <span style={{ color:"#2563EB", fontWeight:700 }}>{fNum(activeDol)} $</span>
            </div>
          </div>
        </div>

        {/* الصناديق الرئيسية */}
        <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:10 }}>
          💎 الصناديق الرئيسية
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          {MAIN_FUNDS.map(f => {
            const bal = funds[f.id] || { din:0, dol:0 };
            return (
              <button key={f.id} onClick={() => { setSelFund(f); setPage("fund"); }}
                style={{ background:f.bg, border:"1.5px solid "+f.color+"40",
                  borderRadius:14, padding:"14px", textAlign:"right",
                  cursor:"pointer", fontFamily:"Tahoma",
                  gridColumn: f.id==="شركاء"?"span 2":"span 1" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>{f.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:f.color }}>{f.label}</span>
                  <span style={{ marginRight:"auto", fontSize:10, color:f.color,
                    background:"#fff", borderRadius:20, padding:"2px 8px" }}>← تفاصيل</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶 دينار</div>
                    <div style={{ fontSize:13, fontWeight:700, color:f.color }}>{fNum(bal.din)}</div>
                  </div>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸 دولار</div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* صناديق الأقسام */}
        <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:10 }}>
          🏗️ صناديق الأقسام
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          {DEPT_FUNDS.map(f => {
            const bal = funds[f.id] || { din:0, dol:0 };
            return (
              <button key={f.id} onClick={() => { setSelFund(f); setPage("fund"); }}
                style={{ background:f.bg, border:"1.5px solid "+f.color+"40",
                  borderRadius:14, padding:"14px", textAlign:"right",
                  cursor:"pointer", fontFamily:"Tahoma" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:18 }}>{f.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:f.color }}>{f.label}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶</div>
                    <div style={{ fontSize:13, fontWeight:700, color:f.color }}>{fNum(bal.din)} د.ع</div>
                  </div>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸</div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)} $</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* الموظفين */}
        <button onClick={() => setPage("employees")} style={{
          width:"100%", background:"#fff", border:"1px solid #E2E8F0",
          borderTop:"4px solid #0284C7", borderRadius:14, padding:"16px 20px",
          cursor:"pointer", textAlign:"right", fontFamily:"Tahoma" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"#F0F9FF",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              👷
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#1E293B" }}>الموظفون</div>
              <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>
                {employees.length} موظف مسجل
              </div>
            </div>
            <span style={{ marginRight:"auto", fontSize:12, color:"#0284C7", fontWeight:600 }}>
              ← إدارة
            </span>
          </div>
        </button>

      </div>
    </div>
  );
}

// ─── صفحة تفاصيل الصندوق ─────────────────────────────
function FundPage({ fund, funds, onBack }) {
  const bal = funds[fund.id] || { din:0, dol:0 };
  const [txs, setTxs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type:"إيداع", din:"", dol:"", note:"",
    date: new Date().toISOString().split("T")[0] });
  const sf = k => v => setForm(f => ({...f, [k]:v}));
  const [showStmt, setShowStmt] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  useEffect(() => {
    return onSnapshot(
      query(collection(db,"fund_txs"), where("fundId","==",fund.id)),
      snap => {
        const list = snap.docs.map(d => ({id:d.id,...d.data()}));
        list.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
        setTxs(list);
      }
    );
  }, [fund.id]);

  const addTx = async () => {
    const din = Number(form.din)||0;
    const dol = Number(form.dol)||0;
    if (!din && !dol) return;
    const isIn = form.type === "إيداع";
    if (!isIn) {
      if (din > bal.din) { alert("⛔ يتجاوز رصيد الدينار! المتاح: "+fNum(bal.din)+" د.ع"); return; }
      if (dol > bal.dol) { alert("⛔ يتجاوز رصيد الدولار! المتاح: "+fNum(bal.dol)+" $"); return; }
    }
    await addDoc(collection(db,"fund_txs"), {
      fundId: fund.id, fundLabel: fund.label,
      type: form.type, din, dol,
      note: form.note.trim(),
      date: form.date,
      createdAt: new Date().toISOString()
    });
    const newDin = isIn ? bal.din+din : bal.din-din;
    const newDol = isIn ? bal.dol+dol : bal.dol-dol;
    await setDoc(doc(db,"funds",fund.id), { din:Math.max(0,newDin), dol:Math.max(0,newDol) }, {merge:true});
    setForm({ type:form.type, din:"", dol:"", note:"", date:form.date });
    setShowAdd(false);
  };

  const printStatement = () => {
    const filtered = txs.filter(t => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate   && t.date > toDate)   return false;
      return true;
    }).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.createdAt||"").localeCompare(b.createdAt||""));

    if (!filtered.length) { alert("ما في حركات في هذه الفترة"); return; }

    let runDin=0, runDol=0, n=0;
    let totDepDin=0, totDepDol=0, totOutDin=0, totOutDol=0;
    const rows = filtered.map(t => {
      n++;
      const isIn = t.type==="إيداع";
      const d=t.din||0, l=t.dol||0;
      if(isIn){runDin+=d;runDol+=l;totDepDin+=d;totDepDol+=l;}
      else    {runDin-=d;runDol-=l;totOutDin+=d;totOutDol+=l;}
      return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
        <td>${n}</td><td>${t.date||""}</td>
        <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"↓ إيداع":"↑ صرف"}</td>
        <td style="text-align:right">${t.note||"—"}</td>
        <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"+":"-"}${fNum(d)} د.ع</td>
        <td style="color:${isIn?"#16A34A":"#2563EB"};font-weight:700">${isIn?"+":"-"}${fNum(l)} $</td>
        <td style="font-weight:700;color:${runDin>=0?"#D97706":"#DC2626"}">${fNum(runDin)} د.ع</td>
      </tr>`;
    }).join("");

    const today = new Date().toISOString().split("T")[0];
    const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:22px;direction:rtl}
.hdr{text-align:center;border-bottom:3px solid ${fund.color};padding-bottom:12px;margin-bottom:14px}
.co{font-size:20px;font-weight:700}.ca{font-size:11px;color:#64748B}
.title{font-size:16px;font-weight:700;color:${fund.color};margin:10px 0 4px}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
.sb{border-radius:8px;padding:10px;text-align:center}
.sl{font-size:9px;color:#64748B;margin-bottom:3px}.sv{font-size:13px;font-weight:700}
table{width:100%;border-collapse:collapse}
thead tr{background:${fund.color}}th{color:#fff;padding:8px 6px;font-size:10px}
td{padding:7px 6px;font-size:10px;text-align:center;border-bottom:1px solid #F1F5F9}
.tot td{background:#F1F5F9;font-weight:700;border-top:2px solid ${fund.color}}
.ft{margin-top:12px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between}
</style></head><body>
<div class="hdr"><div class="co">شركة باب المشاريع</div><div class="ca">بغداد — العرصات</div></div>
<div class="title">${fund.icon} كشف حساب — ${fund.label}</div>
<p style="font-size:11px;color:#64748B">الفترة: ${fromDate||"البداية"} — ${toDate||"اليوم"} · ${filtered.length} حركة</p>
<div class="sg">
  <div class="sb" style="background:#F0FDF4"><div class="sl">↓ إيداعات دينار</div><div class="sv" style="color:#16A34A">+${fNum(totDepDin)} د.ع</div></div>
  <div class="sb" style="background:#FFF1F2"><div class="sl">↑ صرف دينار</div><div class="sv" style="color:#DC2626">-${fNum(totOutDin)} د.ع</div></div>
  <div class="sb" style="background:#EFF6FF"><div class="sl">↓ إيداعات دولار</div><div class="sv" style="color:#2563EB">+${fNum(totDepDol)} $</div></div>
  <div class="sb" style="background:${fund.bg};border:2px solid ${fund.color}40"><div class="sl">⚖️ الرصيد الحالي</div><div class="sv" style="color:${fund.color}">${fNum(bal.din)} د.ع</div></div>
</div>
<table><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th style="text-align:right">البيان</th><th>دينار</th><th>دولار</th><th>الميزان</th></tr></thead>
<tbody>${rows}</tbody>
<tr class="tot"><td colspan="3">الإجمالي</td><td></td>
<td>+${fNum(totDepDin)}/-${fNum(totOutDin)}</td>
<td>+${fNum(totDepDol)}/-${fNum(totOutDol)}</td>
<td style="color:${fund.color}">${fNum(bal.din)} د.ع</td></tr>
</table>
<div class="ft"><span>${fund.label} — شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;
    const w=window.open("","_blank","width=980,height=720");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),700);
  };

  const totIn  = { din:txs.filter(t=>t.type==="إيداع").reduce((s,t)=>s+(t.din||0),0),
                   dol:txs.filter(t=>t.type==="إيداع").reduce((s,t)=>s+(t.dol||0),0) };
  const totOut = { din:txs.filter(t=>t.type!=="إيداع").reduce((s,t)=>s+(t.din||0),0),
                   dol:txs.filter(t=>t.type!=="إيداع").reduce((s,t)=>s+(t.dol||0),0) };

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:560, margin:"0 auto", padding:"22px 16px" }}>

        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>

        {/* هيدر الصندوق */}
        <div style={{ background:fund.bg, borderRadius:16, padding:"18px 20px",
          border:"2px solid "+fund.color+"40", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontSize:28 }}>{fund.icon}</span>
            <span style={{ fontSize:18, fontWeight:700, color:fund.color }}>{fund.label}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>↓ إيداعات دينار</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#16A34A" }}>{fNum(totIn.din)} د.ع</div>
            </div>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>↑ صرف دينار</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#DC2626" }}>{fNum(totOut.din)} د.ع</div>
            </div>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center",
              border:"2px solid "+fund.color }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>⚖️ الرصيد</div>
              <div style={{ fontSize:14, fontWeight:700, color:fund.color }}>{fNum(bal.din)} د.ع</div>
              {bal.dol>0&&<div style={{ fontSize:11, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)} $</div>}
            </div>
          </div>
        </div>

        {/* أزرار */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <button onClick={()=>setShowAdd(v=>!v)} style={{ border:"none", borderRadius:12,
            padding:"12px", fontSize:14, fontWeight:700, fontFamily:"Tahoma",
            background:showAdd?"#475569":fund.color, color:"#fff", cursor:"pointer" }}>
            {showAdd?"✕ إلغاء":"+ إضافة حركة"}
          </button>
          <button onClick={()=>setShowStmt(v=>!v)} style={{ border:"1px solid "+fund.color,
            borderRadius:12, padding:"12px", fontSize:14, fontWeight:700,
            fontFamily:"Tahoma", background:"#fff", color:fund.color, cursor:"pointer" }}>
            🖨️ كشف الحساب
          </button>
        </div>

        {/* فورم الإضافة */}
        {showAdd && (
          <div style={{ background:"#fff", borderRadius:14, padding:16,
            border:"1px solid #E2E8F0", marginBottom:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              {["إيداع","صرف"].map(t=>(
                <button key={t} onClick={()=>sf("type")(t)} style={{
                  border:"2px solid "+(form.type===t?t==="إيداع"?"#16A34A":"#DC2626":"#E2E8F0"),
                  borderRadius:10, padding:"10px", cursor:"pointer",
                  fontFamily:"Tahoma", fontSize:13, fontWeight:700,
                  background:form.type===t?t==="إيداع"?"#F0FDF4":"#FFF1F2":"#fff",
                  color:form.type===t?t==="إيداع"?"#16A34A":"#DC2626":"#94A3B8"
                }}>{t==="إيداع"?"↓ إيداع":"↑ صرف"}</button>
              ))}
            </div>
            {[{l:"مبلغ الدينار",k:"din",c:"#16A34A"},{l:"مبلغ الدولار",k:"dol",c:"#2563EB"}].map(({l,k,c})=>(
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, color:c, fontWeight:600, marginBottom:5 }}>{l}</div>
                <input type="text" inputMode="numeric" placeholder="٠" value={form[k]}
                  onChange={e=>sf(k)(e.target.value.replace(/[^0-9]/g,""))}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"11px 13px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>البيان</div>
              <input placeholder="وصف الحركة..." value={form.note} onChange={e=>sf("note")(e.target.value)}
                style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                  padding:"11px 13px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                  direction:"rtl", boxSizing:"border-box", background:"#F8FAFC" }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>التاريخ</div>
              <input type="date" value={form.date} onChange={e=>sf("date")(e.target.value)}
                style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                  padding:"11px 13px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                  boxSizing:"border-box", background:"#F8FAFC" }}/>
            </div>
            <button onClick={addTx} disabled={!Number(form.din)&&!Number(form.dol)}
              style={{ width:"100%", border:"none", borderRadius:10, padding:"13px",
                fontSize:14, fontWeight:700, fontFamily:"Tahoma", cursor:"pointer",
                background:Number(form.din)||Number(form.dol)?fund.color:"#E2E8F0",
                color:Number(form.din)||Number(form.dol)?"#fff":"#94A3B8" }}>
              ✅ تأكيد الحركة
            </button>
          </div>
        )}

        {/* كشف الحساب - فلترة */}
        {showStmt && (
          <div style={{ background:"#FFFBEB", borderRadius:14, padding:16,
            border:"1px solid #D97706", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#D97706", marginBottom:12 }}>
              🖨️ كشف الحساب
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>من تاريخ</div>
                <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>إلى تاريخ</div>
                <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
            </div>
            <div style={{ fontSize:12, color:"#64748B", marginBottom:12 }}>
              سيتم طباعة <strong>{txs.filter(t=>(!fromDate||t.date>=fromDate)&&(!toDate||t.date<=toDate)).length}</strong> حركة
            </div>
            <button onClick={printStatement} style={{ width:"100%", border:"none",
              borderRadius:10, padding:"12px", fontSize:14, fontWeight:700,
              fontFamily:"Tahoma", background:fund.color, color:"#fff", cursor:"pointer" }}>
              🖨️ طباعة الكشف
            </button>
          </div>
        )}

        {/* قائمة الحركات */}
        <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px",
          border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
            📋 سجل الحركات ({txs.length})
          </div>
          {txs.length===0 ? (
            <div style={{ textAlign:"center", padding:20, color:"#94A3B8" }}>ما في حركات بعد</div>
          ) : txs.map(t=>{
            const isIn = t.type==="إيداع";
            return (
              <div key={t.id} style={{ borderRadius:10, padding:"12px 14px", marginBottom:8,
                border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626") }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700,
                      color:isIn?"#16A34A":"#DC2626", marginBottom:3 }}>
                      {isIn?"↓ إيداع":"↑ صرف"}
                    </div>
                    <div style={{ fontSize:11, color:"#64748B" }}>📅 {t.date}</div>
                    {t.note&&<div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{t.note}</div>}
                  </div>
                  <div style={{ textAlign:"left" }}>
                    {(t.din||0)>0&&<div style={{ fontSize:14, fontWeight:700,
                      color:isIn?"#16A34A":"#DC2626" }}>
                      {isIn?"+":"-"}{fNum(t.din)} <span style={{fontSize:10}}>د.ع</span>
                    </div>}
                    {(t.dol||0)>0&&<div style={{ fontSize:12, fontWeight:700, color:"#2563EB" }}>
                      {isIn?"+":"-"}{fNum(t.dol)} <span style={{fontSize:10}}>$</span>
                    </div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── صفحة الموظفين ───────────────────────────────────
function EmployeesPage({ employees, onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:540, margin:"0 auto", padding:"22px 16px" }}>
        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>
        <div style={{ background:"#fff", borderRadius:14, padding:"20px",
          border:"1px solid #E2E8F0", textAlign:"center", color:"#64748B" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>👷</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#1E293B", marginBottom:6 }}>
            قريباً — إدارة الموظفين
          </div>
          <div style={{ fontSize:13 }}>سيتم إضافة هذا القسم قريباً</div>
        </div>
      </div>
    </div>
  );
}
