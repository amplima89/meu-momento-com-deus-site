"use strict";

(async () => {
  const FLAG="memory:v81.4:activities-backfill";

  try {
    if(!window.MMCDSupabase || !window.MMCDAuth || !window.MemoryActivitySync) return;

    const session=await window.MMCDAuth.requireSession();
    const user=session.user;
    const db=window.MMCDSupabase;

    async function readConfig(key) {
      const {data,error}=await db.from("configuracoes_usuario")
        .select("valor")
        .eq("user_id",user.id)
        .eq("chave",key)
        .maybeSingle();
      if(error) throw error;
      return data?.valor && typeof data.valor==="object" ? data.valor : {};
    }

    const [bible,conversation,practice]=await Promise.all([
      readConfig("biblia_progresso_v2"),
      readConfig("ingles_conversas_v1"),
      readConfig("ingles_pratica_v2")
    ]);

    const today=window.MemoryActivitySync.localIso(new Date());
    const limitDate=new Date();
    limitDate.setDate(limitDate.getDate()-60);
    const limit=window.MemoryActivitySync.localIso(limitDate);
    const bibleDates=new Set();

    Object.values(bible?.capitulos||{}).forEach(item=>{
      if(!item?.concluido || !item?.concluidoEm) return;
      const date=window.MemoryActivitySync.localIso(new Date(item.concluidoEm));
      if(date && date>=limit && date<=today) bibleDates.add(date);
    });
    Object.values(bible?.livrosCompletos||{}).forEach(item=>{
      if(!item?.concluidoEm) return;
      const date=window.MemoryActivitySync.localIso(new Date(item.concluidoEm));
      if(date && date>=limit && date<=today) bibleDates.add(date);
    });

    const conversationDates=new Set((conversation?.sessions||[])
      .filter(s=>s?.completed&&s?.date)
      .map(s=>s.date));
    const practiceDates=new Set((practice?.sessions||[])
      .filter(s=>s?.completed&&s?.date)
      .map(s=>s.date));

    let changed=false;

    for(const date of [...bibleDates].sort()) {
      const result=await window.MemoryActivitySync.mark("bible",{
        date,origin:"migracao_biblia_v81_4",
        observation:"Leitura reconciliada a partir do histórico da Bíblia."
      });
      if(result?.ok && !result.already) changed=true;
    }

    for(const date of [...conversationDates].sort()) {
      if(date>=today || date<limit || !practiceDates.has(date)) continue;
      const result=await window.MemoryActivitySync.mark("english",{
        date,origin:"migracao_ingles_v81_4",
        observation:"Inglês reconciliado a partir da rotina concluída antes da V81.4."
      });
      if(result?.ok && !result.already) changed=true;
    }

    if(changed && sessionStorage.getItem(FLAG)!=="reloaded") {
      sessionStorage.setItem(FLAG,"reloaded");
      location.reload();
      return;
    }

    sessionStorage.removeItem(FLAG);
  } catch(error) {
    console.warn("Atividades: reconciliação V81.4 não pôde ser concluída.",error);
  }
})();
