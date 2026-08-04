import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

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

const TODAY    = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now()+86400000).toISOString().split("T")[0];
const PASS = "1234";

// ─── ترجمات اللغتين ────────────────────────────────
const T = {
  ar: {
    dir:"rtl", fontFamily:"Tahoma",
    login_title:"بوابة الفورمن", login_name:"الاسم",
    login_pin:"رمز الدخول", login_btn:"دخول →",
    factory_title:"🏭 معمل الديكور",
    logout:"خروج", tab_work:"📋 الأعمال", tab_factory:"🏭 المعمل",
    tomorrow_plan:"📅 خطة الغد", no_tasks:"ما في مهام محددة لليوم",
    today_tasks:"📋 مهام اليوم", done:"✅ منجز", partial:"⚠️ جزئي",
    not_done:"❌ لم ينجز", note_ph:"ملاحظة على هذه المهمة...",
    report_title:"📤 رفع تقرير الأعمال",
    report_done:"تم رفع التقرير", report_btn:"✅ رفع تقرير الأعمال",
    uploading:"⏳ جاري الرفع...",
    machine_status:"🔧 حالة المكائن", good:"✅ جيدة",
    needs_maint:"⚠️ تحتاج صيانة", stopped:"❌ متوقفة",
    fuel:"⛽ الوقود", water:"💧 الماء", liter:"لتر",
    today_hours:"🕐 ساعات اليوم", gen1:"مولد ١", gen2:"مولد ٢",
    elec:"كهرباء", hour:"ساعة", total_hours:"📊 الساعات الكلية",
    gen1_total:"مجموع مولد ١", gen2_total:"مجموع مولد ٢",
    factory_notes:"ملاحظات عن المعمل...", staff:"👷 الكادر والساعات الإضافية",
    worker_name:"اسم العامل", ot_hours:"ساعة OT", add_worker:"+ إضافة عامل",
    factory_report:"📤 رفع تقرير المعمل", factory_reported:"تم رفع تقرير المعمل",
    site_title:"📍 الموقع", workers_count:"👷 عدد العمال",
    progress:"📊 نسبة الإنجاز %", works_done:"🔨 الأعمال المنجزة اليوم",
    works_ph:"اكتب الأعمال المنجزة اليوم...", notes:"📝 ملاحظات",
    notes_ph:"مشاكل أو احتياجات...", site_report_btn:"📤 رفع تقرير اليوم",
    site_reported:"تم رفع تقرير اليوم", prev_reports:"📅 آخر التقارير",
    gen_note_ph:"ملاحظات إضافية...",
    // Manager
    mgr_title:"لوحة إدارة العمل", mgr_enter:"رمز الدخول",
    tab_dashboard:"📊 لوحة المتابعة", tab_plan:"📋 خطة الغد",
    tab_reports:"📄 التقارير", tab_team:"👷 الفريق",
    plan_factory:"🏭 معمل", plan_sites:"📍 مواقع خارجية",
    plan_factory_title:"مهام المعمل ليوم الغد",
    plan_factory_hint:"كل سطر = مهمة مستقلة تظهر للفورمن",
    task_ph:"اكتب المهمة...", add_task:"+ إضافة مهمة",
    gen_note:"ملاحظة عامة", gen_note_mgr_ph:"توجيهات للفورمن...",
    save_plan:"💾 حفظ خطة الغد", plan_saved:"✅ تم حفظ الخطة",
    plan_sites_sel:"اختر فورمن الموقع",
    site_area:"📍 المنطقة", site_area_ph:"مثال: الطابق 2 — غرفة 5",
    site_goal:"🎯 الهدف", site_goal_ph:"مثال: إنجاز السقف كاملاً",
    site_tasks:"🔨 الأعمال المطلوبة",
    site_tasks_ph:"كل سطر = عمل واحد",
  },
  en: {
    dir:"ltr", fontFamily:"Arial",
    login_title:"Foreman Portal", login_name:"Name",
    login_pin:"Access Code", login_btn:"Login →",
    factory_title:"🏭 Decor Factory",
    logout:"Logout", tab_work:"📋 Work", tab_factory:"🏭 Factory",
    tomorrow_plan:"📅 Tomorrow's Plan", no_tasks:"No tasks assigned for today",
    today_tasks:"📋 Today's Tasks", done:"✅ Done", partial:"⚠️ Partial",
    not_done:"❌ Not Done", note_ph:"Note on this task...",
    report_title:"📤 Submit Work Report",
    report_done:"Report Submitted", report_btn:"✅ Submit Work Report",
    uploading:"⏳ Uploading...",
    machine_status:"🔧 Machine Status", good:"✅ Good",
    needs_maint:"⚠️ Needs Maintenance", stopped:"❌ Stopped",
    fuel:"⛽ Fuel", water:"💧 Water", liter:"Liters",
    today_hours:"🕐 Today's Hours", gen1:"Generator 1", gen2:"Generator 2",
    elec:"Electricity", hour:"hrs", total_hours:"📊 Total Hours",
    gen1_total:"Gen 1 Total", gen2_total:"Gen 2 Total",
    factory_notes:"Factory notes...", staff:"👷 Staff & Overtime",
    worker_name:"Worker name", ot_hours:"OT hrs", add_worker:"+ Add Worker",
    factory_report:"📤 Submit Factory Report", factory_reported:"Factory Report Submitted",
    site_title:"📍 Site", workers_count:"👷 Workers",
    progress:"📊 Progress %", works_done:"🔨 Today's Work",
    works_ph:"Describe today's completed work...", notes:"📝 Notes",
    notes_ph:"Issues or requests...", site_report_btn:"📤 Submit Today's Report",
    site_reported:"Today's Report Submitted", prev_reports:"📅 Previous Reports",
    gen_note_ph:"Additional notes...",
    // Manager
    mgr_title:"Work Management Dashboard", mgr_enter:"Access Code",
    tab_dashboard:"📊 Dashboard", tab_plan:"📋 Tomorrow's Plan",
    tab_reports:"📄 Reports", tab_team:"👷 Team",
    plan_factory:"🏭 Factory", plan_sites:"📍 External Sites",
    plan_factory_title:"Factory Tasks for Tomorrow",
    plan_factory_hint:"Each line = one task shown to the foreman",
    task_ph:"Write task...", add_task:"+ Add Task",
    gen_note:"General Note", gen_note_mgr_ph:"Instructions for foreman...",
    save_plan:"💾 Save Tomorrow's Plan", plan_saved:"✅ Plan Saved",
    plan_sites_sel:"Select Site Foreman",
    site_area:"📍 Area", site_area_ph:"e.g. Floor 2 — Room 5",
    site_goal:"🎯 Goal", site_goal_ph:"e.g. Complete ceiling",
    site_tasks:"🔨 Required Work",
    site_tasks_ph:"Each line = one task",
  }
};

// زر تبديل اللغة
function LangBtn({ lang, setLang }) {
  return (
    <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")}
      style={{background:"rgba(255,255,255,0.12)",border:"none",
        borderRadius:8,padding:"5px 10px",cursor:"pointer",
        fontSize:12,fontWeight:700,color:"#fff",display:"flex",
        alignItems:"center",gap:4}}>
      {lang==="ar"?"🇬🇧 EN":"🇮🇶 عر"}
    </button>
  );
}

