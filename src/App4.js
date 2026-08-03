import React, { useState, useEffect } from "react";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, getDocs,
  deleteDoc, doc, updateDoc, setDoc, query, where } from "firebase/firestore";

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
  const x=Math.floor(Math.abs(Number(n)||0));if(!x)return"صفر";
  const o=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t2=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h=["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g=v=>{if(!v)return"";if(v<20)return o[v];if(v<100)return t2[Math.floor(v/10)]+(v%10?" و"+o[v%10]:"");return h[Math.floor(v/100)]+(v%100?" و"+g(v%100):"");};
  const p=[];if(x>=1e9)p.push(g(Math.floor(x/1e9))+" مليار");if(x%1e9>=1e6)p.push(g(Math.floor(x%1e9/1e6))+" مليون");if(x%1e6>=1e3)p.push(g(Math.floor(x%1e6/1e3))+" ألف");if(x%1e3)p.push(g(x%1e3));return p.join(" و");
}
const PASS = "1234";
const ASSET_TYPES = ["معدات","مركبات","عقارات","أثاث","أجهزة","أخرى"];
const ASSET_FUNDS = ["عام","إشراف","ديكور","مقاولات","واجهات"];
const EXPENSE_FUNDS  = ["عام","إشراف","ديكور","مقاولات","واجهات"];
const EXPENSE_CYCLES = ["شهري","ربع سنوي","نصف سنوي","سنوي","مرة واحدة"];
const EXPENSE_TYPES  = ["إيجار","اشتراك","صيانة","خدمات","أخرى"];


// ─── صفحة الأصول الثابتة ─────────────────────────────

