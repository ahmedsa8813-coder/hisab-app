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
  { id:"capital",     name:"صندوق رأس المال",     icon:"ti-safe",          color:"#2563EB", light:"#EFF6FF" },
  { id:"general",     name:"الصندوق العام",        icon:"ti-building-bank", color:"#0891B2", light:"#ECFEFF" },
  { id:"decor",       name:"صندوق الديكور",        icon:"ti-palette",       color:"#7C3AED", light:"#F5F3FF" },
  { id:"contracting", name:"صندوق المقاولات",      icon:"ti-building",      color:"#D97706", light:"#FFFBEB" },
  { id:"facades",     name:"صندوق الواجهات",       icon:"ti-layers",        color:"#059669", light:"#ECFDF5" },
  { id:"engineering", name:"صندوق أعمال هندسية",  icon:"ti-ruler-2",       color:"#DC2626", light:"#FEF2F2" },
  { id:"trade",       name:"صندوق التجارة",         icon:"ti-briefcase",     color:"#16A34A", light:"#F0FDF4" },
  { id:"partners",    name:"صندوق أرباح الشركاء", icon:"ti-users",         color:"#9333EA", light:"#FAF5FF" },
];

// ══════════════════════════════════════════
// الشركاء الأربعة وحصصهم
// ══════════════════════════════════════════
const PARTNERS = [
  { id:"ihab",     name:"إيهاب زيتوني", share:30, color:"#2563EB", light:"#EFF6FF", icon:"ti-user" },
  { id:"nour",     name:"نور إدوارد",   share:30, color:"#059669", light:"#ECFDF5", icon:"ti-user" },
  { id:"mohammed", name:"محمد سالم",    share:30, color:"#7C3AED", light:"#F5F3FF", icon:"ti-user" },
  { id:"ahmed",    name:"أحمد سالم",    share:10, color:"#D97706", light:"#FFFBEB", icon:"ti-user" },
];

// ══════════════════════════════════════════
// مساعدات
// ══════════════════════════════════════════
const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmtD  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + " د.ع";
const today = () => new Date().toISOString().split("T")[0];