// ─── نظام الفورمن (بوابة الموبايل) ──────────────────
export function ForemanSystem({ onBack }) {
  const [lang, setLang] = useState(null);
  const t = T[lang||"ar"];
  const [foreman, setForeman] = useState(null);
  const [name, setName] = useState("");
  const [pin,  setPIN]  = useState("");
  const [err,  setErr]  = useState("");
  const [foremans, setForemans] = useState([]);

  useEffect(()=>{
    return onSnapshot(collection(db,"foremans"),
      s=>setForemans(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);

  const login = () => {
    setErr("");
    const found = foremans.find(f=>
      f.name.trim()===name.trim() && String(f.pin)===String(pin));
    if(!found){ setErr("❌ الاسم أو PIN غلط"); return; }
    setForeman(found);
  };

  const logout = () => { setForeman(null); setName(""); setPIN(""); };

  // شاشة اختيار اللغة أولاً
  if(!lang) return (
    <div style={{minHeight:"100vh",background:"#0F172A",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#1E293B",borderRadius:24,padding:"40px 28px",
        width:"100%",maxWidth:360,boxShadow:"0 32px 80px rgba(0,0,0,0.6)",
        textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:14}}>🦺</div>
        <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>
          شركة باب المشاريع
        </div>
        <div style={{fontSize:12,color:"#475569",marginBottom:32}}>
          اختر اللغة · Choose Language
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <button onClick={()=>setLang("ar")} style={{
            background:"#1E3A8A",border:"none",
            borderRadius:16,padding:"22px 14px",cursor:"pointer"}}>
            <div style={{fontSize:36,marginBottom:8}}>🇮🇶</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",fontFamily:"Tahoma"}}>
              عربي
            </div>
          </button>
          <button onClick={()=>setLang("en")} style={{
            background:"#1E3A8A",border:"none",
            borderRadius:16,padding:"22px 14px",cursor:"pointer"}}>
            <div style={{fontSize:36,marginBottom:8}}>🇬🇧</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",fontFamily:"Arial"}}>
              English
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  if(!foreman) return (
    <div style={{minHeight:"100vh",background:"#0F172A",
      fontFamily:t.fontFamily,direction:t.dir,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#1E293B",borderRadius:24,padding:"36px 28px",
        width:"100%",maxWidth:380,boxShadow:"0 32px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:16}}>
          <button onClick={()=>setLang(null)} style={{
            background:"rgba(255,255,255,0.08)",border:"none",
            borderRadius:8,padding:"5px 10px",cursor:"pointer",
            color:"#64748B",fontSize:12}}>
            ←
          </button>
          <LangBtn lang={lang} setLang={setLang}/>
        </div>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:56,marginBottom:12}}>🦺</div>
          <div style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:4}}>
            {t.login_title}
          </div>
          <div style={{fontSize:12,color:"#475569"}}>
            شركة باب المشاريع
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"#475569",fontWeight:700,
            marginBottom:6,letterSpacing:1}}>{t.login_name}</div>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="أدخل اسمك..."
            style={{width:"100%",background:"#0F172A",border:"1.5px solid #334155",
              borderRadius:12,padding:"13px 16px",fontSize:14,outline:"none",
              fontFamily:"Tahoma",direction:"rtl",boxSizing:"border-box",
              color:"#fff"}}/>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:11,color:"#475569",fontWeight:700,
            marginBottom:6,letterSpacing:1}}>{t.login_pin}</div>
          <input type="password" value={pin}
            onChange={e=>setPIN(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            placeholder="••••"
            style={{width:"100%",background:"#0F172A",border:"1.5px solid #334155",
              borderRadius:12,padding:"13px",fontSize:22,outline:"none",
              fontFamily:"Tahoma",textAlign:"center",boxSizing:"border-box",
              color:"#fff",letterSpacing:6}}/>
        </div>
        {err&&<div style={{color:"#F87171",fontSize:12,textAlign:"center",
          marginBottom:14}}>{err}</div>}
        <button onClick={login} style={{width:"100%",border:"none",
          borderRadius:12,padding:"15px",fontSize:15,fontWeight:700,
          fontFamily:t.fontFamily,cursor:"pointer",
          background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",color:"#fff"}}>
          {t.login_btn}
        </button>

      </div>
    </div>
  );

  if(foreman.type==="معمل")
    return <FactoryView foreman={foreman} onLogout={logout} lang={lang}/>;
  return <SiteView foreman={foreman} onLogout={logout} lang={lang}/>;
}

// ─── واجهة المعمل للفورمن (موبايل أولاً) ─────────────
function FactoryView({ foreman, onLogout, lang="ar" }) {
  const t = T[lang];
  const [tab,          setTab]          = useState("work");
  const [todayPlan,    setTodayPlan]    = useState(null);
  const [tomorrowPlan, setTomorrowPlan] = useState(null);
  const [todayReport,  setTodayReport]  = useState(null);
  const [statuses,     setStatuses]     = useState({});
  const [notes,        setNotes]        = useState({});
  const [genNote,      setGenNote]      = useState("");
  const [saving,       setSaving]       = useState(false);

  const [factReport, setFactReport] = useState({
    machineStatus:"جيدة",
    fuel:"", water:"",
    gen1Hours:"", gen2Hours:"", elecHours:"",
    gen1Total:"", gen2Total:"",
    note:"",
  });
  const fr = k => v => setFactReport(f=>({...f,[k]:v}));

  const [workers,    setWorkers]    = useState([{name:"",hours:""}]);
  const [factSaved,  setFactSaved]  = useState(false);
  const [factSaving, setFactSaving] = useState(false);

  useEffect(()=>{
    const u1=onSnapshot(query(collection(db,"factory_plans"),where("date","==",TODAY)),
      s=>{const d=s.docs[0];setTodayPlan(d?{id:d.id,...d.data()}:null);});
    const u2=onSnapshot(query(collection(db,"factory_plans"),where("date","==",TOMORROW)),
      s=>{const d=s.docs[0];setTomorrowPlan(d?{id:d.id,...d.data()}:null);});
    const u3=onSnapshot(query(collection(db,"factory_reports"),where("date","==",TODAY)),
      s=>{const d=s.docs[0];setTodayReport(d?{id:d.id,...d.data()}:null);});
    return()=>{u1();u2();u3();};
  },[]);

  const getS=()=>[
    {v:"منجز",   label:t.done,    c:"#16A34A",bg:"#DCFCE7",e:"✅"},
    {v:"جزئي",  label:t.partial,  c:"#D97706",bg:"#FEF3C7",e:"⚠️"},
    {v:"لم ينجز",label:t.not_done, c:"#DC2626",bg:"#FEE2E2",e:"❌"},
  ];
  const S=getS();

  const submitWork = async () => {
    if(!todayPlan){return;}
    setSaving(true);
    const tasks=(todayPlan.tasks||[]).map((t,i)=>({
      desc:t.desc, status:statuses[i]||"لم ينجز", note:notes[i]||""
    }));
    await setDoc(doc(db,"factory_reports",TODAY),{
      date:TODAY,foremanId:foreman.id,foremanName:foreman.name,
      tasks,note:genNote,submittedAt:new Date().toISOString()
    });
    setSaving(false);
  };

  const submitFactory = async () => {
    setFactSaving(true);
    const validWorkers=workers.filter(w=>w.name.trim()&&w.hours);

    // حفظ تقرير المعمل
    await setDoc(doc(db,"factory_status",TODAY),{
      date:TODAY,foremanId:foreman.id,foremanName:foreman.name,
      ...factReport,
      workers:validWorkers,
      submittedAt:new Date().toISOString()
    });

    // إرسال الأوفرتايم لصفحة الرواتب
    for(const w of validWorkers){
      await addDoc(collection(db,"overtime_records"),{
        workerName:w.name.trim(),
        hours:Number(w.hours)||0,
        date:TODAY,
        source:"معمل الديكور",
        foremanName:foreman.name,
        branch:"ديكور",
        status:"pending", // معلق — ينتظر موافقة المدير المالي
        createdAt:new Date().toISOString()
      });
    }

    setFactSaved(true); setFactSaving(false);
    setTimeout(()=>setFactSaved(false),3000);
  };

  const getMachineStatus=()=>[
    {v:"جيدة",l:t.good},{v:"تحتاج صيانة",l:t.needs_maint},{v:"متوقفة",l:t.stopped}
  ];
  const MACHINE_STATUS=["جيدة","تحتاج صيانة","متوقفة"];
  const MACHINE_COLORS={
    "جيدة":       {c:"#16A34A",bg:"#DCFCE7",e:"✅"},
    "تحتاج صيانة":{c:"#D97706",bg:"#FEF3C7",e:"⚠️"},
    "متوقفة":     {c:"#DC2626",bg:"#FEE2E2",e:"❌"},
  };

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",
      fontFamily:"Tahoma",direction:"rtl",
      maxWidth:480,margin:"0 auto"}}>

      {/* ─── هيدر ثابت ─── */}
      <div style={{position:"sticky",top:0,zIndex:10,
        background:"#0F172A",padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#fff",lineHeight:1}}>
              {t.factory_title}
            </div>
            <div style={{fontSize:11,color:"#475569",marginTop:3}}>
              {foreman.name} · {TODAY}
            </div>
          </div>
          <button onClick={onLogout}
            style={{background:"#1E293B",border:"none",borderRadius:10,
              padding:"8px 14px",cursor:"pointer",
              fontFamily:"Tahoma",color:"#94A3B8",fontSize:12}}>
            خروج
          </button>
        </div>

        {/* التبويبان */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
          gap:6,marginTop:12}}>
          {[
            {id:"work",    e:"📋",label:t.tab_work.replace("📋 ","")},
            {id:"factory", e:"🏭",label:t.tab_factory.replace("🏭 ","")},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              border:"none",borderRadius:10,padding:"10px",cursor:"pointer",
              fontFamily:"Tahoma",fontSize:13,fontWeight:700,
              background:tab===t.id?"#2563EB":"rgba(255,255,255,0.07)",
              color:tab===t.id?"#fff":"#64748B"}}>
              {t.e} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── محتوى ─── */}
      <div style={{padding:"14px 14px 100px"}}>

        {/* ════ تبويب الأعمال ════ */}
        {tab==="work"&&(
          <div>

            {/* خطة الغد */}
            {tomorrowPlan&&(
              <div style={{background:"#EFF6FF",borderRadius:16,
                padding:16,marginBottom:14,
                border:"2px solid #2563EB"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <div style={{background:"#2563EB",borderRadius:8,
                    padding:"4px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>
                    📅 خطة الغد
                  </div>
                  <span style={{fontSize:11,color:"#2563EB"}}>{TOMORROW}</span>
                </div>
                {tomorrowPlan.note&&(
                  <div style={{background:"#fff",borderRadius:10,
                    padding:"10px 12px",fontSize:13,color:"#1D4ED8",
                    fontWeight:600,marginBottom:10}}>💬 {tomorrowPlan.note}</div>
                )}
                {(tomorrowPlan.tasks||[]).map((t,i)=>(
                  <div key={i} style={{background:"#fff",borderRadius:12,
                    padding:"12px 14px",marginBottom:8,
                    borderRight:"4px solid #2563EB"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>
                      {i+1}. {t.desc}
                    </div>
                    {(t.qty||t.material||t.responsible)&&(
                      <div style={{display:"flex",flexWrap:"wrap",
                        gap:8,marginTop:6}}>
                        {t.qty&&<span style={{fontSize:11,background:"#F1F5F9",
                          borderRadius:6,padding:"2px 8px",color:"#475569"}}>
                          📦 {t.qty}
                        </span>}
                        {t.material&&<span style={{fontSize:11,background:"#FEF3C7",
                          borderRadius:6,padding:"2px 8px",color:"#92400E"}}>
                          🪵 {t.material}
                        </span>}
                        {t.responsible&&<span style={{fontSize:11,background:"#EDE9FE",
                          borderRadius:6,padding:"2px 8px",color:"#5B21B6"}}>
                          👷 {t.responsible}
                        </span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* مهام اليوم */}
            <div style={{background:"#fff",borderRadius:16,
              padding:16,marginBottom:14,border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:14}}>
                📋 مهام اليوم
              </div>
              {!todayPlan?(
                <div style={{textAlign:"center",padding:"30px 0",color:"#94A3B8"}}>
                  <div style={{fontSize:48,marginBottom:10}}>📭</div>
                  <div style={{fontSize:14}}>{t.no_tasks}</div>
                </div>
              ):(todayPlan.tasks||[]).map((t,i)=>(
                <div key={i} style={{borderRadius:14,marginBottom:14,
                  border:"1px solid #E2E8F0",overflow:"hidden"}}>
                  {/* عنوان المهمة */}
                  <div style={{background:"#F8FAFC",padding:"12px 16px",
                    borderBottom:"1px solid #E2E8F0"}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>
                      {i+1}. {t.desc}
                    </div>
                    {(t.qty||t.material||t.responsible)&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                        {t.qty&&<span style={{fontSize:11,background:"#E2E8F0",
                          borderRadius:6,padding:"2px 8px",color:"#475569"}}>
                          📦 {t.qty}
                        </span>}
                        {t.material&&<span style={{fontSize:11,background:"#FEF3C7",
                          borderRadius:6,padding:"2px 8px",color:"#92400E"}}>
                          🪵 {t.material}
                        </span>}
                        {t.responsible&&<span style={{fontSize:11,background:"#EDE9FE",
                          borderRadius:6,padding:"2px 8px",color:"#5B21B6"}}>
                          👷 {t.responsible}
                        </span>}
                      </div>
                    )}
                  </div>
                  {/* أزرار الحالة */}
                  <div style={{padding:"12px 14px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
                      gap:8,marginBottom:10}}>
                      {getS().map(s=>(
                        <button key={s.v}
                          onClick={()=>setStatuses(p=>({...p,[i]:s.v}))}
                          style={{border:"2px solid "+(statuses[i]===s.v?s.c:"#E2E8F0"),
                            borderRadius:12,padding:"12px 6px",cursor:"pointer",
                            fontFamily:t.fontFamily,fontSize:12,fontWeight:700,
                            background:statuses[i]===s.v?s.bg:"#fff",
                            color:statuses[i]===s.v?s.c:"#94A3B8"}}>
                          <div style={{fontSize:20,marginBottom:4}}>{s.e}</div>
                          {s.v}
                        </button>
                      ))}
                    </div>
                    <input placeholder="ملاحظة على هذه المهمة..."
                      value={notes[i]||""}
                      onChange={e=>setNotes(p=>({...p,[i]:e.target.value}))}
                      style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:10,
                        padding:"10px 14px",fontSize:13,outline:"none",
                        fontFamily:"Tahoma",direction:"rtl",boxSizing:"border-box",
                        background:"#F8FAFC"}}/>
                  </div>
                </div>
              ))}
            </div>

            {/* رفع تقرير الأعمال */}
            {todayPlan&&(
              <div style={{background:"#fff",borderRadius:16,
                padding:16,border:"1px solid #E2E8F0"}}>
                <div style={{fontSize:14,fontWeight:700,color:"#0F172A",marginBottom:12}}>
                  📤 رفع تقرير الأعمال
                </div>
                {todayReport?(
                  <div style={{background:"#F0FDF4",borderRadius:14,padding:20,
                    border:"2px solid #16A34A",textAlign:"center"}}>
                    <div style={{fontSize:48,marginBottom:8}}>✅</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#16A34A"}}>
                      تم رفع التقرير
                    </div>
                    <div style={{fontSize:12,color:"#64748B",marginTop:4}}>
                      {todayReport.submittedAt?.slice(11,16)}
                    </div>
                  </div>
                ):(
                  <>
                    <textarea value={genNote}
                      onChange={e=>setGenNote(e.target.value)}
                      placeholder="ملاحظات إضافية..." rows={3}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:12,
                        padding:"12px 14px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",
                        resize:"none",marginBottom:14}}/>
                    <button onClick={submitWork} disabled={saving}
                      style={{width:"100%",border:"none",borderRadius:14,padding:"16px",
                        fontSize:16,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                        background:saving?"#E2E8F0":"#16A34A",
                        color:saving?"#94A3B8":"#fff"}}>
                      {saving?"⏳ جاري الرفع...":"✅ رفع تقرير الأعمال"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ تبويب المعمل ════ */}
        {tab==="factory"&&(
          <div>

            {/* حالة المكائن */}
            <div style={{background:"#fff",borderRadius:16,
              padding:16,marginBottom:14,border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:14}}>
                🔧 حالة المكائن
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {MACHINE_STATUS.map(s=>{
                  const mc=MACHINE_COLORS[s];
                  const sel=factReport.machineStatus===s;
                  return (
                    <button key={s} onClick={()=>fr("machineStatus")(s)} style={{
                      border:"2px solid "+(sel?mc.c:"#E2E8F0"),
                      borderRadius:14,padding:"14px 8px",cursor:"pointer",
                      fontFamily:"Tahoma",fontSize:12,fontWeight:700,
                      background:sel?mc.bg:"#fff",
                      color:sel?mc.c:"#94A3B8"}}>
                      <div style={{fontSize:24,marginBottom:6}}>{mc.e}</div>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* الوقود والماء */}
            <div style={{background:"#fff",borderRadius:16,
              padding:16,marginBottom:14,border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:14}}>
                ⛽ الوقود والماء
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {k:"fuel", l:"⛽ الوقود",c:"#F97316",unit:"لتر"},
                  {k:"water",l:"💧 الماء",  c:"#2563EB",unit:"لتر"},
                ].map(({k,l,c2,unit,c})=>(
                  <div key={k} style={{background:"#F8FAFC",borderRadius:14,
                    padding:"14px",textAlign:"center",border:"1px solid #E2E8F0"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#475569",
                      marginBottom:10}}>{l}</div>
                    <input type="number" placeholder="0"
                      value={factReport[k]}
                      onChange={e=>fr(k)(e.target.value)}
                      style={{width:"100%",border:"2px solid "+c+"30",borderRadius:12,
                        padding:"12px",fontSize:24,fontWeight:800,outline:"none",
                        fontFamily:"Tahoma",textAlign:"center",
                        boxSizing:"border-box",color:c}}/>
                    <div style={{fontSize:11,color:"#94A3B8",marginTop:6}}>{unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ساعات اليوم */}
            <div style={{background:"#fff",borderRadius:16,
              padding:16,marginBottom:14,border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:14}}>
                🕐 ساعات اليوم
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  {k:"gen1Hours",l:"مولد ١", c:"#F97316",e:"🔋"},
                  {k:"gen2Hours",l:"مولد ٢", c:"#8B5CF6",e:"🔋"},
                  {k:"elecHours",l:"كهرباء",c:"#2563EB",e:"⚡"},
                ].map(({k,l,c,e})=>(
                  <div key={k} style={{background:"#F8FAFC",borderRadius:14,
                    padding:"14px 10px",textAlign:"center",border:"1px solid #E2E8F0"}}>
                    <div style={{fontSize:18,marginBottom:4}}>{e}</div>
                    <div style={{fontSize:11,fontWeight:700,color:c,marginBottom:8}}>{l}</div>
                    <input type="number" placeholder="0"
                      value={factReport[k]}
                      onChange={e=>fr(k)(e.target.value)}
                      style={{width:"100%",border:"2px solid "+c+"30",borderRadius:10,
                        padding:"10px 4px",fontSize:22,fontWeight:800,outline:"none",
                        fontFamily:"Tahoma",textAlign:"center",
                        boxSizing:"border-box",color:c}}/>
                    <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>ساعة</div>
                  </div>
                ))}
              </div>
            </div>

            {/* الساعات الكلية */}
            <div style={{background:"#fff",borderRadius:16,
              padding:16,marginBottom:14,border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:14}}>
                📊 الساعات الكلية التراكمية
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {k:"gen1Total",l:"مجموع مولد ١",c:"#F97316"},
                  {k:"gen2Total",l:"مجموع مولد ٢",c:"#8B5CF6"},
                ].map(({k,l,c})=>(
                  <div key={k} style={{background:"#F8FAFC",borderRadius:14,
                    padding:"14px",textAlign:"center",border:"1px solid #E2E8F0"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#475569",
                      marginBottom:8}}>{l}</div>
                    <input type="number" placeholder="0"
                      value={factReport[k]}
                      onChange={e=>fr(k)(e.target.value)}
                      style={{width:"100%",border:"2px solid "+c+"30",borderRadius:12,
                        padding:"10px",fontSize:22,fontWeight:800,outline:"none",
                        fontFamily:"Tahoma",textAlign:"center",
                        boxSizing:"border-box",color:c}}/>
                    <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>ساعة</div>
                  </div>
                ))}
              </div>
              <textarea placeholder="ملاحظات عن المعمل..." rows={2}
                value={factReport.note} onChange={e=>fr("note")(e.target.value)}
                style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:12,
                  padding:"11px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",
                  resize:"none",marginTop:12}}/>
            </div>

            {/* الكادر والأوفرتايم */}
            <div style={{background:"#fff",borderRadius:16,
              padding:16,marginBottom:14,border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:14}}>
                👷 الكادر والساعات الإضافية
              </div>
              {workers.map((w,i)=>(
                <div key={i} style={{display:"flex",gap:8,
                  marginBottom:10,alignItems:"center"}}>
                  <input placeholder={"اسم العامل "+(i+1)}
                    value={w.name}
                    onChange={e=>setWorkers(p=>p.map((ww,ii)=>
                      ii===i?{...ww,name:e.target.value}:ww))}
                    style={{flex:1,border:"1px solid #CBD5E1",borderRadius:12,
                      padding:"13px 14px",fontSize:14,outline:"none",
                      fontFamily:"Tahoma",direction:"rtl",boxSizing:"border-box"}}/>
                  <div style={{textAlign:"center",width:72}}>
                    <input type="number" placeholder="0"
                      value={w.hours}
                      onChange={e=>setWorkers(p=>p.map((ww,ii)=>
                        ii===i?{...ww,hours:e.target.value}:ww))}
                      style={{width:"100%",border:"2px solid #F97316",borderRadius:12,
                        padding:"13px 4px",fontSize:18,fontWeight:800,outline:"none",
                        fontFamily:"Tahoma",textAlign:"center",
                        boxSizing:"border-box",color:"#F97316"}}/>
                    <div style={{fontSize:9,color:"#94A3B8",marginTop:2}}>ساعة OT</div>
                  </div>
                  <button onClick={()=>setWorkers(p=>p.filter((_,ii)=>ii!==i))}
                    disabled={workers.length===1}
                    style={{background:"#FEE2E2",border:"none",borderRadius:12,
                      padding:"13px 12px",cursor:"pointer",
                      color:"#DC2626",fontSize:18}}>✕</button>
                </div>
              ))}
              <button onClick={()=>setWorkers(p=>[...p,{name:"",hours:""}])}
                style={{width:"100%",border:"2px dashed #CBD5E1",borderRadius:12,
                  padding:"13px",fontSize:14,fontFamily:"Tahoma",cursor:"pointer",
                  background:"transparent",color:"#64748B",marginTop:4}}>
                + إضافة عامل
              </button>
            </div>

            {/* رفع تقرير المعمل */}
            {factSaved?(
              <div style={{background:"#F5F3FF",border:"2px solid #8B5CF6",
                borderRadius:16,padding:24,textAlign:"center"}}>
                <div style={{fontSize:48,marginBottom:8}}>✅</div>
                <div style={{fontSize:16,fontWeight:700,color:"#7C3AED"}}>
                  تم رفع تقرير المعمل
                </div>
              </div>
            ):(
              <button onClick={submitFactory} disabled={factSaving}
                style={{width:"100%",border:"none",borderRadius:16,padding:"18px",
                  fontSize:16,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                  background:factSaving?"#E2E8F0":"#7C3AED",
                  color:factSaving?"#94A3B8":"#fff"}}>
                {factSaving?"⏳ جاري الرفع...":"📤 رفع تقرير المعمل"}
              </button>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// ─── واجهة الموقع للفورمن ─────────────────────────────
function SiteView({ foreman, onLogout }) {
  const [tomorrowPlan, setTomorrowPlan] = useState(null);
  const [todayReport,  setTodayReport]  = useState(null);
  const [history,      setHistory]      = useState([]);
  const [workers,      setWorkers]      = useState("");
  const [progress,     setProgress]     = useState("");
  const [tasks,        setTasks]        = useState("");
  const [note,         setNote]         = useState("");
  const [saving,       setSaving]       = useState(false);

  useEffect(()=>{
    if(!foreman.projectId) return;
    const u1=onSnapshot(
      query(collection(db,"site_plans"),
        where("projectId","==",foreman.projectId),
        where("date","==",TOMORROW)),
      s=>{const d=s.docs[0];setTomorrowPlan(d?{id:d.id,...d.data()}:null);});
    const u2=onSnapshot(
      query(collection(db,"site_reports"),
        where("projectId","==",foreman.projectId)),
      s=>{
        const list=s.docs.map(d=>({id:d.id,...d.data()}))
          .sort((a,b)=>b.date.localeCompare(a.date));
        setHistory(list);
        setTodayReport(list.find(r=>r.date===TODAY)||null);
      });
    return()=>{u1();u2();};
  },[foreman.projectId]);

  const submit = async () => {
    if(!workers||!tasks.trim()) return;
    setSaving(true);
    await setDoc(doc(db,"site_reports",foreman.projectId+"_"+TODAY),{
      date:TODAY,projectId:foreman.projectId,
      projectName:foreman.projectName||"",
      foremanId:foreman.id,foremanName:foreman.name,
      workers:Number(workers)||0,progress:Number(progress)||0,
      tasks:tasks.trim(),note:note.trim(),
      submittedAt:new Date().toISOString()
    });
    setSaving(false);
  };

  const lastProgress = history[0]?.progress||0;
  const now=new Date().toLocaleTimeString("ar-IQ",{hour:"2-digit",minute:"2-digit"});

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",
      fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:560,margin:"0 auto",padding:16}}>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#1E3A8A,#2563EB)",
          borderRadius:18,padding:"16px 20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:12}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>
                📍 {foreman.projectName||"الموقع"}
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2}}>
                {foreman.name} · {TODAY} · {now}
              </div>
            </div>
            <button onClick={onLogout} style={{background:"rgba(255,255,255,0.1)",
              border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",
              fontFamily:"Tahoma",color:"rgba(255,255,255,0.6)",fontSize:11}}>
              خروج
            </button>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:4}}>
              <span>نسبة الإنجاز الكلية</span>
              <span style={{fontWeight:700,color:"#4ADE80"}}>{lastProgress}%</span>
            </div>
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:99,height:6}}>
              <div style={{height:6,borderRadius:99,background:"#4ADE80",
                width:lastProgress+"%",transition:"width 0.5s"}}/>
            </div>
          </div>
        </div>

        {/* خطة الغد */}
        {tomorrowPlan&&(
          <div style={{background:"#fff",borderRadius:16,padding:18,
            marginBottom:14,border:"2px solid #2563EB"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{background:"#2563EB",borderRadius:8,
                padding:"4px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>
                📅 مهام الغد — {TOMORROW}
              </div>
            </div>
            {(tomorrowPlan.area||tomorrowPlan.goal)&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                gap:8,marginBottom:10}}>
                {tomorrowPlan.area&&(
                  <div style={{background:"#EFF6FF",borderRadius:9,
                    padding:"8px 12px",fontSize:12}}>
                    <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>📍 المنطقة</div>
                    <strong style={{color:"#1D4ED8"}}>{tomorrowPlan.area}</strong>
                  </div>
                )}
                {tomorrowPlan.goal&&(
                  <div style={{background:"#F0FDF4",borderRadius:9,
                    padding:"8px 12px",fontSize:12}}>
                    <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>🎯 الهدف</div>
                    <strong style={{color:"#16A34A"}}>{tomorrowPlan.goal}</strong>
                  </div>
                )}
              </div>
            )}
            {tomorrowPlan.note&&(
              <div style={{background:"#EFF6FF",borderRadius:10,
                padding:"10px 14px",fontSize:12,color:"#1D4ED8",
                fontWeight:600,marginBottom:10}}>💬 {tomorrowPlan.note}</div>
            )}
            {(tomorrowPlan.tasks||[]).map((t,i)=>(
              <div key={i} style={{padding:"10px 14px",borderRadius:10,
                marginBottom:6,background:"#F8FAFC",
                border:"1px solid #DBEAFE",borderRight:"4px solid #2563EB",fontSize:12}}>
                <strong>{i+1}. {t.desc}</strong>
              </div>
            ))}
          </div>
        )}

        {/* تقرير اليوم */}
        <div style={{background:"#fff",borderRadius:16,padding:18,
          marginBottom:14,border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>
            📤 تقرير اليوم
          </div>
          {todayReport?(
            <div style={{background:"#F0FDF4",borderRadius:12,padding:16,
              border:"2px solid #16A34A"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>
                  ✅ تم رفع التقرير
                </span>
                <span style={{fontSize:11,color:"#64748B"}}>
                  {todayReport.submittedAt?.slice(11,16)}
                </span>
              </div>
              <div style={{fontSize:12,color:"#475569"}}>
                👷 {todayReport.workers} عامل ·
                📊 {todayReport.progress}% إنجاز
              </div>
              <div style={{fontSize:12,color:"#1E293B",marginTop:8}}>
                {todayReport.tasks}
              </div>
              {todayReport.note&&<div style={{fontSize:11,color:"#94A3B8",marginTop:6}}>
                📝 {todayReport.note}
              </div>}
            </div>
          ):(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                gap:10,marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>
                    👷 عدد العمال
                  </div>
                  <input type="number" value={workers}
                    onChange={e=>setWorkers(e.target.value)}
                    placeholder="0"
                    style={{width:"100%",border:"1.5px solid #CBD5E1",borderRadius:10,
                      padding:"12px",fontSize:20,outline:"none",fontFamily:"Tahoma",
                      textAlign:"center",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>
                    📊 نسبة الإنجاز %
                  </div>
                  <input type="number" value={progress} min="0" max="100"
                    onChange={e=>setProgress(e.target.value)}
                    placeholder="0"
                    style={{width:"100%",border:"1.5px solid #CBD5E1",borderRadius:10,
                      padding:"12px",fontSize:20,outline:"none",fontFamily:"Tahoma",
                      textAlign:"center",boxSizing:"border-box"}}/>
                  {progress>0&&(
                    <div style={{marginTop:6,background:"#E2E8F0",borderRadius:99,height:4}}>
                      <div style={{height:4,borderRadius:99,background:"#2563EB",
                        width:Math.min(100,Number(progress))+"%"}}/>
                    </div>
                  )}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>
                  🔨 الأعمال المنجزة اليوم *
                </div>
                <textarea value={tasks} onChange={e=>setTasks(e.target.value)}
                  placeholder="اكتب الأعمال المنجزة اليوم..." rows={4}
                  style={{width:"100%",border:"1.5px solid #CBD5E1",borderRadius:10,
                    padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",resize:"none"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>
                  📝 ملاحظات
                </div>
                <input value={note} onChange={e=>setNote(e.target.value)}
                  placeholder="مشاكل أو احتياجات..."
                  style={{width:"100%",border:"1.5px solid #CBD5E1",borderRadius:10,
                    padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box"}}/>
              </div>
              <button onClick={submit}
                disabled={saving||!workers||!tasks.trim()} style={{
                width:"100%",border:"none",borderRadius:12,padding:"14px",
                fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                background:!workers||!tasks.trim()?"#E2E8F0":"#2563EB",
                color:!workers||!tasks.trim()?"#94A3B8":"#fff"}}>
                {saving?"⏳ جاري الرفع...":"📤 رفع تقرير اليوم"}
              </button>
            </div>
          )}
        </div>

        {/* آخر 3 تقارير */}
        {history.filter(r=>r.date!==TODAY).length>0&&(
          <div style={{background:"#fff",borderRadius:16,padding:18,
            border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:12}}>
              📅 آخر التقارير
            </div>
            {history.filter(r=>r.date!==TODAY).slice(0,3).map(r=>(
              <div key={r.id} style={{borderRadius:10,padding:"10px 14px",
                marginBottom:8,background:"#F8FAFC",border:"1px solid #E2E8F0"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:11,color:"#64748B"}}>{r.date}</span>
                  <div style={{display:"flex",gap:10,fontSize:11}}>
                    <span style={{color:"#475569"}}>👷 {r.workers}</span>
                    <span style={{color:"#2563EB",fontWeight:700}}>{r.progress}%</span>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#475569"}}>{r.tasks}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── لوحة المدير الاحترافية ───────────────────────────
export function ForemanManagePage() {
  // شاشة دخول المدير
  const [loggedIn, setLoggedIn] = useState(false);
  const [mgrPin,   setMgrPin]   = useState("");
  const [mgrErr,   setMgrErr]   = useState("");
  const MANAGER_PIN = "1234"; // نفس الباسورد

  const [lang, setLang] = useState("ar");
  const t = T[lang];
  const [projects,    setProjects]    = useState([]);
  const [tab,         setTab]         = useState("dashboard");
  const [foremans,    setForemans]    = useState([]);
  const [factPlans,   setFactPlans]   = useState([]);
  const [factReports, setFactReports] = useState([]);
  const [factStatus,  setFactStatus]  = useState([]);
  const [siteReports, setSiteReports] = useState([]);
  const [sitePlans,   setSitePlans]   = useState([]);

  // نسبة الإنجاز الرسمية
  const [officialProgress, setOfficialProgress] = useState({});

  const approveProgress = async (reportId, value) => {
    const pw=window.prompt("🔒 باسورد تأكيد النسبة:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    await updateDoc(doc(db,"site_reports",reportId),{
      officialProgress:Number(value),
      approvedAt:new Date().toISOString()
    });
    alert("✅ تم تحديد النسبة الرسمية: "+value+"%");
  };

  // تعديل وحذف مهام الخطة
  const [editPlanIdx,  setEditPlanIdx]  = useState(null);
  const [editPlanText, setEditPlanText] = useState("");

  const deletePlanTask = async (plan, idx, type) => {
    const pw=window.prompt("🔒 باسورد الحذف:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    const newTasks=(plan.tasks||[]).filter((_,i)=>i!==idx);
    if(type==="factory")
      await setDoc(doc(db,"factory_plans",plan.id),{...plan,tasks:newTasks});
    else
      await setDoc(doc(db,"site_plans",plan.id),{...plan,tasks:newTasks});
    alert("✅ تم الحذف");
  };

  const saveEditPlanTask = async (plan, idx, type) => {
    if(!editPlanText.trim()) return;
    const pw=window.prompt("🔒 باسورد التعديل:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    const newTasks=(plan.tasks||[]).map((t,i)=>
      i===idx?{...t,desc:editPlanText.trim()}:t);
    if(type==="factory")
      await setDoc(doc(db,"factory_plans",plan.id),{...plan,tasks:newTasks});
    else
      await setDoc(doc(db,"site_plans",plan.id),{...plan,tasks:newTasks});
    setEditPlanIdx(null); setEditPlanText(""); alert("✅ تم التعديل");
  };

  // حذف خطة كاملة
  const deletePlan = async (planId, type) => {
    const pw=window.prompt("🔒 باسورد حذف الخطة كاملة:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    if(!window.confirm("حذف هذه الخطة كاملاً؟")) return;
    await deleteDoc(doc(db,type==="factory"?"factory_plans":"site_plans",planId));
  };

  // خطة المعمل
  const [selPlanner,   setSelPlanner]   = useState("factory");
  const [planSubTab,   setPlanSubTab]   = useState("factory"); // factory | sites
  // مهام المعمل — كل مهمة سطر نصي بسيط
  const [factTaskLines, setFactTaskLines] = useState([""]);
  const [planTasks,    setPlanTasks]    = useState([{desc:"",qty:"",note:""}]);
  const [planNote,     setPlanNote]     = useState("");
  const [planSaved,    setPlanSaved]    = useState(false);
  const [sitePlanText, setSitePlanText] = useState("");
  const [sitePlanNote, setSitePlanNote] = useState("");
  const [siteArea,     setSiteArea]     = useState("");
  const [siteGoal,     setSiteGoal]     = useState("");
  const [sitePlanSaved,setSitePlanSaved]= useState(false);

  // إضافة فورمن
  const [showAdd,  setShowAdd]  = useState(false);
  const [fForm,    setFForm]    = useState({name:"",pin:"",type:"معمل",
    projectId:"",projectName:""});
  const ff = k => v => setFForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    const u0=onSnapshot(collection(db,"projects"),
      s=>setProjects(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u1=onSnapshot(collection(db,"foremans"),
      s=>setForemans(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2=onSnapshot(collection(db,"factory_plans"),
      s=>setFactPlans(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date))));
    const u3=onSnapshot(collection(db,"factory_reports"),
      s=>setFactReports(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date))));
    const u3b=onSnapshot(collection(db,"factory_status"),
      s=>setFactStatus(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date))));
    const u4=onSnapshot(collection(db,"site_reports"),
      s=>setSiteReports(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date))));
    const u5=onSnapshot(collection(db,"site_plans"),
      s=>setSitePlans(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u0();u1();u2();u3();u3b();u4();u5();};
  },[]);

  const activeProjects=(projects||[]).filter(p=>p.status==="active"&&p.type==="ديكور");
  const siteForemans=foremans.filter(f=>f.type==="موقع");
  const todayFactReport=factReports.find(r=>r.date===TODAY);
  const todayFactStatus=factStatus.find(r=>r.date===TODAY);
  const todaySiteReports=siteReports.filter(r=>r.date===TODAY);

  const savePlan = async () => {
    const valid=planTasks.filter(t=>t.desc.trim());
    if(!valid.length) return;
    await setDoc(doc(db,"factory_plans",TOMORROW),{
      date:TOMORROW,tasks:valid,note:planNote,
      createdAt:new Date().toISOString()
    });
    setPlanSaved(true); setTimeout(()=>setPlanSaved(false),2500);
  };

  const saveSitePlan = async () => {
    const selF=foremans.find(f=>f.id===selPlanner);
    if(!selF||!sitePlanText.trim()) return;
    const tasks=sitePlanText.split("\n").filter(t=>t.trim())
      .map(t=>({desc:t.trim(),note:""}));
    await setDoc(doc(db,"site_plans",selF.projectId+"_"+TOMORROW),{
      projectId:selF.projectId,projectName:selF.projectName||"",
      foremanId:selF.id,date:TOMORROW,tasks,
      area:siteArea.trim(),goal:siteGoal.trim(),note:sitePlanNote,
      createdAt:new Date().toISOString()
    });
    setSitePlanSaved(true);
    setSitePlanText(""); setSitePlanNote("");
    setSiteArea(""); setSiteGoal("");
    setTimeout(()=>setSitePlanSaved(false),2500);
  };

  const addForeman = async () => {
    if(!fForm.name.trim()||!fForm.pin) return;
    await addDoc(collection(db,"foremans"),{
      name:fForm.name.trim(), pin:String(fForm.pin),
      type:fForm.type,
      projectId:fForm.type==="موقع"?fForm.projectId:"",
      projectName:fForm.type==="موقع"?fForm.projectName:"",
      branch:"ديكور", createdAt:new Date().toISOString()
    });
    setFForm({name:"",pin:"",type:"معمل",projectId:"",projectName:""});
    setShowAdd(false);
  };

  const deleteForeman = async (id) => {
    const pw=window.prompt("🔒 باسورد:");
    if(pw!==PASS) return;
    if(!window.confirm("حذف هذا الفورمن؟")) return;
    await deleteDoc(doc(db,"foremans",id));
  };

  const printReport = (type) => {
    const today=new Date().toLocaleDateString("ar-IQ",{
      weekday:"long",year:"numeric",month:"long",day:"numeric"});
    let body="";

    if(type==="factory") {
      const r=todayFactReport;
      if(!r){alert("ما في تقرير معمل لليوم");return;}
      body=`<h2>🏭 تقرير المعمل — ${r.date}</h2>
<p>الفورمن: ${r.foremanName} · وقت الرفع: ${r.submittedAt?.slice(11,16)}</p>
<table>
<thead><tr><th>المهمة</th><th>الحالة</th><th>ملاحظة</th></tr></thead>
<tbody>
${(r.tasks||[]).map(t=>`<tr>
  <td style="text-align:right">${t.desc}</td>
  <td style="color:${t.status==="منجز"?"#16A34A":t.status==="جزئي"?"#D97706":"#DC2626"};font-weight:700">${t.status}</td>
  <td style="color:#64748B">${t.note||"—"}</td>
</tr>`).join("")}
</tbody></table>
${r.note?`<p style="color:#64748B">ملاحظات: ${r.note}</p>`:""}`;
    } else if(type==="sites") {
      if(!todaySiteReports.length){alert("ما في تقارير مواقع لليوم");return;}
      body=todaySiteReports.map(r=>`
<h2>📍 ${r.projectName} — ${r.date}</h2>
<div style="display:flex;gap:20px;margin:10px 0;font-size:14px">
  <span><b>الفورمن:</b> ${r.foremanName}</span>
  <span><b>العمال:</b> ${r.workers}</span>
  <span><b>الإنجاز:</b> <b style="color:#2563EB">${r.progress}%</b></span>
</div>
<div style="background:#F8FAFC;border-radius:8px;padding:12px;margin:8px 0">
  <b>الأعمال المنجزة:</b><br/>${r.tasks}
</div>
${r.note?`<p style="color:#64748B">ملاحظات: ${r.note}</p>`:""}
<hr/>`).join("");
    } else {
      // كل شي
      body=`<h2>تقرير اليوم الشامل — ${today}</h2>
<p>المعمل: ${todayFactReport?"✅ تم":"⏳ لم يرفع"} | المواقع: ${todaySiteReports.length} / ${siteForemans.length}</p>
<hr/>` + (todayFactReport?`<h3>🏭 المعمل</h3>
${(todayFactReport.tasks||[]).map(t=>`<div style="padding:6px 0;border-bottom:1px solid #f0f0f0">
  <b>${t.desc}</b> — <span style="color:${t.status==="منجز"?"green":t.status==="جزئي"?"orange":"red"}">${t.status}</span>
  ${t.note?`<span style="color:#999"> · ${t.note}</span>`:""}
</div>`).join("")}<hr/>`:"") +
todaySiteReports.map(r=>`<h3>📍 ${r.projectName}</h3>
<p>👷 ${r.workers} عامل | 📊 ${r.progress}% إنجاز</p>
<p>${r.tasks}</p>${r.note?`<p style="color:#999">${r.note}</p>`:""}
<hr/>`).join("");
    }

    const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:28px;direction:rtl;max-width:800px}
h2{color:#0F172A;border-bottom:2px solid #0F172A;padding-bottom:8px}
h3{color:#1E293B}
table{width:100%;border-collapse:collapse;margin:10px 0}
th{background:#0F172A;color:#fff;padding:8px 10px;font-size:11px;text-align:center}
td{padding:8px 10px;font-size:11px;text-align:center;border-bottom:1px solid #F1F5F9}
.hdr{text-align:center;border-bottom:3px solid #0F172A;padding-bottom:12px;margin-bottom:16px}
.ft{margin-top:20px;font-size:10px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:10px}
hr{border:none;border-top:1px solid #E2E8F0;margin:14px 0}
</style></head><body>
<div class="hdr"><div style="font-size:20px;font-weight:700">شركة باب المشاريع</div>
<div style="font-size:11px;color:#64748B">بغداد — قسم الديكور</div></div>
${body}
<div class="ft">طُبع: ${new Date().toISOString().slice(0,16).replace("T"," ")}</div>
</body></html>`;

    const w=window.open("","_blank","width=900,height=700");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html); w.document.close();
    w.focus(); setTimeout(()=>w.print(),700);
  };

  if(!loggedIn) return (
    <div style={{minHeight:"100vh",background:"#0F172A",
      fontFamily:"Tahoma",direction:"rtl",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#1E293B",borderRadius:24,padding:"36px 28px",
        width:"100%",maxWidth:360,boxShadow:"0 32px 80px rgba(0,0,0,0.6)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:10}}>🏗️</div>
          <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>
            لوحة إدارة العمل
          </div>
          <div style={{fontSize:12,color:"#475569"}}>قسم الديكور</div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#475569",fontWeight:700,
            marginBottom:6,letterSpacing:1}}>{t.login_pin}</div>
          <input type="password" value={mgrPin}
            onChange={e=>setMgrPin(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&(
              mgrPin===MANAGER_PIN?setLoggedIn(true):setMgrErr("❌ الرمز غلط")
            )}
            placeholder="••••"
            style={{width:"100%",background:"#0F172A",border:"1.5px solid #334155",
              borderRadius:12,padding:"14px",fontSize:24,outline:"none",
              fontFamily:"Tahoma",textAlign:"center",boxSizing:"border-box",
              color:"#fff",letterSpacing:6}}/>
        </div>
        {mgrErr&&<div style={{color:"#F87171",fontSize:12,textAlign:"center",
          marginBottom:12}}>{mgrErr}</div>}
        <button onClick={()=>{
          if(mgrPin===MANAGER_PIN) setLoggedIn(true);
          else setMgrErr("❌ الرمز غلط");
        }} style={{width:"100%",border:"none",borderRadius:12,padding:"15px",
          fontSize:15,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
          background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",color:"#fff"}}>
          دخول →
        </button>

      </div>
    </div>
  );

  const TABS=[
    {id:"dashboard",icon:"📊",label:"لوحة المتابعة"},
    {id:"plan",     icon:"📋",label:"خطة الغد"},
    {id:"reports",  icon:"📄",label:"التقارير"},
    {id:"team",     icon:"👷",label:"الفريق"},
  ];

  const STATUS_C={"منجز":"#16A34A","جزئي":"#D97706","لم ينجز":"#DC2626"};

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",
      fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>

        {/* هيدر */}
        <div style={{background:"#0F172A",padding:"18px 24px",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>
              🏗️ إدارة العمل — قسم الديكور
            </div>
            <div style={{fontSize:11,color:"#475569",marginTop:2}}>{TODAY}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <LangBtn lang={lang} setLang={setLang}/>
            <button onClick={()=>printReport("all")} style={{
              background:"#1E293B",border:"1px solid #334155",
              borderRadius:8,padding:"7px 14px",cursor:"pointer",
              fontFamily:"Tahoma",color:"#94A3B8",fontSize:11}}>
              🖨️ طباعة اليوم
            </button>
            <button onClick={()=>setLoggedIn(false)} style={{
              background:"#DC2626",border:"none",
              borderRadius:8,padding:"7px 14px",cursor:"pointer",
              fontFamily:"Tahoma",color:"#fff",fontSize:11,fontWeight:700}}>
              🚪 خروج
            </button>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{background:"#1E293B",display:"flex",
          borderBottom:"1px solid #0F172A"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1,border:"none",padding:"13px 8px",cursor:"pointer",
              fontFamily:"Tahoma",fontSize:12,fontWeight:700,
              background:"transparent",
              color:tab===t.id?"#fff":"#475569",
              borderBottom:tab===t.id?"3px solid #3B82F6":"3px solid transparent"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{padding:"20px 24px"}}>

        {/* ─── لوحة المتابعة ─── */}
        {tab==="dashboard"&&(
          <div>
            {/* بطاقات الحالة */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",
              gap:12,marginBottom:20}}>
              {[
                {l:"فريق العمل",v:foremans.length,c:"#60A5FA",i:"👷"},
                {l:"المعمل اليوم",
                 v:todayFactReport?"✅ رُفع":"⏳ لم يُرفع",
                 c:todayFactReport?"#4ADE80":"#F87171",i:"🏭"},
                {l:"تقارير المواقع",
                 v:todaySiteReports.length+"/"+siteForemans.length,
                 c:"#FCD34D",i:"📍"},
                {l:"المشاريع النشطة",v:activeProjects.length,c:"#A78BFA",i:"🏗️"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:14,
                  padding:"16px 14px",textAlign:"center",
                  border:"1px solid #E2E8F0",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{fontSize:24,marginBottom:6}}>{s.i}</div>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:4}}>{s.l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* حالة المعمل */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>
                  🏭 المعمل — اليوم
                </span>
                {todayFactReport&&(
                  <button onClick={()=>printReport("factory")} style={{
                    background:"#F1F5F9",border:"none",borderRadius:7,
                    padding:"5px 12px",cursor:"pointer",
                    fontFamily:"Tahoma",color:"#475569",fontSize:11}}>
                    🖨️ طباعة
                  </button>
                )}
              </div>
              {todayFactReport?(
                <div>
                  <div style={{fontSize:11,color:"#64748B",marginBottom:10}}>
                    👷 {todayFactReport.foremanName} ·
                    رُفع: {todayFactReport.submittedAt?.slice(11,16)}
                  </div>
                  {(todayFactReport.tasks||[]).map((t,i)=>(
                    <div key={i} style={{padding:"8px 12px",borderRadius:8,marginBottom:4,
                      background:"#F8FAFC",border:"1px solid #F1F5F9"}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        fontSize:12,marginBottom:t.qty||t.material||t.responsible?4:0}}>
                        <span style={{color:"#1E293B",fontWeight:600}}>{t.desc}</span>
                        <span style={{color:STATUS_C[t.status]||"#64748B",fontWeight:700}}>
                          {t.status}
                        </span>
                      </div>
                      {(t.qty||t.material||t.responsible)&&(
                        <div style={{fontSize:10,color:"#94A3B8",display:"flex",gap:10}}>
                          {t.qty&&<span>📦 {t.qty}</span>}
                          {t.material&&<span>🪵 {t.material}</span>}
                          {t.responsible&&<span>👷 {t.responsible}</span>}
                        </div>
                      )}
                      {t.note&&<div style={{fontSize:10,color:"#64748B",marginTop:2}}>
                        📌 {t.note}
                      </div>}
                    </div>
                  ))}
                </div>
              ):(
                <div style={{textAlign:"center",padding:"20px 0",color:"#94A3B8"}}>
                  <div style={{fontSize:32,marginBottom:8}}>⏳</div>
                  لم يرفع الفورمن تقريره بعد
                </div>
              )}
            </div>

            {/* تقرير المعمل — الحالة اليومية */}
            {todayFactStatus&&(
              <div style={{background:"#fff",borderRadius:14,padding:18,
                border:"1px solid #E2E8F0",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:14}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>
                    🏭 حالة المعمل اليوم
                  </span>
                  <span style={{fontSize:11,color:"#64748B"}}>
                    {todayFactStatus.submittedAt?.slice(11,16)}
                  </span>
                </div>

                {/* بطاقات الأرقام */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",
                  gap:8,marginBottom:14}}>
                  {[
                    {l:"🔧 المكائن",v:todayFactStatus.machineStatus,
                      c:todayFactStatus.machineStatus==="جيدة"?"#16A34A"
                        :todayFactStatus.machineStatus==="تحتاج صيانة"?"#D97706":"#DC2626"},
                    {l:"⛽ وقود",v:(todayFactStatus.fuel||"0")+" L",c:"#F97316"},
                    {l:"💧 ماء",v:(todayFactStatus.water||"0")+" L",c:"#2563EB"},
                    {l:"⚡ كهرباء",v:(todayFactStatus.elecHours||"0")+" س",c:"#2563EB"},
                  ].map((s,i)=>(
                    <div key={i} style={{background:"#F8FAFC",borderRadius:10,
                      padding:"10px 8px",textAlign:"center",border:"1px solid #E2E8F0"}}>
                      <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>{s.l}</div>
                      <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* المولدات */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                  gap:8,marginBottom:14}}>
                  {[
                    {l:"🔋 مولد ١ — اليوم",v:todayFactStatus.gen1Hours||"0",unit:"ساعة",c:"#F97316"},
                    {l:"🔋 مولد ٢ — اليوم",v:todayFactStatus.gen2Hours||"0",unit:"ساعة",c:"#8B5CF6"},
                    {l:"مجموع مولد ١",v:todayFactStatus.gen1Total||"0",unit:"ساعة تراكمية",c:"#F97316"},
                    {l:"مجموع مولد ٢",v:todayFactStatus.gen2Total||"0",unit:"ساعة تراكمية",c:"#8B5CF6"},
                  ].map((s,i)=>(
                    <div key={i} style={{background:i<2?"#FFF7ED":"#F5F3FF",
                      borderRadius:10,padding:"10px 12px",border:"1px solid #E2E8F0"}}>
                      <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>{s.l}</div>
                      <div style={{fontSize:18,fontWeight:800,color:s.c}}>
                        {s.v}
                        <span style={{fontSize:10,fontWeight:400,color:"#94A3B8",
                          marginRight:4}}>{s.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* الكادر */}
                {(todayFactStatus.workers||[]).length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#475569",
                      marginBottom:8}}>👷 الكادر والأوفرتايم</div>
                    {(todayFactStatus.workers||[]).map((w,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",
                        padding:"6px 10px",borderRadius:8,marginBottom:4,
                        background:"#F8FAFC",fontSize:12}}>
                        <span style={{color:"#1E293B",fontWeight:600}}>{w.name}</span>
                        <span style={{color:"#F97316",fontWeight:700}}>
                          +{w.hours} ساعة OT
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {todayFactStatus.note&&(
                  <div style={{background:"#F8FAFC",borderRadius:8,
                    padding:"8px 12px",fontSize:11,color:"#64748B",marginTop:10}}>
                    📝 {todayFactStatus.note}
                  </div>
                )}
              </div>
            )}

            {/* حالة المواقع */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>
                  📍 المواقع — اليوم
                </span>
                {todaySiteReports.length>0&&(
                  <button onClick={()=>printReport("sites")} style={{
                    background:"#F1F5F9",border:"none",borderRadius:7,
                    padding:"5px 12px",cursor:"pointer",
                    fontFamily:"Tahoma",color:"#475569",fontSize:11}}>
                    🖨️ طباعة الكل
                  </button>
                )}
              </div>
              {foremans.length===0?(
                <div style={{background:"#F8FAFC",borderRadius:12,padding:24,
                  textAlign:"center",border:"2px dashed #E2E8F0"}}>
                  <div style={{fontSize:36,marginBottom:10}}>👷</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:6}}>
                    ابدأ بإضافة الفريق
                  </div>
                  <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>
                    اذهب لتبويب 👷 الفريق → أضف فورمن معمل وفورمن لكل موقع
                  </div>
                  <button onClick={()=>setTab("team")} style={{
                    border:"none",borderRadius:10,padding:"10px 24px",
                    cursor:"pointer",fontFamily:"Tahoma",fontSize:13,fontWeight:700,
                    background:"#0F172A",color:"#fff"}}>
                    + إضافة الفريق الآن
                  </button>
                </div>
              ):siteForemans.length===0?(
                <div style={{textAlign:"center",padding:"20px 0",color:"#94A3B8",fontSize:12}}>
                  ما في مواقع مضافة — أضف فورمن موقع من تبويب الفريق
                </div>
              ):siteForemans.map(f=>{
                const rep=todaySiteReports.find(r=>r.projectId===f.projectId);
                return (
                  <div key={f.id} style={{borderRadius:12,padding:"14px 16px",
                    marginBottom:10,border:"1px solid #E2E8F0",
                    borderRight:"5px solid "+(rep?"#16A34A":"#94A3B8")}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",marginBottom:rep?10:0}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>
                          {f.projectName||"موقع "+f.name}
                        </div>
                        <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                          👷 {f.name}
                          {rep&&<span style={{marginRight:8}}>
                            · رُفع {rep.submittedAt?.slice(11,16)}
                          </span>}
                        </div>
                      </div>
                      {rep?(
                        <div style={{textAlign:"left"}}>
                          {rep.officialProgress!=null?(
                            <div style={{fontSize:20,fontWeight:800,color:"#16A34A"}}>
                              {rep.officialProgress}%
                              <div style={{fontSize:9,color:"#94A3B8",fontWeight:400}}>رسمي</div>
                            </div>
                          ):(
                            <div>
                              <div style={{fontSize:16,fontWeight:700,color:"#D97706"}}>
                                {rep.progress}%
                              </div>
                              <div style={{fontSize:9,color:"#D97706"}}>مقترح</div>
                              <button onClick={()=>approveProgress(rep.id,rep.progress)}
                                style={{background:"#2563EB",border:"none",
                                  borderRadius:6,padding:"3px 8px",cursor:"pointer",
                                  fontFamily:"Tahoma",color:"#fff",fontSize:9,marginTop:3}}>
                                ✅ اعتمد
                              </button>
                            </div>
                          )}
                          <div style={{fontSize:10,color:"#64748B",marginTop:4}}>
                            {rep.workers} عامل
                          </div>
                        </div>
                      ):(
                        <span style={{fontSize:11,color:"#94A3B8",
                          background:"#F1F5F9",borderRadius:20,
                          padding:"4px 12px"}}>
                          ⏳ لم يُرفع
                        </span>
                      )}
                    </div>
                    {rep&&(
                      <div style={{background:"#F8FAFC",borderRadius:8,
                        padding:"8px 12px",fontSize:12,color:"#475569"}}>
                        {rep.tasks}
                        {rep.note&&<div style={{color:"#94A3B8",
                          marginTop:4,fontSize:11}}>📝 {rep.note}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── خطة الغد ─── */}
        {tab==="plan"&&(
          <div>
            {/* تبويبا معمل / مواقع خارجية */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
              gap:8,marginBottom:16}}>
              {[
                {id:"factory",label:t.plan_factory},
                {id:"sites",  label:t.plan_sites},
              ].map(sub=>(
                <button key={sub.id} onClick={()=>setPlanSubTab(sub.id)} style={{
                  border:"none",borderRadius:12,padding:"13px",cursor:"pointer",
                  fontFamily:t.fontFamily,fontSize:13,fontWeight:700,
                  background:planSubTab===sub.id?"#0F172A":"#fff",
                  color:planSubTab===sub.id?"#fff":"#64748B",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  {sub.label}
                </button>
              ))}
            </div>

            {/* خطة المعمل */}
            {selPlanner==="factory"&&(
              <div style={{background:"#fff",borderRadius:14,padding:20,
                border:"1px solid #E2E8F0"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>
                    🏭 خطة المعمل — {TOMORROW}
                  </div>
                  {factPlans.find(p=>p.date===TOMORROW)&&(
                    <button onClick={()=>deletePlan(
                      factPlans.find(p=>p.date===TOMORROW).id,"factory")}
                      style={{background:"#FFF1F2",border:"none",borderRadius:7,
                        padding:"5px 10px",cursor:"pointer",fontSize:11,
                        color:"#DC2626",fontFamily:"Tahoma"}}>
                      🗑️ حذف الخطة
                    </button>
                  )}
                </div>
                {planTasks.map((t,i)=>(
                  <div key={i} style={{background:"#F8FAFC",borderRadius:12,
                    padding:14,marginBottom:10,border:"1px solid #E2E8F0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",marginBottom:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#475569"}}>
                        مهمة {i+1}
                      </span>
                      {planTasks.length>1&&(
                        <button onClick={()=>setPlanTasks(p=>p.filter((_,ii)=>ii!==i))}
                          style={{background:"none",border:"none",cursor:"pointer",
                            color:"#DC2626",fontSize:16}}>✕</button>
                      )}
                    </div>
                    <input placeholder="وصف المهمة..."
                      value={t.desc}
                      onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                        ii===i?{...tt,desc:e.target.value}:tt))}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px 13px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",marginBottom:8}}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                      <input placeholder="الكمية (مثال: 5 قطع)"
                        value={t.qty}
                        onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                          ii===i?{...tt,qty:e.target.value}:tt))}
                        style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                          padding:"9px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                          direction:"rtl",boxSizing:"border-box"}}/>
                      <input placeholder="المادة (مثال: خشب جوز)"
                        value={t.material||""}
                        onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                          ii===i?{...tt,material:e.target.value}:tt))}
                        style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                          padding:"9px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                          direction:"rtl",boxSizing:"border-box"}}/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <input placeholder="المسؤول (مثال: استاذ كاظم)"
                        value={t.responsible||""}
                        onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                          ii===i?{...tt,responsible:e.target.value}:tt))}
                        style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                          padding:"9px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                          direction:"rtl",boxSizing:"border-box"}}/>
                      <input placeholder="ملاحظة للفورمن"
                        value={t.note}
                        onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                          ii===i?{...tt,note:e.target.value}:tt))}
                        style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                          padding:"9px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                          direction:"rtl",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                ))}
                <button onClick={()=>setPlanTasks(p=>[...p,{desc:"",qty:"",note:""}])}
                  style={{width:"100%",border:"2px dashed #CBD5E1",borderRadius:10,
                    padding:"10px",fontSize:12,fontFamily:"Tahoma",cursor:"pointer",
                    background:"transparent",color:"#64748B",marginBottom:12}}>
                  + إضافة مهمة
                </button>
                <input placeholder="ملاحظة عامة للفورمن..."
                  value={planNote} onChange={e=>setPlanNote(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 13px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",marginBottom:14}}/>
                {planSaved?(
                  <div style={{background:"#F0FDF4",border:"2px solid #16A34A",
                    borderRadius:12,padding:14,textAlign:"center"}}>
                    <div style={{fontSize:24}}>✅</div>
                    <div style={{fontWeight:700,color:"#16A34A",fontSize:14}}>
                      تم حفظ خطة المعمل ليوم الغد
                    </div>
                  </div>
                ):(
                  <button onClick={savePlan}
                    disabled={!planTasks.some(t=>t.desc.trim())}
                    style={{width:"100%",border:"none",borderRadius:12,padding:"14px",
                      fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                      background:planTasks.some(t=>t.desc.trim())?"#0F172A":"#E2E8F0",
                      color:planTasks.some(t=>t.desc.trim())?"#fff":"#94A3B8"}}>
                    💾 حفظ خطة المعمل — {TOMORROW}
                  </button>
                )}
              </div>
            )}

            {/* ─ مواقع خارجية ─ */}
            {planSubTab==="sites"&&(
              <div style={{background:"#fff",borderRadius:14,padding:16,
                border:"1px solid #E2E8F0",marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:10}}>
                  {t.plan_sites_sel}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                  {siteForemans.map(f=>(
                    <button key={f.id} onClick={()=>setSelPlanner(f.id)} style={{
                      border:"2px solid "+(selPlanner===f.id?"#2563EB":"#E2E8F0"),
                      borderRadius:10,padding:"9px 16px",cursor:"pointer",
                      fontFamily:t.fontFamily,fontSize:12,fontWeight:700,
                      background:selPlanner===f.id?"#2563EB":"#fff",
                      color:selPlanner===f.id?"#fff":"#64748B"}}>
                      📍 {f.name}
                    </button>
                  ))}
                  {siteForemans.length===0&&(
                    <div style={{fontSize:12,color:"#94A3B8"}}>
                      ما في فورمن مواقع — أضف من تبويب الفريق
                    </div>
                  )}
                </div>
              </div>
            )}
            {planSubTab==="sites"&&selPlanner!=="factory"&&(()=>{
              const selF=foremans.find(f=>f.id===selPlanner);
              if(!selF) return null;
              return (
                <div style={{background:"#fff",borderRadius:14,padding:20,
                  border:"1px solid #E2E8F0"}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:4}}>
                    📍 مهام {selF.name} — {TOMORROW}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                    gap:8,marginBottom:10}}>
                    <div>
                      <div style={{fontSize:11,color:"#2563EB",fontWeight:700,marginBottom:4}}>
                        📍 المنطقة
                      </div>
                      <input placeholder="مثال: الطابق 2 — غرفة 5"
                        value={siteArea}
                        onChange={e=>setSiteArea(e.target.value)}
                        style={{width:"100%",border:"1.5px solid #DBEAFE",borderRadius:9,
                          padding:"9px 12px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                          direction:"rtl",boxSizing:"border-box"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#16A34A",fontWeight:700,marginBottom:4}}>
                        🎯 الهدف
                      </div>
                      <input placeholder="مثال: إنجاز السقف كاملاً"
                        value={siteGoal}
                        onChange={e=>setSiteGoal(e.target.value)}
                        style={{width:"100%",border:"1.5px solid #DCFCE7",borderRadius:9,
                          padding:"9px 12px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                          direction:"rtl",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:4}}>
                      🔨 الأعمال المطلوبة (كل سطر = عمل)
                    </div>
                    <textarea value={sitePlanText}
                      onChange={e=>setSitePlanText(e.target.value)}
                      placeholder="مثال: تركيب سقف جبس / دهان الجدران / تركيب إضاءة"
                      rows={4}
                      style={{width:"100%",border:"1.5px solid #CBD5E1",borderRadius:10,
                        padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",resize:"none"}}/>
                  </div>
                  <input placeholder="ملاحظة توجيهية للفورمن..."
                    value={sitePlanNote}
                    onChange={e=>setSitePlanNote(e.target.value)}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"9px 13px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",marginBottom:12}}/>
                  {sitePlanSaved?(
                    <div style={{background:"#F0FDF4",border:"2px solid #16A34A",
                      borderRadius:12,padding:14,textAlign:"center"}}>
                      <div style={{fontSize:24}}>✅</div>
                      <div style={{fontWeight:700,color:"#16A34A",fontSize:14}}>
                        تم حفظ خطة {selF.name}
                      </div>
                    </div>
                  ):(
                    <button onClick={saveSitePlan}
                      disabled={!sitePlanText.trim()}
                      style={{width:"100%",border:"none",borderRadius:12,padding:"14px",
                        fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                        background:sitePlanText.trim()?"#2563EB":"#E2E8F0",
                        color:sitePlanText.trim()?"#fff":"#94A3B8"}}>
                      💾 حفظ خطة {selF.name} — {TOMORROW}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── التقارير ─── */}
        {tab==="reports"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
              gap:10,marginBottom:14}}>
              {[
                {l:"🖨️ طباعة تقرير المعمل",fn:"factory"},
                {l:"🖨️ طباعة تقارير المواقع",fn:"sites"},
                {l:"🖨️ طباعة التقرير الشامل",fn:"all"},
              ].map(b=>(
                <button key={b.fn} onClick={()=>printReport(b.fn)} style={{
                  border:"none",borderRadius:10,padding:"12px",cursor:"pointer",
                  fontFamily:"Tahoma",fontSize:12,fontWeight:700,
                  background:"#0F172A",color:"#fff"}}>
                  {b.l}
                </button>
              ))}
            </div>

            {/* سجل تقارير المعمل */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:12}}>
                🏭 سجل تقارير المعمل
              </div>
              {factReports.slice(0,7).map(r=>(
                <div key={r.id} style={{borderRadius:10,padding:12,
                  marginBottom:8,border:"1px solid "+(r.date===TODAY?"#16A34A30":"#E2E8F0"),
                  background:r.date===TODAY?"#F0FDF4":"#F8FAFC"}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:12,fontWeight:700,
                      color:r.date===TODAY?"#16A34A":"#64748B"}}>
                      {r.date===TODAY?"⭐ اليوم":r.date}
                    </span>
                    <span style={{fontSize:10,color:"#64748B"}}>
                      {r.foremanName} · {r.submittedAt?.slice(11,16)}
                    </span>
                  </div>
                  {(r.tasks||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      fontSize:11,padding:"4px 0",
                      borderBottom:"1px solid #F1F5F9"}}>
                      <span>{t.desc}</span>
                      <span style={{color:STATUS_C[t.status]||"#64748B",
                        fontWeight:700}}>{t.status}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* سجل تقارير المواقع */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:12}}>
                📍 سجل تقارير المواقع
              </div>
              {siteReports.slice(0,7).map(r=>(
                <div key={r.id} style={{borderRadius:10,padding:12,
                  marginBottom:8,border:"1px solid "+(r.date===TODAY?"#2563EB30":"#E2E8F0"),
                  background:r.date===TODAY?"#EFF6FF":"#F8FAFC"}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"start",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#1E293B"}}>
                        {r.projectName}
                      </div>
                      <div style={{fontSize:10,color:"#64748B"}}>
                        {r.date} · {r.foremanName} · {r.workers} عامل
                      </div>
                    </div>
                    <span style={{fontSize:18,fontWeight:800,color:"#2563EB"}}>
                      {r.progress}%
                    </span>
                  </div>
                  <div style={{fontSize:11,color:"#475569"}}>{r.tasks}</div>
                </div>
              ))}
            </div>

            {/* ─── سجل حالة المعمل اليومي ─── */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:14}}>
                <span style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>
                  🏭 سجل حالة المعمل اليومي
                </span>
                <button onClick={()=>{
                  const now=new Date();
                  const mon=now.toISOString().slice(0,7);
                  const monthRecs=factStatus.filter(r=>r.date.startsWith(mon));
                  const totalGen1=monthRecs.reduce((s,r)=>s+Number(r.gen1Hours||0),0);
                  const totalGen2=monthRecs.reduce((s,r)=>s+Number(r.gen2Hours||0),0);
                  const totalElec=monthRecs.reduce((s,r)=>s+Number(r.elecHours||0),0);
                  const lastGen1Total=monthRecs.length?monthRecs[0].gen1Total||0:0;
                  const lastGen2Total=monthRecs.length?monthRecs[0].gen2Total||0:0;
                  const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:24px;direction:rtl}
h2{color:#0F172A;border-bottom:2px solid #0F172A;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px}
th{background:#0F172A;color:#fff;padding:7px 8px;text-align:center}
td{padding:7px 8px;border-bottom:1px solid #F1F5F9;text-align:center}
.sum{background:#F8FAFC;font-weight:700}
</style></head><body>
<div style="text-align:center;border-bottom:2px solid #0F172A;padding-bottom:10px;margin-bottom:14px">
  <div style="font-size:20px;font-weight:700">شركة باب المشاريع</div>
  <div style="font-size:12px;color:#64748B">جرد معمل الديكور — ${mon}</div>
</div>
<h2>ملخص الشهر</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:12px 0">
  <div style="background:#FFF7ED;border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:10px;color:#64748B">مجموع ساعات مولد ١</div>
    <div style="font-size:22px;font-weight:700;color:#F97316">${totalGen1} ساعة</div>
  </div>
  <div style="background:#F5F3FF;border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:10px;color:#64748B">مجموع ساعات مولد ٢</div>
    <div style="font-size:22px;font-weight:700;color:#8B5CF6">${totalGen2} ساعة</div>
  </div>
  <div style="background:#EFF6FF;border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:10px;color:#64748B">مجموع ساعات الكهرباء</div>
    <div style="font-size:22px;font-weight:700;color:#2563EB">${totalElec} ساعة</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
  <div style="background:#FFF7ED;border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:10px;color:#64748B">الساعات الكلية مولد ١</div>
    <div style="font-size:18px;font-weight:700;color:#F97316">${lastGen1Total} ساعة</div>
  </div>
  <div style="background:#F5F3FF;border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:10px;color:#64748B">الساعات الكلية مولد ٢</div>
    <div style="font-size:18px;font-weight:700;color:#8B5CF6">${lastGen2Total} ساعة</div>
  </div>
</div>
<h2>السجل اليومي</h2>
<table>
<thead><tr>
  <th>التاريخ</th><th>المكائن</th><th>وقود</th><th>ماء</th>
  <th>مولد١</th><th>مولد٢</th><th>كهرباء</th>
  <th>مولد١ كلي</th><th>مولد٢ كلي</th>
</tr></thead>
<tbody>
${monthRecs.map(r=>`<tr>
  <td>${r.date}</td>
  <td style="color:${r.machineStatus==="جيدة"?"green":r.machineStatus==="تحتاج صيانة"?"orange":"red"}">${r.machineStatus}</td>
  <td>${r.fuel||0}L</td><td>${r.water||0}L</td>
  <td>${r.gen1Hours||0}س</td><td>${r.gen2Hours||0}س</td><td>${r.elecHours||0}س</td>
  <td>${r.gen1Total||0}س</td><td>${r.gen2Total||0}س</td>
</tr>`).join("")}
<tr class="sum">
  <td>المجموع</td><td>—</td><td>—</td><td>—</td>
  <td>${totalGen1}س</td><td>${totalGen2}س</td><td>${totalElec}س</td>
  <td colspan="2">—</td>
</tr>
</tbody></table>
<div style="margin-top:12px;font-size:10px;color:#94A3B8;text-align:center">
  طُبع: ${new Date().toISOString().slice(0,16).replace("T"," ")}
</div>
</body></html>`;
                  const w=window.open("","_blank","width=900,height=700");
                  if(!w){alert("السماح بالنوافذ");return;}
                  w.document.write(html);w.document.close();
                  w.focus();setTimeout(()=>w.print(),700);
                }} style={{background:"#0F172A",border:"none",borderRadius:8,
                  padding:"7px 14px",cursor:"pointer",fontFamily:"Tahoma",
                  color:"#fff",fontSize:11}}>
                  🖨️ جرد الشهر
                </button>
              </div>

              {/* جدول السجل */}
              {factStatus.length===0?(
                <div style={{textAlign:"center",padding:"20px 0",color:"#94A3B8",fontSize:12}}>
                  ما في سجلات بعد
                </div>
              ):(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead>
                      <tr style={{background:"#0F172A"}}>
                        {["التاريخ","المكائن","وقود","ماء","م١","م٢","كهرباء","م١ كلي","م٢ كلي"].map(h=>(
                          <th key={h} style={{color:"#fff",padding:"7px 8px",
                            textAlign:"center",fontFamily:"Tahoma",fontWeight:600}}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {factStatus.slice(0,31).map((r,i)=>(
                        <tr key={r.id} style={{background:i%2===0?"#fff":"#F8FAFC",
                          borderBottom:"1px solid #F1F5F9"}}>
                          <td style={{padding:"7px 8px",textAlign:"center",
                            fontWeight:r.date===TODAY?700:400,
                            color:r.date===TODAY?"#2563EB":"#1E293B"}}>
                            {r.date}
                          </td>
                          <td style={{padding:"7px 8px",textAlign:"center",
                            color:r.machineStatus==="جيدة"?"#16A34A"
                              :r.machineStatus==="تحتاج صيانة"?"#D97706":"#DC2626",
                            fontWeight:700,fontSize:12}}>
                            {r.machineStatus==="جيدة"?"✅":
                             r.machineStatus==="تحتاج صيانة"?"⚠️":"❌"}
                          </td>
                          {[r.fuel,r.water,r.gen1Hours,r.gen2Hours,r.elecHours,
                            r.gen1Total,r.gen2Total].map((v,vi)=>(
                            <td key={vi} style={{padding:"7px 8px",textAlign:"center",
                              color:"#475569"}}>
                              {v||"—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── الفريق ─── */}
        {tab==="team"&&(
          <div>
            <button onClick={()=>setShowAdd(v=>!v)} style={{
              width:"100%",border:"none",borderRadius:12,padding:"13px",
              fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
              background:showAdd?"#475569":"#0F172A",
              color:"#fff",marginBottom:14}}>
              {showAdd?"✕ إلغاء":"+ إضافة فورمن"}
            </button>

            {showAdd&&(
              <div style={{background:"#fff",borderRadius:14,padding:20,
                border:"1px solid #E2E8F0",marginBottom:14}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                  gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>الاسم</div>
                    <input value={fForm.name} onChange={e=>ff("name")(e.target.value)}
                      placeholder="اسم الفورمن"
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px 13px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>PIN</div>
                    <input value={fForm.pin} onChange={e=>ff("pin")(e.target.value)}
                      placeholder="1234"
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                        textAlign:"center",boxSizing:"border-box"}}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                  gap:8,marginBottom:12}}>
                  {["معمل","موقع"].map(t=>(
                    <button key={t} onClick={()=>ff("type")(t)} style={{
                      border:"2px solid "+(fForm.type===t?"#0F172A":"#E2E8F0"),
                      borderRadius:9,padding:"10px",cursor:"pointer",
                      fontFamily:"Tahoma",fontSize:13,fontWeight:700,
                      background:fForm.type===t?"#0F172A":"#fff",
                      color:fForm.type===t?"#fff":"#64748B"}}>
                      {t==="معمل"?"🏭 معمل":"📍 موقع"}
                    </button>
                  ))}
                </div>
                {fForm.type==="موقع"&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>الموقع</div>
                    <select value={fForm.projectId}
                      onChange={e=>{
                        const p=activeProjects.find(p=>p.id===e.target.value);
                        ff("projectId")(e.target.value);
                        ff("projectName")(p?.name||"");
                      }}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",appearance:"none"}}>
                      <option value="">— اختر المشروع —</option>
                      {activeProjects.map(p=>(
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button onClick={addForeman}
                  disabled={!fForm.name.trim()||!fForm.pin||
                    (fForm.type==="موقع"&&!fForm.projectId)}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
                    fontSize:13,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:"#16A34A",color:"#fff"}}>
                  ✅ إضافة الفورمن
                </button>
              </div>
            )}

            {/* قائمة الفريق */}
            {foremans.length===0?(
              <div style={{background:"#fff",borderRadius:14,padding:30,
                textAlign:"center",color:"#94A3B8",border:"1px solid #E2E8F0"}}>
                <div style={{fontSize:40,marginBottom:8}}>👷</div>
                <div>ما في فورمن مسجّل — أضف فورمن من الأعلى</div>
              </div>
            ):foremans.map(f=>{
              const rep=f.type==="معمل"
                ?factReports.find(r=>r.date===TODAY)
                :siteReports.find(r=>r.projectId===f.projectId&&r.date===TODAY);
              return (
                <div key={f.id} style={{background:"#fff",borderRadius:12,
                  padding:"14px 16px",marginBottom:8,
                  border:"1px solid #E2E8F0",
                  borderRight:"5px solid "+(rep?"#16A34A":"#94A3B8"),
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>
                      {f.type==="معمل"?"🏭":"📍"} {f.name}
                    </div>
                    <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                      {f.type==="موقع"?f.projectName:f.type}
                      {" · "}
                      <span style={{color:rep?"#16A34A":"#94A3B8",fontWeight:600}}>
                        {rep?"✅ رفع التقرير":"⏳ لم يرفع"}
                      </span>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{background:"#F1F5F9",borderRadius:8,
                      padding:"6px 14px",fontSize:14,fontWeight:700,
                      color:"#475569",letterSpacing:3}}>
                      {f.pin}
                    </div>
                    <button onClick={()=>deleteForeman(f.id)} style={{
                      background:"#FFF1F2",border:"none",borderRadius:7,
                      padding:"6px 10px",cursor:"pointer",fontSize:14,
                      color:"#DC2626"}}>✕</button>
                  </div>
                </div>
              );
            })}

            {/* رابط الفورمن */}
            {foremans.length>0&&(
              <div style={{background:"#0F172A",borderRadius:12,
                padding:"14px 16px",marginTop:14}}>
                <div style={{fontSize:11,color:"#475569",marginBottom:6}}>
                  🔗 رابط بوابة الفورمن
                </div>
                <div style={{fontSize:13,color:"#60A5FA",fontWeight:600,
                  direction:"ltr",textAlign:"left",
                  wordBreak:"break-all"}}>
                  {window.location.origin}?foreman=1
                </div>
                <div style={{fontSize:10,color:"#334155",marginTop:6}}>
                  أرسل هذا الرابط لكل الفورمن — يدخلون باسمهم + PIN
                </div>
              </div>
            )}
          </div>
        )}

        {/* مودال تعديل المهمة */}
        {editPlanIdx!==null&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
            zIndex:200,display:"flex",alignItems:"center",
            justifyContent:"center",padding:20}}>
            <div style={{background:"#fff",borderRadius:16,padding:24,
              width:"100%",maxWidth:420,direction:"rtl"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1E293B",marginBottom:14}}>
                ✏️ تعديل المهمة
              </div>
              <input value={editPlanText}
                onChange={e=>setEditPlanText(e.target.value)}
                style={{width:"100%",border:"1.5px solid #CBD5E1",borderRadius:10,
                  padding:"12px 14px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",marginBottom:14}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button onClick={()=>{setEditPlanIdx(null);setEditPlanText("");}}
                  style={{border:"1px solid #E2E8F0",borderRadius:10,padding:"11px",
                    cursor:"pointer",fontFamily:"Tahoma",fontSize:13,
                    background:"#fff",color:"#64748B"}}>
                  إلغاء
                </button>
                <button onClick={()=>{
                  if(editPlanIdx&&editPlanIdx.plan){
                    saveEditPlanTask(editPlanIdx.plan,editPlanIdx.idx,editPlanIdx.type);
                  }
                }}
                  style={{border:"none",borderRadius:10,padding:"11px",
                    cursor:"pointer",fontFamily:"Tahoma",fontSize:13,fontWeight:700,
                    background:"#2563EB",color:"#fff"}}>
                  💾 حفظ التعديل
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
