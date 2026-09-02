"use strict";
window.MemoryFinanceSimple=(()=>{
const STORE_KEY="financeiro_criptografado_v1",LOCAL_KEY="memory:financeiro:encrypted:v1",PASSWORD_HASH="59e66102621bc60648811c309f8475f58628b86c8a11176cb9003c79b165ee96";
const START_PERIOD="2026-08",START_YEAR=2026,MONTH_NAMES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const enc=new TextEncoder(),dec=new TextDecoder();let state=null,password="",saving=Promise.resolve(),syncMode="";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const uid=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const brl=v=>num(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").replace(/\s+/g," ").trim();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const importPeriod=()=>$("#finance-period")?.value||START_PERIOD;
const selectedYear=()=>Math.max(START_YEAR,parseInt($("#finance-year")?.value||String(START_YEAR),10)||START_YEAR);

const DEFAULT_LINES=[
 ["cartao-outros","Cartão de crédito","expense",2396.28],["combustivel","Combustível","expense",453.03],["livros","Livros","expense",150],["seguro-carro","Seguro carro","expense",278.04],["racao","Ração","expense",400],["gympass","Gympass","expense",139.90],["barbeiro","Barbeiro","expense",139.99],["gas","Gás","expense",0],["iptu","IPTU","expense",0],["celular","Celular","expense",51.75],["luz-cpfl","Luz CPFL","expense",113.60],["internet","Internet","expense",199.99],["condominio","Condomínio","expense",0],["agua","Água","expense",48.70],["moradia","Casa alugada/própria","expense",3330],["outras","Outras despesas","expense",2200],["amortizacao","Amortização casa","expense",0],["renda-taina","Tainá","income",1100],["salario","Líquido Salário","income",12770.53],["ppr","PPR","income",0],["13-salario","13º salário","income",0]
];

const BASE_RULES=[
 ["POSTO","combustivel"],["COMBUST","combustivel"],["WELLHUB","gympass"],["GYMPASS","gympass"],["BARBER","barbeiro"],["BARBE","barbeiro"],["ZURICH","seguro-carro"],["SEGURO","seguro-carro"],["LIVRARIA","livros"],["LIVRO","livros"],["AMAZON","livros"],["PET","racao"],["RACAO","racao"],["SAAE","agua"],["CPFL","luz-cpfl"],["NETTOP","internet"],["INTERNET","internet"],["CLARO","celular"],["CONDOMIN","condominio"],["ALUGUEL","moradia"],["SALARIO","salario"],["PPR","ppr"]
];

function initialPeriod(){
 const now=new Date().toISOString().slice(0,7);
 return now<START_PERIOD?START_PERIOD:now;
}
function defaultState(){
 const p=initialPeriod();
 return{version:7,accounts:DEFAULT_LINES.map(([id,name,type,value])=>({id,name,type,active:true,plannedMonthly:true,amounts:{[p]:value}})),rules:BASE_RULES.map(([keyword,accountId])=>({keyword,accountId})),transactions:[],files:[],months:{},updatedAt:new Date().toISOString()}
}
async function sha256(v){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function b64(b){let s="";for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode(...b.subarray(i,i+32768));return btoa(s)}
function unb64(v){return Uint8Array.from(atob(v),c=>c.charCodeAt(0))}
async function key(secret,userId){const m=await crypto.subtle.importKey("raw",enc.encode(secret),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:enc.encode(`memory-financeiro-v1:${userId}`),iterations:150000,hash:"SHA-256"},m,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function encrypt(v,secret){const u=await MMCDAuth.user(),k=await key(secret,u.id),iv=crypto.getRandomValues(new Uint8Array(12)),plain=enc.encode(JSON.stringify(v)),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,plain);return{v:1,alg:"AES-GCM+PBKDF2",iv:b64(iv),data:b64(new Uint8Array(cipher)),updatedAt:new Date().toISOString()}}
async function decrypt(e,secret){const u=await MMCDAuth.user(),k=await key(secret,u.id),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(e.iv)},k,unb64(e.data));return JSON.parse(dec.decode(plain))}
async function readEnvelope(){
 try{const l=JSON.parse(localStorage.getItem(LOCAL_KEY)||"null");if(l?.data){syncMode="Local criptografado";return l}}catch{}
 try{const r=await MemoryConfig.read(STORE_KEY,null,{fresh:true});if(r?.data){localStorage.setItem(LOCAL_KEY,JSON.stringify(r));syncMode="Supabase criptografado";return r}}catch(e){console.warn(e)}
 return null
}
async function persist(){
 if(!state||!password)return;
 state.updatedAt=new Date().toISOString();
 const e=await encrypt(state,password);
 localStorage.setItem(LOCAL_KEY,JSON.stringify(e));
 try{await MemoryConfig.write(STORE_KEY,e);syncMode="Supabase criptografado"}catch(err){syncMode="Local criptografado";console.warn(err)}
 updateSync()
}
function save(){saving=saving.catch(()=>{}).then(persist);return saving}
function migrate(){
 state ||= defaultState();
 state.version=7;
 state.accounts=Array.isArray(state.accounts)?state.accounts:[];
 state.transactions=Array.isArray(state.transactions)?state.transactions:[];
 state.files=Array.isArray(state.files)?state.files:[];
 state.rules=Array.isArray(state.rules)?state.rules:[];
 state.accounts.forEach(a=>{a.amounts||={};if(a.type==="settlement"||a.classificationOnly)a.active=false});
 DEFAULT_LINES.forEach(([id,name,type])=>{
   let a=state.accounts.find(x=>x.id===id);
   if(!a){a={id,name,type,active:true,plannedMonthly:true,amounts:{}};state.accounts.push(a)}
   a.name=a.name||name;a.type=a.type||type;a.active=a.active!==false;a.plannedMonthly=true;a.amounts||={}
 });
 BASE_RULES.forEach(([keyword,accountId])=>{if(!state.rules.some(r=>norm(r.keyword)===keyword&&r.accountId===accountId))state.rules.push({keyword,accountId})})
}
async function unlock(secret){
 secret=String(secret||"").trim();
 if(!secret)throw Error("Digite a senha.");
 if(await sha256(secret)!==PASSWORD_HASH)throw Error("Senha incorreta.");
 password=secret;
 const e=await readEnvelope();
 state=e?await decrypt(e,secret):defaultState();
 migrate();
 await save()
}
function updateSync(){const b=$("#finance-sync-badge");if(!b)return;b.hidden=false;b.textContent=syncMode||"Protegido"}
function lines(type){return state.accounts.filter(a=>a.active!==false&&a.plannedMonthly!==false&&a.type===type&&a.type!=="settlement"&&!a.classificationOnly)}
function amount(a,p){return Math.max(0,num(a.amounts?.[p]))}
function periodsForYear(year){
 const first=year===START_YEAR?7:0;
 return Array.from({length:12-first},(_,i)=>{
   const m=first+i+1;
   return `${year}-${String(m).padStart(2,"0")}`
 })
}
function monthLabel(p){const [y,m]=p.split("-").map(Number);return `${MONTH_NAMES[m-1]}/${String(y).slice(-2)}`}
function yearTotal(a,periods){return periods.reduce((s,p)=>s+amount(a,p),0)}
function allKnownYears(){
 const years=new Set([START_YEAR,new Date().getFullYear()]);
 state?.accounts?.forEach(a=>Object.keys(a.amounts||{}).forEach(p=>{const y=parseInt(p.slice(0,4),10);if(y>=START_YEAR)years.add(y)}));
 state?.transactions?.forEach(t=>{const y=parseInt(String(t.period||"").slice(0,4),10);if(y>=START_YEAR)years.add(y)});
 const max=Math.max(...years,START_YEAR);
 for(let y=START_YEAR;y<=Math.max(max+1,START_YEAR+1);y++)years.add(y);
 return [...years].sort((a,b)=>a-b)
}
function setupYearSelector(){
 const s=$("#finance-year"),saved=parseInt(localStorage.getItem("memory:financeiro:year")||"",10),current=new Date().getFullYear();
 const wanted=Math.max(START_YEAR,saved||current);
 const years=allKnownYears();
 if(!years.includes(wanted))years.push(wanted);
 years.sort((a,b)=>a-b);
 s.innerHTML=years.map(y=>`<option value="${y}" ${y===wanted?"selected":""}>${y}</option>`).join("")
}
function headerHtml(periods){
 return `<tr><th class="finance-sticky-col">Descrição</th>${periods.map(p=>`<th class="finance-month-head">${monthLabel(p)}</th>`).join("")}<th class="finance-total-head">Total</th><th class="finance-action-head"></th></tr>`
}
function totalFoot(accounts,periods,label){
 const monthTotals=periods.map(p=>accounts.reduce((s,a)=>s+amount(a,p),0));
 const total=monthTotals.reduce((s,v)=>s+v,0);
 return `<tr class="finance-total-row"><td class="finance-sticky-col"><strong>${label}</strong></td>${monthTotals.map(v=>`<td class="finance-money"><strong>${brl(v)}</strong></td>`).join("")}<td class="finance-money finance-year-total"><strong>${brl(total)}</strong></td><td></td></tr>`
}
function renderSection(type){
 const year=selectedYear(),periods=periodsForYear(year),accounts=lines(type);
 const prefix=type==="income"?"income":"expense";
 $(`#${prefix}-head`).innerHTML=headerHtml(periods);
 $(`#${prefix}-body`).innerHTML=accounts.map(a=>{
   const cells=periods.map(p=>`<td><input class="finance-budget-cell" data-budget-period="${p}" type="number" min="0" step="0.01" value="${amount(a,p).toFixed(2)}" aria-label="${esc(a.name)} ${monthLabel(p)}"></td>`).join("");
   return `<tr data-id="${esc(a.id)}"><td class="finance-sticky-col"><input class="finance-name-cell" data-name value="${esc(a.name)}"></td>${cells}<td class="finance-money finance-year-total"><strong>${brl(yearTotal(a,periods))}</strong></td><td><button class="finance-delete" data-delete title="Excluir">🗑️</button></td></tr>`
 }).join("");
 $(`#${prefix}-foot`).innerHTML=totalFoot(accounts,periods,type==="income"?"Total receitas":"Total despesas");
 $(`#${prefix}-empty`).hidden=!!accounts.length;

 $(`#${prefix}-body`).querySelectorAll("tr").forEach(tr=>{
   const a=state.accounts.find(x=>x.id===tr.dataset.id);
   tr.querySelector("[data-name]").addEventListener("change",e=>{a.name=e.target.value.trim()||a.name;save();renderAll()});
   tr.querySelectorAll("[data-budget-period]").forEach(input=>input.addEventListener("change",e=>{
     a.amounts||={};
     a.amounts[e.target.dataset.budgetPeriod]=Math.max(0,num(e.target.value));
     save();renderAll()
   }));
   tr.querySelector("[data-delete]").addEventListener("click",()=>{if(confirm(`Excluir "${a.name}" do orçamento?`)){a.active=false;save();renderAll()}})
 })
}
function renderBudget(){
 renderSection("income");
 renderSection("expense");
 const periods=periodsForYear(selectedYear()),income=lines("income"),expense=lines("expense");
 const inc=income.reduce((s,a)=>s+yearTotal(a,periods),0);
 const exp=expense.reduce((s,a)=>s+yearTotal(a,periods),0);
 $("#sum-income-year").textContent=brl(inc);
 $("#sum-expense-year").textContent=brl(exp);
 $("#sum-balance-year").textContent=brl(inc-exp)
}
function txs(p=importPeriod()){return state.transactions.filter(t=>t.period===p&&!t.ignored)}
function renderImports(){
 const list=txs().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
 $("#imports-empty").hidden=!!list.length;
 $("#imports-body").innerHTML=list.map(t=>{
   const a=state.accounts.find(x=>x.id===t.accountId);
   return `<tr><td><span class="finance-source ${t.source==="invoice"?"card":"bank"}">${t.source==="invoice"?"💳 Fatura":"🏦 Extrato"}</span></td><td>${esc(formatDate(t.date))}</td><td>${esc(t.description)}</td><td class="finance-money">${brl(Math.abs(t.amount))}</td><td>${esc(a?.name||"—")}</td><td>${t.matched?'<span class="finance-check">✓ Orçado</span>':'<span class="finance-auto">Automático</span>'}</td></tr>`
 }).join("");
 $("#finance-pending-count").textContent=list.filter(t=>!t.matched).length
}
function renderAll(){renderBudget();renderImports();updateSync()}
function formatDate(v){if(!v)return"—";try{return new Date(v+"T12:00:00").toLocaleDateString("pt-BR")}catch{return v}}
function parseDate(v){
 if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
 if(typeof v==="number"&&window.XLSX?.SSF?.parse_date_code){const d=XLSX.SSF.parse_date_code(v);if(d)return`${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`}
 const s=String(v||"").trim();
 let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
 if(m){let y=+m[3];if(y<100)y+=2000;return`${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}
 m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
 return m?`${m[1]}-${m[2]}-${m[3]}`:""
}
function money(v){
 if(typeof v==="number")return v;
 let s=String(v??"").trim().replace(/R\$\s*/gi,"").replace(/\s/g,"");
 if(!s)return NaN;
 if(/^-?[\d.]+,\d{1,2}$/.test(s))return Number(s.replace(/\./g,"").replace(",","."));
 if(/^-?\d+(?:\.\d+)?$/.test(s))return Number(s);
 return NaN
}
function accountById(id){return state.accounts.find(a=>a.id===id&&a.active!==false)}
function fallback(source,amountValue){
 if(source==="invoice"){
   let a=accountById("cartao-outros");
   if(!a){a={id:"cartao-outros",name:"Cartão de crédito",type:"expense",active:true,plannedMonthly:true,amounts:{}};state.accounts.push(a)}
   return a
 }
 if(amountValue>0){
   let a=accountById("outras-receitas");
   if(!a){a={id:"outras-receitas",name:"Outras receitas",type:"income",active:true,plannedMonthly:true,amounts:{}};state.accounts.push(a)}
   return a
 }
 let a=accountById("outras");
 if(!a){a={id:"outras",name:"Outras despesas",type:"expense",active:true,plannedMonthly:true,amounts:{}};state.accounts.push(a)}
 return a
}
function classify(description,source,amountValue){
 const n=norm(description),candidates=[...lines("income"),...lines("expense")];
 for(const r of state.rules){if(r.keyword&&n.includes(norm(r.keyword))){const a=accountById(r.accountId);if(a)return{account:a,matched:true}}}
 for(const a of candidates){const an=norm(a.name);if(an.length>=4&&(n.includes(an)||an.split(" ").filter(x=>x.length>=4).some(x=>n.includes(x))))return{account:a,matched:true}}
 return{account:fallback(source,amountValue),matched:false}
}
function detectRows(rows,source){
 const out=[];
 for(const row of rows){
   const vals=Object.values(row||{});let date="",description="",value=NaN;
   for(const [k,v] of Object.entries(row||{})){
     const nk=norm(k);
     if(!date&&(nk.includes("DATA")||nk.includes("DATE")))date=parseDate(v);
     if(!description&&(nk.includes("DESCR")||nk.includes("HISTOR")||nk.includes("ESTAB")||nk.includes("LANCAMENTO")))description=String(v??"").trim();
     if(!Number.isFinite(value)&&(nk.includes("VALOR")||nk.includes("AMOUNT")||nk.includes("TOTAL")))value=money(v)
   }
   if(!date){for(const v of vals){const d=parseDate(v);if(d){date=d;break}}}
   if(!description){description=vals.find(v=>typeof v==="string"&&v.trim().length>=3&&!parseDate(v))?.trim()||""}
   if(!Number.isFinite(value)){const nums=vals.map(money).filter(Number.isFinite);if(nums.length)value=nums[nums.length-1]}
   if(description&&Number.isFinite(value)&&Math.abs(value)>0){if(source==="invoice")value=-Math.abs(value);out.push({date,description,amount:value})}
 }
 return out
}
async function importFile(file,source){
 const ab=await file.arrayBuffer(),wb=XLSX.read(ab,{type:"array",cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:"",raw:true});
 const detected=detectRows(rows,source);
 if(!detected.length)throw Error("Não encontrei lançamentos reconhecíveis nesse arquivo.");
 const p=importPeriod();let matched=0;
 for(const item of detected){
   const c=classify(item.description,source,item.amount);
   state.transactions.push({id:uid("tx"),source,period:p,date:item.date||`${p}-01`,description:item.description,amount:item.amount,accountId:c.account.id,matched:c.matched,importedAt:new Date().toISOString(),fileName:file.name});
   if(c.matched)matched++
 }
 state.files.push({id:uid("file"),period:p,source,name:file.name,count:detected.length,importedAt:new Date().toISOString()});
 await save();renderAll();
 $("#import-message").textContent=`${file.name}: ${detected.length} lançamento(s). ${matched} encontrado(s) no orçamento; ${detected.length-matched} classificado(s) automaticamente.`
}
function openAdd(type){
 const m=$("#finance-modal"),title=type==="income"?"Nova receita":"Nova despesa";
 m.hidden=false;
 m.innerHTML=`<div class="finance-dialog"><h2>${title}</h2><div class="finance-dialog-grid"><label>Descrição<input id="new-name" type="text" placeholder="${type==="income"?"Ex.: Bônus":"Ex.: Escola"}"></label></div><div class="finance-dialog-actions"><button class="btn" id="new-cancel">Cancelar</button><button class="btn primary" id="new-save">Adicionar</button></div></div>`;
 $("#new-cancel").onclick=()=>m.hidden=true;
 $("#new-save").onclick=()=>{
   const name=$("#new-name").value.trim();if(!name)return;
   state.accounts.push({id:uid("line"),name,type,active:true,plannedMonthly:true,amounts:{}});
   m.hidden=true;save();renderAll()
 }
}
function bind(){
 $$("[data-tab]").forEach(b=>b.onclick=()=>{
   $$("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));
   $$("[data-panel]").forEach(p=>p.classList.toggle("active",p.dataset.panel===b.dataset.tab))
 });
 $("#finance-year").onchange=()=>{localStorage.setItem("memory:financeiro:year",String(selectedYear()));renderBudget()};
 $("#finance-period").onchange=()=>{localStorage.setItem("memory:financeiro:period",importPeriod());renderImports()};
 $("#add-income-line").onclick=()=>openAdd("income");
 $("#add-expense-line").onclick=()=>openAdd("expense");
 $("#invoice-input").onchange=async e=>{try{if(e.target.files[0])await importFile(e.target.files[0],"invoice")}catch(err){$("#import-message").textContent=err.message}e.target.value=""};
 $("#bank-input").onchange=async e=>{try{if(e.target.files[0])await importFile(e.target.files[0],"bank")}catch(err){$("#import-message").textContent=err.message}e.target.value=""};
 $("#clear-period-imports").onclick=()=>{if(confirm("Remover os lançamentos importados deste mês?")){state.transactions=state.transactions.filter(t=>t.period!==importPeriod());state.files=state.files.filter(f=>f.period!==importPeriod());save();renderAll()}};
 $("#finance-lock-button").onclick=()=>location.reload();
 $("#finance-password-toggle").onclick=()=>{const i=$("#finance-password");i.type=i.type==="password"?"text":"password"};
 $("#finance-lock-form").onsubmit=async e=>{
   e.preventDefault();const btn=e.submitter,err=$("#finance-lock-error");err.textContent="";btn.disabled=true;
   try{await unlock($("#finance-password").value);setupYearSelector();$("#finance-lock").hidden=true;$("#finance-app").hidden=false;$("#finance-lock-button").hidden=false;renderAll()}
   catch(x){err.textContent=x.message||"Não foi possível abrir."}
   finally{btn.disabled=false}
 }
}
async function init(){
 if(!window.MMCDAuth?.requireSession)throw Error("Autenticacao do Memory indisponivel.");
 await MMCDAuth.requireSession();
 const savedPeriod=localStorage.getItem("memory:financeiro:period")||initialPeriod();
 $("#finance-period").value=savedPeriod<START_PERIOD?START_PERIOD:savedPeriod;
 bind();
 $("#finance-password")?.focus()
}
return{init}
})();
window.addEventListener("load",()=>MemoryFinanceSimple.init().catch(console.error));
