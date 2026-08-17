"use strict";

window.MemoryFinance = (() => {
  const STORE_KEY = "financeiro_criptografado_v1";
  const LOCAL_KEY = "memory:financeiro:encrypted:v1";
  const PASSWORD_HASH = "59e66102621bc60648811c309f8475f58628b86c8a11176cb9003c79b165ee96";
  const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  const MONTHS_PT = {janeiro:1,fevereiro:2,marco:3,"março":3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let state = null;
  let password = "";
  let activeTab = "overview";
  let reconcileFilter = "pending";
  let saving = Promise.resolve();
  let syncMode = "";

  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const esc = value => window.MMCDUI?.esc ? MMCDUI.esc(value) : String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const toast = (msg, duration=3200) => window.MMCDUI?.toast?.(msg, duration);
  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const brl = value => Number(value || 0).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
  const pct = value => `${Math.max(0,Math.min(100,Math.round(value || 0)))}%`;

  function norm(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function currentPeriod() {
    return $("#finance-period")?.value || new Date().toISOString().slice(0,7);
  }

  function dateIso(value) {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0,10);
    if (typeof value === "number") {
      if (value > 20000 && value < 80000 && window.XLSX?.SSF?.parse_date_code) {
        const d = XLSX.SSF.parse_date_code(value);
        if (d) return `${String(d.y).padStart(4,"0")}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
      }
      return "";
    }
    const text = String(value).trim();
    let m = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) {
      const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
      return `${year}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
    }
    m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return "";
  }

  function moneyValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const text=String(value??"").trim();
    if (!text || dateIso(text)) return NaN;
    const cleaned=text.replace(/R\$\s*/gi,"").replace(/\s/g,"");
    if (/^-?[\d.]+,\d{1,2}$/.test(cleaned)) return Number(cleaned.replace(/\./g,"").replace(",","."));
    if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) return Number(cleaned);
    return NaN;
  }

  function periodFromDate(date) { return /^\d{4}-\d{2}/.test(date || "") ? date.slice(0,7) : currentPeriod(); }
  function formatDate(date) { try { return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR"); } catch { return date || "—"; } }
  function periodLabel(period) { try { return new Date(`${period}-01T12:00:00`).toLocaleDateString("pt-BR", {month:"short",year:"numeric"}).replace(" de ","/"); } catch { return period; } }

  const DEFAULT_ACCOUNTS = [
    ["cartao","Cartão de crédito","settlement"],
    ["combustivel","Combustível","expense"],
    ["livros","Livros","expense"],
    ["seguro-carro","Seguro carro","expense"],
    ["racao","Ração","expense"],
    ["gympass","Gympass","expense"],
    ["barbeiro","Barbeiro","expense"],
    ["gas","Gás","expense"],
    ["iptu","IPTU","expense"],
    ["celular","Celular","expense"],
    ["luz-cpfl","Luz CPFL","expense"],
    ["internet","Internet","expense"],
    ["condominio","Condomínio","expense"],
    ["agua","Água","expense"],
    ["moradia","Casa alugada/própria","expense"],
    ["outras","Outras despesas","expense"],
    ["amortizacao","Amortização casa","expense"],
    ["salario","Líquido Salário","income"],
    ["renda-taina","Tainá","income"],
    ["ppr","PPR","income"],
    ["13-salario","13º salário","income"]
  ].map(([id,name,type]) => ({id,name,type,active:true,amounts:{},createdAt:new Date().toISOString()}));

  const DEFAULT_RULES = [
    ["POSTO LINC","combustivel",98],["POSTO ","combustivel",82],["SHELL","combustivel",92],["IPIRANGA","combustivel",92],
    ["WELLHUB","gympass",99],["GYMPASS","gympass",99],["CASHBARBER","barbeiro",99],["BARBER","barbeiro",86],
    ["ZURICH","seguro-carro",99],["SAAE","agua",99],["CPFL","luz-cpfl",99],["CLARO CELULAR","celular",98],
    ["NETTOP","internet",99],["PAGTO SALARIO","salario",99],["SALARIO","salario",90],
    ["SPOTIFY","outras",76],["OPENAI","outras",76],["CHATGPT","outras",76],["MICROSOFT","outras",72],["GOOGLE ONE","outras",76]
  ].map(([keyword,accountId,confidence]) => ({id:`base_${norm(keyword).replace(/ /g,"_")}`,keyword:norm(keyword),accountId,confidence,source:"base"}));

  function defaultState() {
    return {version:1,accounts:structuredClone(DEFAULT_ACCOUNTS),rules:structuredClone(DEFAULT_RULES),transactions:[],invoices:[],files:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  }

  async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", typeof value === "string" ? encoder.encode(value) : value);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,"0")).join("");
  }

  function bytesToB64(bytes) {
    let binary = ""; const chunk = 0x8000;
    for (let i=0;i<bytes.length;i+=chunk) binary += String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(binary);
  }
  function b64ToBytes(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }

  async function deriveKey(secret, userId) {
    const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt:encoder.encode(`memory-financeiro-v1:${userId}`),iterations:150000,hash:"SHA-256"}, material, {name:"AES-GCM",length:256}, false, ["encrypt","decrypt"]);
  }

  async function encryptState(value, secret) {
    const user = await MMCDAuth.user();
    const key = await deriveKey(secret, user.id);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = encoder.encode(JSON.stringify(value));
    const cipher = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, plain);
    return {v:1,alg:"AES-GCM+PBKDF2",iv:bytesToB64(iv),data:bytesToB64(new Uint8Array(cipher)),updatedAt:new Date().toISOString()};
  }

  async function decryptState(envelope, secret) {
    if (!envelope?.data || !envelope?.iv) return null;
    const user = await MMCDAuth.user();
    const key = await deriveKey(secret, user.id);
    const plain = await crypto.subtle.decrypt({name:"AES-GCM",iv:b64ToBytes(envelope.iv)}, key, b64ToBytes(envelope.data));
    return JSON.parse(decoder.decode(plain));
  }

  async function readEnvelope() {
    let remote = null;
    try {
      remote = await MemoryConfig.read(STORE_KEY, null, {fresh:true});
      if (remote?.data) { syncMode = "Supabase criptografado"; localStorage.setItem(LOCAL_KEY, JSON.stringify(remote)); return remote; }
    } catch (error) { console.warn("Financeiro: usando cache local criptografado.", error); }
    try { const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"); if (local?.data) { syncMode = "Local criptografado"; return local; } } catch {}
    syncMode = "Supabase criptografado";
    return null;
  }

  async function persist() {
    if (!state || !password) return;
    state.updatedAt = new Date().toISOString();
    const envelope = await encryptState(state, password);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(envelope));
    try { await MemoryConfig.write(STORE_KEY, envelope); syncMode = "Supabase criptografado"; }
    catch (error) { syncMode = "Local criptografado"; console.warn("Financeiro: sincronização pendente.", error); }
    updateSyncBadge();
  }

  function queueSave() {
    saving = saving.catch(()=>{}).then(persist).catch(error => { console.error(error); toast("Não foi possível salvar o Financeiro agora.", 5200); });
    return saving;
  }

  async function unlock(secret) {
    if (await sha256(secret) !== PASSWORD_HASH) throw new Error("Senha incorreta.");
    password = secret;
    const envelope = await readEnvelope();
    if (envelope) {
      try { state = await decryptState(envelope, secret); }
      catch { password=""; throw new Error("Não foi possível abrir os dados com esta senha."); }
    } else {
      state = defaultState();
      await persist();
    }
    migrateState();
  }

  function migrateState() {
    state ||= defaultState();
    state.accounts ||= [];
    for (const base of DEFAULT_ACCOUNTS) if (!state.accounts.some(a => a.id === base.id)) state.accounts.push(structuredClone(base));
    state.rules ||= [];
    for (const rule of DEFAULT_RULES) if (!state.rules.some(r => r.id === rule.id)) state.rules.push(structuredClone(rule));
    state.transactions ||= []; state.invoices ||= []; state.files ||= [];
  }

  function lock() {
    password = ""; state = null; activeTab = "overview";
    $("#finance-app").hidden = true; $("#finance-lock").hidden = false; $("#finance-lock-button").hidden = true; $("#finance-sync-badge").hidden = true;
    $("#finance-password").value = ""; setTimeout(()=>$("#finance-password")?.focus(),50);
  }

  function updateSyncBadge() {
    const badge = $("#finance-sync-badge"); if (!badge) return;
    badge.textContent = `🔐 ${syncMode || "Criptografado"}`; badge.hidden = false;
  }

  function accountById(id) { return state?.accounts?.find(a => a.id === id) || null; }
  function invoiceById(id) { return state?.invoices?.find(a => a.id === id) || null; }
  function expected(account, period=currentPeriod()) { return num(account?.amounts?.[period]); }

  function eligibleTx(tx) { return tx.kind !== "card-payment" && tx.status !== "ignored"; }
  function isExpenseTx(tx) { const a=accountById(tx.accountId); return tx.status==="reconciled" && a?.type==="expense" && eligibleTx(tx); }
  function isIncomeTx(tx) { const a=accountById(tx.accountId); return tx.status==="reconciled" && a?.type==="income" && eligibleTx(tx); }
  function txMagnitude(tx) { return Math.abs(num(tx.amount)); }

  function transactionsFor(period=currentPeriod()) { return state.transactions.filter(tx => tx.period === period); }
  function invoicesFor(period=currentPeriod()) { return state.invoices.filter(inv => inv.period === period); }

  function totals(period=currentPeriod()) {
    const txs = transactionsFor(period);
    const income = txs.filter(isIncomeTx).reduce((s,t)=>s+txMagnitude(t),0);
    const expenses = txs.filter(isExpenseTx).reduce((s,t)=>s+txMagnitude(t),0);
    const pending = txs.filter(t => t.status === "pending" && eligibleTx(t)).reduce((s,t)=>s+txMagnitude(t),0);
    const eligible = txs.filter(eligibleTx);
    const reconciled = eligible.filter(t => t.status === "reconciled").length;
    const plannedExpense = state.accounts.filter(a=>a.active && a.type==="expense").reduce((s,a)=>s+expected(a,period),0);
    const plannedIncome = state.accounts.filter(a=>a.active && a.type==="income").reduce((s,a)=>s+expected(a,period),0);
    return {income,expenses,pending,balance:income-expenses,reconciled,eligible:eligible.length,plannedExpense,plannedIncome};
  }

  function defaultSuggestion(tx) {
    if (tx.status !== "pending") return null;
    if (tx.source === "statement" && tx.amount < 0) {
      const desc = norm(tx.description);
      const inv = state.invoices.find(i => !i.paymentTxId && Math.abs(num(i.total)-Math.abs(tx.amount)) <= .01 && (/ITAU BLACK|CARTAO|FATURA/.test(desc) || i.cardFinal));
      if (inv) return {type:"invoice",invoiceId:inv.id,label:`Fatura ${inv.cardFinal ? `final ${inv.cardFinal}` : "importada"}`,confidence:100};
    }
    const desc = norm(tx.description);
    const rules = [...state.rules].sort((a,b)=>num(b.confidence)-num(a.confidence));
    const rule = rules.find(r => r.keyword && desc.includes(r.keyword) && accountById(r.accountId)?.active);
    if (rule) return {type:"account",accountId:rule.accountId,label:accountById(rule.accountId)?.name || "Conta",confidence:num(rule.confidence)};
    return null;
  }

  function refreshSuggestions() {
    for (const tx of state.transactions) {
      if (tx.status !== "pending") continue;
      const s = defaultSuggestion(tx);
      tx.suggestion = s || null;
    }
  }

  async function ensureXlsx() {
    if (window.XLSX) return window.XLSX;
    await new Promise((resolve,reject)=>{
      const existing = document.querySelector('script[data-memory-xlsx]');
      if (existing) { existing.addEventListener("load",resolve,{once:true}); existing.addEventListener("error",()=>reject(new Error("Não foi possível carregar o leitor de Excel.")),{once:true}); return; }
      const script=document.createElement("script"); script.src=XLSX_URL; script.dataset.memoryXlsx="1"; script.onload=resolve; script.onerror=()=>reject(new Error("Não foi possível carregar o leitor de Excel.")); document.head.append(script);
    });
    return window.XLSX;
  }

  async function fileHash(file) { return sha256(await file.arrayBuffer()); }

  function flatText(rows) { return norm(rows.flat().filter(v=>v!==null&&v!==undefined).map(v=>String(v)).join(" | ")); }

  function parseInvoice(rows, hash, file) {
    let headerIndex = rows.findIndex(row => row.some(v => norm(v)==="DATA") && row.some(v => /LANCAMENTO/.test(norm(v))) && row.some(v => norm(v)==="VALOR"));
    if (headerIndex < 0) throw new Error("Não encontrei a tabela de lançamentos da fatura.");
    const headers = rows[headerIndex].map(v=>norm(v));
    const dateIdx=headers.findIndex(v=>v==="DATA"), descIdx=headers.findIndex(v=>/LANCAMENTO/.test(v)), amountIdx=headers.findIndex(v=>v==="VALOR"), parcelIdx=headers.findIndex(v=>/PARCEL/.test(v));
    let cardName="Cartão importado", cardFinal="", total=0, dueDate="", period="";
    for (let i=0;i<headerIndex;i++) {
      const row=rows[i]||[]; const text=row.map(v=>String(v??"")).join(" ");
      if (/final\s*\d{4}/i.test(text)) {
        const cardCell=row.find(v=>/final\s*\d{4}/i.test(String(v??"")));
        cardName=String(cardCell||text).trim();
        cardFinal=(String(cardCell||text).match(/final\s*(\d{4})/i)||[])[1]||"";
      }
      const monthMatch=text.match(/(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*[\/\-]\s*(20\d{2})/i);
      if (monthMatch) { const month=MONTHS_PT[monthMatch[1].toLowerCase().replace("ç","c")] || MONTHS_PT[monthMatch[1].toLowerCase()]; period=`${monthMatch[2]}-${String(month).padStart(2,"0")}`; }
      if (/voce pagou|você pagou|total da fatura|fatura paga/i.test(text)) {
        const nums=row.filter(v=>typeof v==="number" && Math.abs(v)>0 && !(v>20000&&v<80000));
        if (nums.length) total=Math.max(total,...nums.map(v=>Math.abs(v)));
        const m=text.match(/R\$\s*([\d.]+,\d{2})/i); if (m) total=Math.max(total,Number(m[1].replace(/\./g,"").replace(",",".")));
      }
      const vIdx=row.findIndex(v=>norm(v)==="VENCIMENTO"); if(vIdx>=0 && rows[i+1]) dueDate=dateIso(rows[i+1][vIdx]);
    }
    const invoiceId=`inv_${hash.slice(0,16)}`;
    const txs=[];
    for(let i=headerIndex+1;i<rows.length;i++){
      const row=rows[i]||[]; const description=String(row[descIdx]??"").trim(); const amount=Number(row[amountIdx]);
      if(!description || !Number.isFinite(amount)) continue;
      const date=dateIso(row[dateIdx]);
      if(!date && !/pagamento/i.test(description)) continue;
      const kind=amount<0 || /pagamento efetuado/i.test(description) ? "card-payment" : "card-charge";
      txs.push({id:`tx_${hash.slice(0,10)}_${i}`,fileHash:hash,source:"invoice",invoiceId,date,period:period || periodFromDate(date),description,normalized:norm(description),amount,kind,installment:String(row[parcelIdx]??"").trim(),status:kind==="card-payment"?"ignored":"pending",accountId:null,invoiceMatchId:null,suggestion:null,createdAt:new Date().toISOString()});
    }
    if(!total) total=txs.filter(t=>t.kind==="card-charge").reduce((s,t)=>s+Math.max(0,t.amount),0);
    if(!period) period=dueDate?periodFromDate(dueDate):(txs.find(t=>t.period)?.period || currentPeriod());
    for(const tx of txs) if(!tx.period) tx.period=period;
    return {invoice:{id:invoiceId,fileHash:hash,fileName:file.name,cardName,cardFinal,total,dueDate,period,paymentTxId:null,importedAt:new Date().toISOString()},transactions:txs,kind:"invoice"};
  }

  function findStatementHeader(rows) {
    for(let i=0;i<Math.min(rows.length,80);i++){
      const h=(rows[i]||[]).map(v=>norm(v));
      const d=h.findIndex(v=>v==="DATA"||/DATA/.test(v));
      const desc=h.findIndex(v=>/LANC|HIST|DESCR|DETALHE/.test(v));
      const value=h.findIndex(v=>/^VALOR/.test(v)||/VALOR R/.test(v));
      if(d>=0 && desc>=0 && value>=0) return {row:i,dateIdx:d,descIdx:desc,valueIdx:value};
    }
    return null;
  }

  function parseStatement(rows, hash, file) {
    const header=findStatementHeader(rows); const txs=[]; let currentDate="";
    const ignore=/^(DATA|LANCAMENTOS?|HISTORICO|VALOR|SALDO|CONTA|AGENCIA|NOME|EXTRATO|MOVIMENTACAO|MOVIMENTACOES)$/;
    const start=header?header.row+1:0;
    for(let i=start;i<rows.length;i++){
      const row=rows[i]||[];
      let date="";
      if(header) date=dateIso(row[header.dateIdx]);
      if(!date){ for(const cell of row){ const d=dateIso(cell); if(d){date=d;break;} } }
      if(date) currentDate=date;
      let description=""; let amount=null;
      if(header){ description=String(row[header.descIdx]??"").trim(); const raw=moneyValue(row[header.valueIdx]); if(Number.isFinite(raw)) amount=raw; }
      if(!description){
        const texts=row.map((v,idx)=>({v:String(v??"").trim(),idx})).filter(x=>x.v && !dateIso(x.v) && !ignore.test(norm(x.v)) && !/^R\$/.test(x.v));
        description=texts.length ? texts.slice(0,2).map(x=>x.v).join(" ") : "";
      }
      if(amount===null){
        const descIndex=row.findIndex(v=>String(v??"").trim()===description.split(" ")[0]);
        const candidates=row.map((v,idx)=>({v:moneyValue(v),idx,raw:v})).filter(x=>Number.isFinite(x.v)&&x.v!==0&&!(x.v>20000&&x.v<80000)&&(descIndex<0||x.idx>descIndex));
        if(candidates.length) {
          const preferred=candidates.find(x=>x.v<0 || /,\d{1,2}$/.test(String(x.raw??""))) || candidates[0];
          amount=preferred.v;
        }
      }
      if(!currentDate || !description || !Number.isFinite(amount) || Math.abs(amount)<0.005) continue;
      if(/SALDO ANTERIOR|SALDO DO DIA|SALDO DISPONIVEL|SALDO TOTAL/i.test(description)) continue;
      txs.push({id:`tx_${hash.slice(0,10)}_${i}`,fileHash:hash,source:"statement",date:currentDate,period:periodFromDate(currentDate),description,normalized:norm(description),amount,kind:amount>=0?"bank-credit":"bank-debit",status:"pending",accountId:null,invoiceMatchId:null,suggestion:null,createdAt:new Date().toISOString()});
    }
    if(!txs.length) throw new Error("Não consegui identificar lançamentos no extrato. O arquivo pode usar um layout ainda não mapeado.");
    return {transactions:txs,kind:"statement"};
  }

  async function parseFile(file) {
    await ensureXlsx(); const buffer=await file.arrayBuffer(); const hash=await sha256(buffer);
    if(state.files.some(f=>f.hash===hash)) return {duplicate:true,file,hash};
    const workbook=XLSX.read(buffer,{type:"array",cellDates:true,cellNF:false,cellText:false});
    const sheet=workbook.Sheets[workbook.SheetNames[0]]; const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:null,blankrows:false});
    const text=flatText(rows.slice(0,120));
    const parsed=/FATURA|LANCAMENTOS.*PARCELAMENTO|CARTAO.*VENCIMENTO/.test(text) ? parseInvoice(rows,hash,file) : parseStatement(rows,hash,file);
    parsed.file={hash,name:file.name,size:file.size,kind:parsed.kind,importedAt:new Date().toISOString()};
    return parsed;
  }

  async function importFiles(files) {
    const status=$("#finance-import-status"); status.innerHTML="";
    let added=0, duplicates=0; let lastPeriod="";
    for(const file of files){
      const line=document.createElement("div"); line.className="finance-import-result"; line.innerHTML=`Lendo <strong>${esc(file.name)}</strong>…`; status.prepend(line);
      try{
        const parsed=await parseFile(file);
        if(parsed.duplicate){ duplicates++; line.innerHTML=`↺ <strong>${esc(file.name)}</strong> já foi importado. Nada foi duplicado.`; continue; }
        if(parsed.invoice){ state.invoices.push(parsed.invoice); lastPeriod=parsed.invoice.period || lastPeriod; }
        state.transactions.push(...parsed.transactions); state.files.push(parsed.file); added+=parsed.transactions.length;
        if(parsed.transactions.length) lastPeriod=parsed.transactions.map(t=>t.period).sort().at(-1) || lastPeriod;
        line.innerHTML=`✓ <strong>${esc(file.name)}</strong>: ${parsed.transactions.length} lançamentos lidos como ${parsed.kind==="invoice"?"fatura":"extrato"}.`;
      }catch(error){ console.error(error); line.innerHTML=`⚠ <strong>${esc(file.name)}</strong>: ${esc(error.message || "não foi possível importar")}.`; }
    }
    refreshSuggestions(); await queueSave();
    if(lastPeriod && /^\d{4}-\d{2}$/.test(lastPeriod)) $("#finance-period").value=lastPeriod;
    renderAll();
    if(added) { setTab("reconcile"); toast(`${added} lançamentos importados. Revise as pendências.`); }
    else if(duplicates) toast("Os arquivos selecionados já estavam importados.");
  }

  function learnFrom(tx, accountId) {
    const clean=norm(tx.description).replace(/\b\d{3,}\b/g,"").replace(/\s+/g," ").trim();
    const keyword=clean.split(" ").slice(0,3).join(" ");
    if(keyword.length<4 || state.rules.some(r=>r.keyword===keyword&&r.accountId===accountId)) return;
    state.rules.push({id:uid("rule"),keyword,accountId,confidence:97,source:"learned",createdAt:new Date().toISOString()});
  }

  async function reconcileTx(txId, target, learn=false) {
    const tx=state.transactions.find(t=>t.id===txId); if(!tx) return;
    if(target?.startsWith("invoice:")){
      const invoiceId=target.split(":")[1], inv=invoiceById(invoiceId); if(!inv) return;
      tx.status="reconciled"; tx.invoiceMatchId=invoiceId; tx.accountId="cartao"; tx.reconciledAt=new Date().toISOString(); inv.paymentTxId=tx.id; inv.paidAt=tx.date;
    }else{
      const accountId=target || tx.suggestion?.accountId; if(!accountById(accountId)) { toast("Escolha uma conta para conciliar."); return; }
      tx.status="reconciled"; tx.accountId=accountId; tx.invoiceMatchId=null; tx.reconciledAt=new Date().toISOString(); if(learn) learnFrom(tx,accountId);
    }
    refreshSuggestions(); await queueSave(); renderAll();
  }

  async function reopenTx(txId) {
    const tx=state.transactions.find(t=>t.id===txId); if(!tx) return;
    if(tx.invoiceMatchId){ const inv=invoiceById(tx.invoiceMatchId); if(inv?.paymentTxId===tx.id){inv.paymentTxId=null;inv.paidAt=null;} }
    tx.status="pending"; tx.accountId=null; tx.invoiceMatchId=null; tx.reconciledAt=null; refreshSuggestions(); await queueSave(); renderAll();
  }

  async function ignoreTx(txId) { const tx=state.transactions.find(t=>t.id===txId); if(!tx)return; tx.status="ignored"; tx.suggestion=null; await queueSave(); renderAll(); }

  async function reconcileExact() {
    const txs=transactionsFor().filter(t=>t.status==="pending" && num(t.suggestion?.confidence)>=95);
    if(!txs.length){toast("Nenhuma correspondência exata pendente neste período.");return;}
    for(const tx of txs){ const s=tx.suggestion; if(s.type==="invoice") await reconcileTx(tx.id,`invoice:${s.invoiceId}`); else await reconcileTx(tx.id,s.accountId,false); }
    toast(`${txs.length} correspondência(s) exata(s) conciliada(s).`);
  }

  function setTab(tab) {
    activeTab=tab; $$('[data-finance-tab]').forEach(b=>b.classList.toggle("active",b.dataset.financeTab===tab)); $$('[data-finance-panel]').forEach(p=>p.classList.toggle("active",p.dataset.financePanel===tab));
  }

  function renderKpis() {
    const t=totals(); const rate=t.eligible?100*t.reconciled/t.eligible:0;
    $("#finance-kpis").innerHTML=`
      <div class="finance-kpi finance-kpi--positive"><span>Entradas conciliadas</span><strong>${brl(t.income)}</strong><small>${periodLabel(currentPeriod())}</small></div>
      <div class="finance-kpi"><span>Despesas conciliadas</span><strong>${brl(t.expenses)}</strong><small>Compras + débitos reais</small></div>
      <div class="finance-kpi ${t.balance>=0?"finance-kpi--positive":"finance-kpi--attention"}"><span>Resultado realizado</span><strong>${brl(t.balance)}</strong><small>Entradas − despesas</small></div>
      <div class="finance-kpi finance-kpi--attention"><span>Pendente</span><strong>${brl(t.pending)}</strong><small>Precisa de conciliação</small></div>
      <div class="finance-kpi"><span>Conciliação</span><strong>${pct(rate)}</strong><small>${t.reconciled} de ${t.eligible} lançamentos</small></div>`;
  }

  function renderPlan() {
    const t=totals(); const expenseDelta=t.plannedExpense?100*t.expenses/t.plannedExpense:0;
    $("#finance-plan-summary").innerHTML=`
      <div class="finance-summary-line"><span>Receitas previstas</span><strong>${brl(t.plannedIncome)}</strong></div>
      <div class="finance-summary-line"><span>Receitas realizadas</span><strong>${brl(t.income)}</strong></div>
      <div class="finance-summary-line"><span>Despesas previstas</span><strong>${brl(t.plannedExpense)}</strong></div>
      <div class="finance-summary-line"><span>Despesas realizadas</span><strong>${brl(t.expenses)}</strong></div>
      <div class="finance-progress"><i style="width:${Math.min(100,expenseDelta)}%"></i></div>
      <small class="muted">${t.plannedExpense?`${pct(expenseDelta)} do orçamento de despesas realizado.`:"Cadastre valores previstos em Contas para comparar o mês."}</small>`;
  }

  function renderReconcileSummary() {
    const txs=transactionsFor().filter(eligibleTx), pending=txs.filter(t=>t.status==="pending"), exact=pending.filter(t=>num(t.suggestion?.confidence)>=95), suggested=pending.filter(t=>t.suggestion);
    const rate=txs.length?100*(txs.length-pending.length)/txs.length:0;
    $("#finance-reconcile-summary").innerHTML=`
      <div class="finance-summary-line"><span>Correspondências exatas</span><strong>${exact.length}</strong></div>
      <div class="finance-summary-line"><span>Com sugestão</span><strong>${suggested.length}</strong></div>
      <div class="finance-summary-line"><span>Sem classificação</span><strong>${pending.length-suggested.length}</strong></div>
      <div class="finance-progress"><i style="width:${rate}%"></i></div>
      <button type="button" class="btn" data-go-reconcile>Ir para Conciliação →</button>`;
  }

  function categoryTotals(period=currentPeriod()) {
    const map=new Map(); for(const tx of transactionsFor(period)){ if(!isExpenseTx(tx)) continue; const a=accountById(tx.accountId); if(!a)continue; map.set(a.id,(map.get(a.id)||0)+txMagnitude(tx)); }
    return [...map.entries()].map(([id,value])=>({account:accountById(id),value})).sort((a,b)=>b.value-a.value);
  }

  function renderCategories() {
    const items=categoryTotals(), max=Math.max(1,...items.map(i=>i.value));
    $("#finance-category-summary").innerHTML=items.length?`<div class="finance-category-list">${items.map(i=>`<div class="finance-category-row"><strong>${esc(i.account.name)}</strong><div class="finance-category-row__bar"><i style="width:${100*i.value/max}%"></i></div><small>${brl(i.value)}</small></div>`).join("")}</div>`:`<div class="finance-empty">Nenhuma despesa conciliada neste período.<br>Importe extrato/fatura e use a fila de Conciliação.</div>`;
  }

  function actualForAccount(accountId,period=currentPeriod()) { return transactionsFor(period).filter(t=>t.status==="reconciled"&&t.accountId===accountId&&eligibleTx(t)).reduce((s,t)=>s+txMagnitude(t),0); }

  function renderAccounts() {
    const period=currentPeriod(); const accounts=state.accounts.filter(a=>a.active && a.type!=="settlement").sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
    $("#finance-accounts-list").innerHTML=accounts.map(a=>`
      <div class="finance-account-row" data-account-id="${esc(a.id)}">
        <div class="finance-account-name"><strong>${esc(a.name)}</strong><small>${a.type==="income"?"Receita":"Despesa"}</small></div>
        <select data-account-type><option value="expense" ${a.type==="expense"?"selected":""}>Despesa</option><option value="income" ${a.type==="income"?"selected":""}>Receita</option></select>
        <input data-account-expected type="number" min="0" step="0.01" value="${expected(a,period)||""}" placeholder="Previsto">
        <div class="finance-account-actual"><strong>${brl(actualForAccount(a.id,period))}</strong><small>realizado</small></div>
        <div class="finance-row-actions"><button class="finance-mini-btn" data-account-rename>Renomear</button><button class="finance-mini-btn" data-account-delete>Ocultar</button></div>
      </div>`).join("") || `<div class="finance-empty">Nenhuma conta cadastrada.</div>`;
  }

  function renderCards() {
    const invoices=invoicesFor().sort((a,b)=>(b.dueDate||"").localeCompare(a.dueDate||""));
    $("#finance-cards-list").innerHTML=invoices.length?invoices.map(inv=>{
      const charges=state.transactions.filter(t=>t.invoiceId===inv.id&&t.kind==="card-charge"), reconciled=charges.filter(t=>t.status==="reconciled"), classified=reconciled.reduce((s,t)=>s+txMagnitude(t),0), pending=charges.filter(t=>t.status==="pending").reduce((s,t)=>s+txMagnitude(t),0);
      const groups=new Map(); for(const tx of reconciled){const a=accountById(tx.accountId);if(a)groups.set(a.name,(groups.get(a.name)||0)+txMagnitude(tx));}
      return `<div class="finance-card-item"><div class="finance-card-item__head"><div><p class="eyebrow">Fatura ${esc(inv.cardFinal?`final ${inv.cardFinal}`:"")}</p><h3>${esc(inv.cardName||"Cartão")}</h3><div class="finance-card-item__meta">${inv.dueDate?`Vencimento ${formatDate(inv.dueDate)} · `:""}${charges.length} compra(s) importada(s)</div></div><div class="finance-card-item__total"><strong>${brl(inv.total)}</strong><span class="finance-card-status ${inv.paymentTxId?"paid":"pending"}">${inv.paymentTxId?"✓ paga e conciliada":"⏳ pagamento pendente"}</span></div></div><div class="finance-progress"><i style="width:${charges.length?100*reconciled.length/charges.length:0}%"></i></div><div class="finance-summary-line"><span>Compras classificadas</span><strong>${brl(classified)}</strong></div><div class="finance-summary-line"><span>A classificar</span><strong>${brl(pending)}</strong></div><div class="finance-card-breakdown">${[...groups.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,val])=>`<span>${esc(name)} · ${brl(val)}</span>`).join("") || '<span>Sem categorias conciliadas ainda</span>'}</div></div>`;
    }).join(""):`<div class="finance-empty">Nenhuma fatura importada neste período.<br>Vá em Conciliação e importe seu XLS/XLSX.</div>`;
  }

  function targetOptions(tx) {
    const accounts=state.accounts.filter(a=>a.active && a.type!=="settlement").sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
    const suggestion=tx.suggestion; const suggestedValue=suggestion?.type==="account"?suggestion.accountId:"";
    return `<option value="">Escolher conta…</option>${accounts.map(a=>`<option value="${esc(a.id)}" ${a.id===suggestedValue?"selected":""}>${esc(a.name)}</option>`).join("")}`;
  }

  function filteredReconcileTxs() {
    let txs=transactionsFor().filter(eligibleTx);
    if(reconcileFilter==="pending") txs=txs.filter(t=>t.status==="pending");
    if(reconcileFilter==="suggested") txs=txs.filter(t=>t.status==="pending"&&t.suggestion);
    if(reconcileFilter==="reconciled") txs=txs.filter(t=>t.status==="reconciled");
    return txs.sort((a,b)=>(b.date||"").localeCompare(a.date||"") || txMagnitude(b)-txMagnitude(a));
  }

  function renderReconcile() {
    const txs=filteredReconcileTxs();
    $("#finance-reconcile-list").innerHTML=txs.length?txs.map(tx=>{
      const s=tx.suggestion; const account=accountById(tx.accountId); const inv=tx.invoiceMatchId?invoiceById(tx.invoiceMatchId):null;
      const targetLabel=inv?`Fatura ${inv.cardFinal||"importada"}`:account?.name;
      const special=s?.type==="invoice";
      return `<div class="finance-reconcile-item ${tx.status==="reconciled"?"reconciled":""}" data-tx-id="${esc(tx.id)}">
        <div class="finance-reconcile-main"><div class="finance-reconcile-top"><span class="finance-source-badge">${tx.source==="invoice"?"💳 Fatura":"🏦 Extrato"}</span>${tx.status==="reconciled"?'<span class="finance-status-badge">✓ Conciliado</span>':s?`<span class="finance-confidence">${s.confidence}% · ${esc(s.label)}</span>`:""}</div><h3>${esc(tx.description)}</h3><div class="finance-reconcile-meta"><span>${formatDate(tx.date)}</span>${tx.installment?`<span>${esc(tx.installment)}</span>`:""}${tx.source==="invoice"&&tx.invoiceId?`<span>${esc(invoiceById(tx.invoiceId)?.cardFinal?`cartão ${invoiceById(tx.invoiceId).cardFinal}`:"")}</span>`:""}</div></div>
        <div class="finance-reconcile-amount ${tx.amount>=0?"credit":"debit"}">${brl(tx.amount)}</div>
        <div class="finance-reconcile-actions">${tx.status==="reconciled"?`<span class="muted">Ligado a <strong>${esc(targetLabel||"conta")}</strong></span><button class="btn" data-reopen>Reabrir</button>`:special?`<span class="muted">Pagamento com o mesmo valor da <strong>${esc(s.label)}</strong>.</span><button class="btn primary" data-reconcile-invoice="${esc(s.invoiceId)}">Conciliar fatura</button><button class="btn" data-ignore>Ignorar</button>`:`<select class="finance-reconcile-select" data-target-account>${targetOptions(tx)}</select><label class="finance-learn-label"><input type="checkbox" data-learn-rule checked> Aprender descrição</label><button class="btn primary" data-reconcile-account>Conciliar</button><button class="btn" data-ignore>Ignorar</button>`}</div>
      </div>`;
    }).join(""):`<div class="finance-empty">${reconcileFilter==="reconciled"?"Nenhum lançamento conciliado neste período.":"Nenhuma pendência aqui. 🎉"}</div>`;
    const pending=transactionsFor().filter(t=>t.status==="pending"&&eligibleTx(t)).length; $("#finance-tab-pending").textContent=pending;
  }

  function renderEvolution() {
    const periods=[...new Set(state.transactions.map(t=>t.period).filter(Boolean))].sort().slice(-12); const rows=periods.map(period=>({period,...totals(period)})); const max=Math.max(1,...rows.flatMap(r=>[r.income,r.expenses]));
    $("#finance-evolution-list").innerHTML=rows.length?rows.map(r=>`<div class="finance-evolution-row"><strong>${periodLabel(r.period)}</strong><div class="finance-evolution-bars"><div class="finance-evolution-bar income"><i style="width:${100*r.income/max}%"></i></div><div class="finance-evolution-bar expense"><i style="width:${100*r.expenses/max}%"></i></div></div><div class="finance-evolution-value"><strong>${brl(r.income)}</strong><small>entradas</small></div><div class="finance-evolution-value"><strong>${brl(r.expenses)}</strong><small>despesas</small></div></div>`).join(""):`<div class="finance-empty">A evolução aparecerá depois das primeiras conciliações.</div>`;
  }

  function renderAll() { if(!state)return; refreshSuggestions(); renderKpis(); renderPlan(); renderReconcileSummary(); renderCategories(); renderAccounts(); renderCards(); renderReconcile(); renderEvolution(); updateSyncBadge(); setTab(activeTab); }

  function showAccountModal() {
    const modal=$("#finance-modal"); modal.hidden=false; modal.innerHTML=`<section class="finance-modal__card" role="dialog" aria-modal="true"><p class="eyebrow">Nova conta</p><h2>Adicionar ao planejamento</h2><form id="finance-account-form"><div class="finance-modal__grid"><label>Nome<input name="name" required maxlength="60" placeholder="Ex.: Escola"></label><label>Tipo<select name="type"><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label>Valor previsto em ${esc(periodLabel(currentPeriod()))}<input name="amount" type="number" min="0" step="0.01" placeholder="0,00"></label></div><div class="finance-modal__actions"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn primary" type="submit">Adicionar</button></div></form></section>`;
  }
  function closeModal(){ $("#finance-modal").hidden=true; $("#finance-modal").innerHTML=""; }

  async function addAccount(form) {
    const data=new FormData(form), name=String(data.get("name")||"").trim(), type=String(data.get("type")||"expense"), amount=num(data.get("amount")); if(!name)return;
    const a={id:uid("acc"),name,type,active:true,amounts:{},createdAt:new Date().toISOString()}; if(amount>0)a.amounts[currentPeriod()]=amount; state.accounts.push(a); await queueSave(); closeModal(); renderAll();
  }

  async function accountAction(row, action) {
    const id=row?.dataset.accountId, a=accountById(id); if(!a)return;
    if(action==="rename"){ const name=prompt("Novo nome da conta:",a.name); if(name?.trim())a.name=name.trim(); }
    if(action==="delete"){ if(confirm(`Ocultar ${a.name}? Os lançamentos antigos serão preservados.`))a.active=false; }
    await queueSave(); renderAll();
  }

  function bindEvents() {
    $("#finance-lock-form")?.addEventListener("submit", async event=>{ event.preventDefault(); const input=$("#finance-password"), error=$("#finance-lock-error"); error.textContent=""; const button=event.submitter; button.disabled=true; button.textContent="Abrindo…"; try{await unlock(input.value); $("#finance-lock").hidden=true; $("#finance-app").hidden=false; $("#finance-lock-button").hidden=false; const stored=localStorage.getItem("memory:financeiro:period"); $("#finance-period").value=/^\d{4}-\d{2}$/.test(stored||"")?stored:new Date().toISOString().slice(0,7); renderAll();}catch(e){error.textContent=e.message||"Senha incorreta.";input.select();}finally{button.disabled=false;button.textContent="Abrir Financeiro";} });
    $("#finance-password-toggle")?.addEventListener("click",()=>{const input=$("#finance-password");input.type=input.type==="password"?"text":"password";});
    $("#finance-lock-button")?.addEventListener("click", lock);
    $("#finance-period")?.addEventListener("change",()=>{localStorage.setItem("memory:financeiro:period",currentPeriod());renderAll();});
    document.addEventListener("click", event=>{
      const tab=event.target.closest("[data-finance-tab]"); if(tab){setTab(tab.dataset.financeTab);return;}
      if(event.target.closest("[data-go-reconcile]")){setTab("reconcile");return;}
      const filter=event.target.closest("[data-reconcile-filter]"); if(filter){reconcileFilter=filter.dataset.reconcileFilter; $$('[data-reconcile-filter]').forEach(b=>b.classList.toggle("active",b===filter));renderReconcile();return;}
      if(event.target.closest("#finance-add-account")){showAccountModal();return;}
      if(event.target.closest("[data-modal-close]")){closeModal();return;}
      const row=event.target.closest(".finance-account-row"); if(row&&event.target.closest("[data-account-rename]")){accountAction(row,"rename");return;} if(row&&event.target.closest("[data-account-delete]")){accountAction(row,"delete");return;}
      const item=event.target.closest(".finance-reconcile-item"); if(item){ const id=item.dataset.txId; if(event.target.closest("[data-reconcile-account]")){const target=item.querySelector("[data-target-account]")?.value, learn=item.querySelector("[data-learn-rule]")?.checked;reconcileTx(id,target,learn);return;} const invBtn=event.target.closest("[data-reconcile-invoice]");if(invBtn){reconcileTx(id,`invoice:${invBtn.dataset.reconcileInvoice}`,false);return;}if(event.target.closest("[data-ignore]")){ignoreTx(id);return;}if(event.target.closest("[data-reopen]")){reopenTx(id);return;} }
    });
    $("#finance-file-input")?.addEventListener("change",event=>{const files=[...event.target.files];event.target.value="";if(files.length)importFiles(files);});
    $("#finance-reconcile-exact")?.addEventListener("click",reconcileExact);
    $("#finance-account-form")?.addEventListener?.("submit",()=>{});
    $("#finance-modal")?.addEventListener("submit",event=>{if(event.target.id==="finance-account-form"){event.preventDefault();addAccount(event.target);}});
    $("#finance-accounts-list")?.addEventListener("change",async event=>{const row=event.target.closest(".finance-account-row"), a=accountById(row?.dataset.accountId);if(!a)return;if(event.target.matches("[data-account-type]"))a.type=event.target.value;if(event.target.matches("[data-account-expected]")){a.amounts ||= {};const v=num(event.target.value);if(v>0)a.amounts[currentPeriod()]=v;else delete a.amounts[currentPeriod()];}await queueSave();renderAll();});
  }

  async function init() {
    await MMCDAuth.requireSession();
    bindEvents();
    $("#finance-password")?.focus();
  }

  return {init,lock};
})();

window.addEventListener("load",()=>MemoryFinance.init().catch(error=>{console.error(error);window.MMCDUI?.toast?.("Não foi possível iniciar o Financeiro.",5000);}));
