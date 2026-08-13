"use strict";
(() => {
  const client = window.MMCDSupabase;
  let waiter = null;

  function safe(text) {
    return String(text ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function showLogin(errorText = "") {
    let overlay = document.getElementById("mmcd-auth-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mmcd-auth-overlay";
      overlay.innerHTML = `
        <section class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <p class="eyebrow">Acesso seguro</p>
          <h1 id="auth-title">Meu Momento com Deus</h1>
          <p>Entre com sua conta do GitHub para acessar e salvar seus dados.</p>
          <p id="mmcd-auth-error" class="auth-error"></p>
          <button id="mmcd-login-github" class="btn primary" type="button">Entrar com GitHub</button>
        </section>`;
      document.body.appendChild(overlay);
      document.getElementById("mmcd-login-github").addEventListener("click", async () => {
        const button = document.getElementById("mmcd-login-github");
        button.disabled = true;
        button.textContent = "Abrindo GitHub...";
        const { error } = await client.auth.signInWithOAuth({
          provider: "github",
          options: { redirectTo: window.MMCD_SUPABASE_CONFIG.redirectTo }
        });
        if (error) {
          button.disabled = false;
          button.textContent = "Entrar com GitHub";
          showLogin(error.message);
        }
      });
    }
    const error = document.getElementById("mmcd-auth-error");
    if (error) error.textContent = errorText;
    overlay.hidden = false;
  }

  function hideLogin() {
    const overlay = document.getElementById("mmcd-auth-overlay");
    if (overlay) overlay.hidden = true;
  }

  async function session() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function requireSession() {
    const existing = await session();
    if (existing) return existing;
    showLogin();
    if (!waiter) {
      waiter = new Promise((resolve, reject) => {
        const { data: sub } = client.auth.onAuthStateChange((event, current) => {
          if (event === "SIGNED_IN" && current) {
            hideLogin();
            sub.subscription.unsubscribe();
            waiter = null;
            resolve(current);
          }
          if (event === "USER_DELETED") reject(new Error("Usuário removido."));
        });
      });
    }
    return waiter;
  }

  async function signOut() {
    await client.auth.signOut();
    location.reload();
  }

  async function user() {
    const current = await requireSession();
    return current.user;
  }

  const PROFILE_KEY = "perfil_usuario_v1";

  async function loadProfile(currentUser) {
    if (!currentUser?.id) return {};
    try {
      const { data, error } = await client
        .from("configuracoes_usuario")
        .select("valor")
        .eq("user_id", currentUser.id)
        .eq("chave", PROFILE_KEY)
        .maybeSingle();

      if (error) throw error;
      return data?.valor && typeof data.valor === "object" ? data.valor : {};
    } catch (error) {
      console.warn("Perfil: não foi possível carregar a foto personalizada.", error);
      return {};
    }
  }

  async function saveProfile(currentUser, value) {
    if (!currentUser?.id) throw new Error("Usuário não identificado.");
    const { error } = await client
      .from("configuracoes_usuario")
      .upsert({
        user_id: currentUser.id,
        chave: PROFILE_KEY,
        valor: value || {}
      }, { onConflict: "user_id,chave" });

    if (error) throw new Error(`Não foi possível salvar o perfil: ${error.message}`);
    return value || {};
  }

  function userLabel(currentUser, profile = {}) {
    return String(
      profile.nome ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.user_metadata?.name ||
      currentUser?.user_metadata?.user_name ||
      currentUser?.email?.split("@")[0] ||
      "Conta"
    ).trim();
  }

  function fallbackAvatar(currentUser) {
    return currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || "";
  }

  function renderAccountAvatar(container, currentUser, profile = {}) {
    if (!container) return;
    const source = profile.avatarDataUrl || fallbackAvatar(currentUser);
    const label = userLabel(currentUser, profile);
    container.innerHTML = source
      ? `<img src="${safe(source)}" alt="">`
      : `<span aria-hidden="true">${safe((label[0] || "U").toUpperCase())}</span>`;
  }

  async function hydrateAccountButton(wrap, currentUser) {
    const profile = await loadProfile(currentUser);
    const label = userLabel(currentUser, profile);
    const avatar = wrap.querySelector("[data-account-avatar]");
    const name = wrap.querySelector("[data-account-name]");
    renderAccountAvatar(avatar, currentUser, profile);
    if (name) name.textContent = label;
    wrap.dataset.profileReady = "1";
    return profile;
  }

  function accountButton(currentUser) {
    const email = currentUser?.email || currentUser?.user_metadata?.user_name || "Conta";
    const label = userLabel(currentUser);
    const wrap = document.createElement("div");
    wrap.className = "account-menu";
    wrap.innerHTML = `
      <a class="btn small account-button account-button--profile" href="perfil.html" title="Perfil de ${safe(email)}">
        <span class="account-avatar" data-account-avatar aria-hidden="true"><span>${safe((label[0] || "U").toUpperCase())}</span></span>
        <span class="account-name" data-account-name>${safe(label)}</span>
      </a>
      <button class="btn small account-signout" type="button" data-signout>Sair</button>`;
    wrap.querySelector("[data-signout]").addEventListener("click", signOut);
    hydrateAccountButton(wrap, currentUser);
    return wrap;
  }

  async function refreshAccountProfile(currentUser) {
    const current = currentUser || (await requireSession()).user;
    const profile = await loadProfile(current);
    document.querySelectorAll(".account-menu").forEach(wrap => {
      const label = userLabel(current, profile);
      renderAccountAvatar(wrap.querySelector("[data-account-avatar]"), current, profile);
      const name = wrap.querySelector("[data-account-name]");
      if (name) name.textContent = label;
    });
    return profile;
  }

  window.MMCDAuth = {
    requireSession,
    session,
    user,
    signOut,
    accountButton,
    showLogin,
    loadProfile,
    saveProfile,
    refreshAccountProfile,
    PROFILE_KEY
  };
})();
