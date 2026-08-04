import React, { useState, useEffect } from "react";
import { EmployeesPage, ReportsPage, FinancialReportsPage } from "./App3";
import { AssetsPage, OpeningBalancesPage, SettingsPage, ExpensesPage, DebtsPage } from "./App4";
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
  const [assets,   setAssets]     = useState([]);
  const [isMobile, setIsMobile]   = useState(typeof window!=="undefined"&&window.innerWidth<768);
  const [sideOpen, setSideOpen]   = useState(false);

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);

  useEffect(()=>{
    return onSnapshot(collection(db,"assets"), snap=>{
      setAssets(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  },[]);

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
    return <FundPage fund={selFund} funds={funds} projects={projects}
      onBack={() => { setPage("home"); setSelFund(null); }}/>;

  if (page === "employees")
    return <EmployeesPage funds={funds}
      onBack={() => setPage("home")}/>;

  if (page === "reports")
    return <ReportsPage funds={funds} projects={projects}
      onBack={() => setPage("home")}/>;

  if (page === "assets")
    return <AssetsPage funds={funds} onBack={() => setPage("home")}/>;

  if (page === "opening")
    return <OpeningBalancesPage funds={funds} onBack={() => setPage("home")}/>;

  if (page === "expenses")
    return <ExpensesPage funds={funds} onBack={() => setPage("home")}/>;

  if (page === "settings")
    return <SettingsPage funds={funds} onBack={() => setPage("home")}/>;

  if (page === "debts")
    return <DebtsPage funds={funds} onBack={() => setPage("home")}/>;

  if (page === "financial_reports")
    return <FinancialReportsPage funds={funds} projects={projects}
      onBack={() => setPage("home")}/>;

  // الصفحة الرئيسية
  const fundsDin    = ALL_FUNDS.reduce((s,f) => s + (funds[f.id]?.din||0), 0);
  const fundsDol    = ALL_FUNDS.reduce((s,f) => s + (funds[f.id]?.dol||0), 0);
  const activeDin   = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDin||0),0);
  const activeDol   = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDol||0),0);
  const totalDin    = fundsDin + activeDin;
  const totalDol    = fundsDol + activeDol;

  const NAV_ITEMS = [
    {id:"fund",      label:"الصناديق",   icon:"💎"},
    {id:"reports",   label:"التقارير",   icon:"📊"},
    {id:"assets",    label:"الأصول",     icon:"📦"},
    {id:"employees", label:"الموظفون",   icon:"👷"},
    {id:"settings",  label:"الإعدادات", icon:"⚙️"},
  ];

  // Navigation groups
  const NAV_GROUPS = [
    {
      title:"الصناديق", icon:"💎",
      items:[
        ...MAIN_FUNDS.map(f=>({id:"fund_"+f.id,label:f.label,icon:f.icon,fund:f})),
        ...DEPT_FUNDS.map(f=>({id:"fund_"+f.id,label:f.label,icon:f.icon,fund:f})),
      ]
    },
    {
      title:"الإدارة", icon:"📋",
      items:[
        {id:"employees",    label:"الموظفون",          icon:"👷"},
        {id:"debts",        label:"الذمم المالية",      icon:"💳"},
        {id:"expenses",     label:"المصاريف الثابتة",  icon:"🏠"},
        {id:"assets",       label:"الأصول الثابتة",    icon:"📦"},
        {id:"opening",      label:"الأرصدة الافتتاحية",icon:"🏁"},
      ]
    },
    {
      title:"التقارير", icon:"📊",
      items:[
        {id:"reports",          label:"التقارير العامة",    icon:"📊"},
        {id:"financial_reports",label:"الميزانية والأرباح", icon:"📈"},
      ]
    },
    {
      title:"الإعدادات", icon:"⚙️",
      items:[
        {id:"settings", label:"الإعدادات والنسخ الاحتياطي", icon:"⚙️"},
      ]
    },
  ];

  const P = isMobile ? "16px" : "28px 28px 28px 20px";

  return (
    <div style={{ minHeight:"100vh", fontFamily:"Tahoma",
      direction:"rtl", display:"flex", background:"#F1F5F9",
      position:"relative" }}>

      {/* ─── Mobile Overlay ─── */}
      {isMobile && sideOpen && (
        <div onClick={()=>setSideOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
            zIndex:40 }}/>
      )}

      {/* ─── المحتوى ─── */}
      <div style={{ flex:1, overflow:"auto", padding:P }}>

        {/* هيدر */}
        <div style={{ marginBottom:isMobile?16:24,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:isMobile?18:22, fontWeight:700, color:"#0F172A" }}>
              لوحة الحسابات
            </div>
            <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>
              {new Date().toLocaleDateString("ar-IQ",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
          {/* زر القائمة للموبايل */}
          {isMobile && (
            <button onClick={()=>setSideOpen(v=>!v)} style={{
              background:"#0F172A", border:"none", borderRadius:10,
              padding:"10px 14px", cursor:"pointer", color:"#fff",
              fontSize:18, lineHeight:1 }}>☰</button>
          )}
        </div>

        {/* كبطاقات الجرد */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:16, marginBottom:28 }}>
          {[
            {label:"🇮🇶 إجمالي الدينار", val:fNum(totalDin), unit:"د.ع",
              sub1:"صناديق: "+fNum(fundsDin), sub2:"مشاريع: "+fNum(activeDin),
              g:"linear-gradient(135deg,#D97706,#F59E0B)", sh:"rgba(217,119,6,0.25)"},
            {label:"🇺🇸 إجمالي الدولار", val:fNum(totalDol), unit:"$",
              sub1:"صناديق: "+fNum(fundsDol), sub2:"مشاريع: "+fNum(activeDol),
              g:"linear-gradient(135deg,#1D4ED8,#3B82F6)", sh:"rgba(29,78,216,0.25)"},
          ].map((card,i)=>(
            <div key={i} style={{ background:card.g, borderRadius:18,
              padding:"24px 28px", boxShadow:"0 8px 30px "+card.sh }}>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginBottom:8 }}>
                {card.label}
              </div>
              <div style={{ fontSize:34, fontWeight:700, color:"#fff", marginBottom:2 }}>
                {card.val}
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:16 }}>
                {card.unit}
              </div>
              <div style={{ display:"flex", gap:20, fontSize:11,
                color:"rgba(255,255,255,0.6)", borderTop:"1px solid rgba(255,255,255,0.15)",
                paddingTop:12 }}>
                <span>{card.sub1}</span>
                <span>{card.sub2}</span>
              </div>
            </div>
          ))}
        </div>

        {/* الصناديق الرئيسية */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:"#059669", borderRadius:99 }}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#475569" }}>الصناديق الرئيسية</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:isMobile?10:14 }}>
            {MAIN_FUNDS.map(f=>{
              const bal=funds[f.id]||{din:0,dol:0};
              return (
                <button key={f.id} onClick={()=>{setSelFund(f);setPage("fund");}}
                  style={{ background:"#fff", border:"1px solid #E2E8F0",
                    borderTop:"3px solid "+f.color, borderRadius:16,
                    padding:"20px", cursor:"pointer", fontFamily:"Tahoma", textAlign:"right",
                    gridColumn:f.id==="شركاء"?"span 3":"span 1",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                    transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.1)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:16 }}>
                    <span style={{ fontSize:11, color:f.color, background:f.bg,
                      borderRadius:20, padding:"3px 10px", fontWeight:600 }}>تفاصيل ←</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:"#1E293B" }}>{f.label}</span>
                      <span style={{ fontSize:24 }}>{f.icon}</span>
                    </div>
                  </div>
                  {f.id==="شركاء" ? (
                    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr 1fr", gap:8 }}>
                      {/* الإجمالي */}
                      <div style={{ background:f.bg, borderRadius:10, padding:"12px", textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>الإجمالي</div>
                        <div style={{ fontSize:14, fontWeight:700, color:f.color }}>{fNum(bal.din)}</div>
                        <div style={{ fontSize:9, color:"#94A3B8", marginBottom:4 }}>د.ع</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol||0)}</div>
                        <div style={{ fontSize:9, color:"#94A3B8" }}>$</div>
                      </div>
                      {/* حصة كل شريك */}
                      {[{n:"إيهاب",c:"#2563EB"},{n:"أحمد",c:"#D97706"},
                        {n:"نور",c:"#059669"},{n:"محمد",c:"#7C3AED"}].map(p=>{
                        const pf=funds["partner_"+p.n]||{din:0,dol:0};
                        return (
                          <div key={p.n} style={{ background:"#F8FAFC", borderRadius:10,
                            padding:"12px", textAlign:"center" }}>
                            <div style={{ fontSize:9, color:p.c, fontWeight:700, marginBottom:3 }}>
                              م.{p.n}
                            </div>
                            <div style={{ fontSize:13, fontWeight:700, color:p.c }}>
                              {fNum(pf.din)}
                            </div>
                            <div style={{ fontSize:9, color:"#94A3B8", marginBottom:4 }}>د.ع</div>
                            <div style={{ fontSize:11, fontWeight:700, color:"#2563EB" }}>
                              {fNum(pf.dol||0)}
                            </div>
                            <div style={{ fontSize:9, color:"#94A3B8" }}>$</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <div style={{ background:f.bg, borderRadius:10, padding:"14px", textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#64748B", marginBottom:4 }}>🇮🇶 دينار</div>
                        <div style={{ fontSize:18, fontWeight:700, color:f.color }}>{fNum(bal.din)}</div>
                        <div style={{ fontSize:10, color:"#94A3B8" }}>د.ع</div>
                      </div>
                      <div style={{ background:"#EFF6FF", borderRadius:10, padding:"14px", textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#64748B", marginBottom:4 }}>🇺🇸 دولار</div>
                        <div style={{ fontSize:18, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)}</div>
                        <div style={{ fontSize:10, color:"#94A3B8" }}>$</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* صناديق الأقسام */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:"#D97706", borderRadius:99 }}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#475569" }}>صناديق الأقسام</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:isMobile?10:14 }}>
            {DEPT_FUNDS.map(f=>{
              const bal=funds[f.id]||{din:0,dol:0};
              return (
                <button key={f.id} onClick={()=>{setSelFund(f);setPage("fund");}}
                  style={{ background:"#fff", border:"1px solid #E2E8F0",
                    borderTop:"3px solid "+f.color, borderRadius:16,
                    padding:"18px", cursor:"pointer", fontFamily:"Tahoma", textAlign:"right",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.1)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:22 }}>{f.icon}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:"#1E293B" }}>{f.label}</span>
                  </div>
                  <div style={{ background:f.bg, borderRadius:10, padding:"10px",
                    textAlign:"center", marginBottom:8 }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶 دينار</div>
                    <div style={{ fontSize:16, fontWeight:700, color:f.color }}>{fNum(bal.din)}</div>
                    <div style={{ fontSize:9, color:"#94A3B8" }}>د.ع</div>
                  </div>
                  <div style={{ background:"#EFF6FF", borderRadius:10, padding:"10px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸 دولار</div>
                    <div style={{ fontSize:16, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)}</div>
                    <div style={{ fontSize:9, color:"#94A3B8" }}>$</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ─── السايدبار الأيمن ─── */}
      <div style={{
        width:isMobile?280:260,
        minHeight:"100vh", background:"#0F172A",
        display:"flex", flexDirection:"column", flexShrink:0,
        position:isMobile?"fixed":"sticky",
        top:0, right:0, height:"100vh", overflowY:"auto",
        zIndex:isMobile?50:1,
        transform:isMobile?(sideOpen?"translateX(0)":"translateX(100%)"):"none",
        transition:"transform 0.3s ease",
        boxShadow:isMobile?"−8px 0 30px rgba(0,0,0,0.4)":"none"
      }}>

        {/* الشعار */}
        <div style={{ padding:"20px 16px 14px", borderBottom:"1px solid #1E293B" }}>
          <div style={{ fontSize:17, fontWeight:700, color:"#fff", marginBottom:2 }}>
            🏢 باب المشاريع
          </div>
          <div style={{ fontSize:10, color:"#475569" }}>نظام الحسابات الداخلي</div>
        </div>

        {/* الجرد الكلي */}
        <div style={{ margin:"12px 12px 4px", background:"#1E293B",
          borderRadius:12, padding:"12px 14px" }}>
          <div style={{ fontSize:9, color:"#475569", fontWeight:700,
            marginBottom:8, letterSpacing:1 }}>💰 الجرد الكلي</div>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:4 }}>
            <span style={{ fontSize:10, color:"#475569" }}>د.ع</span>
            <span style={{ fontSize:16, fontWeight:700, color:"#F59E0B" }}>{fNum(totalDin)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:10, color:"#475569" }}>$</span>
            <span style={{ fontSize:16, fontWeight:700, color:"#60A5FA" }}>{fNum(totalDol)}</span>
          </div>
        </div>

        {/* القوائم المجمعة */}
        <div style={{ flex:1, padding:"8px" }}>
          {[
            {
              title:"💎 الصناديق", items:[
                ...MAIN_FUNDS.map(f=>({label:f.label,icon:f.icon,fund:f,sub:fNum(funds[f.id]?.din||0)+" د.ع"})),
                ...DEPT_FUNDS.map(f=>({label:f.label,icon:f.icon,fund:f,sub:fNum(funds[f.id]?.din||0)+" د.ع"})),
              ]
            },
            {
              title:"📋 الإدارة", items:[
                {label:"الموظفون",           icon:"👷", pg:"employees", sub:employees.length+" موظف"},
                {label:"الذمم المالية",      icon:"💳", pg:"debts",     sub:"طالبة ومطلوبة"},
                {label:"المصاريف الثابتة",  icon:"🏠", pg:"expenses",  sub:"إيجارات"},
                {label:"الأصول الثابتة",    icon:"📦", pg:"assets",    sub:assets.filter(a=>(a.qtyRemaining||0)>0).length+" صنف"},
                {label:"الأرصدة الافتتاحية",icon:"🏁", pg:"opening",   sub:"رصيد البداية"},
              ]
            },
            {
              title:"📊 التقارير", items:[
                {label:"التقارير العامة",    icon:"📊", pg:"reports",           sub:""},
                {label:"الميزانية والأرباح", icon:"📈", pg:"financial_reports", sub:""},
              ]
            },
            {
              title:"⚙️ الإعدادات", items:[
                {label:"الإعدادات والنسخ",  icon:"⚙️", pg:"settings", sub:""},
              ]
            },
          ].map((group,gi)=>(
            <div key={gi} style={{ marginBottom:4 }}>
              <div style={{ fontSize:9, color:"#334155", fontWeight:700,
                padding:"10px 10px 4px", letterSpacing:1 }}>
                {group.title}
              </div>
              {group.items.map((item,ii)=>(
                <button key={ii}
                  onClick={()=>{
                    if(item.fund){setSelFund(item.fund);setPage("fund");}
                    else if(item.pg) setPage(item.pg);
                    setSideOpen(false);
                  }}
                  style={{ width:"100%", background:"transparent", border:"none",
                    borderRadius:8, padding:"8px 10px", cursor:"pointer",
                    fontFamily:"Tahoma", textAlign:"right", display:"flex",
                    alignItems:"center", gap:8, marginBottom:1,
                    color:"#94A3B8", fontSize:12 }}
                  onMouseEnter={e=>{
                    e.currentTarget.style.background="#1E293B";
                    e.currentTarget.style.color="#F1F5F9";
                  }}
                  onMouseLeave={e=>{
                    e.currentTarget.style.background="transparent";
                    e.currentTarget.style.color="#94A3B8";
                  }}>
                  <span style={{fontSize:14,flexShrink:0}}>{item.icon}</span>
                  <span style={{flex:1,fontWeight:500}}>{item.label}</span>
                  {item.sub&&<span style={{fontSize:9,color:"#334155",whiteSpace:"nowrap"}}>{item.sub}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* زر الرجوع */}
        <div style={{ padding:"10px 12px 18px" }}>
          <button onClick={onBack} style={{ width:"100%",
            background:"#1E293B", border:"1px solid #334155",
            borderRadius:10, padding:"11px", cursor:"pointer",
            fontFamily:"Tahoma", color:"#64748B", fontSize:12,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            ← رجوع للمشاريع
          </button>
        </div>

      </div>

    </div>
  );
}

// ─── صفحة تفاصيل الصندوق ─────────────────────────────
function FundPage({ fund, funds, projects=[], onBack }) {
  const bal = funds[fund.id] || { din:0, dol:0 };
  const [txs, setTxs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type:"إيداع", din:"", dol:"", note:"",
    date: new Date().toISOString().split("T")[0] });
  const sf = k => v => setForm(f => ({...f, [k]:v}));
  const [showStmt,  setShowStmt]  = useState(false);

  // نظام الإقراض للمشاريع — فقط للأفرع الأربعة
  const isBranch = ["إشراف","ديكور","مقاولات","واجهات"].includes(fund.id);
  const [showProjLoan,  setShowProjLoan]  = useState(false);
  const [projLoanForm,  setProjLoanForm]  = useState({
    projectId:"", din:"", dol:"",
    date: new Date().toISOString().split("T")[0], note:""
  });
  const plf = k => v => setProjLoanForm(f=>({...f,[k]:v}));
  // فقط مشاريع نفس الفرع
  const activeProjects = projects.filter(p=>p.status==="active" && p.type===fund.id);

  const giveProjLoanFromFund = async () => {
    if (!projLoanForm.projectId) { alert("اختر مشروعاً أولاً"); return; }
    const din = Number(projLoanForm.din)||0;
    const dol = Number(projLoanForm.dol)||0;
    if (!din && !dol) return;
    if (din > bal.din) { alert("⛔ رصيد الدينار في صندوق "+fund.label+" غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع"); return; }
    if (dol > bal.dol) { alert("⛔ رصيد الدولار غير كافٍ — المتاح: "+fNum(bal.dol)+" $"); return; }
    const pw = window.prompt("🔒 أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }

    const proj = activeProjects.find(p=>p.id===projLoanForm.projectId);
    if (!proj) return;

    // خصم من الصندوق
    await setDoc(doc(db,"funds",fund.id),
      { din:bal.din-din, dol:bal.dol-dol }, {merge:true});

    // حركة الصندوق
    await addDoc(collection(db,"fund_txs"),{
      fundId:fund.id, fundLabel:fund.label, type:"صرف",
      din, dol, note:"سلفة تشغيلية → "+proj.name,
      date:projLoanForm.date, createdAt:new Date().toISOString()
    });

    // تسجيل في المشروع كاستلام
    const curRecDin = din > 0 ? (proj.recDin||0)+din : (proj.recDin||0);
    const curSpdDin = proj.spdDin||0;
    await addDoc(collection(db,"project_txs"),{
      projectId:proj.id, projectName:proj.name,
      type:"in", amount:din||dol,
      currency:din>0?"دينار":"دولار",
      receiver:"سلفة تشغيلية",
      date:projLoanForm.date,
      note:"سلفة من صندوق "+fund.label+(projLoanForm.note?" — "+projLoanForm.note:""),
      isLoan:true, loanFund:fund.id,
      createdAt:new Date().toISOString()
    });

    // تحديث ميزان المشروع
    if (din > 0) {
      await updateDoc(doc(db,"projects",proj.id),{
        recDin:curRecDin, balDin:curRecDin-curSpdDin
      });
    }

    // تسجيل كدَيْن على المشروع لصالح هذا الصندوق
    await addDoc(collection(db,"project_loans"),{
      projectId:proj.id, projectName:proj.name,
      fund:fund.id, fundLabel:fund.label,
      din, dol, note:projLoanForm.note,
      date:projLoanForm.date, status:"open",
      createdAt:new Date().toISOString()
    });

    setProjLoanForm({projectId:"",din:"",dol:"",
      date:new Date().toISOString().split("T")[0],note:""});
    setShowProjLoan(false);
    alert("✅ تم إقراض مشروع "+proj.name+" من صندوق "+fund.label);
  };
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");
  const [showLoan,  setShowLoan]  = useState(false);
  const [loans,     setLoans]     = useState([]);
  const [loanForm,  setLoanForm]  = useState({
    toFund:"إشراف", din:"", dol:"", note:"",
    date: new Date().toISOString().split("T")[0]
  });
  const lf = k => v => setLoanForm(f=>({...f,[k]:v}));

  // جلب الديون المرتبطة بهذا الصندوق
  useEffect(()=>{
    if (fund.id !== "عام") {
      // الديون على هذا الصندوق (مدين)
      return onSnapshot(
        query(collection(db,"internal_loans"),
          where("toFund","==",fund.id), where("status","==","open")),
        snap => setLoans(snap.docs.map(d=>({id:d.id,...d.data()})))
      );
    } else {
      // الديون الصادرة من العام (دائن)
      return onSnapshot(
        query(collection(db,"internal_loans"), where("status","==","open")),
        snap => setLoans(snap.docs.map(d=>({id:d.id,...d.data()})))
      );
    }
  },[fund.id]);

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

  const isGeneral = fund.id === "عام";
  const DEPT_FUNDS_LIST = ["إشراف","ديكور","مقاولات","واجهات","رأس_المال","شركاء"];

  const giveLoan = async () => {
    const din = Number(loanForm.din)||0;
    const dol = Number(loanForm.dol)||0;
    if (!din && !dol) return;
    if (!loanForm.toFund || loanForm.toFund === "عام") return;
    if (din > bal.din) { alert("⛔ رصيد الصندوق العام غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع"); return; }
    if (dol > bal.dol) { alert("⛔ رصيد الصندوق العام بالدولار غير كافٍ — المتاح: "+fNum(bal.dol)+" $"); return; }
    const pw = window.prompt("🔒 أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }

    // خصم من العام
    await setDoc(doc(db,"funds","عام"),
      { din: bal.din-din, dol: bal.dol-dol }, {merge:true});
    // إضافة للصندوق المستفيد
    const toBal = funds[loanForm.toFund]||{din:0,dol:0};
    await setDoc(doc(db,"funds",loanForm.toFund),
      { din: toBal.din+din, dol: toBal.dol+dol }, {merge:true});

    // تسجيل الحركات
    await addDoc(collection(db,"fund_txs"),{
      fundId:"عام", fundLabel:"الصندوق العام", type:"صرف",
      din, dol, note:"قرض داخلي → صندوق "+loanForm.toFund+": "+loanForm.note,
      date:loanForm.date, createdAt:new Date().toISOString()
    });
    await addDoc(collection(db,"fund_txs"),{
      fundId:loanForm.toFund, fundLabel:loanForm.toFund, type:"إيداع",
      din, dol, note:"قرض داخلي ← الصندوق العام: "+loanForm.note,
      date:loanForm.date, createdAt:new Date().toISOString()
    });

    // تسجيل الدَّيْن
    await addDoc(collection(db,"internal_loans"),{
      fromFund:"عام", toFund:loanForm.toFund,
      din, dol, note:loanForm.note,
      date:loanForm.date, status:"open",
      createdAt:new Date().toISOString()
    });

    setLoanForm({toFund:"إشراف",din:"",dol:"",note:"",
      date:new Date().toISOString().split("T")[0]});
    setShowLoan(false);
    alert("✅ تم الإقراض — دَيْن على صندوق "+loanForm.toFund);
  };

  const repayLoan = async (loan) => {
    const pw = window.prompt("🔒 تأكيد السداد — أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    const repayFund = fund.id; // الصندوق المدين يسدد
    const repayBal = funds[repayFund]||{din:0,dol:0};
    if ((loan.din||0) > repayBal.din) {
      alert("⛔ رصيد صندوق "+repayFund+" غير كافٍ للسداد — المطلوب: "+fNum(loan.din)+" د.ع | المتاح: "+fNum(repayBal.din)+" د.ع");
      return;
    }
    const generalBal = funds["عام"]||{din:0,dol:0};
    // خصم من الصندوق المدين
    await setDoc(doc(db,"funds",repayFund),
      { din:repayBal.din-(loan.din||0), dol:repayBal.dol-(loan.dol||0) }, {merge:true});
    // إضافة للصندوق العام
    await setDoc(doc(db,"funds","عام"),
      { din:generalBal.din+(loan.din||0), dol:generalBal.dol+(loan.dol||0) }, {merge:true});
    // تسجيل الحركات
    const today = new Date().toISOString().split("T")[0];
    await addDoc(collection(db,"fund_txs"),{
      fundId:repayFund, fundLabel:repayFund, type:"صرف",
      din:loan.din||0, dol:loan.dol||0,
      note:"سداد قرض داخلي → الصندوق العام",
      date:today, createdAt:new Date().toISOString()
    });
    await addDoc(collection(db,"fund_txs"),{
      fundId:"عام", fundLabel:"الصندوق العام", type:"إيداع",
      din:loan.din||0, dol:loan.dol||0,
      note:"سداد قرض ← صندوق "+repayFund,
      date:today, createdAt:new Date().toISOString()
    });
    // إغلاق الدَّيْن
    await updateDoc(doc(db,"internal_loans",loan.id),{
      status:"paid", paidAt:today
    });
    alert("✅ تم السداد — الدَّيْن مغلق");
  };

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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>↓ إيداعات</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#16A34A" }}>{fNum(totIn.din)} د.ع</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#16A34A" }}>{fNum(totIn.dol||0)} $</div>
            </div>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>↑ صرف</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#DC2626" }}>{fNum(totOut.din)} د.ع</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#DC2626" }}>{fNum(totOut.dol||0)} $</div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ background:fund.bg, borderRadius:10, padding:"12px", textAlign:"center",
              border:"2px solid "+fund.color }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>⚖️ رصيد الدينار</div>
              <div style={{ fontSize:18, fontWeight:700, color:fund.color }}>{fNum(bal.din)}</div>
              <div style={{ fontSize:10, color:"#94A3B8" }}>د.ع</div>
            </div>
            <div style={{ background:"#EFF6FF", borderRadius:10, padding:"12px", textAlign:"center",
              border:"2px solid #2563EB" }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>⚖️ رصيد الدولار</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)}</div>
              <div style={{ fontSize:10, color:"#94A3B8" }}>$</div>
            </div>
          </div>
        </div>

        {/* أزرار */}
        <div style={{ display:"grid",
          gridTemplateColumns:isBranch?"1fr 1fr 1fr":"1fr 1fr",
          gap:10, marginBottom:14 }}>
          <button onClick={()=>setShowAdd(v=>!v)} style={{ border:"none", borderRadius:12,
            padding:"12px", fontSize:13, fontWeight:700, fontFamily:"Tahoma",
            background:showAdd?"#475569":fund.color, color:"#fff", cursor:"pointer" }}>
            {showAdd?"✕ إلغاء":"+ إضافة حركة"}
          </button>
          {isBranch && (
            <button onClick={()=>{setShowProjLoan(v=>!v);setShowAdd(false);}} style={{
              border:"2px solid #F97316", borderRadius:12, padding:"12px",
              fontSize:13, fontWeight:700, fontFamily:"Tahoma",
              background:showProjLoan?"#F97316":"#FFF7ED",
              color:showProjLoan?"#fff":"#F97316", cursor:"pointer" }}>
              {showProjLoan?"✕ إلغاء":"💸 إقراض مشروع"}
            </button>
          )}
          <button onClick={()=>setShowStmt(v=>!v)} style={{ border:"1px solid "+fund.color,
            borderRadius:12, padding:"12px", fontSize:13, fontWeight:700,
            fontFamily:"Tahoma", background:"#fff", color:fund.color, cursor:"pointer" }}>
            🖨️ كشف الحساب
          </button>
        </div>

        {/* فورم إقراض المشروع */}
        {showProjLoan && isBranch && (
          <div style={{ background:"#FFF7ED", borderRadius:14, padding:18,
            border:"2px solid #F97316", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#F97316", marginBottom:4 }}>
              💸 إقراض مشروع من صندوق {fund.label}
            </div>
            <div style={{ fontSize:11, color:"#94A3B8", marginBottom:14 }}>
              🔒 الإقراض من هذا الصندوق فقط — لا يمكن من صندوق آخر
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>المشروع المستفيد *</div>
              {activeProjects.length===0 ? (
                <div style={{ fontSize:12, color:"#94A3B8", padding:10,
                  background:"#F8FAFC", borderRadius:9 }}>
                  ما في مشاريع {fund.label} نشطة
                </div>
              ) : (
                <select value={projLoanForm.projectId}
                  onChange={e=>plf("projectId")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"10px 13px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#fff", appearance:"none" }}>
                  <option value="">— اختر مشروعاً —</option>
                  {activeProjects.map(p=>(
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.type} · ميزان: {fNum(p.balDin||0)} د.ع
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              {[{k:"din",l:"مبلغ الدينار",c:"#D97706",av:bal.din},
                {k:"dol",l:"مبلغ الدولار",c:"#2563EB",av:bal.dol}].map(({k,l,c,av})=>{
                const v=Number(projLoanForm[k])||0;
                const ok=v===0||av>=v;
                return (
                  <div key={k}>
                    <div style={{ fontSize:12, color:c, fontWeight:600, marginBottom:5 }}>{l}</div>
                    <input type="text" inputMode="numeric" placeholder="٠"
                      value={projLoanForm[k]}
                      onChange={e=>plf(k)(e.target.value.replace(/[^0-9]/g,""))}
                      style={{ width:"100%", border:"1.5px solid "+(v>0&&!ok?"#DC2626":"#CBD5E1"),
                        borderRadius:9, padding:"10px 13px", fontSize:14, outline:"none",
                        fontFamily:"Tahoma", direction:"rtl", boxSizing:"border-box", background:"#fff" }}/>
                    {v>0&&(
                      <div style={{ fontSize:11, marginTop:3, fontWeight:600, color:ok?c:"#DC2626" }}>
                        {ok?"✍️ "+w2(v)+" "+(k==="din"?"دينار":"دولار")+" — متبقي: "+fNum(av-v)+(k==="din"?" د.ع":" $")
                          :"⛔ يتجاوز الرصيد — المتاح: "+fNum(av)+(k==="din"?" د.ع":" $")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>التاريخ</div>
                <input type="date" value={projLoanForm.date}
                  onChange={e=>plf("date")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"10px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#fff" }}/>
              </div>
              <div>
                <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>السبب</div>
                <input placeholder="عمال، مواد، معدات..." value={projLoanForm.note}
                  onChange={e=>plf("note")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"10px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#fff" }}/>
              </div>
            </div>
            <button onClick={giveProjLoanFromFund}
              disabled={!projLoanForm.projectId||(!Number(projLoanForm.din)&&!Number(projLoanForm.dol))}
              style={{ width:"100%", border:"none", borderRadius:10, padding:"13px",
                fontSize:14, fontWeight:700, fontFamily:"Tahoma", cursor:"pointer",
                background:projLoanForm.projectId&&(Number(projLoanForm.din)||Number(projLoanForm.dol))
                  ?"#F97316":"#E2E8F0",
                color:projLoanForm.projectId&&(Number(projLoanForm.din)||Number(projLoanForm.dol))
                  ?"#fff":"#94A3B8" }}>
              ✅ إقراض المشروع من صندوق {fund.label}
            </button>
          </div>
        )}

        {/* ─── إقراض الصندوق العام ─── */}
        {isBranch && <LendToGeneralSection fund={fund} funds={funds} bal={bal}/>}

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
                {Number(form[k])>0 && (
                  <div style={{ fontSize:12, color:c, fontWeight:600, marginTop:4 }}>
                    ✍️ {w2(Number(form[k]))} {k==="din"?"دينار عراقي":"دولار أمريكي"}
                    {" — "}{fNum(Number(form[k]))} {k==="din"?"د.ع":"$"}
                  </div>
                )}
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

        {/* ─── قسم القروض الداخلية ─── */}
        {/* زر الإقراض — فقط للصندوق العام */}
        {isGeneral && (
          <div style={{ marginBottom:14 }}>
            <button onClick={()=>setShowLoan(v=>!v)} style={{
              width:"100%", border:"none", borderRadius:12, padding:"12px",
              fontSize:14, fontWeight:700, fontFamily:"Tahoma",
              background:showLoan?"#475569":"#D97706", color:"#fff", cursor:"pointer" }}>
              {showLoan?"✕ إلغاء":"📤 إقراض صندوق"}
            </button>

            {showLoan && (
              <div style={{ background:"#FFFBEB", borderRadius:14, padding:18,
                border:"2px solid #D97706", marginTop:10 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#D97706", marginBottom:14 }}>
                  📤 قرض داخلي من الصندوق العام
                </div>

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>
                    الصندوق المستفيد
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
                    {["إشراف","ديكور","مقاولات","واجهات","رأس_المال"].map(f=>{
                      const fb = funds[f]||{din:0,dol:0};
                      return (
                        <button key={f} onClick={()=>lf("toFund")(f)} style={{
                          border:"1.5px solid "+(loanForm.toFund===f?"#D97706":"#E2E8F0"),
                          borderRadius:9, padding:"8px 4px", cursor:"pointer",
                          fontFamily:"Tahoma", fontSize:11, fontWeight:600,
                          background:loanForm.toFund===f?"#FFFBEB":"#fff",
                          color:loanForm.toFund===f?"#D97706":"#64748B",
                          textAlign:"center" }}>
                          <div>{f}</div>
                          <div style={{ fontSize:9, color:"#94A3B8", marginTop:2 }}>
                            {fNum(fb.din)} د.ع
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                  {[{k:"din",l:"المبلغ دينار",c:"#D97706"},{k:"dol",l:"المبلغ دولار",c:"#2563EB"}].map(({k,l,cl})=>(
                    <div key={k}>
                      <div style={{ fontSize:12, color:k==="din"?"#D97706":"#2563EB",
                        fontWeight:600, marginBottom:5 }}>{l}</div>
                      <input type="text" inputMode="numeric" placeholder="٠" value={loanForm[k]}
                        onChange={e=>lf(k)(e.target.value.replace(/[^0-9]/g,""))}
                        style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                          padding:"11px 13px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                          direction:"rtl", boxSizing:"border-box", background:"#fff" }}/>
                      {Number(loanForm[k])>0 && (
                        <div style={{ fontSize:11, color:k==="din"?"#D97706":"#2563EB",
                          marginTop:3, fontWeight:600 }}>
                          ✍️ {w2(Number(loanForm[k]))} {k==="din"?"دينار":"دولار"}
                          {k==="din" && <span style={{ color: Number(loanForm.din)>bal.din?"#DC2626":"#16A34A",
                            marginRight:6 }}>
                            {Number(loanForm.din)>bal.din?"⛔ يتجاوز الرصيد":
                              "متبقي: "+fNum(bal.din-Number(loanForm.din))+" د.ع"}
                          </span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>
                    السبب / البيان
                  </div>
                  <input placeholder="لماذا يحتاج هذا الصندوق القرض؟" value={loanForm.note}
                    onChange={e=>lf("note")(e.target.value)}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"10px 13px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                      direction:"rtl", boxSizing:"border-box", background:"#fff" }}/>
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>
                    التاريخ
                  </div>
                  <input type="date" value={loanForm.date} onChange={e=>lf("date")(e.target.value)}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"10px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                      boxSizing:"border-box", background:"#fff" }}/>
                </div>

                <button onClick={giveLoan}
                  disabled={(!Number(loanForm.din)&&!Number(loanForm.dol))||!loanForm.note.trim()}
                  style={{ width:"100%", border:"none", borderRadius:10, padding:"13px",
                    fontSize:14, fontWeight:700, fontFamily:"Tahoma", cursor:"pointer",
                    background:(Number(loanForm.din)||Number(loanForm.dol))&&loanForm.note.trim()
                      ?"#D97706":"#E2E8F0",
                    color:(Number(loanForm.din)||Number(loanForm.dol))&&loanForm.note.trim()
                      ?"#fff":"#94A3B8" }}>
                  ✅ تأكيد الإقراض لصندوق {loanForm.toFund}
                </button>
              </div>
            )}

            {/* قائمة الديون الصادرة من العام */}
            {loans.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, padding:14,
                border:"1px solid #E2E8F0", marginTop:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
                  📋 الديون المفتوحة على الصناديق ({loans.length})
                </div>
                {loans.map(loan=>(
                  <div key={loan.id} style={{ borderRadius:10, padding:"12px 14px",
                    marginBottom:8, background:"#FFFBEB",
                    border:"1px solid #D9770640", borderRight:"4px solid #D97706" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"start" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#D97706" }}>
                          📤 → صندوق {loan.toFund}
                        </div>
                        <div style={{ fontSize:11, color:"#64748B", marginTop:3 }}>
                          📅 {loan.date} · {loan.note}
                        </div>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        {(loan.din||0)>0 && (
                          <div style={{ fontSize:14, fontWeight:700, color:"#DC2626" }}>
                            {fNum(loan.din)} د.ع
                          </div>
                        )}
                        {(loan.dol||0)>0 && (
                          <div style={{ fontSize:12, fontWeight:700, color:"#2563EB" }}>
                            {fNum(loan.dol)} $
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ padding:"10px 0 4px", borderTop:"1px solid #E2E8F0", marginTop:4 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                    <span style={{ fontWeight:700, color:"#64748B" }}>إجمالي الديون</span>
                    <div>
                      <span style={{ fontWeight:700, color:"#DC2626" }}>
                        {fNum(loans.reduce((s,l)=>s+(l.din||0),0))} د.ع
                      </span>
                      {loans.reduce((s,l)=>s+(l.dol||0),0)>0&&(
                        <span style={{ fontWeight:700, color:"#2563EB", marginRight:8 }}>
                          {" | "}{fNum(loans.reduce((s,l)=>s+(l.dol||0),0))} $
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ديون هذا الصندوق للصندوق العام */}
        {!isGeneral && loans.length > 0 && (
          <div style={{ background:"#FFF7ED", borderRadius:14, padding:16,
            border:"2px solid #F97316", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#F97316", marginBottom:12 }}>
              ⚠️ ديون على هذا الصندوق للصندوق العام ({loans.length})
            </div>
            {loans.map(loan=>(
              <div key={loan.id} style={{ borderRadius:10, padding:"12px 14px",
                marginBottom:8, background:"#fff",
                border:"1px solid #F9741620", borderRight:"4px solid #F97316" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#F97316" }}>
                      ← من الصندوق العام
                    </div>
                    <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>
                      📅 {loan.date} · {loan.note}
                    </div>
                  </div>
                  <div style={{ textAlign:"left" }}>
                    {(loan.din||0)>0 && (
                      <div style={{ fontSize:15, fontWeight:700, color:"#DC2626" }}>
                        {fNum(loan.din)} د.ع
                      </div>
                    )}
                    {(loan.dol||0)>0 && (
                      <div style={{ fontSize:13, fontWeight:700, color:"#2563EB" }}>
                        {fNum(loan.dol)} $
                      </div>
                    )}
                  </div>
                </div>
                {/* زر السداد */}
                <button onClick={()=>repayLoan(loan)}
                  style={{ width:"100%", border:"none", borderRadius:8, padding:"10px",
                    fontSize:12, fontWeight:700, fontFamily:"Tahoma", cursor:"pointer",
                    background:(funds[fund.id]?.din||0)>=(loan.din||0)?"#F97316":"#E2E8F0",
                    color:(funds[fund.id]?.din||0)>=(loan.din||0)?"#fff":"#94A3B8" }}>
                  {(funds[fund.id]?.din||0)>=(loan.din||0)
                    ? "↩️ سداد هذا القرض للصندوق العام"
                    : "⛔ الرصيد غير كافٍ للسداد (ناقص "+fNum((loan.din||0)-(funds[fund.id]?.din||0))+" د.ع)"}
                </button>
              </div>
            ))}
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
                    <div style={{ fontSize:12, fontWeight:700,
                      color:(t.dol||0)>0?"#2563EB":"#CBD5E1" }}>
                      {isIn?"+":"-"}{fNum(t.dol||0)} <span style={{fontSize:10}}>$</span>
                    </div>
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


// ─── مكوّن إقراض الصندوق العام ──────────────────────────
function LendToGeneralSection({ fund, funds, bal }) {
  const [show,    setShow]    = useState(false);
  const [genLoans,setGenLoans]= useState([]);
  const [form,    setForm]    = useState({
    din:"", dol:"", date:new Date().toISOString().split("T")[0], note:""
  });
  const sf = k => v => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    return onSnapshot(
      query(collection(db,"internal_loans"),
        where("fromFund","==",fund.id),
        where("toFund","==","عام"),
        where("status","==","open")),
      snap=>setGenLoans(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
  },[fund.id]);

  const lendToGeneral = async () => {
    const din=Number(form.din)||0, dol=Number(form.dol)||0;
    if(!din&&!dol) return;
    if(din>bal.din){alert("⛔ رصيد الدينار غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع");return;}
    if(dol>bal.dol){alert("⛔ رصيد الدولار غير كافٍ — المتاح: "+fNum(bal.dol)+" $");return;}
    const pw=window.prompt("🔒 باسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}

    const genBal=funds["عام"]||{din:0,dol:0};
    await setDoc(doc(db,"funds",fund.id),{din:bal.din-din,dol:bal.dol-dol},{merge:true});
    await setDoc(doc(db,"funds","عام"),{din:genBal.din+din,dol:genBal.dol+dol},{merge:true});
    await addDoc(collection(db,"fund_txs"),{fundId:fund.id,fundLabel:fund.label,type:"صرف",
      din,dol,note:"قرض للصندوق العام: "+form.note,
      date:form.date,createdAt:new Date().toISOString()});
    await addDoc(collection(db,"fund_txs"),{fundId:"عام",fundLabel:"الصندوق العام",type:"إيداع",
      din,dol,note:"قرض من صندوق "+fund.label+": "+form.note,
      date:form.date,createdAt:new Date().toISOString()});
    await addDoc(collection(db,"internal_loans"),{
      fromFund:fund.id, fromLabel:fund.label,
      toFund:"عام", toLabel:"الصندوق العام",
      din, dol, note:form.note, date:form.date,
      status:"open", createdAt:new Date().toISOString()
    });
    setForm({din:"",dol:"",date:new Date().toISOString().split("T")[0],note:""});
    setShow(false);
    alert("✅ تم إقراض الصندوق العام من صندوق "+fund.label);
  };

  const repayFromGeneral = async (loan) => {
    const pw=window.prompt("🔒 باسورد السداد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    const genBal=funds["عام"]||{din:0,dol:0};
    if((loan.din||0)>genBal.din){alert("⛔ رصيد الصندوق العام غير كافٍ للسداد");return;}
    const today=new Date().toISOString().split("T")[0];
    const fBal=funds[fund.id]||{din:0,dol:0};
    await setDoc(doc(db,"funds","عام"),
      {din:genBal.din-(loan.din||0),dol:genBal.dol-(loan.dol||0)},{merge:true});
    await setDoc(doc(db,"funds",fund.id),
      {din:fBal.din+(loan.din||0),dol:fBal.dol+(loan.dol||0)},{merge:true});
    await addDoc(collection(db,"fund_txs"),{fundId:"عام",fundLabel:"الصندوق العام",type:"صرف",
      din:loan.din||0,dol:loan.dol||0,note:"سداد قرض لصندوق "+fund.label,
      date:today,createdAt:new Date().toISOString()});
    await addDoc(collection(db,"fund_txs"),{fundId:fund.id,fundLabel:fund.label,type:"إيداع",
      din:loan.din||0,dol:loan.dol||0,note:"سداد قرض من الصندوق العام",
      date:today,createdAt:new Date().toISOString()});
    await updateDoc(doc(db,"internal_loans",loan.id),{status:"paid",paidDate:today});
    alert("✅ سدد الصندوق العام قرضه لصندوق "+fund.label);
  };

  return (
    <div style={{marginBottom:14}}>
      {/* ديون العام لهذا الصندوق */}
      {genLoans.length>0&&(
        <div style={{background:"#FFFBEB",borderRadius:12,padding:14,
          border:"2px solid #D97706",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:"#D97706",marginBottom:10}}>
            💰 ديون الصندوق العام لهذا الصندوق ({genLoans.length})
          </div>
          {genLoans.map(l=>(
            <div key={l.id} style={{background:"#fff",borderRadius:9,
              padding:"10px 12px",marginBottom:8,border:"1px solid #FDE68A"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#D97706"}}>
                    العام مدين لصندوق {fund.label}
                  </div>
                  <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                    📅 {l.date}{l.note&&" · "+l.note}
                  </div>
                </div>
                <div style={{textAlign:"left"}}>
                  {(l.din||0)>0&&<div style={{fontSize:14,fontWeight:700,
                    color:"#DC2626"}}>{fNum(l.din)} د.ع</div>}
                  {(l.dol||0)>0&&<div style={{fontSize:12,fontWeight:700,
                    color:"#2563EB"}}>{fNum(l.dol)} $</div>}
                </div>
              </div>
              <button onClick={()=>repayFromGeneral(l)} style={{
                width:"100%",border:"none",borderRadius:8,padding:"9px",
                fontSize:12,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                background:(funds["عام"]?.din||0)>=(l.din||0)?"#D97706":"#E2E8F0",
                color:(funds["عام"]?.din||0)>=(l.din||0)?"#fff":"#94A3B8"}}>
                {(funds["عام"]?.din||0)>=(l.din||0)
                  ?"↩️ سداد العام لصندوق "+fund.label
                  :"⛔ رصيد العام غير كافٍ (ناقص "+fNum((l.din||0)-(funds["عام"]?.din||0))+" د.ع)"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* زر إقراض العام */}
      <button onClick={()=>setShow(v=>!v)} style={{
        width:"100%",border:"2px solid #D97706",borderRadius:12,padding:"11px",
        fontSize:13,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
        background:show?"#D97706":"#FFFBEB",color:show?"#fff":"#D97706",
        marginBottom:show?10:0}}>
        {show?"✕ إلغاء":"🏦 إقراض الصندوق العام"}
      </button>

      {show&&(
        <div style={{background:"#FFFBEB",borderRadius:14,padding:16,
          border:"2px solid #D97706"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#D97706",marginBottom:12}}>
            🏦 إقراض الصندوق العام من صندوق {fund.label}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[{k:"din",l:"مبلغ الدينار",c:"#D97706",av:bal.din},
              {k:"dol",l:"مبلغ الدولار",c:"#2563EB",av:bal.dol}].map(({k,l,c,av})=>{
              const v=Number(form[k])||0, ok=v===0||av>=v;
              return (
                <div key={k}>
                  <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                  <input type="text" inputMode="numeric" placeholder="٠" value={form[k]}
                    onChange={e=>sf(k)(e.target.value.replace(/[^0-9]/g,""))}
                    style={{width:"100%",border:"1.5px solid "+(v>0&&!ok?"#DC2626":"#CBD5E1"),
                      borderRadius:9,padding:"10px 13px",fontSize:14,outline:"none",
                      fontFamily:"Tahoma",direction:"rtl",
                      boxSizing:"border-box",background:"#fff"}}/>
                  {v>0&&(
                    <div style={{fontSize:11,marginTop:3,fontWeight:600,color:ok?c:"#DC2626"}}>
                      {ok?"✍️ "+w2(v)+" "+(k==="din"?"دينار":"دولار")
                        +" — متبقي: "+fNum(av-v)+(k==="din"?" د.ع":" $")
                        :"⛔ يتجاوز الرصيد"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>التاريخ</div>
              <input type="date" value={form.date} onChange={e=>sf("date")(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  boxSizing:"border-box",background:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>السبب</div>
              <input placeholder="سبب القرض..." value={form.note}
                onChange={e=>sf("note")(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",background:"#fff"}}/>
            </div>
          </div>
          <button onClick={lendToGeneral}
            disabled={!Number(form.din)&&!Number(form.dol)}
            style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
              fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
              background:Number(form.din)||Number(form.dol)?"#D97706":"#E2E8F0",
              color:Number(form.din)||Number(form.dol)?"#fff":"#94A3B8"}}>
            ✅ إقراض الصندوق العام من صندوق {fund.label}
          </button>
        </div>
      )}
    </div>
  );
}
