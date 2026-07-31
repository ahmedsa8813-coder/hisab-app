import React,{useState,useEffect}from"react";
import{initializeApp}from"firebase/app";
import{getFirestore,collection,doc,addDoc,setDoc,deleteDoc,
  onSnapshot,query,orderBy,where,getDocs}from"firebase/firestore";

const app=initializeApp({apiKey:"AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain:"hisab-app-e4616.firebaseapp.com",projectId:"hisab-app-e4616"});
const db=getFirestore(app);

const COMPANY={name:"شركة باب المشاريع",address:"بغداد — العرصات، مقابل شركة زين"};
const PARTNERS=[
  {id:"ihab",    name:"إيهاب زيتوني",share:30,color:"#2563EB",light:"#EFF6FF"},
  {id:"nour",    name:"نور إدوارد",   share:30,color:"#059669",light:"#ECFDF5"},
  {id:"mohammed",name:"محمد سالم",   share:30,color:"#7C3AED",light:"#F5F3FF"},
  {id:"ahmed",   name:"أحمد سالم",   share:10,color:"#D97706",light:"#FFFBEB"},
];
const PASS="1234";

const toAr=n=>{
  const s=String(Math.round(Math.abs(Number(n)||0)));
  let r="";for(let i=0;i<s.length;i++){if(i>0&&(s.length-i)%3===0)r+=",";r+=s[i];}return r;
};
const today=()=>new Date().toISOString().split("T")[0];
const fD=n=>toAr(n)+" د.ع";
const f$=n=>toAr(Math.round(Math.abs(n)))+" $";
const ask=label=>{
  const pw=window.prompt("🔒 "+label+"\nالباسورد:");
  if(pw===null)return false;
  if(pw!==PASS){alert("❌ باسورد غلط");return false;}return true;
};
function w2(n){
  if(!n||isNaN(n))return"";const num=Math.floor(Math.abs(Number(n)));if(!num)return"صفر";
  const o=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h=["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g=x=>{if(!x)return"";if(x<20)return o[x];if(x<100)return t[Math.floor(x/10)]+(x%10?" و"+o[x%10]:"");
    return h[Math.floor(x/100)]+(x%100?" و"+g(x%100):"");};
  const p=[];
  if(num>=1e9)p.push(g(Math.floor(num/1e9))+" مليار");
  if(num%1e9>=1e6)p.push(g(Math.floor(num%1e9/1e6))+" مليون");
  if(num%1e6>=1e3)p.push(g(Math.floor(num%1e6/1e3))+" ألف");
  if(num%1e3)p.push(g(num%1e3));
  return p.join(" و");
}

// ── UI مشترك ──
const Lbl=({c})=><div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>{c}</div>;
const Inp=({sx,...p})=><input style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:10,
  padding:"11px 14px",fontSize:15,background:"#F8FAFC",color:"#1E293B",outline:"none",
  boxSizing:"border-box",fontFamily:"Tahoma",direction:"rtl",marginBottom:10,...sx}}{...p}/>;
const Btn=({onClick,color="#1E293B",bg,disabled,style,children})=><button onClick={onClick}
  disabled={disabled} style={{border:"none",borderRadius:10,padding:"12px 18px",fontFamily:"Tahoma",
  fontSize:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",
  background:disabled?"#E2E8F0":bg||color,color:disabled?"#94A3B8":"#fff",...style}}>
  {children}</button>;
