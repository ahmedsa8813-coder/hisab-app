import React,{useState,useEffect}from"react";
import{initializeApp}from"firebase/app";
import{getFirestore,collection,doc,addDoc,setDoc,deleteDoc,
  onSnapshot,query,orderBy,where,getDocs}from"firebase/firestore";

const app=initializeApp({
  apiKey:"AIzaSyCN0XF9YDxLZIOMoVeZYMpXLl0rrS1HGrs",
  authDomain:"bab-fb825.firebaseapp.com",
  projectId:"bab-fb825"
});
const db=getFirestore(app);

const CO={name:"شركة باب المشاريع",addr:"بغداد — العرصات، مقابل شركة زين"};
const PARTNERS=[
  {id:"ihab",    name:"إيهاب زيتوني",share:30,color:"#2563EB",light:"#EFF6FF"},
  {id:"nour",    name:"نور إدوارد",   share:30,color:"#059669",light:"#ECFDF5"},
  {id:"mohammed",name:"محمد سالم",   share:30,color:"#7C3AED",light:"#F5F3FF"},
  {id:"ahmed",   name:"أحمد سالم",   share:10,color:"#D97706",light:"#FFFBEB"},
];
const PASS="1234";

const toAr=n=>{const s=String(Math.round(Math.abs(Number(n)||0)));
  let r="";for(let i=0;i<s.length;i++){if(i>0&&(s.length-i)%3===0)r+=",";r+=s[i];}return r;};
const td=()=>new Date().toISOString().split("T")[0];
const fD=n=>toAr(n)+" د.ع";
const f$=n=>toAr(Math.round(Math.abs(n)))+" $";
const ask=t=>{const p=window.prompt("🔒 "+t+"\nالباسورد:");
  if(!p)return false;if(p!==PASS){alert("❌ باسورد غلط");return false;}return true;};

const Lbl=({c})=><div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>{c}</div>;
const Inp=({sx,...p})=><input style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:10,
  padding:"11px 14px",fontSize:15,background:"#F8FAFC",color:"#1E293B",outline:"none",
  boxSizing:"border-box",fontFamily:"Tahoma",direction:"rtl",marginBottom:10,...sx}}{...p}/>;
