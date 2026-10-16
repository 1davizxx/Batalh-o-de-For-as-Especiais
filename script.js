/* =========================================================
   FANTASMAS — SCRIPT DE GESTÃO
   BFE • SGB • MEMBROS • COTAS • TREINAMENTOS • LOGS
   ========================================================= */

let supabaseClient = window.supabaseClient || null;

const RANKS_BFE = [
  "〔CR〕Criador",
  "〔2º CR〕Segundo Criador",
  "〔DN〕Dono",
  "〔CMT〕Comandante",
  "〔SCMT〕Subcomandante",
  "〔SUP-G〕Supervisor Geral",
  "〔SUP〕Supervisor",
  "〔GEN〕General",
  "〔OF〕Oficial",
  "〔GD〕Graduado",
  "〔PR〕Praça",
  "〔CANDT〕Candidato"
];

const RANKS_SGB = [
  "〔CR〕Criador",
  "〔2° CR〕Segundo Criador",
  "〔DR〕Diretor",
  "〔MN-GR〕Manager",
  "〔ADM〕Administrador",
  "〔SCR〕Sub Criador",
  "〔ENC-G〕Encarregado Geral",
  "〔SEC-G〕Secretario Geral",
  "〔SEC-DEP〕Secretário de departamento",
  "〔CG-G〕Corregedor Geral",
  "〔SGB-CG〕Corregedor",
  "〔SGB-CRD〕Coordenador",
  "〔SGB-SUP〕Supervisor",
  "〔SGB-ANST〕Analista",
  "〔SGB-SÊN〕Sênior",
  "〔SGB-APR〕Aprendiz",
  "〔SGB-EST〕Estagiários"
];

const state = {
  currentUser: null,
  activePage: "dashboard",
  quotaDepartment: "BFE",
  members: [],
  trainings: [],
  logs: [],
  subscriptions: []
};

/* Normaliza 〔OF〕 para [OF], para reconhecer as patentes
   mesmo quando os colchetes são diferentes. */
function normalizeRank(rank) {
  return String(rank || "")
    .replace(/〔/g, "[")
    .replace(/〕/g, "]")
    .toUpperCase();
}

function rankHasCode(rank, code) {
  return normalizeRank(rank).includes(String(code).toUpperCase());
}

function memberHasRank(member, code) {
  return rankHasCode(member?.rank, code);
}

document.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) loadingScreen.hidden = true;

  initAuthSystem();
  initNavigation();
  initModals();
  initForms();
  initFilters();
  initRealtimeSync();
  updateCurrentDate();

  setInterval(updateCurrentDate, 60000);
  setInterval(updateTestsCountdowns, 1000);
  setInterval(checkAndCleanAval, 60000);

  showAuthScreen();
});

function updateCurrentDate() {
  const element = document.getElementById("current-date");
  if (!element) return;

  const now = new Date();
  element.textContent =
    now.toLocaleDateString("pt-BR") + " " +
    now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
}

/* =========================================================
   LOGIN DEMONSTRATIVO
   ========================================================= */

function initAuthSystem() {
  const loginButton = document.getElementById("show-login");
  const registerButton = document.getElementById("show-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutButton = document.getElementById("logout-button");

  if (loginButton && registerButton && loginForm && registerForm) {
    loginButton.addEventListener("click", () => {
      loginButton.classList.add("active");
      registerButton.classList.remove("active");
      loginForm.hidden = false;
      registerForm.hidden = true;
      clearAuthMessages();
    });

    registerButton.addEventListener("click", () => {
      registerButton.classList.add("active");
      loginButton.classList.remove("active");
      registerForm.hidden = false;
      loginForm.hidden = true;
      clearAuthMessages();
    });
  }

  document.querySelectorAll("[data-toggle-password]").forEach(button => {
    button.addEventListener("click", event => {
      const input = document.getElementById(
        event.currentTarget.getAttribute("data-toggle-password")
      );
      if (input) {
        input.type = input.type === "password" ? "text" : "password";
      }
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();

      const username =
        document.getElementById("login-username")?.value.trim() || "";
      const password =
        document.getElementById("login-password")?.value.trim() || "";
      const message = document.getElementById("auth-message");

      if (username.length < 4 || password.length < 4) {
        setFormMessage(
          message,
          "Usuário ou senha incorreto. Tente novamente!",
          "error"
        );
        showToast(
          "Usuário e senha precisam ter pelo menos 4 caracteres.",
          "error"
        );
        return;
      }

      setFormMessage(
        message,
        "Login concluído com sucesso. Seja bem-vindo, Fantasmas!",
        "success"
      );
      loginSuccess(username, true);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", event => {
      event.preventDefault();

      const username =
        document.getElementById("register-username")?.value.trim() || "";
      const password =
        document.getElementById("register-password")?.value.trim() || "";
      const confirmation =
        document.getElementById("register-confirm-password")?.value.trim() || "";
      const message = document.getElementById("register-message");

      if (username.length < 4) {
        setFormMessage(message, "O usuário precisa ter pelo menos 4 caracteres.", "error");
        return;
      }
      if (password.length < 4) {
        setFormMessage(message, "A senha precisa ter pelo menos 4 caracteres.", "error");
        return;
      }
      if (password !== confirmation) {
        setFormMessage(message, "As senhas não coincidem!", "error");
        return;
      }

      setFormMessage(message, "Conta criada com sucesso!", "success");

      const loginUsername = document.getElementById("login-username");
      const loginPassword = document.getElementById("login-password");
      if (loginUsername) loginUsername.value = username;
      if (loginPassword) loginPassword.value = password;

      loginSuccess(username, true);
      showToast("Conta criada com sucesso!", "success");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      state.currentUser = null;
      showAuthScreen();
      showToast("Sessão encerrada.", "warning");
    });
  }
}

function clearAuthMessages() {
  ["auth-message", "register-message"].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = "";
      element.className = "form-message";
    }
  });
}

function setFormMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function showAuthScreen() {
  const auth = document.getElementById("auth-screen");
  const app = document.getElementById("app-screen");
  if (auth) auth.hidden = false;
  if (app) app.hidden = true;
}

function loginSuccess(username, logEvent = false) {
  state.currentUser = username;

  const auth = document.getElementById("auth-screen");
  const app = document.getElementById("app-screen");
  if (auth) auth.hidden = true;
  if (app) app.hidden = false;

  setText("sidebar-username", username);
  setText("sidebar-user-avatar", username.charAt(0).toUpperCase());
  setText("welcome-username", username);

  if (logEvent) {
    addLog("AUTENTICACAO", `Usuário ${username} entrou no sistema.`);
  }

  loadAllData();
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

function initNavigation() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggle = document.getElementById("sidebar-toggle");
  const close = document.getElementById("sidebar-close");

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (sidebar) sidebar.classList.add("open");
      if (overlay) overlay.classList.add("active");
    });
  }

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
  };

  if (close) close.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", event => {
      navigateTo(event.currentTarget.getAttribute("data-page"));
      closeSidebar();
    });
  });
}

function navigateTo(pageId) {
  state.activePage = pageId;

  document.querySelectorAll(".page-section").forEach(section => {
    section.hidden = true;
  });

  const target = document.getElementById(`page-${pageId}`);
  if (target) target.hidden = false;

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle(
      "active",
      item.getAttribute("data-page") === pageId
    );
  });

  const titles = {
    dashboard: ["PAINEL GERAL", "VISÃO GERAL DA ORGANIZAÇÃO"],
    members: ["CENTRAL DE MEMBROS", "TODOS OS INTEGRANTES CADASTRADOS"],
    bfe: ["DEPARTAMENTO BFE", "EQUIPE OPERACIONAL"],
    sgb: ["DEPARTAMENTO SGB", "EQUIPE ADMINISTRATIVA"],
    quotas: ["COTAS SEMANAIS", "ACOMPANHAMENTO E LANÇAMENTOS"],
    tests: ["FANTASMAS EM TESTE", "MONITORAMENTO DE 48 HORAS"],
    training: ["TREINAMENTOS", "RELATÓRIOS E FALTAS"],
    inactivity: ["DIAS INATIVOS", "CONTROLE DE AUSÊNCIA E PUNIÇÕES"],
    logs: ["LOGS DO SERVIDOR", "AUDITORIA EM TEMPO REAL"]
  };

  if (titles[pageId]) {
    setText("breadcrumb-current", titles[pageId][0]);
    setText("topbar-subtitle", titles[pageId][1]);
  }

  renderCurrentPage();
}