const Lbl = ({children}) => (
  <div style={{fontSize:11,color:"#64748B",marginBottom:5,fontWeight:600}}>{children}</div>
);
const Inp = ({style,...props}) => (
  <input style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:10,padding:"11px 14px",
    fontSize:15,background:"#F8FAFC",color:"#1E293B",outline:"none",
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
    <div style={{minHeight:"100vh",background:"#F8FAFC",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:12,fontFamily:"Tahoma"}}>
      <div style={{fontSize:52}}>🏦</div>
      <div style={{fontSize:22,fontWeight:700,color:"#1E293B"}}>الصناديق</div>
      <div style={{fontSize:13,color:"#64748B"}}>جاري التحميل...</div>
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
    <div style={{maxWidth:720,margin:"0 auto",padding:20,fontFamily:"Tahoma",direction:"rtl",background:"#F1F5F9",minHeight:"100vh"}}>
      {/* Header */}
      <div style={{background:"#fff",borderRadius:16,padding:"18px 22px",marginBottom:20,
        border:"1px solid #E2E8F0",display:"flex",justifyContent:"space-between",alignItems:"center",
        boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:20,fontWeight:700,color:"#1E293B"}}>الصناديق المالية</div>
        <div>
          <div style={{fontSize:11,color:"#64748B",marginBottom:2,textAlign:"left"}}>إجمالي الأرصدة</div>
          <div style={{fontSize:20,fontWeight:700,color:"#2563EB"}}>{fmtD(total)}</div>
        </div>
      </div>
      {/* الشبكة */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12}}>
        {funds.map(f=>{
          const bal=balances[f.id]||0, isPos=bal>=0;
          return (
            <button key={f.id} onClick={()=>onSelect(f.id)} style={{
              background:"#fff",border:"1px solid #E2E8F0",
              borderRadius:14,padding:"16px",cursor:"pointer",textAlign:"right",
              display:"flex",flexDirection:"column",gap:12,fontFamily:"Tahoma",
              boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
              transition:"box-shadow 0.15s,transform 0.12s",
              borderRight:`4px solid ${f.color}`,
            }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.08)";e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}>
              {/* رأس البطاقة */}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:11,
                  background:f.light||f.color+"15",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i className={`ti ${f.icon}`} style={{fontSize:21,color:f.color}} aria-hidden="true"/>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#1E293B",lineHeight:1.35}}>{f.name}</div>
              </div>
              {/* الرصيد */}
              <div style={{background:isPos?"#F0FDF4":"#FFF1F2",borderRadius:10,padding:"11px 13px"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:3}}>الرصيد الحالي</div>
                <div style={{fontSize:20,fontWeight:700,letterSpacing:-0.5,
                  color:isPos?"#16A34A":"#DC2626"}}>
                  {isPos?"":"-"}{fmtD(bal)}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                  color:isPos?"#16A34A":"#DC2626",
                  background:isPos?"#DCFCE7":"#FEE2E2"}}>
                  {isPos?"● موجب":"● سالب"}
                </span>
                {f.id==="partners"&&(
                  <span style={{fontSize:10,color:f.color,fontWeight:600,
                    background:f.light,padding:"3px 8px",borderRadius:20}}>
                    4 شركاء
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
  const [selP,   setSelP]   = useState(null);  // شريك مفتوح
  const [tab,    setTab]    = useState("deposit"); // deposit | withdraw
  const [form,   setForm]   = useState({amount:"",note:"",date:today()});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

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
    setSaving(true);
    const ok = await onWithdraw(selP.id, form.amount, form.note, form.date);
    setSaving(false);
    if(ok){setDone(true);setTimeout(()=>{setDone(false);setForm({amount:"",note:"",date:today()});},1600);}
  };

  // ── صفحة الشريك الداخلية ──
  if(selP) {
    const p       = selP;
    const pId     = "partner_"+p.id;
    const pBal    = balances[pId]||0;
    const allTxs  = txs.filter(t=>t.fundId===pId).sort((a,b)=>b.date.localeCompare(a.date));
    const withdraws = allTxs.filter(t=>t.type==="سحب");
    const deposits  = allTxs.filter(t=>t.type==="إيداع");
    const totIn   = deposits.reduce((s,t)=>s+t.amount,0);
    const totOut  = withdraws.reduce((s,t)=>s+t.amount,0);
    const avail   = balances[pId]||0;

    const printStatement = () => {
      const ar = n => String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,",");
      let rows = "";
      allTxs.forEach(t=>{
        const isIn=t.type==="إيداع";
        rows+="<tr>"
          +"<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0'>"+t.date+"</td>"
          +"<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0'>"+(t.isDistribution?"توزيع أرباح":t.type)+"</td>"
          +"<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;color:"+(isIn?"#16A34A":"#DC2626")+";font-weight:700'>"+(isIn?"+":"-")+ar(t.amount)+" د.ع</td>"
          +"<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:12px'>"+(t.note||"—")+"</td>"
          +"</tr>";
      });
      const html="<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'/>"
        +"<title>كشف حساب — "+p.name+"</title>"
        +"<style>body{font-family:Tahoma,Arial;padding:28px;direction:rtl;color:#1E293B;background:#fff}"
        +".hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;margin-bottom:20px;border-bottom:3px solid "+p.color+"}"
        +".logo{font-size:22px;font-weight:700;color:#1E293B}.sub{font-size:12px;color:#64748B;margin-top:3px}"
        +".name{font-size:20px;font-weight:700;color:"+p.color+"}"
        +".cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:22px}"
        +".card{border:1px solid #E2E8F0;border-radius:10px;padding:14px;text-align:center}"
        +".card-l{font-size:11px;color:#64748B;margin-bottom:5px}"
        +".card-v{font-size:20px;font-weight:700}"
        +"table{width:100%;border-collapse:collapse;font-size:13px}"
        +"th{background:"+p.color+";color:#fff;padding:10px 12px;text-align:right;font-weight:700}"
        +"tr:nth-child(even){background:#F8FAFC}"
        +"tfoot td{font-weight:700;background:#F1F5F9;padding:10px 12px}"
        +".ftr{margin-top:20px;padding-top:12px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:11px;color:#94A3B8}"
        +"@media print{body{padding:16px}}"
        +"</style></head><body>"
        +"<div class='hdr'><div><div class='logo'>حساب</div><div class='sub'>كشف حساب شريك</div></div>"
        +"<div style='text-align:left'><div class='name'>"+p.name+"</div>"
        +"<div style='font-size:12px;color:#64748B'>حصة "+p.share+"%</div></div></div>"
        +"<div class='cards'>"
        +"<div class='card'><div class='card-l'>↓ إجمالي الإيداع</div><div class='card-v' style='color:#16A34A'>"+ar(totIn)+" د.ع</div></div>"
        +"<div class='card'><div class='card-l'>↑ إجمالي السحب</div><div class='card-v' style='color:#DC2626'>"+ar(totOut)+" د.ع</div></div>"
        +"<div class='card' style='border-color:"+p.color+";border-width:2px'><div class='card-l'>الرصيد المتاح</div>"
        +"<div class='card-v' style='color:"+p.color+"'>"+ar(pBal)+" د.ع</div></div></div>"
        +"<table><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>ملاحظة</th></tr></thead>"
        +"<tbody>"+rows+"</tbody>"
        +"<tfoot><tr><td>الإجمالي</td><td></td>"
        +"<td style='color:#DC2626'>-"+ar(totOut)+" د.ع</td><td></td></tr></tfoot>"
        +"</table>"
        +"<div class='ftr'><span>نظام حساب</span><span>"+new Date().toLocaleDateString("ar-IQ")+"</span></div>"
        +"</body></html>";
      const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
    };

    return (
      <div style={{maxWidth:640,margin:"0 auto",padding:20,fontFamily:"Tahoma",direction:"rtl",background:"#F1F5F9",minHeight:"100vh"}}>

        {/* رجوع */}
        <button onClick={()=>{setSelP(null);setDone(false);setForm({amount:"",note:"",date:today()});}} style={{
          background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:"8px 16px",
          fontSize:13,color:"#64748B",cursor:"pointer",marginBottom:20,fontFamily:"Tahoma",
          display:"flex",alignItems:"center",gap:6,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <i className="ti ti-arrow-right" aria-hidden="true"/> رجوع للشركاء
        </button>

        {/* بطاقة الشريك */}
        <div style={{background:"#fff",borderRadius:18,padding:20,marginBottom:14,
          border:"1px solid #E2E8F0",borderTop:"5px solid "+p.color,
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:50,height:50,borderRadius:14,background:p.light||p.color+"15",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="ti ti-user" style={{fontSize:26,color:p.color}} aria-hidden="true"/>
              </div>
              <div>
                <div style={{fontSize:19,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                <div style={{fontSize:12,color:"#64748B",marginTop:2}}>حصة {toAr(p.share)}%</div>
              </div>
            </div>
            <button onClick={printStatement} style={{
              background:p.color,border:"none",borderRadius:10,padding:"9px 14px",
              color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"Tahoma",
              display:"flex",alignItems:"center",gap:6,fontWeight:600}}>
              <i className="ti ti-printer" style={{fontSize:16}} aria-hidden="true"/>
              طباعة الكشف
            </button>
          </div>

          {/* الأرقام الثلاثة */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div style={{background:"#F0FDF4",borderRadius:12,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>↓ إجمالي الإيداع</div>
              <div style={{fontSize:16,fontWeight:700,color:"#16A34A"}}>{fmtD(totIn)}</div>
            </div>
            <div style={{background:"#FFF1F2",borderRadius:12,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>↑ إجمالي السحب</div>
              <div style={{fontSize:16,fontWeight:700,color:"#DC2626"}}>{fmtD(totOut)}</div>
            </div>
            <div style={{background:p.light||p.color+"10",borderRadius:12,padding:"12px",textAlign:"center",
              border:"1.5px solid "+p.color+"40"}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>الرصيد المتاح</div>
              <div style={{fontSize:16,fontWeight:700,color:avail>=0?p.color:"#DC2626"}}>{fmtD(avail)}</div>
            </div>
          </div>
        </div>

        {/* سحب */}
        <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,
          border:"1px solid #E2E8F0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>↑ سحب من الصندوق</div>
          {done?(
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:36}}>✅</div>
              <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم السحب بنجاح</div>
            </div>
          ):(
            <>
              <Lbl>المبلغ</Lbl>
              <Inp style={{fontSize:22,fontWeight:700,textAlign:"center",marginBottom:8}}
                type="number" placeholder="٠" value={form.amount}
                onChange={e=>set("amount")(e.target.value)} autoFocus/>
              {Number(form.amount)>0&&(
                <div style={{fontSize:12,marginBottom:10,padding:"7px 12px",borderRadius:8,fontWeight:600,
                  color:Number(form.amount)<=avail?"#16A34A":"#DC2626",
                  background:Number(form.amount)<=avail?"#F0FDF4":"#FFF1F2"}}>
                  {Number(form.amount)<=avail?"✅ الرصيد كافٍ":"⚠️ تجاوز الرصيد — المتاح: "+fmtD(avail)}
                </div>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp style={{marginBottom:10}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp style={{marginBottom:14}} placeholder="سبب السحب..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <button onClick={handleWithdraw}
                disabled={!form.amount||saving||Number(form.amount)>avail} style={{
                width:"100%",border:"none",borderRadius:12,padding:"13px",fontSize:15,
                fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
                background:Number(form.amount)>0&&Number(form.amount)<=avail?p.color:"#E2E8F0",
                color:Number(form.amount)>0&&Number(form.amount)<=avail?"#fff":"#94A3B8",
              }}>{saving?"جاري السحب...":"↑ تأكيد السحب"}</button>
            </>
          )}
        </div>

        {/* سجل السحوبات */}
        <div style={{fontSize:14,fontWeight:700,color:"#DC2626",marginBottom:10,
          display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:16,background:"#DC2626",borderRadius:2}}/>
          السحوبات ({toAr(withdraws.length)})
        </div>
        {withdraws.length===0
          ?<div style={{background:"#fff",borderRadius:12,padding:18,textAlign:"center",
            color:"#94A3B8",border:"1px solid #E2E8F0",marginBottom:14}}>ما في سحوبات بعد</div>
          :withdraws.map(t=>(
            <div key={t.id} style={{background:"#fff",borderRadius:12,padding:"13px 16px",
              marginBottom:8,border:"1px solid #FEE2E2",borderRight:"4px solid #DC2626"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:3}}>
                    {t.note||"سحب"}
                  </div>
                  <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:"#DC2626"}}>
                  -{fmtD(t.amount)}
                </div>
              </div>
            </div>
          ))
        }

        {/* سجل الإيداعات */}
        <div style={{fontSize:14,fontWeight:700,color:"#16A34A",marginBottom:10,marginTop:16,
          display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:16,background:"#16A34A",borderRadius:2}}/>
          الإيداعات ({toAr(deposits.length)})
        </div>
        {deposits.length===0
          ?<div style={{background:"#fff",borderRadius:12,padding:18,textAlign:"center",
            color:"#94A3B8",border:"1px solid #E2E8F0"}}>ما في إيداعات بعد</div>
          :deposits.map(t=>(
            <div key={t.id} style={{background:"#fff",borderRadius:12,padding:"13px 16px",
              marginBottom:8,border:"1px solid #DCFCE7",borderRight:"4px solid #16A34A"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:3}}>
                    {t.isDistribution?"توزيع أرباح تلقائي":t.note||"إيداع"}
                  </div>
                  <div style={{fontSize:11,color:"#64748B"}}>📅 {t.date}</div>
                  {t.note&&t.isDistribution&&<div style={{fontSize:11,color:"#64748B",marginTop:2}}>{t.note}</div>}
                </div>
                <div style={{fontSize:18,fontWeight:700,color:"#16A34A"}}>
                  +{fmtD(t.amount)}
                </div>
              </div>
            </div>
          ))
        }
      </div>
    );
  }

  // ── قائمة الشركاء الرئيسية ──
  return (
    <div style={{maxWidth:640,margin:"0 auto",padding:20,fontFamily:"Tahoma",direction:"rtl",background:"#F1F5F9",minHeight:"100vh"}}>

      {/* رجوع */}
      <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,
        padding:"8px 16px",fontSize:13,color:"#64748B",cursor:"pointer",marginBottom:20,
        fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <i className="ti ti-arrow-right" aria-hidden="true"/> رجوع للصناديق
      </button>

      {/* إجمالي الصندوق الرئيسي */}
      <div style={{background:"#fff",borderRadius:16,padding:"18px 20px",marginBottom:20,
        border:"1px solid #E2E8F0",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>صندوق أرباح الشركاء</div>
        <div style={{fontSize:22,fontWeight:700,color:"#9333EA"}}>{fmtD(totalMain)}</div>
      </div>

      {/* إيداع وتوزيع */}
      <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:20,
        border:"1px solid #E2E8F0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:6}}>↓ إيداع وتوزيع على الشركاء</div>
        <div style={{fontSize:12,color:"#64748B",marginBottom:14,
          background:"#F0FDF4",borderRadius:8,padding:"8px 12px"}}>
          💡 يتوزع تلقائياً حسب حصة كل شريك
        </div>
        {done?(
          <div style={{textAlign:"center",padding:"14px 0"}}>
            <div style={{fontSize:36}}>✅</div>
            <div style={{fontWeight:700,color:"#16A34A",marginTop:6}}>تم الإيداع والتوزيع</div>
          </div>
        ):(
          <>
            <Lbl>المبلغ الكلي</Lbl>
            <Inp style={{fontSize:20,fontWeight:700,textAlign:"center",marginBottom:10}}
              type="number" placeholder="٠" value={form.amount}
              onChange={e=>set("amount")(e.target.value)}/>
            {Number(form.amount)>0&&(
              <div style={{background:"#F8FAFC",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                {partners.map(p=>(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",padding:"5px 0",borderBottom:"1px solid #E2E8F0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:p.color}}/>
                      <span style={{fontSize:13,color:"#1E293B",fontWeight:600}}>{p.name}</span>
                      <span style={{fontSize:11,color:"#64748B"}}>({toAr(p.share)}%)</span>
                    </div>
                    <span style={{fontSize:14,color:p.color,fontWeight:700}}>
                      {fmtD(Math.round(Number(form.amount)*p.share/100))}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Lbl>التاريخ</Lbl>
            <Inp style={{marginBottom:10}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
            <Lbl>ملاحظة</Lbl>
            <Inp style={{marginBottom:14}} placeholder="مثال: أرباح مشروع X..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
            <button onClick={handleDeposit} disabled={!form.amount||saving} style={{
              width:"100%",border:"none",borderRadius:12,padding:"13px",fontSize:15,
              fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",
              background:Number(form.amount)>0?"#9333EA":"#E2E8F0",
              color:Number(form.amount)>0?"#fff":"#94A3B8",
            }}>{saving?"جاري التوزيع...":"↓ تأكيد الإيداع والتوزيع"}</button>
          </>
        )}
      </div>

      {/* بطاقات الشركاء — اضغط للدخول */}
      <div style={{fontSize:15,fontWeight:700,color:"#1E293B",marginBottom:12}}>
        اضغط على شريك لعرض صندوقه
      </div>
      {partners.map(p=>{
        const pId   = "partner_"+p.id;
        const pBal  = balances[pId]||0;
        const totOut= txs.filter(t=>t.fundId===pId&&t.type==="سحب").reduce((s,t)=>s+t.amount,0);
        const totIn = txs.filter(t=>t.fundId===pId&&t.type==="إيداع").reduce((s,t)=>s+t.amount,0);
        const wCount= txs.filter(t=>t.fundId===pId&&t.type==="سحب").length;
        return (
          <button key={p.id} onClick={()=>{setSelP(p);setDone(false);setForm({amount:"",note:"",date:today()});}} style={{
            width:"100%",background:"#fff",border:"1px solid #E2E8F0",
            borderRadius:16,padding:18,marginBottom:12,cursor:"pointer",textAlign:"right",
            fontFamily:"Tahoma",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
            borderRight:"5px solid "+p.color,
            transition:"box-shadow 0.15s,transform 0.12s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.08)";e.currentTarget.style.transform="translateY(-1px)";}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:13,
                  background:p.light||p.color+"15",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <i className="ti ti-user" style={{fontSize:22,color:p.color}} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>{p.name}</div>
                  <div style={{fontSize:12,color:"#64748B",marginTop:2}}>حصة {toAr(p.share)}% · {toAr(wCount)} سحبة</div>
                </div>
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:20,fontWeight:700,
                  color:pBal>=0?p.color:"#DC2626"}}>
                  {fmtD(pBal)}
                </div>
                <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                  {pBal>=0?"متاح للسحب":"رصيد سالب"}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"#F0FDF4",borderRadius:10,padding:"8px 12px"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>↓ إجمالي الإيداع</div>
                <div style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>{fmtD(totIn)}</div>
              </div>
              <div style={{background:"#FFF1F2",borderRadius:10,padding:"8px 12px"}}>
                <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>↑ إجمالي السحب</div>
                <div style={{fontSize:14,fontWeight:700,color:"#DC2626"}}>{fmtD(totOut)}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

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
    <div style={{maxWidth:620,margin:"0 auto",padding:20,fontFamily:"Tahoma",direction:"rtl",background:"#F1F5F9",minHeight:"100vh"}}>
      <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
        borderRadius:10,padding:"8px 16px",fontSize:13,color:"#64748B",cursor:"pointer",
        marginBottom:20,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6,
        boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <i className="ti ti-arrow-right" aria-hidden="true"/> رجوع للصناديق
      </button>

      {/* بطاقة الصندوق */}
      <div style={{background:"#fff",borderRadius:18,padding:22,marginBottom:14,
        border:"1px solid #E2E8F0",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
        borderTop:`5px solid ${fund.color}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{width:50,height:50,borderRadius:14,
            background:fund.light||fund.color+"15",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className={`ti ${fund.icon}`} style={{fontSize:26,color:fund.color}} aria-hidden="true"/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{fund.name}</div>
            <div style={{fontSize:12,color:"#64748B",marginTop:2}}>كشف الحساب</div>
          </div>
        </div>

        {/* الرصيد */}
        <div style={{background:balance>=0?"#F0FDF4":"#FFF1F2",borderRadius:12,
          padding:"16px 18px",marginBottom:14}}>
          <div style={{fontSize:11,color:"#64748B",marginBottom:4}}>الرصيد الحالي</div>
          <div style={{fontSize:34,fontWeight:700,letterSpacing:-1,
            color:balance>=0?"#16A34A":"#DC2626"}}>
            {balance>=0?"":"-"}{fmtD(balance)}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"#F0FDF4",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>↓ إجمالي الإيداع</div>
            <div style={{fontSize:16,fontWeight:700,color:"#16A34A"}}>{fmtD(totIn)}</div>
          </div>
          <div style={{background:"#FFF1F2",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"#64748B",marginBottom:4}}>↑ إجمالي السحب</div>
            <div style={{fontSize:16,fontWeight:700,color:"#DC2626"}}>{fmtD(totOut)}</div>
          </div>
        </div>
      </div>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:18,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:14}}>معاملة جديدة</div>
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
      <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:12}}>
        سجل المعاملات ({toAr(txs.length)})
      </div>
      {txs.length===0
        ?<div style={{textAlign:"center",padding:30,color:"#64748B",background:"#fff",
          borderRadius:14,border:"1px solid #E2E8F0"}}>ما في معاملات بعد</div>
        :txs.map(t=>(
          <div key={t.id} style={{background:"#fff",border:"1px solid #E2E8F0",
            borderRadius:14,padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,marginBottom:6,display:"inline-block",
                  color:t.type==="إيداع"?"#166534":"#991B1B",
                  background:t.type==="إيداع"?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)"}}>
                  {t.type==="إيداع"?"↓":"↑"} {t.type}
                </span>
                <div style={{fontSize:12,color:"#64748B"}}>📅 {t.date}</div>
                {t.note&&<div style={{fontSize:13,color:"#1E293B",marginTop:4}}>{t.note}</div>}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:18,fontWeight:700,color:t.type==="إيداع"?"#166534":"#991B1B"}}>
                  {t.type==="إيداع"?"+":"-"}{fmtD(t.amount)}
                </div>
                {t.balanceAfter!==undefined&&(
                  <div style={{fontSize:11,color:"#64748B",marginTop:3}}>رصيد: {fmtD(t.balanceAfter)}</div>
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
