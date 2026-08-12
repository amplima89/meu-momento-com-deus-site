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

  function accountButton(currentUser) {
    const email = currentUser?.email || currentUser?.user_metadata?.user_name || "Conta";
    const wrap = document.createElement("div");
    wrap.className = "account-menu";
    wrap.innerHTML = `<button class="btn small account-button" type="button" title="${safe(email)}">${safe(email.split("@")[0])}</button><button class="btn small" type="button" data-signout>Sair</button>`;
    wrap.querySelector("[data-signout]").addEventListener("click", signOut);
    return wrap;
  }

  window.MMCDAuth = { requireSession, session, user, signOut, accountButton, showLogin };
})();