/* =========================================================
   MODAIS
   ========================================================= */

function initModals() {
  document.querySelectorAll("[data-open-modal]").forEach(button => {
    button.addEventListener("click", event => {
      const modalId = event.currentTarget.getAttribute("data-open-modal");
      const department = event.currentTarget.getAttribute("data-department");
      if (modalId === "member-modal") resetMemberForm(department);
      openModal(modalId);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", event => {
      closeModal(event.currentTarget.getAttribute("data-close-modal"));
    });
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.hidden = false;
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.hidden = true;
}

/* =========================================================
   SUPABASE E CÓPIA LOCAL
   ========================================================= */

async function loadAllData() {
  updateConnectionStatus("CONECTANDO...", "warning");

  if (!supabaseClient) {
    loadLocalStorageFallback();
    checkAndCleanAval();
    renderCurrentPage();
    return;
  }

  try {
    const [membersResult, trainingsResult, logsResult] = await Promise.all([
      supabaseClient.from("fantasmas_members").select("*"),
      supabaseClient.from("fantasmas_trainings").select("*"),
      supabaseClient.from("fantasmas_logs")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    let hasError = false;

    if (membersResult.error) {
      console.error("Erro ao carregar membros:", membersResult.error);
      hasError = true;
    } else {
      state.members = membersResult.data || [];
    }

    if (trainingsResult.error) {
      console.error("Erro ao carregar treinamentos:", trainingsResult.error);
      hasError = true;
    } else {
      state.trainings = trainingsResult.data || [];
    }

    if (logsResult.error) {
      console.error("Erro ao carregar logs:", logsResult.error);
      hasError = true;
    } else {
      state.logs = logsResult.data || [];
    }

    updateConnectionStatus(
      hasError ? "ERRO AO SINCRONIZAR" : "ONLINE",
      hasError ? "warning" : "success"
    );
    saveLocalBackup();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    loadLocalStorageFallback();
  }

  checkAndCleanAval();
  renderCurrentPage();
}

function loadLocalStorageFallback() {
  try {
    const members = localStorage.getItem("fantasmas_members");
    const trainings = localStorage.getItem("fantasmas_trainings");
    const logs = localStorage.getItem("fantasmas_logs");

    if (members) state.members = JSON.parse(members);
    if (trainings) state.trainings = JSON.parse(trainings);
    if (logs) state.logs = JSON.parse(logs);
  } catch (error) {
    console.error("Erro ao recuperar cópia local:", error);
  }

  updateConnectionStatus("MODO LOCAL / SEM CONEXÃO", "warning");
}

function saveLocalBackup() {
  try {
    localStorage.setItem("fantasmas_members", JSON.stringify(state.members));
    localStorage.setItem("fantasmas_trainings", JSON.stringify(state.trainings));
    localStorage.setItem("fantasmas_logs", JSON.stringify(state.logs));
  } catch (error) {
    console.warn("Não foi possível atualizar a cópia local:", error);
  }
}

async function persistData(table, itemOrItems, isList = false) {
  const records = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from(table)
        .upsert(isList ? records : records[0]);

      if (error) {
        console.error(`Erro ao salvar em ${table}:`, error);
        updateConnectionStatus("ERRO AO SALVAR", "danger");
        showToast(
          "Não foi possível salvar no servidor. Verifique a conexão e as políticas do Supabase.",
          "error"
        );
        return false;
      }
    } catch (error) {
      console.error(`Falha ao salvar em ${table}:`, error);
      updateConnectionStatus("ERRO AO SALVAR", "danger");
      return false;
    }
  }

  saveLocalBackup();
  return true;
}

async function deleteDataRecord(table, id) {
  if (!supabaseClient) return true;

  try {
    const { error } = await supabaseClient
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Erro ao remover registro de ${table}:`, error);
      showToast("Não foi possível remover o registro no servidor.", "error");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Erro ao remover registro:", error);
    return false;
  }
}

function updateConnectionStatus(text, status) {
  setText("connection-label", text);

  document.querySelectorAll(".connection-status .status-dot").forEach(dot => {
    dot.style.background =
      status === "success" ? "var(--success)" :
      status === "warning" ? "var(--warning)" : "var(--danger)";
  });
}

function initRealtimeSync() {
  if (!supabaseClient) return;

  try {
    const channel = supabaseClient
      .channel("fantasmas-realtime")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "fantasmas_members"
      }, () => loadAllData())
      .on("postgres_changes", {
        event: "*", schema: "public", table: "fantasmas_trainings"
      }, () => loadAllData())
      .on("postgres_changes", {
        event: "*", schema: "public", table: "fantasmas_logs"
      }, () => loadAllData())
      .subscribe();

    state.subscriptions.push(channel);
  } catch (error) {
    console.warn("Não foi possível iniciar o Realtime:", error);
  }
}

/* =========================================================
   FILTROS
   ========================================================= */

function initFilters() {
  const membersSearch = document.getElementById("members-search");
  const departmentFilter = document.getElementById("members-department-filter");
  const logsSearch = document.getElementById("logs-search");
  const logsTypeFilter = document.getElementById("logs-type-filter");

  if (membersSearch) {
    membersSearch.addEventListener("input", () => {
      if (state.activePage === "members") renderMembersPage();
    });
  }

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      if (state.activePage === "members") renderMembersPage();
    });
  }

  if (logsSearch) {
    logsSearch.addEventListener("input", () => {
      if (state.activePage === "logs") renderLogsPage();
    });
  }

  if (logsTypeFilter) {
    logsTypeFilter.addEventListener("change", () => {
      if (state.activePage === "logs") renderLogsPage();
    });
  }
}

/* =========================================================
   FORMULÁRIOS
   ========================================================= */

function initForms() {
  const deptSelect = document.getElementById("member-department");
  const rankSelect = document.getElementById("member-rank");
  const testingSelect = document.getElementById("member-testing");
  const entryWrap = document.getElementById("member-entry-date-wrap");
  const highCmd = document.getElementById("member-high-command");
  const epf = document.getElementById("member-epf");
  const afex = document.getElementById("member-afex");
  const immunityNotice = document.getElementById("member-immunity-notice");

  if (deptSelect && rankSelect) {
    deptSelect.addEventListener("change", event => {
      const department = event.target.value;
      rankSelect.innerHTML = '<option value="">SELECIONE A PATENTE</option>';

      if (!department) {
        rankSelect.disabled = true;
        return;
      }

      rankSelect.disabled = false;
      const ranks = department === "BFE" ? RANKS_BFE : RANKS_SGB;

      ranks.forEach(rank => {
        const option = document.createElement("option");
        option.value = rank;
        option.textContent = rank;
        rankSelect.appendChild(option);
      });
    });
  }

  if (testingSelect && entryWrap) {
    testingSelect.addEventListener("change", event => {
      entryWrap.hidden = event.target.value !== "SIM";
    });
  }

  const checkImmunity = () => {
    if (immunityNotice) {
      immunityNotice.hidden = !(
        highCmd?.value === "SIM" || afex?.value === "SIM"
      );
    }
  };

  if (highCmd) highCmd.addEventListener("change", checkImmunity);
  if (afex) afex.addEventListener("change", checkImmunity);

  const memberForm = document.getElementById("member-form");
  if (memberForm) {
    memberForm.addEventListener("submit", async event => {
      event.preventDefault();

      const id = document.getElementById("member-id")?.value || "mem_" + Date.now();
      const discord = document.getElementById("member-discord")?.value.trim() || "";
      const roblox = document.getElementById("member-roblox")?.value.trim() || "";
      const department = document.getElementById("member-department")?.value || "";
      const rank = document.getElementById("member-rank")?.value || "";
      const isTesting = document.getElementById("member-testing")?.value === "SIM";
      const discordEntry =
        document.getElementById("member-discord-entry")?.value ||
        new Date().toISOString();
      const highCommand = document.getElementById("member-high-command")?.value === "SIM";
      const professorEpf = document.getElementById("member-epf")?.value === "SIM";
      const isAfex = document.getElementById("member-afex")?.value === "SIM";

      if (!discord || !roblox || !department || !rank) {
        showToast("Preencha todos os campos obrigatórios.", "error");
        return;
      }

      const existing = state.members.find(member => String(member.id) === String(id));
      const memberObj = {
        id, discord, roblox, department, rank,
        is_testing: isTesting,
        discord_entry: discordEntry,
        high_command: highCommand,
        professor_epf: professorEpf,
        afex: isAfex,
        aval: existing?.aval || null,
        quotas_data: existing?.quotas_data || {
          total_seconds: 0,
          tafs: 0,
          sgb_data: {},
          logs: []
        },
        inactivity_days: existing?.inactivity_days || 0,
        updated_at: new Date().toISOString()
      };

      const index = state.members.findIndex(member => String(member.id) === String(id));

      if (index >= 0) {
        state.members[index] = memberObj;
      } else {
        state.members.push(memberObj);
      }

      const saved = await persistData("fantasmas_members", memberObj);
      if (!saved) return;

      await addLog(
        "MEMBRO",
        index >= 0
          ? `Membro ${discord} (${department}) foi atualizado.`
          : `Novo membro cadastrado: ${discord} (${department} - ${rank}).`
      );

      showToast(
        index >= 0 ? "Membro atualizado com sucesso!" : "Membro cadastrado com sucesso!",
        "success"
      );
      closeModal("member-modal");
      renderCurrentPage();
    });
  }

  initQuotaForm();
  initAvalForm();
  initTrainingForm();

  const refreshMembers = document.getElementById("refresh-members");
  const refreshQuotas = document.getElementById("refresh-quotas");
  const refreshLogs = document.getElementById("refresh-logs");

  if (refreshMembers) refreshMembers.addEventListener("click", renderMembersPage);
  if (refreshQuotas) refreshQuotas.addEventListener("click", renderQuotasPage);
  if (refreshLogs) refreshLogs.addEventListener("click", renderLogsPage);

  document.querySelectorAll(".quota-tab").forEach(button => {
    button.addEventListener("click", event => {
      document.querySelectorAll(".quota-tab").forEach(tab => tab.classList.remove("active"));
      event.currentTarget.classList.add("active");
      state.quotaDepartment =
        event.currentTarget.getAttribute("data-quota-department") || "BFE";
      renderQuotasPage();
    });
  });
}

function resetMemberForm(department = "") {
  const form = document.getElementById("member-form");
  if (form) form.reset();

  setValue("member-id", "");
  setText("member-modal-title", "Adicionar membro");

  const deptSelect = document.getElementById("member-department");
  const rankSelect = document.getElementById("member-rank");
  const entryWrap = document.getElementById("member-entry-date-wrap");
  const notice = document.getElementById("member-immunity-notice");

  if (deptSelect) {
    deptSelect.value = department || "";
    deptSelect.dispatchEvent(new Event("change"));
  }

  if (!department && rankSelect) {
    rankSelect.disabled = true;
    rankSelect.innerHTML = '<option value="">SELECIONE O DEPARTAMENTO</option>';
  }

  if (entryWrap) entryWrap.hidden = true;
  if (notice) notice.hidden = true;
}

/* =========================================================
   LANÇAMENTO DE COTAS BFE
   ========================================================= */

function initQuotaForm() {
  const typeSelect = document.getElementById("patrol-type");
  const form = document.getElementById("patrol-form");

  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      const type = normalizeActivity(typeSelect.value);
      const isCount = [
        "TREINO PARKUOR", "TREINO PARKOUR", "TREINO PVP",
        "OPERACAO", "PATRULHAMENTO GERAL", "RANQUEADO"
      ].includes(type);

      ["patrol-hours-wrap", "patrol-minutes-wrap", "patrol-seconds-wrap"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.hidden = isCount;
      });

      const quantityWrap = document.getElementById("patrol-quantity-wrap");
      if (quantityWrap) quantityWrap.hidden = !isCount;
    });
  }

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const memberId = document.getElementById("patrol-member")?.value;
    const type = normalizeActivity(document.getElementById("patrol-type")?.value);
    const notes = document.getElementById("patrol-notes")?.value.trim() || "";
    const member = state.members.find(item => String(item.id) === String(memberId));

    if (!member || !type) {
      showToast("Selecione o membro e a atividade.", "error");
      return;
    }

    if (member.department !== "BFE") {
      showToast("Este formulário é para lançamentos do BFE.", "error");
      return;
    }

    if (!member.quotas_data) {
      member.quotas_data = { total_seconds: 0, tafs: 0, sgb_data: {}, logs: [] };
    }

    const data = member.quotas_data;
    const quantity = Math.max(
      1,
      parseInt(document.getElementById("patrol-quantity")?.value, 10) || 1
    );

    let addedSeconds = 0;
    let addedTafs = 0;

    if (type === "PATRULHAMENTO") {
      const hours = parseInt(document.getElementById("patrol-hours")?.value, 10) || 0;
      const minutes = parseInt(document.getElementById("patrol-minutes")?.value, 10) || 0;
      const seconds = parseInt(document.getElementById("patrol-seconds")?.value, 10) || 0;
      addedSeconds = hours * 3600 + minutes * 60 + seconds;
    } else if (type === "TREINO PARKUOR" || type === "TREINO PARKOUR" || type === "TREINO PVP") {
      addedSeconds = quantity * 1800;
    } else if (["OPERACAO", "PATRULHAMENTO GERAL", "RANQUEADO"].includes(type)) {
      const tafRank = ["OF", "GEN", "SUP"].some(code => memberHasRank(member, `[${code}]`));
      if (tafRank) addedTafs = quantity;
      else addedSeconds = quantity * 3600;
    } else {
      showToast("Tipo de atividade não reconhecido.", "error");
      return;
    }

    if (addedSeconds <= 0 && addedTafs <= 0) {
      showToast("Informe uma duração ou quantidade válida.", "error");
      return;
    }

    data.total_seconds = (Number(data.total_seconds) || 0) + addedSeconds;
    data.tafs = (Number(data.tafs) || 0) + addedTafs;
    if (!Array.isArray(data.logs)) data.logs = [];

    data.logs.push({
      date: new Date().toISOString(),
      type,
      added_seconds: addedSeconds,
      added_tafs: addedTafs,
      notes,
      author: state.currentUser
    });

    member.updated_at = new Date().toISOString();

    if (!await persistData("fantasmas_members", member)) return;

    await addLog(
      "COTA",
      `Lançamento para ${member.discord} (${type}): ${notes || "Sem observações"}.`
    );

    showToast("Atividade lançada!", "success");
    form.reset();

    const quantityWrap = document.getElementById("patrol-quantity-wrap");
    if (quantityWrap) quantityWrap.hidden = true;

    renderQuotasPage();
  });
}

function normalizeActivity(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* =========================================================
   AVAL
   ========================================================= */

function initAvalForm() {
  const form = document.getElementById("aval-form");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const memberId = document.getElementById("aval-member-id")?.value;
    const start = document.getElementById("aval-start")?.value;
    const end = document.getElementById("aval-end")?.value;
    const reason = document.getElementById("aval-reason")?.value.trim() || "";
    const member = state.members.find(item => String(item.id) === String(memberId));

    if (!member || !start || !end) {
      showToast("Preencha o período de AVAL.", "error");
      return;
    }
    if (new Date(end) <= new Date(start)) {
      showToast("A data final precisa ser posterior à inicial.", "error");
      return;
    }

    member.aval = { start, end, reason };
    member.updated_at = new Date().toISOString();

    if (!await persistData("fantasmas_members", member)) return;

    await addLog(
      "AVAL",
      `Membro ${member.discord} colocado em AVAL até ${new Date(end).toLocaleString("pt-BR")}.`
    );

    showToast("AVAL registrado com sucesso!", "success");
    closeModal("aval-modal");
    renderCurrentPage();
  });
}

/* =========================================================
   TREINAMENTOS
   ========================================================= */

function initTrainingForm() {
  const form = document.getElementById("training-form");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const type = document.getElementById("training-type")?.value || "";
    const department = document.getElementById("training-department")?.value || "";
    const date = document.getElementById("training-date")?.value || "";
    const instructor = document.getElementById("training-instructor")?.value.trim() || "";
    const assistants = document.getElementById("training-assistants")?.value.trim() || "";
    const present = document.getElementById("training-present")?.value.trim() || "";
    const justified = document.getElementById("training-justified")?.value.trim() || "";
    const avalList = document.getElementById("training-aval")?.value.trim() || "";

    if (!type || !department || !date || !instructor) {
      showToast("Preencha os campos obrigatórios do treinamento.", "error");
      return;
    }

    const normalizeList = value =>
      value.split(",").map(name => name.trim().toLowerCase()).filter(Boolean);

    const presentArray = normalizeList(present);
    const justifiedArray = normalizeList(justified);
    const avalArray = normalizeList(avalList);

    const departmentMembers = state.members.filter(member => member.department === department);
    const absentees = [];

    const hasExactName = (list, member) => {
      const discord = (member.discord || "").trim().toLowerCase();
      const roblox = (member.roblox || "").trim().toLowerCase();
      return list.some(name => name === discord || name === roblox);
    };

    departmentMembers.forEach(member => {
      const exemptByRank = department === "BFE" &&
        ["CMT", "SCMT", "SUP-G"].some(code => memberHasRank(member, `[${code}]`));

      const exempt = member.high_command || member.afex ||
        exemptByRank || isAvalActive(member);

      if (
        !exempt &&
        !hasExactName(presentArray, member) &&
        !hasExactName(justifiedArray, member) &&
        !hasExactName(avalArray, member)
      ) {
        absentees.push(member.discord);
      }
    });

    const training = {
      id: "train_" + Date.now(),
      type,
      department,
      date,
      instructor,
      assistants,
      present,
      justified,
      aval_list: avalList,
      absences: absentees.join(", "),
      author: state.currentUser || "Sistema",
      created_at: new Date().toISOString()
    };

    state.trainings.push(training);
    const saved = await persistData("fantasmas_trainings", training);

    await addLog(
      "TREINO",
      `Relatório de treinamento (${type} - ${department}) criado. Faltas: ${absentees.length}.`
    );

    if (saved) showToast("Relatório de treinamento arquivado!", "success");
    closeModal("training-modal");
    renderTrainingPage();
  });
}
/* =========================================================
   AVAL — ENCERRAMENTO AUTOMÁTICO
   ========================================================= */

function isAvalActive(member) {
  if (!member?.aval?.end) return false;

  const now = Date.now();
  const start = member.aval.start
    ? new Date(member.aval.start).getTime()
    : 0;
  const end = new Date(member.aval.end).getTime();

  return now >= start && now < end;
}

async function checkAndCleanAval() {
  const now = Date.now();

  const expiredMembers = state.members.filter(member =>
    member.aval?.end &&
    now >= new Date(member.aval.end).getTime()
  );

  for (const member of expiredMembers) {
    member.aval = null;
    member.updated_at = new Date().toISOString();

    if (!await persistData("fantasmas_members", member)) continue;

    await addLog(
      "AVAL",
      `O AVAL do membro ${member.discord} foi encerrado automaticamente.`
    );
  }

  if (expiredMembers.length) renderCurrentPage();
}

/* =========================================================
   RENDERIZAÇÃO GERAL
   ========================================================= */

function renderCurrentPage() {
  updateNavCounts();

  switch (state.activePage) {
    case "dashboard":
      renderDashboard();
      break;
    case "members":
      renderMembersPage();
      break;
    case "bfe":
      renderDepartmentPage("BFE");
      break;
    case "sgb":
      renderDepartmentPage("SGB");
      break;
    case "quotas":
      renderQuotasPage();
      break;
    case "tests":
      renderTestsPage();
      break;
    case "training":
      renderTrainingPage();
      break;
    case "inactivity":
      renderInactivityPage();
      break;
    case "logs":
      renderLogsPage();
      break;
  }
}

function updateNavCounts() {
  setText(
    "bfe-nav-count",
    state.members.filter(member => member.department === "BFE").length
  );

  setText(
    "sgb-nav-count",
    state.members.filter(member => member.department === "SGB").length
  );
}

/* =========================================================
   PAINEL GERAL
   ========================================================= */

function renderDashboard() {
  const bfeTotal = state.members.filter(member => member.department === "BFE").length;
  const sgbTotal = state.members.filter(member => member.department === "SGB").length;
  const activeAval = state.members.filter(isAvalActive).length;

  const values = {
    "stat-total-members": state.members.length,
    "stat-bfe-members": bfeTotal,
    "stat-sgb-members": sgbTotal,
    "stat-on-review": activeAval,
    "dashboard-bfe-count": bfeTotal,
    "dashboard-sgb-count": sgbTotal
  };

  Object.entries(values).forEach(([id, value]) => setText(id, value));

  const container = document.getElementById("dashboard-recent-logs");
  if (!container) return;

  if (!state.logs.length) {
    container.innerHTML =
      '<div class="empty-state">▤<p>Nenhuma atividade registrada.</p></div>';
    return;
  }

  container.innerHTML = state.logs.slice(0, 5).map(log => `
    <div class="recent-log-item">
      <div class="log-icon">▤</div>
      <div class="log-content">
        <strong>${escapeHTML(log.author || "Sistema")} • ${formatDateTime(log.created_at)}</strong>
        <p>${escapeHTML(log.description || "")}</p>
      </div>
    </div>
  `).join("");
}

/* =========================================================
   CENTRAL DE MEMBROS
   ========================================================= */

function renderMembersPage() {
  const container = document.getElementById("members-hierarchy-container");
  if (!container) return;

  const search = document.getElementById("members-search")?.value.trim().toLowerCase() || "";
  const departmentFilter = document.getElementById("members-department-filter")?.value || "TODOS";

  const filtered = state.members.filter(member => {
    const text = [
      member.discord,
      member.roblox,
      member.rank,
      member.department
    ].join(" ").toLowerCase();

    return text.includes(search) &&
      (departmentFilter === "TODOS" || member.department === departmentFilter);
  });

  if (!filtered.length) {
    container.innerHTML =
      '<div class="empty-state">♙<p>Nenhum membro encontrado com os filtros atuais.</p></div>';
    return;
  }

  const allRanks = [...RANKS_BFE, ...RANKS_SGB];
  let html = "";

  allRanks.forEach(rank => {
    const rankMembers = filtered.filter(member => member.rank === rank);
    if (!rankMembers.length) return;

    html += `
      <div class="hierarchy-group">
        <div class="hierarchy-header">
          <h3>${escapeHTML(rank)}</h3>
          <span>${rankMembers.length} membro(s)</span>
        </div>
        <div class="hierarchy-members">
          ${rankMembers.map(renderMemberRow).join("")}
        </div>
      </div>
    `;
  });

  const knownRanks = new Set(allRanks);
  const otherMembers = filtered.filter(member => !knownRanks.has(member.rank));

  if (otherMembers.length) {
    html += `
      <div class="hierarchy-group">
        <div class="hierarchy-header">
          <h3>OUTRAS PATENTES</h3>
          <span>${otherMembers.length} membro(s)</span>
        </div>
        <div class="hierarchy-members">
          ${otherMembers.map(renderMemberRow).join("")}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  attachMemberRowEvents();
}

function renderMemberRow(member) {
  const badges = [];

  if (member.high_command) {
    badges.push('<span class="badge badge-primary">⭐ Alto Comando</span>');
  }
  if (member.afex) {
    badges.push('<span class="badge badge-primary">🛡️ AFEX</span>');
  }
  if (member.professor_epf) {
    badges.push('<span class="badge badge-success">🎓 Professor EPF</span>');
  }
  if (member.is_testing) {
    badges.push('<span class="badge badge-warning">⌛ Em Teste</span>');
  }
  if (isAvalActive(member)) {
    badges.push('<span class="badge badge-danger">◷ Em AVAL</span>');
  }

  return `
    <div class="member-row">
      <div class="member-avatar">
        ${escapeHTML((member.discord || "?").charAt(0).toUpperCase())}
      </div>
      <div class="member-details">
        <strong>${escapeHTML(member.discord || "")}</strong>
        <small>
          Roblox: ${escapeHTML(member.roblox || "")}
          • Dept: ${escapeHTML(member.department || "")}
        </small>
        <div class="member-badges">${badges.join("")}</div>
      </div>
      <div class="member-actions">
        <button type="button" class="table-action" data-action="view" data-id="${escapeHTML(member.id)}">👁️ Ver</button>
        <button type="button" class="table-action" data-action="edit" data-id="${escapeHTML(member.id)}">✏️ Editar</button>
        <button type="button" class="table-action" data-action="aval" data-id="${escapeHTML(member.id)}">◷ AVAL</button>
        <button type="button" class="table-action danger" data-action="remove" data-id="${escapeHTML(member.id)}">🗑️ Remover</button>
      </div>
    </div>
  `;
}

function attachMemberRowEvents() {
  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", event => {
      const action = event.currentTarget.getAttribute("data-action");
      const id = event.currentTarget.getAttribute("data-id");
      const member = state.members.find(item => String(item.id) === String(id));
      if (!member) return;

      if (action === "view") {
        showViewMemberModal(member);
      } else if (action === "edit") {
        openEditMemberModal(member);
      } else if (action === "aval") {
        openAvalModal(member);
      } else if (action === "remove") {
        confirmAction(
          `Deseja realmente remover o membro ${member.discord}?`,
          async () => {
            if (!await deleteDataRecord("fantasmas_members", id)) return;

            state.members = state.members.filter(item => String(item.id) !== String(id));
            saveLocalBackup();

            await addLog("MEMBRO", `Membro ${member.discord} removido do sistema.`);
            showToast("Membro removido com sucesso!", "success");
            renderCurrentPage();
          }
        );
      }
    });
  });
}

