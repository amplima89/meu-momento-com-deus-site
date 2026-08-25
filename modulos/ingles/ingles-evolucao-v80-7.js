"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;
  const SUMMARY_KEY = 'ingles_evolucao_v1';

  async function readKey(key) {
    const { data, error } = await db.from('configuracoes_usuario')
      .select('valor').eq('user_id', user.id).eq('chave', key).maybeSingle();
    if (error) throw error;
    return data?.valor && typeof data.valor === 'object' ? data.valor : {};
  }

  const [conversations, practice] = await Promise.all([
    readKey('ingles_conversas_v1'),
    readKey('ingles_pratica_v2')
  ]);

  let appData = null;
  try { appData = await window.MMCD?.carregar?.(); } catch (error) { console.warn(error); }

  const clamp = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const pct = (a,b) => b ? Math.round(a*100/b) : null;
  const avg = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const numeric = (...values) => {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
    }
    return null;
  };
  const norm = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

  const studyDates = new Set();

  const conversationScores = [];
  let conversationAnswers = 0;
  let conversationExpected = 0;
  let conversationCompleted = 0;
  const conversationSessions = Array.isArray(conversations?.sessions) ? conversations.sessions : [];
  for (const item of conversationSessions) {
    const date = String(item?.date || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) studyDates.add(date);
    const stage = Math.max(1, Math.min(4, Number(item?.stage || 1)));
    const expected = stage === 1 ? 3 : 4;
    const answers = Array.isArray(item?.answers) ? item.answers.filter(a => String(a?.text||'').trim()) : [];
    conversationAnswers += Math.min(expected, answers.length);
    conversationExpected += expected;
    if (item?.completed) conversationCompleted += 1;
    const score = Number(item?.evaluation?.overall);
    if (Number.isFinite(score) && score >= 0 && score <= 100) conversationScores.push(score);
  }

  const practiceScores = [];
  const practiceSessions = Array.isArray(practice?.sessions) ? practice.sessions : [];
  const structureCounts = {};
  let practiceCompleted = 0;
  for (const item of practiceSessions) {
    const date = String(item?.date || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) studyDates.add(date);
    const label = String(item?.lessonTitle || item?.lessonId || '').trim();
    if (label) structureCounts[label] = (structureCounts[label] || 0) + 1;
    if (item?.completed) {
      practiceCompleted += 1;
      const score = Number(item?.score);
      if (Number.isFinite(score)) practiceScores.push(clamp(score));
    }
  }

  const conversationScore = conversationScores.length ? avg(conversationScores) : (conversationExpected ? pct(conversationAnswers, conversationExpected) : null);
  const practiceScore = avg(practiceScores);

  const today = new Date(); today.setHours(0,0,0,0);
  const isoLocal = date => new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const last30 = [];
  for (let i=29;i>=0;i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const iso = isoLocal(d); last30.push({iso,active:studyDates.has(iso)});
  }
  const activeDays = last30.filter(x=>x.active).length;
  const sorted = [...studyDates].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  const first = sorted[0] || isoLocal(today);
  const start30 = isoLocal(new Date(today.getFullYear(),today.getMonth(),today.getDate()-29));
  const start = first > start30 ? first : start30;
  const englishMetaIds = new Set((appData?.metas || []).filter(meta => {
    const label = norm(`${meta?.nome||''} ${meta?.categoria||''}`);
    return meta?.ativa !== false && (label.includes('ingles') || label.includes('english'));
  }).map(meta => String(meta.id)));

  const expectedDates = [];
  const cursor = new Date(`${start}T12:00:00`);
  while (cursor <= today) {
    const iso = isoLocal(cursor);
    let expected = true;
    if (englishMetaIds.size && window.MMCD?.metasNaData) {
      const active = window.MMCD.metasNaData(appData, iso) || [];
      expected = active.some(meta => englishMetaIds.has(String(meta.id)));
    }
    if (expected) expectedDates.push(iso);
    cursor.setDate(cursor.getDate()+1);
  }
  const completedExpected = expectedDates.filter(iso=>studyDates.has(iso)).length;
  const consistencyScore = expectedDates.length ? pct(completedExpected, expectedDates.length) : (activeDays ? 100 : 0);

  const skills = {
    conversation:{label:'Conversação',score:conversationScore,samples:conversationSessions.length,detail:conversationExpected ? `${conversationAnswers}/${conversationExpected} respostas · ${conversationCompleted} conversa(s) concluída(s)` : 'sem conversa registrada'},
    reading:{label:'Leitura',score:null,samples:0,detail:'leitura contextual; sem nota independente'},
    practice:{label:'Prática',score:practiceScore,samples:practiceSessions.length,detail:practiceSessions.length ? `${practiceCompleted} prática(s) concluída(s) · ${Object.keys(structureCounts).length} estrutura(s) trabalhada(s)` : 'sem prática estruturada concluída'},
    consistency:{label:'Consistência',score:consistencyScore,samples:completedExpected,detail:expectedDates.length ? `${completedExpected}/${expectedDates.length} dias previstos cumpridos` : 'sem dias previstos no período'}
  };

  const adaptive = [skills.conversation,skills.practice].filter(x=>x.score!==null && Number.isFinite(x.score));
  const overall = adaptive.length ? clamp(adaptive.reduce((s,x)=>s+x.score,0)/adaptive.length) : null;
  const weakest = [...adaptive].sort((a,b)=>a.score-b.score)[0] || null;
  let decision = 'CONTINUAR';
  if (weakest && weakest.score < 60) decision = 'REVISAR';
  else if (adaptive.length === 2 && adaptive.every(x=>x.score>=80)) decision = 'AVANÇAR';
  const priority = weakest?.label || 'Coletar mais evidências';
  const reason = weakest ? `${priority} é hoje a menor evidência mensurável (${clamp(weakest.score)}%).` : 'Ainda não há evidências suficientes para ajustar a trilha.';
  const latest = sorted.at(-1) || '';

  const summary = {schemaVersion:4,updatedAt:new Date().toISOString(),overall,decision,priority,reason,studyDays30:activeDays,skills:Object.fromEntries(Object.entries(skills).map(([k,v])=>[k,{score:v.score===null?null:clamp(v.score),samples:v.samples,detail:v.detail}])),grammarCounts:structureCounts};
  try {
    const {error} = await db.from('configuracoes_usuario').upsert({user_id:user.id,chave:SUMMARY_KEY,valor:summary},{onConflict:'user_id,chave'});
    if (error) throw error;
  } catch (error) { console.warn('Evolução do inglês: resumo não salvo.',error); }

  document.querySelector('#english-overall-ring')?.style.setProperty('--progress',String(overall||0));
  document.querySelector('#english-overall-score').textContent = overall===null?'—':`${overall}%`;
  document.querySelector('#english-overall-title').textContent = overall===null?'Construindo sua linha de base':overall>=80?'Boa evolução no inglês ativo':overall>=65?'Evolução consistente':'Há um ponto pedindo reforço';
  document.querySelector('#english-study-days').textContent = expectedDates.length ? `${completedExpected}/${expectedDates.length} dias previstos cumpridos` : `${activeDays} dia${activeDays===1?'':'s'} com estudo`;
  document.querySelector('#english-last-activity').textContent = `Última atividade: ${latest?latest.split('-').reverse().join('/'):'—'}`;
  document.querySelector('#english-next-focus-title').textContent = priority;
  document.querySelector('#english-next-focus-text').textContent = reason;
  document.querySelector('#english-adaptive-decision').textContent = decision;

  for (const [key,item] of Object.entries(skills)) {
    const card = document.querySelector(`[data-skill="${key}"]`); if (!card) continue;
    const score = item.score===null?null:clamp(item.score);
    card.querySelector('strong').textContent = score===null?'—':`${score}%`;
    card.querySelector('small').textContent = item.detail;
    card.querySelector('i').style.width = `${score||0}%`;
  }

  document.querySelector('#english-trend-total').textContent = `${activeDays} dia${activeDays===1?'':'s'} com estudo`;
  document.querySelector('#english-trend-chart').innerHTML = last30.map((item,index)=>`<div class="english-trend-day ${item.active?'active':''}" style="height:${item.active?64+(index%4)*8:10}%" data-label="${item.iso} · ${item.active?'estudou':'sem registro'}"></div>`).join('');

  const evidence = [];
  if (conversationExpected) evidence.push(['Conversa',`${conversationCompleted} conversa(s) concluída(s); ${conversationAnswers}/${conversationExpected} respostas registradas.`]);
  if (practiceSessions.length) evidence.push(['Prática',`${practiceCompleted} prática(s) concluída(s) em ${Object.keys(structureCounts).length} estrutura(s).`]);
  evidence.push(['Consistência',expectedDates.length?`${completedExpected} de ${expectedDates.length} dias previstos cumpridos.`:`${activeDays} dias com evidência de estudo.`]);
  document.querySelector('#english-evidence-list').innerHTML = evidence.map(([title,txt])=>`<div class="english-evidence-item"><i></i><div><strong>${title}</strong><span>${txt}</span></div></div>`).join('');

  const entries = Object.entries(structureCounts).sort((a,b)=>b[1]-a[1]);
  const max = Math.max(1,...entries.map(x=>x[1]));
  document.querySelector('#english-grammar-list').innerHTML = entries.length ? entries.map(([name,count])=>`<div class="english-grammar-row"><div><strong>${name}</strong><span>${count} prática${count===1?'':'s'}</span></div><div><i style="width:${Math.round(count/max*100)}%"></i></div></div>`).join('') : '<div class="english-evolution-empty">As estruturas aparecerão conforme você concluir as práticas.</div>';
})();
