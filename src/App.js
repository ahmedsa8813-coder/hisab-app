import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
         onSnapshot, query, orderBy } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
});
const db = getFirestore(app);

// ══════════════════════════════════════════
// الصناديق الثمانية
// ══════════════════════════════════════════
const FUNDS = [
  { id:"capital",     name:"صندوق رأس المال",     icon:"ti-safe",          color:"#1C1410" },
  { id:"general",     name:"الصندوق العام",        icon:"ti-building-bank", color:"#1E40AF" },
  { id:"decor",       name:"صندوق الديكور",        icon:"ti-palette",       color:"#6B21A8" },
  { id:"contracting", name:"صندوق المقاولات",      icon:"ti-building",      color:"#92400E" },
  { id:"facades",     name:"صندوق الواجهات",       icon:"ti-layers",        color:"#0f766e" },
  { id:"engineering", name:"صندوق أعمال هندسية",  icon:"ti-ruler-2",       color:"#1d4ed8" },
  { id:"trade",       name:"صندوق التجارة",         icon:"ti-briefcase",     color:"#166534" },
  { id:"partners",    name:"صندوق أرباح الشركاء", icon:"ti-users",         color:"#991B1B" },
];

// ══════════════════════════════════════════
// الشركاء الأربعة وحصصهم
// ══════════════════════════════════════════
const PARTNERS = [
  { id:"ihab",    name:"إيهاب زيتوني",  share:30, color:"#1E40AF", icon:"ti-user" },
  { id:"nour",    name:"نور إدوارد",    share:30, color:"#166534", icon:"ti-user" },
  { id:"mohammed",name:"محمد سالم",     share:30, color:"#6B21A8", icon:"ti-user" },
  { id:"ahmed",   name:"أحمد سالم",     share:10, color:"#92400E", icon:"ti-user" },
];

// ══════════════════════════════════════════
// مساعدات
// ══════════════════════════════════════════
const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmtD  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + " د.ع";
const today = () => new Date().toISOString().split("T")[0];

const Lbl = ({children}) => (
  <div style={{fontSize:11,color:"#8A7060",marginBottom:5,fontWeight:600}}>{children}</div>
);
const Inp = ({style,...props}) => (
  <input style={{width:"100%",border:"1px solid #E5DDD4",borderRadius:10,padding:"11px 14px",
    fontSize:15,background:"#F4F2EE",color:"#1C1410",outline:"none",
    boxSizing:"border-box",fontFamily:"Tahoma",direction:"rtl",...style}} {...props}/>
);