function showViewMemberModal(member) {
  const content = document.getElementById("member-details-content");
  if (!content) return;

  const avalText = isAvalActive(member)
    ? `Ativo até ${formatDateTime(member.aval.end)} (${member.aval.reason || "Sem motivo"})`
    : "Não está em AVAL";

  content.innerHTML = `
    <div class="report-content">
      <div class="report-section">
        <h3>Informações básicas</h3>
        <p><strong>Discord:</strong> ${escapeHTML(member.discord || "")}</p>
        <p><strong>Roblox:</strong> ${escapeHTML(member.roblox || "")}</p>
        <p><strong>Departamento:</strong> ${escapeHTML(member.department || "")}</p>
        <p><strong>Patente:</strong> ${escapeHTML(member.rank || "")}</p>
      </div>
      <div class="report-section">
        <h3>Privilégios e situação</h3>
        <p><strong>Alto Comando:</strong> ${member.high_command ? "Sim — imune" : "Não"}</p>
        <p><strong>AFEX:</strong> ${member.afex ? "Sim — imune" : "Não"}</p>
        <p><strong>Professor EPF:</strong> ${member.professor_epf ? "Sim — redução de 30% na cota BFE" : "Não"}</p>
        <p><strong>Fantasma em teste:</strong> ${member.is_testing ? "Sim" : "Não"}</p>
        <p><strong>AVAL:</strong> ${escapeHTML(avalText)}</p>
        <p><strong>Dias inativos:</strong> ${Number(member.inactivity_days) || 0}</p>
      </div>
    </div>
  `;

  openModal("view-member-modal");
}

