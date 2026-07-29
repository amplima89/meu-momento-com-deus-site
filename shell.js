"use strict";
window.MMCDShell = async function(active){
  const dados = await MMCD.carregar();
  const missao = dados.configuracoes.missaoAtual;
  const concluidos = (dados.livros.concluidos||[]).filter(l => String(l.dataConclusao||"").startsWith(String(dados.configuracoes.anoMetaLivros))).length;
  const atual = dados.livros.atual?.titulo || "Nenhum livro cadastrado";
  const dias = Object.values(dados.habitos||{});
  const checks = dias.flatMap(d => Object.values(d.habitos||{}));
  const consistencia = checks.length ? Math.round(checks.filter(Boolean).length/checks.length*100) : 0;
  document.body.insertAdjacentHTML("afterbegin", `
    <aside class="sidebar">
      <a class="sidebar-brand" href="index.html" aria-label="Life Style">
        <span class="sidebar-brand__mark">LS</span>
        <div><small>PERSONAL OPERATING SYSTEM</small><strong>LIFE STYLE</strong><em>Fé, disciplina e evolução.</em></div>
      </a>
      <nav class="sidebar-nav">
        ${link("meditacao","index.html","01","Meditação","Seu encontro diário",active)}
        ${link("alvo","alvo.html","02","Alvo","Hábitos e missão",active)}
        ${link("livros","livros.html","03","Livros","Leituras e conclusões",active)}
        ${link("relatorios","relatorios.html","04","Relatórios","Performance e evolução",active)}
      </nav>
      <div class="sidebar-summary">
        <div class="summary-card summary-card--dark"><span class="summary-card__label">Missão atual</span><strong>${esc(missao.titulo)}</strong><small>${consistencia}% de consistência registrada</small><div class="mini-progress"><i style="width:${consistencia}%"></i></div></div>
        <div class="summary-card summary-card--light"><span class="summary-card__label">Livro atual</span><strong>${esc(atual)}</strong><small>${concluidos} de ${dados.configuracoes.metaLivrosAno} livros concluídos em ${dados.configuracoes.anoMetaLivros}</small><div class="mini-progress"><i style="width:${Math.min(100,concluidos/dados.configuracoes.metaLivrosAno*100)}%"></i></div></div>
      </div>
    </aside>`);
  document.body.classList.add("app-body");
  const tema = localStorage.getItem("mmcd:tema") || localStorage.getItem("tema-livro") || "claro";
  document.documentElement.dataset.tema = tema;
  document.body.classList.toggle("tema-escuro", tema === "escuro");
  const btn=document.querySelector("#theme-toggle");
  if(btn) btn.onclick=()=>{
    const n=document.documentElement.dataset.tema==="escuro"?"claro":"escuro";
    document.documentElement.dataset.tema=n;
    document.body.classList.toggle("tema-escuro", n === "escuro");
    localStorage.setItem("mmcd:tema",n);
    localStorage.setItem("tema-livro",n);
  };
};
function link(id,href,icon,title,sub,active){return `<a class="sidebar-link ${active===id?"active":""}" href="${href}"><span class="sidebar-link__icon">${icon}</span><div><strong>${title}</strong><small>${sub}</small></div><span class="sidebar-link__arrow">→</span></a>`}
function esc(s){return String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
