import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
         onSnapshot, query, orderBy, limit } from "firebase/firestore";

// ══════════════════════════════════════════
// Firebase
// ══════════════════════════════════════════
const app = initializeApp({
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
});
const db = getFirestore(app);

// ══════════════════════════════════════════
// ثوابت
// ══════════════════════════════════════════
const C = {
  bg:     "#F7F4EF",
  card:   "#FFFFFF",
  border: "#E5DDD4",
  text:   "#1C1410",
  muted:  "#8A7060",
  gold:   "#B8860B",
  green:  "#166534",
  red:    "#991B1B",
  blue:   "#1E40AF",
};

const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const today = () => new Date().toISOString().split("T")[0];
const fmtN  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ"));
const fmtD  = n => fmtN(n) + " د.ع";
const fmtDol= n => fmtN(n) + " $";
const fmt   = (n,c) => c==="دولار" ? fmtDol(n) : fmtD(n);

// ══════════════════════════════════════════
// Styles مشتركة
// ══════════════════════════════════════════
const S = {
  page:  { minHeight:"100vh", background:C.bg, fontFamily:"Tahoma, Arial, sans-serif",
           direction:"rtl", color:C.text, paddingBottom:80 },
  card:  { background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
           padding:16, marginBottom:12, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" },
  cardLg:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20,
           padding:20, marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.08)" },
  inp:   { width:"100%", border:`1px solid ${C.border}`, borderRadius:10,
           padding:"11px 14px", fontSize:15, background:C.bg, color:C.text,
           outline:"none", boxSizing:"border-box", fontFamily:"Tahoma, Arial, sans-serif",
           direction:"rtl" },
  sel:   { width:"100%", border:`1px solid ${C.border}`, borderRadius:10,
           padding:"11px 14px", fontSize:14, background:C.bg, color:C.text,
           outline:"none", boxSizing:"border-box", direction:"rtl" },
  btn:   { border:"none", borderRadius:12, padding:"13px 20px", fontSize:15,
           fontWeight:700, cursor:"pointer", fontFamily:"Tahoma, Arial, sans-serif",
           width:"100%", transition:"opacity 0.15s" },
  label: { fontSize:12, color:C.muted, fontWeight:700, marginBottom:5, display:"block" },
  tag:   { display:"inline-block", padding:"3px 10px", borderRadius:20,
           fontSize:12, fontWeight:700 },
  navH:  56,
};

// ══════════════════════════════════════════
// المكونات الصغيرة
// ══════════════════════════════════════════
const Divider = () => <div style={{height:1, background:C.border, margin:"12px 0"}}/>;

const StatBox = ({label, value, color=C.text, sub}) => (
  <div style={{flex:1, minWidth:0}}>
    <div style={{fontSize:11, color:C.muted, fontWeight:700, marginBottom:3}}>{label}</div>
    <div style={{fontSize:20, fontWeight:900, color, letterSpacing:-0.5}}>{value}</div>
    {sub&&<div style={{fontSize:11, color:C.muted, marginTop:2}}>{sub}</div>}
  </div>
);

const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{
    background:"transparent", border:`1px solid ${C.border}`,
    borderRadius:10, padding:"8px 14px", fontSize:13, color:C.muted,
    cursor:"pointer", display:"flex", alignItems:"center", gap:6,
    fontFamily:"Tahoma",
  }}>← رجوع</button>
);

const EmptyState = ({icon, text}) => (
  <div style={{textAlign:"center", padding:"50px 20px", color:C.muted}}>
    <div style={{fontSize:44, marginBottom:10}}>{icon}</div>
    <div style={{fontWeight:600}}>{text}</div>
  </div>
);

const AmountPill = ({amount, currency, type}) => {
  const isIn  = type==="استلام";
  const color = isIn ? C.green : C.red;
  return (
    <div style={{fontWeight:900, fontSize:17, color,
      background:isIn?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)",
      padding:"4px 12px", borderRadius:20}}>
      {isIn?"+":"-"}{fmt(amount,currency)}
    </div>
  );
};

// ══════════════════════════════════════════
// نافذة تأكيد بسيطة
// ══════════════════════════════════════════
const ConfirmDialog = ({msg, onYes, onNo}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:900,
    display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{...S.card,maxWidth:360,width:"100%",padding:24,textAlign:"center"}}>
      <div style={{fontSize:16,fontWeight:700,marginBottom:20}}>{msg}</div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onNo}  style={{...S.btn,flex:1,background:C.bg,color:C.text,border:`1px solid ${C.border}`}}>إلغاء</button>
        <button onClick={onYes} style={{...S.btn,flex:1,background:C.red,color:"#fff"}}>تأكيد</button>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════