function openEditMemberModal(member) {
  resetMemberForm(member.department);
  openModal("member-modal");

  setText("member-modal-title", "Editar membro");
  setValue("member-id", member.id);
  setValue("member-discord", member.discord);
  setValue("member-roblox", member.roblox);
  setValue("member-department", member.department);

  document.getElementById("member-department")?.dispatchEvent(new Event("change"));

  setValue("member-rank", member.rank);
  setValue("member-testing", member.is_testing ? "SIM" : "NAO");
  document.getElementById("member-testing")?.dispatchEvent(new Event("change"));

  setValue(
    "member-discord-entry",
    member.discord_entry ? String(member.discord_entry).slice(0, 16) : ""
  );
  setValue("member-high-command", member.high_command ? "SIM" : "NAO");
  setValue("member-epf", member.professor_epf ? "SIM" : "NAO");
  setValue("member-afex", member.afex ? "SIM" : "NAO");

  const notice = document.getElementById("member-immunity-notice");
  if (notice) notice.hidden = !(member.high_command || member.afex);
}

function openAvalModal(member) {
  setValue("aval-member-id", member.id);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);

  setValue("aval-start", toLocalDateTimeInput(now));
  setValue("aval-end", toLocalDateTimeInput(tomorrow));
  setValue("aval-reason", "");

  openModal("aval-modal");
}

