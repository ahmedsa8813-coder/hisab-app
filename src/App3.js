import React, { useState, useEffect } from "react";
import { getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, setDoc, query, where } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";

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

function w2(n) {
  const x=Math.floor(Math.abs(Number(n)||0));
  if(!x)return"صفر";
  const o=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t2=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h=["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g=v=>{if(!v)return"";if(v<20)return o[v];if(v<100)return t2[Math.floor(v/10)]+(v%10?" و"+o[v%10]:"");return h[Math.floor(v/100)]+(v%100?" و"+g(v%100):"");};
  const p=[];
  if(x>=1e9)p.push(g(Math.floor(x/1e9))+" مليار");
  if(x%1e9>=1e6)p.push(g(Math.floor(x%1e9/1e6))+" مليون");
  if(x%1e6>=1e3)p.push(g(Math.floor(x%1e6/1e3))+" ألف");
  if(x%1e3)p.push(g(x%1e3));
  return p.join(" و");
}

const PASS = "1234";

const ALL_FUNDS = [
  {id:"رأس_المال", label:"رأس المال",     icon:"💼"},
  {id:"عام",       label:"الصندوق العام", icon:"🏦"},
  {id:"شركاء",     label:"أرباح الشركاء",icon:"👥"},
  {id:"إشراف",    label:"إشراف",          icon:"👷"},
  {id:"ديكور",    label:"ديكور",           icon:"🎨"},
  {id:"مقاولات",  label:"مقاولات",        icon:"🏗️"},
  {id:"واجهات",   label:"واجهات",          icon:"🏢"},
];


// ─── نظام الرواتب والموظفين ──────────────────────────
const EMP_BRANCHES = ["إشراف","ديكور","مقاولات","واجهات","عام"];
const EMP_ROLES    = ["مهندس","مشرف","فني","عامل","سائق","إداري","أخرى"];

export function EmployeesPage({ funds, onBack }) {
  const [employees, setEmployees] = useState([]);
  const [salaries,  setSalaries]  = useState([]);
  const [advances,  setAdvances]  = useState([]);

  const [tab,       setTab]       = useState("list");
  // list | add_emp | salary | advance | report
  const [filter,    setFilter]    = useState("all");
  const [selEmp,    setSelEmp]    = useState(null);

  const [empForm,   setEmpForm]   = useState({
    name:"", branch:"إشراف", role:"عامل",
    baseDin:"", baseDol:"", hireDate: new Date().toISOString().split("T")[0], note:""
  });
  const [salForm,   setSalForm]   = useState({
    month: new Date().toISOString().slice(0,7),
    fund: "", currency:"دينار",
    extraDin:"0", extraDol:"0",
    deductDin:"0", deductDol:"0",
    absenceDays:"0", note:""
  });
  const [advForm,   setAdvForm]   = useState({
    din:"", dol:"", date: new Date().toISOString().split("T")[0], note:""
  });
  const [editEmp,   setEditEmp]   = useState(null);
  const [editForm,  setEditForm]  = useState({});

  const ef  = k => v => setEmpForm(f=>({...f,[k]:v}));
  const sf  = k => v => setSalForm(f=>({...f,[k]:v}));
  const af  = k => v => setAdvForm(f=>({...f,[k]:v}));

  const [otRecords, setOtRecords] = useState([]);

  useEffect(()=>{
    const u1=onSnapshot(collection(db,"employees"), s=>{
      const list=s.docs.map(d=>({id:d.id,...d.data()}));
      list.sort((a,b)=>(a.branch||"").localeCompare(b.branch||"")||(a.name||"").localeCompare(b.name||""));
      setEmployees(list);
    });
    const u2=onSnapshot(collection(db,"salaries"), s=>{
      setSalaries(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u3=onSnapshot(collection(db,"advances"), s=>{
      setAdvances(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u4=onSnapshot(
      query(collection(db,"overtime_records"),where("status","==","pending")),
      s=>setOtRecords(s.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.date.localeCompare(a.date)))
    );
    return()=>{u1();u2();u3();u4();};
  },[]);

  // ── تعديل موظف ───────────────────────────────────────
  const openEdit = async (emp) => {
    const pw = window.prompt("🔒 أدخل الباسورد للتعديل:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    setEditEmp(emp);
    setEditForm({
      name: emp.name||"", branch: emp.branch||"إشراف",
      role: emp.role||"عامل",
      baseDin: String(emp.baseDin||""), baseDol: String(emp.baseDol||""),
      hireDate: emp.hireDate||"", note: emp.note||""
    });
  };

  const saveEdit = async () => {
    if (!editEmp||!editForm.name.trim()) return;
    await updateDoc(doc(db,"employees",editEmp.id),{
      name: editForm.name.trim(),
      branch: editForm.branch,
      role: editForm.role,
      baseDin: Number(editForm.baseDin)||0,
      baseDol: Number(editForm.baseDol)||0,
      hireDate: editForm.hireDate,
      note: editForm.note.trim(),
    });
    setEditEmp(null);
    setEditForm({});
  };

  const ef2 = k => v => setEditForm(f=>({...f,[k]:v}));

  // ── إضافة موظف ──────────────────────────────────────
  const addEmployee = async () => {
    if (!empForm.name.trim()||(!Number(empForm.baseDin)&&!Number(empForm.baseDol))) return;
    const pw=window.prompt("🔒 أدخل الباسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    await addDoc(collection(db,"employees"),{
      name:empForm.name.trim(), branch:empForm.branch, role:empForm.role,
      baseDin:Number(empForm.baseDin)||0, baseDol:Number(empForm.baseDol)||0,
      hireDate:empForm.hireDate, note:empForm.note.trim(),
      status:"active", createdAt:new Date().toISOString()
    });
    setEmpForm({name:"",branch:"إشراف",role:"عامل",baseDin:"",baseDol:"",
      hireDate:new Date().toISOString().split("T")[0],note:""});
    setTab("list");
  };

  // ── صرف راتب ─────────────────────────────────────────
  // جلب OT الموظف للشهر المحدد
  const empOT = React.useMemo(()=>{
    if(!selEmp) return [];
    return otRecords.filter(r=>
      // مطابقة بالـ ID أولاً (الأدق)
      r.empId===selEmp.id ||
      // ثم بالاسم كـ fallback
      (r.workerName||"").trim()===( selEmp.name||"").trim()
    );
  },[selEmp,otRecords]);

  const empOTPayDin = React.useMemo(()=>{
    if(!selEmp||!selEmp.baseDin) return 0;
    const WORK_DAYS=26,WORK_HOURS=10;
    const totalHours=empOT.reduce((s,r)=>s+(Number(r.hours)||0),0);
    return Math.round(selEmp.baseDin/WORK_DAYS/WORK_HOURS*totalHours);
  },[empOT,selEmp]);

  // تطبيق OT تلقائياً على extraDin لما يُختار موظف
  React.useEffect(()=>{
    if(empOTPayDin>0 && selEmp){
      setSalForm(f=>({...f, extraDin:String(empOTPayDin)}));
    }
  },[selEmp?.id, empOTPayDin]);

  const calcSalary = () => {
    const extra   = Number(salForm.extraDin)||0;
    const deduct  = Number(salForm.deductDin)||0;
    const absence = Number(salForm.absenceDays)||0;
    const currency = salForm.currency || "دينار";
    if (currency === "دولار") {
      const netDol = Math.max(0,(selEmp?.baseDol||0)+(Number(salForm.extraDol)||0)-(Number(salForm.deductDol)||0));
      return {extra:0,deduct:0,absence:0,dayRate:0,absAmt:0,netDin:0,netDol};
    }
    const dayRate = selEmp ? Math.round((selEmp.baseDin||0)/30) : 0;
    const absAmt  = dayRate * absence;
    const netDin  = Math.max(0,(selEmp?.baseDin||0)+extra-deduct-absAmt);
    return {extra,deduct,absence,dayRate,absAmt,netDin,netDol:0};
  };

  const printSalarySlip = (emp, sal, fund) => {
    const today = new Date().toISOString().split("T")[0];
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:30px;direction:rtl;max-width:420px}
.hdr{text-align:center;border-bottom:3px solid #1E293B;padding-bottom:12px;margin-bottom:14px}
.co{font-size:18px;font-weight:700}.ca{font-size:11px;color:#64748B}
.title{font-size:15px;font-weight:700;color:#1E293B;margin:12px 0 10px}
.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F1F5F9}
.lbl{font-size:12px;color:#64748B}.val{font-size:12px;font-weight:700;color:#1E293B}
.tot{background:#F0FDF4;border-radius:10px;padding:14px;margin:14px 0;text-align:center}
.footer{text-align:center;font-size:10px;color:#94A3B8;margin-top:16px;border-top:1px dashed #E2E8F0;padding-top:10px}
</style></head><body>
<div class="hdr"><div class="co">شركة باب المشاريع</div><div class="ca">بغداد</div></div>
<div class="title">🧾 وثيقة صرف راتب</div>
<div class="row"><span class="lbl">الموظف</span><span class="val">${emp.name}</span></div>
<div class="row"><span class="lbl">الفرع</span><span class="val">${emp.branch}</span></div>
<div class="row"><span class="lbl">الوظيفة</span><span class="val">${emp.role||""}</span></div>
<div class="row"><span class="lbl">الشهر</span><span class="val">${sal.month}</span></div>
<div class="row"><span class="lbl">الصندوق</span><span class="val">${fund}</span></div>
<div class="row"><span class="lbl">الراتب الأساسي</span><span class="val">${fNum(emp.baseDin||0)} د.ع</span></div>
${sal.extra>0?`<div class="row"><span class="lbl">بدلات إضافية</span><span class="val" style="color:#16A34A">+${fNum(sal.extra)} د.ع</span></div>`:""}
${sal.deduct>0?`<div class="row"><span class="lbl">خصومات</span><span class="val" style="color:#DC2626">-${fNum(sal.deduct)} د.ع</span></div>`:""}
${sal.absence>0?`<div class="row"><span class="lbl">غياب (${sal.absence} يوم)</span><span class="val" style="color:#DC2626">-${fNum(sal.absAmt)} د.ع</span></div>`:""}
<div class="tot">
  <div style="font-size:11px;color:#64748B;margin-bottom:4px">صافي الراتب</div>
  <div style="font-size:26px;font-weight:700;color:#16A34A">${fNum(sal.netDin)} د.ع</div>
  ${sal.netDol>0?`<div style="font-size:16px;font-weight:700;color:#2563EB">${fNum(sal.netDol)} $</div>`:""}
  <div style="font-size:12px;color:#64748B;margin-top:4px">✍️ ${w2(sal.netDin)} دينار عراقي</div>
</div>
${sal.note?`<div class="row"><span class="lbl">ملاحظة</span><span class="val">${sal.note}</span></div>`:""}
<div class="footer">توقيع الموظف: _______________&nbsp;&nbsp;&nbsp;توقيع المسؤول: _______________<br/>طُبع: ${today}</div>
</body></html>`;
    const w=window.open("","_blank","width=500,height=700");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),600);
  };

  const paySalary = async (withPrint=false) => {
    if (!selEmp) return;
    const sal = calcSalary();
    const fundId = selEmp.branch; // مثبّت على صندوق الموظف
    const bal = funds[fundId]||{din:0,dol:0};

    // التحقق من الرصيد
    if(sal.netDin > bal.din){
      alert("⛔ رصيد صندوق "+fundId+" غير كافٍ — المطلوب: "+fNum(sal.netDin)+" د.ع، المتاح: "+fNum(bal.din)+" د.ع");
      return;
    }

    const pw=window.prompt("🔒 صرف راتب "+selEmp.name+" — أدخل الباسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}

    await setDoc(doc(db,"funds",fundId),
      {din:bal.din-sal.netDin, dol:Math.max(0,bal.dol-sal.netDol)},{merge:true});
    await addDoc(collection(db,"fund_txs"),{
      fundId, fundLabel:fundId, type:"صرف",
      din:sal.netDin, dol:sal.netDol,
      note:"راتب "+selEmp.name+" — "+salForm.month,
      date:salForm.month+"-01", createdAt:new Date().toISOString()
    });
    await addDoc(collection(db,"salaries"),{
      empId:selEmp.id, empName:selEmp.name,
      branch:selEmp.branch, role:selEmp.role||"",
      fund:fundId, month:salForm.month,
      baseDin:selEmp.baseDin||0, baseDol:selEmp.baseDol||0,
      extraDin:sal.extra, deductDin:sal.deduct,
      absenceDays:sal.absence, absenceAmtDin:sal.absAmt,
      netDin:sal.netDin, netDol:sal.netDol,
      note:salForm.note, createdAt:new Date().toISOString()
    });

    if(withPrint) printSalarySlip(selEmp, {...sal, month:salForm.month, note:salForm.note}, fundId);

    // إغلاق سجلات OT بحالة "صُرف مع الراتب"
    for(const ot of empOT){
      await updateDoc(doc(db,"overtime_records",ot.id),{
        status:"paid_with_salary",
        paidMonth:salForm.month,
        paidAt:new Date().toISOString()
      });
    }

    setSelEmp(null); setTab("list");
    setSalForm({month:new Date().toISOString().slice(0,7),fund:"",currency:"دينار",
      extraDin:"0",extraDol:"0",deductDin:"0",deductDol:"0",absenceDays:"0",note:""});
  };

  // ── سلفة ─────────────────────────────────────────────
  const payAdvance = async () => {
    if(!selEmp) return;
    const din=Number(advForm.din)||0, dol=Number(advForm.dol)||0;
    if(!din&&!dol) return;
    const bal=funds[selEmp.branch]||{din:0,dol:0};
    if(din>bal.din){alert("⛔ رصيد الصندوق غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع");return;}
    const pw=window.prompt("🔒 أدخل الباسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    await setDoc(doc(db,"funds",selEmp.branch),
      {din:bal.din-din,dol:bal.dol-dol},{merge:true});
    await addDoc(collection(db,"fund_txs"),{
      fundId:selEmp.branch, fundLabel:selEmp.branch, type:"صرف",
      din, dol, note:"سلفة: "+selEmp.name,
      date:advForm.date, createdAt:new Date().toISOString()
    });
    await addDoc(collection(db,"advances"),{
      empId:selEmp.id, empName:selEmp.name, branch:selEmp.branch,
      din, dol, date:advForm.date, note:advForm.note,
      status:"pending", createdAt:new Date().toISOString()
    });
    alert("✅ تم صرف السلفة — "+fNum(din)+(din>0?" د.ع":"")+((dol>0&&din>0)?" | ":"")+fNum(dol)+(dol>0?" $":""));
    setSelEmp(null); setTab("list");
    setAdvForm({din:"",dol:"",date:new Date().toISOString().split("T")[0],note:""});
  };

  const filtered = filter==="all" ? employees : employees.filter(e=>e.branch===filter);
  const totalBaseDin = filtered.reduce((s,e)=>s+(e.baseDin||0),0);

  // ── واجهة الموظفين ────────────────────────────────────
  const getEmpAdvances = id => advances.filter(a=>a.empId===id&&a.status==="pending");
  const getEmpSalaries = id => salaries.filter(s=>s.empId===id);

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"22px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>← رجوع</button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#0F172A,#1E293B)",
          borderRadius:16,padding:"20px 24px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>👷 نظام الرواتب والموظفين</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {otRecords.length>0&&(
                <button onClick={()=>setTab("overtime")} style={{
                  background:tab==="overtime"?"#F97316":"#FFF7ED",
                  border:"2px solid #F97316",borderRadius:10,
                  padding:"9px 14px",color:tab==="overtime"?"#fff":"#F97316",
                  cursor:"pointer",fontFamily:"Tahoma",
                  fontSize:12,fontWeight:700,position:"relative"}}>
                  ⏱️ أوفرتايم
                  <span style={{position:"absolute",top:-8,left:-8,
                    background:"#DC2626",color:"#fff",borderRadius:"50%",
                    width:18,height:18,fontSize:10,fontWeight:700,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {otRecords.length}
                  </span>
                </button>
              )}
              <button onClick={()=>setTab(tab==="add_emp"?"list":"add_emp")} style={{
                background:tab==="add_emp"?"#475569":"#3B82F6",border:"none",borderRadius:10,
                padding:"9px 18px",color:"#fff",cursor:"pointer",fontFamily:"Tahoma",
                fontSize:13,fontWeight:700}}>
                {tab==="add_emp"?"✕ إلغاء":"+ موظف جديد"}
              </button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {EMP_BRANCHES.map(b=>{
              const list=employees.filter(e=>e.branch===b);
              const tot=list.reduce((s,e)=>s+(e.baseDin||0),0);
              return (
                <div key={b} style={{background:"rgba(255,255,255,0.08)",
                  borderRadius:10,padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#94A3B8",marginBottom:4}}>{b}</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{list.length}</div>
                  <div style={{fontSize:10,color:"#60A5FA",marginTop:2}}>{fNum(tot)} د.ع/شهر</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* إضافة موظف */}
        {tab==="add_emp" && (
          <div style={{background:"#fff",borderRadius:14,padding:20,
            border:"1px solid #E2E8F0",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:16}}>
              + تسجيل موظف جديد
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الاسم *</div>
                <input placeholder="اسم الموظف..." value={empForm.name}
                  onChange={e=>ef("name")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>تاريخ التعيين</div>
                <input type="date" value={empForm.hireDate}
                  onChange={e=>ef("hireDate")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الفرع</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {EMP_BRANCHES.map(b=>(
                    <button key={b} onClick={()=>ef("branch")(b)} style={{
                      border:"1.5px solid "+(empForm.branch===b?"#1E293B":"#E2E8F0"),
                      borderRadius:8,padding:"8px",cursor:"pointer",fontFamily:"Tahoma",
                      fontSize:12,fontWeight:600,
                      background:empForm.branch===b?"#1E293B":"#fff",
                      color:empForm.branch===b?"#fff":"#64748B"}}>{b}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الوظيفة</div>
                <select value={empForm.role} onChange={e=>ef("role")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                  {EMP_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              {[{k:"baseDin",l:"الراتب الأساسي دينار",c:"#D97706"},
                {k:"baseDol",l:"الراتب الأساسي دولار",c:"#2563EB"}].map(({k,l,c})=>(
                <div key={k}>
                  <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                  <input type="text" inputMode="numeric" placeholder="٠" value={empForm[k]}
                    onChange={e=>ef(k)(e.target.value.replace(/[^0-9]/g,""))}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  {Number(empForm[k])>0&&(
                    <div style={{fontSize:11,color:c,marginTop:3}}>
                      ✍️ {w2(Number(empForm[k]))} {k==="baseDin"?"دينار":"دولار"} شهرياً
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addEmployee} style={{
              width:"100%",border:"none",borderRadius:10,padding:"13px",
              fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
              background:empForm.name.trim()&&(Number(empForm.baseDin)||Number(empForm.baseDol))
                ?"#1E293B":"#E2E8F0",
              color:empForm.name.trim()&&(Number(empForm.baseDin)||Number(empForm.baseDol))
                ?"#fff":"#94A3B8"}}>
              ✅ تسجيل الموظف
            </button>
          </div>
        )}

        {/* ─── أوفرتايم المعمل ─── */}
        {tab==="overtime" && (
          <OvertimePendingSection otRecords={otRecords} funds={funds} employees={employees}/>
        )}

        {/* فورم الراتب */}
        {tab==="salary" && selEmp && (
          <div style={{background:"#fff",borderRadius:14,padding:20,
            border:"2px solid #16A34A",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>
                💰 صرف راتب — {selEmp.name}
              </div>
              <button onClick={()=>{setTab("list");setSelEmp(null);}} style={{
                background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#64748B"}}>✕</button>
            </div>

            {/* ملخص الراتب */}
            <div style={{background:"#F0FDF4",borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,fontSize:12}}>
                <div style={{textAlign:"center"}}>
                  <div style={{color:"#64748B",marginBottom:3}}>الراتب الأساسي</div>
                  <div style={{fontWeight:700,fontSize:16,color:"#16A34A"}}>{fNum(selEmp.baseDin||0)} د.ع</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{color:"#64748B",marginBottom:3}}>+ إضافي</div>
                  <div style={{fontWeight:700,fontSize:16,color:"#2563EB"}}>
                    {fNum(Number(salForm.extraDin)||0)} د.ع
                  </div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{color:"#64748B",marginBottom:3}}>= الصافي</div>
                  <div style={{fontWeight:700,fontSize:16,color:"#1E293B"}}>
                    {fNum(Math.max(0,(selEmp.baseDin||0)+(Number(salForm.extraDin)||0)
                      -(Number(salForm.deductDin)||0)
                      -Math.round((selEmp.baseDin||0)/30*(Number(salForm.absenceDays)||0))))} د.ع
                  </div>
                </div>
              </div>
            </div>

            {/* بطاقة الأوفرتايم */}
            {empOT.length>0&&(
              <div style={{background:"#FFF7ED",borderRadius:12,
                padding:14,marginBottom:14,border:"2px solid #F97316"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#F97316"}}>
                    ⏱️ أوفرتايم مستحق هذا الشهر
                  </span>
                  <span style={{fontSize:12,fontWeight:700,color:"#F97316"}}>
                    {empOT.reduce((s,r)=>s+(Number(r.hours)||0),0)} ساعة
                  </span>
                </div>
                {empOT.map(ot=>(
                  <div key={ot.id} style={{display:"flex",justifyContent:"space-between",
                    padding:"5px 0",borderBottom:"1px solid #FED7AA",fontSize:11}}>
                    <span style={{color:"#92400E"}}>📅 {ot.date} · {ot.source}</span>
                    <span style={{fontWeight:700,color:"#F97316"}}>{ot.hours} ساعة</span>
                  </div>
                ))}
                <div style={{marginTop:10,display:"flex",justifyContent:"space-between",
                  fontSize:12,fontWeight:700}}>
                  <span style={{color:"#92400E"}}>تكلفة الأوفرتايم</span>
                  <span style={{color:"#DC2626",fontSize:14}}>
                    {fNum(empOTPayDin)} د.ع
                  </span>
                </div>
                <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>
                  ✅ أُضيف تلقائياً لحقل "إضافي" أدناه
                </div>
              </div>
            )}

            {/* الصندوق المخصص للموظف */}
            {(()=>{
              const fundId = selEmp?.branch||"";
              const bal = funds[fundId]||{din:0,dol:0};
              const {netDin} = calcSalary();
              const ok = bal.din >= netDin;
              return (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:8}}>
                    الصندوق المصدر
                  </div>
                  <div style={{borderRadius:10,padding:"12px 14px",
                    background:ok?"#F0FDF4":"#FFF1F2",
                    border:"2px solid "+(ok?"#16A34A":"#DC2626")}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,
                          color:ok?"#16A34A":"#DC2626"}}>
                          {fundId==="عام"?"🏦":"🏗️"} صندوق {fundId}
                        </div>
                        <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                          الرصيد المتاح: {fNum(bal.din)} د.ع
                        </div>
                      </div>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:11,color:"#64748B"}}>المطلوب</div>
                        <div style={{fontSize:14,fontWeight:700,
                          color:ok?"#16A34A":"#DC2626"}}>{fNum(netDin)} د.ع</div>
                      </div>
                    </div>
                    {!ok&&(
                      <div style={{marginTop:8,fontSize:11,color:"#DC2626",fontWeight:600}}>
                        ⛔ الرصيد غير كافٍ — العجز: {fNum(netDin-bal.din)} د.ع
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:11,color:"#94A3B8",marginTop:5}}>
                    🔒 الصندوق مثبّت على صندوق {fundId} — لا يمكن الصرف من صندوق آخر
                  </div>
                </div>
              );
            })()}

            {/* اختيار العملة */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:8}}>العملة</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {v:"دينار",l:"🇮🇶 دينار عراقي",c:"#D97706",
                   base:selEmp?.baseDin||0,available:(selEmp?.baseDin||0)>0},
                  {v:"دولار",l:"🇺🇸 دولار أمريكي",c:"#2563EB",
                   base:selEmp?.baseDol||0,available:(selEmp?.baseDol||0)>0},
                ].map(({v,l,c,base,available})=>(
                  <button key={v} onClick={()=>sf("currency")(v)}
                    disabled={!available}
                    style={{
                      border:"2px solid "+(salForm.currency===v?c:"#E2E8F0"),
                      borderRadius:10,padding:"10px",cursor:available?"pointer":"not-allowed",
                      fontFamily:"Tahoma",textAlign:"center",
                      background:salForm.currency===v?c+"18":"#fff",
                      opacity:available?1:0.5}}>
                    <div style={{fontSize:12,fontWeight:700,color:salForm.currency===v?c:"#64748B"}}>
                      {l}
                    </div>
                    <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>
                      {fNum(base)} {v==="دينار"?"د.ع":"$"} / شهر
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الشهر</div>
                <input type="month" value={salForm.month}
                  onChange={e=>sf("month")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"#DC2626",fontWeight:600,marginBottom:5}}>
                  أيام الغياب
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={salForm.absenceDays}
                  onChange={e=>sf("absenceDays")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                {Number(salForm.absenceDays)>0&&(
                  <div style={{fontSize:11,color:"#DC2626",marginTop:3}}>
                    خصم: {fNum(Math.round((selEmp.baseDin||0)/30*Number(salForm.absenceDays)))} د.ع
                  </div>
                )}
              </div>
              <div>
                <div style={{fontSize:12,color:"#16A34A",fontWeight:600,marginBottom:5}}>
                  بدل إضافي دينار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={salForm.extraDin}
                  onChange={e=>sf("extraDin")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"#DC2626",fontWeight:600,marginBottom:5}}>
                  خصومات دينار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={salForm.deductDin}
                  onChange={e=>sf("deductDin")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
              <input placeholder="أي ملاحظة..." value={salForm.note}
                onChange={e=>sf("note")(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
            </div>
            {(()=>{
              const {netDin}=calcSalary();
              const fundId=salForm.fund||selEmp.branch;
              const bal=funds[fundId]||{din:0,dol:0};
              const ok=bal.din>=netDin;
              return (
                <>
                  {!ok&&(
                    <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px 14px",
                      marginBottom:10,fontSize:12,color:"#DC2626",fontWeight:600}}>
                      ⛔ رصيد صندوق {fundId} غير كافٍ — المتاح: {fNum(bal.din)} د.ع
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
                    <button onClick={()=>paySalary(false)} disabled={!ok} style={{
                      border:"none",borderRadius:10,padding:"13px",
                      fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:ok?"pointer":"not-allowed",
                      background:ok?"#16A34A":"#E2E8F0",color:ok?"#fff":"#94A3B8"}}>
                      ✅ صرف الراتب
                    </button>
                    <button onClick={()=>paySalary(true)} disabled={!ok} style={{
                      border:"1px solid "+(ok?"#16A34A":"#E2E8F0"),borderRadius:10,
                      padding:"13px 16px",fontSize:13,fontWeight:700,fontFamily:"Tahoma",
                      cursor:ok?"pointer":"not-allowed",background:"#fff",
                      color:ok?"#16A34A":"#94A3B8",whiteSpace:"nowrap"}}>
                      🖨️ صرف وطباعة
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* فورم السلفة */}
        {tab==="advance" && selEmp && (
          <div style={{background:"#fff",borderRadius:14,padding:20,
            border:"2px solid #F97316",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#F97316"}}>
                📤 سلفة — {selEmp.name}
              </div>
              <button onClick={()=>{setTab("list");setSelEmp(null);}} style={{
                background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#64748B"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {[{k:"din",l:"المبلغ دينار",c:"#D97706"},{k:"dol",l:"المبلغ دولار",c:"#2563EB"}].map(({k,l,c})=>(
                <div key={k}>
                  <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                  <input type="text" inputMode="numeric" placeholder="٠" value={advForm[k]}
                    onChange={e=>af(k)(e.target.value.replace(/[^0-9]/g,""))}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  {Number(advForm[k])>0&&(
                    <div style={{fontSize:11,color:c,marginTop:3}}>
                      ✍️ {w2(Number(advForm[k]))} {k==="din"?"دينار":"دولار"}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>التاريخ</div>
                <input type="date" value={advForm.date} onChange={e=>af("date")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
                <input placeholder="سبب السلفة..." value={advForm.note}
                  onChange={e=>af("note")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
            </div>
            <button onClick={payAdvance} style={{
              width:"100%",border:"none",borderRadius:10,padding:"13px",
              fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
              background:"#F97316",color:"#fff"}}>
              ✅ صرف السلفة من صندوق {selEmp.branch}
            </button>
          </div>
        )}

        {/* فلاتر الأفرع */}
        {tab==="list" && (
          <>
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
              {["all",...EMP_BRANCHES].map(b=>(
                <button key={b} onClick={()=>setFilter(b)} style={{
                  border:"1.5px solid "+(filter===b?"#1E293B":"#E2E8F0"),
                  borderRadius:9,padding:"8px 14px",cursor:"pointer",
                  fontFamily:"Tahoma",fontSize:12,fontWeight:600,
                  background:filter===b?"#1E293B":"#fff",
                  color:filter===b?"#fff":"#64748B"}}>
                  {b==="all"?"الكل":b}
                  <span style={{marginRight:4,fontSize:11,opacity:0.7}}>
                    ({b==="all"?employees.length:employees.filter(e=>e.branch===b).length})
                  </span>
                </button>
              ))}
              <div style={{marginRight:"auto",fontSize:12,color:"#64748B",
                padding:"8px 14px",background:"#fff",borderRadius:9,border:"1px solid #E2E8F0"}}>
                🇮🇶 <strong style={{color:"#D97706"}}>{fNum(totalBaseDin)} د.ع/شهر</strong>
                {filtered.reduce((s,e)=>s+(e.baseDol||0),0)>0&&(
                  <span> | 🇺🇸 <strong style={{color:"#2563EB"}}>{fNum(filtered.reduce((s,e)=>s+(e.baseDol||0),0))} $/شهر</strong></span>
                )}
              </div>
            </div>

            {/* قائمة الموظفين */}
            {filtered.length===0 ? (
              <div style={{background:"#fff",borderRadius:14,padding:40,
                textAlign:"center",color:"#94A3B8",border:"1px solid #E2E8F0"}}>
                <div style={{fontSize:40,marginBottom:8}}>👷</div>
                <div>ما في موظفين في هذا الفرع</div>
              </div>
            ) : (
              <div style={{display:"grid",gap:10}}>
                {filtered.map(emp=>{
                  const empAdv = getEmpAdvances(emp.id);
                  const empSal = getEmpSalaries(emp.id);
                  const totalAdvDin = empAdv.reduce((s,a)=>s+(a.din||0),0);
                  return (
                    <div key={emp.id} style={{background:"#fff",borderRadius:14,
                      padding:"16px 18px",border:"1px solid #E2E8F0",
                      borderRight:"5px solid #1E293B"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto",
                        gap:12,alignItems:"start"}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                            <span style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>{emp.name}</span>
                            <span style={{fontSize:11,color:"#fff",background:"#1E293B",
                              borderRadius:20,padding:"2px 10px"}}>{emp.branch}</span>
                            <span style={{fontSize:11,color:"#64748B"}}>{emp.role}</span>
                          </div>
                          <div style={{display:"flex",gap:12,fontSize:12,flexWrap:"wrap"}}>
                            {(emp.baseDin||0)>0&&(
                              <span style={{color:"#D97706",fontWeight:700}}>
                                🇮🇶 {fNum(emp.baseDin)} د.ع/شهر
                              </span>
                            )}
                            {(emp.baseDol||0)>0&&(
                              <span style={{color:"#2563EB",fontWeight:700}}>
                                🇺🇸 {fNum(emp.baseDol)} $/شهر
                              </span>
                            )}
                            {totalAdvDin>0&&(
                              <span style={{color:"#F97316",fontWeight:600}}>
                                📤 سلف: {fNum(totalAdvDin)} د.ع
                              </span>
                            )}
                            {empSal.length>0&&(
                              <span style={{color:"#64748B"}}>
                                ✅ {empSal.length} راتب مصروف
                              </span>
                            )}
                            <span style={{color:"#94A3B8"}}>📅 {emp.hireDate}</span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setSelEmp(emp);setTab("salary");}} style={{
                            background:"#F0FDF4",border:"1px solid #16A34A",
                            borderRadius:9,padding:"7px 12px",cursor:"pointer",
                            fontSize:12,fontFamily:"Tahoma",fontWeight:700,color:"#16A34A"}}>
                            💰 راتب
                          </button>
                          <button onClick={()=>{setSelEmp(emp);setTab("advance");}} style={{
                            background:"#FFF7ED",border:"1px solid #F97316",
                            borderRadius:9,padding:"7px 12px",cursor:"pointer",
                            fontSize:12,fontFamily:"Tahoma",fontWeight:700,color:"#F97316"}}>
                            📤 سلفة
                          </button>
                          <button onClick={()=>openEdit(emp)} style={{
                            background:"#F1F5F9",border:"1px solid #94A3B8",
                            borderRadius:9,padding:"7px 12px",cursor:"pointer",
                            fontSize:12,fontFamily:"Tahoma",fontWeight:700,color:"#475569"}}>
                            ✏️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* نافذة التعديل */}
        {editEmp && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
            zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:440,
              maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.35)"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>✏️ تعديل — {editEmp.name}</div>
                <button onClick={()=>setEditEmp(null)} style={{background:"none",
                  border:"none",fontSize:20,cursor:"pointer",color:"#64748B"}}>✕</button>
              </div>
              <div style={{padding:"18px 20px"}}>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الاسم</div>
                  <input value={editForm.name||""} onChange={e=>ef2("name")(e.target.value)}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الفرع / الصندوق</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                    {EMP_BRANCHES.map(b=>(
                      <button key={b} onClick={()=>ef2("branch")(b)} style={{
                        border:"1.5px solid "+(editForm.branch===b?"#1E293B":"#E2E8F0"),
                        borderRadius:8,padding:"7px 4px",cursor:"pointer",fontFamily:"Tahoma",
                        fontSize:11,fontWeight:600,
                        background:editForm.branch===b?"#1E293B":"#fff",
                        color:editForm.branch===b?"#fff":"#64748B"}}>{b}</button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الوظيفة</div>
                  <select value={editForm.role||""} onChange={e=>ef2("role")(e.target.value)}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                    {EMP_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  {[{k:"baseDin",l:"راتب دينار",c:"#D97706"},{k:"baseDol",l:"راتب دولار",c:"#2563EB"}].map(({k,l,c})=>(
                    <div key={k}>
                      <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                      <input type="text" inputMode="numeric" placeholder="٠"
                        value={editForm[k]||""}
                        onChange={e=>ef2(k)(e.target.value.replace(/[^0-9]/g,""))}
                        style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                          padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                          direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                      {Number(editForm[k])>0&&(
                        <div style={{fontSize:10,color:c,marginTop:2}}>
                          ✍️ {w2(Number(editForm[k]))} {k==="baseDin"?"دينار":"دولار"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>تاريخ التعيين</div>
                    <input type="date" value={editForm.hireDate||""}
                      onChange={e=>ef2("hireDate")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
                    <input value={editForm.note||""} onChange={e=>ef2("note")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                </div>
                <button onClick={saveEdit} style={{
                  width:"100%",border:"none",borderRadius:10,padding:"13px",
                  fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                  background:"#1E293B",color:"#fff"}}>
                  ✅ حفظ التعديل
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── صفحة التقارير ───────────────────────────────────
export function ReportsPage({ funds, projects, onBack }) {
  const [reportType, setReportType] = useState(""); 
  // projects | funds | partners | summary
  const [filters, setFilters] = useState({
    fromDate:"", toDate:"", status:"all",
    projType:"all", fundId:"all", partnerId:"all"
  });
  const sf = k => v => setFilters(f=>({...f,[k]:v}));

  const [projTxs,    setProjTxs]    = useState([]);
  const [fundTxs,    setFundTxs]    = useState([]);
  const [partnerTxs, setPartnerTxs] = useState([]);
  const [assets,     setAssets]     = useState([]);
  const [rptSalaries,setRptSalaries]= useState([]);
  const [rptEmps,    setRptEmps]    = useState([]);

  useEffect(()=>{
    const u1 = onSnapshot(collection(db,"project_txs"), s=>{
      setProjTxs(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u2 = onSnapshot(collection(db,"fund_txs"), s=>{
      setFundTxs(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u3 = onSnapshot(collection(db,"partner_txs"), s=>{
      setPartnerTxs(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u4 = onSnapshot(collection(db,"assets"), s=>{
      setAssets(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u5 = onSnapshot(collection(db,"salaries"), s=>{
      setRptSalaries(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u6 = onSnapshot(collection(db,"employees"), s=>{
      setRptEmps(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    return ()=>{u1();u2();u3();u4();u5();u6();};
    // ملاحظة: advances مو محتاج هنا
  },[]);

  const REPORT_TYPES = [
    {id:"projects",  label:"تقرير المشاريع",    icon:"🏗️", color:"#D97706", bg:"#FFFBEB"},
    {id:"funds",     label:"تقرير الصناديق",    icon:"💎", color:"#059669", bg:"#ECFDF5"},
    {id:"partners",  label:"تقرير الشركاء",     icon:"👥", color:"#9333EA", bg:"#FAF5FF"},
    {id:"assets",    label:"تقرير الأصول",      icon:"📦", color:"#0891B2", bg:"#ECFEFF"},
    {id:"employees", label:"تقرير الموظفين",    icon:"👤", color:"#0F172A", bg:"#F1F5F9"},
    {id:"salaries",  label:"تقرير الرواتب",     icon:"👷", color:"#16A34A", bg:"#F0FDF4"},
    {id:"summary",   label:"التقرير الشامل",    icon:"📊", color:"#1D4ED8", bg:"#EFF6FF"},
  ];

  const PROJ_TYPES = ["إشراف","ديكور","مقاولات","واجهات"];
  const PARTNERS_LIST = [
    {id:"partner_إيهاب",name:"م. إيهاب"},
    {id:"partner_أحمد", name:"م. أحمد"},
    {id:"partner_نور",  name:"م. نور"},
    {id:"partner_محمد", name:"م. محمد"},
  ];

  const filterDate = t =>
    (!filters.fromDate || (t.date||"") >= filters.fromDate) &&
    (!filters.toDate   || (t.date||"") <= filters.toDate);

  // ── بناء التقرير ──────────────────────────────────
  const buildReport = () => {
    const today = new Date().toISOString().split("T")[0];
    const period = (filters.fromDate||"البداية") + " — " + (filters.toDate||"اليوم");
    let html = "";

    const STYLE = `<style>
      *{font-family:Tahoma,Arial}body{margin:22px;direction:rtl}
      .hdr{text-align:center;border-bottom:3px solid #1E3A5F;padding-bottom:12px;margin-bottom:14px}
      .co{font-size:20px;font-weight:700}.ca{font-size:11px;color:#64748B}
      .title{font-size:17px;font-weight:700;color:#1E3A5F;margin:12px 0 4px}
      .info{font-size:11px;color:#64748B;margin-bottom:14px}
      .sg{display:grid;gap:8px;margin-bottom:14px}
      .sb{border-radius:9px;padding:11px;text-align:center;background:#F8FAFC}
      .sl{font-size:9px;color:#64748B;margin-bottom:3px}.sv{font-size:14px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}
      thead tr{background:#1E3A5F}th{color:#fff;padding:8px 7px;font-size:10px}
      td{padding:7px;font-size:10px;text-align:center;border-bottom:1px solid #F1F5F9}
      .tot td{background:#F1F5F9;font-weight:700;border-top:2px solid #1E3A5F}
      h3{font-size:13px;color:#1E3A5F;margin:16px 0 8px;border-bottom:1px solid #E2E8F0;padding-bottom:5px}
      .ft{margin-top:14px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between;border-top:1px dashed #E2E8F0;padding-top:8px}
    </style>`;

    const HDR = `<div class="hdr"><div class="co">شركة باب المشاريع</div><div class="ca">بغداد — العرصات</div></div>`;

    if (reportType === "projects") {
      let list = projects;
      if (filters.status !== "all") list = list.filter(p=>p.status===filters.status);
      if (filters.projType !== "all") list = list.filter(p=>p.type===filters.projType);
      list.sort((a,b)=>(a.name||"").localeCompare(b.name||""));

      const totRecDin = list.reduce((s,p)=>s+(p.recDin||0),0);
      const totSpdDin = list.reduce((s,p)=>s+(p.spdDin||0),0);
      const totBalDin = list.reduce((s,p)=>s+(p.balDin||0),0);
      const totRecDol = list.reduce((s,p)=>s+(p.recDol||0),0);
      const totBalDol = list.reduce((s,p)=>s+(p.balDol||0),0);

      const rows = list.map((p,i)=>`<tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
        <td>${i+1}</td>
        <td style="text-align:right;font-weight:700">${p.name||""}</td>
        <td>${p.type||""}</td>
        <td>${p.province||""}</td>
        <td style="color:${p.status==="active"?"#16A34A":"#64748B"}">${p.status==="active"?"● نشط":"✓ منتهي"}</td>
        <td style="color:#16A34A">${fNum(p.recDin||0)} د.ع</td>
        <td style="color:#DC2626">${fNum(p.spdDin||0)} د.ع</td>
        <td style="color:#D97706;font-weight:700">${fNum(p.balDin||0)} د.ع</td>
        <td style="color:#2563EB;font-weight:700">${fNum(p.balDol||0)} $</td>
      </tr>`).join("");

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">🏗️ تقرير المشاريع</div>
<div class="info">
  ${filters.status==="all"?"كل المشاريع":filters.status==="active"?"قيد التنفيذ":"المنتهية"}
  ${filters.projType!=="all"?" · نوع: "+filters.projType:""}
  · إجمالي: ${list.length} مشروع
</div>
<div class="sg" style="grid-template-columns:repeat(4,1fr)">
  <div class="sb"><div class="sl">إجمالي المستلم</div><div class="sv" style="color:#16A34A">${fNum(totRecDin)} د.ع</div></div>
  <div class="sb"><div class="sl">إجمالي المصروف</div><div class="sv" style="color:#DC2626">${fNum(totSpdDin)} د.ع</div></div>
  <div class="sb" style="background:#FFFBEB"><div class="sl">ميزان الدينار</div><div class="sv" style="color:#D97706">${fNum(totBalDin)} د.ع</div></div>
  <div class="sb" style="background:#EFF6FF"><div class="sl">ميزان الدولار</div><div class="sv" style="color:#2563EB">${fNum(totBalDol)} $</div></div>
</div>
<table><thead><tr><th>#</th><th style="text-align:right">المشروع</th><th>النوع</th><th>المحافظة</th><th>الحالة</th><th>مستلم</th><th>مصروف</th><th>ميزان د.ع</th><th>ميزان $</th></tr></thead>
<tbody>${rows}</tbody>
<tr class="tot"><td colspan="4">الإجمالي</td><td></td><td style="color:#16A34A">${fNum(totRecDin)} د.ع</td><td style="color:#DC2626">${fNum(totSpdDin)} د.ع</td><td style="color:#D97706">${fNum(totBalDin)} د.ع</td><td style="color:#2563EB">${fNum(totBalDol)} $</td></tr>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "funds") {
      const selF = filters.fundId === "all" ? null : ALL_FUNDS.find(f=>f.id===filters.fundId);
      const fList = selF ? [selF] : ALL_FUNDS;
      const filtered = fundTxs.filter(t => filterDate(t) &&
        (filters.fundId==="all" || t.fundId===filters.fundId));

      let secHtml = "";
      fList.forEach(f=>{
        const fTxs = filtered.filter(t=>t.fundId===f.id)
          .sort((a,b)=>(a.date||"").localeCompare(b.date||""));
        if(!fTxs.length) return;
        let n=0, runDin=0;
        const rows = fTxs.map(t=>{
          n++;const isIn=t.type==="إيداع";
          const d=t.din||0;runDin+=isIn?d:-d;
          return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
            <td>${n}</td><td>${t.date||""}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"}">${isIn?"↓ إيداع":"↑ صرف"}</td>
            <td style="text-align:right">${t.note||"—"}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"+":"-"}${fNum(d)} د.ع</td>
            <td style="font-weight:700;color:#D97706">${fNum(runDin)} د.ع</td>
          </tr>`;
        }).join("");
        const bal = funds[f.id]||{din:0,dol:0};
        secHtml += `<h3>${f.icon} ${f.label} — الرصيد: ${fNum(bal.din)} د.ع</h3>
<table><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th style="text-align:right">البيان</th><th>المبلغ</th><th>الميزان</th></tr></thead>
<tbody>${rows}</tbody></table>`;
      });

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">💎 تقرير الصناديق</div>
<div class="info">الفترة: ${period} · ${filtered.length} حركة</div>
${secHtml}
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "partners") {
      const pList = filters.partnerId==="all" ? PARTNERS_LIST
        : PARTNERS_LIST.filter(p=>p.id===filters.partnerId);
      const filtered = partnerTxs.filter(filterDate);

      let secHtml = "";
      pList.forEach(p=>{
        const pTxs = filtered.filter(t=>t.partnerId===p.id)
          .sort((a,b)=>(a.date||"").localeCompare(b.date||""));
        const pf = funds[p.id]||{din:0,dol:0};
        let n=0, runDin=0;
        const rows = pTxs.map(t=>{
          n++;const isIn=t.type==="إيداع";
          const d=t.din||0;runDin+=isIn?d:-d;
          return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
            <td>${n}</td><td>${t.date||""}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"}">${isIn?"↓ إيداع":"↑ سحب"}</td>
            <td style="text-align:right">${t.note||"—"}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"+":"-"}${fNum(d)} د.ع</td>
            <td style="font-weight:700;color:#9333EA">${fNum(runDin)} د.ع</td>
          </tr>`;
        }).join("");
        secHtml += `<h3>👤 ${p.name} — الرصيد: ${fNum(pf.din)} د.ع${pf.dol>0?" | "+fNum(pf.dol)+" $":""}</h3>
${pTxs.length?`<table><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th style="text-align:right">البيان</th><th>المبلغ</th><th>الميزان</th></tr></thead><tbody>${rows}</tbody></table>`:"<p style='color:#94A3B8;font-size:11px'>ما في حركات في هذه الفترة</p>"}`;
      });

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">👥 تقرير الشركاء</div>
<div class="info">الفترة: ${period}</div>
${secHtml}
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "assets") {
      let list = assets;
      if (filters.status !== "all") list = list.filter(a=>a.status===filters.status);
      list.sort((a,b)=>(a.date||"").localeCompare(b.date||""));

      const totBuyDin  = list.reduce((s,a)=>s+(a.valueDin||0),0);
      const totBuyDol  = list.reduce((s,a)=>s+(a.valueDol||0),0);
      const soldList   = list.filter(a=>a.status==="sold");
      const totSellDin = soldList.reduce((s,a)=>s+(a.sellPriceDin||0),0);
      const totProfDin = soldList.reduce((s,a)=>s+(a.profitDin||0),0);
      const totProfDol = soldList.reduce((s,a)=>s+(a.profitDol||0),0);

      const rows = list.map((a,i)=>`<tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
        <td>${i+1}</td>
        <td style="text-align:right;font-weight:700">${a.name||""}</td>
        <td>${a.type||""}</td>
        <td>${a.fund||""}</td>
        <td>${a.date||""}</td>
        <td style="color:#D97706;font-weight:700">${fNum(a.valueDin||0)} د.ع${(a.valueDol||0)>0?" | "+fNum(a.valueDol||0)+" $":""}</td>
        <td style="color:${a.status==="active"?"#0891B2":"#64748B"}">
          ${a.status==="active"?"● نشط":"✓ مباع"}
        </td>
        ${a.status==="sold"?`
          <td style="color:#16A34A;font-weight:700">${fNum(a.sellPriceDin||0)} د.ع</td>
          <td style="color:${(a.profitDin||0)>=0?"#16A34A":"#DC2626"};font-weight:700">
            ${(a.profitDin||0)>=0?"📈":""+" "}${fNum(Math.abs(a.profitDin||0))} د.ع
          </td>
          <td style="color:#64748B;font-size:10px">${a.sellDate||""}</td>
        `:"<td>—</td><td>—</td><td>—</td>"}
      </tr>`).join("");

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">📦 تقرير الأصول الثابتة</div>
<div class="info">
  ${filters.status==="all"?"كل الأصول":filters.status==="active"?"النشطة":"المباعة"}
  · ${list.length} أصل
  ${filters.fromDate||filters.toDate?" · الفترة: "+period:""}
</div>
<div class="sg" style="grid-template-columns:repeat(4,1fr)">
  <div class="sb"><div class="sl">عدد الأصول</div><div class="sv" style="color:#0891B2">${assets.filter(a=>a.status==="active").length} نشط</div></div>
  <div class="sb"><div class="sl">إجمالي الشراء دينار</div><div class="sv" style="color:#D97706">${fNum(totBuyDin)} د.ع</div></div>
  <div class="sb" style="background:${totProfDin>=0?"#F0FDF4":"#FFF1F2"}">
    <div class="sl">${totProfDin>=0?"📈 ربح البيع":"📉 خسارة البيع"}</div>
    <div class="sv" style="color:${totProfDin>=0?"#16A34A":"#DC2626"}">${fNum(Math.abs(totProfDin))} د.ع</div>
  </div>
  <div class="sb"><div class="sl">إجمالي الشراء دولار</div><div class="sv" style="color:#2563EB">${fNum(totBuyDol)} $</div></div>
</div>
<table>
  <thead><tr>
    <th>#</th><th style="text-align:right">اسم الأصل</th><th>النوع</th><th>الصندوق</th>
    <th>تاريخ الشراء</th><th>قيمة الشراء</th><th>الحالة</th>
    <th>سعر البيع</th><th>الربح/الخسارة</th><th>تاريخ البيع</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tr class="tot">
    <td colspan="4">الإجمالي</td><td></td>
    <td style="color:#D97706">${fNum(totBuyDin)} د.ع</td><td></td>
    <td style="color:#16A34A">${fNum(totSellDin)} د.ع</td>
    <td style="color:${totProfDin>=0?"#16A34A":"#DC2626"}">${fNum(Math.abs(totProfDin))} د.ع</td>
    <td></td>
  </tr>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "employees") {
      let list = rptEmps;
      if (filters.status !== "all") list = list.filter(e=>e.branch===filters.status);
      list = [...list].sort((a,b)=>(a.branch||"").localeCompare(b.branch||"")||(a.name||"").localeCompare(b.name||""));

      // تجميع حسب الفرع
      const branches = filters.status==="all"
        ? ["إشراف","ديكور","مقاولات","واجهات"]
        : [filters.status];

      let branchSections = "";
      let grandTotalDin=0, grandTotalDol=0, grandCount=0;

      branches.forEach(branch=>{
        const bList = list.filter(e=>e.branch===branch);
        if(!bList.length) return;
        const totDin = bList.reduce((s,e)=>s+(e.baseDin||0),0);
        const totDol = bList.reduce((s,e)=>s+(e.baseDol||0),0);
        grandTotalDin+=totDin; grandTotalDol+=totDol; grandCount+=bList.length;

        let n=0;
        const rows = bList.map(e=>{
          n++;
          const advTotal = 0; // السلف تُعرض في تقرير الرواتب
          return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
            <td>${n}</td>
            <td style="text-align:right;font-weight:700">${e.name||""}</td>
            <td>${e.role||""}</td>
            <td>${e.hireDate||""}</td>
            <td style="color:#D97706;font-weight:700">${(e.baseDin||0)>0?fNum(e.baseDin)+" د.ع":""}</td>
            <td style="color:#2563EB;font-weight:700">${(e.baseDol||0)>0?fNum(e.baseDol)+" $":""}</td>
            <td style="color:#F97316">${advTotal>0?fNum(advTotal)+" د.ع":""}</td>
          </tr>`;
        }).join("");

        branchSections += `
<h3 style="margin:18px 0 8px;font-size:14px;color:#1E293B;
  border-bottom:2px solid #1E293B;padding-bottom:6px">
  فرع ${branch} — ${bList.length} موظف | ${fNum(totDin)} د.ع/شهر
</h3>
<table style="margin-bottom:14px">
  <thead><tr>
    <th>#</th><th style="text-align:right">الموظف</th><th>الوظيفة</th>
    <th>تاريخ التعيين</th><th>راتب دينار</th><th>راتب دولار</th><th>سلف قائمة</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tr class="tot">
    <td colspan="3">إجمالي فرع ${branch}</td><td></td>
    <td style="color:#D97706">${fNum(totDin)} د.ع/شهر</td>
    <td style="color:#2563EB">${totDol>0?fNum(totDol)+" $/شهر":""}</td>
    <td></td>
  </tr>
</table>`;
      });

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">👤 تقرير الموظفين</div>
<div class="info">
  ${filters.status!=="all"?"فرع: "+filters.status+" · ":"كل الأفرع · "}
  ${grandCount} موظف
</div>
<div class="sg" style="grid-template-columns:repeat(5,1fr);margin-bottom:14px">
  <div class="sb"><div class="sl">إجمالي الموظفين</div><div class="sv" style="color:#0F172A">${grandCount}</div></div>
  ${["إشراف","ديكور","مقاولات","واجهات"].map(b=>`
  <div class="sb"><div class="sl">فرع ${b}</div>
    <div class="sv" style="color:#1E293B">${list.filter(e=>e.branch===b).length}</div>
    <div style="font-size:10px;color:#64748B">${fNum(list.filter(e=>e.branch===b).reduce((s,e)=>s+(e.baseDin||0),0))} د.ع</div>
  </div>`).join("")}
</div>
${branchSections}
<div class="ft">
  <span>شركة باب المشاريع — الإجمالي الشهري: ${fNum(grandTotalDin)} د.ع</span>
  <span>طُبع: ${today}</span>
</div>
</body></html>`;

    } else if (reportType === "salaries") {
      let list = rptSalaries.filter(s=>{
        if(filters.status!=="all" && s.branch!==filters.status) return false;
        if(filters.partnerId!=="all" && s.empId!==filters.partnerId) return false;
        if(fromDate && (s.month||"").slice(0,7)<fromDate.slice(0,7)) return false;
        if(toDate   && (s.month||"").slice(0,7)>toDate.slice(0,7))   return false;
        return true;
      }).sort((a,b)=>(b.month||"").localeCompare(a.month||"")||(a.empName||"").localeCompare(b.empName||""));

      const totNet  = list.reduce((s,r)=>s+(r.netDin||0),0);
      const totBase = list.reduce((s,r)=>s+(r.baseDin||0),0);
      const totEx   = list.reduce((s,r)=>s+(r.extraDin||0),0);
      const totDed  = list.reduce((s,r)=>s+(r.deductDin||0),0);
      const totAbs  = list.reduce((s,r)=>s+(r.absenceAmtDin||0),0);

      let n=0;
      const rows = list.map(r=>{
        n++;
        return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
          <td>${n}</td>
          <td style="text-align:right;font-weight:700">${r.empName||""}</td>
          <td>${r.branch||""}</td>
          <td>${r.role||""}</td>
          <td>${r.month||""}</td>
          <td>${r.fund||r.branch||""}</td>
          <td style="color:#1E293B">${fNum(r.baseDin||0)} د.ع</td>
          <td style="color:#16A34A">${(r.extraDin||0)>0?"+"+fNum(r.extraDin)+" د.ع":""}</td>
          <td style="color:#DC2626">${(r.deductDin||0)>0?"-"+fNum(r.deductDin)+" د.ع":""}</td>
          <td style="color:#DC2626">${(r.absenceDays||0)>0?r.absenceDays+" يوم / -"+fNum(r.absenceAmtDin||0)+" د.ع":""}</td>
          <td style="font-weight:700;color:#16A34A">${fNum(r.netDin||0)} د.ع</td>
        </tr>`;
      }).join("");

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">👷 تقرير الرواتب</div>
<div class="info">
  ${filters.status!=="all"?"فرع: "+filters.status+" · ":""}
  الفترة: ${period} · ${list.length} سجل
</div>
<div class="sg" style="grid-template-columns:repeat(5,1fr)">
  <div class="sb"><div class="sl">إجمالي الرواتب الأساسية</div><div class="sv" style="color:#1E293B">${fNum(totBase)} د.ع</div></div>
  <div class="sb" style="background:#F0FDF4"><div class="sl">إجمالي البدلات</div><div class="sv" style="color:#16A34A">+${fNum(totEx)} د.ع</div></div>
  <div class="sb" style="background:#FFF1F2"><div class="sl">إجمالي الخصومات</div><div class="sv" style="color:#DC2626">-${fNum(totDed+totAbs)} د.ع</div></div>
  <div class="sb" style="background:#F0FDF4;border:2px solid #16A34A"><div class="sl">إجمالي الصافي</div><div class="sv" style="color:#16A34A">${fNum(totNet)} د.ع</div></div>
  <div class="sb"><div class="sl">عدد السجلات</div><div class="sv" style="color:#0891B2">${list.length}</div></div>
</div>
<table>
  <thead><tr>
    <th>#</th><th style="text-align:right">الموظف</th><th>الفرع</th><th>الوظيفة</th>
    <th>الشهر</th><th>الصندوق</th><th>الأساسي</th><th>بدلات</th>
    <th>خصومات</th><th>غياب</th><th>الصافي</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tr class="tot"><td colspan="5">الإجمالي</td><td></td>
    <td>${fNum(totBase)} د.ع</td>
    <td style="color:#16A34A">+${fNum(totEx)} د.ع</td>
    <td style="color:#DC2626">-${fNum(totDed)} د.ع</td>
    <td style="color:#DC2626">-${fNum(totAbs)} د.ع</td>
    <td style="color:#16A34A;font-weight:700">${fNum(totNet)} د.ع</td>
  </tr>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "summary") {
      const fundsDin  = ALL_FUNDS.reduce((s,f)=>s+(funds[f.id]?.din||0),0);
      const fundsDol  = ALL_FUNDS.reduce((s,f)=>s+(funds[f.id]?.dol||0),0);
      const activeDin = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDin||0),0);
      const activeDol = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDol||0),0);
      const totalDin  = fundsDin + activeDin;
      const totalDol  = fundsDol + activeDol;

      const fundRows = ALL_FUNDS.map((f,i)=>{
        const b=funds[f.id]||{din:0,dol:0};
        return `<tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
          <td>${f.icon} ${f.label}</td>
          <td style="color:#D97706;font-weight:700">${fNum(b.din)} د.ع</td>
          <td style="color:#2563EB;font-weight:700">${fNum(b.dol)} $</td>
        </tr>`;
      }).join("");

      const projRows = projects.filter(p=>p.status==="active").map((p,i)=>`
        <tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
          <td style="text-align:right">${p.name}</td>
          <td>${p.type||""}</td>
          <td>${p.province||""}</td>
          <td style="color:#16A34A;font-weight:700">${fNum(p.balDin||0)} د.ع</td>
          <td style="color:#2563EB;font-weight:700">${fNum(p.balDol||0)} $</td>
        </tr>`).join("");

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">📊 التقرير الشامل</div>
<div class="info">تاريخ: ${today}</div>
<div class="sg" style="grid-template-columns:1fr 1fr">
  <div class="sb" style="background:linear-gradient(135deg,#D97706,#F59E0B);color:#fff">
    <div class="sl" style="color:#FEF3C7">🇮🇶 إجمالي الدينار الكلي</div>
    <div class="sv" style="color:#fff;font-size:18px">${fNum(totalDin)} د.ع</div>
  </div>
  <div class="sb" style="background:linear-gradient(135deg,#1D4ED8,#3B82F6)">
    <div class="sl" style="color:#DBEAFE">🇺🇸 إجمالي الدولار الكلي</div>
    <div class="sv" style="color:#fff;font-size:18px">${fNum(totalDol)} $</div>
  </div>
</div>
<h3>💎 الصناديق السبعة</h3>
<table><thead><tr><th style="text-align:right">الصندوق</th><th>رصيد الدينار</th><th>رصيد الدولار</th></tr></thead>
<tbody>${fundRows}</tbody>
<tr class="tot"><td>إجمالي الصناديق</td><td style="color:#D97706">${fNum(fundsDin)} د.ع</td><td style="color:#2563EB">${fNum(fundsDol)} $</td></tr>
</table>
<h3>🏗️ المشاريع قيد التنفيذ (${projects.filter(p=>p.status==="active").length})</h3>
<table><thead><tr><th style="text-align:right">المشروع</th><th>النوع</th><th>المحافظة</th><th>ميزان دينار</th><th>ميزان دولار</th></tr></thead>
<tbody>${projRows}</tbody>
<tr class="tot"><td colspan="2">إجمالي المشاريع النشطة</td><td></td><td style="color:#16A34A">${fNum(activeDin)} د.ع</td><td style="color:#2563EB">${fNum(activeDol)} $</td></tr>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;
    }

    if (!html) return;
    const w = window.open("","_blank","width=1000,height=750");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),700);
  };

  const rt = REPORT_TYPES.find(r=>r.id===reportType);

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:560, margin:"0 auto", padding:"22px 16px" }}>

        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>

        <div style={{ fontSize:18, fontWeight:700, color:"#1E293B", marginBottom:16 }}>
          📊 مركز التقارير
        </div>

        {/* اختيار نوع التقرير */}
        <div style={{ background:"#fff", borderRadius:14, padding:16,
          border:"1px solid #E2E8F0", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
            ١. اختر نوع التقرير
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {REPORT_TYPES.map(r=>(
              <button key={r.id} onClick={()=>setReportType(r.id)} style={{
                background: reportType===r.id ? r.bg : "#fff",
                border:"2px solid "+(reportType===r.id?r.color:"#E2E8F0"),
                borderRadius:12, padding:"12px", cursor:"pointer",
                fontFamily:"Tahoma", textAlign:"right" }}>
                <div style={{ fontSize:20, marginBottom:5 }}>{r.icon}</div>
                <div style={{ fontSize:12, fontWeight:700,
                  color:reportType===r.id?r.color:"#1E293B" }}>{r.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* الفلاتر */}
        {reportType && (
          <div style={{ background:"#fff", borderRadius:14, padding:16,
            border:"1px solid #E2E8F0", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
              ٢. الفلاتر
            </div>

            {/* فلتر التاريخ - لكل التقارير */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>من تاريخ</div>
                <input type="date" value={filters.fromDate} onChange={e=>sf("fromDate")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>إلى تاريخ</div>
                <input type="date" value={filters.toDate} onChange={e=>sf("toDate")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
            </div>

            {/* فلاتر خاصة بالمشاريع */}
            {reportType === "projects" && (
              <>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>
                    الحالة
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                    {[{v:"all",l:"الكل"},{v:"active",l:"● نشطة"},{v:"done",l:"✓ منتهية"}].map(({v,l})=>(
                      <button key={v} onClick={()=>sf("status")(v)} style={{
                        border:"1.5px solid "+(filters.status===v?"#D97706":"#E2E8F0"),
                        borderRadius:8, padding:"8px 6px", cursor:"pointer",
                        fontFamily:"Tahoma", fontSize:11, fontWeight:600,
                        background:filters.status===v?"#FFFBEB":"#fff",
                        color:filters.status===v?"#D97706":"#64748B"
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>النوع</div>
                  <select value={filters.projType} onChange={e=>sf("projType")(e.target.value)}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                      direction:"rtl", boxSizing:"border-box", background:"#F8FAFC",
                      appearance:"none" }}>
                    <option value="all">كل الأنواع</option>
                    {PROJ_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* فلاتر خاصة بالصناديق */}
            {reportType === "funds" && (
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>الصندوق</div>
                <select value={filters.fundId} onChange={e=>sf("fundId")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC",
                    appearance:"none" }}>
                  <option value="all">كل الصناديق</option>
                  {ALL_FUNDS.map(f=><option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}
                </select>
              </div>
            )}

            {/* فلاتر خاصة بالأصول */}
            {reportType === "assets" && (
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>الحالة</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {[{v:"all",l:"الكل"},{v:"active",l:"● النشطة"},{v:"sold",l:"✓ المباعة"}].map(({v,l})=>(
                    <button key={v} onClick={()=>sf("status")(v)} style={{
                      border:"1.5px solid "+(filters.status===v?"#0891B2":"#E2E8F0"),
                      borderRadius:8, padding:"8px 6px", cursor:"pointer",
                      fontFamily:"Tahoma", fontSize:11, fontWeight:600,
                      background:filters.status===v?"#ECFEFF":"#fff",
                      color:filters.status===v?"#0891B2":"#64748B"
                    }}>{l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* فلاتر خاصة بالموظفين */}
            {reportType === "employees" && (
              <div>
                <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>الفرع</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                  {["all","إشراف","ديكور","مقاولات","واجهات"].map(b=>(
                    <button key={b} onClick={()=>sf("status")(b)} style={{
                      border:"1.5px solid "+(filters.status===b?"#0F172A":"#E2E8F0"),
                      borderRadius:8,padding:"8px 4px",cursor:"pointer",fontFamily:"Tahoma",
                      fontSize:11,fontWeight:600,
                      background:filters.status===b?"#0F172A":"#fff",
                      color:filters.status===b?"#fff":"#64748B"}}>
                      {b==="all"?"الكل":b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* فلاتر خاصة بالرواتب */}
            {reportType === "salaries" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <div>
                  <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>الفرع</div>
                  <select value={filters.status} onChange={e=>sf("status")(e.target.value)}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                    <option value="all">كل الأفرع</option>
                    {["إشراف","ديكور","مقاولات","واجهات"].map(b=>(
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>الموظف</div>
                  <select value={filters.partnerId} onChange={e=>sf("partnerId")(e.target.value)}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                    <option value="all">كل الموظفين</option>
                    {rptEmps.map(e=><option key={e.id} value={e.id}>{e.name} — {e.branch}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* فلاتر خاصة بالشركاء */}
            {reportType === "partners" && (
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>الشريك</div>
                <select value={filters.partnerId} onChange={e=>sf("partnerId")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC",
                    appearance:"none" }}>
                  <option value="all">كل الشركاء</option>
                  {PARTNERS_LIST.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* زر الطباعة */}
        {reportType && (
          <button onClick={buildReport} style={{
            width:"100%", border:"none", borderRadius:12, padding:"15px",
            fontSize:15, fontWeight:700, fontFamily:"Tahoma",
            background: rt?.color || "#1E293B", color:"#fff", cursor:"pointer" }}>
            🖨️ طباعة {rt?.label}
          </button>
        )}

      </div>
    </div>
  );
}


// ─── التقارير المالية (ميزانية + أرباح وخسائر) ──────────
export function FinancialReportsPage({ funds, projects, onBack }) {
  const [tab, setTab]     = useState("balance"); // balance | pnl
  const [period, setPeriod] = useState({
    from: new Date().getFullYear()+"-01-01",
    to:   new Date().toISOString().split("T")[0]
  });

  const [salaries,  setSalaries]  = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [expPays,   setExpPays]   = useState([]);
  const [assets,    setAssets]    = useState([]);
  const [assetSales,setAssetSales]= useState([]);
  const [debts,     setDebts]     = useState([]);
  const [loans,     setLoans]     = useState([]);
  const [advances,  setAdvances]  = useState([]);
  const [projTxs,   setProjTxs]  = useState([]);

  useEffect(()=>{
    const u1=onSnapshot(collection(db,"salaries"),   s=>setSalaries(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2=onSnapshot(collection(db,"expenses"),   s=>setExpenses(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u3=onSnapshot(collection(db,"expense_payments"), s=>setExpPays(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u4=onSnapshot(collection(db,"assets"),     s=>setAssets(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u5=onSnapshot(collection(db,"asset_sales"),s=>setAssetSales(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u6=onSnapshot(collection(db,"debts"),      s=>setDebts(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u7=onSnapshot(collection(db,"internal_loans"), s=>setLoans(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u8=onSnapshot(collection(db,"advances"),   s=>setAdvances(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u9=onSnapshot(collection(db,"project_txs"),s=>setProjTxs(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();u3();u4();u5();u6();u7();u8();u9();};
  },[]);

  // ── الميزانية العمومية ─────────────────────────────────
  // الأصول
  const fundsDin     = ["رأس_المال","عام","شركاء","إشراف","ديكور","مقاولات","واجهات"]
    .reduce((s,f)=>s+(funds[f]?.din||0),0);
  const fundsDol     = ["رأس_المال","عام","شركاء","إشراف","ديكور","مقاولات","واجهات"]
    .reduce((s,f)=>s+(funds[f]?.dol||0),0);
  const activeProjDin= projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDin||0),0);
  const activeProjDol= projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDol||0),0);
  const fixedAssetsDin= assets.filter(a=>(a.qtyRemaining||0)>0)
    .reduce((s,a)=>s+(a.unitPriceDin||0)*(a.qtyRemaining||0),0);
  const fixedAssetsDol= assets.filter(a=>(a.qtyRemaining||0)>0)
    .reduce((s,a)=>s+(a.unitPriceDol||0)*(a.qtyRemaining||0),0);
  const receivableDin = debts.filter(d=>d.type==="receivable"&&d.status==="open")
    .reduce((s,d)=>s+(d.din||0),0);
  const receivableDol = debts.filter(d=>d.type==="receivable"&&d.status==="open")
    .reduce((s,d)=>s+(d.dol||0),0);
  const totalAssetsDin = fundsDin + activeProjDin + fixedAssetsDin + receivableDin;
  const totalAssetsDol = fundsDol + activeProjDol + fixedAssetsDol + receivableDol;

  // الخصوم
  const payableDin   = debts.filter(d=>d.type==="payable"&&d.status==="open")
    .reduce((s,d)=>s+(d.din||0),0);
  const payableDol   = debts.filter(d=>d.type==="payable"&&d.status==="open")
    .reduce((s,d)=>s+(d.dol||0),0);
  const openLoansDin = loans.filter(l=>l.status==="open").reduce((s,l)=>s+(l.din||0),0);
  const openLoansDol = loans.filter(l=>l.status==="open").reduce((s,l)=>s+(l.dol||0),0);
  const pendingAdvDin= advances.filter(a=>a.status==="pending").reduce((s,a)=>s+(a.din||0),0);
  const totalLiabDin = payableDin + openLoansDin + pendingAdvDin;
  const totalLiabDol = payableDol + openLoansDol;

  // حقوق الملكية
  const partnersDin = ["partner_إيهاب","partner_أحمد","partner_نور","partner_محمد"]
    .reduce((s,f)=>s+(funds[f]?.din||0),0);
  const equityDin   = totalAssetsDin - totalLiabDin;
  const equityDol   = totalAssetsDol - totalLiabDol;

  // ── الأرباح والخسائر ──────────────────────────────────
  const inPeriod = d => (!period.from||(d.date||d.month||d.createdAt||"").slice(0,10)>=period.from)
    && (!period.to||(d.date||d.month||d.createdAt||"").slice(0,10)<=period.to);

  // الإيرادات
  const projRevDin  = projTxs.filter(t=>t.type==="استلام"&&inPeriod(t)).reduce((s,t)=>s+(t.din||0),0);
  const projRevDol  = projTxs.filter(t=>t.type==="استلام"&&inPeriod(t)).reduce((s,t)=>s+(t.dol||0),0);
  const assetRevDin = assetSales.filter(inPeriod).reduce((s,a)=>s+(a.sellPriceDin||0),0);
  const assetRevDol = assetSales.filter(inPeriod).reduce((s,a)=>s+(a.sellPriceDol||0),0);
  const totalRevDin = projRevDin + assetRevDin;
  const totalRevDol = projRevDol + assetRevDol;

  // المصاريف
  const salExpDin   = salaries.filter(inPeriod).reduce((s,t)=>s+(t.netDin||0),0);
  const salExpDol   = salaries.filter(inPeriod).reduce((s,t)=>s+(t.netDol||0),0);
  const fixExpDin   = expPays.filter(inPeriod).reduce((s,t)=>s+(t.din||0),0);
  const fixExpDol   = expPays.filter(inPeriod).reduce((s,t)=>s+(t.dol||0),0);
  const assetCostDin= assets.filter(inPeriod).reduce((s,a)=>s+(a.totalDin||0),0);
  const assetCostDol= assets.filter(inPeriod).reduce((s,a)=>s+(a.totalDol||0),0);
  const advExpDin   = advances.filter(inPeriod).reduce((s,a)=>s+(a.din||0),0);
  const totalExpDin = salExpDin + fixExpDin + assetCostDin + advExpDin;
  const totalExpDol = salExpDol + fixExpDol + assetCostDol;

  const netDin = totalRevDin - totalExpDin;
  const netDol = totalRevDol - totalExpDol;

  // ── طباعة الميزانية ───────────────────────────────────
  const printBalance = () => {
    const today = new Date().toISOString().split("T")[0];
    const row=(label,din,dol,bold=false,color="#1E293B")=>`
      <tr style="background:#fff">
        <td style="text-align:right;padding:8px 12px;font-size:12px;${bold?"font-weight:700":""}color:${color}">${label}</td>
        <td style="text-align:center;padding:8px;font-size:12px;${bold?"font-weight:700":""}color:${din>0?"#D97706":"#DC2626"}">${din!==0?fNum(Math.abs(din))+" د.ع":""}</td>
        <td style="text-align:center;padding:8px;font-size:12px;${bold?"font-weight:700":""}color:#2563EB">${dol!==0?fNum(Math.abs(dol))+" $":""}</td>
      </tr>`;
    const section=(title,color)=>`
      <tr style="background:${color}"><td colspan="3" style="padding:8px 12px;font-size:13px;font-weight:700;color:#fff">${title}</td></tr>`;

    const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:22px;direction:rtl}
.hdr{text-align:center;border-bottom:3px solid #0F172A;padding-bottom:12px;margin-bottom:14px}
.co{font-size:20px;font-weight:700}.ca{font-size:11px;color:#64748B}
table{width:100%;border-collapse:collapse;margin-bottom:18px}
th{background:#0F172A;color:#fff;padding:10px;font-size:12px}
.net{background:#F0FDF4;font-weight:700;font-size:14px}
.ft{margin-top:12px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between}
</style></head><body>
<div class="hdr"><div class="co">شركة باب المشاريع</div>
<div class="ca">الميزانية العمومية — بتاريخ: ${today}</div></div>
<table>
<thead><tr><th style="text-align:right">البند</th><th>دينار</th><th>دولار</th></tr></thead>
<tbody>
${section("📦 الأصول","#0F172A")}
${row("النقد في الصناديق السبعة",fundsDin,fundsDol)}
${row("ميزان المشاريع النشطة ("+projects.filter(p=>p.status==="active").length+")",activeProjDin,activeProjDol)}
${row("الأصول الثابتة (القيمة الدفترية)",fixedAssetsDin,fixedAssetsDol)}
${row("الذمم المدينة (الشركة طالبة)",receivableDin,receivableDol)}
${row("إجمالي الأصول",totalAssetsDin,totalAssetsDol,true,"#059669")}
${section("📤 الخصوم","#DC2626")}
${row("الذمم الدائنة (الشركة مطلوبة)",payableDin,payableDol)}
${row("القروض الداخلية على الصناديق",openLoansDin,openLoansDol)}
${row("السلف المستحقة على الموظفين",pendingAdvDin,0)}
${row("إجمالي الخصوم",totalLiabDin,totalLiabDol,true,"#DC2626")}
${section("💼 حقوق الملكية","#7C3AED")}
${row("أرصدة الشركاء الأربعة",partnersDin,0)}
${row("صافي حقوق الملكية",equityDin,equityDol,true,"#7C3AED")}
</tbody>
<tfoot><tr class="net">
<td style="padding:12px;text-align:right">✅ إجمالي الخصوم + حقوق الملكية</td>
<td style="text-align:center">${fNum(totalLiabDin+equityDin)} د.ع</td>
<td style="text-align:center">${fNum(totalLiabDol+equityDol)} $</td>
</tr></tfoot>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;
    const w=window.open("","_blank","width=900,height=700");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),700);
  };

  // ── طباعة الأرباح والخسائر ───────────────────────────
  const printPnL = () => {
    const today = new Date().toISOString().split("T")[0];
    const row=(label,din,dol,bold=false,color="#1E293B")=>`
      <tr><td style="text-align:right;padding:8px 12px;font-size:12px;${bold?"font-weight:700;":""}color:${color}">${label}</td>
      <td style="text-align:center;font-size:12px;${bold?"font-weight:700;":""}color:${din>=0?"#16A34A":"#DC2626"}">${din!==0?(din<0?"-":"")+fNum(Math.abs(din))+" د.ع":""}</td>
      <td style="text-align:center;font-size:12px;${bold?"font-weight:700;":""}color:#2563EB">${dol!==0?(dol<0?"-":"")+fNum(Math.abs(dol))+" $":""}</td></tr>`;
    const section=(t,c)=>`<tr style="background:${c}"><td colspan="3" style="padding:8px 12px;font-size:13px;font-weight:700;color:#fff">${t}</td></tr>`;

    const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:22px;direction:rtl}
.hdr{text-align:center;border-bottom:3px solid #0F172A;padding-bottom:12px;margin-bottom:14px}
.co{font-size:20px;font-weight:700}.ca{font-size:11px;color:#64748B}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#0F172A;color:#fff;padding:10px;font-size:12px}
tr:nth-child(even){background:#F8FAFC}
.net{font-weight:700;font-size:14px;background:${netDin>=0?"#F0FDF4":"#FFF1F2"}}
.ft{margin-top:12px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between}
</style></head><body>
<div class="hdr"><div class="co">شركة باب المشاريع</div>
<div class="ca">تقرير الأرباح والخسائر — ${period.from} إلى ${period.to}</div></div>
<table>
<thead><tr><th style="text-align:right">البند</th><th>دينار</th><th>دولار</th></tr></thead>
<tbody>
${section("📈 الإيرادات","#16A34A")}
${row("إيرادات المشاريع (مستلمات)",projRevDin,projRevDol)}
${row("إيرادات بيع الأصول",assetRevDin,assetRevDol)}
${row("إجمالي الإيرادات",totalRevDin,totalRevDol,true,"#16A34A")}
${section("📉 المصاريف","#DC2626")}
${row("رواتب الموظفين",salExpDin,salExpDol)}
${row("المصاريف الثابتة (إيجارات وغيرها)",fixExpDin,fixExpDol)}
${row("شراء الأصول الثابتة",assetCostDin,assetCostDol)}
${row("سلف الموظفين",advExpDin,0)}
${row("إجمالي المصاريف",totalExpDin,totalExpDol,true,"#DC2626")}
</tbody>
<tfoot><tr class="net">
<td style="padding:12px;text-align:right">${netDin>=0?"✅ صافي الربح":"❌ صافي الخسارة"}</td>
<td style="text-align:center;color:${netDin>=0?"#16A34A":"#DC2626"}">${fNum(Math.abs(netDin))} د.ع</td>
<td style="text-align:center;color:${netDol>=0?"#16A34A":"#DC2626"}">${fNum(Math.abs(netDol))} $</td>
</tr></tfoot>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;
    const w=window.open("","_blank","width=900,height=700");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),700);
  };

  const Card=({label,din,dol,color,bg,icon})=>(
    <div style={{background:bg,borderRadius:12,padding:"12px 14px",
      border:"1px solid "+color+"30"}}>
      <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>{icon} {label}</div>
      {din!==0&&<div style={{fontSize:16,fontWeight:700,color}}>{fNum(Math.abs(din))} <span style={{fontSize:10}}>د.ع</span></div>}
      {dol!==0&&<div style={{fontSize:13,fontWeight:700,color:"#2563EB"}}>{fNum(Math.abs(dol))} <span style={{fontSize:10}}>$</span></div>}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:800,margin:"0 auto",padding:"22px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>← رجوع</button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#0F172A,#1E293B)",
          borderRadius:16,padding:"20px 24px",marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:4}}>
            📈 التقارير المالية
          </div>
          <div style={{fontSize:12,color:"#94A3B8"}}>
            ميزانية عمومية · أرباح وخسائر
          </div>
        </div>

        {/* تبويبات */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          <button onClick={()=>setTab("balance")} style={{
            border:"none",borderRadius:10,padding:"12px",cursor:"pointer",
            fontFamily:"Tahoma",fontSize:13,fontWeight:700,
            background:tab==="balance"?"#0F172A":"#fff",
            color:tab==="balance"?"#fff":"#64748B"}}>
            📊 الميزانية العمومية
          </button>
          <button onClick={()=>setTab("pnl")} style={{
            border:"none",borderRadius:10,padding:"12px",cursor:"pointer",
            fontFamily:"Tahoma",fontSize:13,fontWeight:700,
            background:tab==="pnl"?"#0F172A":"#fff",
            color:tab==="pnl"?"#fff":"#64748B"}}>
            📉 الأرباح والخسائر
          </button>
        </div>

        {/* ─── الميزانية العمومية ─── */}
        {tab==="balance" && (
          <>
            {/* الأصول */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <div style={{width:4,height:20,background:"#059669",borderRadius:99}}/>
                <span style={{fontSize:14,fontWeight:700,color:"#059669"}}>📦 الأصول</span>
                <span style={{marginRight:"auto",fontSize:13,fontWeight:700,color:"#059669"}}>
                  {fNum(totalAssetsDin)} د.ع {totalAssetsDol>0&&"| "+fNum(totalAssetsDol)+" $"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <Card label="النقد في الصناديق" din={fundsDin} dol={fundsDol} color="#D97706" bg="#FFFBEB" icon="💰"/>
                <Card label={"مشاريع نشطة ("+projects.filter(p=>p.status==="active").length+")"} din={activeProjDin} dol={activeProjDol} color="#0284C7" bg="#F0F9FF" icon="🏗️"/>
                <Card label={"الأصول الثابتة ("+assets.filter(a=>(a.qtyRemaining||0)>0).length+" صنف)"} din={fixedAssetsDin} dol={fixedAssetsDol} color="#0891B2" bg="#ECFEFF" icon="📦"/>
                <Card label={"ذمم مدينة ("+debts.filter(d=>d.type==="receivable"&&d.status==="open").length+")"} din={receivableDin} dol={receivableDol} color="#16A34A" bg="#F0FDF4" icon="📥"/>
              </div>
            </div>

            {/* الخصوم */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <div style={{width:4,height:20,background:"#DC2626",borderRadius:99}}/>
                <span style={{fontSize:14,fontWeight:700,color:"#DC2626"}}>📤 الخصوم</span>
                <span style={{marginRight:"auto",fontSize:13,fontWeight:700,color:"#DC2626"}}>
                  {fNum(totalLiabDin)} د.ع {totalLiabDol>0&&"| "+fNum(totalLiabDol)+" $"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <Card label={"ذمم دائنة ("+debts.filter(d=>d.type==="payable"&&d.status==="open").length+")"} din={payableDin} dol={payableDol} color="#DC2626" bg="#FFF1F2" icon="📤"/>
                <Card label={"قروض داخلية ("+loans.filter(l=>l.status==="open").length+")"} din={openLoansDin} dol={openLoansDol} color="#F97316" bg="#FFF7ED" icon="🔄"/>
                <Card label={"سلف موظفين ("+advances.filter(a=>a.status==="pending").length+")"} din={pendingAdvDin} dol={0} color="#7C3AED" bg="#F5F3FF" icon="👷"/>
              </div>
            </div>

            {/* حقوق الملكية */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <div style={{width:4,height:20,background:"#7C3AED",borderRadius:99}}/>
                <span style={{fontSize:14,fontWeight:700,color:"#7C3AED"}}>💼 حقوق الملكية</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <Card label="أرصدة الشركاء الأربعة" din={partnersDin} dol={0} color="#9333EA" bg="#FAF5FF" icon="👥"/>
                <div style={{background:equityDin>=0?"#F0FDF4":"#FFF1F2",borderRadius:12,
                  padding:"12px 14px",border:"2px solid "+(equityDin>=0?"#16A34A":"#DC2626")}}>
                  <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>
                    ⚖️ صافي حقوق الملكية
                  </div>
                  <div style={{fontSize:18,fontWeight:700,color:equityDin>=0?"#16A34A":"#DC2626"}}>
                    {fNum(Math.abs(equityDin))} <span style={{fontSize:11}}>د.ع</span>
                  </div>
                  {equityDol!==0&&<div style={{fontSize:14,fontWeight:700,color:"#2563EB"}}>
                    {fNum(Math.abs(equityDol))} <span style={{fontSize:11}}>$</span>
                  </div>}
                </div>
              </div>
              {/* المعادلة */}
              <div style={{background:"#F8FAFC",borderRadius:10,padding:"12px 16px",
                fontSize:12,color:"#64748B",textAlign:"center"}}>
                الأصول ({fNum(totalAssetsDin)} د.ع) = الخصوم ({fNum(totalLiabDin)} د.ع) + حقوق الملكية ({fNum(equityDin)} د.ع)
              </div>
            </div>

            <button onClick={printBalance} style={{width:"100%",border:"none",
              borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,
              fontFamily:"Tahoma",background:"#0F172A",color:"#fff",cursor:"pointer"}}>
              🖨️ طباعة الميزانية العمومية
            </button>
          </>
        )}

        {/* ─── الأرباح والخسائر ─── */}
        {tab==="pnl" && (
          <>
            {/* فلتر الفترة */}
            <div style={{background:"#fff",borderRadius:12,padding:14,
              border:"1px solid #E2E8F0",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>من تاريخ</div>
                  <input type="date" value={period.from}
                    onChange={e=>setPeriod(p=>({...p,from:e.target.value}))}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                      boxSizing:"border-box",background:"#F8FAFC"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:5}}>إلى تاريخ</div>
                  <input type="date" value={period.to}
                    onChange={e=>setPeriod(p=>({...p,to:e.target.value}))}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                      boxSizing:"border-box",background:"#F8FAFC"}}/>
                </div>
              </div>
            </div>

            {/* الإيرادات */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <div style={{width:4,height:20,background:"#16A34A",borderRadius:99}}/>
                <span style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>📈 الإيرادات</span>
                <span style={{marginRight:"auto",fontSize:13,fontWeight:700,color:"#16A34A"}}>
                  {fNum(totalRevDin)} د.ع {totalRevDol>0&&"| "+fNum(totalRevDol)+" $"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <Card label="إيرادات المشاريع" din={projRevDin} dol={projRevDol} color="#16A34A" bg="#F0FDF4" icon="🏗️"/>
                <Card label="إيرادات بيع الأصول" din={assetRevDin} dol={assetRevDol} color="#0891B2" bg="#ECFEFF" icon="📦"/>
              </div>
            </div>

            {/* المصاريف */}
            <div style={{background:"#fff",borderRadius:14,padding:18,
              border:"1px solid #E2E8F0",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <div style={{width:4,height:20,background:"#DC2626",borderRadius:99}}/>
                <span style={{fontSize:14,fontWeight:700,color:"#DC2626"}}>📉 المصاريف</span>
                <span style={{marginRight:"auto",fontSize:13,fontWeight:700,color:"#DC2626"}}>
                  {fNum(totalExpDin)} د.ع {totalExpDol>0&&"| "+fNum(totalExpDol)+" $"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <Card label="رواتب الموظفين" din={salExpDin} dol={salExpDol} color="#DC2626" bg="#FFF1F2" icon="👷"/>
                <Card label="مصاريف ثابتة (إيجارات)" din={fixExpDin} dol={fixExpDol} color="#F97316" bg="#FFF7ED" icon="🏠"/>
                <Card label="شراء أصول ثابتة" din={assetCostDin} dol={assetCostDol} color="#7C3AED" bg="#F5F3FF" icon="📦"/>
                <Card label="سلف موظفين" din={advExpDin} dol={0} color="#0891B2" bg="#F0F9FF" icon="💸"/>
              </div>
            </div>

            {/* صافي الربح */}
            <div style={{background:netDin>=0?"#F0FDF4":"#FFF1F2",borderRadius:14,
              padding:"18px 20px",border:"3px solid "+(netDin>=0?"#16A34A":"#DC2626"),
              marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:14,color:"#64748B",marginBottom:8}}>
                {netDin>=0?"✅ صافي الربح للفترة":"❌ صافي الخسارة للفترة"}
              </div>
              <div style={{fontSize:32,fontWeight:700,
                color:netDin>=0?"#16A34A":"#DC2626",marginBottom:4}}>
                {fNum(Math.abs(netDin))} <span style={{fontSize:16}}>د.ع</span>
              </div>
              {netDol!==0&&<div style={{fontSize:22,fontWeight:700,color:"#2563EB"}}>
                {fNum(Math.abs(netDol))} <span style={{fontSize:14}}>$</span>
              </div>}
              <div style={{fontSize:12,color:"#64748B",marginTop:8}}>
                الإيرادات {fNum(totalRevDin)} − المصاريف {fNum(totalExpDin)} = {netDin>=0?"ربح":"خسارة"} {fNum(Math.abs(netDin))} د.ع
              </div>
            </div>

            <button onClick={printPnL} style={{width:"100%",border:"none",
              borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,
              fontFamily:"Tahoma",background:"#0F172A",color:"#fff",cursor:"pointer"}}>
              🖨️ طباعة تقرير الأرباح والخسائر
            </button>
          </>
        )}

      </div>
    </div>
  );
}

// ─── قسم الأوفرتايم المعلق ─────────────────────────────
function OvertimePendingSection({ otRecords, funds, employees }) {
  const WORK_DAYS=26, WORK_HOURS=10;

  const calcOTPay = (empName, hours) => {
    const emp = employees.find(e=>
      e.name.trim().includes(empName.trim()) ||
      empName.trim().includes(e.name.trim())
    );
    if(!emp) return {din:0, dol:0, found:false};
    const din = emp.baseDin>0
      ? Math.round(emp.baseDin/WORK_DAYS/WORK_HOURS*hours) : 0;
    const dol = emp.baseDol>0
      ? Math.round(emp.baseDol/WORK_DAYS/WORK_HOURS*hours*10)/10 : 0;
    return {din, dol, found:true, branch:emp.branch};
  };

  const approveOT = async (ot) => {
    const pay = calcOTPay(ot.workerName, ot.hours);
    const pw = window.prompt("🔒 باسورد صرف الأوفرتايم:");
    if(!pw)return; if(pw!=="1234"){alert("❌ باسورد غلط");return;}

    const branch = pay.branch || ot.branch || "ديكور";
    const fBal = funds[branch]||{din:0,dol:0};

    if(pay.din>0){
      if(pay.din>fBal.din){
        alert("⛔ رصيد صندوق "+branch+" غير كافٍ — المتاح: "+
          Math.round(fBal.din).toLocaleString()+" د.ع");
        return;
      }
      // خصم من الصندوق
      await setDoc(doc(db,"funds",branch),
        {din:fBal.din-pay.din,dol:fBal.dol},{merge:true});
      await addDoc(collection(db,"fund_txs"),{
        fundId:branch,fundLabel:branch,type:"صرف",
        din:pay.din,dol:0,
        note:"أوفرتايم — "+ot.workerName+" — "+ot.hours+" ساعة — "+ot.date,
        date:ot.date,createdAt:new Date().toISOString()
      });
    }

    // تغيير الحالة لمعتمد
    await updateDoc(doc(db,"overtime_records",ot.id),{
      status:"approved",
      approvedAt:new Date().toISOString(),
      paidDin:pay.din, paidDol:pay.dol
    });
    alert("✅ تم صرف أوفرتايم "+ot.workerName+" — "+
      (pay.din>0?Math.round(pay.din).toLocaleString()+" د.ع":""));
  };

  const rejectOT = async (id) => {
    if(!window.confirm("رفض هذا الأوفرتايم؟")) return;
    await updateDoc(doc(db,"overtime_records",id),{status:"rejected"});
  };

  if(otRecords.length===0) return (
    <div style={{background:"#fff",borderRadius:14,padding:40,
      textAlign:"center",border:"1px solid #E2E8F0"}}>
      <div style={{fontSize:40,marginBottom:10}}>✅</div>
      <div style={{fontSize:14,color:"#64748B"}}>ما في أوفرتايم معلق</div>
    </div>
  );

  const totalPending=otRecords.length;

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#EA580C,#F97316)",
        borderRadius:16,padding:"16px 20px",marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>
          ⏱️ الأوفرتايم المعلق
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:4}}>
          {totalPending} سجل ينتظر الموافقة والصرف
        </div>
      </div>

      {otRecords.map(ot=>{
        const pay=calcOTPay(ot.workerName, ot.hours);
        return (
          <div key={ot.id} style={{background:"#fff",borderRadius:14,
            padding:16,marginBottom:10,border:"1px solid #E2E8F0",
            borderRight:"5px solid #F97316"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"start",marginBottom:12}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>
                  {ot.workerName}
                </div>
                <div style={{fontSize:11,color:"#64748B",marginTop:3}}>
                  📅 {ot.date} · 🏭 {ot.source} · 👷 {ot.foremanName}
                </div>
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:18,fontWeight:800,color:"#F97316"}}>
                  {ot.hours} ساعة
                </div>
                {pay.found&&pay.din>0&&(
                  <div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginTop:2}}>
                    {Math.round(pay.din).toLocaleString()} د.ع
                  </div>
                )}
                {!pay.found&&(
                  <div style={{fontSize:10,color:"#94A3B8"}}>
                    غير مسجّل
                  </div>
                )}
              </div>
            </div>

            {!pay.found&&(
              <div style={{background:"#FFF7ED",borderRadius:8,
                padding:"8px 12px",fontSize:11,color:"#92400E",marginBottom:10}}>
                ⚠️ "{ot.workerName}" غير موجود في قاعدة الموظفين —
                تأكد من تطابق الاسم لحساب المبلغ
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>approveOT(ot)}
                disabled={!pay.found}
                style={{border:"none",borderRadius:10,padding:"12px",
                  cursor:pay.found?"pointer":"not-allowed",
                  fontFamily:"Tahoma",fontSize:13,fontWeight:700,
                  background:pay.found?"#16A34A":"#E2E8F0",
                  color:pay.found?"#fff":"#94A3B8"}}>
                ✅ اعتماد وصرف
              </button>
              <button onClick={()=>rejectOT(ot.id)}
                style={{border:"2px solid #DC2626",borderRadius:10,padding:"12px",
                  cursor:"pointer",fontFamily:"Tahoma",fontSize:13,fontWeight:700,
                  background:"#fff",color:"#DC2626"}}>
                ❌ رفض
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
