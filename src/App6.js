import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  doc, setDoc, query, where, orderBy, getDocs } from "firebase/firestore";

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

const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now()+86400000).toISOString().split("T")[0];

// ─── نظام الفورمن الرئيسي ────────────────────────────
export function ForemanSystem({ onBack }) {
  const [foreman, setForeman] = useState(null); // الفورمن المسجّل دخوله
  const [name,    setName]    = useState("");
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState("");
  const [foremans,setForemans]= useState([]);

  useEffect(()=>{
    return onSnapshot(collection(db,"foremans"),
      snap=>setForemans(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);

  const login = () => {
    setError("");
    const found = foremans.find(f=>
      f.name.trim()===name.trim() && String(f.pin)===String(pin)
    );
    if(!found){ setError("❌ الاسم أو الـ PIN غلط"); return; }
    setForeman(found);
  };

  if(!foreman) return (
    <div style={{minHeight:"100vh",background:"#0F172A",
      fontFamily:"Tahoma",direction:"rtl",
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#1E293B",borderRadius:20,padding:32,
        width:"100%",maxWidth:360,boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:8}}>👷</div>
          <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>
            بوابة الفورمن
          </div>
          <div style={{fontSize:12,color:"#475569"}}>
            شركة باب المشاريع — قسم الديكور
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:6}}>الاسم</div>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="أدخل اسمك..."
            style={{width:"100%",background:"#0F172A",border:"1px solid #334155",
              borderRadius:10,padding:"12px 14px",fontSize:14,outline:"none",
              fontFamily:"Tahoma",direction:"rtl",boxSizing:"border-box",color:"#fff"}}/>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:6}}>
            رمز الدخول (PIN)
          </div>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)}
            placeholder="••••"
            onKeyDown={e=>e.key==="Enter"&&login()}
            style={{width:"100%",background:"#0F172A",border:"1px solid #334155",
              borderRadius:10,padding:"12px 14px",fontSize:18,outline:"none",
              fontFamily:"Tahoma",textAlign:"center",boxSizing:"border-box",
              color:"#fff",letterSpacing:4}}/>
        </div>

        {error&&<div style={{color:"#F87171",fontSize:12,
          textAlign:"center",marginBottom:12}}>{error}</div>}

        <button onClick={login} style={{width:"100%",border:"none",
          borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,
          fontFamily:"Tahoma",cursor:"pointer",
          background:"linear-gradient(135deg,#2563EB,#3B82F6)",color:"#fff"}}>
          دخول ←
        </button>

        {onBack && (
          <button onClick={onBack} style={{width:"100%",border:"none",
            borderRadius:10,padding:"10px",fontSize:12,
            fontFamily:"Tahoma",cursor:"pointer",
            background:"transparent",color:"#475569",marginTop:10}}>
            ← رجوع
          </button>
        )}
      </div>
    </div>
  );

  // بعد الدخول
  if(foreman.type==="معمل")
    return <FactoryForeman foreman={foreman} onLogout={()=>{setForeman(null);setPin("");setName("");}} />;
  else
    return <SiteForeman foreman={foreman} onLogout={()=>{setForeman(null);setPin("");setName("");}} />;
}

