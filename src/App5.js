import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, setDoc, query, where, getDocs } from "firebase/firestore";

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

const fNum = n => { if(!n&&n!==0)return"0"; return Math.round(Number(n)).toLocaleString("en"); };
const PASS = "1234";
const WORK_DAYS  = 26;  // أيام الشهر
const WORK_HOURS = 10;  // ساعات اليوم

// ─── صفحة إدارة الحضور ───────────────────────────────
export function AttendancePage({ funds, projects, employees, onBack }) {
  const [tab,       setTab]       = useState("daily");   // daily | dashboard | reports
  const [attendance,setAttendance]= useState([]);
  const [selDate,   setSelDate]   = useState(new Date().toISOString().split("T")[0]);
  const [selProj,   setSelProj]   = useState(null);
  const [entries,   setEntries]   = useState([]); // [{empId,empName,branch,baseDin,status,overtime}]
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [repEmp,    setRepEmp]    = useState("all");
  const [repProj,   setRepProj]   = useState("all");

  // المشاريع النشطة
  const activeProjects = (projects||[]).filter(p=>p.status==="active");

  // جلب سجلات الحضور
  useEffect(()=>{
    return onSnapshot(collection(db,"attendance"),
      snap=>setAttendance(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);

  // تهيئة قائمة الموظفين عند اختيار مشروع
  useEffect(()=>{
    if(!selProj) return;
    const branch = selProj.type;
    const branchEmps = (employees||[]).filter(e=>e.branch===branch&&e.status!=="inactive");
    // تحقق لو في سجل موجود لهذا اليوم والمشروع
    const existing = attendance.find(
      a=>a.projectId===selProj.id && a.date===selDate
    );
    if(existing?.entries) {
      setEntries(existing.entries);
    } else {
      setEntries(branchEmps.map(e=>({
        empId:e.id, empName:e.name, branch:e.branch,
        baseDin:e.baseDin||0, baseDol:e.baseDol||0,
        status:"حضر", overtime:0
      })));
    }
  },[selProj, selDate]);

  // أجر ساعة الأوفرتايم
  const calcOvertimePay = (baseDin, baseDol, hours) => {
    const din = baseDin>0 ? Math.round((baseDin/WORK_DAYS/WORK_HOURS)*hours) : 0;
    const dol = baseDol>0 ? Math.round((baseDol/WORK_DAYS/WORK_HOURS)*hours*10)/10 : 0;
    return {din, dol};
  };

  const updateEntry = (empId, key, val) => {
    setEntries(prev=>prev.map(e=>e.empId===empId?{...e,[key]:val}:e));
  };

  // حفظ الحضور
  const saveAttendance = async () => {
    if(!selProj||entries.length===0) return;
    const pw=window.prompt("🔒 باسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    setSaving(true);

    // حساب الأوفرتايم الكلي
    let totalOTDin=0, totalOTDol=0;
    const enriched = entries.map(e=>{
      const ot = calcOvertimePay(e.baseDin, e.baseDol, e.overtime||0);
      totalOTDin += ot.din;
      totalOTDol += ot.dol;
      return {...e, overtimePayDin:ot.din, overtimePayDol:ot.dol};
    });

    const docId = selProj.id+"_"+selDate;
    await setDoc(doc(db,"attendance",docId),{
      projectId:selProj.id, projectName:selProj.name,
      projectBranch:selProj.type, date:selDate,
      entries:enriched,
      totalOTDin, totalOTDol,
      presentCount:entries.filter(e=>e.status==="حضر").length,
      absentCount:entries.filter(e=>e.status==="غائب").length,
      createdAt:new Date().toISOString()
    });

    // خصم الأوفرتايم من صندوق الفرع
    if(totalOTDin>0||totalOTDol>0){
      const fBal=funds[selProj.type]||{din:0,dol:0};
      await setDoc(doc(db,"funds",selProj.type),
        {din:Math.max(0,fBal.din-totalOTDin),
         dol:Math.max(0,fBal.dol-totalOTDol)},{merge:true});
      await addDoc(collection(db,"fund_txs"),{
        fundId:selProj.type,fundLabel:selProj.type,type:"صرف",
        din:totalOTDin,dol:totalOTDol,
        note:"أوفرتايم عمال — "+selProj.name+" — "+selDate,
        date:selDate,createdAt:new Date().toISOString()
      });
    }

    setSaved(true); setTimeout(()=>setSaved(false),2000);
    setSaving(false);
  };

  // حساب تقدم المشروع
  const projProgress = (proj) => {
    const planned = proj.days||proj.plannedDays||0;
    if(!planned) return null;
    const recs = attendance.filter(a=>a.projectId===proj.id);
    const actual = recs.length;
    return Math.min(100, Math.round((actual/planned)*100));
  };

  // تقرير موظف
  const empReport = (empId) => {
    const recs = attendance.filter(a=>
      a.entries?.some(e=>e.empId===empId)
    );
    const byProj = {};
    let totalOT=0, totalDays=0;
    recs.forEach(a=>{
      const e=a.entries.find(e=>e.empId===empId);
      if(!e) return;
      if(!byProj[a.projectId]) byProj[a.projectId]={name:a.projectName,days:0,ot:0,otPay:0};
      if(e.status==="حضر") { byProj[a.projectId].days++; totalDays++; }
      byProj[a.projectId].ot+=(e.overtime||0);
      byProj[a.projectId].otPay+=(e.overtimePayDin||0);
      totalOT+=(e.overtime||0);
    });
    return {byProj,totalOT,totalDays};
  };

  // عمال اليوم (لوحة المتابعة)
  const todayRecs = attendance.filter(a=>a.date===new Date().toISOString().split("T")[0]);

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
          ← رجوع
        </button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#0F172A,#1E3A5F)",
          borderRadius:16,padding:"20px 24px",marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:4}}>
            👷 إدارة الحضور والمواقع
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:12}}>
            {[
              {l:"مشاريع نشطة",v:activeProjects.length,c:"#60A5FA"},
              {l:"حضور اليوم",v:todayRecs.reduce((s,a)=>s+(a.presentCount||0),0),c:"#4ADE80"},
              {l:"غياب اليوم",v:todayRecs.reduce((s,a)=>s+(a.absentCount||0),0),c:"#F87171"},
            ].map((s,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.1)",
                borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginBottom:3}}>{s.l}</div>
                <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* تبويبات */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
          gap:8,marginBottom:16}}>
          {[
            {id:"daily",    label:"📋 تسجيل الحضور"},
            {id:"dashboard",label:"📊 لوحة المتابعة"},
            {id:"reports",  label:"📈 التقارير"},
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

        {/* ─── تسجيل الحضور ─── */}
        {tab==="daily" && (
          <div>
            {/* اختيار المشروع والتاريخ */}
            <div style={{background:"#fff",borderRadius:14,padding:16,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                    📅 التاريخ
                  </div>
                  <input type="date" value={selDate}
                    onChange={e=>{setSelDate(e.target.value);setEntries([]);}}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                      boxSizing:"border-box",background:"#F8FAFC"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                    🏗️ المشروع
                  </div>
                  <select value={selProj?.id||""}
                    onChange={e=>{
                      const p=activeProjects.find(p=>p.id===e.target.value)||null;
                      setSelProj(p); setEntries([]);
                    }}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",
                      background:"#F8FAFC",appearance:"none"}}>
                    <option value="">— اختر مشروعاً —</option>
                    {activeProjects.map(p=>(
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selProj && (
                <div style={{marginTop:10,fontSize:12,color:"#64748B",
                  background:"#F8FAFC",borderRadius:8,padding:"8px 12px",
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>📊 فرع: {selProj.type}</span>
                  {selProj.days && (
                    <span>📆 مدة المشروع: {selProj.days} يوم | منجز: {projProgress(selProj)||0}%</span>
                  )}
                  <span>💰 رصيد الصندوق: {fNum(funds[selProj.type]?.din||0)} د.ع</span>
                </div>
              )}
            </div>

            {/* قائمة الموظفين */}
            {selProj && entries.length>0 ? (
              <div style={{background:"#fff",borderRadius:14,
                border:"1px solid #E2E8F0",marginBottom:14,overflow:"hidden"}}>
                {/* رأس الجدول */}
                <div style={{display:"grid",
                  gridTemplateColumns:"1fr 100px 120px 120px 140px",
                  gap:0,background:"#0F172A",padding:"10px 16px"}}>
                  {["الموظف","الحضور","أوفرتايم (ساعة)","أجر الساعة","تكلفة الأوفرتايم"].map((h,i)=>(
                    <div key={i} style={{fontSize:11,fontWeight:700,
                      color:"#94A3B8",textAlign:i===0?"right":"center"}}>{h}</div>
                  ))}
                </div>

                {entries.map((e,i)=>{
                  const hourRate = e.baseDin>0
                    ? Math.round(e.baseDin/WORK_DAYS/WORK_HOURS)
                    : Math.round(e.baseDol/WORK_DAYS/WORK_HOURS*100)/100;
                  const isDin = e.baseDin>0;
                  const {din:otDin, dol:otDol} = calcOvertimePay(e.baseDin,e.baseDol,e.overtime||0);
                  return (
                    <div key={e.empId} style={{
                      display:"grid",gridTemplateColumns:"1fr 100px 120px 120px 140px",
                      gap:0,padding:"12px 16px",alignItems:"center",
                      background:i%2===0?"#fff":"#F8FAFC",
                      borderBottom:"1px solid #F1F5F9"}}>
                      {/* الاسم */}
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>{e.empName}</div>
                        <div style={{fontSize:10,color:"#94A3B8"}}>{e.branch}</div>
                      </div>
                      {/* الحضور */}
                      <div style={{textAlign:"center"}}>
                        <button onClick={()=>updateEntry(e.empId,"status",
                          e.status==="حضر"?"غائب":"حضر")}
                          style={{border:"none",borderRadius:20,padding:"5px 12px",
                            cursor:"pointer",fontFamily:"Tahoma",fontSize:11,fontWeight:700,
                            background:e.status==="حضر"?"#DCFCE7":"#FEE2E2",
                            color:e.status==="حضر"?"#16A34A":"#DC2626"}}>
                          {e.status==="حضر"?"✅ حضر":"❌ غائب"}
                        </button>
                      </div>
                      {/* الأوفرتايم */}
                      <div style={{textAlign:"center",display:"flex",
                        alignItems:"center",justifyContent:"center",gap:6}}>
                        <button onClick={()=>updateEntry(e.empId,"overtime",
                          Math.max(0,(e.overtime||0)-1))}
                          disabled={e.status==="غائب"||(e.overtime||0)===0}
                          style={{width:26,height:26,border:"none",borderRadius:"50%",
                            cursor:"pointer",fontWeight:700,fontSize:14,
                            background:"#FEE2E2",color:"#DC2626"}}>−</button>
                        <span style={{fontSize:15,fontWeight:700,
                          color:(e.overtime||0)>0?"#F97316":"#CBD5E1",minWidth:20,
                          textAlign:"center"}}>{e.overtime||0}</span>
                        <button onClick={()=>updateEntry(e.empId,"overtime",
                          e.status==="غائب"?0:(e.overtime||0)+1)}
                          disabled={e.status==="غائب"}
                          style={{width:26,height:26,border:"none",borderRadius:"50%",
                            cursor:"pointer",fontWeight:700,fontSize:14,
                            background:"#DCFCE7",color:"#16A34A"}}>+</button>
                      </div>
                      {/* أجر الساعة */}
                      <div style={{textAlign:"center",fontSize:11,color:"#64748B"}}>
                        {fNum(Math.round(isDin?e.baseDin/WORK_DAYS/WORK_HOURS
                          :e.baseDol/WORK_DAYS/WORK_HOURS))} {isDin?"د.ع":"$"}
                      </div>
                      {/* تكلفة الأوفرتايم */}
                      <div style={{textAlign:"center"}}>
                        {(e.overtime||0)>0 ? (
                          <span style={{fontSize:12,fontWeight:700,
                            color:isDin?"#DC2626":"#2563EB"}}>
                            {isDin?fNum(otDin)+" د.ع":fNum(otDol)+" $"}
                          </span>
                        ) : (
                          <span style={{fontSize:11,color:"#CBD5E1"}}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* إجماليات */}
                <div style={{display:"grid",
                  gridTemplateColumns:"1fr 100px 120px 120px 140px",
                  padding:"12px 16px",background:"#F1F5F9",
                  borderTop:"2px solid #E2E8F0"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1E293B"}}>
                    الإجمالي — {entries.filter(e=>e.status==="حضر").length} حضور
                    / {entries.filter(e=>e.status==="غائب").length} غياب
                  </div>
                  <div/>
                  <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:"#F97316"}}>
                    {entries.reduce((s,e)=>s+(e.overtime||0),0)} ساعة
                  </div>
                  <div/>
                  <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:"#DC2626"}}>
                    {fNum(entries.reduce((s,e)=>
                      s+calcOvertimePay(e.baseDin,e.baseDol,e.overtime||0).din,0))} د.ع
                  </div>
                </div>
              </div>
            ) : selProj ? (
              <div style={{background:"#fff",borderRadius:14,padding:24,
                textAlign:"center",color:"#94A3B8",border:"1px solid #E2E8F0",
                marginBottom:14}}>
                ما في موظفين مسجّلين في فرع {selProj.type}
              </div>
            ) : null}

            {/* زر الحفظ */}
            {selProj && entries.length>0 && (
              saved ? (
                <div style={{background:"#F0FDF4",border:"2px solid #16A34A",
                  borderRadius:12,padding:16,textAlign:"center"}}>
                  <div style={{fontSize:24}}>✅</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>
                    تم حفظ الحضور بنجاح
                  </div>
                </div>
              ) : (
                <button onClick={saveAttendance} disabled={saving} style={{
                  width:"100%",border:"none",borderRadius:12,padding:"14px",
                  fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                  background:saving?"#E2E8F0":"#0F172A",color:saving?"#94A3B8":"#fff"}}>
                  {saving?"⏳ جاري الحفظ...":"💾 حفظ الحضور"}
                </button>
              )
            )}
          </div>
        )}

        {/* ─── لوحة المتابعة ─── */}
        {tab==="dashboard" && (
          <div>
            {/* تقدم المشاريع */}
            <div style={{background:"#fff",borderRadius:14,padding:20,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>
                📊 تقدم المشاريع
              </div>
              {activeProjects.length===0 ? (
                <div style={{color:"#94A3B8",textAlign:"center",padding:20}}>
                  ما في مشاريع نشطة
                </div>
              ) : activeProjects.map(proj=>{
                const pct = projProgress(proj);
                const recs = attendance.filter(a=>a.projectId===proj.id);
                const actual = recs.length;
                const planned = proj.days||0;
                const lastRec = recs.sort((a,b)=>b.date.localeCompare(a.date))[0];
                const todayRec = recs.find(a=>a.date===new Date().toISOString().split("T")[0]);
                return (
                  <div key={proj.id} style={{borderRadius:12,padding:14,
                    marginBottom:12,border:"1px solid #E2E8F0",
                    borderRight:"5px solid #2563EB"}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"start",marginBottom:10}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>
                          {proj.name}
                        </div>
                        <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                          {proj.type} · {proj.province||""} · بدأ: {proj.startDate||""}
                        </div>
                      </div>
                      <div style={{textAlign:"left"}}>
                        {pct!==null ? (
                          <div style={{fontSize:24,fontWeight:700,
                            color:pct>=100?"#DC2626":pct>=75?"#F97316":"#16A34A"}}>
                            {pct}%
                          </div>
                        ) : (
                          <div style={{fontSize:12,color:"#94A3B8"}}>غير محدد</div>
                        )}
                      </div>
                    </div>
                    {pct!==null && (
                      <div style={{background:"#F1F5F9",borderRadius:99,height:8,marginBottom:8}}>
                        <div style={{height:8,borderRadius:99,
                          width:pct+"%",
                          background:pct>=100?"#DC2626":pct>=75?"#F97316":"#16A34A",
                          transition:"width 0.5s"}}/>
                      </div>
                    )}
                    <div style={{display:"flex",gap:16,fontSize:11,color:"#64748B"}}>
                      <span>📅 أيام العمل: {actual} / {planned||"?"}</span>
                      {todayRec && (
                        <span>👷 اليوم: {todayRec.presentCount} حضور / {todayRec.absentCount} غياب</span>
                      )}
                      {lastRec && <span>آخر سجل: {lastRec.date}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* العمال اليوم */}
            <div style={{background:"#fff",borderRadius:14,padding:20,
              border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>
                👷 وضع العمال اليوم — {new Date().toLocaleDateString("ar-IQ")}
              </div>
              {todayRecs.length===0 ? (
                <div style={{color:"#94A3B8",textAlign:"center",padding:20}}>
                  ما في سجل حضور لليوم بعد
                </div>
              ) : todayRecs.map(rec=>(
                <div key={rec.id} style={{borderRadius:12,padding:14,
                  marginBottom:10,border:"1px solid #E2E8F0"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:10}}>
                    🏗️ {rec.projectName}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {(rec.entries||[]).map((e,i)=>(
                      <div key={i} style={{
                        background:e.status==="حضر"?"#F0FDF4":"#FFF1F2",
                        border:"1px solid "+(e.status==="حضر"?"#16A34A40":"#DC262640"),
                        borderRadius:8,padding:"6px 10px",fontSize:11}}>
                        <span style={{color:e.status==="حضر"?"#16A34A":"#DC2626",
                          fontWeight:700}}>{e.status==="حضر"?"✅":"❌"}</span>
                        <span style={{marginRight:4,color:"#1E293B"}}>{e.empName}</span>
                        {(e.overtime||0)>0&&(
                          <span style={{color:"#F97316",fontWeight:700}}>
                            +{e.overtime}ساعة
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── التقارير ─── */}
        {tab==="reports" && (
          <div>
            {/* تقرير موظف */}
            <div style={{background:"#fff",borderRadius:14,padding:20,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
                👷 تقرير موظف
              </div>
              <select value={repEmp} onChange={e=>setRepEmp(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",
                  background:"#F8FAFC",appearance:"none",marginBottom:12}}>
                <option value="all">الكل</option>
                {(employees||[]).map(e=>(
                  <option key={e.id} value={e.id}>{e.name} ({e.branch})</option>
                ))}
              </select>

              {repEmp!=="all" && (()=>{
                const emp=(employees||[]).find(e=>e.id===repEmp);
                const {byProj,totalOT,totalDays}=empReport(repEmp);
                return (
                  <div>
                    <div style={{background:"#F8FAFC",borderRadius:10,padding:12,
                      marginBottom:10,display:"flex",gap:20,flexWrap:"wrap",fontSize:12}}>
                      <span>👷 {emp?.name}</span>
                      <span>📅 إجمالي الأيام: <strong>{totalDays}</strong></span>
                      <span>⏱️ إجمالي الأوفرتايم: <strong>{totalOT} ساعة</strong></span>
                    </div>
                    {Object.entries(byProj).map(([pid,pd])=>(
                      <div key={pid} style={{borderRadius:10,padding:"10px 14px",
                        marginBottom:8,border:"1px solid #E2E8F0",
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:"#1E293B"}}>
                            {pd.name}
                          </div>
                          <div style={{fontSize:11,color:"#64748B"}}>
                            {pd.days} يوم عمل
                          </div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          {pd.ot>0&&<div style={{fontSize:11,color:"#F97316"}}>
                            ⏱️ {pd.ot} ساعة أوفرتايم
                          </div>}
                          {pd.otPay>0&&<div style={{fontSize:12,fontWeight:700,color:"#DC2626"}}>
                            {fNum(pd.otPay)} د.ع
                          </div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* تقرير مشروع */}
            <div style={{background:"#fff",borderRadius:14,padding:20,
              border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
                🏗️ تقرير مشروع
              </div>
              <select value={repProj} onChange={e=>setRepProj(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",
                  background:"#F8FAFC",appearance:"none",marginBottom:12}}>
                <option value="all">الكل</option>
                {(projects||[]).filter(p=>p.status==="active").map(p=>(
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {repProj!=="all" && (()=>{
                const proj=(projects||[]).find(p=>p.id===repProj);
                if(!proj) return null;
                const recs=attendance.filter(a=>a.projectId===repProj)
                  .sort((a,b)=>b.date.localeCompare(a.date));
                const pct=projProgress(proj);
                const totalPresent=recs.reduce((s,a)=>s+(a.presentCount||0),0);
                const totalOT=recs.reduce((s,a)=>
                  s+(a.entries||[]).reduce((ss,e)=>ss+(e.overtime||0),0),0);
                const totalOTPay=recs.reduce((s,a)=>s+(a.totalOTDin||0),0);
                return (
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",
                      gap:10,marginBottom:14}}>
                      {[
                        {l:"نسبة الإنجاز",v:pct!==null?pct+"%":"؟",c:"#2563EB"},
                        {l:"أيام العمل",v:recs.length,c:"#16A34A"},
                        {l:"إجمالي حضور",v:totalPresent,c:"#D97706"},
                        {l:"أوفرتايم",v:totalOT+" ساعة",c:"#F97316"},
                      ].map((s,i)=>(
                        <div key={i} style={{background:"#F8FAFC",borderRadius:10,
                          padding:"12px",textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>{s.l}</div>
                          <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    {totalOTPay>0&&(
                      <div style={{background:"#FFF1F2",borderRadius:10,padding:10,
                        fontSize:12,color:"#DC2626",fontWeight:700,
                        textAlign:"center",marginBottom:12}}>
                        إجمالي تكلفة الأوفرتايم: {fNum(totalOTPay)} د.ع
                      </div>
                    )}
                    {recs.slice(0,10).map(r=>(
                      <div key={r.id} style={{borderRadius:10,padding:"10px 14px",
                        marginBottom:6,border:"1px solid #E2E8F0",
                        display:"flex",justifyContent:"space-between",fontSize:12}}>
                        <span style={{color:"#64748B"}}>📅 {r.date}</span>
                        <span style={{color:"#16A34A"}}>✅ {r.presentCount} حضور</span>
                        <span style={{color:"#DC2626"}}>❌ {r.absentCount} غياب</span>
                        <span style={{color:"#F97316"}}>
                          {(r.entries||[]).reduce((s,e)=>s+(e.overtime||0),0)} ساعة OT
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