export function AssetsPage({ funds, onBack }) {
  const [assets,      setAssets]    = useState([]);
  const [tab,         setTab]       = useState("active");
  const [showAdd,     setShowAdd]   = useState(false);
  const [sellTarget,  setSellTarget]= useState(null);
  const [sellQty,     setSellQty]   = useState("1");
  const [sellForm,    setSellForm]  = useState({
    priceDin:"", priceDol:"",
    date: new Date().toISOString().split("T")[0], note:""
  });
  const [form, setForm] = useState({
    name:"", type:"معدات", fund:"عام",
    qty:"1", unitPriceDin:"", unitPriceDol:"",
    date: new Date().toISOString().split("T")[0], note:""
  });
  const sf  = k => v => setForm(f=>({...f,[k]:v}));
  const ssf = k => v => setSellForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    return onSnapshot(collection(db,"assets"), snap=>{
      const list = snap.docs.map(d=>({id:d.id,...d.data()}));
      list.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
      setAssets(list);
    });
  },[]);

  const addAsset = async () => {
    const qty  = Number(form.qty)||1;
    const uDin = Number(form.unitPriceDin)||0;
    const uDol = Number(form.unitPriceDol)||0;
    if (!form.name.trim()||qty<1||(!uDin&&!uDol)) return;
    const pw = window.prompt("🔒 أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    const totalDin = uDin*qty, totalDol = uDol*qty;
    const bal = funds[form.fund]||{din:0,dol:0};
    if (totalDin > bal.din) { alert("⛔ رصيد الدينار غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع"); return; }
    if (totalDol > bal.dol) { alert("⛔ رصيد الدولار غير كافٍ — المتاح: "+fNum(bal.dol)+" $"); return; }
    await addDoc(collection(db,"assets"),{
      name:form.name.trim(), type:form.type, fund:form.fund,
      qty, qtyRemaining:qty, soldQty:0,
      unitPriceDin:uDin, unitPriceDol:uDol,
      totalDin, totalDol,
      date:form.date, note:form.note.trim(),
      status:"active", createdAt:new Date().toISOString()
    });
    await setDoc(doc(db,"funds",form.fund),{din:bal.din-totalDin,dol:bal.dol-totalDol},{merge:true});
    await addDoc(collection(db,"fund_txs"),{
      fundId:form.fund, fundLabel:form.fund, type:"صرف",
      din:totalDin, dol:totalDol,
      note:"شراء "+qty+"× "+form.name.trim(),
      date:form.date, createdAt:new Date().toISOString()
    });
    setForm({name:"",type:"معدات",fund:"عام",qty:"1",unitPriceDin:"",unitPriceDol:"",
      date:new Date().toISOString().split("T")[0],note:""});
    setShowAdd(false);
  };

  const doSell = async () => {
    if (!sellTarget) return;
    const a   = sellTarget;
    const qty = Math.min(Number(sellQty)||1, a.qtyRemaining||0);
    if (qty<1) return;
    const pDin = Number(sellForm.priceDin)||0;
    const pDol = Number(sellForm.priceDol)||0;
    if (!pDin&&!pDol) return;
    const pw = window.prompt("🔒 أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    const profitDin = pDin - (a.unitPriceDin||0)*qty;
    const profitDol = pDol - (a.unitPriceDol||0)*qty;
    const newQty    = (a.qtyRemaining||0) - qty;
    const bal = funds[a.fund]||{din:0,dol:0};
    await setDoc(doc(db,"funds",a.fund),{din:bal.din+pDin,dol:bal.dol+pDol},{merge:true});
    await addDoc(collection(db,"fund_txs"),{
      fundId:a.fund, fundLabel:a.fund, type:"إيداع",
      din:pDin, dol:pDol,
      note:"بيع "+qty+"× "+a.name,
      date:sellForm.date, createdAt:new Date().toISOString()
    });
    await addDoc(collection(db,"asset_sales"),{
      assetId:a.id, assetName:a.name, qty,
      sellPriceDin:pDin, sellPriceDol:pDol,
      unitBuyDin:a.unitPriceDin||0, unitBuyDol:a.unitPriceDol||0,
      profitDin, profitDol, fund:a.fund,
      date:sellForm.date, note:sellForm.note,
      createdAt:new Date().toISOString()
    });
    await updateDoc(doc(db,"assets",a.id),{
      qtyRemaining:newQty,
      soldQty:(a.soldQty||0)+qty,
      status:newQty===0?"sold":"active",
      lastSellDate:sellForm.date
    });
    setSellTarget(null);
    setSellQty("1");
    setSellForm({priceDin:"",priceDol:"",date:new Date().toISOString().split("T")[0],note:""});
  };

  const list = tab==="active"
    ? assets.filter(a=>(a.qtyRemaining||0)>0)
    : assets;
  const totalActive = assets.filter(a=>(a.qtyRemaining||0)>0).reduce((s,a)=>s+(a.qtyRemaining||0),0);
  const totalSold   = assets.reduce((s,a)=>s+(a.soldQty||0),0);

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:700,margin:"0 auto",padding:"22px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
          ← رجوع
        </button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#0891B2,#06B6D4)",
          borderRadius:16,padding:"20px 24px",marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:12}}>
            📦 الأصول الثابتة
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[
              {l:"أنواع مختلفة",v:new Set(assets.map(a=>a.name)).size},
              {l:"وحدات نشطة", v:totalActive},
              {l:"وحدات مباعة",v:totalSold},
            ].map(({l,v},i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.15)",
                borderRadius:10,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#CFFAFE",marginBottom:4}}>{l}</div>
                <div style={{fontSize:24,fontWeight:700,color:"#fff"}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* تبويبات + زر إضافة */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:14}}>
          {[{v:"active",l:"● النشطة"},{v:"all",l:"📋 الكل"}].map(({v,l})=>(
            <button key={v} onClick={()=>setTab(v)} style={{
              border:"none",borderRadius:10,padding:"11px",cursor:"pointer",
              fontFamily:"Tahoma",fontSize:13,fontWeight:700,
              background:tab===v?"#0891B2":"#fff",color:tab===v?"#fff":"#64748B"}}>
              {l}</button>
          ))}
          <button onClick={()=>setShowAdd(v=>!v)} style={{
            border:"none",borderRadius:10,padding:"11px 16px",cursor:"pointer",
            fontFamily:"Tahoma",fontSize:13,fontWeight:700,
            background:showAdd?"#475569":"#1E293B",color:"#fff",whiteSpace:"nowrap"}}>
            {showAdd?"✕ إلغاء":"+ أصل جديد"}
          </button>
        </div>

        {/* فورم الإضافة */}
        {showAdd && (
          <div style={{background:"#fff",borderRadius:14,padding:20,
            border:"1px solid #E2E8F0",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:16}}>
              + تسجيل أصل جديد
            </div>

            {/* الاسم */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>اسم الأصل *</div>
              <input placeholder="مثال: مكينة حفر، كرفان، سيارة..." value={form.name}
                onChange={e=>sf("name")(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
            </div>

            {/* النوع */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>النوع</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                {ASSET_TYPES.map(t=>(
                  <button key={t} onClick={()=>sf("type")(t)} style={{
                    border:"1.5px solid "+(form.type===t?"#0891B2":"#E2E8F0"),
                    borderRadius:8,padding:"7px 4px",cursor:"pointer",
                    fontFamily:"Tahoma",fontSize:11,fontWeight:600,
                    background:form.type===t?"#ECFEFF":"#fff",
                    color:form.type===t?"#0891B2":"#64748B"}}>{t}</button>
                ))}
              </div>
            </div>

            {/* الكمية وسعر الوحدة */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#0891B2",fontWeight:700,marginBottom:5}}>
                  الكمية *
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <button onClick={()=>sf("qty")(q=>String(Math.max(1,Number(q)-1)))}
                    style={{width:36,height:36,borderRadius:8,border:"1px solid #E2E8F0",
                      background:"#fff",fontSize:18,cursor:"pointer",fontFamily:"Tahoma",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <input type="text" inputMode="numeric" value={form.qty}
                    onChange={e=>sf("qty")(e.target.value.replace(/[^0-9]/g,"")||"1")}
                    style={{flex:1,border:"2px solid #0891B2",borderRadius:9,
                      padding:"8px",fontSize:20,fontWeight:700,textAlign:"center",
                      outline:"none",fontFamily:"Tahoma",background:"#ECFEFF"}}/>
                  <button onClick={()=>sf("qty")(q=>String(Number(q)+1))}
                    style={{width:36,height:36,borderRadius:8,border:"1px solid #E2E8F0",
                      background:"#fff",fontSize:18,cursor:"pointer",fontFamily:"Tahoma",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:"#D97706",fontWeight:600,marginBottom:5}}>
                  سعر الوحدة دينار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={form.unitPriceDin}
                  onChange={e=>sf("unitPriceDin")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                {Number(form.unitPriceDin)>0 && (
                  <div style={{fontSize:10,color:"#D97706",marginTop:3}}>
                    ✍️ {w2(Number(form.unitPriceDin))} دينار
                    {Number(form.qty)>1&&<span style={{color:"#64748B"}}> → إجمالي: {fNum(Number(form.unitPriceDin)*Number(form.qty))} د.ع</span>}
                  </div>
                )}
              </div>
              <div>
                <div style={{fontSize:12,color:"#2563EB",fontWeight:600,marginBottom:5}}>
                  سعر الوحدة دولار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={form.unitPriceDol}
                  onChange={e=>sf("unitPriceDol")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                {Number(form.unitPriceDol)>0 && (
                  <div style={{fontSize:10,color:"#2563EB",marginTop:3}}>
                    ✍️ {w2(Number(form.unitPriceDol))} دولار
                    {Number(form.qty)>1&&<span style={{color:"#64748B"}}> → إجمالي: {fNum(Number(form.unitPriceDol)*Number(form.qty))} $</span>}
                  </div>
                )}
              </div>
            </div>

            {/* ملخص الشراء */}
            {form.name.trim() && (Number(form.unitPriceDin)||Number(form.unitPriceDol)) && (
              <div style={{background:"#ECFEFF",borderRadius:10,padding:14,
                marginBottom:12,border:"2px solid #0891B2"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#0891B2",marginBottom:6}}>
                  📋 ملخص الشراء
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,fontSize:12}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{color:"#64748B",marginBottom:2}}>الأصل</div>
                    <div style={{fontWeight:700,color:"#1E293B"}}>{form.name}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{color:"#64748B",marginBottom:2}}>الكمية</div>
                    <div style={{fontWeight:700,fontSize:20,color:"#0891B2"}}>{form.qty}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{color:"#64748B",marginBottom:2}}>الإجمالي</div>
                    {Number(form.unitPriceDin)>0&&<div style={{fontWeight:700,color:"#D97706"}}>{fNum(Number(form.unitPriceDin)*Number(form.qty))} د.ع</div>}
                    {Number(form.unitPriceDol)>0&&<div style={{fontWeight:700,color:"#2563EB"}}>{fNum(Number(form.unitPriceDol)*Number(form.qty))} $</div>}
                  </div>
                </div>
              </div>
            )}

            {/* الصندوق والتاريخ */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الصندوق المصدر</div>
                <select value={form.fund} onChange={e=>sf("fund")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                  {ASSET_FUNDS.map(f=>{
                    const b=funds[f]||{din:0,dol:0};
                    return <option key={f} value={f}>{f} — {fNum(b.din)} د.ع{b.dol>0?" | "+fNum(b.dol)+" $":""}</option>;
                  })}
                </select>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>تاريخ الشراء</div>
                <input type="date" value={form.date} onChange={e=>sf("date")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
              <input placeholder="مورد، موقع، أي تفصيل..." value={form.note}
                onChange={e=>sf("note")(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
            </div>

            <button onClick={addAsset}
              disabled={!form.name.trim()||!Number(form.qty)||(!Number(form.unitPriceDin)&&!Number(form.unitPriceDol))}
              style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
                fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                background:form.name.trim()&&Number(form.qty)&&(Number(form.unitPriceDin)||Number(form.unitPriceDol))?"#0891B2":"#E2E8F0",
                color:form.name.trim()&&Number(form.qty)&&(Number(form.unitPriceDin)||Number(form.unitPriceDol))?"#fff":"#94A3B8"}}>
              ✅ تسجيل وخصم من الصندوق
            </button>
          </div>
        )}

        {/* قائمة الأصول */}
        {list.length===0 ? (
          <div style={{background:"#fff",borderRadius:14,padding:30,
            textAlign:"center",color:"#94A3B8",border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:40,marginBottom:8}}>📦</div>
            <div>ما في أصول</div>
          </div>
        ) : list.map(a=>(
          <div key={a.id} style={{background:"#fff",borderRadius:14,padding:"16px 18px",
            marginBottom:10,border:"1px solid #E2E8F0",
            borderRight:"5px solid "+((a.qtyRemaining||0)>0?"#0891B2":"#94A3B8")}}>

            <div style={{display:"grid",gridTemplateColumns:"1fr auto",
              gap:12,alignItems:"start",marginBottom:12}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#1E293B",marginBottom:4}}>
                  {a.name}
                </div>
                <div style={{fontSize:11,color:"#64748B"}}>
                  📂 {a.type} · 🏦 {a.fund} · 📅 {a.date}
                  {a.note&&" · "+a.note}
                </div>
              </div>
              {(a.qtyRemaining||0)>0 && (
                <button onClick={()=>{setSellTarget(a);setSellQty("1");}} style={{
                  background:"#FFF7ED",border:"1.5px solid #F97316",
                  borderRadius:9,padding:"8px 16px",cursor:"pointer",
                  fontSize:12,fontFamily:"Tahoma",fontWeight:700,color:"#F97316"}}>
                  💰 بيع
                </button>
              )}
            </div>

            {/* شريط الكميات */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[
                {l:"الإجمالي",  v:a.qty||0,        c:"#1E293B", bg:"#F1F5F9"},
                {l:"مباع",      v:a.soldQty||0,    c:"#F97316", bg:"#FFF7ED"},
                {l:"⬛ متبقي",   v:a.qtyRemaining||0,c:(a.qtyRemaining||0)>0?"#0891B2":"#94A3B8",
                  bg:(a.qtyRemaining||0)>0?"#ECFEFF":"#F8FAFC",
                  border:(a.qtyRemaining||0)>0?"2px solid #0891B2":"1px solid #E2E8F0"},
              ].map(({l,v,c,bg,border},i)=>(
                <div key={i} style={{background:bg,borderRadius:10,padding:"10px",
                  textAlign:"center",border:border||"1px solid transparent"}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:"#94A3B8"}}>وحدة</div>
                </div>
              ))}
            </div>

            {/* الأسعار */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {(a.unitPriceDin||0)>0&&(
                <span style={{background:"#FFFBEB",borderRadius:7,padding:"4px 10px",
                  fontSize:11,color:"#D97706",fontWeight:700}}>
                  {fNum(a.unitPriceDin)} د.ع / وحدة
                  {(a.qty||0)>1&&<span style={{color:"#94A3B8",fontWeight:400}}> | إجمالي: {fNum((a.totalDin||0))} د.ع</span>}
                </span>
              )}
              {(a.unitPriceDol||0)>0&&(
                <span style={{background:"#EFF6FF",borderRadius:7,padding:"4px 10px",
                  fontSize:11,color:"#2563EB",fontWeight:700}}>
                  {fNum(a.unitPriceDol)} $ / وحدة
                </span>
              )}
              {(a.qtyRemaining||0)===0&&(
                <span style={{background:"#F1F5F9",borderRadius:7,padding:"4px 10px",
                  fontSize:11,color:"#64748B"}}>✓ مباع بالكامل · {a.lastSellDate||""}</span>
              )}
            </div>
          </div>
        ))}

        {/* نافذة البيع */}
        {sellTarget && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
            zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:460,
              maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
              <div style={{padding:"18px 22px",borderBottom:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:"#F97316"}}>
                  💰 بيع — {sellTarget.name}
                </div>
                <button onClick={()=>setSellTarget(null)} style={{background:"none",
                  border:"none",fontSize:20,cursor:"pointer",color:"#64748B"}}>✕</button>
              </div>
              <div style={{padding:"20px 22px"}}>

                {/* الكميات الحالية */}
                <div style={{background:"#F8FAFC",borderRadius:12,padding:14,marginBottom:18}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center"}}>
                    {[{l:"الإجمالي",v:sellTarget.qty||0,c:"#1E293B"},
                      {l:"مباع",   v:sellTarget.soldQty||0,c:"#F97316"},
                      {l:"متبقي",  v:sellTarget.qtyRemaining||0,c:"#16A34A"}].map(({l,v,c},i)=>(
                      <div key={i}>
                        <div style={{fontSize:10,color:"#64748B",marginBottom:3}}>{l}</div>
                        <div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:"#64748B",textAlign:"center"}}>
                    سعر الشراء: {fNum(sellTarget.unitPriceDin||0)} د.ع / وحدة
                    {(sellTarget.unitPriceDol||0)>0&&" | "+fNum(sellTarget.unitPriceDol)+" $"}
                  </div>
                </div>

                {/* اختيار الكمية */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:10}}>
                    كم وحدة تريد تبيع؟
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <button onClick={()=>setSellQty(q=>String(Math.max(1,Number(q)-1)))}
                      style={{width:48,height:48,borderRadius:12,border:"1px solid #E2E8F0",
                        background:"#fff",fontSize:24,cursor:"pointer",fontFamily:"Tahoma"}}>−</button>
                    <input type="text" inputMode="numeric" value={sellQty}
                      onChange={e=>{
                        const v=Number(e.target.value.replace(/[^0-9]/g,""))||1;
                        setSellQty(String(Math.min(sellTarget.qtyRemaining||0,Math.max(1,v))));
                      }}
                      style={{flex:1,border:"2px solid #F97316",borderRadius:12,
                        padding:"10px",fontSize:28,fontWeight:700,textAlign:"center",
                        outline:"none",fontFamily:"Tahoma"}}/>
                    <button onClick={()=>setSellQty(q=>String(Math.min(sellTarget.qtyRemaining||0,Number(q)+1)))}
                      style={{width:48,height:48,borderRadius:12,border:"1px solid #E2E8F0",
                        background:"#fff",fontSize:24,cursor:"pointer",fontFamily:"Tahoma"}}>+</button>
                  </div>
                  <div style={{textAlign:"center",fontSize:12,color:"#64748B",marginTop:8}}>
                    تكلفة الشراء: {fNum((sellTarget.unitPriceDin||0)*Number(sellQty))} د.ع
                  </div>
                </div>

                {/* سعر البيع */}
                {[{k:"priceDin",l:"سعر البيع دينار",c:"#16A34A",buy:(sellTarget.unitPriceDin||0)*Number(sellQty)},
                  {k:"priceDol",l:"سعر البيع دولار",c:"#2563EB",buy:(sellTarget.unitPriceDol||0)*Number(sellQty)}
                ].map(({k,l,c,buy})=>(
                  <div key={k} style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                    <input type="text" inputMode="numeric" placeholder="٠" value={sellForm[k]}
                      onChange={e=>ssf(k)(e.target.value.replace(/[^0-9]/g,""))}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                    {Number(sellForm[k])>0 && (
                      <div style={{fontSize:11,fontWeight:600,marginTop:4,
                        display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:c}}>✍️ {w2(Number(sellForm[k]))} {k==="priceDin"?"دينار":"دولار"}</span>
                        {buy>0&&(
                          <span style={{color:Number(sellForm[k])>=buy?"#16A34A":"#DC2626",fontWeight:700}}>
                            {Number(sellForm[k])>=buy?"📈 ربح":"📉 خسارة"}: {fNum(Math.abs(Number(sellForm[k])-buy))} {k==="priceDin"?"د.ع":"$"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>التاريخ</div>
                    <input type="date" value={sellForm.date} onChange={e=>ssf("date")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
                    <input placeholder="اسم المشتري..." value={sellForm.note}
                      onChange={e=>ssf("note")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                </div>

                <button onClick={doSell}
                  disabled={!Number(sellForm.priceDin)&&!Number(sellForm.priceDol)}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"14px",
                    fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:Number(sellForm.priceDin)||Number(sellForm.priceDol)?"#F97316":"#E2E8F0",
                    color:Number(sellForm.priceDin)||Number(sellForm.priceDol)?"#fff":"#94A3B8"}}>
                  ✅ تأكيد بيع {sellQty} وحدة وإضافة للصندوق
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}



// ─── صفحة الأرصدة الافتتاحية ──────────────────────────
export function OpeningBalancesPage({ funds, onBack }) {
  const ALL = [
    { id:"رأس_المال", label:"رأس المال",      icon:"💼", color:"#059669", bg:"#ECFDF5" },
    { id:"عام",       label:"الصندوق العام",  icon:"🏦", color:"#D97706", bg:"#FFFBEB" },
    { id:"شركاء",     label:"أرباح الشركاء",  icon:"👥", color:"#9333EA", bg:"#FAF5FF" },
    { id:"إشراف",    label:"صندوق الإشراف",   icon:"👷", color:"#0284C7", bg:"#F0F9FF" },
    { id:"ديكور",    label:"صندوق الديكور",   icon:"🎨", color:"#DB2777", bg:"#FDF2F8" },
    { id:"مقاولات",  label:"صندوق المقاولات", icon:"🏗️", color:"#7C3AED", bg:"#F5F3FF" },
    { id:"واجهات",   label:"صندوق الواجهات",  icon:"🏢", color:"#0891B2", bg:"#ECFEFF" },
  ];

  const [form,    setForm]    = useState({});
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // تعبئة الفورم من الأرصدة الحالية
  useEffect(()=>{
    const init = {};
    ALL.forEach(f=>{ init[f.id+"_din"]=String(funds[f.id]?.din||""); init[f.id+"_dol"]=String(funds[f.id]?.dol||""); });
    setForm(init);
  },[funds]);

  // جلب سجل الإدخالات الافتتاحية
  useEffect(()=>{
    return onSnapshot(collection(db,"opening_balances"), snap=>{
      const list = snap.docs.map(d=>({id:d.id,...d.data()}));
      list.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
      setHistory(list);
    });
  },[]);

  const sf = k => v => setForm(f=>({...f,[k]:v}));

  const hasPrevious = history.length > 0;

  const handleSave = async () => {
    if (hasPrevious) {
      const confirm = window.confirm(
        "⚠️ تحذير — تم إدخال أرصدة افتتاحية مسبقاً!\n\n" +
        "هل تريد تحديث الأرصدة؟ سيتم الكتابة فوق الأرصدة الحالية."
      );
      if (!confirm) return;
    }
    const pw = window.prompt("🔒 أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }

    setLoading(true);
    try {
      // حفظ في سجل الإدخالات
      const snapshot = {};
      for (const f of ALL) {
        snapshot[f.id] = {
          din: Number(form[f.id+"_din"])||0,
          dol: Number(form[f.id+"_dol"])||0,
        };
      }
      await addDoc(collection(db,"opening_balances"), {
        snapshot,
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split("T")[0]
      });

      // تحديث أرصدة الصناديق
      for (const f of ALL) {
        const din = Number(form[f.id+"_din"])||0;
        const dol = Number(form[f.id+"_dol"])||0;
        await setDoc(doc(db,"funds",f.id), { din, dol }, { merge: true });
      }

      setSaved(true);
      setTimeout(()=>setSaved(false), 2000);
    } catch(e) {
      alert("خطأ: " + e.message);
    }
    setLoading(false);
  };

  const totalDin = ALL.reduce((s,f)=>s+(Number(form[f.id+"_din"])||0),0);
  const totalDol = ALL.reduce((s,f)=>s+(Number(form[f.id+"_dol"])||0),0);

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"22px 16px" }}>

        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>

        {/* هيدر */}
        <div style={{ background:"linear-gradient(135deg,#1E293B,#334155)",
          borderRadius:16, padding:"20px 24px", marginBottom:20 }}>
          <div style={{ fontSize:18, fontWeight:700, color:"#fff", marginBottom:6 }}>
            🏁 الأرصدة الافتتاحية
          </div>
          <div style={{ fontSize:13, color:"#94A3B8", lineHeight:1.7 }}>
            أدخل المبالغ الموجودة في كل صندوق عند بدء استخدام النظام.
            هذه الأرصدة هي نقطة البداية التي تُبنى عليها جميع العمليات.
          </div>
          {hasPrevious && (
            <div style={{ marginTop:12, background:"rgba(251,191,36,0.2)",
              border:"1px solid rgba(251,191,36,0.4)", borderRadius:10,
              padding:"10px 14px", fontSize:12, color:"#FCD34D" }}>
              ⚠️ تم إدخال أرصدة افتتاحية مسبقاً بتاريخ {history[0].date} —
              أي تعديل سيؤثر على الأرصدة الحالية
            </div>
          )}
        </div>

        {/* ملخص الإجمالي */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:12, marginBottom:20 }}>
          <div style={{ background:"#fff", borderRadius:12, padding:"14px 18px",
            border:"2px solid #D97706" }}>
            <div style={{ fontSize:11, color:"#64748B", marginBottom:4 }}>
              🇮🇶 إجمالي الدينار الافتتاحي
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:"#D97706" }}>
              {fNum(totalDin)}
            </div>
            <div style={{ fontSize:11, color:"#94A3B8" }}>د.ع</div>
            {totalDin>0&&(
              <div style={{ fontSize:11, color:"#64748B", marginTop:4 }}>
                ✍️ {w2(totalDin)} دينار عراقي
              </div>
            )}
          </div>
          <div style={{ background:"#fff", borderRadius:12, padding:"14px 18px",
            border:"2px solid #2563EB" }}>
            <div style={{ fontSize:11, color:"#64748B", marginBottom:4 }}>
              🇺🇸 إجمالي الدولار الافتتاحي
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:"#2563EB" }}>
              {fNum(totalDol)}
            </div>
            <div style={{ fontSize:11, color:"#94A3B8" }}>$</div>
            {totalDol>0&&(
              <div style={{ fontSize:11, color:"#64748B", marginTop:4 }}>
                ✍️ {w2(totalDol)} دولار أمريكي
              </div>
            )}
          </div>
        </div>

        {/* جدول الإدخال */}
        <div style={{ background:"#fff", borderRadius:14, padding:20,
          border:"1px solid #E2E8F0", marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:16 }}>
            أدخل الرصيد الافتتاحي لكل صندوق
          </div>

          {ALL.map(f=>(
            <div key={f.id} style={{ borderRadius:12, padding:"14px 16px",
              marginBottom:10, background:f.bg,
              border:"1px solid "+f.color+"30" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <span style={{ fontSize:20 }}>{f.icon}</span>
                <span style={{ fontSize:14, fontWeight:700, color:f.color }}>
                  {f.label}
                </span>
                {(funds[f.id]?.din||0)>0 && (
                  <span style={{ marginRight:"auto", fontSize:11, color:"#64748B" }}>
                    الرصيد الحالي: {fNum(funds[f.id]?.din||0)} د.ع
                  </span>
                )}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:"#D97706", fontWeight:600, marginBottom:5 }}>
                    🇮🇶 دينار عراقي
                  </div>
                  <input type="text" inputMode="numeric" placeholder="٠"
                    value={form[f.id+"_din"]||""}
                    onChange={e=>sf(f.id+"_din")(e.target.value.replace(/[^0-9]/g,""))}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"10px 13px", fontSize:15, outline:"none", fontFamily:"Tahoma",
                      direction:"rtl", boxSizing:"border-box", background:"#fff",
                      fontWeight: Number(form[f.id+"_din"])>0?"700":"400",
                      color: Number(form[f.id+"_din"])>0?f.color:"#94A3B8" }}/>
                  {Number(form[f.id+"_din"])>0 && (
                    <div style={{ fontSize:11, color:f.color, marginTop:3, fontWeight:600 }}>
                      ✍️ {w2(Number(form[f.id+"_din"]))} دينار
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#2563EB", fontWeight:600, marginBottom:5 }}>
                    🇺🇸 دولار أمريكي
                  </div>
                  <input type="text" inputMode="numeric" placeholder="٠"
                    value={form[f.id+"_dol"]||""}
                    onChange={e=>sf(f.id+"_dol")(e.target.value.replace(/[^0-9]/g,""))}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"10px 13px", fontSize:15, outline:"none", fontFamily:"Tahoma",
                      direction:"rtl", boxSizing:"border-box", background:"#fff",
                      fontWeight: Number(form[f.id+"_dol"])>0?"700":"400",
                      color: Number(form[f.id+"_dol"])>0?"#2563EB":"#94A3B8" }}/>
                  {Number(form[f.id+"_dol"])>0 && (
                    <div style={{ fontSize:11, color:"#2563EB", marginTop:3, fontWeight:600 }}>
                      ✍️ {w2(Number(form[f.id+"_dol"]))} دولار
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* زر الحفظ */}
        {saved ? (
          <div style={{ background:"#F0FDF4", border:"2px solid #16A34A",
            borderRadius:12, padding:"16px", textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:4 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#16A34A" }}>
              تم حفظ الأرصدة الافتتاحية بنجاح
            </div>
          </div>
        ) : (
          <button onClick={handleSave} disabled={loading} style={{
            width:"100%", border:"none", borderRadius:12, padding:"16px",
            fontSize:15, fontWeight:700, fontFamily:"Tahoma",
            cursor:loading?"not-allowed":"pointer",
            background:loading?"#E2E8F0":"#1E293B",
            color:loading?"#94A3B8":"#fff" }}>
            {loading ? "⏳ جاري الحفظ..." : "💾 حفظ الأرصدة الافتتاحية للصناديق"}
          </button>
        )}

        {/* السجل السابق */}
        {history.length > 0 && (
          <div style={{ background:"#fff", borderRadius:14, padding:16,
            border:"1px solid #E2E8F0", marginTop:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
              📋 سجل الإدخالات الافتتاحية ({history.length})
            </div>
            {history.slice(0,3).map((h,i)=>(
              <div key={h.id} style={{ borderRadius:10, padding:"12px 14px",
                marginBottom:8, background: i===0?"#F0FDF4":"#F8FAFC",
                border:"1px solid "+(i===0?"#16A34A20":"#E2E8F0") }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:700,
                    color:i===0?"#16A34A":"#64748B" }}>
                    {i===0?"✅ الأحدث":""}  {h.date}
                  </span>
                </div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", fontSize:11, color:"#64748B" }}>
                  {ALL.map(f=>{
                    const din = h.snapshot?.[f.id]?.din||0;
                    const dol = h.snapshot?.[f.id]?.dol||0;
                    if(!din&&!dol) return null;
                    return (
                      <span key={f.id}>
                        {f.icon} {f.label}: {din>0?fNum(din)+" د.ع":""}{din>0&&dol>0?" | ":""}{dol>0?fNum(dol)+" $":""}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── صفحة المصاريف الثابتة ───────────────────────────

export function ExpensesPage({ funds, onBack }) {
  const [expenses,  setExpenses]  = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [showAdd,   setShowAdd]   = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm,   setPayForm]   = useState({
    din:"", dol:"", date: new Date().toISOString().split("T")[0], note:""
  });
  const [form, setForm] = useState({
    name:"", type:"إيجار", party:"", fund:"عام",
    amtDin:"", amtDol:"", cycle:"شهري",
    dueDay:"1", note:""
  });
  const sf  = k => v => setForm(f=>({...f,[k]:v}));
  const psf = k => v => setPayForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    const u1=onSnapshot(collection(db,"expenses"), s=>{
      const list=s.docs.map(d=>({id:d.id,...d.data()}));
      list.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
      setExpenses(list);
    });
    const u2=onSnapshot(collection(db,"expense_payments"), s=>{
      setPayments(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    return()=>{u1();u2();};
  },[]);

  const addExpense = async () => {
    if(!form.name.trim()||(!Number(form.amtDin)&&!Number(form.amtDol))) return;
    const pw=window.prompt("🔒 أدخل الباسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    await addDoc(collection(db,"expenses"),{
      name:form.name.trim(), type:form.type, party:form.party.trim(),
      fund:form.fund, amtDin:Number(form.amtDin)||0, amtDol:Number(form.amtDol)||0,
      cycle:form.cycle, dueDay:Number(form.dueDay)||1,
      note:form.note.trim(), status:"active",
      createdAt:new Date().toISOString()
    });
    setForm({name:"",type:"إيجار",party:"",fund:"عام",
      amtDin:"",amtDol:"",cycle:"شهري",dueDay:"1",note:""});
    setShowAdd(false);
  };

  const doPay = async (withPrint=false) => {
    if(!payTarget) return;
    const din=Number(payForm.din)||(payTarget.amtDin||0);
    const dol=Number(payForm.dol)||(payTarget.amtDol||0);
    const bal=funds[payTarget.fund]||{din:0,dol:0};

    // التحقق من الرصيد — دينار ودولار
    if(din>0 && din>bal.din){
      alert("⛔ رصيد الدينار في صندوق "+payTarget.fund+" غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع | المطلوب: "+fNum(din)+" د.ع");
      return;
    }
    if(dol>0 && dol>bal.dol){
      alert("⛔ رصيد الدولار في صندوق "+payTarget.fund+" غير كافٍ — المتاح: "+fNum(bal.dol)+" $ | المطلوب: "+fNum(dol)+" $");
      return;
    }
    if(!din && !dol){ alert("أدخل المبلغ"); return; }

    const pw=window.prompt("🔒 أدخل الباسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}

    await setDoc(doc(db,"funds",payTarget.fund),
      {din: bal.din-din, dol: bal.dol-dol},{merge:true});
    await addDoc(collection(db,"fund_txs"),{
      fundId:payTarget.fund, fundLabel:payTarget.fund, type:"صرف",
      din, dol, note:payTarget.name+" ("+payTarget.cycle+")",
      date:payForm.date, createdAt:new Date().toISOString()
    });
    const payDoc = await addDoc(collection(db,"expense_payments"),{
      expenseId:payTarget.id, expenseName:payTarget.name,
      expenseType:payTarget.type, party:payTarget.party||"",
      fund:payTarget.fund, cycle:payTarget.cycle,
      din, dol, date:payForm.date,
      note:payForm.note, createdAt:new Date().toISOString()
    });

    if(withPrint) printReceipt(payTarget, din, dol, payForm.date, payForm.note);
    setPayTarget(null);
    setPayForm({din:"",dol:"",date:new Date().toISOString().split("T")[0],note:""});
  };

  const printReceipt = (exp, din, dol, date, note) => {
    const today = new Date().toISOString().split("T")[0];
    const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:30px;direction:rtl;max-width:420px}
.hdr{text-align:center;border-bottom:3px solid #DC2626;padding-bottom:12px;margin-bottom:14px}
.co{font-size:18px;font-weight:700}.ca{font-size:11px;color:#64748B}
.title{font-size:15px;font-weight:700;color:#DC2626;margin:12px 0 10px}
.box{background:#FFF1F2;border-radius:12px;padding:14px;margin:14px 0;text-align:center}
.amt{font-size:26px;font-weight:700;color:#DC2626}
.sub{font-size:12px;color:#64748B;margin-top:4px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F5F9}
.lbl{font-size:12px;color:#64748B}.val{font-size:12px;font-weight:700;color:#1E293B}
.footer{text-align:center;font-size:10px;color:#94A3B8;margin-top:16px;
  border-top:1px dashed #E2E8F0;padding-top:10px}
</style></head><body>
<div class="hdr"><div class="co">شركة باب المشاريع</div><div class="ca">بغداد — العرصات</div></div>
<div class="title">🏠 إيصال دفع — ${exp.type}</div>
<div class="box">
  ${din>0?`<div class="amt">${fNum(din)} د.ع</div><div class="sub">✍️ ${w2(din)} دينار عراقي</div>`:""}
  ${din>0&&dol>0?`<hr style="border:none;border-top:1px solid #FECACA;margin:10px 0"/>`:``}
  ${dol>0?`<div class="amt" style="color:#2563EB">${fNum(dol)} $</div><div class="sub">✍️ ${w2(dol)} دولار أمريكي</div>`:""}
</div>
<div class="row"><span class="lbl">البند</span><span class="val">${exp.name}</span></div>
<div class="row"><span class="lbl">النوع</span><span class="val">${exp.type}</span></div>
<div class="row"><span class="lbl">الجهة / المالك</span><span class="val">${exp.party||"—"}</span></div>
<div class="row"><span class="lbl">الصندوق</span><span class="val">${exp.fund}</span></div>
<div class="row"><span class="lbl">الدورة</span><span class="val">${exp.cycle}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${date}</span></div>
${note?`<div class="row"><span class="lbl">ملاحظة</span><span class="val">${note}</span></div>`:""}
<div class="footer">
  توقيع المستلم: _______________<br/>
  توقيع المسؤول: _______________<br/><br/>
  شركة باب المشاريع — طُبع: ${today}
</div>
</body></html>`;
    const w=window.open("","_blank","width=500,height=680");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),600);
  };

  const totalMonthlyDin = expenses
    .filter(e=>e.status==="active"&&e.cycle==="شهري")
    .reduce((s,e)=>s+(e.amtDin||0),0);

  const getLastPayment = id => payments
    .filter(p=>p.expenseId===id)
    .sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0];

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:700,margin:"0 auto",padding:"22px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
          ← رجوع
        </button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#DC2626,#EF4444)",
          borderRadius:16,padding:"20px 24px",marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:12}}>
            🏠 المصاريف الثابتة
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,
              padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#FCA5A5",marginBottom:3}}>عدد البنود</div>
              <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>{expenses.length}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,
              padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#FCA5A5",marginBottom:3}}>الإيجارات الشهرية</div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{fNum(totalMonthlyDin)}</div>
              <div style={{fontSize:10,color:"#FCA5A5"}}>د.ع/شهر</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,
              padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#FCA5A5",marginBottom:3}}>إجمالي المدفوعات</div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{fNum(payments.reduce((s,p)=>s+(p.din||0),0))}</div>
              <div style={{fontSize:10,color:"#FCA5A5"}}>د.ع</div>
            </div>
          </div>
        </div>

        {/* زر إضافة */}
        <button onClick={()=>setShowAdd(v=>!v)} style={{
          width:"100%",border:"none",borderRadius:12,padding:"13px",
          fontSize:14,fontWeight:700,fontFamily:"Tahoma",marginBottom:14,
          background:showAdd?"#475569":"#DC2626",color:"#fff",cursor:"pointer"}}>
          {showAdd?"✕ إلغاء":"+ إضافة مصروف ثابت"}
        </button>

        {/* فورم الإضافة */}
        {showAdd && (
          <div style={{background:"#fff",borderRadius:14,padding:20,
            border:"1px solid #E2E8F0",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:16}}>
              + مصروف ثابت جديد
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الاسم *</div>
                <input placeholder="مثال: إيجار مكتب..." value={form.name}
                  onChange={e=>sf("name")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الجهة / المالك</div>
                <input placeholder="اسم صاحب العقار أو الشركة..." value={form.party}
                  onChange={e=>sf("party")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
            </div>

            {/* النوع */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>النوع</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                {EXPENSE_TYPES.map(t=>(
                  <button key={t} onClick={()=>sf("type")(t)} style={{
                    border:"1.5px solid "+(form.type===t?"#DC2626":"#E2E8F0"),
                    borderRadius:8,padding:"7px 4px",cursor:"pointer",fontFamily:"Tahoma",
                    fontSize:11,fontWeight:600,
                    background:form.type===t?"#FFF1F2":"#fff",
                    color:form.type===t?"#DC2626":"#64748B"}}>{t}</button>
                ))}
              </div>
            </div>

            {/* المبلغ */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {[{k:"amtDin",l:"المبلغ دينار",c:"#D97706"},{k:"amtDol",l:"المبلغ دولار",c:"#2563EB"}].map(({k,l,c})=>(
                <div key={k}>
                  <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                  <input type="text" inputMode="numeric" placeholder="٠" value={form[k]}
                    onChange={e=>sf(k)(e.target.value.replace(/[^0-9]/g,""))}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  {Number(form[k])>0&&(
                    <div style={{fontSize:11,color:c,marginTop:3}}>
                      ✍️ {w2(Number(form[k]))} {k==="amtDin"?"دينار":"دولار"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* الصندوق والدورة */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الصندوق</div>
                <select value={form.fund} onChange={e=>sf("fund")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                  {EXPENSE_FUNDS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الدورة</div>
                <select value={form.cycle} onChange={e=>sf("cycle")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                  {EXPENSE_CYCLES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>
                  يوم الاستحقاق
                </div>
                <input type="text" inputMode="numeric" placeholder="1" value={form.dueDay}
                  onChange={e=>sf("dueDay")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",textAlign:"center"}}/>
              </div>
            </div>

            <button onClick={addExpense}
              disabled={!form.name.trim()||(!Number(form.amtDin)&&!Number(form.amtDol))}
              style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
                fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                background:form.name.trim()&&(Number(form.amtDin)||Number(form.amtDol))?"#DC2626":"#E2E8F0",
                color:form.name.trim()&&(Number(form.amtDin)||Number(form.amtDol))?"#fff":"#94A3B8"}}>
              ✅ تسجيل المصروف الثابت
            </button>
          </div>
        )}

        {/* قائمة المصاريف */}
        {expenses.length===0 ? (
          <div style={{background:"#fff",borderRadius:14,padding:30,
            textAlign:"center",color:"#94A3B8",border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:40,marginBottom:8}}>🏠</div>
            <div>ما في مصاريف ثابتة مسجّلة</div>
          </div>
        ) : expenses.map(exp=>{
          const lastPay = getLastPayment(exp.id);
          const expPays = payments.filter(p=>p.expenseId===exp.id);
          const totalPaid = expPays.reduce((s,p)=>s+(p.din||0),0);
          const bal = funds[exp.fund]||{din:0,dol:0};
          const needDin = exp.amtDin||0;
          const needDol = exp.amtDol||0;
          const canPayDin = needDin===0 || bal.din>=needDin;
          const canPayDol = needDol===0 || bal.dol>=needDol;
          const canPay = canPayDin && canPayDol;
          return (
            <div key={exp.id} style={{background:"#fff",borderRadius:14,
              padding:"16px 18px",marginBottom:10,border:"1px solid #E2E8F0",
              borderRight:"5px solid #DC2626"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",
                gap:12,alignItems:"start",marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>{exp.name}</span>
                    <span style={{fontSize:11,color:"#DC2626",background:"#FFF1F2",
                      borderRadius:20,padding:"2px 10px",fontWeight:600}}>{exp.type}</span>
                    <span style={{fontSize:11,color:"#64748B",background:"#F1F5F9",
                      borderRadius:20,padding:"2px 10px"}}>{exp.cycle}</span>
                  </div>
                  <div style={{fontSize:11,color:"#64748B",marginBottom:4}}>
                    {exp.party&&"👤 "+exp.party+" · "}
                    🏦 {exp.fund} · 📅 يوم {exp.dueDay} من كل {exp.cycle==="شهري"?"شهر":"فترة"}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {(exp.amtDin||0)>0&&(
                      <span style={{fontSize:12,fontWeight:700,color:"#DC2626"}}>
                        {fNum(exp.amtDin)} د.ع
                      </span>
                    )}
                    {(exp.amtDol||0)>0&&(
                      <span style={{fontSize:12,fontWeight:700,color:"#2563EB"}}>
                        {fNum(exp.amtDol)} $
                      </span>
                    )}
                    {totalPaid>0&&(
                      <span style={{fontSize:11,color:"#64748B"}}>
                        | إجمالي المدفوع: {fNum(totalPaid)} د.ع
                      </span>
                    )}
                  </div>
                  {lastPay&&(
                    <div style={{fontSize:11,color:"#16A34A",marginTop:4}}>
                      ✅ آخر دفعة: {lastPay.date}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <button
                    onClick={()=>{
                      if (!canPay) return;
                      setPayTarget(exp);
                      setPayForm({
                        din:String(exp.amtDin||""),
                        dol:String(exp.amtDol||""),
                        date:new Date().toISOString().split("T")[0],note:""
                      });
                    }}
                    disabled={!canPay}
                    title={canPay?"":"⛔ رصيد صندوق "+exp.fund+" غير كافٍ"}
                    style={{
                      background:canPay?"#FFF1F2":"#F8FAFC",
                      border:"1.5px solid "+(canPay?"#DC2626":"#E2E8F0"),
                      borderRadius:9,padding:"8px 14px",
                      cursor:canPay?"pointer":"not-allowed",
                      fontSize:12,fontFamily:"Tahoma",fontWeight:700,
                      color:canPay?"#DC2626":"#CBD5E1",
                      opacity:canPay?1:0.6}}>
                    {canPay ? "💸 دفع" : !canPayDin ? "⛔ دينار غير كافٍ" : "⛔ دولار غير كافٍ"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* نافذة الدفع */}
        {payTarget && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
            zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:420,
              boxShadow:"0 24px 80px rgba(0,0,0,0.35)"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#DC2626"}}>
                  💸 دفع — {payTarget.name}
                </div>
                <button onClick={()=>setPayTarget(null)} style={{background:"none",
                  border:"none",fontSize:20,cursor:"pointer",color:"#64748B"}}>✕</button>
              </div>
              <div style={{padding:"18px 20px"}}>
                {/* معلومات الصندوق */}
                {(()=>{
                  const payDin = Number(payForm.din)||0;
                  const payDol = Number(payForm.dol)||0;
                  const bal = funds[payTarget.fund]||{din:0,dol:0};
                  const okDin = payDin===0 || bal.din >= payDin;
                  const okDol = payDol===0 || bal.dol >= payDol;
                  const ok = okDin && okDol;
                  return (
                    <div style={{borderRadius:12,padding:14,marginBottom:16,
                      background:ok?"#F0FDF4":"#FFF1F2",
                      border:"2px solid "+(ok?"#16A34A":"#DC2626")}}>
                      <div style={{fontSize:12,fontWeight:700,
                        color:ok?"#16A34A":"#DC2626",marginBottom:10}}>
                        {ok?"✅":"⛔"} صندوق {payTarget.fund}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:12}}>
                        <div>
                          <div style={{color:"#64748B",marginBottom:3}}>الرصيد المتاح</div>
                          <div style={{fontWeight:700,color:ok?"#16A34A":"#DC2626"}}>
                            {fNum(bal.din)} د.ع
                          </div>
                          {bal.dol>0&&<div style={{fontWeight:700,color:"#2563EB"}}>{fNum(bal.dol)} $</div>}
                        </div>
                        <div>
                          <div style={{color:"#64748B",marginBottom:3}}>المبلغ المطلوب</div>
                          <div style={{fontWeight:700,color:okDin?"#1E293B":"#DC2626"}}>
                            {fNum(payDin||payTarget.amtDin||0)} د.ع
                          </div>
                          {(payDol||payTarget.amtDol||0)>0&&(
                            <div style={{fontWeight:700,color:okDol?"#1E293B":"#DC2626"}}>
                              {fNum(payDol||payTarget.amtDol||0)} $
                            </div>
                          )}
                        </div>
                      </div>
                      {!okDin&&(
                        <div style={{marginTop:8,fontSize:11,fontWeight:700,color:"#DC2626",
                          background:"#FEE2E2",borderRadius:7,padding:"6px 10px"}}>
                          ⛔ العجز بالدينار: {fNum(payDin-bal.din)} د.ع — لا يمكن الصرف
                        </div>
                      )}
                      {!okDol&&(
                        <div style={{marginTop:6,fontSize:11,fontWeight:700,color:"#DC2626",
                          background:"#FEE2E2",borderRadius:7,padding:"6px 10px"}}>
                          ⛔ العجز بالدولار: {fNum(payDol-bal.dol)} $ — لا يمكن الصرف
                        </div>
                      )}
                    </div>
                  );
                })()}

                {[{k:"din",l:"المبلغ دينار",c:"#DC2626"},{k:"dol",l:"المبلغ دولار",c:"#2563EB"}].map(({k,l,c})=>(
                  <div key={k} style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                    <input type="text" inputMode="numeric" placeholder="٠" value={payForm[k]}
                      onChange={e=>psf(k)(e.target.value.replace(/[^0-9]/g,""))}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                    {Number(payForm[k])>0&&(
                      <div style={{fontSize:11,color:c,marginTop:3}}>
                        ✍️ {w2(Number(payForm[k]))} {k==="din"?"دينار":"دولار"}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>التاريخ</div>
                    <input type="date" value={payForm.date} onChange={e=>psf("date")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
                    <input placeholder="شهر، فترة..." value={payForm.note}
                      onChange={e=>psf("note")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                </div>

                {(()=>{
                  const payDin=Number(payForm.din)||0;
                  const payDol=Number(payForm.dol)||0;
                  const bal=funds[payTarget.fund]||{din:0,dol:0};
                  const hasAmt=(payDin>0||payDol>0);
                  const okDin=payDin===0||bal.din>=payDin;
                  const okDol=payDol===0||bal.dol>=payDol;
                  const canSubmit=hasAmt&&okDin&&okDol;
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
                      <button onClick={()=>doPay(false)} disabled={!canSubmit}
                        style={{border:"none",borderRadius:10,padding:"13px",
                          fontSize:14,fontWeight:700,fontFamily:"Tahoma",
                          cursor:canSubmit?"pointer":"not-allowed",
                          background:canSubmit?"#DC2626":"#E2E8F0",
                          color:canSubmit?"#fff":"#94A3B8"}}>
                        {canSubmit?"✅ تأكيد الدفع":"⛔ رصيد غير كافٍ"}
                      </button>
                      <button onClick={()=>doPay(true)} disabled={!canSubmit}
                        style={{border:"1px solid "+(canSubmit?"#DC2626":"#E2E8F0"),
                          borderRadius:10,padding:"13px 16px",fontSize:13,
                          fontWeight:700,fontFamily:"Tahoma",
                          cursor:canSubmit?"pointer":"not-allowed",
                          background:"#fff",
                          color:canSubmit?"#DC2626":"#94A3B8",whiteSpace:"nowrap"}}>
                        🖨️ دفع وطباعة
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── صفحة الإعدادات ──────────────────────────────────
export function SettingsPage({ funds, onBack }) {
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState([]);
  const [importDone, setImportDone] = useState(false);

  const log = msg => setImportLog(prev => [...prev, msg]);

  // ── تصدير Excel ──────────────────────────────────────
  const exportExcel = async () => {
    const pw = window.prompt("🔒 باسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }

    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const XL = window.XLSX;
    const wb = XL.utils.book_new();

    const fetchCol = async col => {
      const snap = await getDocs(collection(db, col));
      return snap.docs.map(d => ({ id:d.id, ...d.data() }));
    };

    const fundsSnap = await getDocs(collection(db,"funds"));
    XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      fundsSnap.docs.map(d=>({ الصندوق:d.id, رصيد_الدينار:d.data().din||0, رصيد_الدولار:d.data().dol||0 }))
    ), "الصناديق");

    const ftxs = await fetchCol("fund_txs");
    if(ftxs.length) XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      ftxs.sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(t=>({
        الصندوق:t.fundId, النوع:t.type, الدينار:t.din||0, الدولار:t.dol||0,
        البيان:t.note||"", التاريخ:t.date||""
      }))
    ), "حركات_الصناديق");

    const emps = await fetchCol("employees");
    if(emps.length) XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      emps.map(e=>({ الاسم:e.name, الفرع:e.branch, الوظيفة:e.role||"",
        الراتب_دينار:e.baseDin||0, الراتب_دولار:e.baseDol||0, تاريخ_التعيين:e.hireDate||"" }))
    ), "الموظفون");

    const sals = await fetchCol("salaries");
    if(sals.length) XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      sals.sort((a,b)=>(a.month||"").localeCompare(b.month||"")).map(s=>({
        الموظف:s.empName, الفرع:s.branch, الشهر:s.month, الأساسي:s.baseDin||0,
        البدلات:s.extraDin||0, الخصومات:s.deductDin||0, الغياب:s.absenceDays||0,
        الصافي:s.netDin||0, الصندوق:s.fund||s.branch
      }))
    ), "الرواتب");

    const assets = await fetchCol("assets");
    if(assets.length) XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      assets.map(a=>({ الاسم:a.name, النوع:a.type, الصندوق:a.fund,
        الكمية:a.qty||0, المباع:a.soldQty||0, المتبقي:a.qtyRemaining||0,
        سعر_الوحدة:a.unitPriceDin||0, الإجمالي:a.totalDin||0, التاريخ:a.date||"" }))
    ), "الأصول");

    const exps = await fetchCol("expenses");
    if(exps.length) XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      exps.map(e=>({ الاسم:e.name, النوع:e.type, الجهة:e.party||"",
        الصندوق:e.fund, الدينار:e.amtDin||0, الدولار:e.amtDol||0, الدورة:e.cycle }))
    ), "المصاريف_الثابتة");

    const expPays = await fetchCol("expense_payments");
    if(expPays.length) XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      expPays.sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(p=>({
        البند:p.expenseName, الصندوق:p.fund, الدينار:p.din||0, الدولار:p.dol||0,
        التاريخ:p.date||"", ملاحظة:p.note||""
      }))
    ), "مدفوعات_المصاريف");

    const advs = await fetchCol("advances");
    if(advs.length) XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(
      advs.sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(a=>({
        الموظف:a.empName, الفرع:a.branch, الدينار:a.din||0,
        الدولار:a.dol||0, التاريخ:a.date||"", ملاحظة:a.note||""
      }))
    ), "السلف");

    const today = new Date().toISOString().split("T")[0];
    XL.writeFile(wb, "باب_المشاريع_"+today+".xlsx");
    alert("✅ تم تصدير البيانات بنجاح");
  };

  // ── استيراد Excel ─────────────────────────────────────
  const importExcel = async (file) => {
    if (!file) return;
    const pw = window.prompt("🔒 باسورد الاستيراد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    if (!window.confirm("سيتم استيراد البيانات من الملف. هل تريد المتابعة؟")) return;

    setImporting(true);
    setImportLog([]);
    setImportDone(false);

    try {
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const XL = window.XLSX;
      const data = await file.arrayBuffer();
      const wb = XL.read(data);

      // استيراد الصناديق
      if (wb.SheetNames.includes("الصناديق")) {
        const rows = XL.utils.sheet_to_json(wb.Sheets["الصناديق"]);
        for (const r of rows) {
          if (r["الصندوق"]) {
            await setDoc(doc(db,"funds",r["الصندوق"]),
              { din: Number(r["رصيد_الدينار"])||0, dol: Number(r["رصيد_الدولار"])||0 },
              { merge:true });
          }
        }
        log("✅ الصناديق: تم استيراد "+rows.length+" صندوق");
      }

      // استيراد الموظفين
      if (wb.SheetNames.includes("الموظفون")) {
        const rows = XL.utils.sheet_to_json(wb.Sheets["الموظفون"]);
        for (const r of rows) {
          await addDoc(collection(db,"employees"), {
            name: r["الاسم"]||"", branch: r["الفرع"]||"",
            role: r["الوظيفة"]||"",
            baseDin: Number(r["الراتب_دينار"])||0,
            baseDol: Number(r["الراتب_دولار"])||0,
            hireDate: String(r["تاريخ_التعيين"]||""),
            status:"active", createdAt: new Date().toISOString()
          });
        }
        log("✅ الموظفون: تم استيراد "+rows.length+" موظف");
      }

      // استيراد الأصول
      if (wb.SheetNames.includes("الأصول")) {
        const rows = XL.utils.sheet_to_json(wb.Sheets["الأصول"]);
        for (const r of rows) {
          await addDoc(collection(db,"assets"), {
            name: r["الاسم"]||"", type: r["النوع"]||"",
            fund: r["الصندوق"]||"",
            qty: Number(r["الكمية"])||0,
            soldQty: Number(r["المباع"])||0,
            qtyRemaining: Number(r["المتبقي"])||0,
            unitPriceDin: Number(r["سعر_الوحدة"])||0,
            totalDin: Number(r["الإجمالي"])||0,
            date: String(r["التاريخ"]||""),
            status: Number(r["المتبقي"])>0?"active":"sold",
            createdAt: new Date().toISOString()
          });
        }
        log("✅ الأصول: تم استيراد "+rows.length+" أصل");
      }

      // استيراد المصاريف الثابتة
      if (wb.SheetNames.includes("المصاريف_الثابتة")) {
        const rows = XL.utils.sheet_to_json(wb.Sheets["المصاريف_الثابتة"]);
        for (const r of rows) {
          await addDoc(collection(db,"expenses"), {
            name: r["الاسم"]||"", type: r["النوع"]||"إيجار",
            party: r["الجهة"]||"", fund: r["الصندوق"]||"عام",
            amtDin: Number(r["الدينار"])||0,
            amtDol: Number(r["الدولار"])||0,
            cycle: r["الدورة"]||"شهري",
            dueDay:1, status:"active",
            createdAt: new Date().toISOString()
          });
        }
        log("✅ المصاريف الثابتة: تم استيراد "+rows.length+" بند");
      }

      // استيراد السلف
      if (wb.SheetNames.includes("السلف")) {
        const rows = XL.utils.sheet_to_json(wb.Sheets["السلف"]);
        for (const r of rows) {
          await addDoc(collection(db,"advances"), {
            empName: r["الموظف"]||"", branch: r["الفرع"]||"",
            din: Number(r["الدينار"])||0, dol: Number(r["الدولار"])||0,
            date: String(r["التاريخ"]||""), note: r["ملاحظة"]||"",
            status:"pending", createdAt: new Date().toISOString()
          });
        }
        log("✅ السلف: تم استيراد "+rows.length+" سلفة");
      }

      setImportDone(true);
      log("🎉 اكتمل الاستيراد بنجاح!");
    } catch(e) {
      log("❌ خطأ: "+e.message);
    }
    setImporting(false);
  };

  // ── تصفية الصناديق ───────────────────────────────────
  const clearFunds = async () => {
    const pw = window.prompt("🔒 باسورد التصفية:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    if (!window.confirm("⚠️ تصفية جميع الصناديق؟ لا يمكن التراجع.")) return;
    const ids = ["رأس_المال","عام","شركاء","إشراف","ديكور","مقاولات","واجهات",
      "partner_إيهاب","partner_أحمد","partner_نور","partner_محمد"];
    for (const id of ids) await setDoc(doc(db,"funds",id),{din:0,dol:0},{merge:true});
    const txSnap = await getDocs(collection(db,"fund_txs"));
    for (const d of txSnap.docs) await deleteDoc(doc(db,"fund_txs",d.id));
    const ptSnap = await getDocs(collection(db,"partner_txs"));
    for (const d of ptSnap.docs) await deleteDoc(doc(db,"partner_txs",d.id));
    // تصفير المشاريع النشطة
    const projSnap = await getDocs(collection(db,"projects"));
    for (const d of projSnap.docs) {
      await updateDoc(doc(db,"projects",d.id), { balDin:0, balDol:0, recDin:0, recDol:0, spdDin:0, spdDol:0 });
    }
    const ptxSnap = await getDocs(collection(db,"project_txs"));
    for (const d of ptxSnap.docs) await deleteDoc(doc(db,"project_txs",d.id));
    alert("✅ تمت تصفية جميع الصناديق والمشاريع");
  };

  const clearAll = async () => {
    const pw = window.prompt("🔒 باسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    if (!window.confirm("حذف جميع البيانات؟ لا يمكن التراجع.")) return;
    const cols = ["fund_txs","partner_txs","salaries","advances",
      "assets","asset_sales","expenses","expense_payments","opening_balances","employees"];
    for (const col of cols) {
      const snap = await getDocs(collection(db,col));
      for (const d of snap.docs) await deleteDoc(doc(db,col,d.id));
    }
    alert("✅ تم حذف كل البيانات");
  };

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"22px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
          ← رجوع
        </button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#1E293B,#334155)",
          borderRadius:16,padding:"20px 24px",marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:4}}>
            ⚙️ الإعدادات والأدوات
          </div>
          <div style={{fontSize:12,color:"#94A3B8"}}>
            إدارة البيانات، النسخ الاحتياطي، واستيراد المعلومات
          </div>
        </div>

        {/* النسخ الاحتياطي */}
        <div style={{background:"#fff",borderRadius:14,padding:20,
          border:"1px solid #E2E8F0",marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:6}}>
            📥 النسخ الاحتياطي
          </div>
          <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>
            تصدير كل بيانات النظام إلى ملف Excel يمكن حفظه واستعادته لاحقاً
          </div>
          <button onClick={exportExcel} style={{
            width:"100%",border:"none",borderRadius:10,padding:"13px",
            fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
            background:"#16A34A",color:"#fff"}}>
            📤 تصدير كل البيانات إلى Excel
          </button>
        </div>

        {/* الاستيراد */}
        <div style={{background:"#fff",borderRadius:14,padding:20,
          border:"1px solid #E2E8F0",marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:6}}>
            📂 استيراد من Excel
          </div>
          <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>
            استعادة البيانات من ملف Excel سبق تصديره من النظام
          </div>

          <label style={{display:"block",border:"2px dashed #CBD5E1",borderRadius:12,
            padding:"24px",textAlign:"center",cursor:"pointer",
            background:"#F8FAFC",marginBottom:importing||importLog.length>0?14:0}}>
            <input type="file" accept=".xlsx,.xls" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) importExcel(e.target.files[0]); e.target.value=""; }}/>
            <div style={{fontSize:32,marginBottom:8}}>📂</div>
            <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:4}}>
              اضغط لاختيار ملف Excel
            </div>
            <div style={{fontSize:11,color:"#94A3B8"}}>xlsx. أو xls.</div>
          </label>

          {importing && (
            <div style={{textAlign:"center",padding:"12px 0",color:"#64748B",fontSize:13}}>
              ⏳ جاري الاستيراد...
            </div>
          )}

          {importLog.length>0 && (
            <div style={{background:"#F8FAFC",borderRadius:10,padding:14,
              border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1E293B",marginBottom:10}}>
                📋 سجل الاستيراد
              </div>
              {importLog.map((msg,i)=>(
                <div key={i} style={{fontSize:12,color:msg.startsWith("✅")||msg.startsWith("🎉")
                  ?"#16A34A":msg.startsWith("❌")?"#DC2626":"#64748B",
                  padding:"4px 0",borderBottom:"1px solid #F1F5F9"}}>
                  {msg}
                </div>
              ))}
              {importDone && (
                <button onClick={()=>{setImportLog([]);setImportDone(false);}}
                  style={{marginTop:10,border:"none",borderRadius:8,padding:"8px 16px",
                    fontSize:12,fontFamily:"Tahoma",background:"#1E293B",
                    color:"#fff",cursor:"pointer"}}>
                  ✅ إغلاق
                </button>
              )}
            </div>
          )}
        </div>

        {/* أدوات الاختبار */}
        <div style={{background:"#fff",borderRadius:14,padding:20,
          border:"1px solid #E2E8F0",marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:"#DC2626",marginBottom:6}}>
            🔧 أدوات الاختبار
          </div>
          <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>
            استخدم هذه الأدوات بحذر — لا يمكن التراجع عن الحذف
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={clearFunds} style={{
              border:"1px solid #DC2626",borderRadius:10,padding:"11px",
              fontSize:12,fontWeight:700,fontFamily:"Tahoma",
              background:"#FFF1F2",color:"#DC2626",cursor:"pointer"}}>
              🗑️ تصفية جميع الصناديق (تصفير الأرصدة)
            </button>
            <button onClick={clearAll} style={{
              border:"1px solid #94A3B8",borderRadius:10,padding:"11px",
              fontSize:12,fontWeight:700,fontFamily:"Tahoma",
              background:"#F8FAFC",color:"#64748B",cursor:"pointer"}}>
              🗑️ حذف كل البيانات التجريبية
            </button>
          </div>
        </div>

        {/* معلومات النظام */}
        <div style={{background:"#F8FAFC",borderRadius:14,padding:16,
          border:"1px solid #E2E8F0",fontSize:11,color:"#94A3B8",textAlign:"center"}}>
          شركة باب المشاريع — نظام الحسابات الداخلي
          <br/>Firebase: bab-projects-b7d04 · Vercel: hisab-app-ahmee.vercel.app
        </div>

      </div>
    </div>
  );
}
