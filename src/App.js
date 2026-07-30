import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, deleteDoc,
         onSnapshot, query, orderBy, limit } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
});
const db = getFirestore(app);

// ══════════ ثوابت ══════════
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
  purple: "#6B21A8",
};

const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const today = () => new Date().toISOString().split("T")[0];
const fmtD  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + " د.ع";
const fmt   = (n, c) => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + (c==="دولار"?" $":" د.ع");

// ══════════ مكونات مشتركة ══════════
const Lbl = ({children}) => (
  <div style={{fontSize:12,color:C.muted,fontWeight:700,marginBottom:6}}>{children}</div>
);

const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{
    background:"transparent",border:`1px solid ${C.border}`,
    borderRadius:10,padding:"8px 16px",fontSize:13,
    color:C.muted,cursor:"pointer",fontFamily:"Tahoma",
  }}>← رجوع</button>
);

const Empty = ({icon,text}) => (
  <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
    <div style={{fontSize:48,marginBottom:10}}>{icon}</div>
    <div style={{fontWeight:600,fontSize:15}}>{text}</div>
  </div>
);

const S = {
  inp: {width:"100%",border:`1px solid ${C.border}`,borderRadius:10,
        padding:"12px 14px",fontSize:15,background:C.bg,color:C.text,
        outline:"none",boxSizing:"border-box",fontFamily:"Tahoma",direction:"rtl"},
  sel: {width:"100%",border:`1px solid ${C.border}`,borderRadius:10,
        padding:"12px 14px",fontSize:14,background:C.bg,color:C.text,
        outline:"none",boxSizing:"border-box",direction:"rtl"},
  btn: {border:"none",borderRadius:12,padding:"14px 20px",fontSize:15,
        fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",width:"100%"},
  card:{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
        padding:16,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"},
};

// ══════════ مساعد: تحويل رقم لكلمات ══════════
function numToWords(n) {
  if(!n||isNaN(n)) return "";
  const num = Math.floor(Math.abs(Number(n)));
  if(num===0) return "صفر";
  const ones = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const hundreds = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const readGroup = g => {
    if(g===0) return "";
    if(g<20) return ones[g];
    if(g<100) return tens[Math.floor(g/10)]+(g%10?" و"+ones[g%10]:"");
    return hundreds[Math.floor(g/100)]+(g%100?" و"+readGroup(g%100):"");
  };
  const parts = [];
  if(num>=1000000000) parts.push(readGroup(Math.floor(num/1000000000))+" مليار");
  if(num%1000000000>=1000000) parts.push(readGroup(Math.floor((num%1000000000)/1000000))+" مليون");
  if(num%1000000>=1000) parts.push(readGroup(Math.floor((num%1000000)/1000))+" ألف");
  if(num%1000>0) parts.push(readGroup(num%1000));
  return parts.join(" و");
}

// رقم المعاملة: YYYYMMDD-XXX
function genTxId() {
  const d = new Date();
  const ymd = d.getFullYear().toString() +
    String(d.getMonth()+1).padStart(2,"0") +
    String(d.getDate()).padStart(2,"0");
  const rand = String(Math.floor(Math.random()*900)+100);
  return `${ymd}-${rand}`;
}

// ══════════ صفحة الاستلام ══════════
function ReceivePage({receipts, projects, onAdd, onDelete}) {
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({
    sourceType: "project",   // project | general
    projectId:  "",
    generalDesc:"",
    amount:     "",
    currency:   "دينار",
    exchRate:   "",
    note:       "",
    date:       today(),
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set  = k => v => setForm(f=>({...f,[k]:v}));
  const proj = projects.find(p=>p.id===form.projectId);
  const amtNum = Number(form.amount)||0;
  const valid  = amtNum>0 && form.date &&
    (form.sourceType==="general"||form.projectId);

  const amtInDinar = form.currency==="دولار"
    ? amtNum * (Number(form.exchRate)||0)
    : amtNum;

  const save = async () => {
    if(!valid||saving) return;
    setSaving(true);
    await onAdd({
      txId:        genTxId(),
      type:        "استلام",
      sourceType:  form.sourceType,
      projectId:   form.sourceType==="project"?form.projectId:"",
      projectName: form.sourceType==="project"?(proj?.name||""):"",
      generalDesc: form.sourceType==="general"?form.generalDesc:"",
      amount:      amtNum,
      currency:    form.currency,
      exchRate:    form.currency==="دولار"?Number(form.exchRate)||0:0,
      amtInDinar:  amtInDinar,
      amtWords:    numToWords(amtNum)+" "+(form.currency==="دولار"?"دولار":"دينار"),
      note:        form.note,
      date:        form.date,
      createdAt:   new Date().toISOString(),
    });
    setSaving(false);
    setDone(true);
    setTimeout(()=>{
      setDone(false);
      setForm({sourceType:"project",projectId:"",generalDesc:"",amount:"",currency:"دينار",exchRate:"",note:"",date:today()});
      setShow(false);
    },1800);
  };

  const projName = id => projects.find(p=>p.id===id)?.name||"";
  const totalDin = receipts.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totalDol = receipts.filter(r=>r.currency==="دولار").reduce((s,r)=>s+r.amount,0);

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.green}}>↓ الاستلامات</div>
        <button onClick={()=>setShow(v=>!v)} style={{
          ...S.btn,width:"auto",padding:"10px 20px",
          background:C.green,color:"#fff",fontSize:14,
        }}>{show?"✕ إغلاق":"+ إضافة"}</button>
      </div>

      {/* إجمالي */}
      <div style={{background:"linear-gradient(135deg,#14532d,#166534)",borderRadius:18,padding:20,marginBottom:16,color:"#fff",boxShadow:"0 4px 20px rgba(22,101,52,0.25)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>إجمالي الاستلام</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:-1}}>{fmtD(totalDin)}</div>
        {totalDol>0&&<div style={{fontSize:15,color:"#86efac",fontWeight:700,marginTop:4}}>+ {toAr(totalDol)} $</div>}
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:6}}>{toAr(receipts.length)} معاملة</div>
      </div>

      {/* نموذج الإضافة */}
      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${C.green}40`}}>
          {done?(
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <div style={{fontSize:48,marginBottom:8}}>✅</div>
              <div style={{fontWeight:800,fontSize:17,color:C.green}}>تم التسجيل بنجاح</div>
            </div>
          ):(
            <>
              {/* نوع المصدر */}
              <Lbl>مصدر الاستلام</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[["project","🏗️ من مشروع"],["general","📦 عام / متنوع"]].map(([v,l])=>(
                  <button key={v} onClick={()=>set("sourceType")(v)} style={{
                    ...S.btn,padding:"12px 8px",fontSize:13,
                    background:form.sourceType===v?C.green+"18":"transparent",
                    color:form.sourceType===v?C.green:C.muted,
                    border:`1.5px solid ${form.sourceType===v?C.green:C.border}`,
                  }}>{l}</button>
                ))}
              </div>

              {/* من مشروع */}
              {form.sourceType==="project"&&(
                <>
                  <Lbl>اختر المشروع</Lbl>
                  <select style={{...S.sel,marginBottom:14}}
                    value={form.projectId} onChange={e=>set("projectId")(e.target.value)}>
                    <option value="">— اختر مشروع —</option>
                    {projects.map(p=><option key={p.id} value={p.id}>🏗️ {p.name}</option>)}
                  </select>
                </>
              )}

              {/* مصدر عام */}
              {form.sourceType==="general"&&(
                <>
                  <Lbl>وصف المصدر</Lbl>
                  <input style={{...S.inp,marginBottom:14}}
                    placeholder="مثال: تحصيل دين، بيع مواد..."
                    value={form.generalDesc} onChange={e=>set("generalDesc")(e.target.value)} autoFocus/>
                </>
              )}

              {/* المبلغ والعملة */}
              <Lbl>المبلغ والعملة</Lbl>
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                <input style={{...S.inp,flex:2,fontSize:22,fontWeight:800,textAlign:"center"}}
                  type="number" placeholder="٠"
                  value={form.amount} onChange={e=>set("amount")(e.target.value)}/>
                <select style={{...S.sel,flex:1}}
                  value={form.currency} onChange={e=>set("currency")(e.target.value)}>
                  <option value="دينار">🇮🇶 دينار</option>
                  <option value="دولار">🇺🇸 دولار</option>
                </select>
              </div>

              {/* المبلغ كتابةً */}
              {amtNum>0&&(
                <div style={{fontSize:12,color:C.green,fontWeight:600,
                  marginBottom:14,padding:"8px 12px",background:"rgba(22,101,52,0.06)",
                  borderRadius:8,border:`1px solid rgba(22,101,52,0.15)`}}>
                  ✍️ {numToWords(amtNum)} {form.currency==="دولار"?"دولار":"دينار"}
                </div>
              )}

              {/* سعر الصرف — فقط للدولار */}
              {form.currency==="دولار"&&(
                <>
                  <Lbl>سعر الصرف (دينار للدولار)</Lbl>
                  <input style={{...S.inp,marginBottom:6}}
                    type="number" placeholder="مثال: 1500"
                    value={form.exchRate} onChange={e=>set("exchRate")(e.target.value)}/>
                  {amtNum>0&&Number(form.exchRate)>0&&(
                    <div style={{fontSize:12,color:C.blue,fontWeight:600,
                      marginBottom:14,padding:"8px 12px",background:"rgba(30,64,175,0.06)",
                      borderRadius:8,border:`1px solid rgba(30,64,175,0.15)`}}>
                      💱 يعادل: {fmtD(amtInDinar)}
                    </div>
                  )}
                </>
              )}

              {/* التاريخ */}
              <Lbl>التاريخ</Lbl>
              <input style={{...S.inp,marginBottom:14}}
                type="date" value={form.date}
                onChange={e=>set("date")(e.target.value)}/>

              {/* ملاحظة */}
              <Lbl>ملاحظة (اختياري)</Lbl>
              <input style={{...S.inp,marginBottom:18}}
                placeholder="..." value={form.note}
                onChange={e=>set("note")(e.target.value)}/>

              <button onClick={save} disabled={!valid||saving} style={{
                ...S.btn,
                background:valid?C.green:C.border,
                color:valid?"#fff":C.muted,
                fontSize:16,
              }}>{saving?"جاري الحفظ...":"✅ تأكيد وحفظ"}</button>
            </>
          )}
        </div>
      )}

      {/* القائمة */}
      {receipts.length===0
        ?<Empty icon="📥" text="ما في استلامات بعد"/>
        :receipts.map(r=>(
          <div key={r.id} style={S.card}>
            {/* رقم المعاملة */}
            {r.txId&&(
              <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:6,
                fontFamily:"monospace",letterSpacing:1}}>#{r.txId}</div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{flex:1,marginLeft:10}}>
                {/* المصدر */}
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>
                  {r.sourceType==="project"&&r.projectId
                    ? `🏗️ ${projName(r.projectId)||r.projectName||"مشروع"}`
                    : `📦 ${r.generalDesc||r.source||"عام"}`}
                </div>
                {/* المبلغ كتابةً */}
                {r.amtWords&&(
                  <div style={{fontSize:11,color:C.muted,marginBottom:2}}>{r.amtWords}</div>
                )}
                <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div>
                {r.note&&<div style={{fontSize:12,color:C.text,marginTop:3}}>{r.note}</div>}
                {/* معادل الدينار */}
                {r.currency==="دولار"&&r.amtInDinar>0&&(
                  <div style={{fontSize:11,color:C.blue,marginTop:3}}>
                    💱 {fmtD(r.amtInDinar)} (بسعر {toAr(r.exchRate||0)})
                  </div>
                )}
              </div>
              <div style={{fontWeight:900,fontSize:17,color:C.green,
                background:"rgba(22,101,52,0.08)",padding:"5px 12px",
                borderRadius:14,flexShrink:0}}>
                +{fmt(r.amount,r.currency)}
              </div>
            </div>
            <button onClick={()=>{if(window.confirm("تحذف هذا الاستلام؟"))onDelete(r.id);}}
              style={{background:"transparent",border:"none",color:C.red,
                fontSize:12,cursor:"pointer",padding:"4px 0",fontWeight:600}}>
              🗑️ حذف
            </button>
          </div>
        ))
      }
    </div>
  );
}

// ══════════ صفحة المصروف ══════════
const BRANCHES = ["مقاولات","واجهات","ديكور","عام"];
const SPEND_TYPES = [
  {id:"project",  icon:"📁", label:"مشروع",        col:"#0f766e", desc:"مرتبط بمشروع"},
  {id:"asset",    icon:"🔧", label:"شراء عدة",      col:"#1E40AF", desc:"موجودات"},
  {id:"workshop", icon:"🏭", label:"تطوير ورشة",    col:"#92400E", desc:"مصاريف ورشة"},
  {id:"personal", icon:"👤", label:"سلفة شخصية",   col:"#6B21A8", desc:"صرف شخصي"},
];

function SpendPage({spends, projects, onAdd, onDelete}) {
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({
    spendType:"project",
    projectId:"", branch:"مقاولات",
    toolName:"", toolQty:"1", toolBranch:"مقاولات",
    personName:"",
    amount:"", currency:"دينار", exchRate:"",
    note:"", date:today(),
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set  = k => v => setForm(f=>({...f,[k]:v}));
  const amtN = Number(form.amount)||0;
  const valid = amtN>0 && form.date && (
    form.spendType==="project"  ? !!form.projectId :
    form.spendType==="asset"    ? !!form.toolName  :
    form.spendType==="workshop" ? !!form.branch     :
    !!form.personName
  );

  const save = async () => {
    if(!valid||saving) return;
    setSaving(true);
    const proj = projects.find(p=>p.id===form.projectId);
    const amtInDinar = form.currency==="دولار"?amtN*(Number(form.exchRate)||0):amtN;
    await onAdd({
      type:"صرف",
      spendType: form.spendType,
      amount:    amtN,
      currency:  form.currency,
      exchRate:  form.currency==="دولار"?Number(form.exchRate)||0:0,
      amtInDinar,
      amtWords:  numToWords(amtN)+" "+(form.currency==="دولار"?"دولار":"دينار"),
      // مشروع
      projectId:   form.spendType==="project"?form.projectId:"",
      projectName: form.spendType==="project"?(proj?.name||""):"",
      // عدة
      toolName:    form.spendType==="asset"?form.toolName:"",
      toolQty:     form.spendType==="asset"?Number(form.toolQty)||1:0,
      toolBranch:  form.spendType==="asset"?form.toolBranch:"",
      // ورشة
      branch:      form.spendType==="workshop"?form.branch:"",
      // شخصي
      personName:  form.spendType==="personal"?form.personName:"",
      note:        form.note,
      date:        form.date,
      txId:        genTxId(),
      createdAt:   new Date().toISOString(),
    });
    setSaving(false);
    setDone(true);
    setTimeout(()=>{
      setDone(false);
      setForm({spendType:"project",projectId:"",branch:"مقاولات",toolName:"",toolQty:"1",toolBranch:"مقاولات",personName:"",amount:"",currency:"دينار",exchRate:"",note:"",date:today()});
      setShow(false);
    },1600);
  };

  const total = spends.filter(s=>s.currency==="دينار"||!s.currency).reduce((s,r)=>s+r.amount,0);
  const selType = SPEND_TYPES.find(t=>t.id===form.spendType);
  const projName = id => projects.find(p=>p.id===id)?.name||"";

  // label لكل مصروف
  const spendLabel = r => {
    if(r.spendType==="project")  return `📁 ${r.projectName||"مشروع"}`;
    if(r.spendType==="asset")    return `🔧 ${r.toolName} (${toAr(r.toolQty||1)}) — ${r.toolBranch||""}`;
    if(r.spendType==="workshop") return `🏭 ورشة ${r.branch||""}`;
    if(r.spendType==="personal") return `👤 ${r.personName||"شخصي"}`;
    return r.dest||"صرف";
  };

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.red}}>↑ المصروفات</div>
        <button onClick={()=>setShow(v=>!v)} style={{
          ...S.btn,width:"auto",padding:"10px 20px",background:C.red,color:"#fff",fontSize:14,
        }}>{show?"✕ إغلاق":"+ إضافة"}</button>
      </div>

      {/* الإجمالي */}
      <div style={{background:"linear-gradient(135deg,#7f1d1d,#991b1b)",borderRadius:18,
        padding:20,marginBottom:16,color:"#fff",boxShadow:"0 4px 20px rgba(153,27,27,0.25)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>إجمالي الصرف</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:-1}}>{fmtD(total)}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:6}}>{toAr(spends.length)} معاملة</div>
      </div>

      {/* نموذج الإضافة */}
      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${selType?.col||C.red}40`}}>
          {done?(
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <div style={{fontSize:48,marginBottom:8}}>✅</div>
              <div style={{fontWeight:800,fontSize:16,color:C.red}}>تم التسجيل</div>
            </div>
          ):(
            <>
              {/* نوع الصرف */}
              <Lbl>نوع الصرف</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                {SPEND_TYPES.map(t=>(
                  <button key={t.id} onClick={()=>set("spendType")(t.id)} style={{
                    ...S.btn,padding:"12px 8px",fontSize:13,
                    background:form.spendType===t.id?t.col+"18":"transparent",
                    color:form.spendType===t.id?t.col:C.muted,
                    border:`1.5px solid ${form.spendType===t.id?t.col:C.border}`,
                  }}>
                    <div style={{fontSize:20,marginBottom:4}}>{t.icon}</div>
                    <div style={{fontWeight:700}}>{t.label}</div>
                    <div style={{fontSize:10,marginTop:2,opacity:0.7}}>{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* تفاصيل حسب النوع */}
              {form.spendType==="project"&&(<>
                <Lbl>المشروع</Lbl>
                <select style={{...S.sel,marginBottom:14}} value={form.projectId} onChange={e=>set("projectId")(e.target.value)}>
                  <option value="">— اختر مشروع —</option>
                  {projects.map(p=><option key={p.id} value={p.id}>🏗️ {p.name}</option>)}
                </select>
              </>)}

              {form.spendType==="asset"&&(<>
                <Lbl>اسم العدة / المعدة</Lbl>
                <input style={{...S.inp,marginBottom:10}} placeholder="مثال: ماكينة قص، مثقاب..." value={form.toolName} onChange={e=>set("toolName")(e.target.value)} autoFocus/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  <div>
                    <Lbl>العدد</Lbl>
                    <input style={S.inp} type="number" placeholder="١" min="1" value={form.toolQty} onChange={e=>set("toolQty")(e.target.value)}/>
                  </div>
                  <div>
                    <Lbl>الفرع</Lbl>
                    <select style={S.sel} value={form.toolBranch} onChange={e=>set("toolBranch")(e.target.value)}>
                      {BRANCHES.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </>)}

              {form.spendType==="workshop"&&(<>
                <Lbl>الفرع</Lbl>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  {BRANCHES.map(b=>(
                    <button key={b} onClick={()=>set("branch")(b)} style={{
                      ...S.btn,padding:"10px",fontSize:13,
                      background:form.branch===b?"#92400E18":"transparent",
                      color:form.branch===b?"#92400E":C.muted,
                      border:`1.5px solid ${form.branch===b?"#92400E":C.border}`,
                    }}>{b}</button>
                  ))}
                </div>
              </>)}

              {form.spendType==="personal"&&(<>
                <Lbl>اسم الشخص</Lbl>
                <input style={{...S.inp,marginBottom:14}} placeholder="من أخذ السلفة..." value={form.personName} onChange={e=>set("personName")(e.target.value)} autoFocus/>
              </>)}

              {/* المبلغ */}
              <Lbl>المبلغ</Lbl>
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                <input style={{...S.inp,flex:2,fontSize:22,fontWeight:800,textAlign:"center"}}
                  type="number" placeholder="٠" value={form.amount}
                  onChange={e=>set("amount")(e.target.value)}/>
                <select style={{...S.sel,flex:1}} value={form.currency} onChange={e=>set("currency")(e.target.value)}>
                  <option value="دينار">🇮🇶 دينار</option>
                  <option value="دولار">🇺🇸 دولار</option>
                </select>
              </div>

              {amtN>0&&(
                <div style={{fontSize:12,color:C.red,fontWeight:600,marginBottom:10,
                  padding:"7px 10px",background:"rgba(153,27,27,0.06)",borderRadius:8}}>
                  ✍️ {numToWords(amtN)} {form.currency==="دولار"?"دولار":"دينار"}
                </div>
              )}

              {form.currency==="دولار"&&(<>
                <Lbl>سعر الصرف</Lbl>
                <input style={{...S.inp,marginBottom:6}} type="number" placeholder="مثال: 1500"
                  value={form.exchRate} onChange={e=>set("exchRate")(e.target.value)}/>
                {amtN>0&&Number(form.exchRate)>0&&(
                  <div style={{fontSize:12,color:C.blue,fontWeight:600,marginBottom:10,
                    padding:"7px 10px",background:"rgba(30,64,175,0.06)",borderRadius:8}}>
                    💱 يعادل: {fmtD(amtN*Number(form.exchRate))}
                  </div>
                )}
              </>)}

              <Lbl>التاريخ</Lbl>
              <input style={{...S.inp,marginBottom:12}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>

              <Lbl>ملاحظة (اختياري)</Lbl>
              <input style={{...S.inp,marginBottom:18}} placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>

              <button onClick={save} disabled={!valid||saving} style={{
                ...S.btn,background:valid?(selType?.col||C.red):C.border,
                color:valid?"#fff":C.muted,fontSize:16,
              }}>{saving?"جاري الحفظ...":"✅ تأكيد وحفظ"}</button>
            </>
          )}
        </div>
      )}

      {/* القائمة */}
      {spends.length===0?<Empty icon="📤" text="ما في مصروفات بعد"/>:
        spends.map(r=>{
          const t = SPEND_TYPES.find(x=>x.id===r.spendType);
          return (
            <div key={r.id} style={S.card}>
              {r.txId&&<div style={{fontSize:9,color:C.muted,fontFamily:"monospace",marginBottom:4,letterSpacing:0.5}}>#{r.txId}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{flex:1,marginLeft:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>
                    {spendLabel(r)}
                  </div>
                  {r.amtWords&&<div style={{fontSize:10,color:C.muted,marginBottom:2}}>{r.amtWords}</div>}
                  <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div>
                  {r.note&&<div style={{fontSize:11,color:C.text,marginTop:2}}>{r.note}</div>}
                  {r.currency==="دولار"&&r.amtInDinar>0&&(
                    <div style={{fontSize:10,color:C.blue,marginTop:2}}>💱 {fmtD(r.amtInDinar)}</div>
                  )}
                </div>
                <div>
                  <div style={{fontWeight:900,fontSize:16,color:C.red,
                    background:"rgba(153,27,27,0.08)",padding:"5px 12px",borderRadius:12,textAlign:"center"}}>
                    -{fmt(r.amount,r.currency)}
                  </div>
                  {t&&<div style={{fontSize:9,color:t.col,textAlign:"center",marginTop:3,fontWeight:700}}>{t.icon} {t.label}</div>}
                </div>
              </div>
              <button onClick={()=>{if(window.confirm("تحذف؟"))onDelete(r.id);}}
                style={{background:"transparent",border:"none",color:C.red,
                  fontSize:12,cursor:"pointer",padding:"4px 0",fontWeight:600}}>
                🗑️ حذف
              </button>
            </div>
          );
        })
      }
    </div>
  );
}

// ══════════ صفحة التقرير ══════════
function ReportPage({receipts, spends, projects}) {
  const [tab, setTab] = useState("summary"); // summary | branches

  const totR = receipts.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totS = spends.filter(s=>s.currency==="دينار"||!s.currency).reduce((s,r)=>s+r.amount,0);
  const net  = totR - totS;

  // إحصائيات كل مشروع
  const projStats = id => {
    const r = receipts.filter(x=>x.projectId===id&&(x.currency==="دينار"||!x.currency)).reduce((s,x)=>s+x.amount,0);
    const s = spends.filter(x=>x.projectId===id&&(x.currency==="دينار"||!x.currency)).reduce((s,x)=>s+x.amount,0);
    return {r, s, bal:r-s};
  };

  // الأفرع الأربعة
  const BRANCHES = [
    {type:"مقاولات", col:"#0f766e", bg:"rgba(15,118,110,0.08)", border:"rgba(15,118,110,0.2)", icon:"🏗"},
    {type:"واجهات",  col:C.blue,    bg:"rgba(30,64,175,0.08)",  border:"rgba(30,64,175,0.2)",  icon:"🏢"},
    {type:"ديكور",   col:C.purple,  bg:"rgba(107,33,168,0.08)", border:"rgba(107,33,168,0.2)", icon:"🎨"},
    {type:"عام",     col:C.gold,    bg:"rgba(184,134,11,0.08)", border:"rgba(184,134,11,0.2)", icon:"📦"},
  ].map(b=>{
    const projs = projects.filter(p=>p.type===b.type);
    const totContract = projs.reduce((s,p)=>s+(p.contract||0),0);
    const totRec = projs.reduce((s,p)=>s+projStats(p.id).r,0);
    const totSpe = projs.reduce((s,p)=>s+projStats(p.id).s,0);
    return {...b, projs, totContract, totRec, totSpe, bal:totRec-totSpe};
  });

  const ar = n => String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,",");

  const print = () => {
    let branchRows = "";
    BRANCHES.forEach(b => {
      branchRows += '<tr style="background:#f9f6f0;font-weight:800"><td colspan="4" style="padding:10px 12px;font-size:15px;color:#1C1410">'
        + b.icon + " " + b.type + " (" + b.projs.length + " مشاريع)</td></tr>";
      b.projs.forEach(p => {
        const st = projStats(p.id);
        const balCol = st.bal>=0?"#166534":"#991B1B";
        branchRows += "<tr>"
          + '<td style="padding:8px 12px;padding-right:24px">' + p.name + "</td>"
          + '<td style="padding:8px 12px;color:#166534;font-weight:700">' + ar(st.r) + " د.ع</td>"
          + '<td style="padding:8px 12px;color:#991B1B;font-weight:700">' + ar(st.s) + " د.ع</td>"
          + '<td style="padding:8px 12px;font-weight:800;color:' + balCol + '">' + ar(Math.abs(st.bal)) + " د.ع</td>"
          + "</tr>";
      });
      const bBalCol = b.bal>=0?"#166534":"#991B1B";
      branchRows += '<tr style="background:#E5DDD4">'
        + '<td style="padding:8px 12px;font-weight:700">إجمالي ' + b.type + "</td>"
        + '<td style="padding:8px 12px;color:#166534;font-weight:800">' + ar(b.totRec) + " د.ع</td>"
        + '<td style="padding:8px 12px;color:#991B1B;font-weight:800">' + ar(b.totSpe) + " د.ع</td>"
        + '<td style="padding:8px 12px;font-weight:900;color:' + bBalCol + '">' + ar(Math.abs(b.bal)) + " د.ع</td>"
        + "</tr>";
    });

    const netCol = net>=0?"#166534":"#991B1B";
    const html = "<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'/>"
      + "<title>تقرير الأفرع</title>"
      + "<style>body{font-family:Tahoma;padding:24px;direction:rtl;color:#1C1410}"
      + "h1{color:#B8860B;font-size:20px;border-bottom:3px solid #B8860B;padding-bottom:8px;margin-bottom:16px}"
      + "table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}"
      + "th{background:#1C1410;color:#fff;padding:10px 12px;text-align:right}"
      + "tr:nth-child(even){background:#faf7f2}"
      + ".g{color:#166534;font-weight:800}.r{color:#991B1B;font-weight:800}</style></head>"
      + "<body><h1>📊 تقرير الأفرع المالي</h1>"
      + "<div style='font-size:12px;color:#8A7060;margin-bottom:20px'>تاريخ: " + new Date().toLocaleDateString("ar-IQ") + "</div>"
      + "<div style='display:flex;gap:16px;margin-bottom:24px'>"
      + "<div style='flex:1;border:1px solid #E5DDD4;border-radius:10px;padding:14px;text-align:center'><div style='font-size:11px;color:#8A7060'>إجمالي الاستلام</div><div style='font-size:20px;font-weight:900;color:#166534'>" + ar(totR) + " د.ع</div></div>"
      + "<div style='flex:1;border:1px solid #E5DDD4;border-radius:10px;padding:14px;text-align:center'><div style='font-size:11px;color:#8A7060'>إجمالي الصرف</div><div style='font-size:20px;font-weight:900;color:#991B1B'>" + ar(totS) + " د.ع</div></div>"
      + "<div style='flex:1;border:2px solid " + netCol + ";border-radius:10px;padding:14px;text-align:center'><div style='font-size:11px;color:#8A7060'>الصافي</div><div style='font-size:20px;font-weight:900;color:" + netCol + "'>" + ar(Math.abs(net)) + " د.ع</div></div>"
      + "</div><h1>🏗️ تقرير الأفرع</h1>"
      + "<table><thead><tr><th>المشروع</th><th>الاستلام</th><th>المصروف</th><th>الرصيد</th></tr></thead>"
      + "<tbody>" + branchRows + "</tbody></table>"
      + "</body></html>";
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  return (
    <div style={{padding:20}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>📊 التقرير</div>
        <button onClick={print} style={{...S.btn,width:"auto",padding:"10px 18px",background:C.blue,color:"#fff",fontSize:14}}>🖨️ طباعة</button>
      </div>

      {/* تبويبتان */}
      <div style={{display:"flex",background:"#fff",borderRadius:12,padding:4,gap:4,marginBottom:16,border:`1px solid ${C.border}`}}>
        {[["summary","📊 الملخص العام"],["branches","🏗️ الأفرع"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{
            flex:1,border:"none",borderRadius:9,padding:"10px",
            fontWeight:700,fontSize:13,cursor:"pointer",
            background:tab===v?C.text:"transparent",
            color:tab===v?"#fff":C.muted,
          }}>{l}</button>
        ))}
      </div>

      {/* ── الملخص العام ── */}
      {tab==="summary"&&(
        <>
          <div style={{
            background:"linear-gradient(145deg,#1a1a2e,#16213e)",
            borderRadius:18,padding:22,marginBottom:14,color:"#fff",
            boxShadow:"0 6px 24px rgba(0,0,0,0.2)",
          }}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",letterSpacing:1,marginBottom:6}}>
              صافي الرصيد الكلي
            </div>
            <div style={{fontSize:34,fontWeight:900,letterSpacing:-1,
              color:net>=0?"#4ade80":"#f87171",marginBottom:16}}>
              {net>=0?"+":"-"}{fmtD(net)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:3}}>↓ إجمالي الاستلام</div>
                <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{fmtD(totR)}</div>
              </div>
              <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:3}}>↑ إجمالي الصرف</div>
                <div style={{fontSize:16,fontWeight:800,color:"#f87171"}}>{fmtD(totS)}</div>
              </div>
            </div>
          </div>

          {receipts.length>0&&(<>
            <div style={{fontSize:13,fontWeight:800,color:C.green,marginBottom:8}}>↓ آخر الاستلامات</div>
            {receipts.slice(0,4).map(r=>(
              <div key={r.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:13,fontWeight:700}}>{r.generalDesc||r.source||"استلام"}</div>
                <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div></div>
                <div style={{fontWeight:800,color:C.green}}>+{fmt(r.amount,r.currency)}</div>
              </div>
            ))}
          </>)}

          {spends.length>0&&(<>
            <div style={{fontSize:13,fontWeight:800,color:C.red,margin:"14px 0 8px"}}>↑ آخر المصروفات</div>
            {spends.slice(0,4).map(r=>(
              <div key={r.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:13,fontWeight:700}}>{r.dest||"صرف"}</div>
                <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div></div>
                <div style={{fontWeight:800,color:C.red}}>-{fmt(r.amount,r.currency)}</div>
              </div>
            ))}
          </>)}
        </>
      )}

      {/* ── الأفرع ── */}
      {tab==="branches"&&(
        <>
          {/* ملخص الأفرع */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {BRANCHES.map(b=>(
              <div key={b.type} style={{
                background:b.bg,border:`1px solid ${b.border}`,
                borderRadius:16,padding:"14px 12px",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontSize:18}}>{b.icon}</span>
                  <span style={{fontWeight:800,fontSize:14,color:b.col}}>{b.type}</span>
                  <span style={{fontSize:11,color:C.muted,marginRight:"auto"}}>
                    {toAr(b.projs.length)} مشاريع
                  </span>
                </div>
                <div style={{fontSize:15,fontWeight:900,
                  color:b.bal>=0?C.green:C.red}}>
                  {b.bal>=0?"+":"-"}{fmtD(b.bal)}
                </div>
                <div style={{fontSize:10,color:C.muted,marginTop:3}}>
                  ↓{fmtD(b.totRec)} · ↑{fmtD(b.totSpe)}
                </div>
                {b.totContract>0&&(
                  <div style={{fontSize:10,color:b.col,marginTop:3,fontWeight:600}}>
                    📋 عقود: {fmtD(b.totContract)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* تفاصيل كل فرع */}
          {BRANCHES.map(b=>(
            <div key={b.type} style={{marginBottom:16}}>
              {/* عنوان الفرع */}
              <div style={{
                background:b.bg, border:`1.5px solid ${b.border}`,
                borderRadius:14,padding:"12px 16px",marginBottom:8,
                display:"flex",justifyContent:"space-between",alignItems:"center",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:22}}>{b.icon}</span>
                  <div>
                    <div style={{fontWeight:800,fontSize:15,color:b.col}}>{b.type}</div>
                    <div style={{fontSize:11,color:C.muted}}>{toAr(b.projs.length)} مشروع</div>
                  </div>
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:16,fontWeight:900,color:b.bal>=0?C.green:C.red}}>
                    {b.bal>=0?"+":"-"}{fmtD(b.bal)}
                  </div>
                  <div style={{fontSize:10,color:C.muted}}>صافي الفرع</div>
                </div>
              </div>

              {/* مشاريع الفرع */}
              {b.projs.length===0
                ?<div style={{...S.card,color:C.muted,textAlign:"center",fontSize:13,padding:12}}>
                  ما في مشاريع في هذا الفرع
                </div>
                :b.projs.map(p=>{
                  const st = projStats(p.id);
                  const pct = p.contract>0?Math.min(100,Math.round(st.r/p.contract*100)):0;
                  return (
                    <div key={p.id} style={{...S.card,marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:C.text}}>{p.name}</div>
                          {p.contract>0&&(
                            <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                              📋 عقد: {fmtD(p.contract)}
                            </div>
                          )}
                        </div>
                        <div style={{fontWeight:900,fontSize:15,
                          color:st.bal>=0?C.green:C.red}}>
                          {st.bal>=0?"+":"-"}{fmtD(st.bal)}
                        </div>
                      </div>

                      {/* شريط التحصيل */}
                      {p.contract>0&&(
                        <>
                          <div style={{background:C.border,borderRadius:999,height:4,overflow:"hidden",marginBottom:4}}>
                            <div style={{height:"100%",borderRadius:999,
                              background:b.col,width:`${pct}%`}}/>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted}}>
                            <span>تحصّل {toAr(pct)}%</span>
                            <span>↓{fmtD(st.r)} · ↑{fmtD(st.s)}</span>
                          </div>
                        </>
                      )}
                      {!p.contract&&(
                        <div style={{fontSize:11,color:C.muted}}>
                          ↓{fmtD(st.r)} · ↑{fmtD(st.s)}
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </div>
          ))}
        </>
      )}
    </div>
  );
}
// ══════════ صفحة الرواتب ══════════
function SalaryPage({salaries, onAdd, onDelete}) {
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({name:"",amount:"",currency:"دينار",note:"",date:today()});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set = k => v => setForm(f=>({...f,[k]:v}));
  const valid = form.name && form.amount && Number(form.amount)>0;

  const save = async () => {
    if(!valid||saving) return;
    setSaving(true);
    await onAdd({name:form.name,amount:Number(form.amount),currency:form.currency,
      note:form.note,date:form.date,createdAt:new Date().toISOString()});
    setSaving(false);
    setDone(true);
    setTimeout(()=>{setDone(false);setForm({name:"",amount:"",currency:"دينار",note:"",date:today()});setShow(false);},1500);
  };

  const total = salaries.filter(s=>s.currency==="دينار"||!s.currency).reduce((s,r)=>s+r.amount,0);

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.purple}}>💵 الرواتب</div>
        <button onClick={()=>setShow(v=>!v)} style={{...S.btn,width:"auto",padding:"10px 20px",background:C.purple,color:"#fff",fontSize:14}}>
          {show?"✕ إغلاق":"+ إضافة"}
        </button>
      </div>

      <div style={{background:"linear-gradient(135deg,#4a1d96,#6B21A8)",borderRadius:18,padding:20,marginBottom:16,color:"#fff",boxShadow:"0 4px 20px rgba(107,33,168,0.25)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>إجمالي الرواتب</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:-1}}>{fmtD(total)}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:6}}>{toAr(salaries.length)} دفعة</div>
      </div>

      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${C.purple}40`}}>
          {done?(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:6}}>✅</div>
              <div style={{fontWeight:700,color:C.purple}}>تم التسجيل</div>
            </div>
          ):(
            <>
              <Lbl>اسم الموظف</Lbl>
              <input style={{...S.inp,marginBottom:12}} placeholder="الاسم الكامل" value={form.name} onChange={e=>set("name")(e.target.value)} autoFocus/>
              <Lbl>المبلغ</Lbl>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <input style={{...S.inp,flex:2,fontSize:20,fontWeight:800,textAlign:"center"}} type="number" placeholder="٠" value={form.amount} onChange={e=>set("amount")(e.target.value)}/>
                <select style={{...S.sel,flex:1}} value={form.currency} onChange={e=>set("currency")(e.target.value)}>
                  <option value="دينار">🇮🇶 دينار</option>
                  <option value="دولار">🇺🇸 دولار</option>
                </select>
              </div>
              <Lbl>ملاحظة</Lbl>
              <input style={{...S.inp,marginBottom:12}} placeholder="مثال: راتب شهر يناير" value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <Lbl>التاريخ</Lbl>
              <input style={{...S.inp,marginBottom:16}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <button onClick={save} disabled={!valid||saving} style={{...S.btn,background:valid?C.purple:C.border,color:valid?"#fff":C.muted}}>
                {saving?"جاري الحفظ...":"✅ تأكيد وحفظ"}
              </button>
            </>
          )}
        </div>
      )}

      {salaries.length===0?<Empty icon="💵" text="ما في رواتب بعد"/>:
        salaries.map(r=>(
          <div key={r.id} style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:2}}>{r.name}</div>
                <div style={{fontSize:12,color:C.muted}}>📅 {r.date}</div>
                {r.note&&<div style={{fontSize:13,color:C.text,marginTop:3}}>{r.note}</div>}
              </div>
              <div style={{fontWeight:900,fontSize:17,color:C.purple,background:"rgba(107,33,168,0.08)",padding:"4px 12px",borderRadius:16}}>
                {fmt(r.amount,r.currency)}
              </div>
            </div>
            <button onClick={()=>{if(window.confirm("تحذف؟"))onDelete(r.id);}} style={{background:"transparent",border:"none",color:C.red,fontSize:12,cursor:"pointer",padding:"6px 0",fontWeight:600}}>🗑️ حذف</button>
          </div>
        ))
      }
    </div>
  );
}

// ══════════ الشاشة الرئيسية ══════════
function HomePage({receipts, spends, salaries, onNavigate}) {
  const totR   = receipts.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totS   = spends.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totSal = salaries.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const net    = totR - totS - totSal;

  const ACTIONS = [
    {id:"receive",  label:"استلام",  sub:"تسجيل دخل",    icon:"⬇",  bg:"#166534", shadow:"rgba(22,101,52,0.35)"},
    {id:"spend",    label:"مصروف",   sub:"تسجيل صرف",    icon:"⬆",  bg:"#991B1B", shadow:"rgba(153,27,27,0.35)"},
    {id:"projects", label:"المشاريع",sub:"إدارة مشاريع", icon:"🏗",  bg:"#92400E", shadow:"rgba(146,64,14,0.35)"},
    {id:"report",   label:"التقرير", sub:"ملخص مالي",    icon:"📊",  bg:"#1E40AF", shadow:"rgba(30,64,175,0.35)"},
    {id:"salary",   label:"الرواتب", sub:"دفع الرواتب",  icon:"💵",  bg:"#6B21A8", shadow:"rgba(107,33,168,0.35)"},
  ];

  return (
    <div style={{padding:20,paddingBottom:0}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:-0.5}}>حساب</div>
          <div style={{fontSize:12,color:C.muted,fontWeight:600}}>النظام المالي</div>
        </div>
        <div style={{background:C.gold,width:42,height:42,borderRadius:13,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:20,boxShadow:`0 4px 14px rgba(184,134,11,0.4)`}}>
          📊
        </div>
      </div>

      {/* بطاقة الرصيد */}
      <div style={{
        background:"linear-gradient(145deg,#1a1a2e,#16213e,#0f3460)",
        borderRadius:22,padding:24,marginBottom:22,color:"#fff",
        boxShadow:"0 8px 32px rgba(0,0,0,0.25)",
        border:"1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:700,
          letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>
          صافي الرصيد
        </div>
        <div style={{fontSize:38,fontWeight:900,letterSpacing:-1.5,
          color:net>=0?"#4ade80":"#f87171",marginBottom:20}}>
          {net>=0?"+":"-"}{fmtD(net)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {l:"↓ استلام", v:totR,   c:"#4ade80"},
            {l:"↑ صرف",    v:totS,   c:"#f87171"},
            {l:"💵 رواتب", v:totSal, c:"#c084fc"},
          ].map(({l,v,c})=>(
            <div key={l} style={{
              background:"rgba(255,255,255,0.06)",
              borderRadius:14,padding:"11px 10px",textAlign:"center",
              border:"1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",
                fontWeight:700,marginBottom:4}}>{l}</div>
              <div style={{fontSize:13,fontWeight:800,color:c}}>{fmtD(v)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* الأيقونات الرئيسية */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {ACTIONS.map(a=>(
          <button key={a.id} onClick={()=>onNavigate(a.id)} style={{
            background:"#fff",
            border:`1.5px solid ${C.border}`,
            borderRadius:20,padding:"22px 16px 20px",
            cursor:"pointer",textAlign:"center",
            boxShadow:`0 4px 16px rgba(0,0,0,0.06)`,
            transition:"transform 0.12s, box-shadow 0.12s",
            outline:"none",
            // آخر زر يمتد للعرض كله لو عدد فردي
            gridColumn: a.id==="salary" && ACTIONS.length%2!==0 ? "1/-1" : "auto",
          }}
          onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"}
          onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
          onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"}
          onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}
          >
            {/* الأيقونة */}
            <div style={{
              width:62,height:62,borderRadius:18,
              background:a.bg,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:28,margin:"0 auto 14px",
              boxShadow:`0 6px 20px ${a.shadow}`,
            }}>
              <span style={{color:"#fff",fontWeight:900,fontSize:28,lineHeight:1}}>
                {a.icon}
              </span>
            </div>
            {/* النص */}
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:3}}>
              {a.label}
            </div>
            <div style={{fontSize:11,color:C.muted,fontWeight:600}}>
              {a.sub}
            </div>
          </button>
        ))}
      </div>

      {/* آخر المعاملات */}
      {(receipts.length>0||spends.length>0)&&(
        <>
          <div style={{fontSize:13,fontWeight:800,color:C.text,
            marginBottom:10,paddingBottom:8,
            borderBottom:`1px solid ${C.border}`}}>
            آخر المعاملات
          </div>
          {[
            ...receipts.slice(0,2).map(r=>({...r,_t:"r"})),
            ...spends.slice(0,2).map(r=>({...r,_t:"s"})),
          ].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,4).map((r,i)=>(
            <div key={i} style={{
              display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"11px 0",
              borderBottom:`1px solid ${C.border}`,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:34,height:34,borderRadius:10,flexShrink:0,
                  background:r._t==="r"?"rgba(22,101,52,0.1)":"rgba(153,27,27,0.1)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,fontWeight:900,
                  color:r._t==="r"?C.green:C.red,
                }}>{r._t==="r"?"↓":"↑"}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                    {r.generalDesc||r.source||r.dest||"—"}
                  </div>
                  <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div>
                </div>
              </div>
              <div style={{fontWeight:800,fontSize:14,
                color:r._t==="r"?C.green:C.red}}>
                {r._t==="r"?"+":"-"}{fmt(r.amount,r.currency)}
              </div>
            </div>
          ))}
        </>
      )}

    </div>
  );
}

// ══════════ صفحة المشاريع ══════════
const PROJ_TYPES = ["مقاولات","واجهات","ديكور","عام"];

function ProjectsPage({projects, receipts, spends, onAdd, onDelete}) {
  const [sel,    setSel]    = useState(null);
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({name:"",type:"مقاولات",contract:"",currency:"دينار"});
  const [saving, setSaving] = useState(false);

  const projStats = id => {
    const rec = receipts.filter(r=>r.projectId===id&&(r.currency==="دينار"||!r.currency));
    const spe = spends.filter(s=>s.projectId===id&&(s.currency==="دينار"||!s.currency));
    const recDol = receipts.filter(r=>r.projectId===id&&r.currency==="دولار");
    const speDol = spends.filter(s=>s.projectId===id&&s.currency==="دولار");
    const totR   = rec.reduce((s,r)=>s+r.amount,0);
    const totS   = spe.reduce((s,r)=>s+r.amount,0);
    const totRDol= recDol.reduce((s,r)=>s+r.amount,0);
    const totSDol= speDol.reduce((s,r)=>s+r.amount,0);
    return {
      totR, totS, bal:totR-totS,
      totRDol, totSDol,
      recCount:receipts.filter(r=>r.projectId===id).length,
      speCount:spends.filter(s=>s.projectId===id).length,
    };
  };

  const save = async () => {
    if(!form.name.trim()||!form.contract||Number(form.contract)<=0||saving) return;
    setSaving(true);
    await onAdd({
      name:     form.name.trim(),
      type:     form.type,
      contract: Number(form.contract),
      currency: form.currency,
      createdAt:new Date().toISOString(),
    });
    setSaving(false);
    setForm({name:"",type:"مقاولات",contract:"",currency:"دينار"});
    setShow(false);
  };

  const valid = form.name.trim() && Number(form.contract)>0;

  // ── تفاصيل مشروع ──
  if(sel) {
    const p        = projects.find(x=>x.id===sel);
    const st       = projStats(sel);
    const contract = p?.contract||0;
    const pct      = contract>0?Math.min(100,Math.round(st.totR/contract*100)):0;
    const uncollected = Math.max(0, contract - st.totR);
    const netBal   = st.totR - st.totS;
    const recs = receipts.filter(r=>r.projectId===sel).sort((a,b)=>b.date.localeCompare(a.date));
    const spns = spends.filter(s=>s.projectId===sel).sort((a,b)=>b.date.localeCompare(a.date));
    const typeCol = p?.type==="واجهات"?C.blue:p?.type==="ديكور"?C.purple:p?.type==="مقاولات"?"#0f766e":C.gold;

    return (
      <div style={{padding:20,paddingBottom:30}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <BackBtn onClick={()=>setSel(null)}/>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.text}}>{p?.name}</div>
            <span style={{fontSize:12,fontWeight:700,color:typeCol,
              background:typeCol+"18",padding:"2px 10px",borderRadius:20}}>
              {p?.type}
            </span>
          </div>
        </div>

        {/* ١. قيمة العقد */}
        <div style={{
          background:"linear-gradient(145deg,#1C1410,#2d1f15)",
          borderRadius:20,padding:22,marginBottom:12,color:"#fff",
          boxShadow:"0 6px 24px rgba(28,20,16,0.3)",
        }}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",
            fontWeight:700,letterSpacing:1,marginBottom:6}}>قيمة العقد الكلية</div>
          <div style={{fontSize:30,fontWeight:900,color:C.gold,
            letterSpacing:-1,marginBottom:4}}>
            {fmtD(contract)}
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:16}}>
            {numToWords(contract)} دينار
          </div>
          {/* شريط التحصيل */}
          <div style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:11,marginBottom:6}}>
              <span style={{color:"rgba(255,255,255,0.5)"}}>نسبة التحصيل</span>
              <span style={{fontWeight:800,fontSize:14,color:C.gold}}>{toAr(pct)}%</span>
            </div>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:999,height:8,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:999,
                background:`linear-gradient(90deg,${C.gold},#fbbf24)`,
                width:`${pct}%`,transition:"width 0.5s"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:3}}>✅ تم التحصيل</div>
              <div style={{fontSize:15,fontWeight:800,color:"#4ade80"}}>{fmtD(st.totR)}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:3}}>⏳ المتبقي للتحصيل</div>
              <div style={{fontSize:15,fontWeight:800,color:uncollected>0?"#fbbf24":"#4ade80"}}>
                {fmtD(uncollected)}
              </div>
            </div>
          </div>
        </div>

        {/* ٢. رصيد المشروع (استلام - مصروف) */}
        <div style={{
          background:netBal>=0?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",
          borderRadius:18,padding:18,marginBottom:12,color:"#fff",
          boxShadow:`0 4px 20px ${netBal>=0?"rgba(22,101,52,0.25)":"rgba(153,27,27,0.25)"}`,
        }}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:4,letterSpacing:1}}>
            صافي المشروع (استلام − مصروف)
          </div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1,marginBottom:14}}>
            {netBal>=0?"+":"-"}{fmtD(netBal)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"12px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.55)",marginBottom:4}}>
                ↓ استلام ({toAr(st.recCount)})
              </div>
              <div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{fmtD(st.totR)}</div>
              {st.totRDol>0&&<div style={{fontSize:10,color:"#4ade80",marginTop:2}}>+ {toAr(st.totRDol)} $</div>}
            </div>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"12px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.55)",marginBottom:4}}>
                ↑ مصروف ({toAr(st.speCount)})
              </div>
              <div style={{fontSize:16,fontWeight:800,color:"#f87171"}}>{fmtD(st.totS)}</div>
              {st.totSDol>0&&<div style={{fontSize:10,color:"#f87171",marginTop:2}}>+ {toAr(st.totSDol)} $</div>}
            </div>
          </div>
        </div>

        {/* ٣. سجل الاستلامات */}
        <div style={{fontWeight:800,fontSize:14,color:C.green,
          marginBottom:10,marginTop:8,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:4,height:16,background:C.green,borderRadius:2}}/>
          الاستلامات ({toAr(recs.length)})
        </div>
        {recs.length===0
          ?<div style={{...S.card,color:C.muted,textAlign:"center",padding:16,fontSize:13}}>لا يوجد استلامات</div>
          :recs.map(r=>(
            <div key={r.id} style={{...S.card}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1,marginLeft:10}}>
                  {r.txId&&<div style={{fontSize:9,color:C.muted,fontFamily:"monospace",
                    marginBottom:2,letterSpacing:0.5}}>#{r.txId}</div>}
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                    {r.generalDesc||r.source||"استلام"}
                  </div>
                  {r.amtWords&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{r.amtWords}</div>}
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>📅 {r.date}</div>
                  {r.note&&<div style={{fontSize:11,color:C.text,marginTop:2}}>{r.note}</div>}
                </div>
                <div style={{fontWeight:900,fontSize:16,color:C.green,
                  background:"rgba(22,101,52,0.08)",padding:"5px 14px",
                  borderRadius:12,flexShrink:0}}>
                  +{fmt(r.amount,r.currency)}
                </div>
              </div>
            </div>
          ))
        }

        {/* ٤. سجل المصروفات */}
        <div style={{fontWeight:800,fontSize:14,color:C.red,
          marginBottom:10,marginTop:16,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:4,height:16,background:C.red,borderRadius:2}}/>
          المصروفات ({toAr(spns.length)})
        </div>
        {spns.length===0
          ?<div style={{...S.card,color:C.muted,textAlign:"center",padding:16,fontSize:13}}>لا يوجد مصروفات</div>
          :spns.map(r=>(
            <div key={r.id} style={{...S.card}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  {r.txId&&<div style={{fontSize:9,color:C.muted,fontFamily:"monospace",marginBottom:2}}>#{r.txId}</div>}
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{r.note||r.dest||"صرف"}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>📅 {r.date}</div>
                </div>
                <div style={{fontWeight:900,fontSize:16,color:C.red,
                  background:"rgba(153,27,27,0.08)",padding:"5px 14px",
                  borderRadius:12,flexShrink:0}}>
                  -{fmt(r.amount,r.currency)}
                </div>
              </div>
            </div>
          ))
        }
      </div>
    );
  }

  // ── قائمة المشاريع ──
  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>🏗️ المشاريع</div>
        <button onClick={()=>setShow(v=>!v)} style={{
          ...S.btn,width:"auto",padding:"10px 20px",
          background:C.gold,color:"#fff",fontSize:14,
        }}>{show?"✕ إغلاق":"+ مشروع"}</button>
      </div>

      {/* نموذج الإضافة */}
      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${C.gold}40`}}>
          <Lbl>اسم المشروع</Lbl>
          <input style={{...S.inp,marginBottom:12}}
            placeholder="مثال: فيلا الكرادة، برج المنصور..."
            value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
            autoFocus onKeyDown={e=>e.key==="Enter"&&save()}/>

          <Lbl>نوع المشروع</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {PROJ_TYPES.map(t=>(
              <button key={t} onClick={()=>setForm(f=>({...f,type:t}))} style={{
                ...S.btn,padding:"10px 8px",fontSize:13,
                background:form.type===t?C.gold+"20":"transparent",
                color:form.type===t?C.gold:C.muted,
                border:`1.5px solid ${form.type===t?C.gold:C.border}`,
              }}>{t}</button>
            ))}
          </div>

          <Lbl>قيمة العقد الكلية <span style={{color:C.red}}>*</span></Lbl>
          <div style={{display:"flex",gap:8,marginBottom:6}}>
            <input style={{...S.inp,flex:2,fontSize:18,fontWeight:700,textAlign:"center"}}
              type="number" placeholder="٠"
              value={form.contract} onChange={e=>setForm(f=>({...f,contract:e.target.value}))}/>
            <select style={{...S.sel,flex:1}} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
              <option value="دينار">🇮🇶 دينار</option>
              <option value="دولار">🇺🇸 دولار</option>
            </select>
          </div>
          {Number(form.contract)>0&&(
            <div style={{fontSize:12,color:C.gold,fontWeight:600,marginBottom:12,
              padding:"6px 10px",background:"rgba(184,134,11,0.06)",borderRadius:8}}>
              ✍️ {numToWords(Number(form.contract))} {form.currency}
            </div>
          )}

          <button onClick={save} disabled={!valid||saving} style={{
            ...S.btn,
            background:valid?C.gold:C.border,
            color:valid?"#fff":C.muted,
          }}>{saving?"جاري الحفظ...":"✅ حفظ المشروع"}</button>
        </div>
      )}

      {/* قائمة المشاريع */}
      {projects.length===0
        ?<Empty icon="🏗️" text="ما في مشاريع — أضف مشروع جديد"/>
        :projects.map(p=>{
          const st      = projStats(p.id);
          const contract= p.contract||0;
          const pct     = contract>0?Math.min(100,Math.round(st.totR/contract*100)):0;
          const isPos   = st.bal>=0;
          const hasTx   = st.totR>0||st.totS>0;

          // لون النوع
          const typeCol = p.type==="واجهات"?C.blue:p.type==="ديكور"?C.purple:p.type==="مقاولات"?"#0f766e":C.muted;

          return (
            <div key={p.id} style={{
              ...S.card,cursor:"pointer",
              border:`1px solid ${hasTx?(isPos?"rgba(22,101,52,0.2)":"rgba(153,27,27,0.2)"):C.border}`,
            }} onClick={()=>setSel(p.id)}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>{p.name}</div>
                  <span style={{fontSize:11,fontWeight:700,color:typeCol,
                    background:typeCol+"15",padding:"3px 10px",borderRadius:20}}>
                    {p.type||"عام"}
                  </span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{
                    fontWeight:900,fontSize:16,
                    color:isPos?C.green:C.red,
                    background:isPos?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)",
                    padding:"6px 14px",borderRadius:14,
                  }}>
                    {isPos?"+":"-"}{fmtD(st.bal)}
                  </div>
                  <button onClick={e=>{e.stopPropagation();if(window.confirm(`تحذف "${p.name}"؟`))onDelete(p.id);}} style={{
                    background:"transparent",border:"none",
                    color:C.red,fontSize:16,cursor:"pointer",padding:4,
                  }}>🗑️</button>
                </div>
              </div>

              {/* قيمة العقد + التفاصيل */}
              {contract>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
                    <span>📋 العقد: {fmtD(contract)}</span>
                    <span style={{color:C.green,fontWeight:700}}>تحصّل {toAr(pct)}%</span>
                  </div>
                  <div style={{background:C.border,borderRadius:999,height:5,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:999,
                      background:"linear-gradient(90deg,#14532d,#22c55e)",
                      width:`${pct}%`,transition:"width 0.4s"}}/>
                  </div>
                </div>
              )}

              {/* استلام ومصروف */}
              {hasTx&&(
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1,background:"rgba(22,101,52,0.06)",borderRadius:10,padding:"7px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.muted}}>↓ استلام</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.green}}>{fmtD(st.totR)}</div>
                  </div>
                  <div style={{flex:1,background:"rgba(153,27,27,0.06)",borderRadius:10,padding:"7px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.muted}}>↑ صرف</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.red}}>{fmtD(st.totS)}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}

// ══════════ App ══════════
export default function App() {
  const [page,     setPage]    = useState("home");
  const [loading,  setLoading] = useState(true);
  const [receipts, setReceipts]= useState([]);
  const [spends,   setSpends]  = useState([]);
  const [salaries, setSalaries]= useState([]);
  const [projects, setProjects]= useState([]);

  // تحميل Tabler Icons
  useEffect(()=>{
    if(!document.querySelector('#tabler-icons')){
      const link=document.createElement('link');
      link.id='tabler-icons';
      link.rel='stylesheet';
      link.href='https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css';
      document.head.appendChild(link);
    }
  },[]);

  useEffect(()=>{
    const u = [];
    const to = setTimeout(()=>setLoading(false), 8000);

    u.push(onSnapshot(query(collection(db,"receipts_v1"),orderBy("date","desc"),limit(300)),
      s=>{setReceipts(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false);},
      ()=>setLoading(false)));

    u.push(onSnapshot(query(collection(db,"spends_v1"),orderBy("date","desc"),limit(300)),
      s=>setSpends(s.docs.map(d=>({id:d.id,...d.data()})))));

    u.push(onSnapshot(query(collection(db,"salaries_v1"),orderBy("date","desc"),limit(200)),
      s=>setSalaries(s.docs.map(d=>({id:d.id,...d.data()})))));

    u.push(onSnapshot(collection(db,"projects_v2"),
      s=>setProjects(s.docs.map(d=>({id:d.id,...d.data()})))));

    return ()=>{u.forEach(fn=>fn()); clearTimeout(to);};
  },[]);

  const addDoc2 = (col,data) => addDoc(collection(db,col),data);
  const del     = (col,id)   => deleteDoc(doc(db,col,id));

  const addProject = async form => {
    if(typeof form === "string")
      await addDoc(collection(db,"projects_v2"),{name:form,type:"عام",contract:0,currency:"دينار",createdAt:new Date().toISOString()});
    else
      await addDoc(collection(db,"projects_v2"),{...form});
  };
  const delProject = async id => deleteDoc(doc(db,"projects_v2",id));

  if(loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:14,
      fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{fontSize:56}}>📊</div>
      <div style={{fontSize:24,fontWeight:900,color:C.gold}}>حساب</div>
      <div style={{fontSize:13,color:C.muted}}>جاري التحميل...</div>
    </div>
  );

  const PAGES = {
    home:     <HomePage receipts={receipts} spends={spends} salaries={salaries} onNavigate={setPage}/>,
    receive:  <ReceivePage receipts={receipts} projects={projects} onAdd={d=>addDoc2("receipts_v1",d)} onDelete={id=>del("receipts_v1",id)}/>,
    spend:    <SpendPage spends={spends} projects={projects} onAdd={d=>addDoc2("spends_v1",d)} onDelete={id=>del("spends_v1",id)}/>,
    report:   <ReportPage receipts={receipts} spends={spends} projects={projects}/>,
    salary:   <SalaryPage salaries={salaries} onAdd={d=>addDoc2("salaries_v1",d)} onDelete={id=>del("salaries_v1",id)}/>,
    projects: <ProjectsPage projects={projects} receipts={receipts} spends={spends} onAdd={addProject} onDelete={delProject}/>,
  };

  const NAV_ITEMS = [
    {id:"home",     icon:"ti-layout-dashboard", label:"الرئيسية"},
    {id:"receive",  icon:"ti-arrow-down-circle", label:"الاستلام",  col:"#166534"},
    {id:"spend",    icon:"ti-arrow-up-circle",   label:"المصروف",   col:"#991B1B"},
    {id:"projects", icon:"ti-building",          label:"المشاريع",  col:"#92400E"},
    {id:"report",   icon:"ti-chart-bar",         label:"التقرير",   col:"#1E40AF"},
    {id:"salary",   icon:"ti-wallet",            label:"الرواتب",   col:"#6B21A8"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#F4F2EE",fontFamily:"Tahoma,Arial,sans-serif",direction:"rtl",display:"flex"}}>

      {/* SIDEBAR */}
      <div style={{width:220,minHeight:"100vh",background:"#1C1410",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
        <div style={{padding:"28px 20px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#E8C87A",letterSpacing:0.5}}>حساب</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:3}}>النظام المالي</div>
        </div>
        <nav style={{flex:1,padding:"12px 10px",overflowY:"auto"}}>
          {NAV_ITEMS.map(n=>{
            const active=page===n.id;
            return (
              <button key={n.id} onClick={()=>setPage(n.id)} style={{
                width:"100%",display:"flex",alignItems:"center",gap:10,
                padding:"11px 14px",marginBottom:2,borderRadius:10,border:"none",cursor:"pointer",
                background:active?"rgba(232,200,122,0.12)":"transparent",
                color:active?"#E8C87A":"rgba(255,255,255,0.5)",
                textAlign:"right",fontSize:14,fontWeight:active?700:400,fontFamily:"Tahoma",
                borderRight:active?"3px solid #E8C87A":"3px solid transparent",
              }}>
                <i className={`ti ${n.icon}`} style={{fontSize:18,color:active?"#E8C87A":"rgba(255,255,255,0.35)",flexShrink:0}} aria-hidden="true"/>
                {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{padding:"16px 20px",borderTop:"1px solid rgba(255,255,255,0.08)",fontSize:11,color:"rgba(255,255,255,0.2)"}}>
          نظام حساب v2.0
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",overflow:"auto"}}>
        {/* Header */}
        <div style={{background:"#fff",borderBottom:"1px solid #E5DDD4",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
          <div style={{fontSize:16,fontWeight:700,color:"#1C1410"}}>
            {NAV_ITEMS.find(n=>n.id===page)?.label||"الرئيسية"}
          </div>
          <div style={{fontSize:12,color:"#8A7060"}}>
            {new Date().toLocaleDateString("ar-IQ",{year:"numeric",month:"long",day:"numeric"})}
          </div>
        </div>
        {/* Content */}
        <div style={{flex:1,maxWidth:680,width:"100%",margin:"0 auto",padding:"4px 0 40px"}}>
          {PAGES[page]||PAGES.home}
        </div>
      </div>
    </div>
  );
}
