import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, setDoc,
         deleteDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";

const app = initializeApp({
  apiKey:"AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain:"hisab-app-e4616.firebaseapp.com",
  projectId:"hisab-app-e4616",
});
const db = getFirestore(app);

const COMPANY = {
  name:"شركة باب المشاريع",
  nameEn:"Project Gate Company",
  address:"بغداد — العرصات، مقابل شركة زين",
};

const FUNDS = [
  { id:"capital",     name:"صندوق رأس المال",     icon:"ti-safe",          color:"#2563EB", light:"#EFF6FF" },
  { id:"general",     name:"الصندوق العام",        icon:"ti-building-bank", color:"#0891B2", light:"#ECFEFF" },
  { id:"decor",       name:"صندوق الديكور",        icon:"ti-palette",       color:"#7C3AED", light:"#F5F3FF" },
  { id:"contracting", name:"صندوق المقاولات",      icon:"ti-building",      color:"#D97706", light:"#FFFBEB" },
  { id:"facades",     name:"صندوق الواجهات",       icon:"ti-layers",        color:"#059669", light:"#ECFDF5" },
  { id:"engineering", name:"صندوق أعمال هندسية",  icon:"ti-ruler-2",       color:"#DC2626", light:"#FEF2F2" },
  { id:"trade",       name:"صندوق التجارة",        icon:"ti-briefcase",     color:"#16A34A", light:"#F0FDF4" },
  { id:"partners",    name:"صندوق أرباح الشركاء", icon:"ti-users",         color:"#9333EA", light:"#FAF5FF" },
];

const PARTNERS = [
  { id:"ihab",     name:"إيهاب زيتوني", share:30, color:"#2563EB", light:"#EFF6FF" },
  { id:"nour",     name:"نور إدوارد",   share:30, color:"#059669", light:"#ECFDF5" },
  { id:"mohammed", name:"محمد سالم",    share:30, color:"#7C3AED", light:"#F5F3FF" },
  { id:"ahmed",    name:"أحمد سالم",    share:10, color:"#D97706", light:"#FFFBEB" },
];

const toAr = n => {
  const s = String(Math.round(Math.abs(Number(n)||0)));
  let r = "";
  for (let i=0; i<s.length; i++) {
    if (i>0 && (s.length-i)%3===0) r+=",";
    r+=s[i];
  }
  return r;
};
const today  = () => new Date().toISOString().split("T")[0];
const fmtD   = n => toAr(n) + " د.ع";
const fmtDol = n => toAr(Math.round(Math.abs(n))) + " $";
const PASS   = "1234";

const askPass = label => {
  const pw = window.prompt("🔒 " + label + "\nأدخل الباسورد:");
  if (pw===null) return false;
  if (pw!==PASS) { alert("❌ باسورد غلط"); return false; }
  return true;
};

function numToWords(n) {
  if (!n||isNaN(n)) return "";
  const num = Math.floor(Math.abs(Number(n)));
  if (num===0) return "صفر";
  const ones=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const hunds=["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const grp=g=>{
    if(g===0) return "";
    if(g<20) return ones[g];
    if(g<100) return tens[Math.floor(g/10)]+(g%10?" و"+ones[g%10]:"");
    return hunds[Math.floor(g/100)]+(g%100?" و"+grp(g%100):"");
  };
  const p=[];
  if(num>=1000000000) p.push(grp(Math.floor(num/1000000000))+" مليار");
  if(num%1000000000>=1000000) p.push(grp(Math.floor((num%1000000000)/1000000))+" مليون");
  if(num%1000000>=1000) p.push(grp(Math.floor((num%1000000)/1000))+" ألف");
  if(num%1000>0) p.push(grp(num%1000));
  return p.join(" و");
}

