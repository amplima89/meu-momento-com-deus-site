"use strict";

window.MemoryConfig = window.MemoryConfig || (() => {
  const cache = new Map();
  let userPromise = null;

  async function user() {
    if (!userPromise) {
      userPromise = window.MMCDAuth.requireSession().then(session => session.user);
    }
    return userPromise;
  }

  async function read(chave, fallback = null, options = {}) {
    if (!options.fresh && cache.has(chave)) return cache.get(chave);
    const currentUser = await user();
    const { data, error } = await window.MMCDSupabase
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", currentUser.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw new Error(`Não foi possível carregar ${chave}: ${error.message}`);
    const value = data?.valor ?? fallback;
    cache.set(chave, value);
    return value;
  }

  async function write(chave, valor) {
    const currentUser = await user();
    const { error } = await window.MMCDSupabase
      .from("configuracoes_usuario")
      .upsert({ user_id: currentUser.id, chave, valor }, { onConflict: "user_id,chave" });
    if (error) throw new Error(`Não foi possível salvar ${chave}: ${error.message}`);
    cache.set(chave, valor);
    return valor;
  }

  async function remove(chave) {
    const currentUser = await user();
    const { error } = await window.MMCDSupabase
      .from("configuracoes_usuario")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("chave", chave);
    if (error) throw new Error(`Não foi possível remover ${chave}: ${error.message}`);
    cache.delete(chave);
  }

  function invalidate(chave) {
    if (chave) cache.delete(chave);
    else cache.clear();
  }

  return { user, read, write, remove, invalidate };
})();