// صفحة إضافة معاملة
// ══════════════════════════════════════════
function AddTxPage({projects, persons, onBack, onSave}) {
  const [form, setForm] = useState({
    type:"استلام", amount:"", currency:"دينار",
    projectId:"", personId:"", note:"", date:today(),
    source:"project", // project | general
  });
  const [step, setStep]   = useState(1); // 1: النوع, 2: التفاصيل
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set = k => v => setForm(f=>({...f,[k]:v}));
  const valid = form.amount && Number(form.amount)>0 && form.date;

  const save = async () => {
    if(!valid||saving) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setDone(true);
    setTimeout(()=>{ setDone(false); setForm({type:"استلام",amount:"",currency:"دينار",
      projectId:"",personId:"",note:"",date:today(),source:"project"}); setStep(1); }, 1800);
  };

  if(done) return (
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <div style={{fontSize:64,marginBottom:12}}>✅</div>
      <div style={{fontSize:20,fontWeight:800,color:C.green}}>تم التسجيل</div>
    </div>
  );

  // الخطوة ١ — النوع
  if(step===1) return (
    <div style={{padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <BackBtn onClick={onBack}/>
        <div style={{fontSize:18,fontWeight:800}}>معاملة جديدة</div>
      </div>

      <div style={{fontSize:13,color:C.muted,fontWeight:700,marginBottom:12}}>نوع المعاملة</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        {[["استلام","↓","#166534"],["صرف","↑","#991B1B"]].map(([t,icon,col])=>(
          <button key={t} onClick={()=>{set("type")(t);setStep(2);}} style={{
            ...S.btn, padding:"28px 10px",
            background:col+"15", color:col,
            border:`2px solid ${col}40`,
          }}>
            <div style={{fontSize:36,marginBottom:6}}>{icon}</div>
            <div style={{fontSize:18}}>{t}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // الخطوة ٢ — التفاصيل
  const isIn = form.type==="استلام";
  const col  = isIn ? C.green : C.red;

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <BackBtn onClick={()=>setStep(1)}/>
        <div style={{fontSize:18,fontWeight:800,color:col}}>
          {isIn?"↓ استلام":"↑ صرف"}
        </div>
      </div>

      {/* المصدر */}
      <label style={S.label}>المصدر</label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {[["project","🏗️ مشروع"],["general","📦 عام"]].map(([v,l])=>(
          <button key={v} onClick={()=>set("source")(v)} style={{
            ...S.btn, padding:"12px",
            background:form.source===v?C.gold+"20":"transparent",
            color:form.source===v?C.gold:C.muted,
            border:`1.5px solid ${form.source===v?C.gold:C.border}`,
          }}>{l}</button>
        ))}
      </div>

      {form.source==="project"&&(<>
        <label style={S.label}>المشروع</label>
        <select style={{...S.sel,marginBottom:16}} value={form.projectId} onChange={e=>set("projectId")(e.target.value)}>
          <option value="">اختر مشروع</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </>)}

      {/* الشخص (اختياري) */}
      <label style={S.label}>الشخص (اختياري)</label>
      <select style={{...S.sel,marginBottom:16}} value={form.personId} onChange={e=>set("personId")(e.target.value)}>
        <option value="">— بدون —</option>
        {persons.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* المبلغ */}
      <label style={S.label}>المبلغ</label>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input style={{...S.inp,flex:2,fontSize:20,fontWeight:800,textAlign:"center"}}
          type="number" placeholder="٠" value={form.amount}
          onChange={e=>set("amount")(e.target.value)} autoFocus/>
        <select style={{...S.sel,flex:1}} value={form.currency} onChange={e=>set("currency")(e.target.value)}>
          <option value="دينار">🇮🇶 د.ع</option>
          <option value="دولار">🇺🇸 $</option>
        </select>
      </div>

      {/* التاريخ */}
      <label style={S.label}>التاريخ</label>
      <input style={{...S.inp,marginBottom:16}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>

      {/* ملاحظة */}
      <label style={S.label}>ملاحظة (اختياري)</label>
      <input style={{...S.inp,marginBottom:24}} placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>

      <button onClick={save} disabled={!valid||saving} style={{
        ...S.btn, background:col, color:"#fff",
        opacity:!valid||saving?0.6:1,
      }}>{saving?"جاري الحفظ...":"👁️ تأكيد الحفظ"}</button>
    </div>
  );
}

// ══════════════════════════════════════════
// صفحة المعاملات
// ══════════════════════════════════════════
function TxPage({txs, projects, persons, onAdd, onDelete}) {
  const [adding,  setAdding]  = useState(false);
  const [filter,  setFilter]  = useState("all"); // all | استلام | صرف
  const [confirm, setConfirm] = useState(null);

  const filtered = filter==="all" ? txs : txs.filter(t=>t.type===filter);
  const proj = id => projects.find(p=>p.id===id);
  const pers = id => persons.find(p=>p.id===id);

  if(adding) return <AddTxPage projects={projects} persons={persons}
    onBack={()=>setAdding(false)} onSave={async f=>{await onAdd(f);setAdding(false);}}/>;

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>📋 المعاملات</div>
        <button onClick={()=>setAdding(true)} style={{
          ...S.btn, width:"auto", padding:"10px 18px",
          background:C.gold, color:"#fff", fontSize:14,
        }}>+ إضافة</button>
      </div>

      {/* فلتر */}
      <div style={{display:"flex",background:C.card,borderRadius:12,padding:4,gap:4,marginBottom:16,border:`1px solid ${C.border}`}}>
        {[["all","الكل"],["استلام","↓ استلام"],["صرف","↑ صرف"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{
            flex:1,border:"none",borderRadius:9,padding:"9px 4px",
            fontWeight:700,fontSize:13,cursor:"pointer",
            background:filter===v?C.gold:"transparent",
            color:filter===v?"#fff":C.muted,
          }}>{l}</button>
        ))}
      </div>

      {filtered.length===0?<EmptyState icon="📄" text="ما في معاملات"/>:filtered.map(t=>(
        <div key={t.id} style={{...S.card}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              {proj(t.projectId)&&<div style={{fontSize:12,color:C.gold,fontWeight:700,marginBottom:3}}>🏗️ {proj(t.projectId).name}</div>}
              {pers(t.personId)&&<div style={{fontSize:12,color:C.blue,fontWeight:700,marginBottom:3}}>👤 {pers(t.personId).name}</div>}
              {!t.projectId&&!t.personId&&<div style={{fontSize:12,color:C.muted,marginBottom:3}}>📦 عام</div>}
              <div style={{fontSize:12,color:C.muted}}>📅 {t.date}</div>
              {t.note&&<div style={{fontSize:13,color:C.text,marginTop:4}}>{t.note}</div>}
            </div>
            <AmountPill amount={t.amount} currency={t.currency} type={t.type}/>
          </div>
          <Divider/>
          <button onClick={()=>setConfirm(t.id)} style={{
            background:"transparent",border:"none",color:C.red,
            fontSize:12,cursor:"pointer",padding:"4px 0",fontWeight:600,
          }}>🗑️ حذف</button>
        </div>
      ))}

      {confirm&&<ConfirmDialog msg="تحذف هذه المعاملة؟"
        onYes={()=>{onDelete(confirm);setConfirm(null);}}
        onNo={()=>setConfirm(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════
// صفحة المشاريع
// ══════════════════════════════════════════
function ProjectsPage({projects, txs, onAddProject, onDeleteProject}) {
  const [sel,      setSel]    = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [name,     setName]    = useState("");
  const [confirm,  setConfirm] = useState(null);

  const projTxs = id => txs.filter(t=>t.projectId===id);
  const projBal = id => {
    const list = projTxs(id);
    const r = list.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0);
    const s = list.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0);
    return {r, s, b:r-s};
  };

  if(sel) {
    const p   = projects.find(x=>x.id===sel);
    const bal = projBal(sel);
    const list = projTxs(sel).sort((a,b)=>b.date.localeCompare(a.date));
    return (
      <div style={{padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <BackBtn onClick={()=>setSel(null)}/>
          <div style={{fontSize:18,fontWeight:800}}>🏗️ {p?.name}</div>
        </div>
        {/* صندوق المشروع */}
        <div style={{...S.cardLg,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",border:"none",color:"#fff"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",marginBottom:4}}>صندوق المشروع</div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1,marginBottom:12}}>
            {bal.b>=0?"+":"-"}{fmtD(bal.b)}
          </div>
          <div style={{display:"flex",gap:16}}>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>↓ استلام</div><div style={{fontWeight:700,color:"#86efac"}}>{fmtD(bal.r)}</div></div>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>↑ صرف</div><div style={{fontWeight:700,color:"#fca5a5"}}>{fmtD(bal.s)}</div></div>
          </div>
        </div>
        {/* المعاملات */}
        <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:10}}>معاملات المشروع ({toAr(list.length)})</div>
        {list.length===0?<EmptyState icon="📄" text="ما في معاملات"/>:list.map(t=>(
          <div key={t.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{t.type}</div>
              <div style={{fontSize:11,color:C.muted}}>📅 {t.date} {t.note&&"· "+t.note}</div>
            </div>
            <AmountPill amount={t.amount} currency={t.currency} type={t.type}/>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>🏗️ المشاريع</div>
        <button onClick={()=>setShowForm(v=>!v)} style={{
          ...S.btn,width:"auto",padding:"10px 18px",
          background:C.gold,color:"#fff",fontSize:14,
        }}>+ مشروع</button>
      </div>

      {showForm&&(
        <div style={{...S.card,marginBottom:16}}>
          <label style={S.label}>اسم المشروع</label>
          <input style={{...S.inp,marginBottom:12}} placeholder="مثال: مشروع بغداد" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
          <button onClick={async()=>{if(!name.trim())return;await onAddProject(name.trim());setName("");setShowForm(false);}} style={{...S.btn,background:C.gold,color:"#fff"}}>حفظ</button>
        </div>
      )}

      {projects.length===0?<EmptyState icon="🏗️" text="ما في مشاريع"/>:projects.map(p=>{
        const bal = projBal(p.id);
        return (
          <div key={p.id} style={{...S.card,cursor:"pointer"}} onClick={()=>setSel(p.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>{p.name}</div>
                <div style={{fontSize:12,color:C.muted}}>{toAr(projTxs(p.id).length)} معاملة</div>
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:17,fontWeight:900,color:bal.b>=0?C.green:C.red}}>{bal.b>=0?"+":"-"}{fmtD(bal.b)}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>←</div>
              </div>
            </div>
          </div>
        );
      })}

      {confirm&&<ConfirmDialog msg="تحذف هذا المشروع؟"
        onYes={()=>{onDeleteProject(confirm);setConfirm(null);}}
        onNo={()=>setConfirm(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════
// صفحة الأشخاص
// ══════════════════════════════════════════
function PersonsPage({persons, txs, personalDebts, onAddPerson, onDeletePerson, onAddDebt, onPayDebt}) {
  const [sel,      setSel]    = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]    = useState({name:"",role:"شريك",share:""});
  const [debtForm, setDebtForm] = useState({amount:"",currency:"دينار",note:""});
  const [showDebt, setShowDebt] = useState(false);
  const [confirm,  setConfirm]  = useState(null);

  const persBalance = id => {
    const list = txs.filter(t=>t.personId===id);
    const r = list.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0);
    const s = list.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0);
    return {r,s,b:r-s, list};
  };

  const persDebts = id => personalDebts.filter(d=>
    (d.debtorId===id||d.creditorId===id) && d.status!=="مسدد كامل"
  );

  if(sel) {
    const p    = persons.find(x=>x.id===sel);
    const bal  = persBalance(sel);
    const dts  = persDebts(sel);
    return (
      <div style={{padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <BackBtn onClick={()=>setSel(null)}/>
          <div style={{fontSize:18,fontWeight:800}}>👤 {p?.name}</div>
        </div>

        {/* الرصيد */}
        <div style={{...S.cardLg,background:bal.b>=0?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",border:"none",color:"#fff",marginBottom:12}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",marginBottom:4}}>رصيد العمل</div>
          <div style={{fontSize:26,fontWeight:900,letterSpacing:-1,marginBottom:10}}>
            {bal.b>=0?"+":"-"}{fmtD(bal.b)}
          </div>
          <div style={{display:"flex",gap:16}}>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>↓ استلم</div><div style={{fontWeight:700,color:"#86efac"}}>{fmtD(bal.r)}</div></div>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>↑ صرف</div><div style={{fontWeight:700,color:"#fca5a5"}}>{fmtD(bal.s)}</div></div>
          </div>
        </div>

        {/* السلف */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:800}}>💳 السلف الشخصية</div>
          <button onClick={()=>setShowDebt(v=>!v)} style={{...S.btn,width:"auto",padding:"8px 14px",background:C.blue+"15",color:C.blue,border:`1px solid ${C.blue}30`,fontSize:13}}>+ سلفة</button>
        </div>

        {showDebt&&(
          <div style={{...S.card,marginBottom:12}}>
            <label style={S.label}>المبلغ</label>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input style={{...S.inp,flex:2}} type="number" placeholder="٠" value={debtForm.amount} onChange={e=>setDebtForm(f=>({...f,amount:e.target.value}))}/>
              <select style={{...S.sel,flex:1}} value={debtForm.currency} onChange={e=>setDebtForm(f=>({...f,currency:e.target.value}))}>
                <option>دينار</option><option>دولار</option>
              </select>
            </div>
            <label style={S.label}>ملاحظة</label>
            <input style={{...S.inp,marginBottom:10}} placeholder="..." value={debtForm.note} onChange={e=>setDebtForm(f=>({...f,note:e.target.value}))}/>
            <button onClick={async()=>{
              if(!debtForm.amount) return;
              await onAddDebt({...debtForm,debtorId:sel,debtorName:p?.name});
              setDebtForm({amount:"",currency:"دينار",note:""});
              setShowDebt(false);
            }} style={{...S.btn,background:C.blue,color:"#fff"}}>حفظ</button>
          </div>
        )}

        {dts.length===0?
          <div style={{...S.card,color:C.muted,textAlign:"center",padding:20}}>ما في سلف مستحقة</div>:
          dts.map(d=>{
            const isDebtor = d.debtorId===sel;
            return(
              <div key={d.id} style={{...S.card}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{isDebtor?"عليه":"له"}</div>
                    <div style={{fontSize:12,color:C.muted}}>{d.date} {d.note&&"· "+d.note}</div>
                    <span style={{...S.tag,background:d.status==="مسدد جزئي"?"#fef3c7":"#fee2e2",color:d.status==="مسدد جزئي"?"#92400e":"#991b1b",marginTop:4}}>
                      {d.status}
                    </span>
                  </div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:16,fontWeight:900,color:C.red}}>{fmt(d.remaining||d.amount,d.currency)}</div>
                  </div>
                </div>
                {isDebtor&&d.status!=="مسدد كامل"&&(
                  <button onClick={async()=>{
                    const amt=Number(prompt(`سداد من ${p?.name}\nالمتبقي: ${fmt(d.remaining||d.amount,d.currency)}`));
                    if(amt>0) await onPayDebt(d,amt);
                  }} style={{...S.btn,background:C.green+"15",color:C.green,border:`1px solid ${C.green}30`,fontSize:13,padding:"9px"}}>✅ تسجيل سداد</button>
                )}
              </div>
            );
          })
        }

        <Divider/>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>سجل المعاملات</div>
        {bal.list.length===0?<EmptyState icon="📄" text="ما في معاملات"/>:
          bal.list.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>(
            <div key={t.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:13,fontWeight:700}}>{t.type}</div><div style={{fontSize:11,color:C.muted}}>📅 {t.date} {t.note&&"· "+t.note}</div></div>
              <AmountPill amount={t.amount} currency={t.currency} type={t.type}/>
            </div>
          ))
        }
      </div>
    );
  }

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>👥 الأشخاص</div>
        <button onClick={()=>setShowForm(v=>!v)} style={{...S.btn,width:"auto",padding:"10px 18px",background:C.gold,color:"#fff",fontSize:14}}>+ شخص</button>
      </div>

      {showForm&&(
        <div style={{...S.card,marginBottom:16}}>
          <label style={S.label}>الاسم</label>
          <input style={{...S.inp,marginBottom:10}} placeholder="الاسم الكامل" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus/>
          <label style={S.label}>الدور</label>
          <select style={{...S.sel,marginBottom:10}} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
            <option>شريك</option><option>محاسب</option><option>موظف</option><option>فورمن</option>
          </select>
          {(form.role==="شريك"||form.role==="محاسب")&&(<>
            <label style={S.label}>الحصة %</label>
            <input style={{...S.inp,marginBottom:10}} type="number" placeholder="مثال: 35" value={form.share} onChange={e=>setForm(f=>({...f,share:e.target.value}))}/>
          </>)}
          <button onClick={async()=>{if(!form.name.trim())return;await onAddPerson(form);setForm({name:"",role:"شريك",share:""});setShowForm(false);}} style={{...S.btn,background:C.gold,color:"#fff"}}>حفظ</button>
        </div>
      )}

      {persons.length===0?<EmptyState icon="👥" text="ما في أشخاص"/>:persons.map(p=>{
        const bal  = persBalance(p.id);
        const dbt  = persDebts(p.id).reduce((s,d)=>s+(d.remaining||d.amount||0),0);
        return (
          <div key={p.id} style={{...S.card,cursor:"pointer"}} onClick={()=>setSel(p.id)}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:bal.b!==0||dbt>0?10:0}}>
              <div style={{width:42,height:42,borderRadius:14,background:C.gold+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:C.gold,flexShrink:0}}>{p.name[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15}}>{p.name}</div>
                <div style={{fontSize:12,color:C.muted}}>{p.role}{p.share?` · ${toAr(p.share)}%`:""}</div>
              </div>
              <div style={{textAlign:"left",fontSize:12,color:C.muted}}>←</div>
            </div>
            {(bal.b!==0)&&(
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,background:bal.b>=0?C.green+"10":C.red+"10",borderRadius:10,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.muted}}>رصيد العمل</div>
                  <div style={{fontSize:14,fontWeight:800,color:bal.b>=0?C.green:C.red}}>{bal.b>=0?"+":"-"}{fmtD(bal.b)}</div>
                </div>
                {dbt>0&&<div style={{flex:1,background:C.red+"10",borderRadius:10,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.muted}}>سلفة مستحقة</div>
                  <div style={{fontSize:14,fontWeight:800,color:C.red}}>{fmtD(dbt)}</div>
                </div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
// صفحة الديون
// ══════════════════════════════════════════
function DebtsPage({debts, onAdd, onPay, onDelete}) {
  const [dir,     setDir]    = useState("owed"); // owed | owing
  const [showForm,setShowForm]= useState(false);
  const [form,    setForm]   = useState({name:"",amount:"",currency:"دينار",dueDate:"",note:"",debtType:"person"});
  const [confirm, setConfirm]= useState(null);

  const list = debts.filter(d=>(dir==="owed"?(d.direction==="owed"||!d.direction):d.direction==="owing"));
  const pending = list.filter(d=>d.status!=="مسدد كامل");
  const total = pending.reduce((s,d)=>s+(d.remaining||d.amount||0),0);

  return (
    <div style={{padding:20}}>
      <div style={{fontSize:20,fontWeight:800,marginBottom:20}}>💳 الديون</div>

      {/* مبدّل الاتجاه */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {[["owed","🔴 الشركة مطلوبة",C.red],["owing","🟢 الشركة طالبة",C.green]].map(([v,l,col])=>(
          <button key={v} onClick={()=>{setDir(v);setForm(f=>({...f,direction:v}));}} style={{
            ...S.btn,padding:"16px 10px",
            background:dir===v?col+"15":"transparent",
            color:dir===v?col:C.muted,
            border:`2px solid ${dir===v?col:C.border}`,
          }}>
            <div style={{fontSize:15}}>{l}</div>
            {dir===v&&<div style={{fontSize:13,fontWeight:900,marginTop:4}}>{fmtD(total)}</div>}
          </button>
        ))}
      </div>

      <button onClick={()=>setShowForm(v=>!v)} style={{...S.btn,background:dir==="owed"?C.red:C.green,color:"#fff",marginBottom:16}}>
        {showForm?"✕ إغلاق":"+ إضافة دين"}
      </button>

      {showForm&&(
        <div style={{...S.card,marginBottom:16}}>
          <label style={S.label}>النوع</label>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {[["person","👤 شخص/شركة"],["location","📍 موقع"]].map(([v,l])=>(
              <button key={v} onClick={()=>setForm(f=>({...f,debtType:v}))} style={{
                flex:1,...S.btn,padding:"10px",fontSize:13,
                background:form.debtType===v?C.gold+"20":"transparent",
                color:form.debtType===v?C.gold:C.muted,
                border:`1.5px solid ${form.debtType===v?C.gold:C.border}`,
              }}>{l}</button>
            ))}
          </div>
          <label style={S.label}>الاسم</label>
          <input style={{...S.inp,marginBottom:10}} placeholder="..." value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus/>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{flex:2}}><label style={S.label}>المبلغ</label><input style={S.inp} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
            <div style={{flex:1}}><label style={S.label}>العملة</label><select style={S.sel} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}><option>دينار</option><option>دولار</option></select></div>
          </div>
          <label style={S.label}>تاريخ الاستحقاق</label>
          <input style={{...S.inp,marginBottom:10}} type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
          <label style={S.label}>ملاحظة</label>
          <input style={{...S.inp,marginBottom:12}} placeholder="..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
          <button onClick={async()=>{if(!form.name||!form.amount)return;await onAdd({...form,direction:dir});setForm({name:"",amount:"",currency:"دينار",dueDate:"",note:"",debtType:"person"});setShowForm(false);}} style={{...S.btn,background:dir==="owed"?C.red:C.green,color:"#fff"}}>حفظ</button>
        </div>
      )}

      {list.length===0?<EmptyState icon="✅" text="ما في ديون"/>:list.map(d=>{
        const remaining = d.remaining??d.amount??0;
        const paid      = d.paidAmount||0;
        const pct       = d.amount>0?Math.min(100,Math.round(paid/d.amount*100)):0;
        const isOverdue = d.dueDate && d.dueDate < today();
        return (
          <div key={d.id} style={{...S.card,border:isOverdue?`1.5px solid ${C.red}50`:undefined}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>{d.name}</div>
                {isOverdue&&<span style={{...S.tag,background:"#fee2e2",color:C.red,marginBottom:4}}>⚠️ متأخر</span>}
                {d.dueDate&&!isOverdue&&<div style={{fontSize:11,color:C.muted}}>📅 {d.dueDate}</div>}
                {d.note&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{d.note}</div>}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:17,fontWeight:900,color:dir==="owed"?C.red:C.green}}>{fmt(remaining,d.currency)}</div>
                {paid>0&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{toAr(pct)}% مسدد</div>}
              </div>
            </div>
            {paid>0&&<div style={{background:C.border,borderRadius:999,height:4,marginBottom:8,overflow:"hidden"}}>
              <div style={{background:C.green,height:"100%",width:`${pct}%`,borderRadius:999}}/>
            </div>}
            <div style={{display:"flex",gap:8}}>
              {d.status!=="مسدد كامل"&&<button onClick={async()=>{
                const amt=Number(prompt(`${dir==="owed"?"سداد":"استلام"} — المتبقي: ${fmt(remaining,d.currency)}`));
                if(amt>0) await onPay(d,amt,dir);
              }} style={{...S.btn,flex:2,background:dir==="owed"?C.green+"15":C.blue+"15",color:dir==="owed"?C.green:C.blue,border:`1px solid ${dir==="owed"?C.green:C.blue}30`,fontSize:13,padding:"9px"}}>
                {dir==="owed"?"✅ سداد":"💰 استلام"}
              </button>}
              <button onClick={()=>setConfirm(d.id)} style={{...S.btn,flex:1,background:C.red+"10",color:C.red,border:`1px solid ${C.red}20`,fontSize:13,padding:"9px"}}>🗑️</button>
            </div>
          </div>
        );
      })}
      {confirm&&<ConfirmDialog msg="تحذف هذا الدين؟" onYes={()=>{onDelete(confirm);setConfirm(null);}} onNo={()=>setConfirm(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════
// صفحة التقارير
// ══════════════════════════════════════════
function ReportsPage({txs, projects, persons, debts, personalDebts}) {
  const totalR = txs.filter(t=>t.type==="استلام"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0);
  const totalS = txs.filter(t=>t.type==="صرف"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0);
  const net    = totalR - totalS;
  const owedTotal  = debts.filter(d=>(d.direction==="owed"||!d.direction)&&d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount||0),0);
  const owingTotal = debts.filter(d=>d.direction==="owing"&&d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount||0),0);
  const persDebtTotal = personalDebts.filter(d=>d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount||0),0);

  const partners = persons.filter(p=>p.role==="شريك"||p.role==="محاسب");
  const partnerShares = partners.map(p=>{
    const share   = Number(p.share||0);
    const profit  = Math.round(net*(share/100));
    const drawn   = txs.filter(t=>t.personId===p.id&&t.type==="صرف").reduce((s,t)=>s+t.amount,0);
    return {...p, profit, drawn, remaining:profit-drawn};
  });

  const projBals = projects.map(p=>{
    const list = txs.filter(t=>t.projectId===p.id);
    const r = list.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0);
    const s = list.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0);
    return {...p, r, s, b:r-s};
  }).sort((a,b)=>b.b-a.b);

  const print = () => {
    const ar = n=>String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,",");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>تقرير الأرباح</title>
<style>body{font-family:Tahoma;padding:24px;direction:rtl;color:#1C1410}
h1{font-size:20px;color:#B8860B;border-bottom:2px solid #B8860B;padding-bottom:8px}
h2{font-size:15px;margin-top:20px;color:#1C1410}
table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}
th{background:#1C1410;color:#fff;padding:8px 12px;text-align:right}
td{padding:8px 12px;border-bottom:1px solid #E5DDD4}
.g{color:#166534;font-weight:700}.r{color:#991B1B;font-weight:700}
.box{display:inline-block;border:1px solid #E5DDD4;border-radius:8px;padding:10px 16px;margin:4px;text-align:center;min-width:130px}
.lbl{font-size:11px;color:#8A7060}.val{font-size:17px;font-weight:900;margin-top:4px}
</style></head><body>
<h1>📈 تقرير الأرباح والخسائر</h1>
<div style="color:#8A7060;font-size:12px;margin-bottom:16px">تاريخ: ${new Date().toLocaleDateString("ar-IQ")}</div>
<div>
<div class="box"><div class="lbl">إجمالي الإيرادات</div><div class="val g">${ar(totalR)} د.ع</div></div>
<div class="box"><div class="lbl">إجمالي المصروفات</div><div class="val r">${ar(totalS)} د.ع</div></div>
<div class="box"><div class="lbl">صافي الربح</div><div class="val ${net>=0?"g":"r"}">${ar(Math.abs(net))} د.ع</div></div>
</div>
<h2>حصص الشركاء</h2>
<table><thead><tr><th>الشريك</th><th>الحصة</th><th>نصيب الربح</th><th>المسحوب</th><th>المتبقي</th></tr></thead><tbody>
${partnerShares.map(p=>`<tr><td>${p.name}</td><td>${p.share}%</td><td class="g">${ar(p.profit)}</td><td class="r">${ar(p.drawn)}</td><td class="${p.remaining>=0?"g":"r"}">${ar(Math.abs(p.remaining))}</td></tr>`).join("")}
</tbody></table>
<h2>أرباح المشاريع</h2>
<table><thead><tr><th>المشروع</th><th>إيراد</th><th>مصروف</th><th>ربح/خسارة</th></tr></thead><tbody>
${projBals.map(p=>`<tr><td>${p.name}</td><td class="g">${ar(p.r)}</td><td class="r">${ar(p.s)}</td><td class="${p.b>=0?"g":"r"}">${ar(Math.abs(p.b))}</td></tr>`).join("")}
</tbody></table>
<h2>الديون</h2>
<table><thead><tr><th>البند</th><th>المبلغ</th></tr></thead><tbody>
<tr><td>على الشركة (مطلوبة)</td><td class="r">${ar(owedTotal)}</td></tr>
<tr><td>للشركة (طالبة)</td><td class="g">${ar(owingTotal)}</td></tr>
<tr><td>سلف شخصية</td><td class="r">${ar(persDebtTotal)}</td></tr>
</tbody></table>
</body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>📈 التقارير</div>
        <button onClick={print} style={{...S.btn,width:"auto",padding:"10px 18px",background:C.blue,color:"#fff",fontSize:14}}>🖨️ طباعة</button>
      </div>

      {/* المؤشرات */}
      <div style={{...S.cardLg,background:"linear-gradient(135deg,#0f2027,#203a43)",border:"none",color:"#fff",marginBottom:14}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:4}}>صافي الربح</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:-1,color:net>=0?"#86efac":"#fca5a5",marginBottom:14}}>
          {net>=0?"+":"-"}{fmtD(net)}
        </div>
        <div style={{display:"flex",gap:12}}>
          <StatBox label="↓ إيرادات" value={fmtD(totalR)} color="#86efac"/>
          <StatBox label="↑ مصروفات" value={fmtD(totalS)} color="#fca5a5"/>
        </div>
      </div>

      {/* الديون */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div style={{...S.card,textAlign:"center"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>🔴 على الشركة</div>
          <div style={{fontSize:18,fontWeight:900,color:C.red}}>{fmtD(owedTotal)}</div>
        </div>
        <div style={{...S.card,textAlign:"center"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>🟢 للشركة</div>
          <div style={{fontSize:18,fontWeight:900,color:C.green}}>{fmtD(owingTotal)}</div>
        </div>
      </div>

      {/* حصص الشركاء */}
      {partnerShares.length>0&&(<>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>👥 حصص الشركاء</div>
        {partnerShares.map(p=>(
          <div key={p.id} style={{...S.card}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div>
                <div style={{fontWeight:800}}>{p.name}</div>
                <div style={{fontSize:12,color:C.muted}}>حصة {toAr(p.share)}%</div>
              </div>
              <div style={{fontSize:16,fontWeight:900,color:p.profit>=0?C.green:C.red}}>{fmtD(p.profit)}</div>
            </div>
            <div style={{background:C.border,borderRadius:999,height:5,marginBottom:6,overflow:"hidden"}}>
              <div style={{background:C.gold,height:"100%",borderRadius:999,width:`${p.profit?Math.min(100,Math.round(p.drawn/p.profit*100)):0}%`}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted}}>
              <span>مسحوب: {fmtD(p.drawn)}</span>
              <span style={{color:p.remaining>=0?C.green:C.red}}>متبقي: {fmtD(Math.abs(p.remaining))}</span>
            </div>
          </div>
        ))}
      </>)}

      {/* أرباح المشاريع */}
      <div style={{fontSize:14,fontWeight:800,marginBottom:10,marginTop:4}}>🏗️ أرباح المشاريع</div>
      {projBals.length===0?<EmptyState icon="🏗️" text="ما في مشاريع"/>:projBals.map(p=>(
        <div key={p.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontWeight:700}}>{p.name}</div><div style={{fontSize:11,color:C.muted}}>↓{fmtD(p.r)} ↑{fmtD(p.s)}</div></div>
          <div style={{fontSize:15,fontWeight:900,color:p.b>=0?C.green:C.red}}>{p.b>=0?"+":"-"}{fmtD(p.b)}</div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
// الصفحة الرئيسية
// ══════════════════════════════════════════
function HomePage({txs, projects, persons, debts, personalDebts, onAddTx, onNavigate}) {
  const today_s  = today();
  const totalR   = txs.filter(t=>t.type==="استلام"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0);
  const totalS   = txs.filter(t=>t.type==="صرف"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0);
  const balance  = totalR - totalS;
  const overdue  = debts.filter(d=>d.status!=="مسدد كامل"&&d.dueDate&&d.dueDate<today_s);
  const dueSoon  = debts.filter(d=>d.status!=="مسدد كامل"&&d.dueDate&&d.dueDate>=today_s&&d.dueDate<=today_s.slice(0,7)+"-"+(String(Number(today_s.slice(-2))+7).padStart(2,"0")));

  const recentTx = txs.slice(0,5);

  return (
    <div style={{padding:20}}>
      {/* تنبيهات */}
      {overdue.length>0&&(
        <button onClick={()=>onNavigate("debts")} style={{...S.btn,background:"#7f1d1d",color:"#fff",marginBottom:10,display:"flex",alignItems:"center",gap:10,padding:"12px 16px"}}>
          <span style={{fontSize:20}}>🚨</span>
          <span style={{fontWeight:700}}>{toAr(overdue.length)} دين متأخر عن الاستحقاق</span>
        </button>
      )}
      {dueSoon.length>0&&(
        <button onClick={()=>onNavigate("debts")} style={{...S.btn,background:"#92400e",color:"#fff",marginBottom:10,display:"flex",alignItems:"center",gap:10,padding:"12px 16px"}}>
          <span style={{fontSize:20}}>⏰</span>
          <span style={{fontWeight:700}}>{toAr(dueSoon.length)} دين يستحق قريباً</span>
        </button>
      )}

      {/* الصندوق */}
      <div style={{...S.cardLg,background:balance>=0?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",border:"none",color:"#fff",marginBottom:14}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>💰 الصندوق العام</div>
        <div style={{fontSize:34,fontWeight:900,letterSpacing:-1,marginBottom:12}}>
          {balance>=0?"+":"-"}{fmtD(balance)}
        </div>
        <div style={{display:"flex",gap:16}}>
          <div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>↓ إجمالي الاستلام</div><div style={{fontWeight:700,color:"#86efac"}}>{fmtD(totalR)}</div></div>
          <div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>↑ إجمالي الصرف</div><div style={{fontWeight:700,color:"#fca5a5"}}>{fmtD(totalS)}</div></div>
        </div>
      </div>

      {/* ملخص سريع */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {[
          ["🏗️",toAr(projects.length),"مشروع","projects"],
          ["👥",toAr(persons.length),"شخص","persons"],
          ["💳",toAr(debts.filter(d=>d.status!=="مسدد كامل").length),"دين","debts"],
        ].map(([icon,val,label,page])=>(
          <button key={page} onClick={()=>onNavigate(page)} style={{
            ...S.card,cursor:"pointer",border:`1px solid ${C.border}`,
            textAlign:"center",padding:"14px 10px",marginBottom:0,
          }}>
            <div style={{fontSize:24,marginBottom:4}}>{icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:C.text}}>{val}</div>
            <div style={{fontSize:11,color:C.muted}}>{label}</div>
          </button>
        ))}
      </div>

      {/* أحدث المعاملات */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:800}}>آخر المعاملات</div>
        <button onClick={()=>onNavigate("transactions")} style={{background:"transparent",border:"none",color:C.gold,fontSize:13,cursor:"pointer",fontWeight:700}}>عرض الكل ←</button>
      </div>
      {recentTx.length===0?<EmptyState icon="📄" text="ما في معاملات بعد"/>:recentTx.map(t=>(
        <div key={t.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>{t.type} {t.note&&"· "+t.note}</div>
            <div style={{fontSize:11,color:C.muted}}>📅 {t.date}</div>
          </div>
          <AmountPill amount={t.amount} currency={t.currency} type={t.type}/>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
// الشريط السفلي
// ══════════════════════════════════════════
const NAV = [
  {id:"home",         icon:"🏠", label:"الرئيسية"},
  {id:"transactions", icon:"📋", label:"المعاملات"},
  {id:"projects",     icon:"🏗️", label:"المشاريع"},
  {id:"persons",      icon:"👥", label:"الأشخاص"},
  {id:"debts",        icon:"💳", label:"الديون"},
  {id:"reports",      icon:"📈", label:"التقارير"},
];

function BottomNav({current, onChange}) {
  return (
    <div style={{
      position:"fixed",bottom:0,left:0,right:0,
      background:"#fff",borderTop:`1px solid ${C.border}`,
      display:"flex",height:S.navH,zIndex:100,
      boxShadow:"0 -2px 12px rgba(0,0,0,0.06)",
    }}>
      {NAV.map(n=>{
        const active = current===n.id;
        return (
          <button key={n.id} onClick={()=>onChange(n.id)} style={{
            flex:1,border:"none",background:"transparent",
            display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",gap:2,cursor:"pointer",
            color:active?C.gold:C.muted,
          }}>
            <div style={{fontSize:18,lineHeight:1}}>{n.icon}</div>
            <div style={{fontSize:9,fontWeight:active?800:600}}>{n.label}</div>
            {active&&<div style={{width:20,height:2,background:C.gold,borderRadius:999}}/>}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
// App الرئيسي
// ══════════════════════════════════════════
export default function App() {
  const [page,    setPage]    = useState("home");
  const [loading, setLoading] = useState(true);

  const [txs,          setTxs]          = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [persons,      setPersons]      = useState([]);
  const [debts,        setDebts]        = useState([]);
  const [personalDebts,setPersonalDebts]= useState([]);

  // Firebase listeners
  useEffect(()=>{
    const unsubs = [];
    const to = setTimeout(()=>setLoading(false), 8000);

    unsubs.push(onSnapshot(query(collection(db,"transactions"),orderBy("date","desc"),limit(500)),
      s=>{ setTxs(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
      ()=>setLoading(false)));

    unsubs.push(onSnapshot(collection(db,"projects_v2"),
      s=>setProjects(s.docs.map(d=>({id:d.id,...d.data()})))));

    unsubs.push(onSnapshot(collection(db,"persons_v2"),
      s=>setPersons(s.docs.map(d=>({id:d.id,...d.data()})))));

    unsubs.push(onSnapshot(query(collection(db,"debts_v2"),orderBy("createdAt","desc")),
      s=>setDebts(s.docs.map(d=>({id:d.id,...d.data()})))));

    unsubs.push(onSnapshot(collection(db,"personalDebts_v2"),
      s=>setPersonalDebts(s.docs.map(d=>({id:d.id,...d.data()})))));

    return ()=>{ unsubs.forEach(u=>u()); clearTimeout(to); };
  },[]);

  // ── CRUD Functions ──────────────────────────────────────
  const addTx = async form => {
    await addDoc(collection(db,"transactions"),{
      type:      form.type,
      amount:    Number(form.amount),
      currency:  form.currency,
      projectId: form.projectId||"",
      personId:  form.personId||"",
      note:      form.note||"",
      date:      form.date,
      source:    form.source||"general",
      createdAt: new Date().toISOString(),
    });
  };

  const deleteTx = async id => await deleteDoc(doc(db,"transactions",id));

  const addProject = async name => {
    await addDoc(collection(db,"projects_v2"),{
      name, createdAt:new Date().toISOString(),
    });
  };

  const deleteProject = async id => await deleteDoc(doc(db,"projects_v2",id));

  const addPerson = async form => {
    await addDoc(collection(db,"persons_v2"),{
      name:  form.name,
      role:  form.role,
      share: Number(form.share||0),
      createdAt:new Date().toISOString(),
    });
  };

  const deletePerson = async id => await deleteDoc(doc(db,"persons_v2",id));

  const addPersonalDebt = async form => {
    const amt = Number(form.amount);
    await addDoc(collection(db,"personalDebts_v2"),{
      debtorId:   form.debtorId,
      debtorName: form.debtorName,
      amount:     amt,
      remaining:  amt,
      paidAmount: 0,
      currency:   form.currency,
      note:       form.note||"",
      date:       today(),
      status:     "غير مسدد",
      createdAt:  new Date().toISOString(),
    });
  };

  const payPersonalDebt = async (debt, amt) => {
    const newRem  = Math.max(0,(debt.remaining||debt.amount)-amt);
    const newPaid = (debt.paidAmount||0)+amt;
    await setDoc(doc(db,"personalDebts_v2",debt.id),{
      remaining:  newRem,
      paidAmount: newPaid,
      status:     newRem<=0?"مسدد كامل":newPaid>0?"مسدد جزئي":"غير مسدد",
      lastPayment:today(),
    },{merge:true});
  };

  const addDebt = async form => {
    const amt = Number(form.amount);
    await addDoc(collection(db,"debts_v2"),{
      name:       form.name,
      direction:  form.direction||"owed",
      debtType:   form.debtType||"person",
      amount:     amt,
      remaining:  amt,
      paidAmount: 0,
      currency:   form.currency,
      dueDate:    form.dueDate||"",
      note:       form.note||"",
      status:     "غير مسدد",
      createdAt:  new Date().toISOString(),
    });
  };

  const payDebt = async (debt, amt, dir) => {
    const newRem  = Math.max(0,(debt.remaining||debt.amount)-amt);
    const newPaid = (debt.paidAmount||0)+amt;
    await setDoc(doc(db,"debts_v2",debt.id),{
      remaining:  newRem,
      paidAmount: newPaid,
      status:     newRem<=0?"مسدد كامل":newPaid>0?"مسدد جزئي":"غير مسدد",
      lastPayment:today(),
    },{merge:true});
    // تسجيل في transactions
    await addDoc(collection(db,"transactions"),{
      type:      dir==="owed"?"صرف":"استلام",
      amount:    amt,
      currency:  debt.currency,
      projectId: "",
      personId:  "",
      note:      `${dir==="owed"?"سداد":"استلام"} دين — ${debt.name}`,
      date:      today(),
      source:    "general",
      isDebtPayment: true,
      createdAt: new Date().toISOString(),
    });
  };

  const deleteDebt = async id => await deleteDoc(doc(db,"debts_v2",id));

  // ── Render ──────────────────────────────────────────────
  if(loading) return (
    <div style={{...S.page,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:52}}>📊</div>
      <div style={{fontSize:22,fontWeight:900,color:C.gold}}>حساب</div>
      <div style={{fontSize:13,color:C.muted}}>جاري تحميل البيانات...</div>
    </div>
  );

  const pages = {
    home: <HomePage txs={txs} projects={projects} persons={persons} debts={debts}
            personalDebts={personalDebts} onAddTx={addTx} onNavigate={setPage}/>,
    transactions: <TxPage txs={txs} projects={projects} persons={persons}
                    onAdd={addTx} onDelete={deleteTx}/>,
    projects: <ProjectsPage projects={projects} txs={txs}
                onAddProject={addProject} onDeleteProject={deleteProject}/>,
    persons: <PersonsPage persons={persons} txs={txs} personalDebts={personalDebts}
                onAddPerson={addPerson} onDeletePerson={deletePerson}
                onAddDebt={addPersonalDebt} onPayDebt={payPersonalDebt}/>,
    debts: <DebtsPage debts={debts} onAdd={addDebt} onPay={payDebt} onDelete={deleteDebt}/>,
    reports: <ReportsPage txs={txs} projects={projects} persons={persons}
                debts={debts} personalDebts={personalDebts}/>,
  };

  return (
    <div style={S.page}>
      <div style={{maxWidth:640,margin:"0 auto",paddingBottom:S.navH}}>
        {pages[page]||pages.home}
      </div>
      <BottomNav current={page} onChange={setPage}/>
    </div>
  );
}