// ══════════════════════════════════════════
// App
// ══════════════════════════════════════════
export default function App() {
  const [page,     setPage]     = useState("home");  // home | fund | partners
  const [selFund,  setSelFund]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [balances, setBalances] = useState({});
  const [txs,      setTxs]      = useState([]);

  useEffect(() => {
    if(!document.querySelector("#ti")) {
      const l=document.createElement("link");l.id="ti";l.rel="stylesheet";
      l.href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    const u=[], to=setTimeout(()=>setLoading(false),6000);
    u.push(onSnapshot(collection(db,"fund_balances"), s=>{
      const b={};
      s.docs.forEach(d=>{b[d.id]=d.data().balance||0;});
      setBalances(b); setLoading(false);
    }, ()=>setLoading(false)));
    u.push(onSnapshot(query(collection(db,"fund_transactions"),orderBy("date","desc")),
      s=>setTxs(s.docs.map(d=>({id:d.id,...d.data()}))),
    ));
    return ()=>{u.forEach(f=>f());clearTimeout(to);};
  }, []);

  // إيداع/سحب لصندوق عادي
  const addTx = async (fundId, type, amount, note, date) => {
    const amt = Math.round(Number(amount));
    if(!amt||amt<=0) return;
    const cur     = balances[fundId]||0;
    const newBal  = type==="إيداع" ? cur+amt : cur-amt;
    await setDoc(doc(db,"fund_balances",fundId),{balance:newBal},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId, fundName:FUNDS.find(f=>f.id===fundId)?.name||"",
      type, amount:amt, note:note||"", date:date||today(),
      balanceAfter:newBal, createdAt:new Date().toISOString(),
    });
  };

  // إيداع لصندوق الشركاء → يوزع تلقائياً
  const depositToPartners = async (totalAmt, note, date) => {
    const amt = Math.round(Number(totalAmt));
    if(!amt||amt<=0) return;
    // أولاً: أضف للصندوق الرئيسي
    const mainCur  = balances["partners"]||0;
    const mainNew  = mainCur + amt;
    await setDoc(doc(db,"fund_balances","partners"),{balance:mainNew},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId:"partners", fundName:"صندوق أرباح الشركاء",
      type:"إيداع", amount:amt, note:note||"", date:date||today(),
      balanceAfter:mainNew, createdAt:new Date().toISOString(),
    });
    // ثانياً: وزّع على الصناديق الأربعة تلقائياً
    for(const p of PARTNERS) {
      const share   = Math.round(amt * p.share / 100);
      const pId     = "partner_"+p.id;
      const pCur    = balances[pId]||0;
      const pNew    = pCur + share;
      await setDoc(doc(db,"fund_balances",pId),{balance:pNew},{merge:true});
      await addDoc(collection(db,"fund_transactions"),{
        fundId:pId, fundName:p.name,
        type:"إيداع", amount:share,
        note:"توزيع حصة "+p.share+"% — "+(note||""),
        date:date||today(), balanceAfter:pNew,
        createdAt:new Date().toISOString(),
        isDistribution:true, parentAmount:amt,
      });
    }
  };

  // سحب شريك من صندوقه
  const withdrawPartner = async (partnerId, amount, note, date) => {
    const amt   = Math.round(Number(amount));
    const pId   = "partner_"+partnerId;
    const avail = balances[pId]||0;
    if(amt > avail) { alert("لا يمكن السحب — الرصيد غير كافٍ\nالمتاح: "+fmtD(avail)); return false; }
    const pNew  = avail - amt;
    await setDoc(doc(db,"fund_balances",pId),{balance:pNew},{merge:true});
    await addDoc(collection(db,"fund_transactions"),{
      fundId:pId, fundName:PARTNERS.find(p=>p.id===partnerId)?.name||"",
      type:"سحب", amount:amt, note:note||"", date:date||today(),
      balanceAfter:pNew, createdAt:new Date().toISOString(),
    });
    // اخصم من صندوق الشركاء الرئيسي
    const mainCur = balances["partners"]||0;
    await setDoc(doc(db,"fund_balances","partners"),{balance:mainCur-amt},{merge:true});
    return true;
  };

  const deleteTx = async tx => {
    if(!window.confirm("تحذف هذه المعاملة؟")) return;
    const cur    = balances[tx.fundId]||0;
    const newBal = tx.type==="إيداع" ? cur-tx.amount : cur+tx.amount;
    await setDoc(doc(db,"fund_balances",tx.fundId),{balance:newBal},{merge:true});
    await deleteDoc(doc(db,"fund_transactions",tx.id));
  };

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#F4F2EE",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:12,fontFamily:"Tahoma"}}>
      <div style={{fontSize:52}}>🏦</div>
      <div style={{fontSize:22,fontWeight:700,color:"#1C1410"}}>الصناديق</div>
      <div style={{fontSize:13,color:"#8A7060"}}>جاري التحميل...</div>
    </div>
  );

  if(page==="partners")
    return <PartnersPage
      partners={PARTNERS} balances={balances} txs={txs}
      onBack={()=>setPage("home")}
      onDeposit={depositToPartners}
      onWithdraw={withdrawPartner}
      onDelete={deleteTx}
    />;

  if(page==="fund" && selFund)
    return <FundDetail
      fund={FUNDS.find(f=>f.id===selFund)}
      balance={balances[selFund]||0}
      txs={txs.filter(t=>t.fundId===selFund)}
      onBack={()=>{setPage("home");setSelFund(null);}}
      onAdd={(type,amt,note,date)=>addTx(selFund,type,amt,note,date)}
      onDelete={deleteTx}
    />;

  return <FundsList funds={FUNDS} balances={balances}
    onSelect={id=>{if(id==="partners"){setPage("partners");}else{setSelFund(id);setPage("fund");}}}
  />;
}