// ─── فورمن المعمل ────────────────────────────────────
function FactoryForeman({ foreman, onLogout }) {
  const [plan,      setPlan]      = useState(null);
  const [planTomorrow, setPlanTomorrow] = useState(null);
  const [report, setReport] = useState(null);
  const [taskStatuses, setTaskStatuses] = useState({});
  const [taskNotes,    setTaskNotes]    = useState({});
  const [genNote,      setGenNote]      = useState("");
  const [submitted,    setSubmitted]    = useState(false);
  const [saving,       setSaving]       = useState(false);

  // خطة اليوم
  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,"factory_plans"), where("date","==",TODAY)),
      snap=>{
        const plans = snap.docs.map(d=>({id:d.id,...d.data()}));
        setPlan(plans[0]||null);
      }
    );
    return unsub;
  },[]);

  // خطة الغد
  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,"factory_plans"), where("date","==",TOMORROW)),
      snap=>{
        const plans = snap.docs.map(d=>({id:d.id,...d.data()}));
        setPlanTomorrow(plans[0]||null);
      }
    );
    return unsub;
  },[]);

  // تقرير اليوم (موجود؟)
  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,"factory_reports"), where("date","==",TODAY)),
      snap=>{
        const reps = snap.docs.map(d=>({id:d.id,...d.data()}));
        setReport(reps[0]||null);
      }
    );
    return unsub;
  },[]);

  const submitReport = async () => {
    setSaving(true);
    const tasks = (plan?.tasks||[]).map((t,i)=>({
      desc: t.desc,
      status: taskStatuses[i]||"لم ينجز",
      note: taskNotes[i]||""
    }));
    await setDoc(doc(db,"factory_reports",TODAY),{
      date:TODAY, foremanId:foreman.id,
      foremanName:foreman.name, tasks,
      note:genNote, submittedAt:new Date().toISOString()
    });
    setSubmitted(true); setSaving(false);
  };

  const now = new Date().toLocaleTimeString("ar-IQ");
  const STATUS_OPTS = [
    {v:"منجز",    c:"#16A34A", bg:"#F0FDF4", icon:"✅"},
    {v:"جزئي",   c:"#D97706", bg:"#FFFBEB", icon:"⚠️"},
    {v:"لم ينجز",c:"#DC2626", bg:"#FFF1F2", icon:"❌"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",
      fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"16px"}}>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#0F172A,#1E293B)",
          borderRadius:16,padding:"16px 20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>
                🏭 معمل الديكور
              </div>
              <div style={{fontSize:11,color:"#475569",marginTop:2}}>
                👷 {foreman.name} · {TODAY} · {now}
              </div>
            </div>
            <button onClick={onLogout} style={{background:"#334155",
              border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",
              fontFamily:"Tahoma",color:"#94A3B8",fontSize:11}}>
              خروج
            </button>
          </div>
        </div>

        {/* خطة اليوم */}
        <div style={{background:"#fff",borderRadius:14,padding:18,
          border:"1px solid #E2E8F0",marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
            📋 خطة اليوم
          </div>
          {!plan ? (
            <div style={{color:"#94A3B8",textAlign:"center",padding:20}}>
              <div style={{fontSize:32,marginBottom:8}}>📭</div>
              ما في خطة محددة لليوم
            </div>
          ) : (
            <div>
              {plan.note&&(
                <div style={{background:"#F0F9FF",borderRadius:10,
                  padding:"10px 14px",fontSize:12,color:"#0284C7",
                  marginBottom:12}}>
                  💬 {plan.note}
                </div>
              )}
              {(plan.tasks||[]).map((t,i)=>(
                <div key={i} style={{borderRadius:10,padding:"12px 14px",
                  marginBottom:8,border:"1px solid #E2E8F0",
                  background:"#F8FAFC"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#1E293B",marginBottom:6}}>
                    {i+1}. {t.desc}
                    {t.qty&&<span style={{color:"#64748B",fontWeight:400}}> — {t.qty}</span>}
                  </div>
                  {t.note&&<div style={{fontSize:11,color:"#64748B",marginBottom:6}}>
                    📌 {t.note}
                  </div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* خطة الغد */}
        {planTomorrow && (
          <div style={{background:"#fff",borderRadius:14,padding:18,
            border:"2px solid #2563EB",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <div style={{background:"#2563EB",borderRadius:8,
                padding:"6px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>
                📅 خطة الغد — {TOMORROW}
              </div>
            </div>
            {planTomorrow.note&&(
              <div style={{background:"#EFF6FF",borderRadius:10,
                padding:"10px 14px",fontSize:12,color:"#1D4ED8",
                marginBottom:12,fontWeight:600}}>
                💬 {planTomorrow.note}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(planTomorrow.tasks||[]).map((t,i)=>(
                <div key={i} style={{borderRadius:10,padding:"12px 14px",
                  background:"#F8FAFC",border:"1px solid #DBEAFE",
                  borderRight:"4px solid #2563EB"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:4}}>
                    {i+1}. {t.desc}
                    {t.qty&&<span style={{color:"#64748B",fontWeight:400,fontSize:12}}>
                      {" — "}{t.qty}
                    </span>}
                  </div>
                  {t.note&&(
                    <div style={{fontSize:11,color:"#64748B"}}>
                      📌 {t.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تقرير نهاية اليوم */}
        <div style={{background:"#fff",borderRadius:14,padding:18,
          border:"1px solid #E2E8F0",marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
            📊 تقرير نهاية اليوم
          </div>

          {report ? (
            <div style={{background:"#F0FDF4",borderRadius:12,padding:16,
              border:"2px solid #16A34A",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:15,fontWeight:700,color:"#16A34A"}}>
                تم رفع التقرير
              </div>
              <div style={{fontSize:11,color:"#64748B",marginTop:4}}>
                {report.submittedAt?.slice(0,16).replace("T"," ")}
              </div>
              <div style={{marginTop:12}}>
                {(report.tasks||[]).map((t,i)=>{
                  const s=STATUS_OPTS.find(o=>o.v===t.status)||STATUS_OPTS[2];
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      padding:"6px 0",borderBottom:"1px solid #DCFCE7",fontSize:12}}>
                      <span>{t.desc}</span>
                      <span style={{color:s.c,fontWeight:700}}>{s.icon} {t.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : submitted ? (
            <div style={{background:"#F0FDF4",borderRadius:12,padding:16,
              textAlign:"center"}}>
              <div style={{fontSize:32}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>
                تم رفع التقرير بنجاح
              </div>
            </div>
          ) : !plan ? (
            <div style={{color:"#94A3B8",textAlign:"center",fontSize:12,padding:12}}>
              لا يمكن رفع التقرير — ما في خطة لليوم
            </div>
          ) : (
            <div>
              {(plan.tasks||[]).map((t,i)=>(
                <div key={i} style={{borderRadius:12,padding:14,
                  marginBottom:10,border:"1px solid #E2E8F0"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#1E293B",marginBottom:10}}>
                    {i+1}. {t.desc}
                  </div>
                  {/* أزرار الحالة */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
                    gap:6,marginBottom:8}}>
                    {STATUS_OPTS.map(s=>(
                      <button key={s.v} onClick={()=>setTaskStatuses(p=>({...p,[i]:s.v}))}
                        style={{border:"2px solid "+(taskStatuses[i]===s.v?s.c:"#E2E8F0"),
                          borderRadius:8,padding:"8px 4px",cursor:"pointer",
                          fontFamily:"Tahoma",fontSize:11,fontWeight:700,
                          background:taskStatuses[i]===s.v?s.bg:"#fff",
                          color:taskStatuses[i]===s.v?s.c:"#94A3B8"}}>
                        {s.icon} {s.v}
                      </button>
                    ))}
                  </div>
                  {/* ملاحظة */}
                  <input placeholder="ملاحظة (اختياري)..."
                    value={taskNotes[i]||""}
                    onChange={e=>setTaskNotes(p=>({...p,[i]:e.target.value}))}
                    style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:8,
                      padding:"8px 12px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                </div>
              ))}

              {/* ملاحظة عامة */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                  ملاحظة عامة
                </div>
                <textarea value={genNote} onChange={e=>setGenNote(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  rows={3}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:10,
                    padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",resize:"none"}}/>
              </div>

              <button onClick={submitReport} disabled={saving} style={{
                width:"100%",border:"none",borderRadius:12,padding:"14px",
                fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                background:saving?"#E2E8F0":"#16A34A",color:saving?"#94A3B8":"#fff"}}>
                {saving?"⏳ جاري الرفع...":"📤 رفع تقرير نهاية اليوم"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── فورمن الموقع ────────────────────────────────────
function SiteForeman({ foreman, onLogout }) {
  const [report,    setReport]    = useState(null);
  const [sitePlanTomorrow, setSitePlanTomorrow] = useState(null);
  const [workers,   setWorkers]   = useState("");
  const [progress,  setProgress]  = useState("");
  const [tasks,     setTasks]     = useState("");
  const [note,      setNote]      = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [history,   setHistory]   = useState([]);

  // خطة الغد للموقع
  useEffect(()=>{
    if(!foreman.projectId) return;
    const unsub = onSnapshot(
      query(collection(db,"site_plans"),
        where("projectId","==",foreman.projectId),
        where("date","==",TOMORROW)),
      snap=>{
        const list=snap.docs.map(d=>({id:d.id,...d.data()}));
        setSitePlanTomorrow(list[0]||null);
      }
    );
    return unsub;
  },[foreman.projectId]);

  // تقارير سابقة لهذا الموقع
  useEffect(()=>{
    if(!foreman.projectId) return;
    const unsub = onSnapshot(
      query(collection(db,"site_reports"),
        where("projectId","==",foreman.projectId)),
      snap=>{
        const list=snap.docs.map(d=>({id:d.id,...d.data()}))
          .sort((a,b)=>b.date.localeCompare(a.date));
        setHistory(list);
        const todays=list.find(r=>r.date===TODAY);
        setReport(todays||null);
      }
    );
    return unsub;
  },[foreman.projectId]);

  const submitReport = async () => {
    if(!workers||!tasks.trim()) return;
    setSaving(true);
    await setDoc(doc(db,"site_reports",foreman.projectId+"_"+TODAY),{
      date:TODAY, projectId:foreman.projectId,
      projectName:foreman.projectName||"",
      foremanId:foreman.id, foremanName:foreman.name,
      workers:Number(workers)||0,
      progress:Number(progress)||0,
      tasks:tasks.trim(), note:note.trim(),
      submittedAt:new Date().toISOString()
    });
    setSubmitted(true); setSaving(false);
  };

  const now = new Date().toLocaleTimeString("ar-IQ");

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",
      fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"16px"}}>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#1E3A5F,#2563EB)",
          borderRadius:16,padding:"16px 20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>
                📍 {foreman.projectName||"موقع الديكور"}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>
                👷 {foreman.name} · {TODAY} · {now}
              </div>
            </div>
            <button onClick={onLogout} style={{background:"rgba(255,255,255,0.1)",
              border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",
              fontFamily:"Tahoma",color:"rgba(255,255,255,0.7)",fontSize:11}}>
              خروج
            </button>
          </div>
          {/* نسبة الإنجاز الكلية */}
          {history.length>0&&(
            <div style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",
                fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>
                <span>الإنجاز الكلي</span>
                <span>{history[0]?.progress||0}%</span>
              </div>
              <div style={{background:"rgba(255,255,255,0.2)",borderRadius:99,height:6}}>
                <div style={{height:6,borderRadius:99,
                  width:(history[0]?.progress||0)+"%",
                  background:"#4ADE80"}}/>
              </div>
            </div>
          )}
        </div>

        {/* خطة الغد للموقع */}
        {sitePlanTomorrow && (
          <div style={{background:"#fff",borderRadius:14,padding:18,
            border:"2px solid #2563EB",marginBottom:14}}>
            <div style={{background:"#2563EB",borderRadius:8,display:"inline-block",
              padding:"5px 14px",fontSize:11,fontWeight:700,color:"#fff",marginBottom:12}}>
              📅 مهمة الغد — {TOMORROW}
            </div>
            {sitePlanTomorrow.note&&(
              <div style={{background:"#EFF6FF",borderRadius:10,
                padding:"10px 14px",fontSize:12,color:"#1D4ED8",
                marginBottom:10,fontWeight:600}}>
                💬 {sitePlanTomorrow.note}
              </div>
            )}
            {(sitePlanTomorrow.tasks||[]).map((t,i)=>(
              <div key={i} style={{borderRadius:10,padding:"11px 14px",
                marginBottom:6,background:"#F8FAFC",
                border:"1px solid #DBEAFE",borderRight:"4px solid #2563EB"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>
                  {i+1}. {t.desc}
                </div>
                {t.note&&<div style={{fontSize:11,color:"#64748B",marginTop:3}}>
                  📌 {t.note}
                </div>}
              </div>
            ))}
          </div>
        )}

        {/* تقرير اليوم */}
        <div style={{background:"#fff",borderRadius:14,padding:18,
          border:"1px solid #E2E8F0",marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>
            📊 تقرير اليوم
          </div>

          {report||submitted ? (
            <div style={{background:"#F0FDF4",borderRadius:12,padding:16,
              border:"2px solid #16A34A",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:15,fontWeight:700,color:"#16A34A"}}>
                تم رفع تقرير اليوم
              </div>
              {report&&(
                <div style={{marginTop:12,textAlign:"right",fontSize:12}}>
                  <div style={{padding:"6px 0",borderBottom:"1px solid #DCFCE7"}}>
                    <span style={{color:"#64748B"}}>عدد العمال: </span>
                    <strong>{report.workers}</strong>
                  </div>
                  <div style={{padding:"6px 0",borderBottom:"1px solid #DCFCE7"}}>
                    <span style={{color:"#64748B"}}>نسبة الإنجاز: </span>
                    <strong style={{color:"#2563EB"}}>{report.progress}%</strong>
                  </div>
                  <div style={{padding:"6px 0",borderBottom:"1px solid #DCFCE7"}}>
                    <span style={{color:"#64748B"}}>الأعمال المنجزة: </span>
                    <div style={{marginTop:4,color:"#1E293B"}}>{report.tasks}</div>
                  </div>
                  {report.note&&(
                    <div style={{padding:"6px 0"}}>
                      <span style={{color:"#64748B"}}>ملاحظات: </span>
                      <div style={{color:"#1E293B",marginTop:4}}>{report.note}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                gap:12,marginBottom:12}}>
                <div>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                    👷 عدد العمال
                  </div>
                  <input type="number" value={workers}
                    onChange={e=>setWorkers(e.target.value)}
                    placeholder="0"
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"11px 13px",fontSize:16,outline:"none",fontFamily:"Tahoma",
                      textAlign:"center",boxSizing:"border-box",background:"#F8FAFC"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                    📊 نسبة الإنجاز %
                  </div>
                  <input type="number" value={progress} min="0" max="100"
                    onChange={e=>setProgress(e.target.value)}
                    placeholder="0"
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"11px 13px",fontSize:16,outline:"none",fontFamily:"Tahoma",
                      textAlign:"center",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  {progress>0&&(
                    <div style={{marginTop:6,background:"#E2E8F0",
                      borderRadius:99,height:4}}>
                      <div style={{height:4,borderRadius:99,
                        width:Math.min(100,progress)+"%",
                        background:"#2563EB"}}/>
                    </div>
                  )}
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                  🔨 الأعمال المنجزة اليوم *
                </div>
                <textarea value={tasks} onChange={e=>setTasks(e.target.value)}
                  placeholder="مثال: تركيب سقف جبس غرفة 3 و 4، دهان جدران الردهة..."
                  rows={4}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:10,
                    padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",resize:"none"}}/>
              </div>

              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                  📝 ملاحظات
                </div>
                <textarea value={note} onChange={e=>setNote(e.target.value)}
                  placeholder="مشاكل، احتياجات، طلبات..."
                  rows={3}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:10,
                    padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",resize:"none"}}/>
              </div>

              <button onClick={submitReport}
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

        {/* التقارير السابقة */}
        {history.filter(r=>r.date!==TODAY).length>0&&(
          <div style={{background:"#fff",borderRadius:14,padding:18,
            border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
              📅 التقارير السابقة
            </div>
            {history.filter(r=>r.date!==TODAY).slice(0,5).map(r=>(
              <div key={r.id} style={{borderRadius:10,padding:"12px 14px",
                marginBottom:8,border:"1px solid #E2E8F0",
                background:"#F8FAFC"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:12,color:"#64748B"}}>📅 {r.date}</span>
                  <div style={{display:"flex",gap:12,fontSize:11}}>
                    <span style={{color:"#64748B"}}>👷 {r.workers} عامل</span>
                    <span style={{color:"#2563EB",fontWeight:700}}>{r.progress}%</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:"#475569"}}>{r.tasks}</div>
                {r.note&&<div style={{fontSize:11,color:"#94A3B8",marginTop:4}}>
                  📝 {r.note}
                </div>}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── إدارة الفورمن (للمدير) ──────────────────────────
export function ForemanManagePage({ projects, onBack }) {
  const [foremans,  setForemans]  = useState([]);
  const [factPlans, setFactPlans] = useState([]);
  const [factReps,  setFactReps]  = useState([]);
  const [siteReps,  setSiteReps]  = useState([]);
  const [tab,       setTab]       = useState("reports"); // reports | plan | foremans
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState({
    name:"", pin:"", type:"معمل", projectId:"", projectName:""
  });
  const sf = k => v => setForm(f=>({...f,[k]:v}));

  // خطة المعمل للغد
  const [planTasks,  setPlanTasks]  = useState([{desc:"",qty:"",note:""}]);
  const [planNote,   setPlanNote]   = useState("");
  const [planSaved,  setPlanSaved]  = useState(false);

  useEffect(()=>{
    const u1=onSnapshot(collection(db,"foremans"),
      s=>setForemans(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2=onSnapshot(collection(db,"factory_plans"),
      s=>setFactPlans(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date))));
    const u3=onSnapshot(collection(db,"factory_reports"),
      s=>setFactReps(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date))));
    const u4=onSnapshot(collection(db,"site_reports"),
      s=>setSiteReps(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date))));
    return()=>{u1();u2();u3();u4();};
  },[]);

  const addForeman = async () => {
    if(!form.name.trim()||!form.pin) return;
    await addDoc(collection(db,"foremans"),{
      name:form.name.trim(), pin:String(form.pin),
      type:form.type,
      projectId:form.type==="موقع"?form.projectId:"",
      projectName:form.type==="موقع"?form.projectName:"",
      branch:"ديكور", createdAt:new Date().toISOString()
    });
    setForm({name:"",pin:"",type:"معمل",projectId:"",projectName:""});
    setShowAdd(false);
  };

  const savePlan = async () => {
    const validTasks = planTasks.filter(t=>t.desc.trim());
    if(!validTasks.length) return;
    await setDoc(doc(db,"factory_plans",TOMORROW),{
      date:TOMORROW, tasks:validTasks,
      note:planNote, createdAt:new Date().toISOString()
    });
    setPlanSaved(true); setTimeout(()=>setPlanSaved(false),2000);
  };

  const STATUS_COLOR = {
    "منجز":"#16A34A","جزئي":"#D97706","لم ينجز":"#DC2626"
  };

  const activeProjects = (projects||[]).filter(p=>p.status==="active"&&p.type==="ديكور");

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",
      fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:800,margin:"0 auto",padding:"20px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
          ← رجوع
        </button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#0F172A,#1E293B)",
          borderRadius:16,padding:"18px 22px",marginBottom:16}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:10}}>
            👷 إدارة الفورمن — قسم الديكور
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[
              {l:"الفورمن المسجّلين",v:foremans.length,c:"#60A5FA"},
              {l:"تقارير المعمل اليوم",v:factReps.filter(r=>r.date===TODAY).length,c:"#4ADE80"},
              {l:"تقارير المواقع اليوم",v:siteReps.filter(r=>r.date===TODAY).length,c:"#FCD34D"},
            ].map((s,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.08)",
                borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",marginBottom:3}}>{s.l}</div>
                <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* تبويبات */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
          gap:8,marginBottom:16}}>
          {[
            {id:"reports", label:"📊 التقارير"},
            {id:"plan",    label:"📋 خطة الغد"},
            {id:"foremans",label:"👷 الفورمن"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              border:"none",borderRadius:10,padding:"12px",cursor:"pointer",
              fontFamily:"Tahoma",fontSize:13,fontWeight:700,
              background:tab===t.id?"#0F172A":"#fff",
              color:tab===t.id?"#fff":"#64748B"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── التقارير ─── */}
        {tab==="reports"&&(
          <div>
            {/* تقارير المعمل */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
                🏭 تقارير المعمل
              </div>
              {factReps.length===0?(
                <div style={{color:"#94A3B8",textAlign:"center",padding:20}}>
                  ما في تقارير بعد
                </div>
              ):factReps.slice(0,7).map(r=>(
                <div key={r.id} style={{borderRadius:12,padding:14,
                  marginBottom:10,border:"1px solid "+(r.date===TODAY?"#16A34A40":"#E2E8F0"),
                  background:r.date===TODAY?"#F0FDF4":"#F8FAFC"}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:13,fontWeight:700,
                      color:r.date===TODAY?"#16A34A":"#1E293B"}}>
                      {r.date===TODAY?"⭐ اليوم":""} {r.date}
                    </span>
                    <span style={{fontSize:11,color:"#64748B"}}>
                      👷 {r.foremanName}
                    </span>
                  </div>
                  {(r.tasks||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      padding:"6px 0",borderBottom:"1px solid #F1F5F9",fontSize:12}}>
                      <span style={{color:"#475569"}}>{t.desc}</span>
                      <div>
                        <span style={{color:STATUS_COLOR[t.status]||"#64748B",
                          fontWeight:700,marginLeft:8}}>{t.status}</span>
                        {t.note&&<span style={{color:"#94A3B8",fontSize:10}}>
                          · {t.note}
                        </span>}
                      </div>
                    </div>
                  ))}
                  {r.note&&(
                    <div style={{fontSize:11,color:"#64748B",marginTop:8,
                      background:"#fff",borderRadius:8,padding:"6px 10px"}}>
                      📝 {r.note}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* تقارير المواقع */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
                📍 تقارير المواقع
              </div>
              {siteReps.length===0?(
                <div style={{color:"#94A3B8",textAlign:"center",padding:20}}>
                  ما في تقارير بعد
                </div>
              ):siteReps.slice(0,7).map(r=>(
                <div key={r.id} style={{borderRadius:12,padding:14,
                  marginBottom:10,border:"1px solid "+(r.date===TODAY?"#2563EB40":"#E2E8F0"),
                  background:r.date===TODAY?"#EFF6FF":"#F8FAFC"}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"start",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>
                        {r.projectName}
                      </div>
                      <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                        📅 {r.date} · 👷 {r.foremanName}
                      </div>
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:18,fontWeight:700,color:"#2563EB"}}>
                        {r.progress}%
                      </div>
                      <div style={{fontSize:10,color:"#64748B"}}>
                        {r.workers} عامل
                      </div>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:"#475569",marginBottom:4}}>
                    🔨 {r.tasks}
                  </div>
                  {r.note&&<div style={{fontSize:11,color:"#94A3B8"}}>
                    📝 {r.note}
                  </div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── خطة الغد ─── */}
        {tab==="plan"&&(
          <div style={{background:"#fff",borderRadius:14,padding:20,
            border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:4}}>
              📋 خطة المعمل ليوم {TOMORROW}
            </div>
            <div style={{fontSize:11,color:"#64748B",marginBottom:16}}>
              الفورمن سيشوف هذه المهام غداً عند الدخول
            </div>

            {planTasks.map((t,i)=>(
              <div key={i} style={{borderRadius:12,padding:14,
                marginBottom:10,border:"1px solid #E2E8F0",background:"#F8FAFC"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#475569"}}>
                    مهمة {i+1}
                  </span>
                  {planTasks.length>1&&(
                    <button onClick={()=>setPlanTasks(p=>p.filter((_,ii)=>ii!==i))}
                      style={{background:"none",border:"none",cursor:"pointer",
                        color:"#DC2626",fontSize:16}}>✕</button>
                  )}
                </div>
                <input placeholder="وصف المهمة... (مثال: تصنيع 5 أبواب خشب)"
                  value={t.desc}
                  onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                    ii===i?{...tt,desc:e.target.value}:tt))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 13px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",marginBottom:8}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input placeholder="الكمية (مثال: 10 قطع)"
                    value={t.qty}
                    onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                      ii===i?{...tt,qty:e.target.value}:tt))}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"9px 12px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box"}}/>
                  <input placeholder="ملاحظة للفورمن"
                    value={t.note}
                    onChange={e=>setPlanTasks(p=>p.map((tt,ii)=>
                      ii===i?{...tt,note:e.target.value}:tt))}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"9px 12px",fontSize:12,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box"}}/>
                </div>
              </div>
            ))}

            <button onClick={()=>setPlanTasks(p=>[...p,{desc:"",qty:"",note:""}])}
              style={{width:"100%",border:"2px dashed #CBD5E1",borderRadius:10,
                padding:"10px",fontSize:13,fontFamily:"Tahoma",cursor:"pointer",
                background:"transparent",color:"#64748B",marginBottom:12}}>
              + إضافة مهمة
            </button>

            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                ملاحظة عامة للفورمن
              </div>
              <textarea value={planNote} onChange={e=>setPlanNote(e.target.value)}
                rows={2} placeholder="أي توجيهات إضافية..."
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:10,
                  padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",resize:"none"}}/>
            </div>

            {planSaved?(
              <div style={{background:"#F0FDF4",border:"2px solid #16A34A",
                borderRadius:12,padding:14,textAlign:"center"}}>
                <div style={{fontSize:24}}>✅</div>
                <div style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>
                  تم حفظ خطة الغد
                </div>
              </div>
            ):(
              <button onClick={savePlan}
                disabled={!planTasks.some(t=>t.desc.trim())}
                style={{width:"100%",border:"none",borderRadius:12,padding:"14px",
                  fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                  background:planTasks.some(t=>t.desc.trim())?"#0F172A":"#E2E8F0",
                  color:planTasks.some(t=>t.desc.trim())?"#fff":"#94A3B8"}}>
                💾 حفظ خطة يوم {TOMORROW}
              </button>
            )}
          </div>
        )}

        {/* ─── الفورمن ─── */}
        {tab==="foremans"&&(
          <div>
            <button onClick={()=>setShowAdd(v=>!v)} style={{
              width:"100%",border:"none",borderRadius:12,padding:"12px",
              fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
              background:showAdd?"#475569":"#0F172A",
              color:"#fff",marginBottom:12}}>
              {showAdd?"✕ إلغاء":"+ إضافة فورمن"}
            </button>

            {showAdd&&(
              <div style={{background:"#fff",borderRadius:14,padding:18,
                border:"1px solid #E2E8F0",marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                  gap:12,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                      الاسم
                    </div>
                    <input value={form.name} onChange={e=>sf("name")(e.target.value)}
                      placeholder="اسم الفورمن..."
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px 13px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                      رمز الدخول PIN
                    </div>
                    <input type="number" value={form.pin}
                      onChange={e=>sf("pin")(e.target.value)}
                      placeholder="مثال: 1234"
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                        textAlign:"center",boxSizing:"border-box"}}/>
                  </div>
                </div>

                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                    النوع
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {["معمل","موقع"].map(t=>(
                      <button key={t} onClick={()=>sf("type")(t)} style={{
                        border:"2px solid "+(form.type===t?"#0F172A":"#E2E8F0"),
                        borderRadius:9,padding:"10px",cursor:"pointer",
                        fontFamily:"Tahoma",fontSize:13,fontWeight:700,
                        background:form.type===t?"#0F172A":"#fff",
                        color:form.type===t?"#fff":"#64748B"}}>
                        {t==="معمل"?"🏭 معمل":"📍 موقع"}
                      </button>
                    ))}
                  </div>
                </div>

                {form.type==="موقع"&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                      الموقع / المشروع
                    </div>
                    <select value={form.projectId}
                      onChange={e=>{
                        const p=activeProjects.find(p=>p.id===e.target.value);
                        sf("projectId")(e.target.value);
                        sf("projectName")(p?.name||"");
                      }}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",appearance:"none"}}>
                      <option value="">— اختر الموقع —</option>
                      {activeProjects.map(p=>(
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button onClick={addForeman}
                  disabled={!form.name.trim()||!form.pin||
                    (form.type==="موقع"&&!form.projectId)}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"12px",
                    fontSize:13,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:"#16A34A",color:"#fff"}}>
                  ✅ إضافة الفورمن
                </button>
              </div>
            )}

            {foremans.map(f=>(
              <div key={f.id} style={{background:"#fff",borderRadius:12,
                padding:"14px 16px",marginBottom:8,border:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>
                    {f.type==="معمل"?"🏭":"📍"} {f.name}
                  </div>
                  <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                    {f.type==="موقع"?f.projectName||"موقع":f.type}
                    {" · "}قسم {f.branch}
                  </div>
                </div>
                <div style={{background:"#F1F5F9",borderRadius:8,
                  padding:"6px 14px",fontSize:13,fontWeight:700,
                  color:"#475569",letterSpacing:2}}>
                  {f.pin}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
