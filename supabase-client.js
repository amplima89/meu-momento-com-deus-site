"use strict";
(() => {
  const config = window.MMCD_SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey) {
    throw new Error("Configuração do Supabase ausente.");
  }
  if (!window.supabase?.createClient) {
    throw new Error("Biblioteca do Supabase não carregada.");
  }
  window.MMCDSupabase = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