/* =========================================================
   PÁGINAS BFE E SGB
   ========================================================= */

function renderDepartmentPage(department) {
  const prefix = department.toLowerCase();
  const container = document.getElementById(`${prefix}-hierarchy-container`);
  if (!container) return;

  const members = state.members.filter(member => member.department === department);

  setText(`${prefix}-total`, members.length);
  setText(`${prefix}-tests`, members.filter(member => member.is_testing).length);
  setText(`${prefix}-reviews`, members.filter(isAvalActive).length);

  // Não conta membros imunes nem patentes sem cota definida como cotas pendentes.
  setText(
    `${prefix}-pending-quotas`,
    members.filter(member =>
      !isQuotaImmune(member) && hasQuotaConfigured(member)
    ).length
  );

  if (!members.length) {
    container.innerHTML = `
      <div class="empty-state">
        ${department === "BFE" ? "🛡️" : "🔎"}
        <p>Nenhum membro cadastrado no departamento ${department}.</p>
      </div>
    `;
    return;
  }

  const ranks = department === "BFE" ? RANKS_BFE : RANKS_SGB;
  let html = "";

  ranks.forEach(rank => {
    const rankMembers = members.filter(member => member.rank === rank);
    if (!rankMembers.length) return;

    html += `
      <div class="hierarchy-group">
        <div class="hierarchy-header">
          <h3>${escapeHTML(rank)}</h3>
          <span>${rankMembers.length} membro(s)</span>
        </div>
        <div class="hierarchy-members">${rankMembers.map(renderMemberRow).join("")}</div>
      </div>
    `;
  });

  const knownRanks = new Set(ranks);
  const others = members.filter(member => !knownRanks.has(member.rank));

  if (others.length) {
    html += `
      <div class="hierarchy-group">
        <div class="hierarchy-header">
          <h3>OUTRAS PATENTES</h3>
          <span>${others.length} membro(s)</span>
        </div>
        <div class="hierarchy-members">${others.map(renderMemberRow).join("")}</div>
      </div>
    `;
  }

  container.innerHTML = html;
  attachMemberRowEvents();
}

/* =========================================================
   CORREÇÃO PRINCIPAL DA IMUNIDADE
   Somente Alto Comando e AFEX são imunes.
   Professor EPF não é imune.
   Nenhuma patente é imune só por não ter meta cadastrada.
   ========================================================= */

function isQuotaImmune(member) {
  return Boolean(member && (member.high_command || member.afex));
}

function hasQuotaConfigured(member) {
  if (!member) return false;

  if (member.department === "BFE") {
    return ["CANDT", "PR", "GD", "OF", "GEN", "SUP"].some(code =>
      memberHasRank(member, `[${code}]`)
    );
  }

  if (member.department === "SGB") {
    return [
      "SGB-EST", "SGB-APR", "SGB-SÊN", "SGB-ANST",
      "SGB-SUP", "SGB-CRD", "SGB-CG"
    ].some(code => memberHasRank(member, `[${code}]`));
  }

  return false;
}

/* =========================================================
   SEMANA ATUAL
   Mantém os lançamentos da semana corrente.
   Quando a semana muda, inicia novos contadores.
   ========================================================= */