const Back=({go,label="رجوع"})=><button onClick={go} style={{background:"#fff",
  border:"1px solid #E2E8F0",borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",
  cursor:"pointer",marginBottom:18,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
  ← {label}</button>;
const Del=({go})=><button onClick={go} style={{background:"none",border:"none",color:"#DC2626",
  fontSize:11,cursor:"pointer",fontFamily:"Tahoma",fontWeight:600,padding:"2px 0"}}>🗑️ حذف</button>;
const Cur=({v,set})=><div style={{display:"flex",gap:6,marginBottom:10}}>
  {["دينار","دولار"].map(c=><button key={c} onClick={()=>set(c)} style={{flex:1,padding:"10px",
    borderRadius:10,cursor:"pointer",fontFamily:"Tahoma",fontSize:13,fontWeight:700,
    border:"2px solid "+(v===c?(c==="دينار"?"#16A34A":"#2563EB"):"#E2E8F0"),
    background:v===c?(c==="دينار"?"#F0FDF4":"#EFF6FF"):"#fff",
    color:v===c?(c==="دينار"?"#16A34A":"#2563EB"):"#64748B"}}>
    {c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}</button>)}</div>;
const BalBox=({bals,id})=>{
  const b=bals[id]||{din:0,dol:0};
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
      <div style={{background:"#FFFBEB",borderRadius:10,padding:"10px",textAlign:"center",
        border:"1px solid #D9770620"}}>
        <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>🇮🇶 دينار</div>
        <div style={{fontSize:17,fontWeight:700,color:"#D97706"}}>{fD(b.din)}</div>
      </div>
      <div style={{background:"#EFF6FF",borderRadius:10,padding:"10px",textAlign:"center",
        border:"1px solid #2563EB20"}}>
        <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>🇺🇸 دولار</div>
        <div style={{fontSize:17,fontWeight:700,color:"#2563EB"}}>{f$(b.dol)}</div>
      </div>
    </div>
  );
};

export default function App(){
  const[pg,setPg]=useState("home");
  const[proj,setProj]=useState(null);
  const[part,setPart]=useState(null);
  const[bals,setBals]=useState({});
  const[projs,setProjs]=useState([]);
  const[pTxs,setPTxs]=useState([]);
  const[ptxs,setPtxs]=useState([]);
  const[emps,setEmps]=useState([]);
  const[load,setLoad]=useState(true);

  useEffect(()=>{
    if(!document.querySelector("#ti")){const l=document.createElement("link");
      l.id="ti";l.rel="stylesheet";
      l.href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);}
  },[]);

  useEffect(()=>{
    const t=setTimeout(()=>setLoad(false),1000);
    const u=onSnapshot(collection(db,"fund_balances"),snap=>{
      const b={};snap.docs.forEach(d=>{const x=d.data();b[d.id]={din:x.din??0,dol:x.dol??0};});
      setBals(b);setLoad(false);},()=>setLoad(false));
    return()=>{u();clearTimeout(t);};
  },[]);

  useEffect(()=>{
    if(pg!=="cont"&&pg!=="proj"){setProjs([]);setEmps([]);return;}
    const u1=onSnapshot(query(collection(db,"fund_projects"),orderBy("createdAt","desc")),
      s=>setProjs(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2=onSnapshot(query(collection(db,"employees"),orderBy("createdAt","desc")),
      s=>setEmps(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();};
  },[pg]);

  useEffect(()=>{
    if(!proj){setPTxs([]);return;}
    const u=onSnapshot(query(collection(db,"fund_projects_txs"),
      where("projectId","==",proj.id),orderBy("createdAt","desc")),
      s=>setPTxs(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>u();
  },[proj]);

  // تحديث فوري للمشروع من Firebase
  useEffect(()=>{
    if(!proj)return;
    const u=projs.find(p=>p.id===proj.id);
    if(u)setProj(u);
  },[projs]);

  useEffect(()=>{
    if(pg!=="parts"&&pg!=="part"){setPtxs([]);return;}
    const ids=["partners",...PARTNERS.map(p=>"partner_"+p.id)];
    const us=ids.map(pid=>onSnapshot(
      query(collection(db,"fund_transactions"),where("fundId","==",pid),orderBy("createdAt","desc")),
      s=>{const r=s.docs.map(d=>({id:d.id,...d.data()}));
        setPtxs(prev=>[...prev.filter(t=>t.fundId!==pid),...r]);}));
    return()=>us.forEach(u=>u());
  },[pg]);

  const gb=id=>bals[id]||{din:0,dol:0};

  // ── مشاريع ──
  const addProj=async d=>{
    const r=await addDoc(collection(db,"fund_projects"),{
      name:d.name.trim(),province:d.prov||"",client:d.client||"",
      totalDin:Number(d.tDin)||0,totalDol:Number(d.tDol)||0,
      status:"نشط",recDin:0,recDol:0,spdDin:0,spdDol:0,
      createdAt:new Date().toISOString()});
    await setDoc(doc(db,"fund_balances","proj_"+r.id),{din:0,dol:0});
  };

  const addProjTx=async(pr,type,cur,amt,note,date,onOptimistic)=>{
    const a=Math.round(Number(amt));if(!a)return;
    const isDol=cur==="دولار",isRec=type==="إيداع";
    const k=isDol?(isRec?"recDol":"spdDol"):(isRec?"recDin":"spdDin");
    const newVal=(pr[k]||0)+a;
    // تحديث فوري في الواجهة
    if(onOptimistic)onOptimistic(k,newVal);
    await setDoc(doc(db,"fund_projects",pr.id),{[k]:newVal},{merge:true});
    await addDoc(collection(db,"fund_projects_txs"),{
      projectId:pr.id,projectName:pr.name,type,currency:cur,
      amount:a,note:note||"",date:date||td(),createdAt:new Date().toISOString()});
  };

  const delProjTx=async(t,pr,onOptimistic)=>{
    if(!ask("حذف الحركة"))return;
    const isDol=t.currency==="دولار",isRec=t.type==="إيداع";
    const k=isDol?(isRec?"recDol":"spdDol"):(isRec?"recDin":"spdDin");
    const newVal=Math.max(0,(pr[k]||0)-t.amount);
    if(onOptimistic)onOptimistic(k,newVal);
    await setDoc(doc(db,"fund_projects",pr.id),{[k]:newVal},{merge:true});
    await deleteDoc(doc(db,"fund_projects_txs",t.id));
  };

  const delProj=async id=>{
    if(!ask("حذف المشروع"))return;
    await deleteDoc(doc(db,"fund_projects",id));
    await deleteDoc(doc(db,"fund_balances","proj_"+id));
  };

  const closeProj=async(pr,pctCont,pctPart)=>{
    const bDin=(pr.recDin||0)-(pr.spdDin||0);
    const bDol=(pr.recDol||0)-(pr.spdDol||0);
    const dist=async(profit,isDolCur)=>{
      if(profit<=0)return;
      // للمقاولات
      if(pctCont>0){
        const share=Math.round(profit*pctCont/100);
        const cb=gb("contracting");
        await setDoc(doc(db,"fund_balances","contracting"),
          {din:isDolCur?cb.din:cb.din+share,dol:isDolCur?cb.dol+share:cb.dol},{merge:true});
      }
      // للشركاء
      if(pctPart>0){
        const share=Math.round(profit*pctPart/100);
        const pb=gb("partners");
        await setDoc(doc(db,"fund_balances","partners"),
          {din:isDolCur?pb.din:pb.din+share,dol:isDolCur?pb.dol+share:pb.dol},{merge:true});
        await addDoc(collection(db,"fund_transactions"),{fundId:"partners",
          type:"إيداع أرباح",currency:isDolCur?"دولار":"دينار",amount:share,
          note:pctPart+"% أرباح — "+pr.name,date:td(),createdAt:new Date().toISOString()});
        for(const p of PARTNERS){
          const ps=Math.round(share*p.share/100);if(!ps)continue;
          const pid="partner_"+p.id,ppb=gb(pid);
          await setDoc(doc(db,"fund_balances",pid),
            {din:isDolCur?ppb.din:ppb.din+ps,dol:isDolCur?ppb.dol+ps:ppb.dol},{merge:true});
          await addDoc(collection(db,"fund_transactions"),{fundId:pid,fundName:p.name,
            type:"إيداع أرباح",currency:isDolCur?"دولار":"دينار",amount:ps,
            note:"حصة "+p.share+"% — "+pr.name,date:td(),isDistribution:true,
            createdAt:new Date().toISOString()});
        }
      }
    };
    await dist(bDin,false);
    await dist(bDol,true);
    await setDoc(doc(db,"fund_projects",pr.id),{status:"منتهي",closedAt:td()},{merge:true});
  };

  const addEmp=async d=>addDoc(collection(db,"employees"),{
    name:d.name.trim(),role:d.role||"",salary:Number(d.salary)||0,
    currency:d.currency||"دينار",note:d.note||"",createdAt:new Date().toISOString()});
  const delEmp=async id=>{if(!ask("حذف الموظف"))return;
    await deleteDoc(doc(db,"employees",id));};

  // ── شركاء ──
  const withdraw=async(pid,amt,cur,note,date)=>{
    const a=Math.round(Number(amt));const isDol=cur==="دولار";
    const pId="partner_"+pid;const pb=gb(pId);
    if(isDol&&a>pb.dol){alert("رصيد الدولار غير كافٍ. المتاح: "+f$(pb.dol));return false;}
    if(!isDol&&a>pb.din){alert("رصيد الدينار غير كافٍ. المتاح: "+fD(pb.din));return false;}
    const mb=gb("partners");
    await setDoc(doc(db,"fund_balances",pId),
      {din:isDol?pb.din:pb.din-a,dol:isDol?pb.dol-a:pb.dol},{merge:true});
    await setDoc(doc(db,"fund_balances","partners"),
      {din:isDol?mb.din:mb.din-a,dol:isDol?mb.dol-a:mb.dol},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{fundId:pId,
      fundName:PARTNERS.find(p=>p.id===pid)?.name||"",
      type:"سحب",currency:cur,amount:a,note:note||"",date:date||td(),
      createdAt:new Date().toISOString()});
    return true;
  };

  const delPartTx=async t=>{
    if(!ask("حذف المعاملة"))return;
    const isDol=t.currency==="دولار",isIn=t.type==="إيداع أرباح";
    const pb=gb(t.fundId);
    await setDoc(doc(db,"fund_balances",t.fundId),
      {din:isDol?pb.din:(isIn?pb.din-t.amount:pb.din+t.amount),
       dol:isDol?(isIn?pb.dol-t.amount:pb.dol+t.amount):pb.dol},{merge:true});
    await deleteDoc(doc(db,"fund_transactions",t.id));
  };

  const resetPartner=async(pid,name)=>{
    if(!ask("تصفية رصيد "+name))return;
    await setDoc(doc(db,"fund_balances",pid),{din:0,dol:0},{merge:true});
    const s=await getDocs(query(collection(db,"fund_transactions"),where("fundId","==",pid)));
    for(const d of s.docs)await deleteDoc(doc(db,"fund_transactions",d.id));
  };

  const resetAll=async()=>{
    const pw=window.prompt("⚠️ تصفية شاملة\nالباسورد:");
    if(!pw||pw!==PASS){if(pw!==null)alert("❌ باسورد غلط");return;}
    const bs=await getDocs(collection(db,"fund_balances"));
    for(const d of bs.docs)await setDoc(doc(db,"fund_balances",d.id),{din:0,dol:0});
    for(const col of["fund_projects","fund_projects_txs","employees","fund_transactions"]){
      const s=await getDocs(collection(db,col));
      for(const d of s.docs)await deleteDoc(doc(db,col,d.id));
    }
    alert("✅ تمت التصفية");
  };

  if(load)return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:10,fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{fontSize:48}}>🏗️</div>
      <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{CO.name}</div>
      <div style={{fontSize:13,color:"#64748B"}}>جاري التحميل...</div>
    </div>
  );

  if(pg==="proj"&&proj)return<ProjPage proj={proj} txs={pTxs}
    onBack={()=>{setPg("cont");setProj(null);}}
    onAdd={(pr,type,cur,amt,note,date,cb)=>addProjTx(pr,type,cur,amt,note,date,cb)}
    onDel={(t,pr,cb)=>delProjTx(t,pr,cb)}
    onClose={closeProj}
    onDelProj={id=>{delProj(id);setPg("cont");setProj(null);}}/>;

  if(pg==="part"&&part)return<PartPage partner={part} bals={bals}
    txs={ptxs.filter(t=>t.fundId==="partner_"+part.id)}
    onBack={()=>{setPg("parts");setPart(null);}}
    onWithdraw={withdraw} onDel={delPartTx}
    onReset={()=>resetPartner("partner_"+part.id,part.name)}/>;

  if(pg==="parts")return<PartsPage partners={PARTNERS} bals={bals}
    onBack={()=>setPg("home")}
    onSel={p=>{setPart(p);setPg("part");}}/>;

  if(pg==="cont")return<ContPage projs={projs} emps={emps} bals={bals}
    onBack={()=>setPg("home")}
    onSel={p=>{setProj(p);setPg("proj");}}
    onAdd={addProj} onDel={delProj}
    onAddEmp={addEmp} onDelEmp={delEmp}/>;

  const cb=gb("contracting"),pb=gb("partners");
  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:460,margin:"0 auto",padding:"28px 16px"}}>
        <div style={{background:"#fff",borderRadius:16,padding:"18px 20px",marginBottom:20,
          border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:19,fontWeight:700,color:"#1E293B"}}>{CO.name}</div>
          <div style={{fontSize:12,color:"#64748B",marginTop:3}}>{CO.addr}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* المقاولات */}
          <button onClick={()=>setPg("cont")} style={{background:"#fff",border:"1px solid #E2E8F0",
            borderTop:"4px solid #D97706",borderRadius:16,padding:20,cursor:"pointer",
            textAlign:"right",fontFamily:"Tahoma"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:44,height:44,borderRadius:12,background:"#FFFBEB",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏗️</div>
              <div style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>صندوق المقاولات</div>
            </div>
            <div style={{fontSize:12,color:"#64748B",marginBottom:10}}>
              {projs.filter(p=>p.status==="نشط").length} مشروع نشط · {emps.length} موظف
            </div>
            <BalBox bals={bals} id="contracting"/>
          </button>
          {/* الشركاء */}
          <button onClick={()=>setPg("parts")} style={{background:"#fff",border:"1px solid #E2E8F0",
            borderTop:"4px solid #9333EA",borderRadius:16,padding:20,cursor:"pointer",
            textAlign:"right",fontFamily:"Tahoma"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:44,height:44,borderRadius:12,background:"#FAF5FF",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👥</div>
              <div style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>صندوق الشركاء</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"#FAF5FF",borderRadius:10,padding:"10px",textAlign:"center",
                border:"1px solid #9333EA20"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>🇮🇶 دينار</div>
                <div style={{fontSize:17,fontWeight:700,color:"#9333EA"}}>{fD(pb.din)}</div>
              </div>
              <div style={{background:"#EFF6FF",borderRadius:10,padding:"10px",textAlign:"center",
                border:"1px solid #2563EB20"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>🇺🇸 دولار</div>
                <div style={{fontSize:17,fontWeight:700,color:"#2563EB"}}>{f$(pb.dol)}</div>
              </div>
            </div>
          </button>
          <button onClick={resetAll} style={{background:"#FFF1F2",border:"1px solid #FEE2E2",
            borderRadius:12,padding:14,cursor:"pointer",color:"#DC2626",
            fontFamily:"Tahoma",fontSize:14,fontWeight:700}}>
            ⚠️ تصفية شاملة
          </button>
        </div>
      </div>
    </div>
  );
}

// ── صفحة المقاولات ──
function ContPage({projs,emps,bals,onBack,onSel,onAdd,onDel,onAddEmp,onDelEmp}){
  const[tab,setTab]=useState("proj");
  const[showP,setShowP]=useState(false);
  const[showE,setShowE]=useState(false);
  const[pf,setPf]=useState({name:"",prov:"",client:"",tDin:"",tDol:""});
  const[ef,setEf]=useState({name:"",role:"",salary:"",currency:"دينار",note:""});
  const[sv,setSv]=useState(false);
  const sp=k=>v=>setPf(x=>({...x,[k]:v}));
  const se=k=>v=>setEf(x=>({...x,[k]:v}));
  const active=projs.filter(p=>p.status==="نشط");
  const done=projs.filter(p=>p.status==="منتهي");

  const saveP=async()=>{
    if(!pf.name.trim()||sv)return;
    if(!pf.tDin&&!pf.tDol){alert("أدخل قيمة المشروع");return;}
    setSv(true);await onAdd(pf);setSv(false);
    setPf({name:"",prov:"",client:"",tDin:"",tDol:""});setShowP(false);
  };
  const saveE=async()=>{
    if(!ef.name.trim()||sv)return;
    setSv(true);await onAddEmp(ef);setSv(false);
    setEf({name:"",role:"",salary:"",currency:"دينار",note:""});setShowE(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:700,margin:"0 auto",padding:"20px 14px"}}>
        <Back go={onBack}/>
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid #D97706"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
            <div style={{fontSize:26}}>🏗️</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>صندوق المقاولات</div>
          </div>
          <div style={{fontSize:12,color:"#64748B"}}>
            {active.length} مشروع نشط · {done.length} منتهي · {emps.length} موظف
          </div>
          <div style={{marginTop:10,background:"#FFFBEB",borderRadius:10,
            padding:"12px 14px",border:"1px solid #D9770630"}}>
            <div style={{fontSize:10,color:"#D97706",fontWeight:600,marginBottom:10}}>
              💎 رصيد الصندوق
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"#fff",borderRadius:10,padding:"10px",textAlign:"center",
                border:"1px solid #D9770620"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>🇮🇶 دينار</div>
                <div style={{fontSize:18,fontWeight:700,color:"#D97706"}}>
                  {fD((bals["contracting"]||{din:0}).din)}
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:10,padding:"10px",textAlign:"center",
                border:"1px solid #2563EB20"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>🇺🇸 دولار</div>
                <div style={{fontSize:18,fontWeight:700,color:"#2563EB"}}>
                  {f$((bals["contracting"]||{dol:0}).dol)}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* تبويبات */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
          {[["proj","🏗️ المشاريع"],["emp","👷 الموظفون"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)} style={{border:tab===v?"none":"1px solid #E2E8F0",
              borderRadius:10,padding:"12px",cursor:"pointer",fontWeight:700,fontSize:13,
              fontFamily:"Tahoma",background:tab===v?"#D97706":"#fff",
              color:tab===v?"#fff":"#64748B"}}>{l}</button>
          ))}
        </div>
        {/* المشاريع */}
        {tab==="proj"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>نشطة ({active.length})</div>
              <button onClick={()=>setShowP(v=>!v)} style={{background:showP?"#64748B":"#D97706",
                border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",
                cursor:"pointer",fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
                {showP?"✕ إلغاء":"+ مشروع جديد"}
              </button>
            </div>
            {showP&&(
              <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,
                padding:18,marginBottom:14}}>
                <Lbl c="اسم المشروع *"/>
                <Inp placeholder="اسم المشروع..." value={pf.name}
                  onChange={e=>sp("name")(e.target.value)} autoFocus/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><Lbl c="المحافظة"/>
                    <Inp placeholder="بغداد..." value={pf.prov}
                      onChange={e=>sp("prov")(e.target.value)} sx={{marginBottom:0}}/></div>
                  <div><Lbl c="العميل"/>
                    <Inp placeholder="صاحب المشروع..." value={pf.client}
                      onChange={e=>sp("client")(e.target.value)} sx={{marginBottom:0}}/></div>
                </div>
                <div style={{height:10}}/>
                <div style={{background:"#FFFBEB",borderRadius:12,padding:14,
                  marginBottom:10,border:"1px solid #D9770620"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1E293B",marginBottom:10}}>
                    💰 قيمة المشروع
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><Lbl c="🇮🇶 دينار"/>
                      <Inp type="number" placeholder="٠" value={pf.tDin}
                        onChange={e=>sp("tDin")(e.target.value)}
                        sx={{marginBottom:0,textAlign:"center"}}/>
                      {Number(pf.tDin)>0&&(
                        <div style={{fontSize:10,color:"#16A34A",marginTop:3}}>
                          {fD(Number(pf.tDin))}</div>
                      )}
                    </div>
                    <div><Lbl c="🇺🇸 دولار"/>
                      <Inp type="number" placeholder="٠" value={pf.tDol}
                        onChange={e=>sp("tDol")(e.target.value)}
                        sx={{marginBottom:0,textAlign:"center"}}/>
                      {Number(pf.tDol)>0&&(
                        <div style={{fontSize:10,color:"#2563EB",marginTop:3}}>
                          {f$(Number(pf.tDol))}</div>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={saveP} disabled={!pf.name.trim()||sv}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
                    fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:pf.name.trim()?"#D97706":"#E2E8F0",
                    color:pf.name.trim()?"#fff":"#94A3B8"}}>
                  {sv?"جاري...":"✅ إنشاء المشروع"}
                </button>
              </div>
            )}
            {active.length===0&&!showP&&(
              <div style={{textAlign:"center",padding:32,color:"#94A3B8",background:"#fff",
                borderRadius:14,border:"1px solid #E2E8F0",marginBottom:14}}>
                ما في مشاريع نشطة
              </div>
            )}
            {active.map(p=>(
              <PCard key={p.id} p={p}
                onOpen={()=>onSel(p)}
                onDel={()=>onDel(p.id)}/>
            ))}
            {done.length>0&&(
              <>
                <div style={{fontSize:13,fontWeight:700,color:"#94A3B8",marginTop:18,
                  marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:3,height:14,background:"#CBD5E1",borderRadius:2}}/>
                  منتهية ({done.length})
                </div>
                {done.map(p=>(
                  <PCard key={p.id} p={p} fin
                    onOpen={()=>onSel(p)}
                    onDel={()=>onDel(p.id)}/>
                ))}
              </>
            )}
          </div>
        )}
        {/* الموظفون */}
        {tab==="emp"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>الموظفون ({emps.length})</div>
              <button onClick={()=>setShowE(v=>!v)} style={{background:showE?"#64748B":"#D97706",
                border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",
                cursor:"pointer",fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
                {showE?"✕ إلغاء":"+ موظف جديد"}
              </button>
            </div>
            {showE&&(
              <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,
                padding:18,marginBottom:14}}>
                <Lbl c="الاسم *"/>
                <Inp placeholder="الاسم الكامل..." value={ef.name}
                  onChange={e=>se("name")(e.target.value)} autoFocus/>
                <Lbl c="المنصب"/>
                <Inp placeholder="مهندس، عامل..." value={ef.role}
                  onChange={e=>se("role")(e.target.value)}/>
                <Lbl c="الراتب الشهري"/>
                <Inp type="number" placeholder="٠" value={ef.salary}
                  onChange={e=>se("salary")(e.target.value)}/>
                <Lbl c="العملة"/>
                <Cur v={ef.currency} set={v=>se("currency")(v)}/>
                <Lbl c="ملاحظة"/>
                <Inp placeholder="..." value={ef.note}
                  onChange={e=>se("note")(e.target.value)}/>
                <button onClick={saveE} disabled={!ef.name.trim()||sv}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
                    fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:ef.name.trim()?"#D97706":"#E2E8F0",
                    color:ef.name.trim()?"#fff":"#94A3B8"}}>
                  {sv?"جاري...":"✅ إضافة الموظف"}
                </button>
              </div>
            )}
            {emps.length===0&&!showE&&(
              <div style={{textAlign:"center",padding:32,color:"#94A3B8",background:"#fff",
                borderRadius:14,border:"1px solid #E2E8F0"}}>ما في موظفين</div>
            )}
            {emps.map(e=>(
              <div key={e.id} style={{background:"#fff",borderRadius:12,padding:"14px 16px",
                marginBottom:10,border:"1px solid #E2E8F0",borderRight:"4px solid #D97706"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>👷 {e.name}</div>
                    {e.role&&<div style={{fontSize:12,color:"#64748B",marginTop:2}}>💼 {e.role}</div>}
                    {e.salary>0&&<div style={{fontSize:13,fontWeight:700,color:"#D97706",marginTop:2}}>
                      💰 {e.currency==="دولار"?f$(e.salary):fD(e.salary)} / شهر</div>}
                    {e.note&&<div style={{fontSize:11,color:"#94A3B8",marginTop:3}}>{e.note}</div>}
                  </div>
                  <Del go={()=>onDelEmp(e.id)}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PCard({p,onOpen,onDel,fin=false}){
  const bD=(p.recDin||0)-(p.spdDin||0);
  const bL=(p.recDol||0)-(p.spdDol||0);
  const c=fin?"#94A3B8":"#D97706";
  return(
    <div style={{background:fin?"#FAFAFA":"#fff",border:"1px solid #E2E8F0",
      borderRight:"4px solid "+c,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
      <div onClick={onOpen} style={{cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:fin?"#64748B":"#1E293B"}}>{p.name}</div>
            <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
              {p.province&&<span style={{fontSize:11,color:"#64748B"}}>📍 {p.province}</span>}
              {p.client&&<span style={{fontSize:11,color:"#64748B"}}>👤 {p.client}</span>}
            </div>
            <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
              marginTop:4,display:"inline-block",
              background:fin?"#F1F5F9":"#DCFCE7",
              color:fin?"#64748B":"#16A34A"}}>
              {fin?"✓ منتهي":"● نشط"}
            </span>
          </div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:14,fontWeight:700,color:bD>=0?c:"#DC2626"}}>
              {bD>=0?"":"-"}{fD(Math.abs(bD))}
            </div>
            {bL!==0&&<div style={{fontSize:12,fontWeight:700,color:bL>=0?"#2563EB":"#DC2626"}}>
              {bL>=0?"":"-"}{f$(Math.abs(bL))}</div>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
          <div style={{background:"#F0FDF4",borderRadius:8,padding:"6px 10px"}}>
            <div style={{fontSize:9,color:"#64748B"}}>↓ استلام د.ع</div>
            <div style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>{fD(p.recDin||0)}</div>
          </div>
          <div style={{background:"#FFF1F2",borderRadius:8,padding:"6px 10px"}}>
            <div style={{fontSize:9,color:"#64748B"}}>↑ صرف د.ع</div>
            <div style={{fontSize:12,fontWeight:700,color:"#DC2626"}}>{fD(p.spdDin||0)}</div>
          </div>
        </div>
        {((p.recDol||0)>0||(p.spdDol||0)>0)&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div style={{background:"#EFF6FF",borderRadius:8,padding:"6px 10px"}}>
              <div style={{fontSize:9,color:"#64748B"}}>↓ استلام $</div>
              <div style={{fontSize:12,fontWeight:700,color:"#2563EB"}}>{f$(p.recDol||0)}</div>
            </div>
            <div style={{background:"#FEF2F2",borderRadius:8,padding:"6px 10px"}}>
              <div style={{fontSize:9,color:"#64748B"}}>↑ صرف $</div>
              <div style={{fontSize:12,fontWeight:700,color:"#DC2626"}}>{f$(p.spdDol||0)}</div>
            </div>
          </div>
        )}
      </div>
      <div style={{marginTop:10,display:"flex",justifyContent:"flex-end"}}>
        <Del go={e=>{e.stopPropagation();onDel();}}/>
      </div>
    </div>
  );
}

// ── صفحة مشروع ──
function ProjPage({proj,txs,onBack,onAdd,onDel,onClose,onDelProj}){
  const[p,setP]=useState(proj);
  const[tab,setTab]=useState("dep");
  const[cur,setCur]=useState("دينار");
  const[f,setF]=useState({amount:"",note:"",date:td()});
  const[sv,setSv]=useState(false);
  const[ok,setOk]=useState(false);
  const[showC,setShowC]=useState(false);
  const[closing,setClosing]=useState(false);
  const[pctCont,setPctCont]=useState(100);
  const[pctPart,setPctPart]=useState(0);
  const s=k=>v=>setF(x=>({...x,[k]:v}));
  const amt=Number(f.amount)||0;
  const isDol=cur==="دولار";
  const bDin=(p.recDin||0)-(p.spdDin||0);
  const bDol=(p.recDol||0)-(p.spdDol||0);
  const avail=isDol?bDol:bDin;
  const act=p.status==="نشط";
  const allTxs=[...txs].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const total=pctCont+pctPart;
  useEffect(()=>setP(proj),[proj]);

  // تحديث فوري في الواجهة
  const optimistic=(k,v)=>setP(prev=>({...prev,[k]:v}));

  const save=async()=>{
    if(!amt||sv)return;
    if(tab==="with"&&amt>avail){alert("الرصيد غير كافٍ");return;}
    setSv(true);
    await onAdd(p,tab==="dep"?"إيداع":"سحب",cur,f.amount,f.note,f.date,optimistic);
    setSv(false);setOk(true);
    setTimeout(()=>{setOk(false);setF({amount:"",note:"",date:td()});},1200);
  };

  const doClose=async()=>{
    if(total!==100){alert("مجموع النسب يجب أن يساوي 100%");return;}
    setClosing(true);
    await onClose(p,pctCont,pctPart);
    setClosing(false);setShowC(false);
  };

  const doPrint=()=>{
    let num=0;
    const rows=[...allTxs].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(t=>{
      num++;const isIn=t.type==="إيداع",isDolT=t.currency==="دولار";
      const bg=num%2===0?"#F8FAFC":"#fff";
      return"<tr style='background:"+bg+"'>"
        +"<td style='font-weight:600'>"+num+"</td>"
        +"<td style='font-weight:600;color:#1E293B'>"+t.date+"</td>"
        +"<td style='color:"+(isDolT?"#2563EB":"#059669")+";font-weight:600'>"+(isDolT?"🇺🇸 دولار":"🇮🇶 دينار")+"</td>"
        +"<td style='color:"+(isIn?"#16A34A":"#DC2626")+";font-weight:700'>"+(isIn?"↓ استلام":"↑ صرف")+"</td>"
        +"<td style='text-align:right;color:#475569'>"+(t.note||"—")+"</td>"
        +"<td style='font-weight:700;color:"+(isIn?"#16A34A":"#DC2626")+"'>"+(isIn?"+":"-")+(isDolT?f$(t.amount):fD(t.amount))+"</td>"
        +"</tr>";
    }).join("");
    const dinRows=txs.filter(t=>t.currency!=="دولار");
    const dolRows=txs.filter(t=>t.currency==="دولار");
    const sRD=dinRows.filter(t=>t.type==="إيداع").reduce((s,t)=>s+t.amount,0);
    const sSD=dinRows.filter(t=>t.type!=="إيداع").reduce((s,t)=>s+t.amount,0);
    const sRL=dolRows.filter(t=>t.type==="إيداع").reduce((s,t)=>s+t.amount,0);
    const sSL=dolRows.filter(t=>t.type!=="إيداع").reduce((s,t)=>s+t.amount,0);
    const html="<!DOCTYPE html><html dir='rtl'><head><meta charset='utf-8'/>"
      +"<style>*{font-family:Tahoma}body{margin:0;padding:22px;direction:rtl}"
      +".hdr{border-bottom:3px solid #D97706;padding-bottom:12px;margin-bottom:14px}"
      +".cn{font-size:20px;font-weight:700;color:#1E293B;margin:0 0 2px}"
      +".ca{font-size:11px;color:#64748B}"
      +".pt{font-size:17px;font-weight:700;color:#D97706;margin:12px 0 6px}"
      +".ig{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}"
      +".ii{background:#F8FAFC;border-radius:7px;padding:7px 11px}"
      +".il{font-size:10px;color:#64748B;margin-bottom:2px}"
      +".iv{font-size:12px;font-weight:600;color:#1E293B}"
      +".sg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}"
      +".sb{border-radius:9px;padding:11px;text-align:center;border:1px solid #E2E8F0}"
      +".sl{font-size:10px;color:#64748B;margin-bottom:4px}"
      +".sv{font-size:15px;font-weight:700}"
      +"table{width:100%;border-collapse:collapse}"
      +"thead tr{background:#D97706}"
      +"th{color:#fff;padding:9px 7px;font-size:11px;text-align:center}"
      +"td{padding:8px 7px;font-size:11px;text-align:center;border-bottom:1px solid #F1F5F9}"
      +".ft{margin-top:16px;padding-top:8px;border-top:1px solid #E2E8F0;"
        +"font-size:10px;color:#94A3B8;display:flex;justify-content:space-between}"
      +"</style></head><body>"
      +"<div class='hdr'><div class='cn'>"+CO.name+"</div><div class='ca'>"+CO.addr+"</div></div>"
      +"<div class='pt'>📋 كشف حساب مشروع</div>"
      +"<div class='ig'>"
        +"<div class='ii'><div class='il'>اسم المشروع</div><div class='iv'>"+p.name+"</div></div>"
        +(p.client?"<div class='ii'><div class='il'>العميل</div><div class='iv'>"+p.client+"</div></div>":"")
        +(p.province?"<div class='ii'><div class='il'>المحافظة</div><div class='iv'>"+p.province+"</div></div>":"")
        +(p.totalDin?"<div class='ii'><div class='il'>قيمة المشروع (دينار)</div><div class='iv'>"+fD(p.totalDin)+"</div></div>":"")
        +(p.totalDol?"<div class='ii'><div class='il'>قيمة المشروع (دولار)</div><div class='iv'>"+f$(p.totalDol)+"</div></div>":"")
        +"<div class='ii'><div class='il'>الحالة</div><div class='iv'>"+(p.status==="نشط"?"● نشط":"✓ منتهي")+"</div></div>"
        +"<div class='ii'><div class='il'>عدد الحركات</div><div class='iv'>"+txs.length+" حركة</div></div>"
      +"</div>"
      +"<div class='sg'>"
        +"<div class='sb' style='background:#F0FDF4'><div class='sl'>↓ إجمالي الاستلام</div>"
          +"<div class='sv' style='color:#16A34A'>"+fD(sRD)+"</div>"
          +(sRL?"<div style='font-size:11px;font-weight:700;color:#2563EB;margin-top:2px'>"+f$(sRL)+"</div>":"")
        +"</div>"
        +"<div class='sb' style='background:#FFF1F2'><div class='sl'>↑ إجمالي الصرف</div>"
          +"<div class='sv' style='color:#DC2626'>"+fD(sSD)+"</div>"
          +(sSL?"<div style='font-size:11px;font-weight:700;color:#DC2626;margin-top:2px'>"+f$(sSL)+"</div>":"")
        +"</div>"
        +"<div class='sb' style='background:#FFFBEB;border-color:#D97706'><div class='sl'>💰 صافي الربح</div>"
          +"<div class='sv' style='color:#D97706'>"+fD(bDin)+"</div>"
          +(bDol?"<div style='font-size:11px;font-weight:700;color:#2563EB;margin-top:2px'>"+f$(bDol)+"</div>":"")
        +"</div>"
      +"</div>"
      +"<table><thead><tr><th>#</th><th>التاريخ</th><th>العملة</th><th>النوع</th><th>البيان / الملاحظة</th><th>المبلغ</th></tr></thead>"
      +"<tbody>"+rows+"</tbody></table>"
      +"<div class='ft'><span>"+CO.name+" — "+CO.addr+"</span><span>تاريخ الطباعة: "+td()+"</span></div>"
      +"</body></html>";
    const w=window.open("","_blank","width=900,height=700");
    if(!w){alert("السماح بالنوافذ المنبثقة من إعدادات المتصفح");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),700);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <Back go={onBack} label="رجوع"/>
          {!act&&<button onClick={()=>{if(ask("حذف المشروع"))onDelProj(p.id);}}
            style={{background:"transparent",border:"1px solid #FEE2E2",borderRadius:10,
              padding:"8px 14px",color:"#DC2626",cursor:"pointer",fontSize:12,
              fontFamily:"Tahoma",fontWeight:600}}>🗑️ حذف المشروع</button>}
        </div>
        {/* بطاقة المشروع */}
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid "+(act?"#D97706":"#94A3B8")}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
              {p.province&&<div style={{fontSize:12,color:"#64748B",marginTop:2}}>📍 {p.province}</div>}
              {p.client&&<div style={{fontSize:12,color:"#64748B"}}>👤 {p.client}</div>}
              <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
                marginTop:5,display:"inline-block",
                background:act?"#DCFCE7":"#F1F5F9",color:act?"#16A34A":"#64748B"}}>
                {act?"● نشط":"✓ منتهي"}</span>
            </div>
            {act&&<button onClick={()=>setShowC(true)} style={{background:"#7C3AED",border:"none",
              borderRadius:10,padding:"9px 16px",color:"#fff",cursor:"pointer",
              fontSize:13,fontFamily:"Tahoma",fontWeight:700}}>🏁 إغلاق</button>}
          </div>
          {/* دينار */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:"#16A34A",marginBottom:6}}>🇮🇶 الدينار</div>
            {p.totalDin>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:5}}>
              قيمة المشروع: <strong>{fD(p.totalDin)}</strong></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ استلام</div>
                <div style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>{fD(p.recDin||0)}</div>
              </div>
              <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ صرف</div>
                <div style={{fontSize:14,fontWeight:700,color:"#DC2626"}}>{fD(p.spdDin||0)}</div>
              </div>
              <div style={{background:bDin>=0?"#FFFBEB":"#FFF1F2",borderRadius:10,padding:"10px",
                textAlign:"center",border:"1.5px solid "+(bDin>=0?"#D9770640":"#DC262640")}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>💰 الربح</div>
                <div style={{fontSize:14,fontWeight:700,color:bDin>=0?"#D97706":"#DC2626"}}>
                  {bDin>=0?"+":"-"}{fD(Math.abs(bDin))}</div>
              </div>
            </div>
          </div>
          {/* دولار */}
          <div style={{borderTop:"1px solid #E2E8F0",paddingTop:10}}>
            <div style={{fontSize:10,fontWeight:700,color:"#2563EB",marginBottom:6}}>🇺🇸 الدولار</div>
            {p.totalDol>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:5}}>
              قيمة المشروع: <strong>{f$(p.totalDol)}</strong></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div style={{background:"#EFF6FF",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ استلام</div>
                <div style={{fontSize:14,fontWeight:700,color:"#2563EB"}}>{f$(p.recDol||0)}</div>
              </div>
              <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ صرف</div>
                <div style={{fontSize:14,fontWeight:700,color:"#DC2626"}}>{f$(p.spdDol||0)}</div>
              </div>
              <div style={{background:bDol>=0?"#EFF6FF":"#FFF1F2",borderRadius:10,padding:"10px",
                textAlign:"center",border:"1.5px solid "+(bDol>=0?"#2563EB40":"#DC262640")}}>
                <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>💰 الربح</div>
                <div style={{fontSize:14,fontWeight:700,color:bDol>=0?"#2563EB":"#DC2626"}}>
                  {bDol>=0?"+":"-"}{f$(Math.abs(bDol))}</div>
              </div>
            </div>
          </div>
        </div>
        {/* تبويبات */}
        {act&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
          {[["dep","↓ استلام","#16A34A"],["with","↑ صرف","#DC2626"],["hist","📋 السجل","#1E293B"]].map(([id,l,c])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{border:tab===id?"none":"1px solid #E2E8F0",borderRadius:10,
                padding:"11px",cursor:"pointer",fontWeight:700,fontSize:13,
                fontFamily:"Tahoma",background:tab===id?c:"#fff",
                color:tab===id?"#fff":"#64748B"}}>{l}</button>
          ))}
        </div>}
        {/* نموذج */}
        {act&&(tab==="dep"||tab==="with")&&(
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,
            padding:18,marginBottom:14}}>
            {ok?<div style={{textAlign:"center",padding:"14px 0"}}>
              <div style={{fontSize:36}}>✅</div>
              <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم التسجيل</div>
            </div>:<>
              <Lbl c="العملة"/><Cur v={cur} set={setCur}/>
              {tab==="with"&&<div style={{fontSize:12,color:"#64748B",marginBottom:10,
                background:"#F8FAFC",borderRadius:8,padding:"8px 12px"}}>
                المتاح: {isDol?f$(bDol):fD(bDin)}</div>}
              <Lbl c={"المبلغ ("+(isDol?"دولار":"دينار")+")"}/>
              <Inp type="number" placeholder="٠" value={f.amount}
                onChange={e=>s("amount")(e.target.value)} autoFocus/>
              {amt>0&&tab==="with"&&amt>avail&&<div style={{fontSize:12,color:"#DC2626",
                fontWeight:600,marginBottom:10,padding:"7px 12px",background:"#FFF1F2",borderRadius:8}}>
                ⚠️ تجاوز الرصيد</div>}
              <Lbl c="التاريخ"/>
              <Inp type="date" value={f.date} onChange={e=>s("date")(e.target.value)}/>
              <Lbl c="ملاحظة / البيان"/>
              <Inp placeholder="..." value={f.note} onChange={e=>s("note")(e.target.value)}/>
              <button onClick={save} disabled={!amt||sv||(tab==="with"&&amt>avail)}
                style={{width:"100%",border:"none",borderRadius:12,padding:"13px",
                  fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                  background:(amt&&(tab==="dep"||amt<=avail))?(tab==="dep"?"#16A34A":"#DC2626"):"#E2E8F0",
                  color:(amt&&(tab==="dep"||amt<=avail))?"#fff":"#94A3B8"}}>
                {sv?"جاري...":(tab==="dep"?"↓ تأكيد الاستلام":"↑ تأكيد الصرف")}
              </button>
            </>}
          </div>
        )}
        {/* السجل */}
        {(!act||tab==="hist")&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>السجل ({txs.length})</div>
              {txs.length>0&&<button onClick={doPrint} style={{background:"#D97706",border:"none",
                borderRadius:9,padding:"8px 16px",color:"#fff",cursor:"pointer",
                fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>🖨️ طباعة الكشف</button>}
            </div>
            {txs.length===0&&<div style={{textAlign:"center",padding:24,color:"#94A3B8",
              background:"#fff",borderRadius:12,border:"1px solid #E2E8F0"}}>ما في حركات</div>}
            {allTxs.map(t=>{
              const isIn=t.type==="إيداع",isDolT=t.currency==="دولار";
              return<div key={t.id} style={{background:"#fff",borderRadius:11,padding:"12px 14px",
                marginBottom:8,border:"1px solid #E2E8F0",
                borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                        {isIn?"↓ استلام":"↑ صرف"}</span>
                      <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
                        background:isDolT?"#EFF6FF":"#F0FDF4",color:isDolT?"#2563EB":"#16A34A"}}>
                        {isDolT?"🇺🇸 دولار":"🇮🇶 دينار"}</span>
                    </div>
                    <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                    {t.note&&<div style={{fontSize:12,color:"#1E293B",marginTop:3}}>{t.note}</div>}
                  </div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:16,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                      {isIn?"+":"-"}{isDolT?f$(t.amount):fD(t.amount)}</div>
                    <Del go={()=>onDel(t,p,optimistic)}/>
                  </div>
                </div>
              </div>;
            })}
          </div>
        )}
        {/* نافذة الإغلاق */}
        {showC&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:440,
            maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #E2E8F0",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#7C3AED"}}>🏁 إغلاق وتوزيع الأرباح</div>
              <button onClick={()=>setShowC(false)} style={{background:"none",border:"none",
                fontSize:20,cursor:"pointer",color:"#64748B"}}>✕</button>
            </div>
            <div style={{padding:"20px"}}>
              <div style={{background:"#F8FAFC",borderRadius:12,padding:14,marginBottom:20,
                display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,textAlign:"center"}}>
                <div>
                  <div style={{fontSize:10,color:"#64748B",marginBottom:3}}>💰 ربح الدينار</div>
                  <div style={{fontSize:16,fontWeight:700,color:bDin>=0?"#D97706":"#DC2626"}}>
                    {bDin>=0?"+":"-"}{fD(Math.abs(bDin))}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:"#64748B",marginBottom:3}}>💰 ربح الدولار</div>
                  <div style={{fontSize:16,fontWeight:700,color:bDol>=0?"#2563EB":"#DC2626"}}>
                    {bDol>=0?"+":"-"}{f$(Math.abs(bDol))}</div>
                </div>
              </div>
              {/* النسب */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                <div style={{background:"#FFFBEB",borderRadius:14,padding:16,textAlign:"center",
                  border:"1px solid #D9770620"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#D97706",marginBottom:10}}>
                    🏗️ المقاولات
                  </div>
                  <input type="number" inputMode="numeric" min="0" max="100" value={pctCont}
                    onChange={e=>{const v=Math.min(100,Math.max(0,Number(e.target.value)||0));
                      setPctCont(v);setPctPart(100-v);}}
                    style={{width:"100%",border:"2px solid #D97706",borderRadius:10,padding:"10px",
                      fontSize:26,fontWeight:700,textAlign:"center",outline:"none",
                      fontFamily:"Tahoma",color:"#D97706",boxSizing:"border-box"}}/>
                  <div style={{fontSize:11,color:"#D97706",fontWeight:600,marginTop:8}}>
                    {fD(Math.round(bDin*pctCont/100))}
                    {bDol>0&&" | "+f$(Math.round(bDol*pctCont/100))}
                  </div>
                </div>
                <div style={{background:"#FAF5FF",borderRadius:14,padding:16,textAlign:"center",
                  border:"1px solid #9333EA20"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#9333EA",marginBottom:10}}>
                    👥 الشركاء
                  </div>
                  <input type="number" inputMode="numeric" min="0" max="100" value={pctPart}
                    onChange={e=>{const v=Math.min(100,Math.max(0,Number(e.target.value)||0));
                      setPctPart(v);setPctCont(100-v);}}
                    style={{width:"100%",border:"2px solid #9333EA",borderRadius:10,padding:"10px",
                      fontSize:26,fontWeight:700,textAlign:"center",outline:"none",
                      fontFamily:"Tahoma",color:"#9333EA",boxSizing:"border-box"}}/>
                  <div style={{fontSize:11,color:"#9333EA",fontWeight:600,marginTop:8}}>
                    {fD(Math.round(bDin*pctPart/100))}
                    {bDol>0&&" | "+f$(Math.round(bDol*pctPart/100))}
                  </div>
                </div>
              </div>
              {/* معاينة الشركاء */}
              {pctPart>0&&(bDin>0||bDol>0)&&<div style={{background:"#F8FAFC",borderRadius:10,
                padding:"10px 12px",marginBottom:16}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:8,fontWeight:600}}>
                  توزيع حصص الشركاء
                </div>
                {PARTNERS.map(pa=>(
                  <div key={pa.id} style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",padding:"4px 0",borderBottom:"1px solid #F1F5F9"}}>
                    <span style={{fontSize:12,color:"#1E293B"}}>{pa.name} ({pa.share}%)</span>
                    <span style={{fontSize:12,fontWeight:700,color:pa.color}}>
                      {fD(Math.round(bDin*pctPart/100*pa.share/100))}
                      {bDol>0&&" | "+f$(Math.round(bDol*pctPart/100*pa.share/100))}
                    </span>
                  </div>
                ))}
              </div>}
              <div style={{padding:"8px",borderRadius:8,textAlign:"center",marginBottom:16,
                background:total===100?"#F0FDF4":"#FFF1F2"}}>
                <span style={{fontSize:13,fontWeight:700,color:total===100?"#16A34A":"#DC2626"}}>
                  المجموع: {total}%</span>
              </div>
              <button onClick={doClose} disabled={closing||total!==100}
                style={{width:"100%",border:"none",borderRadius:12,padding:"14px",
                  fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                  background:total===100?"#7C3AED":"#E2E8F0",
                  color:total===100?"#fff":"#94A3B8"}}>
                {closing?"جاري التوزيع...":"🏁 تأكيد الإغلاق وتوزيع الأرباح"}
              </button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}

// ── صفحة الشركاء ──
function PartsPage({partners,bals,onBack,onSel}){
  const gb=id=>bals[id]||{din:0,dol:0};
  const mb=gb("partners");
  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"20px 14px"}}>
        <Back go={onBack}/>
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid #9333EA"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#1E293B",marginBottom:8}}>
            إجمالي صندوق الشركاء
          </div>
          <div style={{fontSize:22,fontWeight:700,color:"#9333EA"}}>{fD(mb.din)}</div>
          {mb.dol!==0&&<div style={{fontSize:16,fontWeight:700,color:"#2563EB"}}>{f$(mb.dol)}</div>}
          <div style={{fontSize:12,color:"#7C3AED",marginTop:8,padding:"6px 10px",
            background:"#FAF5FF",borderRadius:8}}>
            💡 الأرباح تأتي تلقائياً من إغلاق المشاريع
          </div>
        </div>
        {partners.map(p=>{
          const pb=gb("partner_"+p.id);
          return(
            <button key={p.id} onClick={()=>onSel(p)} style={{width:"100%",background:"#fff",
              border:"1px solid #E2E8F0",borderRight:"5px solid "+p.color,borderRadius:14,
              padding:18,marginBottom:12,cursor:"pointer",textAlign:"right",fontFamily:"Tahoma"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:42,height:42,borderRadius:12,background:p.light,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:20}}>👤</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                    <div style={{fontSize:12,color:"#64748B"}}>حصة {p.share}%</div>
                  </div>
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:18,fontWeight:700,
                    color:pb.din>=0?p.color:"#DC2626"}}>
                    {pb.din>=0?"":"-"}{fD(Math.abs(pb.din))}
                  </div>
                  {pb.dol!==0&&<div style={{fontSize:14,fontWeight:700,color:"#2563EB"}}>
                    {f$(pb.dol)}</div>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── صفحة شريك ──
function PartPage({partner,bals,txs,onBack,onWithdraw,onDel,onReset}){
  const p=partner;
  const pb=bals["partner_"+p.id]||{din:0,dol:0};
  const[f,setF]=useState({amount:"",note:"",date:td()});
  const[cur,setCur]=useState("دينار");
  const[sv,setSv]=useState(false);
  const[ok,setOk]=useState(false);
  const s=k=>v=>setF(x=>({...x,[k]:v}));
  const amt=Number(f.amount)||0;
  const avail=cur==="دولار"?pb.dol:pb.din;
  const deps=txs.filter(t=>t.type==="إيداع أرباح"||t.isDistribution);
  const withs=txs.filter(t=>t.type==="سحب");

  const doWith=async()=>{
    if(!amt||sv)return;
    setSv(true);
    const r=await onWithdraw(p.id,f.amount,cur,f.note,f.date);
    setSv(false);
    if(r){setOk(true);setTimeout(()=>{setOk(false);setF({amount:"",note:"",date:td()});},1500);}
  };

  const doPrint=()=>{
    const allT=[...txs].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const rows=allT.map(t=>{
      const isIn=t.type!=="سحب",isDolT=t.currency==="دولار";
      return"<tr>"
        +"<td>"+t.date+"</td>"
        +"<td style='color:"+(isIn?"#16A34A":"#DC2626")+"'>"+(isIn?"↓ إيداع":"↑ سحب")+"</td>"
        +"<td>"+(t.note||"—")+"</td>"
        +"<td style='font-weight:700;color:"+(isIn?"#16A34A":"#DC2626")+"'>"
          +(isIn?"+":"-")+(isDolT?f$(t.amount):fD(t.amount))+"</td>"
        +"</tr>";
    }).join("");
    const html="<!DOCTYPE html><html dir='rtl'><head><meta charset='utf-8'/>"
      +"<style>*{font-family:Tahoma}body{margin:28px;direction:rtl}"
      +"h2{color:#1E293B;margin:0}p{color:#64748B;font-size:12px;margin:2px 0}"
      +"h3{margin:12px 0 6px}table{width:100%;border-collapse:collapse;margin-top:12px}"
      +"th{background:#F1F5F9;padding:9px;text-align:center;font-size:12px}"
      +"td{padding:8px;border-bottom:1px solid #eee;text-align:center;font-size:12px}"
      +"</style></head><body>"
      +"<h2>"+CO.name+"</h2><p>"+CO.addr+"</p><hr style='margin:10px 0'/>"
      +"<h3 style='color:"+p.color+"'>كشف حساب — "+p.name+"</h3>"
      +"<p>الحصة: "+p.share+"%</p>"
      +"<p>الرصيد الحالي: <b style='color:"+p.color+"'>"+fD(pb.din)+"</b>"
        +(pb.dol?" | <b style='color:#2563EB'>"+f$(pb.dol)+"</b>":"")+"</p>"
      +"<table><thead><tr><th>التاريخ</th><th>النوع</th><th>ملاحظة</th><th>المبلغ</th></tr></thead>"
      +"<tbody>"+rows+"</tbody></table>"
      +"<p style='margin-top:18px;color:#94A3B8;font-size:10px'>طُبع: "+td()+"</p>"
      +"</body></html>";
    const w=window.open("","_blank","width=700,height=600");
    if(!w){alert("السماح بالنوافذ المنبثقة من إعدادات المتصفح");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),600);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"20px 14px"}}>
        <Back go={onBack} label="رجوع للشركاء"/>
        {/* بطاقة */}
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid "+p.color}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:48,height:48,borderRadius:13,background:p.light,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>👤</div>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                <div style={{fontSize:12,color:"#64748B"}}>حصة {p.share}%</div>
              </div>
            </div>
            <button onClick={doPrint} style={{background:p.color,border:"none",borderRadius:10,
              padding:"9px 16px",color:"#fff",cursor:"pointer",
              fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>🖨️ كشف الحساب</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↓ أرباح</div>
              <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>
                {fD(deps.reduce((s,t)=>s+(t.currency!=="دولار"?t.amount:0),0))}</div>
            </div>
            <div style={{background:"#FFF1F2",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>↑ مسحوب</div>
              <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>
                {fD(withs.reduce((s,t)=>s+(t.currency!=="دولار"?t.amount:0),0))}</div>
            </div>
            <div style={{background:p.light,borderRadius:10,padding:"10px",textAlign:"center",
              border:"1.5px solid "+p.color+"40"}}>
              <div style={{fontSize:9,color:"#64748B",marginBottom:2}}>💰 الرصيد</div>
              <div style={{fontSize:14,fontWeight:700,color:pb.din>=0?p.color:"#DC2626"}}>
                {fD(pb.din)}</div>
              {pb.dol!==0&&<div style={{fontSize:11,fontWeight:700,color:"#2563EB"}}>{f$(pb.dol)}</div>}
            </div>
          </div>
        </div>
        {/* سحب */}
        <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>↑ سحب</div>
          {ok?<div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{fontSize:36}}>✅</div>
            <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم السحب</div>
          </div>:<>
            <Lbl c="العملة"/><Cur v={cur} set={setCur}/>
            <div style={{fontSize:12,color:"#64748B",marginBottom:10,background:"#F8FAFC",
              borderRadius:8,padding:"7px 12px"}}>
              المتاح: {cur==="دولار"?f$(pb.dol):fD(pb.din)}
            </div>
            <Lbl c="المبلغ"/>
            <Inp type="number" placeholder="٠" value={f.amount}
              onChange={e=>s("amount")(e.target.value)} autoFocus/>
            {amt>0&&<div style={{fontSize:12,fontWeight:600,marginBottom:10,padding:"7px 12px",
              borderRadius:8,color:amt<=avail?p.color:"#DC2626",
              background:amt<=avail?p.light:"#FFF1F2"}}>
              {amt<=avail?"✅ الرصيد كافٍ":"⚠️ تجاوز الرصيد"}
            </div>}
            <Lbl c="التاريخ"/>
            <Inp type="date" value={f.date} onChange={e=>s("date")(e.target.value)}/>
            <Lbl c="ملاحظة"/>
            <Inp placeholder="..." value={f.note} onChange={e=>s("note")(e.target.value)}/>
            <button onClick={doWith} disabled={!amt||sv||amt>avail}
              style={{width:"100%",border:"none",borderRadius:12,padding:"13px",fontSize:15,
                fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                background:amt>0&&amt<=avail?p.color:"#E2E8F0",
                color:amt>0&&amt<=avail?"#fff":"#94A3B8"}}>
              {sv?"جاري السحب...":"↑ تأكيد السحب"}
            </button>
          </>}
        </div>
        {/* تصفية */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          background:"#fff",border:"1px solid #FEE2E2",borderRadius:12,
          padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>تصفية رصيد الشريك</div>
          <button onClick={onReset} style={{background:"#FFF1F2",border:"1px solid #FEE2E2",
            borderRadius:8,padding:"6px 14px",color:"#DC2626",cursor:"pointer",
            fontSize:12,fontFamily:"Tahoma",fontWeight:700}}>🔄 تصفية</button>
        </div>
        {/* الأرباح */}
        {deps.length>0&&(
          <>
            <div style={{fontSize:13,fontWeight:700,color:"#16A34A",marginBottom:8,
              display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:3,height:14,background:"#16A34A",borderRadius:2}}/>
              الأرباح ({deps.length})
            </div>
            {deps.map(t=>(
              <div key={t.id} style={{background:"#fff",borderRadius:11,padding:"11px 14px",
                marginBottom:7,border:"1px solid #DCFCE7",borderRight:"4px solid #16A34A"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#16A34A",marginBottom:2}}>↓ أرباح</div>
                    <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                    {t.note&&<div style={{fontSize:11,color:"#64748B",marginTop:1}}>{t.note}</div>}
                  </div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#16A34A"}}>
                      +{t.currency==="دولار"?f$(t.amount):fD(t.amount)}</div>
                    <Del go={()=>onDel(t)}/>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        {/* سحوبات */}
        {withs.length>0&&(
          <>
            <div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:8,marginTop:12,
              display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:3,height:14,background:"#DC2626",borderRadius:2}}/>
              السحوبات ({withs.length})
            </div>
            {withs.map(t=>(
              <div key={t.id} style={{background:"#fff",borderRadius:11,padding:"11px 14px",
                marginBottom:7,border:"1px solid #FEE2E2",borderRight:"4px solid #DC2626"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#DC2626",marginBottom:2}}>↑ سحب</div>
                    <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                    {t.note&&<div style={{fontSize:11,color:"#1E293B",marginTop:1}}>{t.note}</div>}
                  </div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#DC2626"}}>
                      -{t.currency==="دولار"?f$(t.amount):fD(t.amount)}</div>
                    <Del go={()=>onDel(t)}/>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