const Lbl = ({children}) => (
  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:6}}>{children}</div>
);
const Inp = ({style,...props}) => (
  <input style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:10,
    padding:"11px 14px",fontSize:15,background:"#F8FAFC",color:"#1E293B",
    outline:"none",boxSizing:"border-box",fontFamily:"Tahoma",direction:"rtl",
    marginBottom:10,...style}} {...props}/>
);
const BackBtn = ({onClick,label="رجوع"}) => (
  <button onClick={onClick} style={{background:"#fff",border:"1px solid #E2E8F0",
    borderRadius:10,padding:"8px 16px",fontSize:13,color:"#64748B",cursor:"pointer",
    marginBottom:20,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
    <i className="ti ti-arrow-right" aria-hidden="true"/> {label}
  </button>
);
const DelBtn = ({onClick}) => (
  <button onClick={onClick} style={{background:"transparent",border:"none",
    color:"#DC2626",fontSize:11,cursor:"pointer",fontFamily:"Tahoma",
    padding:"2px 0",fontWeight:600}}>🗑️ حذف</button>
);
const CurrencyBtn = ({value,onChange}) => (
  <div style={{display:"flex",gap:6,marginBottom:10}}>
    {["دينار","دولار"].map(c=>(
      <button key={c} onClick={()=>onChange(c)} style={{
        flex:1,padding:"10px",borderRadius:10,cursor:"pointer",
        fontFamily:"Tahoma",fontSize:13,fontWeight:700,
        border:"1.5px solid "+(value===c?(c==="دينار"?"#16A34A":"#2563EB"):"#E2E8F0"),
        background:value===c?(c==="دينار"?"#F0FDF4":"#EFF6FF"):"transparent",
        color:value===c?(c==="دينار"?"#16A34A":"#2563EB"):"#64748B"}}>
        {c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}
      </button>
    ))}
  </div>
);
export default function App() {
  const [page,       setPage]      = useState("home");
  const [selFund,    setSelFund]   = useState(null);
  const [selProject, setSelProject]= useState(null);
  const [loading,    setLoading]   = useState(true);
  const [balances,   setBalances]  = useState({});
  const [txs,        setTxs]       = useState([]);
  const [projects,   setProjects]  = useState([]);

  useEffect(()=>{
    if (!document.querySelector("#ti-css")) {
      const l=document.createElement("link");
      l.id="ti-css"; l.rel="stylesheet";
      l.href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);
    }
  },[]);

  // الأرصدة فقط عند الفتح
  useEffect(()=>{
    const t=setTimeout(()=>setLoading(false),4000);
    const u=onSnapshot(collection(db,"fund_balances"),snap=>{
      const b={};
      snap.docs.forEach(d=>{
        const x=d.data();
        b[d.id]={din:x.din??x.balance??0, dol:x.dol??0};
      });
      setBalances(b); setLoading(false);
    },()=>setLoading(false));
    return ()=>{u(); clearTimeout(t);};
  },[]);

  // معاملات الصندوق — عند فتح صندوق فقط
  useEffect(()=>{
    if (page!=="fund"||!selFund){setTxs([]);return;}
    const u=onSnapshot(
      query(collection(db,"fund_transactions"),
        where("fundId","==",selFund),orderBy("createdAt","desc")),
      snap=>setTxs(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
    return ()=>u();
  },[selFund,page]);

  // معاملات الشركاء — عند فتح صفحة الشركاء
  useEffect(()=>{
    if (page!=="partners") return;
    const ids=["partners",...PARTNERS.map(p=>"partner_"+p.id)];
    const us=ids.map(pId=>
      onSnapshot(
        query(collection(db,"fund_transactions"),
          where("fundId","==",pId),orderBy("createdAt","desc")),
        snap=>{
          const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
          setTxs(prev=>[...prev.filter(t=>t.fundId!==pId),...rows]);
        }
      )
    );
    return ()=>us.forEach(u=>u());
  },[page]);

  // مشاريع الصندوق — عند فتح صندوق
  useEffect(()=>{
    if (!selFund){setProjects([]);return;}
    const u=onSnapshot(
      query(collection(db,"fund_projects"),
        where("fundId","==",selFund),orderBy("createdAt","desc")),
      snap=>setProjects(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
    return ()=>u();
  },[selFund]);

  const getBal = id => balances[id]||{din:0,dol:0};

  // إضافة معاملة صندوق
  const addTx = async (fundId,type,amount,currency,note,date)=>{
    const amt=Math.round(Number(amount));
    if (!amt||amt<=0) return;
    const isDol=currency==="دولار";
    const cur=getBal(fundId);
    const nDin=type==="إيداع"?cur.din+(isDol?0:amt):cur.din-(isDol?0:amt);
    const nDol=isDol?(type==="إيداع"?cur.dol+amt:cur.dol-amt):cur.dol;
    await setDoc(doc(db,"fund_balances",fundId),{din:nDin,dol:nDol},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId, fundName:FUNDS.find(f=>f.id===fundId)?.name||"",
      type, amount:amt, currency, amtInDinar:isDol?0:amt,
      note:note||"", date:date||today(),
      balAfterDin:nDin, balAfterDol:nDol,
      createdAt:new Date().toISOString(),
    });
  };

  // حذف معاملة صندوق
  const deleteTx = async tx=>{
    if (!askPass("حذف المعاملة")) return;
    const cur=getBal(tx.fundId);
    const isDol=tx.currency==="دولار";
    const amt=tx.amount||0;
    const isIn=tx.type==="إيداع"||tx.type==="إيداع أرباح";
    const nDin=isDol?cur.din:(isIn?cur.din-amt:cur.din+amt);
    const nDol=isDol?(isIn?cur.dol-amt:cur.dol+amt):cur.dol;
    await setDoc(doc(db,"fund_balances",tx.fundId),{din:nDin,dol:nDol},{merge:true});
    await deleteDoc(doc(db,"fund_transactions",tx.id));
  };

  // تحويل أرباح → شركاء
  const transferProfit = async (fromId,amount,currency,note,date)=>{
    const amt=Math.round(Number(amount));
    if (!amt||amt<=0) return;
    const isDol=currency==="دولار";
    const ff=FUNDS.find(f=>f.id===fromId);
    const fb=getBal(fromId);
    const fDin=isDol?fb.din:fb.din-amt;
    const fDol=isDol?fb.dol-amt:fb.dol;
    await setDoc(doc(db,"fund_balances",fromId),{din:fDin,dol:fDol},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId:fromId, fundName:ff?.name||"",
      type:"تحويل أرباح", amount:amt, currency, amtInDinar:isDol?0:amt,
      note:"تحويل → الشركاء"+(note?" — "+note:""),
      date:date||today(), balAfterDin:fDin, balAfterDol:fDol,
      isTransfer:true, createdAt:new Date().toISOString(),
    });
    const mb=getBal("partners");
    const mDin=isDol?mb.din:mb.din+amt;
    const mDol=isDol?mb.dol+amt:mb.dol;
    await setDoc(doc(db,"fund_balances","partners"),{din:mDin,dol:mDol},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId:"partners", fundName:"صندوق أرباح الشركاء",
      type:"إيداع أرباح", amount:amt, currency, amtInDinar:isDol?0:amt,
      note:"أرباح من "+(ff?.name||fromId)+(note?" — "+note:""),
      date:date||today(), balAfterDin:mDin, balAfterDol:mDol,
      isTransfer:true, createdAt:new Date().toISOString(),
    });
    for (const p of PARTNERS) {
      const sDin=isDol?0:Math.round(amt*p.share/100);
      const sDol=isDol?Math.round(amt*p.share/100):0;
      const pId="partner_"+p.id;
      const pb=getBal(pId);
      const pDin=pb.din+sDin; const pDol=pb.dol+sDol;
      await setDoc(doc(db,"fund_balances",pId),{din:pDin,dol:pDol},{merge:true});
      await addDoc(collection(db,"fund_transactions"),{
        fundId:pId, fundName:p.name,
        type:"إيداع", amount:isDol?sDol:sDin, currency, amtInDinar:sDin,
        note:"حصة "+p.share+"% — "+(ff?.name||"")+(note?" — "+note:""),
        date:date||today(), balAfterDin:pDin, balAfterDol:pDol,
        isDistribution:true, createdAt:new Date().toISOString(),
      });
    }
  };

  // إيداع مباشر لصندوق الشركاء
  const depositToPartners = async (amount,note,date)=>{
    const amt=Math.round(Number(amount));
    if (!amt||amt<=0) return;
    const mb=getBal("partners");
    const mNew=mb.din+amt;
    await setDoc(doc(db,"fund_balances","partners"),{din:mNew,dol:mb.dol},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId:"partners", fundName:"صندوق أرباح الشركاء",
      type:"إيداع", amount:amt, currency:"دينار", amtInDinar:amt,
      note:note||"", date:date||today(),
      balAfterDin:mNew, balAfterDol:mb.dol,
      createdAt:new Date().toISOString(),
    });
    for (const p of PARTNERS) {
      const share=Math.round(amt*p.share/100);
      const pId="partner_"+p.id;
      const pb=getBal(pId);
      const pNew=pb.din+share;
      await setDoc(doc(db,"fund_balances",pId),{din:pNew,dol:pb.dol},{merge:true});
      await addDoc(collection(db,"fund_transactions"),{
        fundId:pId, fundName:p.name,
        type:"إيداع", amount:share, currency:"دينار", amtInDinar:share,
        note:"توزيع "+p.share+"% — "+(note||""),
        date:date||today(), balAfterDin:pNew, balAfterDol:pb.dol,
        isDistribution:true, createdAt:new Date().toISOString(),
      });
    }
  };

  // سحب من شريك
  const withdrawPartner = async (partnerId,amount,currency,note,date)=>{
    const amt=Math.round(Number(amount));
    const isDol=currency==="دولار";
    const pId="partner_"+partnerId;
    const pb=getBal(pId);
    if (isDol&&amt>pb.dol){alert("رصيد الدولار غير كافٍ. المتاح: "+fmtDol(pb.dol));return false;}
    if (!isDol&&amt>pb.din){alert("رصيد الدينار غير كافٍ. المتاح: "+fmtD(pb.din));return false;}
    const pDin=isDol?pb.din:pb.din-amt;
    const pDol=isDol?pb.dol-amt:pb.dol;
    const mb=getBal("partners");
    const mDin=isDol?mb.din:mb.din-amt;
    const mDol=isDol?mb.dol-amt:mb.dol;
    await setDoc(doc(db,"fund_balances",pId),{din:pDin,dol:pDol},{merge:true});
    await setDoc(doc(db,"fund_balances","partners"),{din:mDin,dol:mDol},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId:pId, fundName:PARTNERS.find(p=>p.id===partnerId)?.name||"",
      type:"سحب", amount:amt, currency, amtInDinar:isDol?0:amt,
      note:note||"", date:date||today(),
      balAfterDin:pDin, balAfterDol:pDol,
      createdAt:new Date().toISOString(),
    });
    return true;
  };

  // حذف معاملة شريك
  const deletePartnerTx = async tx=>{
    if (!askPass("حذف المعاملة")) return;
    const isDol=tx.currency==="دولار";
    const amt=tx.amount||0;
    const isIn=tx.type==="إيداع";
    const pb=getBal(tx.fundId);
    const nDin=isDol?pb.din:(isIn?pb.din-amt:pb.din+amt);
    const nDol=isDol?(isIn?pb.dol-amt:pb.dol+amt):pb.dol;
    await setDoc(doc(db,"fund_balances",tx.fundId),{din:nDin,dol:nDol},{merge:true});
    await deleteDoc(doc(db,"fund_transactions",tx.id));
  };

  // تصفية رصيد
  const resetBalance = async (fundId,label)=>{
    if (!askPass("تصفية رصيد "+label)) return;
    await setDoc(doc(db,"fund_balances",fundId),{din:0,dol:0},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId, fundName:label,
      type:"تصفية", amount:0, currency:"دينار", amtInDinar:0,
      note:"تصفية رصيد سابق", date:today(),
      balAfterDin:0, balAfterDol:0, isReset:true,
      createdAt:new Date().toISOString(),
    });
  };

  // إنشاء مشروع
  const addProject = async (fundId,name,client,totalDin,totalDol,note)=>{
    await addDoc(collection(db,"fund_projects"),{
      fundId, name:name.trim(), client:client||"",
      totalDin:Number(totalDin)||0, totalDol:Number(totalDol)||0,
      note:note||"", status:"نشط",
      recDin:0, recDol:0, spdDin:0, spdDol:0,
      createdAt:new Date().toISOString(),
    });
  };

  // إضافة حركة مشروع
  const addProjectTx = async (proj,type,currency,amount,note,date)=>{
    const amt=Math.round(Number(amount));
    if (!amt||amt<=0) return;
    const isDol=currency==="دولار";
    const isRec=type==="إيداع";
    const upd={};
    if (isDol) upd[isRec?"recDol":"spdDol"]=(proj[isRec?"recDol":"spdDol"]||0)+amt;
    else upd[isRec?"recDin":"spdDin"]=(proj[isRec?"recDin":"spdDin"]||0)+amt;
    await setDoc(doc(db,"fund_projects",proj.id),upd,{merge:true});
    await addDoc(collection(db,"fund_projects_txs"),{
      projectId:proj.id, projectName:proj.name, fundId:proj.fundId,
      type, currency, amount:amt, amtInDinar:isDol?0:amt,
      note:note||"", date:date||today(),
      createdAt:new Date().toISOString(),
    });
  };

  // حذف حركة مشروع
  const deleteProjectTx = async (t,proj)=>{
    if (!askPass("حذف الحركة")) return;
    const isDol=t.currency==="دولار";
    const isRec=t.type==="إيداع";
    const upd={};
    if (isDol) upd[isRec?"recDol":"spdDol"]=Math.max(0,(proj[isRec?"recDol":"spdDol"]||0)-t.amount);
    else upd[isRec?"recDin":"spdDin"]=Math.max(0,(proj[isRec?"recDin":"spdDin"]||0)-t.amount);
    await setDoc(doc(db,"fund_projects",proj.id),upd,{merge:true});
    await deleteDoc(doc(db,"fund_projects_txs",t.id));
  };

  // حذف مشروع
  const deleteProject = async id=>{
    if (!askPass("حذف المشروع")) return;
    await deleteDoc(doc(db,"fund_projects",id));
  };

  // إنهاء مشروع
  const closeProject = async (proj,distsDin,distsDol)=>{
    const pDin=(proj.recDin||0)-(proj.spdDin||0);
    const pDol=(proj.recDol||0)-(proj.spdDol||0);
    for (const d of distsDin) {
      if (!d.pct||pDin<=0) continue;
      const share=Math.round(pDin*d.pct/100);
      if (!share) continue;
      const fb=getBal(d.fundId); const nD=fb.din+share;
      await setDoc(doc(db,"fund_balances",d.fundId),{din:nD,dol:fb.dol},{merge:true});
      await addDoc(collection(db,"fund_transactions"),{
        fundId:d.fundId, fundName:FUNDS.find(f=>f.id===d.fundId)?.name||"",
        type:"إيداع", currency:"دينار", amount:share, amtInDinar:share,
        note:d.pct+"% ربح (د.ع) — "+proj.name,
        date:today(), balAfterDin:nD, balAfterDol:fb.dol,
        isProjectProfit:true, createdAt:new Date().toISOString(),
      });
      if (d.fundId==="partners") {
        for (const p of PARTNERS) {
          const ps=Math.round(share*p.share/100);
          const pId="partner_"+p.id;
          const pb=getBal(pId);
          await setDoc(doc(db,"fund_balances",pId),{din:pb.din+ps,dol:pb.dol},{merge:true});
          await addDoc(collection(db,"fund_transactions"),{
            fundId:pId, fundName:p.name,
            type:"إيداع", currency:"دينار", amount:ps, amtInDinar:ps,
            note:"حصة "+p.share+"% (د.ع) — "+proj.name,
            date:today(), isDistribution:true, createdAt:new Date().toISOString(),
          });
        }
      }
    }
    for (const d of distsDol) {
      if (!d.pct||pDol<=0) continue;
      const share=Math.round(pDol*d.pct/100);
      if (!share) continue;
      const fb=getBal(d.fundId); const nD=fb.dol+share;
      await setDoc(doc(db,"fund_balances",d.fundId),{din:fb.din,dol:nD},{merge:true});
      await addDoc(collection(db,"fund_transactions"),{
        fundId:d.fundId, fundName:FUNDS.find(f=>f.id===d.fundId)?.name||"",
        type:"إيداع", currency:"دولار", amount:share, amtInDinar:0,
        note:d.pct+"% ربح ($) — "+proj.name,
        date:today(), balAfterDin:fb.din, balAfterDol:nD,
        isProjectProfit:true, createdAt:new Date().toISOString(),
      });
      if (d.fundId==="partners") {
        for (const p of PARTNERS) {
          const ps=Math.round(share*p.share/100);
          const pId="partner_"+p.id;
          const pb=getBal(pId);
          await setDoc(doc(db,"fund_balances",pId),{din:pb.din,dol:pb.dol+ps},{merge:true});
          await addDoc(collection(db,"fund_transactions"),{
            fundId:pId, fundName:p.name,
            type:"إيداع", currency:"دولار", amount:ps, amtInDinar:0,
            note:"حصة "+p.share+"% ($) — "+proj.name,
            date:today(), isDistribution:true, createdAt:new Date().toISOString(),
          });
        }
      }
    }
    await setDoc(doc(db,"fund_projects",proj.id),{status:"منتهي",closedAt:today()},{merge:true});
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",
      gap:12,fontFamily:"Tahoma",direction:"rtl"}}>
      <i className="ti ti-building-bank" style={{fontSize:48,color:"#2563EB"}} aria-hidden="true"/>
      <div style={{fontSize:20,fontWeight:700,color:"#1E293B"}}>{COMPANY.name}</div>
      <div style={{fontSize:13,color:"#64748B"}}>جاري التحميل...</div>
    </div>
  );

  if (page==="partners")
    return <PartnersPage
      partners={PARTNERS} balances={balances} txs={txs}
      onBack={()=>{setPage("home");setTxs([]);}}
      onDeposit={depositToPartners}
      onWithdraw={withdrawPartner}
      onDelete={deletePartnerTx}
      onReset={(id,label)=>resetBalance(id,label)}
    />;

  if (page==="project"&&selProject)
    return <ProjectDetail
      project={selProject}
      fund={FUNDS.find(f=>f.id===selProject.fundId)}
      allFunds={FUNDS}
      onBack={()=>{setPage("fund");setSelProject(null);}}
      onAddTx={addProjectTx}
      onDeleteTx={(t)=>deleteProjectTx(t,selProject)}
      onClose={closeProject}
      onDelete={id=>{deleteProject(id);setPage("fund");setSelProject(null);}}
    />;

  if (page==="fund"&&selFund) {
    const bal=getBal(selFund);
    const fund=FUNDS.find(f=>f.id===selFund);
    return <FundDetail
      fund={fund} balDin={bal.din} balDol={bal.dol}
      txs={txs} projects={projects}
      onBack={()=>{setPage("home");setSelFund(null);setTxs([]);}}
      onAdd={(type,amt,cur,note,date)=>addTx(selFund,type,amt,cur,note,date)}
      onTransfer={(amt,cur,note,date)=>transferProfit(selFund,amt,cur,note,date)}
      onDelete={deleteTx}
      onReset={()=>resetBalance(selFund,fund?.name||"")}
      onAddProject={(name,client,tDin,tDol,note)=>addProject(selFund,name,client,tDin,tDol,note)}
      onOpenProject={proj=>{setSelProject(proj);setPage("project");}}
    />;
  }

  return <FundsList funds={FUNDS} balances={balances}
    onSelect={id=>{
      if (id==="partners") setPage("partners");
      else {setSelFund(id);setPage("fund");}
    }}/>;
}
function FundsList({funds,balances,onSelect}) {
  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:760,margin:"0 auto",padding:"24px 16px"}}>
        <div style={{background:"#fff",borderRadius:16,padding:"18px 22px",
          marginBottom:22,border:"1px solid #E2E8F0",
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#1E293B"}}>{COMPANY.name}</div>
          <div style={{fontSize:12,color:"#64748B",marginTop:3}}>{COMPANY.address}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
          {funds.map(f=>{
            const bal=balances[f.id]||{din:0,dol:0};
            return (
              <button key={f.id} onClick={()=>onSelect(f.id)} style={{
                background:"#fff",border:"1px solid #E2E8F0",
                borderTop:"4px solid "+f.color,borderRadius:14,
                padding:"16px",cursor:"pointer",textAlign:"right",
                fontFamily:"Tahoma",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
                transition:"box-shadow 0.15s,transform 0.12s"}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.1)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <div style={{width:40,height:40,borderRadius:11,background:f.light,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <i className={"ti "+f.icon} style={{fontSize:20,color:f.color}} aria-hidden="true"/>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>{f.name}</div>
                </div>
                <div style={{fontSize:18,fontWeight:700,
                  color:bal.din>=0?f.color:"#DC2626"}}>
                  {bal.din>=0?"":"-"}{fmtD(Math.abs(bal.din))}
                </div>
                {bal.dol!==0&&(
                  <div style={{fontSize:13,fontWeight:700,marginTop:3,
                    color:bal.dol>=0?"#2563EB":"#DC2626"}}>
                    {bal.dol>=0?"":"-"}{fmtDol(Math.abs(bal.dol))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FundDetail({fund,balDin,balDol,txs,projects,onBack,onAdd,onTransfer,onDelete,onReset,onAddProject,onOpenProject}) {
  const [tab,    setTab]    = useState("tx");
  const [form,   setForm]   = useState({type:"إيداع",amount:"",currency:"دينار",note:"",date:today()});
  const [trForm, setTrForm] = useState({amount:"",currency:"دينار",note:"",date:today()});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState("");
  const set  =k=>v=>setForm(f=>({...f,[k]:v}));
  const setTr=k=>v=>setTrForm(f=>({...f,[k]:v}));
  const amtN =Number(form.amount)||0;
  const trAmt=Number(trForm.amount)||0;

  const save = async ()=>{
    if (!amtN||saving) return;
    setSaving(true);
    await onAdd(form.type,form.amount,form.currency,form.note,form.date);
    setSaving(false); setDone("tx");
    setTimeout(()=>{setDone("");setForm({type:"إيداع",amount:"",currency:"دينار",note:"",date:today()});},1400);
  };
  const saveTr = async ()=>{
    if (!trAmt||saving) return;
    setSaving(true);
    await onTransfer(trForm.amount,trForm.currency,trForm.note,trForm.date);
    setSaving(false); setDone("tr");
    setTimeout(()=>{setDone("");setTrForm({amount:"",currency:"دينار",note:"",date:today()});},1500);
  };

  const totIn =txs.filter(t=>t.type==="إيداع"||t.type==="إيداع أرباح").reduce((s,t)=>s+(t.currency==="دينار"?t.amount:0),0);
  const totOut=txs.filter(t=>t.type==="سحب"||t.type==="تحويل أرباح").reduce((s,t)=>s+(t.currency==="دينار"?t.amount:0),0);

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:660,margin:"0 auto",padding:"20px 14px"}}>
        <BackBtn onClick={onBack} label="رجوع للصناديق"/>

        <div style={{background:"#fff",borderRadius:18,padding:20,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid "+fund.color,
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{width:48,height:48,borderRadius:13,background:fund.light,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className={"ti "+fund.icon} style={{fontSize:26,color:fund.color}} aria-hidden="true"/>
            </div>
            <div style={{fontSize:19,fontWeight:700,color:"#1E293B"}}>{fund.name}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{background:"#F0FDF4",borderRadius:11,padding:"11px 12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>↓ إجمالي الإيداع</div>
              <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fmtD(totIn)}</div>
            </div>
            <div style={{background:"#FFF1F2",borderRadius:11,padding:"11px 12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>↑ إجمالي السحب</div>
              <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fmtD(totOut)}</div>
            </div>
            <div style={{background:balDin>=0?"#EFF6FF":"#FFF1F2",borderRadius:11,
              padding:"11px 12px",textAlign:"center",
              border:"1.5px solid "+(balDin>=0?fund.color+"40":"#DC262640")}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>💰 الرصيد</div>
              <div style={{fontSize:14,fontWeight:700,color:balDin>=0?fund.color:"#DC2626"}}>
                {balDin>=0?"":"-"}{fmtD(Math.abs(balDin))}
              </div>
              {balDol!==0&&(
                <div style={{fontSize:12,fontWeight:700,color:balDol>=0?"#2563EB":"#DC2626"}}>
                  {balDol>=0?"":"-"}{fmtDol(Math.abs(balDol))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:14}}>
          {[["tx","💰 معاملة"],["transfer","🔄 أرباح"],["projects","🏗️ مشاريع"],["reset","⚙️ تصفية"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)} style={{
              border:tab===v?"none":"1px solid #E2E8F0",borderRadius:10,
              padding:"10px 4px",cursor:"pointer",fontWeight:700,
              fontSize:12,fontFamily:"Tahoma",
              background:tab===v?"#1E293B":"#fff",
              color:tab===v?"#fff":"#64748B"}}>
              {l}
            </button>
          ))}
        </div>

        {tab==="tx"&&(
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:18,marginBottom:14}}>
            {done==="tx"?(
              <div style={{textAlign:"center",padding:"16px 0"}}>
                <div style={{fontSize:36}}>✅</div>
                <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم التسجيل</div>
              </div>
            ):(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  {["إيداع","سحب"].map(t=>(
                    <button key={t} onClick={()=>set("type")(t)} style={{
                      padding:"12px",borderRadius:10,cursor:"pointer",fontFamily:"Tahoma",
                      fontSize:14,fontWeight:700,
                      border:"1.5px solid "+(form.type===t?(t==="إيداع"?"#16A34A":"#DC2626"):"#E2E8F0"),
                      background:form.type===t?(t==="إيداع"?"#F0FDF4":"#FFF1F2"):"transparent",
                      color:form.type===t?(t==="إيداع"?"#16A34A":"#DC2626"):"#64748B"}}>
                      {t==="إيداع"?"↓ إيداع":"↑ سحب"}
                    </button>
                  ))}
                </div>
                <Lbl>العملة</Lbl>
                <CurrencyBtn value={form.currency} onChange={v=>set("currency")(v)}/>
                <Lbl>المبلغ</Lbl>
                <Inp type="number" placeholder="٠" value={form.amount}
                  onChange={e=>set("amount")(e.target.value)} autoFocus/>
                {amtN>0&&(
                  <div style={{fontSize:12,color:form.type==="إيداع"?"#16A34A":"#DC2626",
                    fontWeight:600,marginBottom:10,padding:"7px 12px",
                    background:form.type==="إيداع"?"#F0FDF4":"#FFF1F2",borderRadius:8}}>
                    ✍️ {numToWords(amtN)} {form.currency==="دولار"?"دولار":"دينار"}
                  </div>
                )}
                <Lbl>التاريخ</Lbl>
                <Inp type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
                <Lbl>ملاحظة</Lbl>
                <Inp placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
                <button onClick={save} disabled={!amtN||saving} style={{
                  width:"100%",border:"none",borderRadius:12,padding:"13px",
                  fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                  background:amtN?(form.type==="إيداع"?"#16A34A":"#DC2626"):"#E2E8F0",
                  color:amtN?"#fff":"#94A3B8"}}>
                  {saving?"جاري...":(form.type==="إيداع"?"↓ تأكيد الإيداع":"↑ تأكيد السحب")}
                </button>
              </>
            )}
          </div>
        )}

        {tab==="tx"&&(
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:10}}>
              السجل ({txs.length})
            </div>
            {txs.length===0?(
              <div style={{textAlign:"center",padding:24,color:"#94A3B8",
                background:"#fff",borderRadius:12,border:"1px solid #E2E8F0"}}>
                ما في معاملات بعد
              </div>
            ):txs.map(t=>{
              const isIn=t.type==="إيداع"||t.type==="إيداع أرباح";
              const isDol=t.currency==="دولار";
              return (
                <div key={t.id} style={{background:"#fff",borderRadius:12,
                  padding:"12px 14px",marginBottom:8,
                  border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                  borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,
                        color:isIn?"#16A34A":"#DC2626",marginBottom:2}}>
                        {isIn?"↓":"↑"} {t.type}
                        <span style={{fontSize:10,marginRight:6,padding:"1px 6px",
                          borderRadius:20,background:isDol?"#EFF6FF":"#F0FDF4",
                          color:isDol?"#2563EB":"#16A34A"}}>
                          {isDol?"دولار":"دينار"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                      {t.note&&<div style={{fontSize:11,color:"#1E293B",marginTop:2}}>{t.note}</div>}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:16,fontWeight:700,
                        color:isIn?"#16A34A":"#DC2626"}}>
                        {isIn?"+":"-"}{isDol?fmtDol(t.amount):fmtD(t.amount)}
                      </div>
                      <DelBtn onClick={()=>onDelete(t)}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="transfer"&&(
          <div style={{background:"#fff",border:"1.5px solid #9333EA30",
            borderRadius:16,padding:18,marginBottom:14}}>
            <div style={{fontSize:12,color:"#64748B",marginBottom:14,
              background:"#FAF5FF",borderRadius:8,padding:"10px 14px"}}>
              🔄 تحويل أرباح من هذا الصندوق إلى صندوق الشركاء ويتوزع تلقائياً
            </div>
            {done==="tr"?(
              <div style={{textAlign:"center",padding:"16px 0"}}>
                <div style={{fontSize:36}}>✅</div>
                <div style={{fontWeight:700,color:"#9333EA",marginTop:6}}>تم التحويل</div>
              </div>
            ):(
              <>
                <Lbl>العملة</Lbl>
                <CurrencyBtn value={trForm.currency} onChange={v=>setTr("currency")(v)}/>
                <Lbl>المبلغ</Lbl>
                <Inp type="number" placeholder="٠" value={trForm.amount}
                  onChange={e=>setTr("amount")(e.target.value)} autoFocus/>
                {trAmt>0&&(
                  <>
                    <div style={{fontSize:12,color:"#9333EA",fontWeight:600,marginBottom:10,
                      padding:"7px 12px",background:"#FAF5FF",borderRadius:8}}>
                      ✍️ {numToWords(trAmt)} {trForm.currency==="دولار"?"دولار":"دينار"}
                    </div>
                    <div style={{background:"#F8FAFC",borderRadius:10,padding:"10px 14px",
                      marginBottom:12,border:"1px solid #E2E8F0"}}>
                      <div style={{fontSize:11,color:"#9333EA",fontWeight:600,marginBottom:8}}>
                        📊 معاينة التوزيع
                      </div>
                      {PARTNERS.map(p=>(
                        <div key={p.id} style={{display:"flex",justifyContent:"space-between",
                          padding:"4px 0",borderBottom:"1px solid #F1F5F9"}}>
                          <span style={{fontSize:12,color:"#1E293B",fontWeight:600}}>{p.name}</span>
                          <span style={{fontSize:12,color:p.color,fontWeight:700}}>
                            {trForm.currency==="دولار"
                              ?fmtDol(Math.round(trAmt*p.share/100))
                              :fmtD(Math.round(trAmt*p.share/100))}
                            <span style={{fontSize:10,color:"#94A3B8",marginRight:4}}>({p.share}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <Lbl>التاريخ</Lbl>
                <Inp type="date" value={trForm.date} onChange={e=>setTr("date")(e.target.value)}/>
                <Lbl>ملاحظة</Lbl>
                <Inp placeholder="..." value={trForm.note} onChange={e=>setTr("note")(e.target.value)}/>
                <button onClick={saveTr} disabled={!trAmt||saving} style={{
                  width:"100%",border:"none",borderRadius:12,padding:"13px",
                  fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                  background:trAmt?"#9333EA":"#E2E8F0",
                  color:trAmt?"#fff":"#94A3B8"}}>
                  {saving?"جاري التحويل...":"🔄 تأكيد التحويل والتوزيع"}
                </button>
              </>
            )}
          </div>
        )}

        {tab==="projects"&&(
          <ProjectsTab fund={fund} projects={projects}
            onAddProject={onAddProject} onOpenProject={onOpenProject}/>
        )}

        {tab==="reset"&&(
          <div style={{background:"#fff",border:"1.5px solid #FEE2E2",
            borderRadius:16,padding:24,textAlign:"center"}}>
            <i className="ti ti-refresh-alert"
              style={{fontSize:48,color:"#DC2626",display:"block",marginBottom:12}}
              aria-hidden="true"/>
            <div style={{fontSize:15,fontWeight:700,color:"#1E293B",marginBottom:8}}>
              تصفية رصيد الصندوق
            </div>
            <div style={{fontSize:18,fontWeight:700,color:"#1E293B",marginBottom:4}}>
              {fmtD(balDin)}
            </div>
            {balDol!==0&&(
              <div style={{fontSize:15,fontWeight:700,color:"#2563EB",marginBottom:4}}>
                {fmtDol(balDol)}
              </div>
            )}
            <div style={{fontSize:12,color:"#94A3B8",marginBottom:20}}>
              تصفير الرصيد فقط — السجل يبقى كما هو
            </div>
            <button onClick={onReset} style={{
              background:"#DC2626",border:"none",borderRadius:12,
              padding:"13px 32px",color:"#fff",cursor:"pointer",
              fontSize:14,fontFamily:"Tahoma",fontWeight:700}}>
              🔄 تصفير الرصيد الآن
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
function ProjectsTab({fund,projects,onAddProject,onOpenProject}) {
  const [showForm,setShowForm]=useState(false);
  const [name,    setName]    =useState("");
  const [client,  setClient]  =useState("");
  const [totalDin,setTotalDin]=useState("");
  const [totalDol,setTotalDol]=useState("");
  const [note,    setNote]    =useState("");
  const [saving,  setSaving]  =useState(false);

  const save=async()=>{
    if (!name.trim()||saving) return;
    if (!totalDin&&!totalDol){alert("أدخل قيمة المشروع بالدينار أو الدولار");return;}
    setSaving(true);
    await onAddProject(name,client,Number(totalDin)||0,Number(totalDol)||0,note);
    setSaving(false);
    setName("");setClient("");setTotalDin("");setTotalDol("");setNote("");
    setShowForm(false);
  };

  const active  =projects.filter(p=>p.status==="نشط");
  const finished=projects.filter(p=>p.status==="منتهي");
  const tRD=active.reduce((s,p)=>s+(p.recDin||0),0);
  const tSD=active.reduce((s,p)=>s+(p.spdDin||0),0);
  const tRL=active.reduce((s,p)=>s+(p.recDol||0),0);
  const tSL=active.reduce((s,p)=>s+(p.spdDol||0),0);

  return (
    <div>
      {active.length>0&&(
        <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:10}}>
            إجمالي مشاريع {fund?.name} النشطة
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>↓ الإيداع</div>
              <div style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>{fmtD(tRD)}</div>
              {tRL>0&&<div style={{fontSize:10,color:"#2563EB"}}>{fmtDol(tRL)}</div>}
            </div>
            <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>↑ السحب</div>
              <div style={{fontSize:12,fontWeight:700,color:"#DC2626"}}>{fmtD(tSD)}</div>
              {tSL>0&&<div style={{fontSize:10,color:"#DC2626"}}>{fmtDol(tSL)}</div>}
            </div>
            <div style={{background:(tRD-tSD)>=0?"#EFF6FF":"#FFF1F2",borderRadius:10,
              padding:"10px",textAlign:"center",
              border:"1.5px solid "+((tRD-tSD)>=0?(fund?.color||"#2563EB")+"40":"#DC262640")}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>💰 الرصيد</div>
              <div style={{fontSize:12,fontWeight:700,
                color:(tRD-tSD)>=0?(fund?.color||"#2563EB"):"#DC2626"}}>
                {(tRD-tSD)>=0?"":"-"}{fmtD(Math.abs(tRD-tSD))}
              </div>
              {(tRL-tSL)!==0&&<div style={{fontSize:10,
                color:(tRL-tSL)>=0?"#2563EB":"#DC2626"}}>
                {(tRL-tSL)>=0?"":"-"}{fmtDol(Math.abs(tRL-tSL))}
              </div>}
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>نشطة ({active.length})</div>
        <button onClick={()=>setShowForm(v=>!v)} style={{
          background:showForm?"#64748B":(fund?.color||"#2563EB"),border:"none",
          borderRadius:9,padding:"8px 16px",color:"#fff",cursor:"pointer",
          fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
          {showForm?"✕ إلغاء":"+ مشروع جديد"}
        </button>
      </div>

      {showForm&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:18,marginBottom:14}}>
          <Lbl>اسم المشروع *</Lbl>
          <Inp placeholder="مثال: مشروع الكرادة..." value={name}
            onChange={e=>setName(e.target.value)} autoFocus/>
          <Lbl>اسم العميل</Lbl>
          <Inp placeholder="صاحب المشروع..." value={client}
            onChange={e=>setClient(e.target.value)}/>
          <div style={{background:"#F8FAFC",borderRadius:12,padding:14,
            marginBottom:10,border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1E293B",marginBottom:10}}>
              💰 قيمة المشروع الكلية
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <Lbl>🇮🇶 بالدينار</Lbl>
                <Inp type="number" placeholder="٠" value={totalDin}
                  onChange={e=>setTotalDin(e.target.value)} style={{marginBottom:0}}/>
                {Number(totalDin)>0&&<div style={{fontSize:10,color:"#16A34A",marginTop:4,fontWeight:600}}>{fmtD(Number(totalDin))}</div>}
              </div>
              <div>
                <Lbl>🇺🇸 بالدولار</Lbl>
                <Inp type="number" placeholder="٠" value={totalDol}
                  onChange={e=>setTotalDol(e.target.value)} style={{marginBottom:0}}/>
                {Number(totalDol)>0&&<div style={{fontSize:10,color:"#2563EB",marginTop:4,fontWeight:600}}>{fmtDol(Number(totalDol))}</div>}
              </div>
            </div>
          </div>
          <Lbl>ملاحظة</Lbl>
          <Inp placeholder="موقع، تفاصيل..." value={note} onChange={e=>setNote(e.target.value)}/>
          <button onClick={save} disabled={!name.trim()||saving} style={{
            width:"100%",border:"none",borderRadius:10,padding:"13px",
            fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
            background:name.trim()?(fund?.color||"#2563EB"):"#E2E8F0",
            color:name.trim()?"#fff":"#94A3B8"}}>
            {saving?"جاري الإنشاء...":"✅ إنشاء المشروع"}
          </button>
        </div>
      )}

      {active.length===0&&!showForm&&(
        <div style={{textAlign:"center",padding:32,color:"#94A3B8",
          background:"#fff",borderRadius:14,border:"1px solid #E2E8F0",marginBottom:14}}>
          <i className="ti ti-building-plus" style={{fontSize:40,color:"#CBD5E1",display:"block",marginBottom:8}} aria-hidden="true"/>
          ما في مشاريع نشطة
        </div>
      )}
      {active.map(p=><ProjCard key={p.id} proj={p} fund={fund} onOpen={onOpenProject}/>)}
      {finished.length>0&&(
        <>
          <div style={{fontSize:13,fontWeight:700,color:"#94A3B8",
            marginBottom:10,marginTop:20,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:16,background:"#CBD5E1",borderRadius:2}}/>
            مشاريع منتهية ({finished.length})
          </div>
          {finished.map(p=><ProjCard key={p.id} proj={p} fund={fund} onOpen={onOpenProject} finished/>)}
        </>
      )}
    </div>
  );
}

function ProjCard({proj,fund,onOpen,finished=false}) {
  const bDin=(proj.recDin||0)-(proj.spdDin||0);
  const bDol=(proj.recDol||0)-(proj.spdDol||0);
  const hasDol=(proj.recDol||0)>0||(proj.spdDol||0)>0;
  const c=finished?"#94A3B8":(fund?.color||"#2563EB");
  return (
    <button onClick={()=>onOpen(proj)} style={{
      width:"100%",background:finished?"#FAFAFA":"#fff",
      border:"1px solid #E2E8F0",borderRight:"4px solid "+c,
      borderRadius:14,padding:"14px 16px",marginBottom:10,
      cursor:"pointer",textAlign:"right",fontFamily:"Tahoma",opacity:finished?0.8:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:finished?"#64748B":"#1E293B"}}>{proj.name}</div>
          {proj.client&&<div style={{fontSize:11,color:"#94A3B8",marginTop:1}}>👤 {proj.client}</div>}
          <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
            marginTop:4,display:"inline-block",
            background:finished?"#F1F5F9":"#DCFCE7",
            color:finished?"#64748B":"#16A34A"}}>
            {finished?"✓ منتهي":"● نشط"}
          </span>
        </div>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:15,fontWeight:700,color:bDin>=0?c:"#DC2626"}}>
            {bDin>=0?"":"-"}{fmtD(Math.abs(bDin))}
          </div>
          {hasDol&&<div style={{fontSize:13,fontWeight:700,color:bDol>=0?"#2563EB":"#DC2626"}}>
            {bDol>=0?"":"-"}{fmtDol(Math.abs(bDol))}
          </div>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:hasDol?"1fr 1fr 1fr 1fr":"1fr 1fr",gap:6}}>
        <div style={{background:"#F0FDF4",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#64748B"}}>↓ إيداع د.ع</div>
          <div style={{fontSize:11,fontWeight:700,color:"#16A34A"}}>{fmtD(proj.recDin||0)}</div>
        </div>
        <div style={{background:"#FFF1F2",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#64748B"}}>↑ سحب د.ع</div>
          <div style={{fontSize:11,fontWeight:700,color:"#DC2626"}}>{fmtD(proj.spdDin||0)}</div>
        </div>
        {hasDol&&<>
          <div style={{background:"#EFF6FF",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"#64748B"}}>↓ إيداع $</div>
            <div style={{fontSize:11,fontWeight:700,color:"#2563EB"}}>{fmtDol(proj.recDol||0)}</div>
          </div>
          <div style={{background:"#FEF2F2",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"#64748B"}}>↑ سحب $</div>
            <div style={{fontSize:11,fontWeight:700,color:"#DC2626"}}>{fmtDol(proj.spdDol||0)}</div>
          </div>
        </>}
      </div>
    </button>
  );
}
function ProjectDetail({project,fund,allFunds,onBack,onAddTx,onDeleteTx,onClose,onDelete}) {
  const [proj,     setProj]    =useState(project);
  const [tab,      setTab]     =useState("deposit");
  const [currency, setCurrency]=useState("دينار");
  const [form,     setForm]    =useState({amount:"",note:"",date:today()});
  const [saving,   setSaving]  =useState(false);
  const [done,     setDone]    =useState(false);
  const [showClose,setShowClose]=useState(false);
  const [closing,  setClosing] =useState(false);
  const [projTxs,  setProjTxs]=useState([]);
  const [distsDin, setDistsDin]=useState([
    {fundId:"capital",pct:0,name:"صندوق رأس المال"},
    {fundId:"general",pct:0,name:"الصندوق العام"},
    {fundId:"partners",pct:100,name:"صندوق أرباح الشركاء"},
  ]);
  const [distsDol, setDistsDol]=useState([
    {fundId:"capital",pct:0,name:"صندوق رأس المال"},
    {fundId:"general",pct:0,name:"الصندوق العام"},
    {fundId:"partners",pct:100,name:"صندوق أرباح الشركاء"},
  ]);

  const set   =k=>v=>setForm(f=>({...f,[k]:v}));
  const amtN  =Number(form.amount)||0;
  const isDol =currency==="دولار";
  const bDin  =(proj.recDin||0)-(proj.spdDin||0);
  const bDol  =(proj.recDol||0)-(proj.spdDol||0);
  const avail =isDol?bDol:bDin;
  const isAct =proj.status==="نشط";
  const pDin  =bDin; const pDol=bDol;
  const pctDin=proj.totalDin>0?Math.min(100,Math.round((proj.recDin||0)*100/proj.totalDin)):null;
  const pctDol=proj.totalDol>0?Math.min(100,Math.round((proj.recDol||0)*100/proj.totalDol)):null;
  const ttlDin=distsDin.reduce((s,d)=>s+Number(d.pct),0);
  const ttlDol=distsDol.reduce((s,d)=>s+Number(d.pct),0);

  useEffect(()=>setProj(project),[project]);
  useEffect(()=>{
    const u=onSnapshot(
      query(collection(db,"fund_projects_txs"),
        where("projectId","==",project.id),orderBy("createdAt","desc")),
      snap=>setProjTxs(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
    return ()=>u();
  },[project.id]);

  const save=async()=>{
    if (!amtN||saving) return;
    if (tab==="withdraw"&&amtN>avail){
      alert("الرصيد غير كافٍ. المتاح: "+(isDol?fmtDol(avail):fmtD(avail)));return;
    }
    setSaving(true);
    await onAddTx(proj,tab==="deposit"?"إيداع":"سحب",currency,form.amount,form.note,form.date);
    setSaving(false); setDone(true);
    setTimeout(()=>{setDone(false);setForm({amount:"",note:"",date:today()});},1400);
  };

  const doClose=async()=>{
    const okD=pDin<=0||Math.round(ttlDin)===100;
    const okL=pDol<=0||Math.round(ttlDol)===100;
    if (!okD||!okL){alert("مجموع النسب يجب أن يكون 100% لكل عملة");return;}
    setClosing(true);
    await onClose(proj,
      pDin>0?distsDin.map(d=>({fundId:d.fundId,pct:Number(d.pct)})):[],
      pDol>0?distsDol.map(d=>({fundId:d.fundId,pct:Number(d.pct)})):[]
    );
    setClosing(false); setShowClose(false);
  };

  const DistRow=({d,i,dists,setDists,profit,isDolR})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
      background:"#F8FAFC",borderRadius:10,padding:"10px 12px"}}>
      <div style={{flex:1,fontSize:13,fontWeight:600,color:"#1E293B"}}>{d.name}</div>
      <input type="number" min="0" max="100" value={d.pct}
        onChange={e=>{const v=[...dists];v[i]={...v[i],pct:Number(e.target.value)};setDists(v);}}
        style={{width:58,border:"1px solid #E2E8F0",borderRadius:8,padding:"6px 8px",
          fontSize:15,fontWeight:700,textAlign:"center",outline:"none",fontFamily:"Tahoma"}}/>
      <span style={{fontSize:13,color:"#64748B"}}>%</span>
      <div style={{fontSize:12,fontWeight:700,minWidth:90,textAlign:"left",
        color:isDolR?"#2563EB":"#16A34A"}}>
        {isDolR?fmtDol(Math.round(profit*d.pct/100)):fmtD(Math.round(profit*d.pct/100))}
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:660,margin:"0 auto",padding:"20px 14px"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <BackBtn onClick={onBack} label={"رجوع لـ "+(fund?.name||"")}/>
          {!isAct&&(
            <button onClick={()=>{if(askPass("حذف المشروع")) onDelete(proj.id);}}
              style={{background:"transparent",border:"1px solid #FEE2E2",
                borderRadius:10,padding:"8px 14px",color:"#DC2626",
                cursor:"pointer",fontSize:12,fontFamily:"Tahoma",fontWeight:600}}>
              🗑️ حذف المشروع
            </button>
          )}
        </div>

        <div style={{background:"#fff",borderRadius:18,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",
          borderTop:"5px solid "+(isAct?(fund?.color||"#2563EB"):"#94A3B8"),
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{proj.name}</div>
              {proj.client&&<div style={{fontSize:12,color:"#64748B",marginTop:2}}>👤 {proj.client}</div>}
              <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
                marginTop:5,display:"inline-block",
                background:isAct?"#DCFCE7":"#F1F5F9",
                color:isAct?"#16A34A":"#64748B"}}>
                {isAct?"● نشط":"✓ منتهي"}
              </span>
            </div>
            {isAct&&(
              <button onClick={()=>setShowClose(true)} style={{
                background:"#7C3AED",border:"none",borderRadius:10,
                padding:"8px 14px",color:"#fff",cursor:"pointer",
                fontSize:13,fontFamily:"Tahoma",fontWeight:700}}>
                🏁 إنهاء
              </button>
            )}
          </div>

          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#16A34A",marginBottom:8}}>🇮🇶 حساب الدينار</div>
            {proj.totalDin>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:6}}>قيمة المشروع: <strong>{fmtD(proj.totalDin)}</strong></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:proj.totalDin>0?8:0}}>
              <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ إيداع</div>
                <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fmtD(proj.recDin||0)}</div>
                {pctDin!==null&&<div style={{fontSize:10,color:"#16A34A"}}>{pctDin}%</div>}
              </div>
              <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ سحب</div>
                <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fmtD(proj.spdDin||0)}</div>
              </div>
              <div style={{background:bDin>=0?"#EFF6FF":"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center",
                border:"1.5px solid "+(bDin>=0?(fund?.color||"#2563EB")+"40":"#DC262640")}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>الرصيد</div>
                <div style={{fontSize:13,fontWeight:700,color:bDin>=0?(fund?.color||"#2563EB"):"#DC2626"}}>
                  {bDin>=0?"":"-"}{fmtD(Math.abs(bDin))}
                </div>
              </div>
            </div>
            {proj.totalDin>0&&pctDin!==null&&(
              <div style={{background:"#F1F5F9",borderRadius:999,height:6,overflow:"hidden"}}>
                <div style={{width:pctDin+"%",height:"100%",borderRadius:999,
                  background:"linear-gradient(90deg,#16A34A,#4ade80)"}}/>
              </div>
            )}
          </div>

          {((proj.recDol||0)>0||(proj.spdDol||0)>0||proj.totalDol>0)&&(
            <div style={{borderTop:"1px solid #E2E8F0",paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#2563EB",marginBottom:8}}>🇺🇸 حساب الدولار</div>
              {proj.totalDol>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:6}}>قيمة المشروع: <strong>{fmtDol(proj.totalDol)}</strong></div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:proj.totalDol>0?8:0}}>
                <div style={{background:"#EFF6FF",borderRadius:10,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ إيداع</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#2563EB"}}>{fmtDol(proj.recDol||0)}</div>
                  {pctDol!==null&&<div style={{fontSize:10,color:"#2563EB"}}>{pctDol}%</div>}
                </div>
                <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ سحب</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fmtDol(proj.spdDol||0)}</div>
                </div>
                <div style={{background:bDol>=0?"#EFF6FF":"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center",
                  border:"1.5px solid "+(bDol>=0?"#2563EB40":"#DC262640")}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>الرصيد</div>
                  <div style={{fontSize:13,fontWeight:700,color:bDol>=0?"#2563EB":"#DC2626"}}>
                    {bDol>=0?"":"-"}{fmtDol(Math.abs(bDol))}
                  </div>
                </div>
              </div>
              {proj.totalDol>0&&pctDol!==null&&(
                <div style={{background:"#F1F5F9",borderRadius:999,height:6,overflow:"hidden"}}>
                  <div style={{width:pctDol+"%",height:"100%",borderRadius:999,
                    background:"linear-gradient(90deg,#2563EB,#60a5fa)"}}/>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
          {[["deposit","↓ إيداع","#16A34A"],["withdraw","↑ سحب","#DC2626"],["history","📋 السجل","#2563EB"]].map(([id,l,c])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              border:tab===id?"none":"1px solid #E2E8F0",borderRadius:10,
              padding:"11px 6px",cursor:"pointer",fontWeight:700,
              fontSize:13,fontFamily:"Tahoma",
              background:tab===id?c:"#fff",color:tab===id?"#fff":"#64748B"}}>
              {l}
            </button>
          ))}
        </div>

        {(tab==="deposit"||tab==="withdraw")&&(
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:18,marginBottom:14}}>
            {!isAct?(
              <div style={{textAlign:"center",padding:16,color:"#94A3B8"}}>المشروع منتهي</div>
            ):done?(
              <div style={{textAlign:"center",padding:"14px 0"}}>
                <div style={{fontSize:36}}>✅</div>
                <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم التسجيل</div>
              </div>
            ):(
              <>
                <Lbl>العملة</Lbl>
                <CurrencyBtn value={currency} onChange={setCurrency}/>
                {tab==="withdraw"&&(
                  <div style={{fontSize:12,color:"#64748B",marginBottom:10,
                    background:"#F8FAFC",borderRadius:8,padding:"8px 12px"}}>
                    المتاح: {isDol?fmtDol(bDol):fmtD(bDin)}
                  </div>
                )}
                <Lbl>المبلغ ({isDol?"دولار":"دينار"})</Lbl>
                <Inp type="number" placeholder="٠" value={form.amount}
                  onChange={e=>set("amount")(e.target.value)} autoFocus/>
                {amtN>0&&(
                  <div style={{fontSize:12,
                    color:tab==="deposit"?"#16A34A":"#DC2626",
                    fontWeight:600,marginBottom:10,padding:"7px 12px",
                    background:tab==="deposit"?"#F0FDF4":"#FFF1F2",borderRadius:8}}>
                    ✍️ {numToWords(amtN)} {isDol?"دولار":"دينار"}
                  </div>
                )}
                {tab==="withdraw"&&amtN>avail&&(
                  <div style={{fontSize:12,color:"#DC2626",fontWeight:600,
                    marginBottom:10,padding:"7px 12px",background:"#FFF1F2",borderRadius:8}}>
                    ⚠️ تجاوز الرصيد المتاح
                  </div>
                )}
                <Lbl>التاريخ</Lbl>
                <Inp type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
                <Lbl>ملاحظة</Lbl>
                <Inp placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
                <button onClick={save}
                  disabled={!amtN||saving||(tab==="withdraw"&&amtN>avail)}
                  style={{width:"100%",border:"none",borderRadius:12,padding:"13px",
                    fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                    background:(amtN&&(tab==="deposit"||amtN<=avail))
                      ?(tab==="deposit"?"#16A34A":"#DC2626"):"#E2E8F0",
                    color:(amtN&&(tab==="deposit"||amtN<=avail))?"#fff":"#94A3B8"}}>
                  {saving?"جاري...":(tab==="deposit"?"↓ تأكيد الإيداع":"↑ تأكيد السحب")}
                </button>
              </>
            )}
          </div>
        )}

        {tab==="history"&&(
          <div>
            {projTxs.length===0?(
              <div style={{textAlign:"center",padding:24,color:"#94A3B8",
                background:"#fff",borderRadius:12,border:"1px solid #E2E8F0"}}>
                ما في معاملات بعد
              </div>
            ):projTxs.map(t=>{
              const isIn=t.type==="إيداع";
              const isDolT=t.currency==="دولار";
              return (
                <div key={t.id} style={{background:"#fff",borderRadius:12,
                  padding:"12px 14px",marginBottom:8,
                  border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                  borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                          {isIn?"↓ إيداع":"↑ سحب"}
                        </span>
                        <span style={{fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:20,
                          background:isDolT?"#EFF6FF":"#F0FDF4",
                          color:isDolT?"#2563EB":"#16A34A"}}>
                          {isDolT?"دولار":"دينار"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                      {t.note&&<div style={{fontSize:11,color:"#1E293B",marginTop:2}}>{t.note}</div>}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:16,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                        {isIn?"+":"-"}{isDolT?fmtDol(t.amount):fmtD(t.amount)}
                      </div>
                      <DelBtn onClick={()=>onDeleteTx(t)}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showClose&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
            zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"#fff",borderRadius:20,width:"100%",
              maxWidth:540,maxHeight:"92vh",overflow:"auto",
              boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#7C3AED"}}>🏁 إنهاء المشروع</div>
                <button onClick={()=>setShowClose(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#64748B"}}>✕</button>
              </div>
              <div style={{padding:"16px 20px"}}>
                <div style={{background:"#F8FAFC",borderRadius:12,padding:14,marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1E293B",marginBottom:10}}>الحساب الختامي</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>الإيداع</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fmtD(proj.recDin||0)}</div>
                      {(proj.recDol||0)>0&&<div style={{fontSize:11,color:"#2563EB"}}>{fmtDol(proj.recDol)}</div>}
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>السحب</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fmtD(proj.spdDin||0)}</div>
                      {(proj.spdDol||0)>0&&<div style={{fontSize:11,color:"#DC2626"}}>{fmtDol(proj.spdDol)}</div>}
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>صافي الربح</div>
                      <div style={{fontSize:13,fontWeight:700,color:pDin>=0?"#16A34A":"#DC2626"}}>
                        {pDin>=0?"+":"-"}{fmtD(Math.abs(pDin))}
                      </div>
                      {pDol!==0&&<div style={{fontSize:11,fontWeight:700,color:pDol>=0?"#2563EB":"#DC2626"}}>
                        {pDol>=0?"+":"-"}{fmtDol(Math.abs(pDol))}
                      </div>}
                    </div>
                  </div>
                </div>

                {pDin>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#16A34A",marginBottom:8}}>
                      🇮🇶 توزيع ربح الدينار ({fmtD(pDin)})
                    </div>
                    {distsDin.map((d,i)=>(
                      <DistRow key={d.fundId} d={d} i={i} dists={distsDin} setDists={setDistsDin} profit={pDin} isDolR={false}/>
                    ))}
                    <select onChange={e=>{
                      if(!e.target.value) return;
                      const f=allFunds.find(x=>x.id===e.target.value);
                      if(f&&!distsDin.find(d=>d.fundId===f.id))
                        setDistsDin(prev=>[...prev,{fundId:f.id,pct:0,name:f.name}]);
                      e.target.value="";
                    }} style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:9,
                      padding:"8px",fontSize:12,fontFamily:"Tahoma",
                      color:"#64748B",background:"#F8FAFC",outline:"none",marginBottom:6}}>
                      <option value="">+ أضف صندوقاً</option>
                      {allFunds.filter(f=>!distsDin.find(d=>d.fundId===f.id)).map(f=>(
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <div style={{padding:"8px",borderRadius:8,textAlign:"center",
                      background:Math.round(ttlDin)===100?"#F0FDF4":"#FFF1F2"}}>
                      <span style={{fontSize:13,fontWeight:700,
                        color:Math.round(ttlDin)===100?"#16A34A":"#DC2626"}}>
                        المجموع: {ttlDin}%
                      </span>
                    </div>
                  </div>
                )}

                {pDol>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#2563EB",marginBottom:8}}>
                      🇺🇸 توزيع ربح الدولار ({fmtDol(pDol)})
                    </div>
                    {distsDol.map((d,i)=>(
                      <DistRow key={d.fundId} d={d} i={i} dists={distsDol} setDists={setDistsDol} profit={pDol} isDolR={true}/>
                    ))}
                    <select onChange={e=>{
                      if(!e.target.value) return;
                      const f=allFunds.find(x=>x.id===e.target.value);
                      if(f&&!distsDol.find(d=>d.fundId===f.id))
                        setDistsDol(prev=>[...prev,{fundId:f.id,pct:0,name:f.name}]);
                      e.target.value="";
                    }} style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:9,
                      padding:"8px",fontSize:12,fontFamily:"Tahoma",
                      color:"#64748B",background:"#F8FAFC",outline:"none",marginBottom:6}}>
                      <option value="">+ أضف صندوقاً</option>
                      {allFunds.filter(f=>!distsDol.find(d=>d.fundId===f.id)).map(f=>(
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <div style={{padding:"8px",borderRadius:8,textAlign:"center",
                      background:Math.round(ttlDol)===100?"#EFF6FF":"#FFF1F2"}}>
                      <span style={{fontSize:13,fontWeight:700,
                        color:Math.round(ttlDol)===100?"#2563EB":"#DC2626"}}>
                        المجموع: {ttlDol}%
                      </span>
                    </div>
                  </div>
                )}

                <div style={{fontSize:11,color:"#64748B",marginBottom:12,
                  background:"#FAF5FF",borderRadius:8,padding:"8px 12px"}}>
                  بعد الإنهاء: المشروع ينتقل لقائمة المنتهية وتُحذف أرصدته من إجمالي الصندوق
                </div>
                <button onClick={doClose}
                  disabled={closing||(pDin>0&&Math.round(ttlDin)!==100)||(pDol>0&&Math.round(ttlDol)!==100)}
                  style={{width:"100%",border:"none",borderRadius:12,padding:"14px",
                    fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                    background:(pDin<=0||Math.round(ttlDin)===100)&&(pDol<=0||Math.round(ttlDol)===100)
                      ?"#7C3AED":"#E2E8F0",
                    color:(pDin<=0||Math.round(ttlDin)===100)&&(pDol<=0||Math.round(ttlDol)===100)
                      ?"#fff":"#94A3B8"}}>
                  {closing?"جاري التوزيع...":"🏁 تأكيد الإنهاء وتوزيع الأرباح"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function PartnersPage({partners,balances,txs,onBack,onDeposit,onWithdraw,onDelete,onReset}) {
  const [selP,   setSelP]  =useState(null);
  const [form,   setForm]  =useState({amount:"",note:"",date:today()});
  const [wCur,   setWCur]  =useState("دينار");
  const [saving, setSaving]=useState(false);
  const [done,   setDone]  =useState(false);
  const [preview,setPreview]=useState(false);

  const set      =k=>v=>setForm(f=>({...f,[k]:v}));
  const resetForm=()=>{setForm({amount:"",note:"",date:today()});setDone(false);};
  const getBal   =id=>balances[id]||{din:0,dol:0};

  if (selP) {
    const p      =selP;
    const pId    ="partner_"+p.id;
    const pBal   =getBal(pId);
    const avail  =wCur==="دولار"?pBal.dol:pBal.din;
    const wAmtN  =Number(form.amount)||0;
    const allTxs =txs.filter(t=>t.fundId===pId).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const deps   =allTxs.filter(t=>t.type==="إيداع"||t.type==="إيداع أرباح"||t.isDistribution);
    const withs  =allTxs.filter(t=>t.type==="سحب");
    const totInD =deps.reduce((s,t)=>s+(t.currency==="دينار"?(t.amount||0):0),0);
    const totInL =deps.reduce((s,t)=>s+(t.currency==="دولار"?(t.amount||0):0),0);
    const totOutD=withs.reduce((s,t)=>s+(t.currency==="دينار"?(t.amount||0):0),0);
    const totOutL=withs.reduce((s,t)=>s+(t.currency==="دولار"?(t.amount||0):0),0);

    const buildHtml=()=>{
      const rows=allTxs.map(t=>{
        const isIn=t.type!=="سحب";
        const isDolT=t.currency==="دولار";
        return "<tr style='border-bottom:1px solid #eee'>"
          +"<td style='padding:8px;text-align:center'>"+t.date+"</td>"
          +"<td style='padding:8px;text-align:center;color:"+(isIn?"#16A34A":"#DC2626")+"'>"+(isIn?"إيداع":"سحب")+"</td>"
          +"<td style='padding:8px;text-align:right'>"+t.note+"</td>"
          +"<td style='padding:8px;text-align:center;font-weight:700;color:"+(isIn?"#16A34A":"#DC2626")+"'>"
          +(isIn?"+":"-")+(isDolT?fmtDol(t.amount):fmtD(t.amount))+"</td></tr>";
      }).join("");
      return "<!DOCTYPE html><html dir='rtl'><head><meta charset='utf-8'/>"
        +"<title>"+p.name+"</title>"
        +"<style>body{font-family:Tahoma;direction:rtl;margin:24px}"
        +"table{width:100%;border-collapse:collapse}th{background:#F1F5F9;padding:10px;text-align:center}"
        +"@media print{button{display:none}}</style></head><body>"
        +"<h2 style='color:#1E293B'>"+COMPANY.name+"</h2>"
        +"<p style='color:#64748B'>"+COMPANY.address+"</p><hr/>"
        +"<h3>كشف حساب — "+p.name+"</h3>"
        +"<p>الرصيد: <strong style='color:"+p.color+"'>"+fmtD(pBal.din)+"</strong>"
        +(pBal.dol?" | <strong style='color:#2563EB'>"+fmtDol(pBal.dol)+"</strong>":"")+"</p>"
        +"<table><thead><tr><th>التاريخ</th><th>النوع</th><th>ملاحظة</th><th>المبلغ</th></tr></thead>"
        +"<tbody>"+rows+"</tbody></table>"
        +"<p style='margin-top:16px;color:#64748B;font-size:12px'>طُبع: "+today()+"</p>"
        +"</body></html>";
    };

    const printStatement=()=>{
      const old=document.getElementById("__pf");
      if (old) old.remove();
      const fr=document.createElement("iframe");
      fr.id="__pf";
      fr.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
      document.body.appendChild(fr);
      fr.contentDocument.open();
      fr.contentDocument.write(buildHtml());
      fr.contentDocument.close();
      setTimeout(()=>{fr.contentWindow.focus();fr.contentWindow.print();setTimeout(()=>fr.remove(),2000);},400);
    };

    const handleWithdraw=async()=>{
      if (!wAmtN||saving) return;
      setSaving(true);
      const ok=await onWithdraw(p.id,form.amount,wCur,form.note,form.date);
      setSaving(false);
      if (ok){setDone(true);setTimeout(resetForm,1600);}
    };

    return (
      <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"24px 16px"}}>
          <BackBtn onClick={()=>{setSelP(null);resetForm();}} label="رجوع للشركاء"/>

          <div style={{background:"#fff",borderRadius:18,padding:20,marginBottom:14,
            border:"1px solid #E2E8F0",borderTop:"5px solid "+p.color,
            boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:50,height:50,borderRadius:14,background:p.light,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <i className="ti ti-user" style={{fontSize:26,color:p.color}} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{fontSize:19,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                  <div style={{fontSize:12,color:"#64748B",marginTop:2}}>حصة {p.share}%</div>
                </div>
              </div>
              <button onClick={()=>setPreview(true)} style={{
                background:p.color,border:"none",borderRadius:10,
                padding:"9px 16px",color:"#fff",cursor:"pointer",
                fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
                🖨️ كشف الحساب
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div style={{background:"#F0FDF4",borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>↓ إيداع</div>
                <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fmtD(totInD)}</div>
                {totInL>0&&<div style={{fontSize:11,color:"#2563EB"}}>{fmtDol(totInL)}</div>}
              </div>
              <div style={{background:"#FFF1F2",borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>↑ سحب</div>
                <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fmtD(totOutD)}</div>
                {totOutL>0&&<div style={{fontSize:11,color:"#DC2626"}}>{fmtDol(totOutL)}</div>}
              </div>
              <div style={{background:p.light,borderRadius:12,padding:"12px",textAlign:"center",
                border:"1.5px solid "+p.color+"40"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>الرصيد</div>
                <div style={{fontSize:14,fontWeight:700,color:pBal.din>=0?p.color:"#DC2626"}}>{fmtD(pBal.din)}</div>
                {pBal.dol!==0&&<div style={{fontSize:12,fontWeight:700,color:"#2563EB"}}>{fmtDol(pBal.dol)}</div>}
              </div>
            </div>
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>↑ سحب من الصندوق</div>
            {done?(
              <div style={{textAlign:"center",padding:"16px 0"}}>
                <div style={{fontSize:36}}>✅</div>
                <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم السحب</div>
              </div>
            ):(
              <>
                <Lbl>العملة</Lbl>
                <CurrencyBtn value={wCur} onChange={setWCur}/>
                <div style={{fontSize:12,color:"#64748B",marginBottom:10,
                  background:"#F8FAFC",borderRadius:8,padding:"7px 12px"}}>
                  المتاح: {wCur==="دولار"?fmtDol(pBal.dol):fmtD(pBal.din)}
                </div>
                <Lbl>المبلغ</Lbl>
                <Inp type="number" placeholder="٠" value={form.amount}
                  onChange={e=>set("amount")(e.target.value)} autoFocus/>
                {wAmtN>0&&(
                  <div style={{fontSize:12,color:wAmtN<=avail?p.color:"#DC2626",
                    fontWeight:600,marginBottom:10,padding:"7px 12px",
                    background:wAmtN<=avail?p.light:"#FFF1F2",borderRadius:8}}>
                    {wAmtN<=avail?"✅ الرصيد كافٍ":"⚠️ تجاوز الرصيد"}
                  </div>
                )}
                <Lbl>التاريخ</Lbl>
                <Inp type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
                <Lbl>ملاحظة</Lbl>
                <Inp placeholder="سبب السحب..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
                <button onClick={handleWithdraw}
                  disabled={!form.amount||saving||wAmtN>avail}
                  style={{width:"100%",border:"none",borderRadius:12,padding:"13px",
                    fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                    background:wAmtN>0&&wAmtN<=avail?p.color:"#E2E8F0",
                    color:wAmtN>0&&wAmtN<=avail?"#fff":"#94A3B8"}}>
                  {saving?"جاري السحب...":"↑ تأكيد السحب"}
                </button>
              </>
            )}
          </div>

          <div style={{background:"#fff",border:"1px solid #FEE2E2",borderRadius:12,
            padding:"12px 16px",marginBottom:14,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>🔄 تصفية الرصيد</div>
              <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>تصفير رصيد الشريك</div>
            </div>
            <button onClick={()=>onReset("partner_"+p.id,p.name)} style={{
              background:"#FFF1F2",border:"1px solid #FEE2E2",borderRadius:9,
              padding:"8px 14px",color:"#DC2626",cursor:"pointer",
              fontSize:12,fontFamily:"Tahoma",fontWeight:700}}>تصفير</button>
          </div>

          {withs.length>0&&(
            <>
              <div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:10,
                display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:3,height:16,background:"#DC2626",borderRadius:2}}/>
                السحوبات ({withs.length})
              </div>
              {withs.map(t=>(
                <div key={t.id} style={{background:"#fff",borderRadius:12,
                  padding:"12px 16px",marginBottom:8,
                  border:"1px solid #FEE2E2",borderRight:"4px solid #DC2626"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,color:"#64748B"}}>📅 {t.date}</div>
                      {t.note&&<div style={{fontSize:13,color:"#1E293B",marginTop:2}}>{t.note}</div>}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:17,fontWeight:700,color:"#DC2626"}}>
                        -{t.currency==="دولار"?fmtDol(t.amount):fmtD(t.amount)}
                      </div>
                      <DelBtn onClick={()=>onDelete(t)}/>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {deps.length>0&&(
            <>
              <div style={{fontSize:13,fontWeight:700,color:"#16A34A",
                marginBottom:10,marginTop:16,display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:3,height:16,background:"#16A34A",borderRadius:2}}/>
                الإيداعات ({deps.length})
              </div>
              {deps.map(t=>(
                <div key={t.id} style={{background:"#fff",borderRadius:12,
                  padding:"12px 16px",marginBottom:8,
                  border:"1px solid #DCFCE7",borderRight:"4px solid #16A34A"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,color:"#64748B"}}>📅 {t.date}</div>
                      <div style={{fontSize:12,color:"#64748B",marginTop:1}}>{t.note}</div>
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:17,fontWeight:700,color:"#16A34A"}}>
                        +{t.currency==="دولار"?fmtDol(t.amount):fmtD(t.amount)}
                      </div>
                      <DelBtn onClick={()=>onDelete(t)}/>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {preview&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
              zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
              <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:700,
                maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",
                boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"14px 18px",borderBottom:"1px solid #E2E8F0"}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>
                    معاينة كشف الحساب — {p.name}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={printStatement} style={{
                      background:p.color,border:"none",borderRadius:9,
                      padding:"8px 16px",color:"#fff",cursor:"pointer",
                      fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
                      🖨️ طباعة
                    </button>
                    <button onClick={()=>setPreview(false)} style={{
                      background:"#F1F5F9",border:"none",borderRadius:9,
                      padding:"8px 14px",color:"#64748B",cursor:"pointer",
                      fontSize:13,fontFamily:"Tahoma"}}>✕</button>
                  </div>
                </div>
                <div style={{flex:1,overflow:"auto"}}>
                  <iframe srcDoc={buildHtml()} style={{width:"100%",height:"560px",border:"none"}} title="معاينة"/>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const mainBal=getBal("partners");
  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:640,margin:"0 auto",padding:"24px 16px"}}>
        <BackBtn onClick={onBack} label="رجوع للصناديق"/>
        <DepositForm onDeposit={onDeposit}/>
        <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:16,border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:8}}>إجمالي صندوق الشركاء</div>
          <div style={{fontSize:20,fontWeight:700,color:"#9333EA"}}>{fmtD(mainBal.din)}</div>
          {mainBal.dol!==0&&<div style={{fontSize:15,fontWeight:700,color:"#2563EB"}}>{fmtDol(mainBal.dol)}</div>}
        </div>
        {partners.map(p=>{
          const pId="partner_"+p.id;
          const pBal=getBal(pId);
          const wCount=txs.filter(t=>t.fundId===pId&&t.type==="سحب").length;
          return (
            <button key={p.id} onClick={()=>{setSelP(p);resetForm();}}
              style={{width:"100%",background:"#fff",border:"1px solid #E2E8F0",
                borderRight:"5px solid "+p.color,borderRadius:16,padding:18,
                marginBottom:12,cursor:"pointer",textAlign:"right",fontFamily:"Tahoma",
                boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:13,background:p.light,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <i className="ti ti-user" style={{fontSize:22,color:p.color}} aria-hidden="true"/>
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                    <div style={{fontSize:12,color:"#64748B",marginTop:2}}>حصة {p.share}% · {wCount} سحبة</div>
                  </div>
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:19,fontWeight:700,color:pBal.din>=0?p.color:"#DC2626"}}>
                    {pBal.din>=0?"":"-"}{fmtD(Math.abs(pBal.din))}
                  </div>
                  {pBal.dol!==0&&<div style={{fontSize:14,fontWeight:700,color:"#2563EB"}}>{fmtDol(pBal.dol)}</div>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DepositForm({onDeposit}) {
  const [form,  setForm]  =useState({amount:"",note:"",date:today()});
  const [saving,setSaving]=useState(false);
  const [done,  setDone]  =useState(false);
  const [show,  setShow]  =useState(false);
  const set=k=>v=>setForm(f=>({...f,[k]:v}));
  const amt=Number(form.amount)||0;

  const save=async()=>{
    if (!amt||saving) return;
    setSaving(true);
    await onDeposit(form.amount,form.note,form.date);
    setSaving(false); setDone(true);
    setTimeout(()=>{setDone(false);setForm({amount:"",note:"",date:today()});setShow(false);},1600);
  };

  return (
    <div style={{marginBottom:14}}>
      <button onClick={()=>setShow(v=>!v)} style={{
        width:"100%",background:show?"#64748B":"#9333EA",border:"none",
        borderRadius:12,padding:"13px",color:"#fff",cursor:"pointer",
        fontSize:14,fontFamily:"Tahoma",fontWeight:700,
        marginBottom:show?10:0}}>
        {show?"✕ إلغاء":"↓ إيداع في صندوق الشركاء"}
      </button>
      {show&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:16}}>
          {done?(
            <div style={{textAlign:"center",padding:"12px 0"}}>
              <div style={{fontSize:32}}>✅</div>
              <div style={{fontWeight:700,color:"#16A34A",marginTop:4}}>تم الإيداع والتوزيع</div>
            </div>
          ):(
            <>
              <Lbl>المبلغ (دينار)</Lbl>
              <Inp type="number" placeholder="٠" value={form.amount}
                onChange={e=>set("amount")(e.target.value)} autoFocus/>
              {amt>0&&(
                <div style={{fontSize:12,color:"#9333EA",fontWeight:600,marginBottom:10,
                  padding:"7px 12px",background:"#FAF5FF",borderRadius:8}}>
                  ✍️ {numToWords(amt)} دينار
                </div>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <button onClick={save} disabled={!amt||saving} style={{
                width:"100%",border:"none",borderRadius:10,padding:"12px",
                fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                background:amt?"#9333EA":"#E2E8F0",color:amt?"#fff":"#94A3B8"}}>
                {saving?"جاري الإيداع...":"✅ تأكيد الإيداع والتوزيع"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