function getCurrentWeekKey() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (date.getDay() + 6) % 7;

  date.setDate(date.getDate() - day);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function ensureCurrentQuotaWeek(member) {
  if (!member.quotas_data || typeof member.quotas_data !== "object") {
    member.quotas_data = {
      total_seconds: 0,
      tafs: 0,
      sgb_data: {},
      logs: []
    };
  }

  const data = member.quotas_data;
  const currentWeek = getCurrentWeekKey();

  if (!data.week_key) {
    // Registros existentes continuam preservados na primeira execução.
    data.week_key = currentWeek;
    return false;
  }

  if (data.week_key === currentWeek) return false;

  data.week_key = currentWeek;
  data.total_seconds = 0;
  data.tafs = 0;
  data.sgb_data = {};
  data.logs = [];

  member.updated_at = new Date().toISOString();
  return true;
}

/* =========================================================
   PÁGINA DE COTAS
   ========================================================= */

function renderQuotasPage() {
  const container = document.getElementById("quotas-container");
  if (!container) return;

  const department = state.quotaDepartment;
  const members = state.members.filter(member => member.department === department);

  members.forEach(member => {
    if (ensureCurrentQuotaWeek(member)) {
      persistData("fantasmas_members", member);
    }
  });

  const patrolSelect = document.getElementById("patrol-member");

  if (patrolSelect) {
    const previousValue = patrolSelect.value;
    patrolSelect.innerHTML = '<option value="">SELECIONE O MEMBRO</option>';

    members.forEach(member => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = `${member.discord} (${member.department} - ${member.rank})`;
      patrolSelect.appendChild(option);
    });

    if (members.some(member => String(member.id) === previousValue)) {
      patrolSelect.value = previousValue;
    }
  }

  if (!members.length) {
    container.innerHTML = `
      <div class="empty-state">◷
        <p>Nenhum membro no departamento ${department} para cotas.</p>
      </div>
    `;
    return;
  }

  const cards = members.map(member => {
    const immune = isQuotaImmune(member);
    const configured = hasQuotaConfigured(member);
    let progressHtml = "";

    if (immune) {
      progressHtml = `
        <div class="quota-meta">
          <span>RESULTADO DA COTA:</span>
          <strong class="text-success">IMUNE — ALTO COMANDO/AFEX</strong>
        </div>
      `;
    } else if (!configured) {
      progressHtml = `
        <div class="quota-meta">
          <span>RESULTADO DA COTA:</span>
          <strong class="text-warning">COTA NÃO CONFIGURADA PARA ESTA PATENTE</strong>
        </div>
      `;
    } else if (department === "SGB") {
      progressHtml = renderSgbQuotaProgress(member);
    } else {
      progressHtml = renderBfeQuotaProgress(member);
    }

    return `
      <div class="quota-member">
        <div class="quota-member-header">
          <div>
            <h3>${escapeHTML(member.discord || "")}</h3>
            <p>
              ${escapeHTML(member.rank || "")} • ${escapeHTML(member.roblox || "")}
              ${member.professor_epf ? " • Professor EPF (-30%)" : ""}
            </p>
          </div>
          <div class="badge ${immune ? "badge-success" : "badge-primary"}">
            ${immune ? "IMUNE" : "ATIVO"}
          </div>
        </div>
        ${progressHtml}
      </div>
    `;
  }).join("");

  const sgbEntryForm = department === "SGB"
    ? renderSgbQuotaEntryForm(members)
    : "";

  container.innerHTML = sgbEntryForm + cards;

  if (department === "SGB") initSgbQuotaEntryForm();
}

/* =========================================================
   COTAS BFE
   ========================================================= */

function renderBfeQuotaProgress(member) {
  const data = member.quotas_data || {};
  const totalSeconds = Number(data.total_seconds) || 0;
  const totalTafs = Number(data.tafs) || 0;

  let targetHours = 0;
  let targetTafs = 0;
  let alternativeHours = 0;
  let label = "";

  if (memberHasRank(member, "[CANDT]")) {
    targetHours = 10;
    label = "10 horas de patrulhamento";
  } else if (memberHasRank(member, "[PR]")) {
    targetHours = 9;
    label = "9 horas de patrulhamento";
  } else if (memberHasRank(member, "[GD]")) {
    targetHours = 8;
    label = "8 horas de patrulhamento";
  } else if (memberHasRank(member, "[OF]")) {
    targetTafs = 11;
    alternativeHours = 7;
    label = "11 TAFs ou 7 horas de patrulhamento";
  } else if (memberHasRank(member, "[GEN]")) {
    targetTafs = 8;
    alternativeHours = 6;
    label = "8 TAFs ou 6 horas de patrulhamento";
  } else if (memberHasRank(member, "[SUP]") && !memberHasRank(member, "[SUP-G]")) {
    targetTafs = 6;
    alternativeHours = 5;
    label = "6 TAFs ou 5 horas de patrulhamento";
  } else {
    return `
      <div class="quota-meta">
        <strong class="text-warning">COTA NÃO CONFIGURADA PARA ESTA PATENTE</strong>
      </div>
    `;
  }

  // Professor EPF recebe 30% de desconto, mas NÃO fica imune.
  if (member.professor_epf) {
    targetHours *= 0.7;
    targetTafs = targetTafs ? Math.ceil(targetTafs * 0.7) : 0;
    alternativeHours *= 0.7;
  }

  let percent = 0;
  let complete = false;

  if (targetHours > 0) {
    percent = Math.min(100, Math.round(totalSeconds / (targetHours * 3600) * 100));
    complete = totalSeconds >= targetHours * 3600;
  } else {
    const tafPercent = targetTafs ? totalTafs / targetTafs * 100 : 0;
    const patrolPercent = alternativeHours
      ? totalSeconds / (alternativeHours * 3600) * 100
      : 0;

    percent = Math.min(100, Math.round(Math.max(tafPercent, patrolPercent)));
    complete =
      (targetTafs > 0 && totalTafs >= targetTafs) ||
      (alternativeHours > 0 && totalSeconds >= alternativeHours * 3600);
  }

  return `
    <div class="quota-progress ${complete ? "complete" : ""}">
      <span style="width:${percent}%"></span>
    </div>
    <div class="quota-meta">
      <span>Meta: ${label}${member.professor_epf ? " (EPF -30%)" : ""}</span>
      <span>
        Patrulha: <strong>${formatSeconds(totalSeconds)}</strong>
        | TAFs: <strong>${totalTafs}</strong>
        | <strong>${percent}%</strong>
        ${complete ? " — CONCLUÍDO" : ""}
      </span>
    </div>
  `;
}

/* =========================================================
   FORMULÁRIO DE LANÇAMENTOS SGB
   Cria os campos no painel de cotas do SGB.
   ========================================================= */

function renderSgbQuotaEntryForm(members) {
  const options = members.map(member => `
    <option value="${escapeHTML(member.id)}">
      ${escapeHTML(member.discord)} — ${escapeHTML(member.rank)}
    </option>
  `).join("");

  return `
    <div class="quota-member sgb-quota-entry">
      <div class="quota-member-header">
        <div>
          <h3>REGISTRAR ATIVIDADE SGB</h3>
          <p>Registre tickets, solicitações, punições ou advertências da semana.</p>
        </div>
      </div>

      <form id="sgb-quota-entry-form">
        <div class="form-group">
          <label for="sgb-quota-member">MEMBRO</label>
          <select id="sgb-quota-member" required>
            <option value="">SELECIONE O MEMBRO</option>
            ${options}
          </select>
        </div>

        <div class="form-group">
          <label for="sgb-quota-action">TIPO DE ATIVIDADE</label>
          <select id="sgb-quota-action" required>
            <option value="">SELECIONE A ATIVIDADE</option>
            <option value="TICKET">TICKET ATENDIDO</option>
            <option value="SOLICITACAO">SOLICITAÇÃO DE PUNIÇÃO/ADVERTÊNCIA/REBAIXAMENTO/EXÍLIO</option>
            <option value="PUNICAO">PUNIÇÃO APLICADA/REGISTRADA</option>
            <option value="ADVERTENCIA">ADVERTÊNCIA APLICADA/REGISTRADA</option>
          </select>
        </div>

        <div class="form-group">
          <label for="sgb-quota-quantity">QUANTIDADE</label>
          <input id="sgb-quota-quantity" type="number" min="1" step="1" value="1" required>
        </div>

        <button type="submit" class="btn btn-primary">
          REGISTRAR ATIVIDADE
        </button>
      </form>
    </div>
  `;
}