// ══════════════════════════════════════════
// قائمة الصناديق
// ══════════════════════════════════════════
function FundsList({funds, balances, onSelect}) {
  const total = funds.reduce((s,f)=>s+(balances[f.id]||0),0);
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:24,fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:26,fontWeight:700,color:"#1C1410",marginBottom:4}}>الصناديق المالية</div>
        <div style={{fontSize:13,color:"#8A7060"}}>
          إجمالي الأرصدة: <span style={{fontWeight:700,color:"#1C1410"}}>{fmtD(total)}</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {funds.map(f=>{
          const bal=balances[f.id]||0, isPos=bal>=0;
          return (
            <button key={f.id} onClick={()=>onSelect(f.id)} style={{
              background:"#fff",border:"1px solid #E5DDD4",borderRadius:16,
              padding:"20px 18px",cursor:"pointer",textAlign:"right",
              display:"flex",flexDirection:"column",gap:12,
              boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
              borderTop:`3px solid ${f.color}`,fontFamily:"Tahoma",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:11,background:f.color+"15",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i className={`ti ${f.icon}`} style={{fontSize:20,color:f.color}} aria-hidden="true"/>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#1C1410",lineHeight:1.3}}>{f.name}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:"#8A7060",marginBottom:3}}>الرصيد الحالي</div>
                <div style={{fontSize:22,fontWeight:700,color:isPos?"#166534":"#991B1B",letterSpacing:-0.5}}>
                  {isPos?"":"-"}{fmtD(bal)}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                  color:isPos?"#166534":"#991B1B",
                  background:isPos?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)"}}>
                  {isPos?"موجب":"سالب"}
                </span>
                {f.id==="partners"&&(
                  <span style={{fontSize:10,color:"#1E40AF",fontWeight:600,
                    background:"rgba(30,64,175,0.08)",padding:"3px 8px",borderRadius:20}}>
                    4 شركاء ← توزيع تلقائي
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// صفحة أرباح الشركاء
// ══════════════════════════════════════════
function PartnersPage({partners, balances, txs, onBack, onDeposit, onWithdraw, onDelete}) {
  const [tab,    setTab]    = useState("overview");   // overview | deposit | withdraw
  const [selP,   setSelP]   = useState(partners[0].id);
  const [form,   setForm]   = useState({amount:"",note:"",date:today()});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [err,    setErr]    = useState("");

  const set = k => v => setForm(f=>({...f,[k]:v}));
  const totalMain = balances["partners"]||0;

  const handleDeposit = async () => {
    if(!form.amount||Number(form.amount)<=0) return;
    setSaving(true);
    await onDeposit(form.amount, form.note, form.date);
    setSaving(false);
    setDone(true);
    setTimeout(()=>{setDone(false);setForm({amount:"",note:"",date:today()});},1600);
  };

  const handleWithdraw = async () => {
    if(!form.amount||Number(form.amount)<=0) return;
    setSaving(true); setErr("");
    const ok = await onWithdraw(selP, form.amount, form.note, form.date);
    setSaving(false);
    if(ok){setDone(true);setTimeout(()=>{setDone(false);setForm({amount:"",note:"",date:today()});},1600);}
  };

  return (
    <div style={{maxWidth:660,margin:"0 auto",padding:24,fontFamily:"Tahoma",direction:"rtl"}}>
      {/* رجوع */}
      <button onClick={onBack} style={{background:"transparent",border:"1px solid #E5DDD4",
        borderRadius:10,padding:"8px 16px",fontSize:13,color:"#8A7060",cursor:"pointer",
        marginBottom:20,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
        <i className="ti ti-arrow-right" aria-hidden="true"/> رجوع للصناديق
      </button>

      {/* Header */}
      <div style={{background:"#1C1410",borderRadius:20,padding:22,marginBottom:16,color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:46,height:46,borderRadius:13,background:"rgba(153,27,27,0.3)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="ti ti-users" style={{fontSize:22,color:"#fca5a5"}} aria-hidden="true"/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:700}}>صندوق أرباح الشركاء</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>إجمالي الصندوق الرئيسي</div>
          </div>
        </div>
        <div style={{fontSize:32,fontWeight:700,color:totalMain>=0?"#4ade80":"#f87171",
          marginBottom:16,letterSpacing:-1}}>
          {fmtD(totalMain)}
        </div>
        {/* حصص الشركاء */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {partners.map(p=>{
            const pBal=balances["partner_"+p.id]||0;
            return (
              <div key={p.id} style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:3}}>
                  {p.name} ({toAr(p.share)}%)
                </div>
                <div style={{fontSize:15,fontWeight:700,color:pBal>=0?"#4ade80":"#f87171"}}>
                  {fmtD(pBal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* تبويبات */}
      <div style={{display:"flex",background:"#fff",borderRadius:12,padding:4,gap:4,
        marginBottom:16,border:"1px solid #E5DDD4"}}>
        {[["overview","📊 نظرة عامة"],["deposit","↓ إيداع وتوزيع"],["withdraw","↑ سحب شريك"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{
            flex:1,border:"none",borderRadius:9,padding:"10px 6px",cursor:"pointer",
            fontWeight:700,fontSize:13,fontFamily:"Tahoma",
            background:tab===v?"#1C1410":"transparent",
            color:tab===v?"#fff":"#8A7060",
          }}>{l}</button>
        ))}
      </div>

      {/* نظرة عامة */}
      {tab==="overview"&&(
        <>
          {partners.map(p=>{
            const pId  = "partner_"+p.id;
            const pBal = balances[pId]||0;
            const pTxs = txs.filter(t=>t.fundId===pId&&!t.isDistribution);
            const totIn  = txs.filter(t=>t.fundId===pId&&t.type==="إيداع").reduce((s,t)=>s+t.amount,0);
            const totOut = txs.filter(t=>t.fundId===pId&&t.type==="سحب").reduce((s,t)=>s+t.amount,0);
            return (
              <div key={p.id} style={{background:"#fff",border:`1px solid ${p.color}30`,
                borderRadius:16,padding:18,marginBottom:12,borderRight:`4px solid ${p.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:38,height:38,borderRadius:11,background:p.color+"15",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <i className={`ti ${p.icon}`} style={{fontSize:18,color:p.color}} aria-hidden="true"/>
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:"#1C1410"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"#8A7060"}}>حصة {toAr(p.share)}%</div>
                    </div>
                  </div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:20,fontWeight:700,color:pBal>=0?"#166534":"#991B1B"}}>
                      {fmtD(pBal)}
                    </div>
                    <div style={{fontSize:10,color:"#8A7060",marginTop:2}}>
                      {pBal>=0?"متاح للسحب":"رصيد سالب"}
                    </div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"rgba(22,101,52,0.06)",borderRadius:10,padding:"8px 12px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#8A7060"}}>↓ استلم</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#166534"}}>{fmtD(totIn)}</div>
                  </div>
                  <div style={{background:"rgba(153,27,27,0.06)",borderRadius:10,padding:"8px 12px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#8A7060"}}>↑ سحب</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#991B1B"}}>{fmtD(totOut)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* إيداع وتوزيع */}
      {tab==="deposit"&&(
        <div style={{background:"#fff",border:"1px solid #E5DDD4",borderRadius:16,padding:18}}>
          <div style={{fontSize:13,color:"#8A7060",marginBottom:14,
            background:"rgba(22,101,52,0.06)",borderRadius:10,padding:"10px 14px"}}>
            💡 المبلغ سيتوزع تلقائياً على الشركاء الأربعة حسب حصصهم
          </div>
          {done?(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:40,marginBottom:6}}>✅</div>
              <div style={{fontWeight:700,color:"#166534"}}>تم الإيداع والتوزيع</div>
            </div>
          ):(
            <>
              <Lbl>المبلغ الكلي للتوزيع</Lbl>
              <Inp style={{fontSize:22,fontWeight:700,textAlign:"center",marginBottom:12}}
                type="number" placeholder="٠" value={form.amount}
                onChange={e=>set("amount")(e.target.value)} autoFocus/>
              {Number(form.amount)>0&&(
                <div style={{background:"#F4F2EE",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  {partners.map(p=>(
                    <div key={p.id} style={{display:"flex",justifyContent:"space-between",
                      padding:"5px 0",borderBottom:"1px solid #E5DDD4"}}>
                      <span style={{fontSize:13,color:"#1C1410",fontWeight:600}}>{p.name}</span>
                      <span style={{fontSize:13,color:p.color,fontWeight:700}}>
                        {fmtD(Math.round(Number(form.amount)*p.share/100))}
                        <span style={{fontSize:10,color:"#8A7060",marginRight:4}}>({toAr(p.share)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp style={{marginBottom:12}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp style={{marginBottom:16}} placeholder="مثال: أرباح مشروع X..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <button onClick={handleDeposit} disabled={!form.amount||saving} style={{
                width:"100%",border:"none",borderRadius:12,padding:"14px",fontSize:15,
                fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                background:Number(form.amount)>0?"#166534":"#E5DDD4",
                color:Number(form.amount)>0?"#fff":"#8A7060",
              }}>{saving?"جاري التوزيع...":"↓ تأكيد الإيداع والتوزيع"}</button>
            </>
          )}
        </div>
      )}

      {/* سحب شريك */}
      {tab==="withdraw"&&(
        <div style={{background:"#fff",border:"1px solid #E5DDD4",borderRadius:16,padding:18}}>
          <Lbl>اختر الشريك</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {partners.map(p=>{
              const avail = balances["partner_"+p.id]||0;
              return (
                <button key={p.id} onClick={()=>{setSelP(p.id);setErr("");}} style={{
                  padding:"12px 10px",borderRadius:12,border:"1.5px solid",cursor:"pointer",
                  fontFamily:"Tahoma",textAlign:"right",
                  background:selP===p.id?p.color+"15":"transparent",
                  borderColor:selP===p.id?p.color:"#E5DDD4",
                }}>
                  <div style={{fontWeight:700,fontSize:13,color:"#1C1410",marginBottom:4}}>{p.name}</div>
                  <div style={{fontSize:12,color:avail>0?"#166534":"#991B1B",fontWeight:600}}>
                    متاح: {fmtD(avail)}
                  </div>
                </button>
              );
            })}
          </div>
          {done?(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:40,marginBottom:6}}>✅</div>
              <div style={{fontWeight:700,color:"#991B1B"}}>تم السحب</div>
            </div>
          ):(
            <>
              {err&&<div style={{color:"#991B1B",fontSize:13,marginBottom:10,fontWeight:600}}>{err}</div>}
              <Lbl>مبلغ السحب</Lbl>
              <Inp style={{fontSize:20,fontWeight:700,textAlign:"center",marginBottom:6}}
                type="number" placeholder="٠" value={form.amount}
                onChange={e=>set("amount")(e.target.value)}/>
              {selP&&Number(form.amount)>0&&(
                <div style={{fontSize:12,marginBottom:12,padding:"6px 12px",borderRadius:8,
                  color:Number(form.amount)<=(balances["partner_"+selP]||0)?"#166534":"#991B1B",
                  background:Number(form.amount)<=(balances["partner_"+selP]||0)?"rgba(22,101,52,0.06)":"rgba(153,27,27,0.06)"}}>
                  {Number(form.amount)<=(balances["partner_"+selP]||0)
                    ?"✅ الرصيد كافٍ"
                    :"⚠️ تجاوز الرصيد المتاح — "+fmtD(balances["partner_"+selP]||0)}
                </div>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp style={{marginBottom:12}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp style={{marginBottom:16}} placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <button onClick={handleWithdraw}
                disabled={!form.amount||saving||Number(form.amount)>(balances["partner_"+selP]||0)}
                style={{
                  width:"100%",border:"none",borderRadius:12,padding:"14px",fontSize:15,
                  fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                  background:Number(form.amount)>0&&Number(form.amount)<=(balances["partner_"+selP]||0)
                    ?"#991B1B":"#E5DDD4",
                  color:Number(form.amount)>0&&Number(form.amount)<=(balances["partner_"+selP]||0)
                    ?"#fff":"#8A7060",
                }}>{saving?"جاري السحب...":"↑ تأكيد السحب"}</button>
            </>
          )}
        </div>
      )}

      {/* سجل معاملات الشركاء */}
      <div style={{marginTop:20,fontSize:14,fontWeight:700,color:"#1C1410",marginBottom:12}}>
        سجل المعاملات
      </div>
      {txs.filter(t=>t.fundId==="partners"||t.fundId?.startsWith("partner_")).length===0
        ?<div style={{textAlign:"center",padding:30,color:"#8A7060",background:"#fff",
          borderRadius:14,border:"1px solid #E5DDD4"}}>ما في معاملات بعد</div>
        :txs.filter(t=>t.fundId==="partners"||t.fundId?.startsWith("partner_")).map(t=>(
          <div key={t.id} style={{background:"#fff",border:"1px solid #E5DDD4",
            borderRadius:12,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:12,color:"#8A7060",marginBottom:3}}>{t.fundName}</div>
                {t.isDistribution&&<span style={{fontSize:10,color:"#1E40AF",background:"rgba(30,64,175,0.08)",
                  padding:"2px 8px",borderRadius:20,marginBottom:4,display:"inline-block"}}>توزيع تلقائي</span>}
                <div style={{fontSize:12,color:"#8A7060"}}>📅 {t.date}</div>
                {t.note&&<div style={{fontSize:12,color:"#1C1410",marginTop:3}}>{t.note}</div>}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:16,fontWeight:700,
                  color:t.type==="إيداع"?"#166534":"#991B1B"}}>
                  {t.type==="إيداع"?"+":"-"}{fmtD(t.amount)}
                </div>
              </div>
            </div>
            {!t.isDistribution&&(
              <button onClick={()=>onDelete(t)} style={{background:"transparent",border:"none",
                color:"#991B1B",fontSize:11,cursor:"pointer",padding:"4px 0",fontFamily:"Tahoma"}}>
                🗑️ حذف
              </button>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ══════════════════════════════════════════
// تفاصيل صندوق عادي
// ══════════════════════════════════════════
function FundDetail({fund, balance, txs, onBack, onAdd, onDelete}) {
  const [form,   setForm]   = useState({type:"إيداع",amount:"",note:"",date:today()});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const set   = k => v => setForm(f=>({...f,[k]:v}));
  const valid = Number(form.amount)>0 && form.date;
  const save  = async () => {
    if(!valid||saving) return;
    setSaving(true);
    await onAdd(form.type,form.amount,form.note,form.date);
    setSaving(false); setDone(true);
    setTimeout(()=>{setDone(false);setForm({type:"إيداع",amount:"",note:"",date:today()});},1400);
  };
  const totIn  = txs.filter(t=>t.type==="إيداع").reduce((s,t)=>s+t.amount,0);
  const totOut = txs.filter(t=>t.type==="سحب").reduce((s,t)=>s+t.amount,0);
  return (
    <div style={{maxWidth:620,margin:"0 auto",padding:24,fontFamily:"Tahoma",direction:"rtl"}}>
      <button onClick={onBack} style={{background:"transparent",border:"1px solid #E5DDD4",
        borderRadius:10,padding:"8px 16px",fontSize:13,color:"#8A7060",cursor:"pointer",
        marginBottom:20,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
        <i className="ti ti-arrow-right" aria-hidden="true"/> رجوع للصناديق
      </button>
      <div style={{background:"#1C1410",borderRadius:20,padding:24,marginBottom:16,color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:46,height:46,borderRadius:13,background:fund.color+"30",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className={`ti ${fund.icon}`} style={{fontSize:24,color:fund.color}} aria-hidden="true"/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:700}}>{fund.name}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>كشف الحساب</div>
          </div>
        </div>
        <div style={{fontSize:34,fontWeight:700,letterSpacing:-1,
          color:balance>=0?"#4ade80":"#f87171",marginBottom:16}}>
          {balance>=0?"":"-"}{fmtD(balance)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>↓ إجمالي الإيداع</div>
            <div style={{fontSize:16,fontWeight:700,color:"#4ade80"}}>{fmtD(totIn)}</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>↑ إجمالي السحب</div>
            <div style={{fontSize:16,fontWeight:700,color:"#f87171"}}>{fmtD(totOut)}</div>
          </div>
        </div>
      </div>
      <div style={{background:"#fff",border:"1px solid #E5DDD4",borderRadius:16,padding:18,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:"#1C1410",marginBottom:14}}>معاملة جديدة</div>
        {done?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:6}}>✅</div>
            <div style={{fontWeight:700,color:"#166534"}}>تم التسجيل</div>
          </div>
        ):(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {["إيداع","سحب"].map(t=>(
                <button key={t} onClick={()=>set("type")(t)} style={{
                  padding:"12px",borderRadius:10,border:"1.5px solid",cursor:"pointer",
                  fontFamily:"Tahoma",fontSize:14,fontWeight:700,
                  background:form.type===t?(t==="إيداع"?"rgba(22,101,52,0.1)":"rgba(153,27,27,0.1)"):"transparent",
                  color:form.type===t?(t==="إيداع"?"#166534":"#991B1B"):"#8A7060",
                  borderColor:form.type===t?(t==="إيداع"?"#166534":"#991B1B"):"#E5DDD4",
                }}>{t==="إيداع"?"↓ إيداع":"↑ سحب"}</button>
              ))}
            </div>
            <Lbl>المبلغ</Lbl>
            <Inp style={{fontSize:22,fontWeight:700,textAlign:"center",marginBottom:12}}
              type="number" placeholder="٠" value={form.amount}
              onChange={e=>set("amount")(e.target.value)} autoFocus/>
            <Lbl>التاريخ</Lbl>
            <Inp style={{marginBottom:12}} type="date" value={form.date}
              onChange={e=>set("date")(e.target.value)}/>
            <Lbl>ملاحظة</Lbl>
            <Inp style={{marginBottom:16}} placeholder="..." value={form.note}
              onChange={e=>set("note")(e.target.value)}/>
            <button onClick={save} disabled={!valid||saving} style={{
              width:"100%",border:"none",borderRadius:12,padding:"14px",fontSize:15,
              fontWeight:700,cursor:valid?"pointer":"not-allowed",fontFamily:"Tahoma",
              background:valid?(form.type==="إيداع"?"#166534":"#991B1B"):"#E5DDD4",
              color:valid?"#fff":"#8A7060",
            }}>{saving?"جاري الحفظ...":(form.type==="إيداع"?"↓ تأكيد الإيداع":"↑ تأكيد السحب")}</button>
          </>
        )}
      </div>
      <div style={{fontSize:14,fontWeight:700,color:"#1C1410",marginBottom:12}}>
        سجل المعاملات ({toAr(txs.length)})
      </div>
      {txs.length===0
        ?<div style={{textAlign:"center",padding:30,color:"#8A7060",background:"#fff",
          borderRadius:14,border:"1px solid #E5DDD4"}}>ما في معاملات بعد</div>
        :txs.map(t=>(
          <div key={t.id} style={{background:"#fff",border:"1px solid #E5DDD4",
            borderRadius:14,padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,marginBottom:6,display:"inline-block",
                  color:t.type==="إيداع"?"#166534":"#991B1B",
                  background:t.type==="إيداع"?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)"}}>
                  {t.type==="إيداع"?"↓":"↑"} {t.type}
                </span>
                <div style={{fontSize:12,color:"#8A7060"}}>📅 {t.date}</div>
                {t.note&&<div style={{fontSize:13,color:"#1C1410",marginTop:4}}>{t.note}</div>}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:18,fontWeight:700,color:t.type==="إيداع"?"#166534":"#991B1B"}}>
                  {t.type==="إيداع"?"+":"-"}{fmtD(t.amount)}
                </div>
                {t.balanceAfter!==undefined&&(
                  <div style={{fontSize:11,color:"#8A7060",marginTop:3}}>رصيد: {fmtD(t.balanceAfter)}</div>
                )}
              </div>
            </div>
            <button onClick={()=>onDelete(t)} style={{background:"transparent",border:"none",
              color:"#991B1B",fontSize:12,cursor:"pointer",padding:"4px 0",fontWeight:600,fontFamily:"Tahoma"}}>
              🗑️ حذف
            </button>
          </div>
        ))
      }
    </div>
  );
}
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
         onSnapshot, query, orderBy } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
});
const db = getFirestore(app);

// ══════════════════════════════════════════
// الصناديق الثمانية — ثابتة
// ══════════════════════════════════════════
const FUNDS = [
  { id:"capital",     name:"صندوق رأس المال",      icon:"ti-safe",          color:"#1C1410", bg:"#F4F2EE" },
  { id:"general",     name:"الصندوق العام",         icon:"ti-building-bank", color:"#1E40AF", bg:"#EFF6FF" },
  { id:"decor",       name:"صندوق الديكور",         icon:"ti-palette",       color:"#6B21A8", bg:"#F5F3FF" },
  { id:"contracting", name:"صندوق المقاولات",       icon:"ti-building",      color:"#92400E", bg:"#FFF7ED" },
  { id:"facades",     name:"صندوق الواجهات",        icon:"ti-layers",        color:"#0f766e", bg:"#F0FDF9" },
  { id:"engineering", name:"صندوق أعمال هندسية",   icon:"ti-ruler-2",       color:"#1E40AF", bg:"#EFF6FF" },
  { id:"trade",       name:"صندوق التجارة",          icon:"ti-briefcase",     color:"#166534", bg:"#F0FDF4" },
  { id:"partners",    name:"صندوق أرباح الشركاء",  icon:"ti-users",         color:"#991B1B", bg:"#FEF2F2" },
];

// ══════════════════════════════════════════
// مساعدات
// ══════════════════════════════════════════
const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmtD  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + " د.ع";
const today = () => new Date().toISOString().split("T")[0];

// ══════════════════════════════════════════
// App
// ══════════════════════════════════════════
export default function App() {
  const [sel,      setSel]      = useState(null);   // الصندوق المفتوح
  const [loading,  setLoading]  = useState(true);
  const [balances, setBalances] = useState({});      // { fundId: number }
  const [txs,      setTxs]      = useState([]);      // كل المعاملات

  // تحميل Tabler Icons
  useEffect(() => {
    if(!document.querySelector("#tab-icons")) {
      const l = document.createElement("link");
      l.id   = "tab-icons";
      l.rel  = "stylesheet";
      l.href = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);
    }
  }, []);

  // Firebase listeners
  useEffect(() => {
    const u = [];
    const to = setTimeout(() => setLoading(false), 6000);

    // أرصدة الصناديق
    u.push(onSnapshot(collection(db, "fund_balances"), s => {
      const b = {};
      s.docs.forEach(d => { b[d.id] = d.data().balance || 0; });
      setBalances(b);
      setLoading(false);
    }, () => setLoading(false)));

    // معاملات الصناديق
    u.push(onSnapshot(
      query(collection(db, "fund_transactions"), orderBy("date", "desc")),
      s => setTxs(s.docs.map(d => ({ id: d.id, ...d.data() })))
    ));

    return () => { u.forEach(f => f()); clearTimeout(to); };
  }, []);

  // إضافة معاملة لصندوق
  const addTx = async (fundId, type, amount, note, date) => {
    const amt = Number(amount);
    if(!amt || amt <= 0) return;
    const cur = balances[fundId] || 0;
    const newBal = type === "إيداع" ? cur + amt : cur - amt;
    // تحديث الرصيد
    await setDoc(doc(db, "fund_balances", fundId), { balance: newBal }, { merge: true });
    // تسجيل المعاملة
    await addDoc(collection(db, "fund_transactions"), {
      fundId, fundName: FUNDS.find(f => f.id === fundId)?.name || "",
      type, amount: amt,
      note: note || "",
      date: date || today(),
      balanceAfter: newBal,
      createdAt: new Date().toISOString(),
    });
  };

  const deleteTx = async tx => {
    if(!window.confirm("تحذف هذه المعاملة؟")) return;
    // عكس تأثير المعاملة على الرصيد
    const cur = balances[tx.fundId] || 0;
    const newBal = tx.type === "إيداع" ? cur - tx.amount : cur + tx.amount;
    await setDoc(doc(db, "fund_balances", tx.fundId), { balance: newBal }, { merge: true });
    await deleteDoc(doc(db, "fund_transactions", tx.id));
  };

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#F4F2EE",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:12,fontFamily:"Tahoma"}}>
      <div style={{fontSize:52}}>🏦</div>
      <div style={{fontSize:22,fontWeight:700,color:"#1C1410"}}>الصناديق</div>
      <div style={{fontSize:13,color:"#8A7060"}}>جاري التحميل...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F4F2EE",fontFamily:"Tahoma,Arial,sans-serif",direction:"rtl",color:"#1C1410"}}>

      {sel
        ? <FundDetail
            fund={FUNDS.find(f => f.id === sel)}
            balance={balances[sel] || 0}
            txs={txs.filter(t => t.fundId === sel)}
            onBack={() => setSel(null)}
            onAdd={(type, amt, note, date) => addTx(sel, type, amt, note, date)}
            onDelete={deleteTx}
          />
        : <FundsList
            funds={FUNDS}
            balances={balances}
            onSelect={setSel}
          />
      }
    </div>
  );
}