const Back=({onClick,label="رجوع"})=><button onClick={onClick} style={{background:"#fff",
  border:"1px solid #E2E8F0",borderRadius:10,padding:"8px 16px",fontSize:13,color:"#64748B",
  cursor:"pointer",marginBottom:18,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
  <i className="ti ti-arrow-right" aria-hidden="true"/> {label}</button>;
const DelBtn=({onClick,label="🗑️ حذف"})=><button onClick={onClick} style={{background:"transparent",
  border:"none",color:"#DC2626",fontSize:11,cursor:"pointer",fontFamily:"Tahoma",
  padding:"2px 0",fontWeight:600}}>{label}</button>;
const CurrBtn=({v,set})=><div style={{display:"flex",gap:6,marginBottom:10}}>
  {["دينار","دولار"].map(c=><button key={c} onClick={()=>set(c)} style={{flex:1,padding:"10px",
    borderRadius:10,cursor:"pointer",fontFamily:"Tahoma",fontSize:13,fontWeight:700,
    border:"1.5px solid "+(v===c?(c==="دينار"?"#16A34A":"#2563EB"):"#E2E8F0"),
    background:v===c?(c==="دينار"?"#F0FDF4":"#EFF6FF"):"transparent",
    color:v===c?(c==="دينار"?"#16A34A":"#2563EB"):"#64748B"}}>
    {c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}</button>)}</div>;
const Card=({children,style})=><div style={{background:"#fff",borderRadius:14,
  border:"1px solid #E2E8F0",padding:18,...style}}>{children}</div>;
const TsfBtn=({onClick})=><button onClick={onClick} style={{background:"transparent",
  border:"1px solid #FEE2E2",borderRadius:8,padding:"5px 12px",color:"#DC2626",
  cursor:"pointer",fontSize:11,fontFamily:"Tahoma",fontWeight:600}}>🔄 تصفية</button>;

// ── App ──
export default function App(){
  const[page,setPage]=useState("home");
  const[selProj,setSelProj]=useState(null);
  const[selPart,setSelPart]=useState(null);
  const[loading,setLoading]=useState(true);
  const[bals,setBals]=useState({});
  const[projs,setProjs]=useState([]);
  const[pTxs,setPTxs]=useState([]);
  const[parTxs,setParTxs]=useState([]);
  const[emps,setEmps]=useState([]);

  useEffect(()=>{
    if(!document.querySelector("#ti-css")){
      const l=document.createElement("link");l.id="ti-css";l.rel="stylesheet";
      l.href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);
    }
  },[]);

  // أرصدة
  useEffect(()=>{
    const t=setTimeout(()=>setLoading(false),4000);
    const u=onSnapshot(collection(db,"fund_balances"),snap=>{
      const b={};snap.docs.forEach(d=>{const x=d.data();b[d.id]={din:x.din??0,dol:x.dol??0};});
      setBals(b);setLoading(false);
    },()=>setLoading(false));
    return()=>{u();clearTimeout(t);};
  },[]);

  // مشاريع
  useEffect(()=>{
    if(page!=="contracting"&&page!=="project"){setProjs([]);return;}
    const u=onSnapshot(query(collection(db,"fund_projects"),orderBy("createdAt","desc")),
      snap=>setProjs(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>u();
  },[page]);

  // حركات مشروع
  useEffect(()=>{
    if(!selProj){setPTxs([]);return;}
    const u=onSnapshot(query(collection(db,"fund_projects_txs"),
      where("projectId","==",selProj.id),orderBy("createdAt","desc")),
      snap=>setPTxs(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>u();
  },[selProj]);

  // معاملات الشركاء
  useEffect(()=>{
    if(page!=="partners"&&page!=="partner"){setParTxs([]);return;}
    const ids=["partners",...PARTNERS.map(p=>"partner_"+p.id)];
    const us=ids.map(pId=>onSnapshot(
      query(collection(db,"fund_transactions"),where("fundId","==",pId),orderBy("createdAt","desc")),
      snap=>{const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
        setParTxs(prev=>[...prev.filter(t=>t.fundId!==pId),...rows]);}));
    return()=>us.forEach(u=>u());
  },[page]);

  // موظفون
  useEffect(()=>{
    if(page!=="contracting"&&page!=="project"){setEmps([]);return;}
    const u=onSnapshot(query(collection(db,"employees"),orderBy("createdAt","desc")),
      snap=>setEmps(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>u();
  },[page]);

  const getBal=id=>bals[id]||{din:0,dol:0};

  // ── منطق المشاريع ──
  const addProject=async d=>addDoc(collection(db,"fund_projects"),{
    name:d.name.trim(),province:d.province||"",client:d.client||"",
    totalDin:Number(d.totalDin)||0,totalDol:Number(d.totalDol)||0,
    note:d.note||"",status:"نشط",recDin:0,recDol:0,spdDin:0,spdDol:0,
    createdAt:new Date().toISOString()});

  const addProjTx=async(proj,type,currency,amount,note,date)=>{
    const amt=Math.round(Number(amount));if(!amt)return;
    const isDol=currency==="دولار";const isRec=type==="إيداع";
    const key=isDol?(isRec?"recDol":"spdDol"):(isRec?"recDin":"spdDin");
    await setDoc(doc(db,"fund_projects",proj.id),{[key]:(proj[key]||0)+amt},{merge:true});
    await addDoc(collection(db,"fund_projects_txs"),{projectId:proj.id,projectName:proj.name,
      type,currency,amount:amt,note:note||"",date:date||today(),createdAt:new Date().toISOString()});
  };

  const delProjTx=async(t,proj)=>{
    if(!ask("حذف الحركة"))return;
    const isDol=t.currency==="دولار";const isRec=t.type==="إيداع";
    const key=isDol?(isRec?"recDol":"spdDol"):(isRec?"recDin":"spdDin");
    await setDoc(doc(db,"fund_projects",proj.id),{[key]:Math.max(0,(proj[key]||0)-t.amount)},{merge:true});
    await deleteDoc(doc(db,"fund_projects_txs",t.id));
  };

  const delProject=async id=>{
    if(!ask("حذف المشروع"))return;
    await deleteDoc(doc(db,"fund_projects",id));
  };

  const closeProject=async(proj,dDin,dDol)=>{
    const pDin=(proj.recDin||0)-(proj.spdDin||0);
    const pDol=(proj.recDol||0)-(proj.spdDol||0);
    const dist=async(dists,profit,currency)=>{
      const isDol=currency==="دولار";
      for(const d of dists){
        if(!d.pct||profit<=0)continue;
        const share=Math.round(profit*d.pct/100);if(!share)continue;
        const fb=getBal(d.fundId);
        await setDoc(doc(db,"fund_balances",d.fundId),
          {din:isDol?fb.din:fb.din+share,dol:isDol?fb.dol+share:fb.dol},{merge:true});
        await addDoc(collection(db,"fund_transactions"),{fundId:d.fundId,
          type:"إيداع أرباح",currency,amount:share,
          note:d.pct+"% ربح — "+proj.name,date:today(),isProjectProfit:true,
          createdAt:new Date().toISOString()});
        if(d.fundId==="partners"){
          for(const p of PARTNERS){
            const ps=Math.round(share*p.share/100);if(!ps)continue;
            const pId="partner_"+p.id;const pb=getBal(pId);
            await setDoc(doc(db,"fund_balances",pId),
              {din:isDol?pb.din:pb.din+ps,dol:isDol?pb.dol+ps:pb.dol},{merge:true});
            await addDoc(collection(db,"fund_transactions"),{fundId:pId,fundName:p.name,
              type:"إيداع أرباح",currency,amount:ps,
              note:"حصة "+p.share+"% — "+proj.name,date:today(),isDistribution:true,
              createdAt:new Date().toISOString()});
          }
        }
      }
    };
    if(pDin>0)await dist(dDin,pDin,"دينار");
    if(pDol>0)await dist(dDol,pDol,"دولار");
    await setDoc(doc(db,"fund_projects",proj.id),{status:"منتهي",closedAt:today()},{merge:true});
  };

  // تصفية مشروع
  const resetProject=async proj=>{
    if(!ask("تصفية المشروع"))return;
    await setDoc(doc(db,"fund_projects",proj.id),
      {recDin:0,recDol:0,spdDin:0,spdDol:0,status:"نشط"},{merge:true});
    const snap=await getDocs(query(collection(db,"fund_projects_txs"),
      where("projectId","==",proj.id)));
    for(const d of snap.docs)await deleteDoc(doc(db,"fund_projects_txs",d.id));
  };

  // ── منطق الموظفين ──
  const addEmployee=async d=>addDoc(collection(db,"employees"),{
    name:d.name.trim(),role:d.role||"",salary:Number(d.salary)||0,
    currency:d.currency||"دينار",note:d.note||"",
    createdAt:new Date().toISOString()});

  const delEmployee=async id=>{
    if(!ask("حذف الموظف"))return;
    await deleteDoc(doc(db,"employees",id));
  };

  // ── منطق الشركاء ──
  const withdrawPartner=async(pid,amount,currency,note,date)=>{
    const amt=Math.round(Number(amount));const isDol=currency==="دولار";
    const pId="partner_"+pid;const pb=getBal(pId);
    if(isDol&&amt>pb.dol){alert("رصيد الدولار غير كافٍ. المتاح: "+f$(pb.dol));return false;}
    if(!isDol&&amt>pb.din){alert("رصيد الدينار غير كافٍ. المتاح: "+fD(pb.din));return false;}
    const pn={din:isDol?pb.din:pb.din-amt,dol:isDol?pb.dol-amt:pb.dol};
    const mb=getBal("partners");
    const mn={din:isDol?mb.din:mb.din-amt,dol:isDol?mb.dol-amt:mb.dol};
    await setDoc(doc(db,"fund_balances",pId),pn,{merge:true});
    await setDoc(doc(db,"fund_balances","partners"),mn,{merge:true});
    await addDoc(collection(db,"fund_transactions"),{fundId:pId,
      fundName:PARTNERS.find(p=>p.id===pid)?.name||"",
      type:"سحب",currency,amount:amt,note:note||"",date:date||today(),
      createdAt:new Date().toISOString()});
    return true;
  };

  const delPartnerTx=async tx=>{
    if(!ask("حذف المعاملة"))return;
    const isDol=tx.currency==="دولار";const isIn=tx.type==="إيداع أرباح";
    const pb=getBal(tx.fundId);
    await setDoc(doc(db,"fund_balances",tx.fundId),{
      din:isDol?pb.din:(isIn?pb.din-tx.amount:pb.din+tx.amount),
      dol:isDol?(isIn?pb.dol-tx.amount:pb.dol+tx.amount):pb.dol},{merge:true});
    await deleteDoc(doc(db,"fund_transactions",tx.id));
  };

  const resetPartner=async(pId,label)=>{
    if(!ask("تصفية رصيد "+label))return;
    await setDoc(doc(db,"fund_balances",pId),{din:0,dol:0},{merge:true});
    const snap=await getDocs(query(collection(db,"fund_transactions"),where("fundId","==",pId)));
    for(const d of snap.docs)await deleteDoc(doc(db,"fund_transactions",d.id));
  };

  // ── تصفية شاملة ──
  const resetAll=async()=>{
    const pw=window.prompt("⚠️ تصفية شاملة كاملة\nالباسورد:");
    if(!pw||pw!==PASS){if(pw!==null)alert("❌ باسورد غلط");return;}
    if(window.prompt("اكتب \"تصفية\" للتأكيد:")!=="تصفية"){alert("إلغاء");return;}
    const ids=["partners",...PARTNERS.map(p=>"partner_"+p.id)];
    for(const id of ids)await setDoc(doc(db,"fund_balances",id),{din:0,dol:0},{merge:true});
    for(const col of["fund_transactions","fund_projects","fund_projects_txs","employees"]){
      const snap=await getDocs(collection(db,col));
      for(const d of snap.docs)await deleteDoc(doc(db,col,d.id));
    }
    alert("✅ تمت التصفية الشاملة");
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:12,fontFamily:"Tahoma",direction:"rtl"}}>
      <i className="ti ti-building-bank" style={{fontSize:52,color:"#D97706"}} aria-hidden="true"/>
      <div style={{fontSize:20,fontWeight:700,color:"#1E293B"}}>{COMPANY.name}</div>
      <div style={{fontSize:13,color:"#64748B"}}>جاري التحميل...</div>
    </div>
  );

  if(page==="project"&&selProj)return<ProjPage proj={selProj} txs={pTxs}
    onBack={()=>{setPage("contracting");setSelProj(null);}}
    onAddTx={addProjTx} onDelTx={t=>delProjTx(t,selProj)}
    onClose={closeProject} onDel={id=>{delProject(id);setPage("contracting");setSelProj(null);}}
    onReset={()=>resetProject(selProj)}/>;

  if(page==="partner"&&selPart)return<PartnerPage partner={selPart} bals={bals}
    txs={parTxs.filter(t=>t.fundId==="partner_"+selPart.id)}
    onBack={()=>{setPage("partners");setSelPart(null);}}
    onWithdraw={withdrawPartner} onDelTx={delPartnerTx}
    onReset={()=>resetPartner("partner_"+selPart.id,selPart.name)}/>;

  if(page==="partners")return<PartnersPage partners={PARTNERS} bals={bals}
    onBack={()=>setPage("home")} onSelPart={p=>{setSelPart(p);setPage("partner");}}
    onReset={resetAll}/>;

  if(page==="contracting")return<ContractingPage projs={projs} emps={emps} bals={bals}
    onBack={()=>setPage("home")}
    onSelProj={p=>{setSelProj(p);setPage("project");}}
    onAddProject={addProject} onDelProject={delProject}
    onAddEmployee={addEmployee} onDelEmployee={delEmployee}
    onReset={resetAll}/>;

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:500,margin:"0 auto",padding:"32px 16px"}}>
        <div style={{background:"#fff",borderRadius:16,padding:"20px 22px",marginBottom:24,
          border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#1E293B"}}>{COMPANY.name}</div>
          <div style={{fontSize:12,color:"#64748B",marginTop:3}}>{COMPANY.address}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* صندوق المقاولات */}
          <button onClick={()=>setPage("contracting")} style={{background:"#fff",
            border:"1px solid #E2E8F0",borderTop:"4px solid #D97706",borderRadius:14,
            padding:"20px",cursor:"pointer",textAlign:"right",fontFamily:"Tahoma"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:44,height:44,borderRadius:12,background:"#FFFBEB",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="ti ti-building" style={{fontSize:24,color:"#D97706"}} aria-hidden="true"/>
              </div>
              <div style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>صندوق المقاولات</div>
            </div>
            <div style={{fontSize:12,color:"#64748B"}}>
              {projs.filter(p=>p.status==="نشط").length} مشروع نشط · {emps.length} موظف
            </div>
          </button>
          {/* صندوق الشركاء */}
          <button onClick={()=>setPage("partners")} style={{background:"#fff",
            border:"1px solid #E2E8F0",borderTop:"4px solid #9333EA",borderRadius:14,
            padding:"20px",cursor:"pointer",textAlign:"right",fontFamily:"Tahoma"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:44,height:44,borderRadius:12,background:"#FAF5FF",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="ti ti-users" style={{fontSize:24,color:"#9333EA"}} aria-hidden="true"/>
              </div>
              <div style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>صندوق الشركاء</div>
            </div>
            <div style={{fontSize:18,fontWeight:700,color:"#9333EA"}}>
              {fD((bals["partners"]||{din:0}).din)}
            </div>
          </button>
          {/* تصفية شاملة */}
          <button onClick={resetAll} style={{background:"#FFF1F2",border:"1px solid #FEE2E2",
            borderRadius:12,padding:"14px",cursor:"pointer",color:"#DC2626",
            fontFamily:"Tahoma",fontSize:14,fontWeight:700}}>
            ⚠️ تصفية شاملة لكل البيانات
          </button>
        </div>
      </div>
    </div>
  );
}

// ── صفحة المقاولات ──
function ContractingPage({projs,emps,bals,onBack,onSelProj,onAddProject,onDelProject,onAddEmployee,onDelEmployee,onReset}){
  const[tab,setTab]=useState("projects");
  const[showP,setShowP]=useState(false);
  const[showE,setShowE]=useState(false);
  const[pf,setPf]=useState({name:"",province:"",client:"",totalDin:"",totalDol:"",note:""});
  const[ef,setEf]=useState({name:"",role:"",salary:"",currency:"دينار",note:""});
  const[saving,setSaving]=useState(false);
  const sp=k=>v=>setPf(x=>({...x,[k]:v}));
  const se=k=>v=>setEf(x=>({...x,[k]:v}));
  const active=projs.filter(p=>p.status==="نشط");
  const finished=projs.filter(p=>p.status==="منتهي");
  const tRD=active.reduce((s,p)=>s+(p.recDin||0),0);
  const tSD=active.reduce((s,p)=>s+(p.spdDin||0),0);
  const tRL=active.reduce((s,p)=>s+(p.recDol||0),0);
  const tSL=active.reduce((s,p)=>s+(p.spdDol||0),0);

  const saveP=async()=>{
    if(!pf.name.trim()||saving)return;
    if(!pf.totalDin&&!pf.totalDol){alert("أدخل قيمة المشروع");return;}
    setSaving(true);await onAddProject(pf);setSaving(false);
    setPf({name:"",province:"",client:"",totalDin:"",totalDol:"",note:""});setShowP(false);
  };
  const saveE=async()=>{
    if(!ef.name.trim()||saving)return;
    setSaving(true);await onAddEmployee(ef);setSaving(false);
    setEf({name:"",role:"",salary:"",currency:"دينار",note:""});setShowE(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:700,margin:"0 auto",padding:"20px 14px"}}>
        <Back onClick={onBack} label="رجوع"/>

        {/* هيدر */}
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid #D97706"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:"#FFFBEB",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-building" style={{fontSize:24,color:"#D97706"}} aria-hidden="true"/>
            </div>
            <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>صندوق المقاولات</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ مستلم</div>
              <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fD(tRD)}</div>
              {tRL>0&&<div style={{fontSize:10,color:"#2563EB"}}>{f$(tRL)}</div>}
            </div>
            <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ مصروف</div>
              <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fD(tSD)}</div>
              {tSL>0&&<div style={{fontSize:10,color:"#DC2626"}}>{f$(tSL)}</div>}
            </div>
            <div style={{background:tRD-tSD>=0?"#FFFBEB":"#FFF1F2",borderRadius:10,padding:"10px",
              textAlign:"center",border:"1.5px solid "+(tRD-tSD>=0?"#D9770640":"#DC262640")}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>💰 الربح</div>
              <div style={{fontSize:13,fontWeight:700,color:tRD-tSD>=0?"#D97706":"#DC2626"}}>
                {tRD-tSD>=0?"":"-"}{fD(Math.abs(tRD-tSD))}</div>
              {tRL-tSL!==0&&<div style={{fontSize:10,fontWeight:700,color:tRL-tSL>=0?"#2563EB":"#DC2626"}}>
                {tRL-tSL>=0?"":"-"}{f$(Math.abs(tRL-tSL))}</div>}
            </div>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
          {[["projects","🏗️ المشاريع"],["employees","👷 الموظفون"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)} style={{border:tab===v?"none":"1px solid #E2E8F0",
              borderRadius:10,padding:"12px",cursor:"pointer",fontWeight:700,fontSize:13,
              fontFamily:"Tahoma",background:tab===v?"#D97706":"#fff",
              color:tab===v?"#fff":"#64748B"}}>{l}</button>
          ))}
        </div>

        {/* المشاريع */}
        {tab==="projects"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>نشطة ({active.length})</div>
              <button onClick={()=>setShowP(v=>!v)} style={{background:showP?"#64748B":"#D97706",
                border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",cursor:"pointer",
                fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
                {showP?"✕ إلغاء":"+ مشروع جديد"}</button>
            </div>
            {showP&&(
              <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,
                padding:18,marginBottom:14}}>
                <Lbl c="اسم المشروع *"/>
                <Inp placeholder="اسم المشروع..." value={pf.name} onChange={e=>sp("name")(e.target.value)} autoFocus/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><Lbl c="المحافظة"/>
                    <Inp placeholder="بغداد..." value={pf.province} onChange={e=>sp("province")(e.target.value)} sx={{marginBottom:0}}/></div>
                  <div><Lbl c="اسم العميل"/>
                    <Inp placeholder="صاحب المشروع..." value={pf.client} onChange={e=>sp("client")(e.target.value)} sx={{marginBottom:0}}/></div>
                </div>
                <div style={{height:10}}/>
                <div style={{background:"#FFFBEB",borderRadius:12,padding:14,marginBottom:10,border:"1px solid #D9770620"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1E293B",marginBottom:10}}>💰 قيمة المشروع</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><Lbl c="🇮🇶 دينار"/>
                      <Inp type="number" placeholder="٠" value={pf.totalDin} onChange={e=>sp("totalDin")(e.target.value)} sx={{marginBottom:0,textAlign:"center"}}/>
                      {Number(pf.totalDin)>0&&<div style={{fontSize:10,color:"#16A34A",marginTop:3,fontWeight:600}}>{fD(Number(pf.totalDin))}</div>}
                    </div>
                    <div><Lbl c="🇺🇸 دولار"/>
                      <Inp type="number" placeholder="٠" value={pf.totalDol} onChange={e=>sp("totalDol")(e.target.value)} sx={{marginBottom:0,textAlign:"center"}}/>
                      {Number(pf.totalDol)>0&&<div style={{fontSize:10,color:"#2563EB",marginTop:3,fontWeight:600}}>{f$(Number(pf.totalDol))}</div>}
                    </div>
                  </div>
                </div>
                <Lbl c="ملاحظة"/>
                <Inp placeholder="..." value={pf.note} onChange={e=>sp("note")(e.target.value)}/>
                <button onClick={saveP} disabled={!pf.name.trim()||saving}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"13px",fontSize:14,
                    fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:pf.name.trim()?"#D97706":"#E2E8F0",
                    color:pf.name.trim()?"#fff":"#94A3B8"}}>
                  {saving?"جاري...":"✅ إنشاء المشروع"}</button>
              </div>
            )}
            {active.length===0&&!showP&&(
              <div style={{textAlign:"center",padding:28,color:"#94A3B8",background:"#fff",
                borderRadius:14,border:"1px solid #E2E8F0",marginBottom:14}}>
                <i className="ti ti-building-plus" style={{fontSize:36,color:"#CBD5E1",display:"block",marginBottom:6}} aria-hidden="true"/>
                ما في مشاريع نشطة</div>
            )}
            {active.map(p=>(
              <div key={p.id} style={{background:"#fff",border:"1px solid #E2E8F0",
                borderRight:"4px solid #D97706",borderRadius:14,padding:"14px 16px",
                marginBottom:10,cursor:"pointer"}} onClick={()=>onSelProj(p)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                    <div style={{display:"flex",gap:8,marginTop:3}}>
                      {p.province&&<span style={{fontSize:11,color:"#64748B"}}>📍 {p.province}</span>}
                      {p.client&&<span style={{fontSize:11,color:"#64748B"}}>👤 {p.client}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#D97706"}}>
                      {fD((p.recDin||0)-(p.spdDin||0))}</div>
                    {((p.recDol||0)-(p.spdDol||0))!==0&&(
                      <div style={{fontSize:12,fontWeight:700,color:"#2563EB"}}>
                        {f$(Math.abs((p.recDol||0)-(p.spdDol||0)))}</div>
                    )}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <div style={{background:"#F0FDF4",borderRadius:8,padding:"6px 10px"}}>
                    <div style={{fontSize:9,color:"#64748B"}}>↓ مستلم</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>{fD(p.recDin||0)}</div>
                  </div>
                  <div style={{background:"#FFF1F2",borderRadius:8,padding:"6px 10px"}}>
                    <div style={{fontSize:9,color:"#64748B"}}>↑ مصروف</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#DC2626"}}>{fD(p.spdDin||0)}</div>
                  </div>
                </div>
              </div>
            ))}
            {finished.length>0&&(
              <>
                <div style={{fontSize:13,fontWeight:700,color:"#94A3B8",marginTop:18,marginBottom:10,
                  display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:3,height:14,background:"#CBD5E1",borderRadius:2}}/>
                  منتهية ({finished.length})</div>
                {finished.map(p=>(
                  <div key={p.id} style={{background:"#FAFAFA",border:"1px solid #E2E8F0",
                    borderRight:"4px solid #94A3B8",borderRadius:14,padding:"12px 16px",
                    marginBottom:8,cursor:"pointer",opacity:0.8}} onClick={()=>onSelProj(p)}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#64748B"}}>{p.name}</div>
                        {p.client&&<div style={{fontSize:11,color:"#94A3B8"}}>👤 {p.client}</div>}
                      </div>
                      <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
                        background:"#F1F5F9",color:"#64748B",alignSelf:"flex-start"}}>✓ منتهي</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            <button onClick={onReset} style={{width:"100%",marginTop:16,background:"#FFF1F2",
              border:"1px solid #FEE2E2",borderRadius:10,padding:"12px",color:"#DC2626",
              cursor:"pointer",fontSize:13,fontFamily:"Tahoma",fontWeight:700}}>
              ⚠️ تصفية شاملة لكل البيانات</button>
          </div>
        )}

        {/* الموظفون */}
        {tab==="employees"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>الموظفون ({emps.length})</div>
              <button onClick={()=>setShowE(v=>!v)} style={{background:showE?"#64748B":"#D97706",
                border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",cursor:"pointer",
                fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
                {showE?"✕ إلغاء":"+ موظف جديد"}</button>
            </div>
            {showE&&(
              <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,
                padding:18,marginBottom:14}}>
                <Lbl c="اسم الموظف *"/>
                <Inp placeholder="الاسم الكامل..." value={ef.name} onChange={e=>se("name")(e.target.value)} autoFocus/>
                <Lbl c="المنصب"/>
                <Inp placeholder="مهندس، عامل..." value={ef.role} onChange={e=>se("role")(e.target.value)}/>
                <Lbl c="الراتب الشهري"/>
                <Inp type="number" placeholder="٠" value={ef.salary} onChange={e=>se("salary")(e.target.value)}/>
                {Number(ef.salary)>0&&(
                  <div style={{fontSize:12,color:"#D97706",fontWeight:600,marginBottom:10,
                    padding:"7px 12px",background:"#FFFBEB",borderRadius:8}}>
                    ✍️ {w2(Number(ef.salary))} {ef.currency==="دولار"?"دولار":"دينار"}</div>
                )}
                <Lbl c="العملة"/>
                <CurrBtn v={ef.currency} set={v=>se("currency")(v)}/>
                <Lbl c="ملاحظة"/>
                <Inp placeholder="..." value={ef.note} onChange={e=>se("note")(e.target.value)}/>
                <button onClick={saveE} disabled={!ef.name.trim()||saving}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"13px",fontSize:14,
                    fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:ef.name.trim()?"#D97706":"#E2E8F0",
                    color:ef.name.trim()?"#fff":"#94A3B8"}}>
                  {saving?"جاري...":"✅ إضافة الموظف"}</button>
              </div>
            )}
            {emps.length===0&&!showE&&(
              <div style={{textAlign:"center",padding:28,color:"#94A3B8",background:"#fff",
                borderRadius:14,border:"1px solid #E2E8F0"}}>
                <i className="ti ti-users" style={{fontSize:36,color:"#CBD5E1",display:"block",marginBottom:6}} aria-hidden="true"/>
                ما في موظفين مضافين</div>
            )}
            {emps.map(e=>(
              <div key={e.id} style={{background:"#fff",borderRadius:12,padding:"14px 16px",
                marginBottom:10,border:"1px solid #E2E8F0",borderRight:"4px solid #D97706"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#1E293B",marginBottom:3}}>👷 {e.name}</div>
                    {e.role&&<div style={{fontSize:12,color:"#64748B",marginBottom:4}}>💼 {e.role}</div>}
                    {e.salary>0&&<div style={{fontSize:13,fontWeight:700,color:"#D97706"}}>
                      💰 {e.currency==="دولار"?f$(e.salary):fD(e.salary)} / شهر</div>}
                    {e.note&&<div style={{fontSize:11,color:"#94A3B8",marginTop:4}}>{e.note}</div>}
                  </div>
                  <DelBtn onClick={()=>onDelEmployee(e.id)}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── صفحة مشروع ──
function ProjPage({proj,txs,onBack,onAddTx,onDelTx,onClose,onDel,onReset}){
  const[p,setP]=useState(proj);
  const[tab,setTab]=useState("dep");
  const[cur,setCur]=useState("دينار");
  const[f,setF]=useState({amount:"",note:"",date:today()});
  const[saving,setSaving]=useState(false);
  const[done,setDone]=useState(false);
  const[showClose,setShowClose]=useState(false);
  const[closing,setClosing]=useState(false);
  const initD=()=>[
    {fundId:"contracting",pct:0,  name:"صندوق المقاولات"},
    {fundId:"partners",   pct:100,name:"أرباح الشركاء"},
  ];
  const[dDin,setDDin]=useState(initD);
  const[dDol,setDDol]=useState(initD);
  const ALL_FUNDS=[
    {id:"contracting",name:"صندوق المقاولات"},
    {id:"partners",   name:"أرباح الشركاء"},
  ];
  const s=k=>v=>setF(x=>({...x,[k]:v}));
  const amtN=Number(f.amount)||0;
  const isDol=cur==="دولار";
  const bDin=(p.recDin||0)-(p.spdDin||0);
  const bDol=(p.recDol||0)-(p.spdDol||0);
  const avail=isDol?bDol:bDin;
  const isAct=p.status==="نشط";
  const tDin=dDin.reduce((s,d)=>s+Number(d.pct),0);
  const tDol=dDol.reduce((s,d)=>s+Number(d.pct),0);
  const dinTxs=txs.filter(t=>t.currency==="دينار");
  const dolTxs=txs.filter(t=>t.currency==="دولار");
  useEffect(()=>setP(proj),[proj]);

  const save=async()=>{
    if(!amtN||saving)return;
    if(tab==="with"&&amtN>avail){alert("الرصيد غير كافٍ");return;}
    setSaving(true);
    await onAddTx(p,tab==="dep"?"إيداع":"سحب",cur,f.amount,f.note,f.date);
    setSaving(false);setDone(true);
    setTimeout(()=>{setDone(false);setF({amount:"",note:"",date:today()});},1400);
  };

  const doClose=async()=>{
    if(Math.round(tDin)!==100||Math.round(tDol)!==100){
      alert("مجموع النسب يجب أن يكون 100%");return;}
    setClosing(true);
    await onClose(p,bDin>0?dDin.map(d=>({fundId:d.fundId,pct:Number(d.pct)})):[],
      bDol>0?dDol.map(d=>({fundId:d.fundId,pct:Number(d.pct)})):[]);
    setClosing(false);setShowClose(false);
  };

  const DR=({d,i,dists,setDists,profit,isDolR})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
      background:"#F8FAFC",borderRadius:10,padding:"10px 12px"}}>
      <div style={{flex:1,fontSize:13,fontWeight:600,color:"#1E293B"}}>{d.name}</div>
      <input type="number" min="0" max="100" value={d.pct}
        onChange={e=>{const v=[...dists];v[i]={...v[i],pct:Number(e.target.value)};setDists(v);}}
        style={{width:58,border:"1px solid #E2E8F0",borderRadius:8,padding:"6px 8px",
          fontSize:15,fontWeight:700,textAlign:"center",outline:"none",fontFamily:"Tahoma"}}/>
      <span style={{fontSize:13,color:"#64748B"}}>%</span>
      <div style={{fontSize:12,fontWeight:700,minWidth:80,textAlign:"left",color:isDolR?"#2563EB":"#16A34A"}}>
        {isDolR?f$(Math.round(Math.abs(profit)*d.pct/100)):fD(Math.round(Math.abs(profit)*d.pct/100))}</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:660,margin:"0 auto",padding:"20px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <Back onClick={onBack} label="رجوع للمقاولات"/>
          <div style={{display:"flex",gap:8}}>
            <TsfBtn onClick={onReset}/>
            {!isAct&&<DelBtn onClick={()=>{if(ask("حذف المشروع"))onDel(p.id);}} label="🗑️ حذف"/>}
          </div>
        </div>

        {/* بطاقة المشروع */}
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid "+(isAct?"#D97706":"#94A3B8")}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                {p.province&&<span style={{fontSize:12,color:"#64748B"}}>📍 {p.province}</span>}
                {p.client&&<span style={{fontSize:12,color:"#64748B"}}>👤 {p.client}</span>}
              </div>
              <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
                marginTop:6,display:"inline-block",background:isAct?"#DCFCE7":"#F1F5F9",
                color:isAct?"#16A34A":"#64748B"}}>{isAct?"● نشط":"✓ منتهي"}</span>
            </div>
            {isAct&&<button onClick={()=>setShowClose(true)} style={{background:"#7C3AED",border:"none",
              borderRadius:10,padding:"8px 14px",color:"#fff",cursor:"pointer",
              fontSize:13,fontFamily:"Tahoma",fontWeight:700}}>🏁 إغلاق</button>}
          </div>
          {/* الدينار */}
          <div style={{marginBottom:p.totalDol>0||p.recDol>0?12:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"#16A34A",marginBottom:6}}>🇮🇶 الدينار</div>
            {p.totalDin>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:6}}>
              قيمة المشروع: <strong>{fD(p.totalDin)}</strong></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ استلام</div>
                <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fD(p.recDin||0)}</div>
              </div>
              <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ صرف</div>
                <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fD(p.spdDin||0)}</div>
              </div>
              <div style={{background:bDin>=0?"#FFFBEB":"#FFF1F2",borderRadius:10,padding:"10px",
                textAlign:"center",border:"1.5px solid "+(bDin>=0?"#D9770640":"#DC262640")}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>💰 الربح</div>
                <div style={{fontSize:13,fontWeight:700,color:bDin>=0?"#D97706":"#DC2626"}}>
                  {bDin>=0?"+":"-"}{fD(Math.abs(bDin))}</div>
              </div>
            </div>
          </div>
          {/* الدولار */}
          {((p.recDol||0)>0||(p.spdDol||0)>0||(p.totalDol||0)>0)&&(
            <div style={{borderTop:"1px solid #E2E8F0",paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#2563EB",marginBottom:6}}>🇺🇸 الدولار</div>
              {p.totalDol>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:6}}>
                قيمة المشروع: <strong>{f$(p.totalDol)}</strong></div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div style={{background:"#EFF6FF",borderRadius:10,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ استلام</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#2563EB"}}>{f$(p.recDol||0)}</div>
                </div>
                <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ صرف</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{f$(p.spdDol||0)}</div>
                </div>
                <div style={{background:bDol>=0?"#EFF6FF":"#FFF1F2",borderRadius:10,padding:"10px",
                  textAlign:"center",border:"1.5px solid "+(bDol>=0?"#2563EB40":"#DC262640")}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>💰 الربح</div>
                  <div style={{fontSize:13,fontWeight:700,color:bDol>=0?"#2563EB":"#DC2626"}}>
                    {bDol>=0?"+":"-"}{f$(Math.abs(bDol))}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* تبويبات */}
        {isAct&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
          {[["dep","↓ استلام","#16A34A"],["with","↑ صرف","#DC2626"],["hist","📋 السجل","#2563EB"]].map(([id,l,c])=>(
            <button key={id} onClick={()=>setTab(id)} style={{border:tab===id?"none":"1px solid #E2E8F0",
              borderRadius:10,padding:"11px 6px",cursor:"pointer",fontWeight:700,fontSize:13,
              fontFamily:"Tahoma",background:tab===id?c:"#fff",color:tab===id?"#fff":"#64748B"}}>{l}</button>
          ))}</div>}

        {/* نموذج */}
        {isAct&&(tab==="dep"||tab==="with")&&(
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:18,marginBottom:14}}>
            {done?<div style={{textAlign:"center",padding:"14px 0"}}>
              <div style={{fontSize:36}}>✅</div>
              <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم التسجيل</div>
            </div>:<>
              <Lbl c="العملة"/><CurrBtn v={cur} set={setCur}/>
              {tab==="with"&&<div style={{fontSize:12,color:"#64748B",marginBottom:10,
                background:"#F8FAFC",borderRadius:8,padding:"8px 12px"}}>
                المتاح: {isDol?f$(bDol):fD(bDin)}</div>}
              <Lbl c={"المبلغ ("+(isDol?"دولار":"دينار")+")"}/>
              <Inp type="number" placeholder="٠" value={f.amount} onChange={e=>s("amount")(e.target.value)} autoFocus/>
              {amtN>0&&<div style={{fontSize:12,color:tab==="dep"?"#16A34A":"#DC2626",
                fontWeight:600,marginBottom:10,padding:"7px 12px",
                background:tab==="dep"?"#F0FDF4":"#FFF1F2",borderRadius:8}}>
                ✍️ {w2(amtN)} {isDol?"دولار":"دينار"}</div>}
              {tab==="with"&&amtN>avail&&<div style={{fontSize:12,color:"#DC2626",fontWeight:600,
                marginBottom:10,padding:"7px 12px",background:"#FFF1F2",borderRadius:8}}>
                ⚠️ تجاوز الرصيد</div>}
              <Lbl c="التاريخ"/>
              <Inp type="date" value={f.date} onChange={e=>s("date")(e.target.value)}/>
              <Lbl c="ملاحظة"/>
              <Inp placeholder="..." value={f.note} onChange={e=>s("note")(e.target.value)}/>
              <button onClick={save} disabled={!amtN||saving||(tab==="with"&&amtN>avail)}
                style={{width:"100%",border:"none",borderRadius:12,padding:"13px",fontSize:14,
                  fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                  background:(amtN&&(tab==="dep"||amtN<=avail))?(tab==="dep"?"#16A34A":"#DC2626"):"#E2E8F0",
                  color:(amtN&&(tab==="dep"||amtN<=avail))?"#fff":"#94A3B8"}}>
                {saving?"جاري...":(tab==="dep"?"↓ تأكيد الاستلام":"↑ تأكيد الصرف")}</button>
            </>}
          </div>
        )}

        {/* السجل */}
        {(!isAct||tab==="hist")&&(
          <div>
            {dinTxs.length>0&&<>
              <div style={{fontSize:13,fontWeight:700,color:"#16A34A",marginBottom:8,
                display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:3,height:14,background:"#16A34A",borderRadius:2}}/>
                الدينار ({dinTxs.length})</div>
              {dinTxs.map(t=>{const isIn=t.type==="إيداع";return(
                <div key={t.id} style={{background:"#fff",borderRadius:11,padding:"11px 14px",
                  marginBottom:7,border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                  borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:isIn?"#16A34A":"#DC2626",marginBottom:2}}>
                        {isIn?"↓ استلام":"↑ صرف"}</div>
                      <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                      {t.note&&<div style={{fontSize:11,color:"#1E293B",marginTop:2}}>{t.note}</div>}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:15,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                        {isIn?"+":"-"}{fD(t.amount)}</div>
                      <DelBtn onClick={()=>onDelTx(t)}/>
                    </div>
                  </div>
                </div>);})}
            </>}
            {dolTxs.length>0&&<>
              <div style={{fontSize:13,fontWeight:700,color:"#2563EB",marginBottom:8,marginTop:14,
                display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:3,height:14,background:"#2563EB",borderRadius:2}}/>
                الدولار ({dolTxs.length})</div>
              {dolTxs.map(t=>{const isIn=t.type==="إيداع";return(
                <div key={t.id} style={{background:"#fff",borderRadius:11,padding:"11px 14px",
                  marginBottom:7,border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                  borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:isIn?"#16A34A":"#DC2626",marginBottom:2}}>
                        {isIn?"↓ استلام":"↑ صرف"}</div>
                      <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                      {t.note&&<div style={{fontSize:11,color:"#1E293B",marginTop:2}}>{t.note}</div>}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:15,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                        {isIn?"+":"-"}{f$(t.amount)}</div>
                      <DelBtn onClick={()=>onDelTx(t)}/>
                    </div>
                  </div>
                </div>);})}
            </>}
            {txs.length===0&&<div style={{textAlign:"center",padding:24,color:"#94A3B8",
              background:"#fff",borderRadius:12,border:"1px solid #E2E8F0"}}>ما في معاملات</div>}
          </div>
        )}

        {/* نافذة الإغلاق */}
        {showClose&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:999,
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:500,
              maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#7C3AED"}}>🏁 إغلاق وتوزيع الأرباح</div>
                <button onClick={()=>setShowClose(false)} style={{background:"none",border:"none",
                  fontSize:18,cursor:"pointer",color:"#64748B"}}>✕</button>
              </div>
              <div style={{padding:"16px 20px"}}>
                <div style={{background:"#F8FAFC",borderRadius:12,padding:14,marginBottom:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>الاستلام</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fD(p.recDin||0)}</div>
                      {(p.recDol||0)>0&&<div style={{fontSize:11,color:"#2563EB"}}>{f$(p.recDol)}</div>}
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>الصرف</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fD(p.spdDin||0)}</div>
                      {(p.spdDol||0)>0&&<div style={{fontSize:11,color:"#DC2626"}}>{f$(p.spdDol)}</div>}
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>الربح</div>
                      <div style={{fontSize:13,fontWeight:700,color:bDin>=0?"#16A34A":"#DC2626"}}>
                        {bDin>=0?"+":"-"}{fD(Math.abs(bDin))}</div>
                      {bDol!==0&&<div style={{fontSize:11,fontWeight:700,color:bDol>=0?"#2563EB":"#DC2626"}}>
                        {bDol>=0?"+":"-"}{f$(Math.abs(bDol))}</div>}
                    </div>
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#16A34A",marginBottom:8}}>
                    🇮🇶 توزيع ربح الدينار ({fD(bDin)})</div>
                  {dDin.map((d,i)=><DR key={d.fundId} d={d} i={i} dists={dDin} setDists={setDDin} profit={bDin} isDolR={false}/>)}
                  <div style={{padding:"8px",borderRadius:8,textAlign:"center",
                    background:Math.round(tDin)===100?"#F0FDF4":"#FFF1F2"}}>
                    <span style={{fontSize:13,fontWeight:700,color:Math.round(tDin)===100?"#16A34A":"#DC2626"}}>
                      المجموع: {tDin}%</span>
                  </div>
                </div>}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#2563EB",marginBottom:8}}>
                    🇺🇸 توزيع ربح الدولار ({f$(bDol)})</div>
                  {dDol.map((d,i)=><DR key={d.fundId} d={d} i={i} dists={dDol} setDists={setDDol} profit={bDol} isDolR={true}/>)}
                  <div style={{padding:"8px",borderRadius:8,textAlign:"center",
                    background:Math.round(tDol)===100?"#EFF6FF":"#FFF1F2"}}>
                    <span style={{fontSize:13,fontWeight:700,color:Math.round(tDol)===100?"#2563EB":"#DC2626"}}>
                      المجموع: {tDol}%</span>
                  </div>
                </div>}
                <button onClick={doClose}
                  disabled={closing||Math.round(tDin)!==100||Math.round(tDol)!==100}
                  style={{width:"100%",border:"none",borderRadius:12,padding:"14px",fontSize:15,
                    fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                    background:Math.round(tDin)===100&&Math.round(tDol)===100?"#7C3AED":"#E2E8F0",
                    color:Math.round(tDin)===100&&Math.round(tDol)===100?"#fff":"#94A3B8"}}>
                  {closing?"جاري التوزيع...":"🏁 تأكيد الإغلاق وتوزيع الأرباح"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── صفحة الشركاء ──
function PartnersPage({partners,bals,onBack,onSelPart,onReset}){
  const getBal=id=>bals[id]||{din:0,dol:0};
  const mb=getBal("partners");
  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"20px 14px"}}>
        <Back onClick={onBack}/>
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:16,
          border:"1px solid #E2E8F0",borderTop:"5px solid #9333EA"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#1E293B",marginBottom:8}}>إجمالي صندوق الشركاء</div>
          <div style={{fontSize:22,fontWeight:700,color:"#9333EA"}}>{fD(mb.din)}</div>
          {mb.dol!==0&&<div style={{fontSize:16,fontWeight:700,color:"#2563EB"}}>{f$(mb.dol)}</div>}
        </div>
        <div style={{fontSize:12,color:"#7C3AED",background:"#FAF5FF",borderRadius:10,
          padding:"10px 14px",marginBottom:16,border:"1px solid #9333EA20"}}>
          💡 الأرباح تأتي تلقائياً من إغلاق المشاريع
        </div>
        {partners.map(p=>{
          const pb=getBal("partner_"+p.id);
          return<button key={p.id} onClick={()=>onSelPart(p)} style={{width:"100%",background:"#fff",
            border:"1px solid #E2E8F0",borderRight:"5px solid "+p.color,borderRadius:14,
            padding:18,marginBottom:12,cursor:"pointer",textAlign:"right",fontFamily:"Tahoma"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:12,background:p.light,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <i className="ti ti-user" style={{fontSize:22,color:p.color}} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                  <div style={{fontSize:12,color:"#64748B"}}>حصة {p.share}%</div>
                </div>
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:18,fontWeight:700,color:pb.din>=0?p.color:"#DC2626"}}>
                  {pb.din>=0?"":"-"}{fD(Math.abs(pb.din))}</div>
                {pb.dol!==0&&<div style={{fontSize:13,fontWeight:700,color:"#2563EB"}}>{f$(pb.dol)}</div>}
              </div>
            </div>
          </button>;
        })}
        <button onClick={onReset} style={{width:"100%",background:"#FFF1F2",border:"1px solid #FEE2E2",
          borderRadius:10,padding:"12px",color:"#DC2626",cursor:"pointer",
          fontSize:13,fontFamily:"Tahoma",fontWeight:700}}>⚠️ تصفية شاملة</button>
      </div>
    </div>
  );
}

// ── صفحة شريك ──
function PartnerPage({partner,bals,txs,onBack,onWithdraw,onDelTx,onReset}){
  const p=partner;
  const pb=bals["partner_"+p.id]||{din:0,dol:0};
  const[f,setF]=useState({amount:"",note:"",date:today()});
  const[cur,setCur]=useState("دينار");
  const[saving,setSaving]=useState(false);
  const[done,setDone]=useState(false);
  const s=k=>v=>setF(x=>({...x,[k]:v}));
  const amtN=Number(f.amount)||0;
  const avail=cur==="دولار"?pb.dol:pb.din;
  const deps=txs.filter(t=>t.type==="إيداع أرباح"||t.isDistribution);
  const withs=txs.filter(t=>t.type==="سحب");

  const doWith=async()=>{
    if(!amtN||saving)return;
    setSaving(true);
    const ok=await onWithdraw(p.id,f.amount,cur,f.note,f.date);
    setSaving(false);
    if(ok){setDone(true);setTimeout(()=>{setDone(false);setF({amount:"",note:"",date:today()});},1500);}
  };

  const printStatement=()=>{
    const rows=txs.map(t=>{const isIn=t.type!=="سحب";const isDolT=t.currency==="دولار";
      return"<tr><td>"+t.date+"</td><td style='color:"+(isIn?"#16A34A":"#DC2626")+"'>"+(isIn?"إيداع":"سحب")+"</td><td>"+(t.note||"")+"</td><td style='font-weight:700;color:"+(isIn?"#16A34A":"#DC2626")+"'>"+(isIn?"+":"-")+(isDolT?f$(t.amount):fD(t.amount))+"</td></tr>";}).join("");
    const html="<!DOCTYPE html><html dir='rtl'><head><meta charset='utf-8'/><style>body{font-family:Tahoma;margin:24px}table{width:100%;border-collapse:collapse}th{background:#F1F5F9;padding:8px}td{padding:8px;border-bottom:1px solid #eee}</style></head><body><h2>"+COMPANY.name+"</h2><p>"+COMPANY.address+"</p><hr/><h3>كشف حساب — "+p.name+"</h3><p>الرصيد: <b>"+fD(pb.din)+"</b>"+(pb.dol?" | <b>"+f$(pb.dol)+"</b>":"")+"</p><table><thead><tr><th>التاريخ</th><th>النوع</th><th>ملاحظة</th><th>المبلغ</th></tr></thead><tbody>"+rows+"</tbody></table><p style='color:#64748B;font-size:11px'>طُبع: "+today()+"</p></body></html>";
    const fr=document.createElement("iframe");fr.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
    document.body.appendChild(fr);fr.contentDocument.open();fr.contentDocument.write(html);fr.contentDocument.close();
    setTimeout(()=>{fr.contentWindow.focus();fr.contentWindow.print();setTimeout(()=>fr.remove(),2000);},400);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"20px 14px"}}>
        <Back onClick={onBack} label="رجوع للشركاء"/>
        {/* بطاقة */}
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid "+p.color}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:48,height:48,borderRadius:13,background:p.light,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="ti ti-user" style={{fontSize:26,color:p.color}} aria-hidden="true"/>
              </div>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                <div style={{fontSize:12,color:"#64748B"}}>حصة {p.share}%</div>
              </div>
            </div>
            <button onClick={printStatement} style={{background:p.color,border:"none",borderRadius:10,
              padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontFamily:"Tahoma",fontWeight:600}}>
              🖨️ طباعة</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ أرباح</div>
              <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{fD(deps.reduce((s,t)=>s+(t.currency==="دينار"?t.amount:0),0))}</div>
            </div>
            <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ مسحوب</div>
              <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{fD(withs.reduce((s,t)=>s+(t.currency==="دينار"?t.amount:0),0))}</div>
            </div>
            <div style={{background:p.light,borderRadius:10,padding:"10px",textAlign:"center",border:"1.5px solid "+p.color+"40"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>💰 الرصيد</div>
              <div style={{fontSize:14,fontWeight:700,color:pb.din>=0?p.color:"#DC2626"}}>{fD(pb.din)}</div>
              {pb.dol!==0&&<div style={{fontSize:11,fontWeight:700,color:"#2563EB"}}>{f$(pb.dol)}</div>}
            </div>
          </div>
        </div>
        {/* سحب */}
        <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:14,border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>↑ سحب</div>
          {done?<div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{fontSize:36}}>✅</div>
            <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم السحب</div>
          </div>:<>
            <Lbl c="العملة"/><CurrBtn v={cur} set={setCur}/>
            <div style={{fontSize:12,color:"#64748B",marginBottom:10,background:"#F8FAFC",
              borderRadius:8,padding:"7px 12px"}}>المتاح: {cur==="دولار"?f$(pb.dol):fD(pb.din)}</div>
            <Lbl c="المبلغ"/>
            <Inp type="number" placeholder="٠" value={f.amount} onChange={e=>s("amount")(e.target.value)} autoFocus/>
            {amtN>0&&<div style={{fontSize:12,fontWeight:600,marginBottom:10,padding:"7px 12px",
              borderRadius:8,color:amtN<=avail?p.color:"#DC2626",
              background:amtN<=avail?p.light:"#FFF1F2"}}>
              {amtN<=avail?"✅ الرصيد كافٍ":"⚠️ تجاوز الرصيد"}</div>}
            <Lbl c="التاريخ"/><Inp type="date" value={f.date} onChange={e=>s("date")(e.target.value)}/>
            <Lbl c="ملاحظة"/><Inp placeholder="..." value={f.note} onChange={e=>s("note")(e.target.value)}/>
            <button onClick={doWith} disabled={!amtN||saving||amtN>avail}
              style={{width:"100%",border:"none",borderRadius:12,padding:"13px",fontSize:15,
                fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                background:amtN>0&&amtN<=avail?p.color:"#E2E8F0",
                color:amtN>0&&amtN<=avail?"#fff":"#94A3B8"}}>
              {saving?"جاري...":"↑ تأكيد السحب"}</button>
          </>}
        </div>
        {/* تصفية */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          background:"#fff",border:"1px solid #FEE2E2",borderRadius:12,
          padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>تصفية رصيد الشريك</div>
          <TsfBtn onClick={onReset}/>
        </div>
        {/* الأرباح */}
        {deps.length>0&&<>
          <div style={{fontSize:13,fontWeight:700,color:"#16A34A",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"#16A34A",borderRadius:2}}/>أرباح ({deps.length})</div>
          {deps.map(t=><div key={t.id} style={{background:"#fff",borderRadius:11,padding:"11px 14px",
            marginBottom:7,border:"1px solid #DCFCE7",borderRight:"4px solid #16A34A"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#16A34A",marginBottom:2}}>↓ أرباح</div>
                <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                {t.note&&<div style={{fontSize:11,color:"#64748B"}}>{t.note}</div>}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#16A34A"}}>+{t.currency==="دولار"?f$(t.amount):fD(t.amount)}</div>
                <DelBtn onClick={()=>onDelTx(t)}/>
              </div>
            </div>
          </div>)}
        </>}
        {/* سحوبات */}
        {withs.length>0&&<>
          <div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:8,marginTop:12,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"#DC2626",borderRadius:2}}/>سحوبات ({withs.length})</div>
          {withs.map(t=><div key={t.id} style={{background:"#fff",borderRadius:11,padding:"11px 14px",
            marginBottom:7,border:"1px solid #FEE2E2",borderRight:"4px solid #DC2626"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#DC2626",marginBottom:2}}>↑ سحب</div>
                <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                {t.note&&<div style={{fontSize:11,color:"#1E293B"}}>{t.note}</div>}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#DC2626"}}>-{t.currency==="دولار"?f$(t.amount):fD(t.amount)}</div>
                <DelBtn onClick={()=>onDelTx(t)}/>
              </div>
            </div>
          </div>)}
        </>}
      </div>
    </div>
  );
}