function initSgbQuotaEntryForm() {
  const form = document.getElementById("sgb-quota-entry-form");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const memberId = document.getElementById("sgb-quota-member")?.value;
    const action = document.getElementById("sgb-quota-action")?.value;
    const quantity = Math.max(
      1,
      parseInt(document.getElementById("sgb-quota-quantity")?.value, 10) || 1
    );

    const member = state.members.find(item => String(item.id) === String(memberId));

    if (!member || member.department !== "SGB" || !action) {
      showToast("Selecione um membro do SGB e o tipo de atividade.", "error");
      return;
    }

    ensureCurrentQuotaWeek(member);

    if (!member.quotas_data.sgb_data) member.quotas_data.sgb_data = {};
    if (!Array.isArray(member.quotas_data.logs)) member.quotas_data.logs = [];

    const data = member.quotas_data.sgb_data;

    data.tickets = Number(data.tickets) || 0;
    data.requests = Number(data.requests) || 0;
    data.punishments = Number(data.punishments) || 0;
    data.warnings = Number(data.warnings) || 0;

    if (action === "TICKET") {
      data.tickets += quantity;
    } else if (action === "SOLICITACAO") {
      data.requests += quantity;
    } else if (action === "PUNICAO") {
      data.punishments += quantity;

      // Para Aprendiz, aplicação de punição também vale como uma
      // das duas solicitações/aplicações exigidas.
      if (memberHasRank(member, "[SGB-APR]")) {
        data.requests += quantity;
      }
    } else if (action === "ADVERTENCIA") {
      data.warnings += quantity;

      // Para Aprendiz, aplicação de advertência também vale como uma
      // das duas solicitações/aplicações exigidas.
      if (memberHasRank(member, "[SGB-APR]")) {
        data.requests += quantity;
      }
    }

    member.quotas_data.logs.push({
      date: new Date().toISOString(),
      type: action,
      quantity,
      author: state.currentUser || "Sistema"
    });

    member.updated_at = new Date().toISOString();

    if (!await persistData("fantasmas_members", member)) return;

    await addLog(
      "COTA SGB",
      `${quantity} registro(s) de ${action} lançado(s) para ${member.discord}.`
    );

    showToast("Atividade SGB registrada com sucesso!", "success");
    renderQuotasPage();
  });
}

/* =========================================================
   COTAS SGB
   ========================================================= */

function renderSgbQuotaProgress(member) {
  const rank = normalizeRank(member.rank);
  const data = member.quotas_data?.sgb_data || {};

  const tickets = Number(data.tickets) || 0;
  const requests = Number(data.requests) || 0;
  const punishments = Number(data.punishments) || 0;
  const warnings = Number(data.warnings) || 0;

  let target = "";
  let percent = 0;
  let complete = false;

  if (rank.includes("[SGB-EST]")) {
    target = "10 tickets atendidos";
    percent = Math.min(100, Math.round(tickets / 10 * 100));
    complete = tickets >= 10;
  } else if (rank.includes("[SGB-APR]")) {
    target = "3 tickets + 2 solicitações/aplicações de punição ou advertência";
    percent = Math.min(100, Math.round(
      Math.min(tickets, 3) / 3 * 50 +
      Math.min(requests, 2) / 2 * 50
    ));
    complete = tickets >= 3 && requests >= 2;
  } else if (rank.includes("[SGB-SÊN]")) {
    target = "1 solicitação ou 5 tickets";
    percent = Math.min(100, Math.round(Math.max(
      requests >= 1 ? 100 : 0,
      tickets / 5 * 100
    )));
    complete = requests >= 1 || tickets >= 5;
  } else if (rank.includes("[SGB-ANST]")) {
    target = "1 punição/advertência aplicada ou 5 tickets";
    percent = Math.min(100, Math.round(Math.max(
      punishments >= 1 || warnings >= 1 ? 100 : 0,
      tickets / 5 * 100
    )));
    complete = punishments >= 1 || warnings >= 1 || tickets >= 5;
  } else if (rank.includes("[SGB-SUP]")) {
    target = "3 registros de punição ou 5 tickets";
    percent = Math.min(100, Math.round(Math.max(
      punishments / 3 * 100,
      tickets / 5 * 100
    )));
    complete = punishments >= 3 || tickets >= 5;
  } else if (rank.includes("[SGB-CRD]")) {
    target = "2 registros de advertência ou 5 tickets";
    percent = Math.min(100, Math.round(Math.max(
      warnings / 2 * 100,
      tickets / 5 * 100
    )));
    complete = warnings >= 2 || tickets >= 5;
  } else if (rank.includes("[SGB-CG]")) {
    target = "1 registro de advertência ou 5 tickets";
    percent = Math.min(100, Math.round(Math.max(
      warnings >= 1 ? 100 : 0,
      tickets / 5 * 100
    )));
    complete = warnings >= 1 || tickets >= 5;
  } else {
    return `
      <div class="quota-meta">
        <strong class="text-warning">COTA NÃO CONFIGURADA PARA ESTA PATENTE</strong>
      </div>
    `;
  }

  return `
    <div class="quota-progress ${complete ? "complete" : ""}">
      <span style="width:${percent}%"></span>
    </div>
    <div class="quota-meta">
      <span>Meta: ${target}</span>
      <span>
        Tickets: <strong>${tickets}</strong> |
        Solicitações: <strong>${requests}</strong> |
        Punições: <strong>${punishments}</strong> |
        Advertências: <strong>${warnings}</strong> |
        <strong>${percent}%</strong>
        ${complete ? " — CONCLUÍDO" : ""}
      </span>
    </div>
  `;
}

function formatSeconds(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0")
  ].join(":");
}

/* =========================================================
   FANTASMAS EM TESTE — 48 HORAS
   ========================================================= */

function renderTestsPage() {
  const tbody = document.getElementById("tests-table");
  if (!tbody) return;

  const members = state.members.filter(member => member.is_testing);

  if (!members.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="table-empty">Nenhum membro em teste no momento.</td></tr>';
    return;
  }

  tbody.innerHTML = members.map(member => {
    const entryTime = member.discord_entry
      ? new Date(member.discord_entry).getTime()
      : Date.now();

    const deadline = entryTime + 48 * 60 * 60 * 1000;
    const diff = deadline - Date.now();
    const expired = diff <= 0;

    let countdown = "EXPIRADO (+48H)";

    if (!expired) {
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      countdown =
        `${String(hours).padStart(2, "0")}h ` +
        `${String(minutes).padStart(2, "0")}m ` +
        `${String(seconds).padStart(2, "0")}s`;
    }

    return `
      <tr class="${expired ? "test-expired" : ""}">
        <td>
          <strong>${escapeHTML(member.discord || "")}</strong><br>
          <small>${escapeHTML(member.roblox || "")}</small>
        </td>
        <td>${escapeHTML(member.department || "")} - ${escapeHTML(member.rank || "")}</td>
        <td>${formatDateTime(member.discord_entry || entryTime)}</td>
        <td><span class="test-countdown ${expired ? "expired" : ""}">${countdown}</span></td>
        <td>
          <button type="button" class="table-action danger"
            data-remove-test="${escapeHTML(member.id)}">
            ✓ Remover Teste
          </button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-remove-test]").forEach(button => {
    button.addEventListener("click", () => {
      removeTestStatus(button.getAttribute("data-remove-test"));
    });
  });
}

async function removeTestStatus(id) {
  const member = state.members.find(item => String(item.id) === String(id));
  if (!member) return;

  member.is_testing = false;
  member.updated_at = new Date().toISOString();

  if (!await persistData("fantasmas_members", member)) return;

  await addLog("MEMBRO", `Cargo de Fantasma em Teste removido para ${member.discord}.`);
  showToast("Membro removido dos fantasmas em teste!", "success");
  renderTestsPage();
}

function updateTestsCountdowns() {
  if (state.activePage === "tests") renderTestsPage();
}

/* =========================================================
   TREINAMENTOS E RELATÓRIOS
   ========================================================= */

function renderTrainingPage() {
  const tbody = document.getElementById("training-table");
  if (!tbody) return;

  setText("training-total", state.trainings.length);

  const totalPresences = state.trainings.reduce(
    (sum, training) => sum + countNames(training.present), 0
  );
  const totalAbsences = state.trainings.reduce(
    (sum, training) => sum + countNames(training.absences), 0
  );

  setText("training-attendance", totalPresences);
  setText("training-absences", totalAbsences);

  if (!state.trainings.length) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="table-empty">Nenhum relatório de treinamento arquivado.</td></tr>';
    return;
  }

  tbody.innerHTML = state.trainings.map(training => `
    <tr>
      <td><strong>${escapeHTML(training.type || "")}</strong></td>
      <td>${escapeHTML(training.department || "")}</td>
      <td>${formatDateTime(training.date)}</td>
      <td>${escapeHTML(training.instructor || "")}</td>
      <td>${countNames(training.present)}</td>
      <td><span class="text-danger">${countNames(training.absences)}</span></td>
      <td>
        <button type="button" class="table-action"
          data-view-training="${escapeHTML(training.id)}">
          👁️ Ver Relatório
        </button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-view-training]").forEach(button => {
    button.addEventListener("click", () => {
      viewTrainingReport(button.getAttribute("data-view-training"));
    });
  });
}

