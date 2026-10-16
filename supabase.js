
/* =========================================================
   FANTASMAS — CONEXÃO COM O SUPABASE
   ========================================================= */

(function () {
  "use strict";

  // Configuração do projeto Supabase.
  // Use aqui a URL e a chave PUBLICÁVEL do seu próprio projeto.
  const PROJECT_URL = "https://zyoretewsxialvjuixje.supabase.co";
  const PROJECT_KEY = "sb_publishable_6E5YN1mGExSy5xc5-uvRMg_p3vcdUTC";

  // Evita declarar SUPABASE_URL novamente no script.js.
  window.FANTASMAS_SUPABASE_URL = PROJECT_URL;

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "[FANTASMAS] Biblioteca Supabase não encontrada. " +
      "Confira se o CDN do Supabase está carregado antes de supabase.js."
    );
    window.FANTASMAS_DB_READY = false;
    return;
  }

  // Evita criar o cliente duas vezes.
  if (!window.fantasmasSupabase) {
    window.fantasmasSupabase = window.supabase.createClient(
      PROJECT_URL,
      PROJECT_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );
  }

  // Compatibilidade com scripts que usam nomes globais comuns.
  // Não cria const/let globais que entrem em conflito com script.js.
  window.supabaseClient = window.fantasmasSupabase;
  window.FANTASMAS_DB_READY = true;

  console.info("[FANTASMAS] Cliente Supabase inicializado.");

  // Testa a conexão consultando as tabelas principais.
  // A mensagem de sucesso só aparece se a consulta funcionar.
  async function checkConnection() {
    const tables = [
      "fantasmas_members",
      "fantasmas_trainings",
      "fantasmas_logs"
    ];

    for (const table of tables) {
      const { error } = await window.fantasmasSupabase
        .from(table)
        .select("id")
        .limit(1);

      if (error) {
        console.error(
          `[FANTASMAS] Falha ao consultar "${table}":`,
          error.message
        );
        return false;
      }
    }

    console.info("[FANTASMAS] Conexão com as tabelas confirmada.");
    return true;
  }

  window.fantasmasCheckConnection = checkConnection;
})();
