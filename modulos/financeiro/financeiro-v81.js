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

  function previousPeriod(period=currentPeriod()) {
    const [year,month]=String(period||"").split("-").map(Number);
    if(!year || !month) return "";
    const d=new Date(year,month-2,1,12,0,0);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  // V81.2 — modelo mensal de teste.
  // O amarelo da planilha representa "previsto para pagar".
  // Para testar com a fatura Julho/2026 enviada, o modelo cria o previsto de jul/2026.
  // A linha geral do cartão é tratada como "demais gastos do cartão";
  // somada às contas detalhadas do cartão, forma o previsto total da fatura.
  const TEST_PLAN_PERIOD = "2026-07";
  const TEST_PLAN_JUL_2026 = {
    "cartao-outros":2396.28,
    "combustivel":453.03,
    "livros":150.00,
    "seguro-carro":278.04,
    "racao":400.00,
    "gympass":139.90,
    "barbeiro":139.99,
    "gas":0,
    "iptu":0,
    "celular":51.75,
    "luz-cpfl":113.60,
    "internet":199.99,
    "condominio":0,
    "agua":48.70,
    "moradia":3330.00,
    "outras":2200.00,
    "amortizacao":0,
    "salario":12770.53,
    "renda-taina":1100.00,
    "ppr":0,
    "13-salario":0
  };

  const DEFAULT_ACCOUNTS = [
    {id:"cartao",name:"Pagamento de fatura",type:"settlement",nature:"fixed",paymentMethod:"bank",active:true},
    {id:"cartao-outros",name:"Cartão de crédito — demais gastos",type:"expense",nature:"variable",paymentMethod:"card",active:true},

    {id:"combustivel",name:"Combustível",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"livros",name:"Livros",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"seguro-carro",name:"Seguro carro",type:"expense",nature:"fixed",paymentMethod:"card",active:true},
    {id:"racao",name:"Ração",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"gympass",name:"Gympass",type:"expense",nature:"fixed",paymentMethod:"card",active:true},
    {id:"barbeiro",name:"Barbeiro",type:"expense",nature:"fixed",paymentMethod:"card",active:true},
    {id:"gas",name:"Gás",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"iptu",name:"IPTU",type:"expense",nature:"variable",paymentMethod:"card",active:true},

    {id:"celular",name:"Celular",type:"expense",nature:"fixed",paymentMethod:"bank",active:true},
    {id:"luz-cpfl",name:"Luz CPFL",type:"expense",nature:"variable",paymentMethod:"bank",active:true},
    {id:"internet",name:"Internet",type:"expense",nature:"fixed",paymentMethod:"bank",active:true},
    {id:"condominio",name:"Condomínio",type:"expense",nature:"fixed",paymentMethod:"bank",active:true},
    {id:"agua",name:"Água",type:"expense",nature:"variable",paymentMethod:"bank",active:true},
    {id:"moradia",name:"Casa alugada/própria",type:"expense",nature:"fixed",paymentMethod:"bank",active:true},
    {id:"outras",name:"Outras despesas",type:"expense",nature:"variable",paymentMethod:"bank",active:true},
    {id:"amortizacao",name:"Amortização casa",type:"expense",nature:"variable",paymentMethod:"bank",active:true},

    // Categorias úteis para classificar a fatura sem inventar que são previstas.
    {id:"assinaturas",name:"Assinaturas digitais",type:"expense",nature:"fixed",paymentMethod:"card",active:true},
    {id:"alimentacao-fora",name:"Alimentação fora",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"pedagio-estac",name:"Pedágio e estacionamento",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"vestuario",name:"Vestuário",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"desenvolvimento",name:"Cursos e desenvolvimento",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"presentes",name:"Presentes",type:"expense",nature:"variable",paymentMethod:"card",active:true},
    {id:"lazer",name:"Lazer",type:"expense",nature:"variable",paymentMethod:"card",active:true},

    {id:"salario",name:"Líquido Salário",type:"income",nature:"fixed",paymentMethod:"bank",active:true},
    {id:"renda-taina",name:"Tainá",type:"income",nature:"variable",paymentMethod:"bank",active:true},
    {id:"ppr",name:"PPR",type:"income",nature:"variable",paymentMethod:"bank",active:true},
    {id:"13-salario",name:"13º salário",type:"income",nature:"variable",paymentMethod:"bank",active:true}
  ].map(a => ({
    ...a,
    amounts:{},
    planMeta:{},
    createdAt:new Date().toISOString()
  }));

  const DEFAULT_RULES = [
    // Fatura real enviada — classificações fortes.
    ["POSTO LINC","combustivel",100],
    ["WELLHUB","gympass",100],
    ["GYMPASS","gympass",100],
    ["CASHBARBER","barbeiro",100],
    ["ZURICH","seguro-carro",100],

    ["EBN SPOTIFY","assinaturas",99],
    ["OPENAI CHATGPT","assinaturas",99],
    ["MICROSOFT","assinaturas",99],
    ["GOOGLE ONE","assinaturas",99],

    ["BENOH","alimentacao-fora",96],
    ["BENOAH","alimentacao-fora",99],
    ["CHURRASCARIA","alimentacao-fora",99],
    ["CAFE E BAR","alimentacao-fora",98],

    ["ESTACIONAMENTO","pedagio-estac",99],
    ["TAGITAU","pedagio-estac",99],
    ["BANDEIRAPARK","pedagio-estac",98],

    ["FOKA STREET","vestuario",99],
    ["RENNER","vestuario",99],
    ["RIACHUELO","vestuario",99],

    ["PROJETO MISSAO","desenvolvimento",99],
    ["PROJETO CAVEIR","desenvolvimento",99],

    ["MAG PRESENTE","presentes",96],
    ["RACE PARK","lazer",96],

    // Extrato — contas recorrentes.
    ["SAAE SOROCAB","agua",100],
    ["SAAE","agua",99],
    ["CPFL PIRATI","luz-cpfl",100],
    ["CPFL","luz-cpfl",99],
    ["NETTOP","internet",100],
    ["CLARO CELULAR","celular",100],
    ["PAGTO SALARIO","salario",100],
    ["SALARIO","salario",94]
  ].map(([keyword,accountId,confidence]) => ({
    id:`base_${norm(keyword).replace(/ /g,"_")}`,
    keyword:norm(keyword),
    accountId,
    confidence,
    source:"base"
  }));

  function defaultState() {
    return {version:3,accounts:structuredClone(DEFAULT_ACCOUNTS),rules:structuredClone(DEFAULT_RULES),transactions:[],invoices:[],files:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  }

  async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", typeof value === "string" ? encoder.encode(value) : value);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,"0")).join("");
  }

  function withTimeout(promise, ms, label="operação") {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} demorou mais que o esperado.`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
      if (local?.data) { syncMode = "Local criptografado"; return local; }
    } catch {}

    try {
      const remote = await withTimeout(
        MemoryConfig.read(STORE_KEY, null, {fresh:true}),
        3500,
        "Leitura do Financeiro"
      );
      if (remote?.data) {
        syncMode = "Supabase criptografado";
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
        return remote;
      }
    } catch (error) {
      console.warn("Financeiro: Supabase indisponível durante a abertura.", error);
      syncMode = "Local criptografado";
    }
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
    const normalizedSecret = String(secret ?? "").trim();
    if (!normalizedSecret) throw new Error("Digite a senha.");
    if (await sha256(normalizedSecret) !== PASSWORD_HASH) throw new Error("Senha incorreta.");

    password = normalizedSecret;
    const envelope = await readEnvelope();

    if (envelope) {
      try {
        state = await decryptState(envelope, normalizedSecret);
      } catch (error) {
        password = "";
        state = null;
        console.error("Financeiro: falha ao descriptografar dados existentes.", error);
        throw new Error("A senha está correta, mas não foi possível abrir os dados financeiros salvos.");
      }
    } else {
      state = defaultState();
    }

    migrateState();

    // V81.2: reaplica as novas regras também aos arquivos que já tinham sido
    // importados em versões anteriores. Assim não é necessário apagar ou
    // importar novamente a fatura/extrato para aproveitar a conciliação melhorada.
    const migratedAutoReconciled = autoReconcileImported();

    if (!envelope || migratedAutoReconciled > 0) queueSave();
    return true;
  }

  function setPlanned(account, period, value, source="Manual") {
    if(!account || !period) return;
    account.amounts ||= {};
    account.planMeta ||= {};
    account.amounts[period] = Math.max(0,num(value));
    account.planMeta[period] = source;
  }

  function ensurePeriodPlan(period=currentPeriod()) {
    if(!state || !period) return 0;
    let created=0;
    const prev=previousPeriod(period);

    for(const account of state.accounts) {
      if(!account.active || account.type==="settlement") continue;
      account.amounts ||= {};
      account.planMeta ||= {};

      if(Object.prototype.hasOwnProperty.call(account.amounts,period)) continue;
      if(account.nature!=="fixed") continue;

      if(prev && Object.prototype.hasOwnProperty.call(account.amounts,prev)) {
        setPlanned(account,period,account.amounts[prev],"Fixo · copiado do mês anterior");
        created++;
      }
    }
    return created;
  }

  async function copyPreviousPlan() {
    const period=currentPeriod();
    const prev=previousPeriod(period);
    if(!prev) return;

    let copied=0;
    for(const account of state.accounts) {
      if(!account.active || account.type==="settlement") continue;
      account.amounts ||= {};
      account.planMeta ||= {};
      if(Object.prototype.hasOwnProperty.call(account.amounts,period)) continue;
      if(!Object.prototype.hasOwnProperty.call(account.amounts,prev)) continue;

      setPlanned(account,period,account.amounts[prev],"Copiado do mês anterior");
      copied++;
    }

    if(!copied) {
      toast("Não encontrei valores novos para copiar do mês anterior.");
      return;
    }

    await queueSave();
    renderAll();
    toast(`${copied} valor(es) copiado(s) de ${periodLabel(prev)}.`);
  }

  function migrateState() {
    state ||= defaultState();
    state.accounts ||= [];

    for(const base of DEFAULT_ACCOUNTS) {
      let existing=state.accounts.find(a=>a.id===base.id);

      if(!existing) {
        existing=structuredClone(base);
        state.accounts.push(existing);
      }

      existing.amounts ||= {};
      existing.planMeta ||= {};
      existing.nature ||= base.nature || "variable";
      existing.paymentMethod ||= base.paymentMethod || (existing.type==="income"?"bank":"mixed");

      // O antigo "cartao" era usado como valor-base. Agora ele é somente liquidação.
      if(existing.id==="cartao") {
        existing.type="settlement";
        existing.nature="fixed";
        existing.paymentMethod="bank";
        existing.baseAmount=0;
      }
    }

    // Modelo de teste: valores amarelos da planilha em jul/2026.
    // Não sobrescreve nenhum valor que o usuário já tenha editado.
    for(const [accountId,value] of Object.entries(TEST_PLAN_JUL_2026)) {
      const account=state.accounts.find(a=>a.id===accountId);
      if(!account) continue;
      account.amounts ||= {};
      account.planMeta ||= {};
      if(!Object.prototype.hasOwnProperty.call(account.amounts,TEST_PLAN_PERIOD)) {
        setPlanned(account,TEST_PLAN_PERIOD,value,"Modelo de teste · planilha");
      }
    }

    state.rules ||= [];
    for(const rule of DEFAULT_RULES) {
      const existing=state.rules.find(r=>r.keyword===rule.keyword && r.accountId===rule.accountId);
      if(!existing) state.rules.push(structuredClone(rule));
      else existing.confidence=Math.max(num(existing.confidence),num(rule.confidence));
    }

    state.transactions ||= [];
    state.invoices ||= [];
    state.files ||= [];
    state.version = Math.max(3,num(state.version));
  }

  function setFinanceUnlockedUI(unlocked) {
    const lockView = $("#finance-lock");
    const appView = $("#finance-app");
    const lockButton = $("#finance-lock-button");
    const syncBadge = $("#finance-sync-badge");

    if (lockView) {
      lockView.hidden = Boolean(unlocked);
      lockView.style.display = unlocked ? "none" : "grid";
    }
    if (appView) {
      appView.hidden = !unlocked;
      appView.style.display = unlocked ? "grid" : "none";
    }
    if (lockButton) {
      lockButton.hidden = !unlocked;
      lockButton.style.display = unlocked ? "" : "none";
    }
    if (syncBadge && !unlocked) {
      syncBadge.hidden = true;
      syncBadge.style.display = "none";
    }
  }

  function lock() {
    password = ""; state = null; activeTab = "overview";
    setFinanceUnlockedUI(false);
    $("#finance-password").value = "";
    setTimeout(()=>$("#finance-password")?.focus(),50);
  }

  function updateSyncBadge() {
    const badge = $("#finance-sync-badge"); if (!badge) return;
    badge.textContent = `🔐 ${syncMode || "Criptografado"}`;
    badge.hidden = false;
    badge.style.display = "inline-flex";
  }

  function accountById(id) { return state?.accounts?.find(a => a.id === id) || null; }
  function invoiceById(id) { return state?.invoices?.find(a => a.id === id) || null; }
  function expected(account, period=currentPeriod()) {
    if(!account) return 0;
    return Object.prototype.hasOwnProperty.call(account.amounts || {},period)
      ? num(account.amounts[period])
      : 0;
  }

  function expectedSource(account, period=currentPeriod()) {
    return account?.planMeta?.[period] || "";
  }

  function eligibleTx(tx) { return tx.kind !== "card-payment" && tx.status !== "ignored"; }
  function isExpenseTx(tx) { const a=accountById(tx.accountId); return tx.status==="reconciled" && a?.type==="expense" && eligibleTx(tx); }
  function isIncomeTx(tx) { const a=accountById(tx.accountId); return tx.status==="reconciled" && a?.type==="income" && eligibleTx(tx); }
  function txMagnitude(tx) { return Math.abs(num(tx.amount)); }

  function transactionsFor(period=currentPeriod()) { return state.transactions.filter(tx => tx.period === period); }
  function invoicesFor(period=currentPeriod()) { return state.invoices.filter(inv => inv.period === period); }

  function actualForAccount(accountId,period=currentPeriod()) {
    return state.transactions
      .filter(t=>t.period===period && t.status==="reconciled" && t.accountId===accountId && eligibleTx(t))
      .reduce((s,t)=>s+txMagnitude(t),0);
  }

  function paidForAccount(accountId,period=currentPeriod()) {
    return state.transactions
      .filter(t=>t.period===period && t.status==="reconciled" && t.accountId===accountId && eligibleTx(t))
      .reduce((sum,tx)=>{
        if(tx.source==="statement") return sum+txMagnitude(tx);
        if(tx.source==="invoice") {
          const inv=invoiceById(tx.invoiceId);
          return inv?.paymentTxId ? sum+txMagnitude(tx) : sum;
        }
        return sum;
      },0);
  }

  function plannedCard(period=currentPeriod()) {
    return state.accounts
      .filter(a=>a.active && a.type==="expense" && a.paymentMethod==="card")
      .reduce((s,a)=>s+expected(a,period),0);
  }

  function plannedDirect(period=currentPeriod()) {
    return state.accounts
      .filter(a=>a.active && a.type==="expense" && a.paymentMethod!=="card")
      .reduce((s,a)=>s+expected(a,period),0);
  }

  function invoiceActual(period=currentPeriod()) {
    return invoicesFor(period).reduce((s,inv)=>s+num(inv.total),0);
  }

  function invoicePaid(period=currentPeriod()) {
    return invoicesFor(period).filter(inv=>inv.paymentTxId).reduce((s,inv)=>s+num(inv.total),0);
  }

  function directRealized(period=currentPeriod()) {
    return state.transactions
      .filter(tx=>tx.period===period && tx.source==="statement" && isExpenseTx(tx))
      .reduce((s,tx)=>s+txMagnitude(tx),0);
  }

  function totals(period=currentPeriod()) {
    const txs=transactionsFor(period);
    const income=txs.filter(isIncomeTx).reduce((s,t)=>s+txMagnitude(t),0);

    const cardRealized=invoiceActual(period);
    const cardPaid=invoicePaid(period);
    const directExpense=directRealized(period);
    const expenses=cardRealized+directExpense;
    const paidExpense=cardPaid+directExpense;

    const plannedExpense=state.accounts
      .filter(a=>a.active && a.type==="expense")
      .reduce((s,a)=>s+expected(a,period),0);

    const plannedIncome=state.accounts
      .filter(a=>a.active && a.type==="income")
      .reduce((s,a)=>s+expected(a,period),0);

    const eligible=txs.filter(eligibleTx);
    const reconciled=eligible.filter(t=>t.status==="reconciled").length;
    const pendingTxs=eligible.filter(t=>t.status==="pending");
    const pendingConciliation=pendingTxs.reduce((s,t)=>s+txMagnitude(t),0);

    const targetToPay=Math.max(plannedExpense,expenses);
    const toPay=Math.max(0,targetToPay-paidExpense);

    return {
      income,
      expenses,
      paidExpense,
      toPay,
      pendingConciliation,
      balance:income-expenses,
      reconciled,
      eligible:eligible.length,
      plannedExpense,
      plannedIncome,
      cardPlanned:plannedCard(period),
      cardRealized,
      cardPaid,
      directPlanned:plannedDirect(period),
      directRealized:directExpense,
      directPaid:directExpense
    };
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
    if (rule) return {
      type:"account",
      accountId:rule.accountId,
      label:accountById(rule.accountId)?.name || "Conta",
      confidence:num(rule.confidence),
      reason:"Descrição reconhecida"
    };

    // Se a descrição não resolveu, usa o valor previsto da planilha como segunda camada.
    // Só sugere quando há uma única conta compatível para evitar baixa errada.
    const targetType = tx.source === "statement"
      ? (tx.amount >= 0 ? "income" : "expense")
      : "expense";
    const magnitude = txMagnitude(tx);
    const candidates = state.accounts.filter(a => {
      if(!a.active || a.type!==targetType || a.type==="settlement" || expected(a,tx.period)<=0) return false;
      if(tx.source==="invoice") return a.paymentMethod==="card" || a.paymentMethod==="mixed";
      if(tx.source==="statement" && targetType==="expense") return a.paymentMethod!=="card";
      return true;
    });

    const exact = candidates.filter(a => Math.abs(expected(a, tx.period) - magnitude) <= .01);
    if (exact.length === 1) return {
      type:"account",
      accountId:exact[0].id,
      label:`${exact[0].name} · mesmo valor do previsto`,
      confidence:96,
      reason:"Valor previsto"
    };

    const near = candidates.filter(a => {
      const planned = expected(a, tx.period);
      const tolerance = Math.max(2, planned * .03);
      return Math.abs(planned - magnitude) <= tolerance;
    });
    if (near.length === 1) return {
      type:"account",
      accountId:near[0].id,
      label:`${near[0].name} · próximo do previsto`,
      confidence:88,
      reason:"Valor aproximado"
    };

    // Compra do cartão sem regra: deixa sugestão leve para Outras despesas,
    // sem conciliá-la automaticamente.
    if(tx.source==="invoice" && tx.kind==="card-charge") {
      return {
        type:"account",
        accountId:"cartao-outros",
        label:"Cartão — demais gastos · revisar",
        confidence:72,
        reason:"Compra do cartão sem regra"
      };
    }

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

  function applyHighConfidenceSuggestion(tx) {
    const s = tx?.suggestion;
    if (!tx || tx.status !== "pending" || !s) return false;

    if (s.type === "invoice" && num(s.confidence) >= 99) {
      const inv = invoiceById(s.invoiceId);
      if (!inv) return false;
      tx.status = "reconciled";
      tx.invoiceMatchId = inv.id;
      tx.accountId = "cartao";
      tx.reconciledAt = new Date().toISOString();
      inv.paymentTxId = tx.id;
      inv.paidAt = tx.date;
      return true;
    }

    if (s.type === "account" && num(s.confidence) >= 98 && accountById(s.accountId)?.active) {
      tx.status = "reconciled";
      tx.accountId = s.accountId;
      tx.invoiceMatchId = null;
      tx.reconciledAt = new Date().toISOString();
      return true;
    }

    return false;
  }

  function autoReconcileImported() {
    refreshSuggestions();
    let count = 0;
    for (const tx of state.transactions) {
      if (applyHighConfidenceSuggestion(tx)) count++;
    }
    refreshSuggestions();
    return count;
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
    const autoReconciled = autoReconcileImported();
    await queueSave();

    if(lastPeriod && /^\d{4}-\d{2}$/.test(lastPeriod)) $("#finance-period").value=lastPeriod;

    const pendingAfter = state.transactions.filter(t => t.status === "pending" && eligibleTx(t)).length;
    if (added) {
      const summary = document.createElement("div");
      summary.className = "finance-import-result finance-import-result--summary";
      summary.innerHTML = `⚡ <strong>${autoReconciled}</strong> conciliado(s) automaticamente · <strong>${pendingAfter}</strong> pendente(s) para revisar.`;
      status.prepend(summary);
    }

    renderAll();
    if(added) {
      setTab("reconcile");
      toast(`${autoReconciled} conciliado(s) automaticamente. ${pendingAfter} pendência(s) para revisar.`, 5200);
    } else if(duplicates) {
      toast("Os arquivos selecionados já estavam importados.");
    }
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
    const txs=transactionsFor().filter(t=>t.status==="pending" && num(t.suggestion?.confidence)>=98);
    if(!txs.length){toast("Nenhuma correspondência exata pendente neste período.");return;}
    for(const tx of txs){ const s=tx.suggestion; if(s.type==="invoice") await reconcileTx(tx.id,`invoice:${s.invoiceId}`); else await reconcileTx(tx.id,s.accountId,false); }
    toast(`${txs.length} correspondência(s) exata(s) conciliada(s).`);
  }

  function setTab(tab) {
    activeTab=tab; $$('[data-finance-tab]').forEach(b=>b.classList.toggle("active",b.dataset.financeTab===tab)); $$('[data-finance-panel]').forEach(p=>p.classList.toggle("active",p.dataset.financePanel===tab));
  }

  function renderKpis() {
    const t=totals();
    const rate=t.eligible?100*t.reconciled/t.eligible:0;
    $("#finance-kpis").innerHTML=`
      <div class="finance-kpi"><span>Previsto para pagar</span><strong>${brl(t.plannedExpense)}</strong><small>${periodLabel(currentPeriod())}</small></div>
      <div class="finance-kpi"><span>Realizado</span><strong>${brl(t.expenses)}</strong><small>Fatura + contas identificadas</small></div>
      <div class="finance-kpi finance-kpi--positive"><span>Pago</span><strong>${brl(t.paidExpense)}</strong><small>Baixa confirmada no extrato</small></div>
      <div class="finance-kpi ${t.toPay>0?"finance-kpi--attention":"finance-kpi--positive"}"><span>Falta pagar</span><strong>${brl(t.toPay)}</strong><small>Maior entre previsto/realizado − pago</small></div>
      <div class="finance-kpi"><span>Conciliação</span><strong>${pct(rate)}</strong><small>${t.reconciled} de ${t.eligible} lançamentos</small></div>`;
  }

  function renderPlan() {
    const t=totals();
    const delta=t.plannedExpense ? 100*t.expenses/t.plannedExpense : 0;
    const cardDelta=t.cardRealized-t.cardPlanned;

    $("#finance-plan-summary").innerHTML=`
      <div class="finance-plan-block">
        <div class="finance-summary-line"><span>Previsto total</span><strong>${brl(t.plannedExpense)}</strong></div>
        <div class="finance-summary-line"><span>Realizado total</span><strong>${brl(t.expenses)}</strong></div>
        <div class="finance-summary-line"><span>Pago</span><strong>${brl(t.paidExpense)}</strong></div>
        <div class="finance-summary-line"><span>Falta pagar</span><strong>${brl(t.toPay)}</strong></div>
      </div>
      <div class="finance-plan-split">
        <div>
          <span>💳 Cartão</span>
          <strong>${brl(t.cardPlanned)}</strong>
          <small>previsto da fatura</small>
          <em>${t.cardRealized?`${brl(t.cardRealized)} realizado · ${cardDelta>=0?"+":""}${brl(cardDelta)} diferença`:"fatura ainda não importada"}</em>
        </div>
        <div>
          <span>🏦 Conta corrente</span>
          <strong>${brl(t.directPlanned)}</strong>
          <small>previsto direto</small>
          <em>${brl(t.directRealized)} identificado no extrato</em>
        </div>
      </div>
      <div class="finance-progress"><i style="width:${Math.min(100,delta)}%"></i></div>
      <small class="muted">${currentPeriod()===TEST_PLAN_PERIOD?"Modelo de teste carregado com os valores previstos da planilha. Todos continuam editáveis.":"Fixas podem vir do mês anterior; variáveis podem ser copiadas e ajustadas."}</small>`;
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


  function accountStatus(account,period=currentPeriod()) {
    const planned=expected(account,period);
    const actual=actualForAccount(account.id,period);
    const paid=paidForAccount(account.id,period);
    const diff=actual-planned;

    if(planned<=0 && actual>0) return {label:"Não previsto",cls:"attention",diff};
    if(actual<=0 && planned>0) return {label:"Previsto",cls:"planned",diff};
    if(actual>0 && paid+0.01<actual) return {label:"Conciliado",cls:"reconciled",diff};
    if(actual>0 && paid+0.01>=actual) return {label:"Pago",cls:"paid",diff};
    return {label:"—",cls:"neutral",diff};
  }

  function renderAccounts() {
    const period=currentPeriod();
    const accounts=state.accounts
      .filter(a=>a.active && a.type!=="settlement")
      .sort((a,b)=>{
        if(a.type!==b.type) return a.type==="expense"?-1:1;
        if(a.paymentMethod!==b.paymentMethod) return a.paymentMethod==="card"?-1:1;
        return a.name.localeCompare(b.name,"pt-BR");
      });

    const note=$("#finance-plan-test-note");
    if(note) {
      note.hidden=period!==TEST_PLAN_PERIOD;
      if(!note.hidden) {
        note.innerHTML=`🧪 <strong>Modelo de teste · ${periodLabel(TEST_PLAN_PERIOD)}</strong> — os valores previstos da planilha foram carregados para testar a fatura e o extrato. Edite qualquer valor que precisar.`;
      }
    }

    $("#finance-accounts-list").innerHTML=accounts.map(a=>{
      const planned=expected(a,period);
      const actual=actualForAccount(a.id,period);
      const paid=paidForAccount(a.id,period);
      const status=accountStatus(a,period);
      const paymentLabel=a.paymentMethod==="card"?"💳 Cartão":a.paymentMethod==="bank"?"🏦 Conta":"↔ Misto";
      const natureLabel=a.nature==="fixed"?"Fixa":"Variável";

      return `<div class="finance-account-row" data-account-id="${esc(a.id)}">
        <div class="finance-account-name">
          <strong>${esc(a.name)}</strong>
          <small>${a.type==="income"?"Receita":"Despesa"} · ${esc(natureLabel)} · ${esc(paymentLabel)}</small>
          ${expectedSource(a,period)?`<em>${esc(expectedSource(a,period))}</em>`:""}
        </div>

        <select data-account-nature aria-label="Natureza">
          <option value="fixed" ${a.nature==="fixed"?"selected":""}>Fixa</option>
          <option value="variable" ${a.nature!=="fixed"?"selected":""}>Variável</option>
        </select>

        <select data-account-payment aria-label="Pagamento">
          <option value="card" ${a.paymentMethod==="card"?"selected":""}>Cartão</option>
          <option value="bank" ${a.paymentMethod==="bank"?"selected":""}>Conta</option>
          <option value="mixed" ${a.paymentMethod==="mixed"?"selected":""}>Misto</option>
        </select>

        <label class="finance-account-money">
          <span>Previsto</span>
          <input data-account-expected type="number" min="0" step="0.01" value="${planned||""}" placeholder="0,00">
        </label>

        <div class="finance-account-money">
          <span>Realizado</span>
          <strong>${brl(actual)}</strong>
        </div>

        <div class="finance-account-money">
          <span>Pago</span>
          <strong>${brl(paid)}</strong>
        </div>

        <div class="finance-account-status">
          <span class="finance-account-status__pill ${status.cls}">${esc(status.label)}</span>
          ${actual>0 && planned>=0 ? `<small class="${Math.abs(status.diff)>.01?(status.diff>0?"over":"under"):""}">${status.diff>=0?"+":""}${brl(status.diff)} vs previsto</small>`:""}
        </div>

        <div class="finance-row-actions">
          <button class="finance-mini-btn" data-account-rename>Renomear</button>
          <button class="finance-mini-btn" data-account-delete>Ocultar</button>
        </div>
      </div>`;
    }).join("") || `<div class="finance-empty">Nenhuma conta cadastrada.</div>`;
  }

  function renderCards() {
    const invoices=invoicesFor().sort((a,b)=>(b.dueDate||"").localeCompare(a.dueDate||""));

    $("#finance-cards-list").innerHTML=invoices.length?invoices.map(inv=>{
      const charges=state.transactions.filter(t=>t.invoiceId===inv.id && t.kind==="card-charge");
      const reconciled=charges.filter(t=>t.status==="reconciled");
      const classified=reconciled.reduce((s,t)=>s+txMagnitude(t),0);
      const pending=Math.max(0,num(inv.total)-classified);
      const groups=new Map();

      for(const tx of reconciled) {
        const a=accountById(tx.accountId);
        if(a) groups.set(a.name,(groups.get(a.name)||0)+txMagnitude(tx));
      }

      const planned=plannedCard(inv.period);
      const delta=num(inv.total)-planned;
      const classificationRate=inv.total?100*classified/inv.total:0;
      const paymentStatus=inv.paymentTxId
        ? `<span class="finance-card-status paid">✓ paga no extrato</span>`
        : `<span class="finance-card-status pending">⏳ aguardando pagamento no extrato</span>`;

      return `<div class="finance-card-item">
        <div class="finance-card-item__head">
          <div>
            <p class="eyebrow">Fatura ${esc(inv.cardFinal?`final ${inv.cardFinal}`:"")}</p>
            <h3>${esc(inv.cardName||"Cartão")}</h3>
            <div class="finance-card-item__meta">${inv.dueDate?`Vencimento ${formatDate(inv.dueDate)} · `:""}${charges.length} compra(s)</div>
          </div>
          <div class="finance-card-item__total">
            <strong>${brl(inv.total)}</strong>
            ${paymentStatus}
          </div>
        </div>

        <div class="finance-card-comparison">
          <div><span>Previsto da fatura</span><strong>${brl(planned)}</strong></div>
          <div><span>Realizado</span><strong>${brl(inv.total)}</strong></div>
          <div><span>Diferença</span><strong class="${Math.abs(delta)<=.01?"ok":delta>0?"over":"under"}">${delta>=0?"+":""}${brl(delta)}</strong></div>
        </div>

        <div class="finance-progress"><i style="width:${Math.min(100,classificationRate)}%"></i></div>
        <div class="finance-summary-line"><span>Compras classificadas</span><strong>${brl(classified)}</strong></div>
        <div class="finance-summary-line"><span>A classificar</span><strong>${brl(pending)}</strong></div>

        <div class="finance-card-breakdown">${[...groups.entries()]
          .sort((a,b)=>b[1]-a[1])
          .slice(0,10)
          .map(([name,val])=>`<span>${esc(name)} · ${brl(val)}</span>`)
          .join("") || '<span>Sem categorias conciliadas ainda</span>'}</div>
      </div>`;
    }).join(""):`<div class="finance-empty">Nenhuma fatura importada neste período.<br>Vá em Conciliação e importe seu XLS/XLSX.</div>`;
  }

  function targetOptions(tx) {
    const accounts=state.accounts.filter(a=>a.active && a.type!=="settlement").sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
    const suggestion=tx.suggestion; const suggestedValue=suggestion?.type==="account"?suggestion.accountId:"";
    return `<option value="">Escolher conta…</option>${accounts.map(a=>`<option value="${esc(a.id)}" ${a.id===suggestedValue?"selected":""}>${esc(a.name)}</option>`).join("")}`;
  }

  function findAccountByName(name) {
    const key=norm(name);
    if(!key) return null;
    return state.accounts.find(a=>a.active && a.type!=="settlement" && norm(a.name)===key) || null;
  }

  function classificationDefaults(tx) {
    const type = tx?.source==="statement" && num(tx.amount)>0 ? "income" : "expense";
    const paymentMethod = tx?.source==="invoice" ? "card" : "bank";
    return {type,nature:"variable",paymentMethod};
  }

  function createClassificationFromTx(tx,name) {
    const clean=String(name||"").trim().replace(/\s+/g," ");
    if(!clean) return null;

    const existing=findAccountByName(clean);
    if(existing) return existing;

    const defaults=classificationDefaults(tx);
    const account={
      id:uid("acc"),
      name:clean,
      type:defaults.type,
      nature:defaults.nature,
      paymentMethod:defaults.paymentMethod,
      active:true,
      amounts:{},
      planMeta:{},
      classificationCreated:true,
      createdAt:new Date().toISOString()
    };

    state.accounts.push(account);
    return account;
  }

  async function reconcileWithTypedClassification(txId, selectedAccountId, typedName, learn=false) {
    const tx=state.transactions.find(t=>t.id===txId);
    if(!tx) return;

    const clean=String(typedName||"").trim();
    let accountId=selectedAccountId || "";

    if(clean) {
      const account=createClassificationFromTx(tx,clean);
      if(!account) {
        toast("Escreva o nome da nova despesa.");
        return;
      }
      accountId=account.id;
    }

    if(!accountId) {
      toast("Escolha uma despesa existente ou escreva o nome de uma nova.");
      return;
    }

    await reconcileTx(txId,accountId,learn);

    if(clean) {
      toast(`Nova despesa "${clean}" criada e conciliada.`);
    }
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
        <div class="finance-reconcile-actions">${tx.status==="reconciled"?`<span class="muted">Ligado a <strong>${esc(targetLabel||"conta")}</strong></span><button class="btn" data-reopen>Reabrir</button>`:special?`<span class="muted">Pagamento com o mesmo valor da <strong>${esc(s.label)}</strong>.</span><button class="btn primary" data-reconcile-invoice="${esc(s.invoiceId)}">Conciliar fatura</button><button class="btn" data-ignore>Ignorar</button>`:`<div class="finance-classification-picker">
          <label class="finance-existing-classification">
            <span>Classificação existente</span>
            <select class="finance-reconcile-select" data-target-account aria-label="Classificação existente">${targetOptions(tx)}</select>
          </label>
          <div class="finance-new-expense-box">
            <div class="finance-new-expense-box__head">
              <span class="finance-new-expense-plus">＋</span>
              <div>
                <strong>${tx.source==="statement" && num(tx.amount)>0 ? "Não encontrou? Criar nova receita" : "Não encontrou? Criar nova despesa"}</strong>
                <small>Digite o nome e concilie agora. Ela ficará salva para as próximas vezes.</small>
              </div>
            </div>
            <input type="text" maxlength="60" data-new-classification placeholder="${tx.source==="statement" && num(tx.amount)>0 ? "Ex.: Reembolso, Venda, Bônus…" : "Ex.: Pedágio, Farmácia, Presente, Manutenção…"}" aria-label="Nova classificação">
          </div>
        </div><label class="finance-learn-label"><input type="checkbox" data-learn-rule checked> Aprender descrição</label><button class="btn primary" data-reconcile-account>Conciliar</button><button class="btn" data-ignore>Ignorar</button>`}</div>
      </div>`;
    }).join(""):`<div class="finance-empty">${reconcileFilter==="reconciled"?"Nenhum lançamento conciliado neste período.":"Nenhuma pendência aqui. 🎉"}</div>`;
    const pending=transactionsFor().filter(t=>t.status==="pending"&&eligibleTx(t)).length; $("#finance-tab-pending").textContent=pending;
  }

  function renderEvolution() {
    const periods=[...new Set(state.transactions.map(t=>t.period).filter(Boolean))].sort().slice(-12); const rows=periods.map(period=>({period,...totals(period)})); const max=Math.max(1,...rows.flatMap(r=>[r.income,r.expenses]));
    $("#finance-evolution-list").innerHTML=rows.length?rows.map(r=>`<div class="finance-evolution-row"><strong>${periodLabel(r.period)}</strong><div class="finance-evolution-bars"><div class="finance-evolution-bar income"><i style="width:${100*r.income/max}%"></i></div><div class="finance-evolution-bar expense"><i style="width:${100*r.expenses/max}%"></i></div></div><div class="finance-evolution-value"><strong>${brl(r.income)}</strong><small>entradas</small></div><div class="finance-evolution-value"><strong>${brl(r.expenses)}</strong><small>despesas</small></div></div>`).join(""):`<div class="finance-empty">A evolução aparecerá depois das primeiras conciliações.</div>`;
  }

  function renderAll() { if(!state)return; ensurePeriodPlan(currentPeriod()); refreshSuggestions(); renderKpis(); renderPlan(); renderReconcileSummary(); renderCategories(); renderAccounts(); renderCards(); renderReconcile(); renderEvolution(); updateSyncBadge(); setTab(activeTab); }

  function showAccountModal() {
    const modal=$("#finance-modal");
    modal.hidden=false;
    modal.innerHTML=`<section class="finance-modal__card" role="dialog" aria-modal="true">
      <p class="eyebrow">Nova conta</p>
      <h2>Adicionar ao previsto mensal</h2>
      <form id="finance-account-form">
        <div class="finance-modal__grid">
          <label>Nome<input name="name" required maxlength="60" placeholder="Ex.: Escola"></label>
          <label>Tipo<select name="type"><option value="expense">Despesa</option><option value="income">Receita</option></select></label>
          <label>Natureza<select name="nature"><option value="variable">Variável</option><option value="fixed">Fixa</option></select></label>
          <label>Pagamento<select name="paymentMethod"><option value="bank">Conta</option><option value="card">Cartão</option><option value="mixed">Misto</option></select></label>
          <label>Previsto em ${esc(periodLabel(currentPeriod()))}<input name="amount" type="number" min="0" step="0.01" placeholder="0,00"></label>
        </div>
        <div class="finance-modal__actions">
          <button class="btn" type="button" data-modal-close>Cancelar</button>
          <button class="btn primary" type="submit">Adicionar</button>
        </div>
      </form>
    </section>`;
  }

  function closeModal(){ $("#finance-modal").hidden=true; $("#finance-modal").innerHTML=""; }

  async function addAccount(form) {
    const data=new FormData(form);
    const name=String(data.get("name")||"").trim();
    const type=String(data.get("type")||"expense");
    const nature=String(data.get("nature")||"variable");
    const paymentMethod=String(data.get("paymentMethod")||"bank");
    const rawAmount=String(data.get("amount")||"").trim();

    if(!name) return;

    const a={
      id:uid("acc"),
      name,
      type,
      nature,
      paymentMethod,
      active:true,
      amounts:{},
      planMeta:{},
      createdAt:new Date().toISOString()
    };

    if(rawAmount!=="") setPlanned(a,currentPeriod(),num(rawAmount),"Manual");
    state.accounts.push(a);
    await queueSave();
    closeModal();
    renderAll();
  }

  async function accountAction(row, action) {
    const id=row?.dataset.accountId, a=accountById(id); if(!a)return;
    if(action==="rename"){ const name=prompt("Novo nome da conta:",a.name); if(name?.trim())a.name=name.trim(); }
    if(action==="delete"){ if(confirm(`Ocultar ${a.name}? Os lançamentos antigos serão preservados.`))a.active=false; }
    await queueSave(); renderAll();
  }

  function bindEvents() {
    const lockForm=$("#finance-lock-form");
    const openButton=$("#finance-open-button") || lockForm?.querySelector('button[type="submit"]');
    lockForm?.addEventListener("submit", async event=>{
      event.preventDefault();

      const input=$("#finance-password");
      const error=$("#finance-lock-error");
      const button=event.submitter || openButton;

      error.textContent="";
      if(button){
        button.disabled=true;
        button.textContent="Verificando…";
      }

      try{
        if(!input) throw new Error("Campo de senha indisponível.");
        await unlock(input.value);

        setFinanceUnlockedUI(true);

        const stored=localStorage.getItem("memory:financeiro:period");
        const latestInvoice=[...(state.invoices||[])].map(i=>i.period).filter(Boolean).sort().at(-1);
        const latestTx=[...(state.transactions||[])].map(t=>t.period).filter(Boolean).sort().at(-1);
        const preferred=/^\d{4}-\d{2}$/.test(stored||"")
          ? stored
          : (latestInvoice || latestTx || TEST_PLAN_PERIOD);

        $("#finance-period").value=preferred;
        const created=ensurePeriodPlan(preferred);
        if(created) await queueSave();

        renderAll();
        requestAnimationFrame(()=>{
          $("#finance-app")?.scrollIntoView({block:"start",behavior:"auto"});
          window.scrollTo({top:0,behavior:"auto"});
        });
        toast("Financeiro aberto.",2200);
      }catch(e){
        console.error("Financeiro: falha ao abrir.",e);
        error.textContent=e?.message||"Não foi possível abrir o Financeiro.";
        input?.focus();
        input?.select();
        toast(error.textContent,3800);
      }finally{
        if(button){
          button.disabled=false;
          button.textContent="Abrir Financeiro";
        }
      }
    });
    $("#finance-password-toggle")?.addEventListener("click",()=>{const input=$("#finance-password");input.type=input.type==="password"?"text":"password";});
    $("#finance-lock-button")?.addEventListener("click", lock);
    $("#finance-period")?.addEventListener("change",async()=>{localStorage.setItem("memory:financeiro:period",currentPeriod());const created=ensurePeriodPlan(currentPeriod());if(created)await queueSave();renderAll();});
    document.addEventListener("click", event=>{
      const tab=event.target.closest("[data-finance-tab]"); if(tab){setTab(tab.dataset.financeTab);return;}
      if(event.target.closest("[data-go-reconcile]")){setTab("reconcile");return;}
      const filter=event.target.closest("[data-reconcile-filter]"); if(filter){reconcileFilter=filter.dataset.reconcileFilter; $$('[data-reconcile-filter]').forEach(b=>b.classList.toggle("active",b===filter));renderReconcile();return;}
      if(event.target.closest("#finance-copy-previous")){copyPreviousPlan();return;} if(event.target.closest("#finance-add-account")){showAccountModal();return;}
      if(event.target.closest("[data-modal-close]")){closeModal();return;}
      const row=event.target.closest(".finance-account-row"); if(row&&event.target.closest("[data-account-rename]")){accountAction(row,"rename");return;} if(row&&event.target.closest("[data-account-delete]")){accountAction(row,"delete");return;}
      const item=event.target.closest(".finance-reconcile-item"); if(item){ const id=item.dataset.txId; if(event.target.closest("[data-reconcile-account]")){
        const target=item.querySelector("[data-target-account]")?.value;
        const typed=item.querySelector("[data-new-classification]")?.value;
        const learn=item.querySelector("[data-learn-rule]")?.checked;
        reconcileWithTypedClassification(id,target,typed,learn);
        return;
      } const invBtn=event.target.closest("[data-reconcile-invoice]");if(invBtn){reconcileTx(id,`invoice:${invBtn.dataset.reconcileInvoice}`,false);return;}if(event.target.closest("[data-ignore]")){ignoreTx(id);return;}if(event.target.closest("[data-reopen]")){reopenTx(id);return;} }
    });
    $("#finance-reconcile-list")?.addEventListener("keydown",event=>{
      if(event.key!=="Enter" || !event.target.matches("[data-new-classification]")) return;
      event.preventDefault();

      const item=event.target.closest(".finance-reconcile-item");
      if(!item) return;

      const id=item.dataset.txId;
      const target=item.querySelector("[data-target-account]")?.value;
      const typed=event.target.value;
      const learn=item.querySelector("[data-learn-rule]")?.checked;

      reconcileWithTypedClassification(id,target,typed,learn);
    });
    $("#finance-file-input")?.addEventListener("change",event=>{const files=[...event.target.files];event.target.value="";if(files.length)importFiles(files);});
    $("#finance-reconcile-exact")?.addEventListener("click",reconcileExact);
    $("#finance-account-form")?.addEventListener?.("submit",()=>{});
    $("#finance-modal")?.addEventListener("submit",event=>{if(event.target.id==="finance-account-form"){event.preventDefault();addAccount(event.target);}});
    $("#finance-reconcile-list")?.addEventListener("input",event=>{
      if(!event.target.matches("[data-new-classification]")) return;
      const item=event.target.closest(".finance-reconcile-item");
      const select=item?.querySelector("[data-target-account]");
      if(select && String(event.target.value||"").trim()) select.value="";
    });

    $("#finance-reconcile-list")?.addEventListener("change",event=>{
      if(!event.target.matches("[data-target-account]")) return;
      const item=event.target.closest(".finance-reconcile-item");
      const input=item?.querySelector("[data-new-classification]");
      if(input && event.target.value) input.value="";
    });

    $("#finance-accounts-list")?.addEventListener("change",async event=>{
      const row=event.target.closest(".finance-account-row");
      const a=accountById(row?.dataset.accountId);
      if(!a) return;

      if(event.target.matches("[data-account-nature]")) {
        a.nature=event.target.value==="fixed"?"fixed":"variable";
      }

      if(event.target.matches("[data-account-payment]")) {
        a.paymentMethod=["card","bank","mixed"].includes(event.target.value)?event.target.value:"bank";
      }

      if(event.target.matches("[data-account-expected]")) {
        a.amounts ||= {};
        a.planMeta ||= {};
        const raw=String(event.target.value??"").trim();

        if(raw==="") {
          delete a.amounts[currentPeriod()];
          delete a.planMeta[currentPeriod()];
        } else {
          setPlanned(a,currentPeriod(),num(raw),"Manual");
        }
      }

      await queueSave();
      renderAll();
    });
  }

  async function init() {
    await MMCDAuth.requireSession();
    setFinanceUnlockedUI(false);
    bindEvents();
    $("#finance-password")?.focus();
  }

  return {init,lock};
})();

window.addEventListener("load",()=>MemoryFinance.init().catch(error=>{console.error(error);window.MMCDUI?.toast?.("Não foi possível iniciar o Financeiro.",5000);}));