function viewTrainingReport(id) {
  const training = state.trainings.find(item => String(item.id) === String(id));
  if (!training) return;

  const content = document.getElementById("training-report-content");
  if (!content) return;

  content.innerHTML = `
    <div class="report-section">
      <h3>${escapeHTML(training.type || "")} (${escapeHTML(training.department || "")})</h3>
      <p><strong>Data:</strong> ${formatDateTime(training.date)}</p>
      <p><strong>Instrutor:</strong> ${escapeHTML(training.instructor || "")}</p>
      <p><strong>Auxiliares:</strong> ${escapeHTML(training.assistants || "Nenhum")}</p>
    </div>
    <div class="report-section">
      <h3>Participantes</h3>
      <p>${escapeHTML(training.present || "Nenhum")}</p>
    </div>
    <div class="report-section">
      <h3>Justificados e AVAL</h3>
      <p><strong>Justificados:</strong> ${escapeHTML(training.justified || "Nenhum")}</p>
      <p><strong>Em AVAL:</strong> ${escapeHTML(training.aval_list || "Nenhum")}</p>
    </div>
    <div class="report-section">
      <h3>Faltas registradas</h3>
      <p class="text-danger">${escapeHTML(training.absences || "Nenhuma falta")}</p>
    </div>
  `;

  openModal("training-report-modal");
}

/* =========================================================
   INATIVIDADE
   ========================================================= */

function isInactivityExempt(member) {
  if (member.high_command || member.afex) return true;

  return member.department === "BFE" &&
    ["CMT", "SCMT", "SUP-G"].some(code => memberHasRank(member, `[${code}]`));
}

function renderInactivityPage() {
  const tbody = document.getElementById("inactivity-table");
  if (!tbody) return;

  const eligible = state.members.filter(member => !isInactivityExempt(member));

  if (!eligible.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty">Nenhum membro aplicável para controle de inatividade.</td></tr>';
    return;
  }

  tbody.innerHTML = eligible.map(member => {
    const days = Number(member.inactivity_days) || 0;
    let action = "Normal";

    if (days >= 7) action = "EXÍLIO";
    else if (days >= 5) action = "ADVERTÊNCIA";
    else if (days >= 2) action = "700 JJ'S";

    return `
      <tr>
        <td><strong>${escapeHTML(member.discord || "")}</strong></td>
        <td>${escapeHTML(member.department || "")}</td>
        <td>${escapeHTML(member.rank || "")}</td>
        <td><span class="inactivity-days">${days} dia(s)</span></td>
        <td><span class="inactivity-action">${action}</span></td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-action" data-inactivity-add="${escapeHTML(member.id)}">+1 Dia</button>
            <button type="button" class="table-action danger" data-inactivity-reset="${escapeHTML(member.id)}">Voltou às atividades</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-inactivity-add]").forEach(button => {
    button.addEventListener("click", () => incrementInactivity(button.getAttribute("data-inactivity-add")));
  });

  tbody.querySelectorAll("[data-inactivity-reset]").forEach(button => {
    button.addEventListener("click", () => resetInactivity(button.getAttribute("data-inactivity-reset")));
  });
}

async function incrementInactivity(id) {
  const member = state.members.find(item => String(item.id) === String(id));
  if (!member) return;

  member.inactivity_days = (Number(member.inactivity_days) || 0) + 1;
  member.updated_at = new Date().toISOString();

  if (!await persistData("fantasmas_members", member)) return;

  await addLog(
    "INATIVIDADE",
    `Adicionado 1 dia inativo para ${member.discord}. Total: ${member.inactivity_days}.`
  );

  showToast(
    `Inatividade de ${member.discord}: ${member.inactivity_days} dia(s).`,
    "warning"
  );
  renderInactivityPage();
}

async function resetInactivity(id) {
  const member = state.members.find(item => String(item.id) === String(id));
  if (!member) return;

  member.inactivity_days = 0;
  member.updated_at = new Date().toISOString();

  if (!await persistData("fantasmas_members", member)) return;

  await addLog(
    "INATIVIDADE",
    `Membro ${member.discord} retornou às atividades. Inatividade zerada.`
  );

  showToast("Inatividade zerada com sucesso!", "success");
  renderInactivityPage();
}

/* =========================================================
   LOGS
   ========================================================= */

function renderLogsPage() {
  const tbody = document.getElementById("logs-table");
  if (!tbody) return;

  setText("logs-total", state.logs.length);

  const users = new Set(state.logs.map(log => log.author || "Sistema"));
  setText("logs-users", users.size);
  setText(
    "logs-last-time",
    state.logs.length ? formatTime(state.logs[0].created_at) : "—"
  );

  const search = document.getElementById("logs-search")?.value.trim().toLowerCase() || "";
  const typeFilter = document.getElementById("logs-type-filter")?.value || "";

  const filtered = state.logs.filter(log => {
    const text = `${log.description || ""} ${log.author || ""}`.toLowerCase();
    return text.includes(search) && (!typeFilter || log.type === typeFilter);
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Nenhum log encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(log => `
    <tr>
      <td>${formatDateTime(log.created_at)}</td>
      <td><strong>${escapeHTML(log.author || "Sistema")}</strong></td>
      <td><span class="badge badge-primary">${escapeHTML(log.type || "GERAL")}</span></td>
      <td>${escapeHTML(log.description || "")}</td>
    </tr>
  `).join("");
}

async function addLog(type, description) {
  const log = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    type,
    description,
    author: state.currentUser || "Sistema",
    created_at: new Date().toISOString()
  };

  state.logs.unshift(log);

  const saved = await persistData("fantasmas_logs", log);
  if (!saved) saveLocalBackup();

  if (state.activePage === "logs") renderLogsPage();
}

/* =========================================================
   TOASTS E CONFIRMAÇÃO
   ========================================================= */

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");

  if (!container) {
    console.log(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = type === "success" ? "✓" : type === "warning" ? "⚠️" : "✕";
  const iconElement = document.createElement("span");
  iconElement.textContent = icon;

  const messageElement = document.createElement("div");
  messageElement.textContent = message;

  toast.append(iconElement, messageElement);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function confirmAction(message, onConfirm) {
  const modal = document.getElementById("confirm-modal");
  const messageElement = document.getElementById("confirm-message");
  const button = document.getElementById("confirm-action-button");

  if (!modal || !messageElement || !button) {
    if (window.confirm(message)) onConfirm();
    return;
  }

  openModal("confirm-modal");
  messageElement.textContent = message;

  const replacement = button.cloneNode(true);
  button.parentNode.replaceChild(replacement, button);

  replacement.addEventListener("click", async () => {
    closeModal("confirm-modal");
    await onConfirm();
  });
}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value ?? "";
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("pt-BR");
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function countNames(value) {
  if (!value || !String(value).trim()) return 0;

  return String(value)
    .split(",")
    .map(name => name.trim())
    .filter(Boolean)
    .length;
}

function toLocalDateTimeInput(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}