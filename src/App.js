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

export default function App(){
  const[pg,setPg]=useState("home");
  const[proj,setProj]=useState(null);
  const[bals,setBals]=useState({});
  const[projs,setProjs]=useState([]);
  const[pTxs,setPTxs]=useState([]);
  const[emps,setEmps]=useState([]);
  const[load,setLoad]=useState(true);

  useEffect(()=>{
    if(!document.querySelector("#ti")){const l=document.createElement("link");
      l.id="ti";l.rel="stylesheet";
      l.href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);}
  },[]);

  useEffect(()=>{
    const t=setTimeout(()=>setLoad(false),1500);
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

  useEffect(()=>{
    if(!proj)return;
    const u=projs.find(p=>p.id===proj.id);
    if(u)setProj(u);
  },[projs]);

  const gb=id=>bals[id]||{din:0,dol:0};

  const addProj=async d=>{
    const r=await addDoc(collection(db,"fund_projects"),{
      name:d.name.trim(),province:d.prov||"",client:d.client||"",
      totalDin:Number(d.tDin)||0,totalDol:Number(d.tDol)||0,
      status:"نشط",recDin:0,recDol:0,spdDin:0,spdDol:0,
      createdAt:new Date().toISOString()});
    await setDoc(doc(db,"fund_balances","proj_"+r.id),{din:0,dol:0});
  };

  const addProjTx=async(pr,type,cur,amt,note,date)=>{
    const a=Math.round(Number(amt));if(!a)return;
    const isDol=cur==="دولار",isRec=type==="إيداع";
    const k=isDol?(isRec?"recDol":"spdDol"):(isRec?"recDin":"spdDin");
    await setDoc(doc(db,"fund_projects",pr.id),{[k]:(pr[k]||0)+a},{merge:true});
    await addDoc(collection(db,"fund_projects_txs"),{
      projectId:pr.id,projectName:pr.name,type,currency:cur,
      amount:a,note:note||"",date:date||td(),createdAt:new Date().toISOString()});
  };

  const delProjTx=async(t,pr)=>{
    if(!ask("حذف الحركة"))return;
    const isDol=t.currency==="دولار",isRec=t.type==="إيداع";
    const k=isDol?(isRec?"recDol":"spdDol"):(isRec?"recDin":"spdDin");
    await setDoc(doc(db,"fund_projects",pr.id),{[k]:Math.max(0,(pr[k]||0)-t.amount)},{merge:true});
    await deleteDoc(doc(db,"fund_projects_txs",t.id));
  };

  const delProj=async id=>{
    if(!ask("حذف المشروع"))return;
    await deleteDoc(doc(db,"fund_projects",id));
    await deleteDoc(doc(db,"fund_balances","proj_"+id));
  };

  const closeProj=async(pr,pct)=>{
    const bDin=(pr.recDin||0)-(pr.spdDin||0);
    const bDol=(pr.recDol||0)-(pr.spdDol||0);
    const dist=async(profit,isDolCur)=>{
      if(profit<=0)return;
      const share=Math.round(profit*pct/100);if(!share)return;
      const cb=gb("contracting");
      await setDoc(doc(db,"fund_balances","contracting"),
        {din:isDolCur?cb.din:cb.din+share,dol:isDolCur?cb.dol+share:cb.dol},{merge:true});
      await addDoc(collection(db,"fund_projects_txs"),{
        projectId:pr.id,projectName:pr.name,
        type:"إيداع أرباح",currency:isDolCur?"دولار":"دينار",amount:share,
        note:pct+"% أرباح مغلقة — "+pr.name,date:td(),isProfit:true,
        createdAt:new Date().toISOString()});
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

  const resetAll=async()=>{
    const pw=window.prompt("⚠️ تصفية شاملة\nالباسورد:");
    if(!pw||pw!==PASS){if(pw!==null)alert("❌ باسورد غلط");return;}
    const bs=await getDocs(collection(db,"fund_balances"));
    for(const d of bs.docs)await setDoc(doc(db,"fund_balances",d.id),{din:0,dol:0});
    for(const col of["fund_projects","fund_projects_txs","employees"]){
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
    onAdd={addProjTx}
    onDel={t=>delProjTx(t,proj)}
    onClose={closeProj}
    onDelProj={id=>{delProj(id);setPg("cont");setProj(null);}}/>;

  if(pg==="cont")return<ContPage projs={projs} emps={emps} bals={bals}
    onBack={()=>setPg("home")}
    onSel={p=>{setProj(p);setPg("proj");}}
    onAdd={addProj} onDel={delProj}
    onAddEmp={addEmp} onDelEmp={delEmp}/>;

  // Home
  const cb=gb("contracting");
  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:460,margin:"0 auto",padding:"32px 16px"}}>
        <div style={{background:"#fff",borderRadius:16,padding:"18px 20px",marginBottom:24,
          border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:19,fontWeight:700,color:"#1E293B"}}>{CO.name}</div>
          <div style={{fontSize:12,color:"#64748B",marginTop:3}}>{CO.addr}</div>
        </div>
        <button onClick={()=>setPg("cont")} style={{width:"100%",background:"#fff",
          border:"1px solid #E2E8F0",borderTop:"4px solid #D97706",borderRadius:16,
          padding:22,cursor:"pointer",textAlign:"right",fontFamily:"Tahoma",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
            <div style={{width:48,height:48,borderRadius:13,background:"#FFFBEB",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🏗️</div>
            <div style={{fontSize:17,fontWeight:700,color:"#1E293B"}}>صندوق المقاولات</div>
          </div>
          <div style={{fontSize:12,color:"#64748B",marginBottom:cb.din||cb.dol?8:0}}>
            {projs.filter(p=>p.status==="نشط").length} مشروع نشط · {emps.length} موظف
          </div>
          <div style={{background:"#FFFBEB",borderRadius:10,padding:"10px 14px",
            marginTop:10,border:"1px solid #D9770620"}}>
            <div style={{fontSize:10,color:"#D97706",fontWeight:600,marginBottom:8}}>
              💎 رصيد الصندوق</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:3}}>🇮🇶 دينار</div>
                <div style={{fontSize:16,fontWeight:700,color:"#D97706"}}>{fD(cb.din)}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:3}}>🇺🇸 دولار</div>
                <div style={{fontSize:16,fontWeight:700,color:"#2563EB"}}>{f$(cb.dol)}</div>
              </div>
            </div>
          </div>
        </button>
        <button onClick={resetAll} style={{width:"100%",background:"#FFF1F2",
          border:"1px solid #FEE2E2",borderRadius:12,padding:14,cursor:"pointer",
          color:"#DC2626",fontFamily:"Tahoma",fontSize:14,fontWeight:700}}>
          ⚠️ تصفية شاملة
        </button>
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
  const[pct,setPct]=useState(100);
  const s=k=>v=>setF(x=>({...x,[k]:v}));
  const amt=Number(f.amount)||0;
  const isDol=cur==="دولار";
  const bDin=(p.recDin||0)-(p.spdDin||0);
  const bDol=(p.recDol||0)-(p.spdDol||0);
  const avail=isDol?bDol:bDin;
  const act=p.status==="نشط";
  const allTxs=[...txs].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  useEffect(()=>setP(proj),[proj]);

  const save=async()=>{
    if(!amt||sv)return;
    if(tab==="with"&&amt>avail){alert("الرصيد غير كافٍ");return;}
    setSv(true);
    await onAdd(p,tab==="dep"?"إيداع":"سحب",cur,f.amount,f.note,f.date);
    setSv(false);setOk(true);
    setTimeout(()=>{setOk(false);setF({amount:"",note:"",date:td()});},1400);
  };

  const doClose=async()=>{
    if(pct<0||pct>100){alert("النسبة يجب أن تكون بين 0 و 100");return;}
    setClosing(true);
    await onClose(p,pct);
    setClosing(false);setShowC(false);
  };

  const doPrint=()=>{
    const rows=allTxs.map(t=>{
      const isIn=t.type==="إيداع",isDolT=t.currency==="دولار";
      return"<tr>"
        +"<td>"+t.date+"</td>"
        +"<td style='color:"+(isDolT?"#2563EB":"#059669")+"'>"+(isDolT?"دولار":"دينار")+"</td>"
        +"<td style='color:"+(isIn?"#16A34A":"#DC2626")+"'>"+(isIn?"↓ استلام":"↑ صرف")+"</td>"
        +"<td>"+(t.note||"—")+"</td>"
        +"<td style='font-weight:700;color:"+(isIn?"#16A34A":"#DC2626")+"'>"
          +(isIn?"+":"-")+(isDolT?f$(t.amount):fD(t.amount))+"</td>"
        +"</tr>";
    }).join("");
    const html="<!DOCTYPE html><html dir='rtl'><head><meta charset='utf-8'/>"
      +"<style>*{font-family:Tahoma}body{margin:28px;direction:rtl}"
      +"h2{margin:0;color:#1E293B}p{color:#64748B;font-size:12px;margin:2px 0}"
      +"h3{color:#D97706;margin:12px 0 6px}"
      +"table{width:100%;border-collapse:collapse;margin-top:12px}"
      +"th{background:#F1F5F9;padding:9px;text-align:center;font-size:12px}"
      +"td{padding:8px;border-bottom:1px solid #eee;text-align:center;font-size:12px}"
      +".row{display:flex;gap:14px;margin:10px 0;flex-wrap:wrap}"
      +".box{background:#F8FAFC;border-radius:8px;padding:9px 13px;text-align:center}"
      +".bl{font-size:10px;color:#64748B;margin-bottom:3px}"
      +".bv{font-size:14px;font-weight:700}"
      +"</style></head><body>"
      +"<h2>"+CO.name+"</h2><p>"+CO.addr+"</p>"
      +"<hr style='margin:10px 0'/>"
      +"<h3>📋 كشف حساب — "+p.name+"</h3>"
      +(p.province?"<p>📍 "+p.province+"</p>":"")
      +(p.client?"<p>👤 العميل: "+p.client+"</p>":"")
      +(p.totalDin||p.totalDol?"<p>💰 قيمة المشروع: "
        +(p.totalDin?fD(p.totalDin):"")
        +(p.totalDol?" | "+f$(p.totalDol):"")+"</p>":"")
      +"<p>الحالة: "+(p.status==="نشط"?"● نشط":"✓ منتهي")+"</p>"
      +"<div class='row'>"
      +"<div class='box'><div class='bl'>↓ استلام د.ع</div>"
        +"<div class='bv' style='color:#16A34A'>"+fD(p.recDin||0)+"</div></div>"
      +"<div class='box'><div class='bl'>↑ صرف د.ع</div>"
        +"<div class='bv' style='color:#DC2626'>"+fD(p.spdDin||0)+"</div></div>"
      +"<div class='box'><div class='bl'>💰 ربح د.ع</div>"
        +"<div class='bv' style='color:#D97706'>"+fD(bDin)+"</div></div>"
      +((p.recDol||0)+(p.spdDol||0)>0
        ?"<div class='box'><div class='bl'>↓ استلام $</div>"
          +"<div class='bv' style='color:#2563EB'>"+f$(p.recDol||0)+"</div></div>"
          +"<div class='box'><div class='bl'>↑ صرف $</div>"
          +"<div class='bv' style='color:#DC2626'>"+f$(p.spdDol||0)+"</div></div>"
          +"<div class='box'><div class='bl'>💰 ربح $</div>"
          +"<div class='bv' style='color:#2563EB'>"+f$(bDol)+"</div></div>":"")
      +"</div>"
      +"<table><thead><tr>"
        +"<th>التاريخ</th><th>العملة</th><th>النوع</th><th>ملاحظة</th><th>المبلغ</th>"
        +"</tr></thead><tbody>"+rows+"</tbody></table>"
      +"<p style='margin-top:18px;color:#94A3B8;font-size:10px'>طُبع: "+td()+"</p>"
      +"</body></html>";
    const w=window.open("","_blank","width=820,height=650");
    if(!w){alert("السماح بالنوافذ المنبثقة من إعدادات المتصفح");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),600);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <Back go={onBack} label="رجوع"/>
          {!act&&(
            <button onClick={()=>{if(ask("حذف المشروع"))onDelProj(p.id);}}
              style={{background:"transparent",border:"1px solid #FEE2E2",borderRadius:10,
                padding:"8px 14px",color:"#DC2626",cursor:"pointer",
                fontSize:12,fontFamily:"Tahoma",fontWeight:600}}>
              🗑️ حذف المشروع
            </button>
          )}
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
                {act?"● نشط":"✓ منتهي"}
              </span>
            </div>
            {act&&(
              <button onClick={()=>setShowC(true)} style={{background:"#7C3AED",border:"none",
                borderRadius:10,padding:"9px 16px",color:"#fff",cursor:"pointer",
                fontSize:13,fontFamily:"Tahoma",fontWeight:700}}>
                🏁 إغلاق
              </button>
            )}
          </div>
          {/* الدينار */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:"#16A34A",marginBottom:6}}>🇮🇶 الدينار</div>
            {p.totalDin>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:5}}>
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
          <div style={{borderTop:"1px solid #E2E8F0",paddingTop:10}}>
            <div style={{fontSize:10,fontWeight:700,color:"#2563EB",marginBottom:6}}>🇺🇸 الدولار</div>
            {p.totalDol>0&&<div style={{fontSize:11,color:"#64748B",marginBottom:5}}>
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
        </div>

        {/* تبويبات */}
        {act&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
            {[["dep","↓ استلام","#16A34A"],["with","↑ صرف","#DC2626"],["hist","📋 السجل","#1E293B"]].map(([id,l,c])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{border:tab===id?"none":"1px solid #E2E8F0",borderRadius:10,
                  padding:"11px",cursor:"pointer",fontWeight:700,fontSize:13,
                  fontFamily:"Tahoma",background:tab===id?c:"#fff",
                  color:tab===id?"#fff":"#64748B"}}>{l}</button>
            ))}
          </div>
        )}

        {/* نموذج الإدخال */}
        {act&&(tab==="dep"||tab==="with")&&(
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,
            padding:18,marginBottom:14}}>
            {ok?(
              <div style={{textAlign:"center",padding:"14px 0"}}>
                <div style={{fontSize:36}}>✅</div>
                <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم التسجيل</div>
              </div>
            ):(
              <>
                <Lbl c="العملة"/>
                <Cur v={cur} set={setCur}/>
                {tab==="with"&&(
                  <div style={{fontSize:12,color:"#64748B",marginBottom:10,
                    background:"#F8FAFC",borderRadius:8,padding:"8px 12px"}}>
                    المتاح: {isDol?f$(bDol):fD(bDin)}
                  </div>
                )}
                <Lbl c={"المبلغ ("+(isDol?"دولار":"دينار")+")"}/>
                <Inp type="number" placeholder="٠" value={f.amount}
                  onChange={e=>s("amount")(e.target.value)} autoFocus/>
                {amt>0&&tab==="with"&&amt>avail&&(
                  <div style={{fontSize:12,color:"#DC2626",fontWeight:600,marginBottom:10,
                    padding:"7px 12px",background:"#FFF1F2",borderRadius:8}}>
                    ⚠️ تجاوز الرصيد المتاح
                  </div>
                )}
                <Lbl c="التاريخ"/>
                <Inp type="date" value={f.date} onChange={e=>s("date")(e.target.value)}/>
                <Lbl c="ملاحظة"/>
                <Inp placeholder="..." value={f.note} onChange={e=>s("note")(e.target.value)}/>
                <button onClick={save}
                  disabled={!amt||sv||(tab==="with"&&amt>avail)}
                  style={{width:"100%",border:"none",borderRadius:12,padding:"13px",
                    fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                    background:(amt&&(tab==="dep"||amt<=avail))
                      ?(tab==="dep"?"#16A34A":"#DC2626"):"#E2E8F0",
                    color:(amt&&(tab==="dep"||amt<=avail))?"#fff":"#94A3B8"}}>
                  {sv?"جاري...":(tab==="dep"?"↓ تأكيد الاستلام":"↑ تأكيد الصرف")}
                </button>
              </>
            )}
          </div>
        )}

        {/* السجل */}
        {(!act||tab==="hist")&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>
                السجل ({txs.length})
              </div>
              {txs.length>0&&(
                <button onClick={doPrint} style={{background:"#D97706",border:"none",
                  borderRadius:9,padding:"8px 16px",color:"#fff",cursor:"pointer",
                  fontSize:13,fontFamily:"Tahoma",fontWeight:600}}>
                  🖨️ طباعة الكشف
                </button>
              )}
            </div>
            {txs.length===0&&(
              <div style={{textAlign:"center",padding:24,color:"#94A3B8",
                background:"#fff",borderRadius:12,border:"1px solid #E2E8F0"}}>
                ما في حركات مسجلة
              </div>
            )}
            {allTxs.map(t=>{
              const isIn=t.type==="إيداع",isDolT=t.currency==="دولار";
              return(
                <div key={t.id} style={{background:"#fff",borderRadius:11,padding:"12px 14px",
                  marginBottom:8,border:"1px solid #E2E8F0",
                  borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                          {isIn?"↓ استلام":"↑ صرف"}
                        </span>
                        <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
                          background:isDolT?"#EFF6FF":"#F0FDF4",
                          color:isDolT?"#2563EB":"#16A34A"}}>
                          {isDolT?"🇺🇸 دولار":"🇮🇶 دينار"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                      {t.note&&<div style={{fontSize:12,color:"#1E293B",marginTop:3}}>{t.note}</div>}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:16,fontWeight:700,color:isIn?"#16A34A":"#DC2626"}}>
                        {isIn?"+":"-"}{isDolT?f$(t.amount):fD(t.amount)}
                      </div>
                      <Del go={()=>onDel(t)}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* نافذة الإغلاق */}
        {showC&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:999,
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:420,
              boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#7C3AED"}}>🏁 إغلاق المشروع</div>
                <button onClick={()=>setShowC(false)} style={{background:"none",border:"none",
                  fontSize:20,cursor:"pointer",color:"#64748B"}}>✕</button>
              </div>
              <div style={{padding:"20px"}}>
                {/* الربح */}
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
                {/* النسبة */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:12,textAlign:"center"}}>
                    كم % يروح لصندوق المقاولات؟
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
                    <input type="number" inputMode="numeric" min="0" max="100" value={pct}
                      onChange={e=>setPct(Math.min(100,Math.max(0,Number(e.target.value)||0)))}
                      style={{width:110,border:"3px solid #D97706",borderRadius:12,padding:"12px",
                        fontSize:28,fontWeight:700,textAlign:"center",outline:"none",
                        fontFamily:"Tahoma",color:"#D97706"}}/>
                    <div style={{fontSize:24,fontWeight:700,color:"#64748B"}}>%</div>
                  </div>
                  {/* معاينة */}
                  <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div style={{background:"#FFFBEB",borderRadius:12,padding:14,textAlign:"center",
                      border:"1px solid #D9770620"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#D97706",marginBottom:6}}>
                        🏗️ صندوق المقاولات ({pct}%)
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:"#D97706"}}>
                        {fD(Math.round(bDin*pct/100))}
                      </div>
                      {bDol>0&&<div style={{fontSize:11,fontWeight:700,color:"#2563EB"}}>
                        {f$(Math.round(bDol*pct/100))}</div>}
                    </div>
                    <div style={{background:"#F8FAFC",borderRadius:12,padding:14,textAlign:"center",
                      border:"1px solid #E2E8F0"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#64748B",marginBottom:6}}>
                        💼 يبقى في المشروع ({100-pct}%)
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:"#64748B"}}>
                        {fD(Math.round(bDin*(100-pct)/100))}
                      </div>
                      {bDol>0&&<div style={{fontSize:11,fontWeight:700,color:"#64748B"}}>
                        {f$(Math.round(bDol*(100-pct)/100))}</div>}
                    </div>
                  </div>
                </div>
                <button onClick={doClose} disabled={closing}
                  style={{width:"100%",border:"none",borderRadius:12,padding:"14px",
                    fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                    background:"#7C3AED",color:"#fff"}}>
                  {closing?"جاري التوزيع...":"🏁 تأكيد الإغلاق"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
