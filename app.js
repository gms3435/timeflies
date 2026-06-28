// TEMPUSFLOW - STATE & DATA MANAGEMENT

// Default Seed Data
const DEFAULT_BLOCKS = [];
const DEFAULT_TASKS = [];

const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const currentDayIndex = new Date().getDay();

// App State
let state = {
    core: {
        blocks: [],
        tasks: [],
        currentFilter: 'all',
        currentDayFilter: 'all', // 'all', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom', 'none'
        currentDay: DAY_KEYS[currentDayIndex],
        theme: 'dark',
        taskView: 'list', // 'list' ou 'priorities'
        alarmsActive: true
    },
    money: {
        expenses: [],
        incomes: [],
        fixedExpenses: [],
        creditCards: [],
        budgets: {}, // Categoria -> Valor Limite
        goals: [],   // Metas de economia [{ id, nome, alvo, atual, prazo }]
        currentFinanceMonth: new Date().toISOString().substring(0, 7), // YYYY-MM
        currentFinanceSubTab: 'dashboard' // 'dashboard', 'cash', 'card', 'income', 'fixed'
    },
    learn: {
        projects: [],
        books: [],
        languages: [],
        courses: []
    },
    esg: { dailyLogs: [], goals: {}, shoppingList: [], freshFoods: [], foodLogs: [] },
    mind: { dailyLogs: [] },
    body: { dailyLogs: [], workouts: [], workoutHistory: [] },
    flyscore: { history: [] }
};

// Define property mappings to preserve backward compatibility for legacy functions
Object.defineProperties(state, {
    'blocks': { get() { return this.core.blocks; }, set(val) { this.core.blocks = val; }, enumerable: true, configurable: true },
    'tasks': { get() { return this.core.tasks; }, set(val) { this.core.tasks = val; }, enumerable: true, configurable: true },
    'projects': { get() { return this.learn.projects; }, set(val) { this.learn.projects = val; }, enumerable: true, configurable: true },
    'finances': { get() { return this.money; }, set(val) { this.money = val; }, enumerable: true, configurable: true },
    'theme': { get() { return this.core.theme; }, set(val) { this.core.theme = val; }, enumerable: true, configurable: true },
    'taskView': { get() { return this.core.taskView; }, set(val) { this.core.taskView = val; }, enumerable: true, configurable: true },
    'alarmsActive': { get() { return this.core.alarmsActive; }, set(val) { this.core.alarmsActive = val; }, enumerable: true, configurable: true },
    'currentFilter': { get() { return this.core.currentFilter; }, set(val) { this.core.currentFilter = val; }, enumerable: true, configurable: true },
    'currentDayFilter': { get() { return this.core.currentDayFilter; }, set(val) { this.core.currentDayFilter = val; }, enumerable: true, configurable: true },
    'currentDay': { get() { return this.core.currentDay; }, set(val) { this.core.currentDay = val; }, enumerable: true, configurable: true },
    'currentFinanceMonth': { get() { return this.money.currentFinanceMonth; }, set(val) { this.money.currentFinanceMonth = val; }, enumerable: true, configurable: true },
    'currentFinanceSubTab': { get() { return this.money.currentFinanceSubTab; }, set(val) { this.money.currentFinanceSubTab = val; }, enumerable: true, configurable: true }
});

// CHART VARIABLES
let timeChart = null;
let priorityChart = null;
let financeCategoryChart = null; // Novo

// CARD EXPANSION STATE (Smart UI)
let expandedTasks = new Set();
let expandedProjects = new Set();

// NOTIFIED BLOCKS TODAY (evita re-disparos no mesmo minuto)
let notifiedBlocksToday = [];

// Função de Migração de Dados
function migrateFinanceAndProjectData() {
    // 1. Migrar finanças se estiver no formato antigo (array)
    if (Array.isArray(state.finances)) {
        const oldExpenses = state.finances;
        state.finances = {
            expenses: [],
            incomes: [],
            fixedExpenses: [],
            cardSettings: {
                limit: 3000,
                closingDay: 5,
                dueDay: 12,
                name: 'Cartão Principal'
            }
        };
        oldExpenses.forEach(oldExp => {
            state.finances.expenses.push({
                id: oldExp.id || 'e_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                date: oldExp.date,
                amount: oldExp.amount,
                method: oldExp.method || 'cash',
                category: oldExp.category || 'outros',
                desc: oldExp.desc || '',
                installments: 1,
                currentInstallment: 1
            });
        });
    } else if (!state.finances || typeof state.finances !== 'object') {
        state.finances = {
            expenses: [],
            incomes: [],
            fixedExpenses: [],
            cardSettings: {
                limit: 3000,
                closingDay: 5,
                dueDay: 12,
                name: 'Cartão Principal'
            }
        };
    } else {
        // Garantir que todas as propriedades existam
        if (!state.finances.expenses) state.finances.expenses = [];
        if (!state.finances.incomes) state.finances.incomes = [];
        if (!state.finances.fixedExpenses) state.finances.fixedExpenses = [];
        if (!state.finances.cardSettings) {
            state.finances.cardSettings = {
                limit: 3000,
                closingDay: 5,
                dueDay: 12,
                name: 'Cartão Principal'
            };
        }
    }

    // Migração de múltiplos cartões
    if (!state.finances.creditCards) {
        state.finances.creditCards = [];
        if (state.finances.cardSettings) {
            state.finances.creditCards.push({
                id: 'default',
                name: state.finances.cardSettings.name || 'Cartão Principal',
                limit: parseFloat(state.finances.cardSettings.limit) || 3000,
                closingDay: parseInt(state.finances.cardSettings.closingDay) || 5,
                dueDay: parseInt(state.finances.cardSettings.dueDay) || 12,
                updatedAt: Date.now()
            });
        } else {
            state.finances.creditCards.push({
                id: 'default',
                name: 'Cartão Principal',
                limit: 3000,
                closingDay: 5,
                dueDay: 12,
                updatedAt: Date.now()
            });
        }
    }

    // Garantir cardId para despesas antigas de cartão
    state.finances.expenses.forEach(e => {
        if (e.method === 'card' && !e.cardId) {
            e.cardId = 'default';
        }
        if (!e.updatedAt) e.updatedAt = Date.now();
    });

    // Garantir atributos para despesas fixas antigas
    state.finances.fixedExpenses.forEach(f => {
        if (!f.method) f.method = 'cash';
        if (f.method === 'card' && !f.cardId) f.cardId = 'default';
        if (!f.updatedAt) f.updatedAt = Date.now();
    });

    // 2. Garantir inicialização de projetos (Semeando os 5 cursos restantes se estiver vazio)
    if (!state.projects || state.projects.length === 0) {
        state.projects = [
            {
                id: 'p_tcc',
                name: 'TCC - Engenharia de Materiais',
                code: 'EMA-TCC',
                professor: 'Dr. Orientador Silva',
                type: 'tcc',
                status: 'andamento',
                studyGoal: 8,
                grade: null,
                desc: 'Desenvolvimento e escrita do Trabalho de Conclusão do Curso de Engenharia de Materiais.'
            },
            {
                id: 'p_selemats',
                name: 'Seleção de Materiais',
                code: 'EMA-SEL',
                professor: 'Prof. Souza',
                type: 'disciplina',
                status: 'andamento',
                studyGoal: 4,
                grade: null,
                desc: 'Critérios e metodologias para seleção de materiais em engenharia.'
            },
            {
                id: 'p_caracterizacao',
                name: 'Caracterização de Materiais',
                code: 'EMA-CAR',
                professor: 'Profª. Costa',
                type: 'disciplina',
                status: 'planejado',
                studyGoal: 4,
                grade: null,
                desc: 'Técnicas de análise microestrutural, difração de raios-X e ensaios mecânicos.'
            },
            {
                id: 'p_metalurgia',
                name: 'Metalurgia Física',
                code: 'EMA-MET',
                professor: 'Prof. Oliveira',
                type: 'disciplina',
                status: 'planejado',
                studyGoal: 4,
                grade: null,
                desc: 'Estruturas cristalinas, transformações de fase e tratamentos térmicos em metais.'
            },
            {
                id: 'p_polimeros',
                name: 'Processamento de Polímeros',
                code: 'EMA-POL',
                professor: 'Profª. Lima',
                type: 'disciplina',
                status: 'planejado',
                studyGoal: 4,
                grade: null,
                desc: 'Extrusão, injeção e conformação de polímeros termoplásticos e termofixos.'
            }
        ];
    }

    // 3. Garantir meses e sub-abas financeiras no estado
    if (!state.currentFinanceMonth) {
        state.currentFinanceMonth = new Date().toISOString().substring(0, 7);
    }
    if (!state.currentFinanceSubTab) {
        state.currentFinanceSubTab = 'dashboard';
    }

    // 4. Garantir timestamps para mesclagem (Smart Sync)
    if (state.blocks) state.blocks.forEach(b => { if (!b.updatedAt) b.updatedAt = Date.now(); });
    if (state.tasks) state.tasks.forEach(t => { if (!t.updatedAt) t.updatedAt = Date.now(); });
    if (state.projects) state.projects.forEach(p => { if (!p.updatedAt) p.updatedAt = Date.now(); });
    if (state.finances) {
        if (state.finances.expenses) state.finances.expenses.forEach(e => { if (!e.updatedAt) e.updatedAt = Date.now(); });
        if (state.finances.incomes) state.finances.incomes.forEach(i => { if (!i.updatedAt) i.updatedAt = Date.now(); });
        if (state.finances.fixedExpenses) state.finances.fixedExpenses.forEach(f => { if (!f.updatedAt) f.updatedAt = Date.now(); });
    }

    // 5. Garantir inicialização dos novos módulos TimeFlies 3.0
    if (!state.esg) state.esg = { dailyLogs: [], goals: {} };
    if (!state.esg.dailyLogs) state.esg.dailyLogs = [];
    if (!state.esg.goals || typeof state.esg.goals !== 'object') {
        state.esg.goals = { waterTarget: 2, co2Target: 5, meatlessDaysTarget: 4 };
    }

    if (!state.mind) state.mind = { dailyLogs: [] };
    if (!state.mind.dailyLogs) state.mind.dailyLogs = [];

    if (!state.body) state.body = { dailyLogs: [], weightHistory: [] };
    if (!state.body.dailyLogs) state.body.dailyLogs = [];
    if (!state.body.weightHistory) state.body.weightHistory = [];

    if (!state.learn) state.learn = { projects: [], books: [], languages: [], courses: [] };
    if (!state.learn.books) state.learn.books = [];
    if (!state.learn.languages) state.learn.languages = [];
    if (!state.learn.courses) state.learn.courses = [];
    
    if (!state.flyscore) state.flyscore = { history: [] };
    if (!state.flyscore.history) state.flyscore.history = [];
}

// UI ELEMENTS
const elements = {
    timeline: document.getElementById('daily-timeline'),
    tasksContainer: document.getElementById('tasks-list-container'),
    themeToggle: document.getElementById('theme-toggle'),
    themeToggleMono: document.getElementById('theme-toggle-mono'),
    btnResetData: document.getElementById('btn-reset-data'),
    btnToggleAlarms: document.getElementById('btn-toggle-alarms'),
    btnClassCloseModals: document.querySelectorAll('.btn-close-modal'),
    
    // Modals
    modalBlock: document.getElementById('modal-block'),
    modalTask: document.getElementById('modal-task'),
    modalProject: document.getElementById('modal-project'), // Novo
    modalFinanceTransaction: document.getElementById('modal-finance-transaction'), // Novo
    modalFixedExpense: document.getElementById('modal-fixed-expense'), // Novo
    modalCreditCardSettings: document.getElementById('modal-credit-card-settings'), // Novo
    
    blockModalTitle: document.getElementById('block-modal-title'),
    taskModalTitle: document.getElementById('task-modal-title'),
    
    // Buttons to Open Modals
    btnsNewBlock: document.querySelectorAll('.btn-trigger-add-block'),
    btnsNewTask: document.querySelectorAll('.btn-trigger-add-task'),
    
    // Block Form
    blockForm: document.getElementById('block-form'),
    blockId: document.getElementById('block-id'),
    blockTitle: document.getElementById('block-title'),
    blockDays: document.getElementsByName('block-days'),
    blockStart: document.getElementById('block-start'),
    blockEnd: document.getElementById('block-end'),
    btnDeleteBlock: document.getElementById('btn-delete-block'),
    
    // Task Form
    taskForm: document.getElementById('task-form'),
    taskId: document.getElementById('task-id'),
    taskTitle: document.getElementById('task-title'),
    taskDesc: document.getElementById('task-desc'),
    taskCategory: document.getElementById('task-category'),
    taskPriority: document.getElementById('task-priority'),
    taskDuration: document.getElementById('task-duration'),
    taskDeadline: document.getElementById('task-deadline'),
    taskDeadlineTime: document.getElementById('task-deadline-time'),
    taskDay: document.getElementById('task-day'),
    btnDeleteTask: document.getElementById('btn-delete-task'),
    
    // Stats Header
    statsCommittedHours: document.getElementById('stats-committed-hours'),
    statsFreeHours: document.getElementById('stats-free-hours'),
    statsTasksCompleted: document.getElementById('stats-tasks-completed'),
    
    // Filter Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    agendaDaySelector: document.getElementById('agenda-day-selector'),
    taskDayFilterBar: document.getElementById('task-day-filter-bar'),
    
    // Smart Fit
    assistantTaskSelect: document.getElementById('assistant-task-select'),
    assistantSuggestions: document.getElementById('assistant-suggestions'),
    
    // Painel de Tarefas Pendentes (Agenda)
    pendingTasksPanel: document.getElementById('agenda-pending-tasks-panel'),
    pendingTasksList: document.getElementById('pending-tasks-list'),
    pendingTaskCount: document.getElementById('pending-task-count'),
    pendingChevron: document.getElementById('pending-chevron'),
    
    // Export
    btnExportWhatsApp: document.getElementById('btn-export-whatsapp'),
    btnExportAgendaWhatsApp: document.getElementById('btn-export-agenda-whatsapp'),
    btnExportProjectsWhatsApp: document.getElementById('btn-export-projects-whatsapp'),

    // Timer de Execução
    timerTaskSelect: document.getElementById('timer-task-select'),
    timerDisplay: document.getElementById('timer-display'),
    timerProgressFill: document.getElementById('timer-progress-fill'),
    timerRunningLabel: document.getElementById('timer-running-label'),
    btnTimerToggle: document.getElementById('btn-timer-toggle'),
    timerPlayIcon: document.getElementById('timer-play-icon'),

    // Modal de Alarme
    modalAlarmAlert: document.getElementById('modal-alarm-alert'),
    alarmTitleText: document.getElementById('alarm-title-text'),
    alarmMessage: document.getElementById('alarm-message'),
    alarmTimerStatus: document.getElementById('alarm-timer-status'),
    btnAlarmCompleteTask: document.getElementById('btn-alarm-complete-task')
};

// INITIALIZATION — usa 'load' para garantir que Chart.js e Lucide já carregaram
// Chave de descriptografia temporária em memória RAM
let userDecryptionKey = null;

window.addEventListener('load', () => {
    loadData();
    initAppEvents();
});

// LOAD & SAVE DATA (LocalStorage com Criptografia Opcional)
function loadData() {
    let savedTheme, savedHasPassword;
    try {
        savedTheme = localStorage.getItem('tempus_theme');
        savedHasPassword = localStorage.getItem('tempus_has_password');
    } catch (e) {
        console.warn('localStorage indisponível.', e);
    }
    
    state.theme = savedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    
    state.hasPassword = (savedHasPassword === 'true');
    state.lastSystemDateString = new Date().toDateString();
    
    // Exibir Tela de Bloqueio na inicialização
    const lockOverlay = document.getElementById('lock-screen-overlay');
    if (lockOverlay) {
        lockOverlay.classList.add('active');
        const lockDesc = document.getElementById('lock-desc');
        const lockReset = document.getElementById('lock-reset-section');
        
        if (state.hasPassword) {
            if (lockDesc) lockDesc.textContent = "Insira sua senha de acesso local para entrar.";
            if (lockReset) lockReset.classList.remove('hidden');
        } else {
            if (lockDesc) lockDesc.textContent = "Crie uma senha de acesso local para proteger seus dados no celular.";
            if (lockReset) lockReset.classList.add('hidden');
        }
        
        // Auto-focar campo de senha automaticamente
        setTimeout(() => {
            const passInput = document.getElementById('lock-password-input');
            if (passInput) {
                passInput.focus();
                passInput.select();
            }
        }, 100);
    }
}

function saveData() {
    try {
        localStorage.setItem('tempus_theme', state.core.theme);
        localStorage.setItem('tempus_has_password', state.hasPassword ? 'true' : 'false');
        
        if (state.hasPassword && userDecryptionKey) {
            // Payload completo modular que vai para o LocalStorage de forma cifrada
            const payload = {
                core: state.core,
                money: state.money,
                learn: state.learn,
                esg: state.esg,
                mind: state.mind,
                body: state.body,
                flyscore: state.flyscore
            };
            
            // Criptografa o JSON do payload usando a senha em memória
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), userDecryptionKey).toString();
            localStorage.setItem('tempus_secure_payload', encrypted);
        } else if (!state.hasPassword) {
            // Salva sem criptografia se não tiver senha
            localStorage.setItem('tempus_core', JSON.stringify(state.core));
            localStorage.setItem('tempus_money', JSON.stringify(state.money));
            localStorage.setItem('tempus_learn', JSON.stringify(state.learn));
            localStorage.setItem('tempus_esg', JSON.stringify(state.esg));
            localStorage.setItem('tempus_mind', JSON.stringify(state.mind));
            localStorage.setItem('tempus_body', JSON.stringify(state.body));
            localStorage.setItem('tempus_flyscore', JSON.stringify(state.flyscore));
        }
    } catch (e) {
        console.warn('Não foi possível salvar os dados no localStorage.', e);
    }
}

// Desbloquear e Inicializar Aplicação
function unlockAndInitializeApp(password, isFirstCreation = false) {
    userDecryptionKey = password;
    state.hasPassword = true;
    
    if (isFirstCreation) {
        // Se é a primeira vez, migra dados não criptografados caso existam
        let savedBlocks, savedTasks, savedFinances, savedAlarms, savedView, savedProjects;
        let savedCore, savedMoney, savedLearn;
        try {
            savedCore = localStorage.getItem('tempus_core');
            savedMoney = localStorage.getItem('tempus_money');
            savedLearn = localStorage.getItem('tempus_learn');
            
            savedBlocks = localStorage.getItem('tempus_blocks');
            savedTasks = localStorage.getItem('tempus_tasks');
            savedFinances = localStorage.getItem('tempus_finances');
            savedProjects = localStorage.getItem('tempus_projects');
            savedAlarms = localStorage.getItem('tempus_alarms');
            savedView = localStorage.getItem('tempus_view');
        } catch (e) {}
        
        if (savedCore || savedMoney || savedLearn) {
            if (savedCore) state.core = JSON.parse(savedCore);
            if (savedMoney) state.money = JSON.parse(savedMoney);
            if (savedLearn) state.learn = JSON.parse(savedLearn);
        } else {
            state.core.blocks = savedBlocks ? JSON.parse(savedBlocks) : DEFAULT_BLOCKS;
            state.core.tasks = savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS;
            state.learn.projects = savedProjects ? JSON.parse(savedProjects) : [];
            try {
                state.money = savedFinances ? JSON.parse(savedFinances) : state.money;
            } catch (e) {
                // Manter padrão inicial
            }
            state.core.alarmsActive = savedAlarms !== 'false';
            state.core.taskView = savedView === 'priorities' ? 'priorities' : 'list';
        }
        
        // Executa migração se necessário
        migrateFinanceAndProjectData();
        
        // Remove chaves antigas por segurança
        try {
            localStorage.removeItem('tempus_blocks');
            localStorage.removeItem('tempus_tasks');
            localStorage.removeItem('tempus_projects');
            localStorage.removeItem('tempus_finances');
            localStorage.removeItem('tempus_alarms');
            localStorage.removeItem('tempus_view');
        } catch (e) {}
        
        // Salva os dados criptografados imediatamente
        saveData();
    } else {
        // Tenta decodificar o payload seguro do LocalStorage
        let securePayload;
        try {
            securePayload = localStorage.getItem('tempus_secure_payload');
        } catch (e) {}
        
        if (securePayload) {
            try {
                const bytes = CryptoJS.AES.decrypt(securePayload, password);
                const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
                if (!decryptedStr) {
                    throw new Error("Senha incorreta");
                }
                const parsed = JSON.parse(decryptedStr);
                
                if (parsed.core) {
                    // Nova estrutura namespaced
                    state.core = parsed.core || state.core;
                    state.money = parsed.money || state.money;
                    state.learn = parsed.learn || state.learn;
                    state.esg = parsed.esg || state.esg;
                    state.mind = parsed.mind || state.mind;
                    state.body = parsed.body || state.body;
                    state.flyscore = parsed.flyscore || state.flyscore;
                } else {
                    // Estrutura antiga carregada para migração
                    state.core.blocks = parsed.blocks || [];
                    state.core.tasks = parsed.tasks || [];
                    state.learn.projects = parsed.projects || [];
                    state.money = parsed.finances || state.money;
                    state.core.taskView = parsed.taskView || 'list';
                    state.core.alarmsActive = parsed.alarmsActive !== false;
                }
                
                // Inicialização das novas estruturas de rotina
                if (!state.esg.shoppingList) state.esg.shoppingList = [];
                if (!state.esg.freshFoods) state.esg.freshFoods = [];
                if (!state.esg.foodLogs) state.esg.foodLogs = [];
                if (!state.body.workouts || state.body.workouts.length === 0) state.body.workouts = getDefaultWorkouts();
                if (!state.body.workoutHistory) state.body.workoutHistory = [];
                
                // Executa migração
                migrateFinanceAndProjectData();
                saveData();
            } catch (e) {
                console.error("Erro na descriptografia:", e);
                return false; // Senha incorreta ou dados corrompidos
            }
        } else {
            // Tentar ler chaves não criptografadas
            let savedCore = localStorage.getItem('tempus_core');
            let savedMoney = localStorage.getItem('tempus_money');
            let savedLearn = localStorage.getItem('tempus_learn');
            let savedEsg = localStorage.getItem('tempus_esg');
            let savedMind = localStorage.getItem('tempus_mind');
            let savedBody = localStorage.getItem('tempus_body');
            let savedFlyscore = localStorage.getItem('tempus_flyscore');
            
            if (savedCore || savedMoney || savedLearn) {
                if (savedCore) state.core = JSON.parse(savedCore);
                if (savedMoney) state.money = JSON.parse(savedMoney);
                if (savedLearn) state.learn = JSON.parse(savedLearn);
                if (savedEsg) state.esg = JSON.parse(savedEsg);
                if (savedMind) state.mind = JSON.parse(savedMind);
                if (savedBody) state.body = JSON.parse(savedBody);
                if (savedFlyscore) state.flyscore = JSON.parse(savedFlyscore);
            } else {
                // Se não há chaves novas, ler as chaves legadas e migrar
                let savedBlocks = localStorage.getItem('tempus_blocks');
                let savedTasks = localStorage.getItem('tempus_tasks');
                let savedFinances = localStorage.getItem('tempus_finances');
                let savedProjects = localStorage.getItem('tempus_projects');
                let savedAlarms = localStorage.getItem('tempus_alarms');
                let savedView = localStorage.getItem('tempus_view');
                
                state.core.blocks = savedBlocks ? JSON.parse(savedBlocks) : DEFAULT_BLOCKS;
                state.core.tasks = savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS;
                state.core.alarmsActive = savedAlarms !== 'false';
                state.core.taskView = savedView === 'priorities' ? 'priorities' : 'list';
                
                try {
                    state.money = savedFinances ? JSON.parse(savedFinances) : state.money;
                } catch (e) {
                    // Manter padrão inicial
                }
                state.learn.projects = savedProjects ? JSON.parse(savedProjects) : [];
            }
            
            // Inicialização das novas estruturas de rotina
            if (!state.esg.shoppingList) state.esg.shoppingList = [];
            if (!state.esg.freshFoods) state.esg.freshFoods = [];
            if (!state.esg.foodLogs) state.esg.foodLogs = [];
            if (!state.body.workouts || state.body.workouts.length === 0) state.body.workouts = getDefaultWorkouts();
            if (!state.body.workoutHistory) state.body.workoutHistory = [];

            migrateFinanceAndProjectData();
            saveData();
        }
    }
    
    // Ocultar a tela de bloqueio
    const lockOverlay = document.getElementById('lock-screen-overlay');
    if (lockOverlay) {
        lockOverlay.classList.remove('active');
    }
    
    // Sincroniza visualização de tarefas
    const btnList = document.getElementById('btn-view-list');
    const btnPriorities = document.getElementById('btn-view-priorities');
    const containerPriorities = document.getElementById('tasks-priorities-container');
    if (state.taskView === 'priorities') {
        if (btnList) btnList.classList.remove('active');
        if (btnPriorities) btnPriorities.classList.add('active');
        elements.tasksContainer.classList.add('hidden');
        if (containerPriorities) containerPriorities.classList.remove('hidden');
    } else {
        if (btnList) btnList.classList.add('active');
        if (btnPriorities) btnPriorities.classList.remove('active');
        elements.tasksContainer.classList.remove('hidden');
        if (containerPriorities) containerPriorities.classList.add('hidden');
    }
    
    // Renderiza todas as seções e abas
    renderAll();
    
    // Iniciar loop de alarmes
    setInterval(checkAgendaAlarms, 20000);
    
    // Solicitar permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    return true; // Desbloqueado com sucesso
}

function handleLockSubmit(event) {
    event.preventDefault();
    const passInput = document.getElementById('lock-password-input');
    const errorMsg = document.getElementById('lock-error-msg');
    const lockCard = document.querySelector('.lock-card');
    
    if (!passInput) return;
    const password = passInput.value.trim();
    if (!password) return;
    
    let success = false;
    if (state.hasPassword) {
        success = unlockAndInitializeApp(password, false);
    } else {
        success = unlockAndInitializeApp(password, true);
    }
    
    if (success) {
        passInput.value = '';
        if (errorMsg) errorMsg.classList.add('hidden');
    } else {
        if (errorMsg) errorMsg.classList.remove('hidden');
        if (lockCard) {
            lockCard.classList.add('shake');
            setTimeout(() => {
                lockCard.classList.remove('shake');
            }, 400);
        }
        passInput.value = '';
        passInput.focus();
    }
}

function resetAllAppData() {
    if (confirm('Atenção: Isso irá apagar PERMANENTEMENTE todos os seus dados e senhas salvas. Deseja redefinir o TimeFlies?')) {
        try {
            localStorage.clear();
        } catch (e) {}
        location.reload();
    }
}

// EVENTS BINDING
function initAppEvents() {
    // Sync alarm button state in UI
    updateAlarmsButtonUI();

    // Reset Data
    if (elements.btnResetData) {
        elements.btnResetData.addEventListener('click', () => {
            if (confirm('Aviso: Isso irá apagar todas as tarefas e blocos salvos e restaurar os dados iniciais do aplicativo. Deseja continuar?')) {
                try {
                    localStorage.removeItem('tempus_blocks');
                    localStorage.removeItem('tempus_tasks');
                    localStorage.removeItem('tempus_theme');
                    localStorage.removeItem('tempus_alarms');
                    localStorage.removeItem('tempus_view');
                } catch (e) {}
                location.reload();
            }
        });
    }

    // Toggle Alarms
    if (elements.btnToggleAlarms) {
        elements.btnToggleAlarms.addEventListener('click', () => {
            state.alarmsActive = !state.alarmsActive;
            updateAlarmsButtonUI();
            saveData();
        });
    }

    // Timer Task Select
    if (elements.timerTaskSelect) {
        elements.timerTaskSelect.addEventListener('change', (e) => {
            onTimerTaskSelect(e.target.value);
        });
    }

    // Theme Toggle (Alternar entre Claro e Escuro)
    elements.themeToggle.addEventListener('click', () => {
        if (state.theme === 'mono-dark' || state.theme === 'dark') {
            state.theme = 'light';
        } else {
            state.theme = 'dark';
        }
        document.documentElement.setAttribute('data-theme', state.theme);
        saveData();
        updateChartTheme();
    });

    // Theme Toggle Mono (Mercúrio - Alternar entre Monochrome Dark e Light)
    if (elements.themeToggleMono) {
        elements.themeToggleMono.addEventListener('click', () => {
            if (state.theme === 'mono-dark') {
                state.theme = 'mono-light';
            } else if (state.theme === 'mono-light') {
                state.theme = 'mono-dark';
            } else {
                // Se estiver no colorido, vai para o mono correspondente
                state.theme = state.theme === 'light' ? 'mono-light' : 'mono-dark';
            }
            document.documentElement.setAttribute('data-theme', state.theme);
            saveData();
            updateChartTheme();
        });
    }

    // Close Modals
    elements.btnClassCloseModals.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Close modal on overlay click
    window.addEventListener('click', (e) => {
        if (e.target === elements.modalBlock) closeModal();
        if (e.target === elements.modalTask) closeModal();
    });

    // Block Modal Trigger
    elements.btnsNewBlock.forEach(btn => {
        btn.addEventListener('click', () => {
            openBlockModal();
        });
    });

    // Block Form Submit
    elements.blockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveBlock();
    });

    // Block Delete
    elements.btnDeleteBlock.addEventListener('click', () => {
        deleteBlock();
    });

    // Task Modal Trigger
    elements.btnsNewTask.forEach(btn => {
        btn.addEventListener('click', () => {
            openTaskModal();
        });
    });

    // Task Form Submit
    elements.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
    });

    // Task Delete
    elements.btnDeleteTask.addEventListener('click', () => {
        deleteTask();
    });

    // Filters Tabs
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.getAttribute('data-category');
            renderTasks();
        });
    });

    // Assistant Task Select Change
    elements.assistantTaskSelect.addEventListener('change', (e) => {
        renderSmartSuggestions(e.target.value);
    });

    // Block Modal Checkbox Toggle Visuals
    const blockCheckboxes = document.querySelectorAll('.checkbox-chip input');
    blockCheckboxes.forEach(input => {
        input.addEventListener('change', () => {
            if (input.checked) {
                input.parentElement.classList.add('checked');
            } else {
                input.parentElement.classList.remove('checked');
            }
        });
    });

    // Agenda Day Selector Chips
    if (elements.agendaDaySelector) {
        const chips = elements.agendaDaySelector.querySelectorAll('.day-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                state.currentDay = chip.dataset.day;
                
                // Update active chip visually
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                
                renderAll();
            });
        });
    }

    // Task Day Filter Bar Buttons
    if (elements.taskDayFilterBar) {
        const filterBtns = elements.taskDayFilterBar.querySelectorAll('.day-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentDayFilter = btn.dataset.day;
                
                // Update active class
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                renderTasks();
            });
        });
    }
    
    // WhatsApp Export Button (Tarefas + Resumo)
    if (elements.btnExportWhatsApp) {
        elements.btnExportWhatsApp.addEventListener('click', exportToWhatsApp);
    }

    // WhatsApp Export Agenda Button (Apenas compromissos)
    if (elements.btnExportAgendaWhatsApp) {
        elements.btnExportAgendaWhatsApp.addEventListener('click', exportAgendaToWhatsApp);
    }

    // WhatsApp Export Projects Button (Lista geral de disciplinas e projetos)
    if (elements.btnExportProjectsWhatsApp) {
        elements.btnExportProjectsWhatsApp.addEventListener('click', exportAllProjectsToWhatsApp);
    }

    // FAB Toggle (mobile)
    const fabMainBtn = document.getElementById('fab-main-btn');
    const fabOptions = document.getElementById('fab-options');
    if (fabMainBtn && fabOptions) {
        fabMainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fabMainBtn.classList.toggle('active');
            fabOptions.classList.toggle('show');
        });
        
        // Clicar em qualquer opção fecha o FAB
        document.querySelectorAll('.fab-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                fabMainBtn.classList.remove('active');
                fabOptions.classList.remove('show');
            });
        });
        
        // Clicar fora fecha o FAB
        window.addEventListener('click', () => {
            fabMainBtn.classList.remove('active');
            fabOptions.classList.remove('show');
        });
    }
}

// TIME HELPERS
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

function formatMinutesDuration(mins) {
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return `R$ ${val.toFixed(2).replace('.', ',')}`;
}

// SAFE LUCIDE CALLS WRAPPER
function safeCreateIcons() {
    if (typeof lucide !== 'undefined') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.error('Error creating icons:', e);
        }
    }
}

// MERGE AND CALCULATE FREE INTERVALS
function calculateTimeSlots() {
    // Filter blocks for the current active day
    const dayBlocks = state.blocks.filter(b => b.day === state.currentDay);
    // Sort blocks by start time
    const sortedBlocks = [...dayBlocks].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    const slots = [];
    let currentMins = 0;

    sortedBlocks.forEach(block => {
        const startMins = timeToMinutes(block.start);
        const endMins = timeToMinutes(block.end);

        // If there is free space before this block
        if (startMins > currentMins) {
            slots.push({
                type: 'free',
                start: minutesToTime(currentMins),
                end: block.start,
                duration: startMins - currentMins
            });
        }

        // Add the occupied block
        slots.push({
            type: 'occupied',
            id: block.id,
            title: block.title,
            start: block.start,
            end: block.end,
            color: block.color,
            duration: endMins - startMins
        });

        currentMins = Math.max(currentMins, endMins);
    });

    // Add remaining free space until 24:00 (1440 minutes)
    if (currentMins < 1440) {
        slots.push({
            type: 'free',
            start: minutesToTime(currentMins),
            end: '24:00',
            duration: 1440 - currentMins
        });
    }

    return slots;
}

// RENDER COCKPIT/HOME PAGE & FLYSCORE
function renderHome() {
    const greetingEl = document.getElementById('home-greeting');
    const dateSubtitleEl = document.getElementById('home-date-subtitle');
    if (!greetingEl || !dateSubtitleEl) return;

    // 1. Get Date and Time for greeting
    const now = new Date();
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const dayName = days[now.getDay()];
    const dayNum = now.getDate();
    const monthName = months[now.getMonth()];
    const yearNum = now.getFullYear();
    
    dateSubtitleEl.textContent = `${dayName}, ${dayNum} de ${monthName} de ${yearNum}`;
    
    const hour = now.getHours();
    let greeting = 'Olá!';
    if (hour >= 5 && hour < 12) greeting = 'Bom dia!';
    else if (hour >= 12 && hour < 18) greeting = 'Boa tarde!';
    else greeting = 'Boa noite!';
    
    greetingEl.textContent = `${greeting} Que seu dia seja produtivo.`;

    // 2. Calculate and Render FlyScore
    const flyscores = calculateFlyScore();
    
    const scoreValEl = document.getElementById('home-flyscore-value');
    const scoreCircle = document.getElementById('home-flyscore-circle');
    const scoreStatusEl = document.getElementById('home-flyscore-status');
    const scoreDescEl = document.getElementById('home-flyscore-desc');
    
    if (scoreValEl && scoreCircle && scoreStatusEl && scoreDescEl) {
        scoreValEl.textContent = flyscores.score;
        // SVG circle radius is 65. Circumference is 2 * Math.PI * 65 ≈ 408.4
        const circumference = 408.4;
        const offset = circumference - (flyscores.score / 100) * circumference;
        scoreCircle.style.strokeDashoffset = offset;
        
        let statusText = 'Regular';
        let descText = 'Mantenha suas tarefas em dia, economize e registre seus hábitos de saúde e ecologia.';
        let colorClass = 'text-warning';
        
        if (flyscores.score >= 85) {
            statusText = 'Excelente! 🎉';
            descText = 'Impressionante! Sua rotina, finanças e bem-estar estão em perfeita harmonia.';
            colorClass = 'text-success';
        } else if (flyscores.score >= 60) {
            statusText = 'Bom 📈';
            descText = 'Seu progresso é positivo. Continue registrando seus hábitos para crescer.';
            colorClass = 'text-primary';
        } else {
            statusText = 'Atenção! ⚠️';
            descText = 'Seu FlyScore está baixo hoje. Revise suas tarefas pendentes e bem-estar.';
            colorClass = 'text-danger';
        }
        
        scoreStatusEl.textContent = statusText;
        scoreStatusEl.className = `flyscore-status ${colorClass}`;
        scoreDescEl.textContent = descText;
    }

    // 3. Render Cockpit Cards Metrics
    
    // 3.1. Tempo & Agenda Summary
    const slots = calculateTimeSlots();
    let occupiedMins = 0;
    slots.forEach(slot => {
        if (slot.type === 'occupied') occupiedMins += slot.duration;
    });
    const freeMins = 1440 - occupiedMins;
    
    // Filter tasks for the selected day
    const dayTasks = state.tasks.filter(t => t.day === state.currentDay);
    const totalTasks = dayTasks.length;
    const completedTasks = dayTasks.filter(t => t.completed).length;
    
    const timeCommittedEl = document.getElementById('cockpit-time-committed');
    const timeFreeEl = document.getElementById('cockpit-time-free');
    const timeTasksEl = document.getElementById('cockpit-time-tasks');
    const timeProgressEl = document.getElementById('cockpit-time-progress');
    
    if (timeCommittedEl) timeCommittedEl.textContent = `${(occupiedMins / 60).toFixed(1)}h`;
    if (timeFreeEl) timeFreeEl.textContent = `${(freeMins / 60).toFixed(1)}h`;
    if (timeTasksEl) timeTasksEl.textContent = `${completedTasks}/${totalTasks}`;
    if (timeProgressEl) {
        const pct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        timeProgressEl.style.width = `${pct}%`;
    }

    // Highlight the active day in the cockpit day selector
    const cockpitSelector = document.getElementById('cockpit-day-selector');
    if (cockpitSelector) {
        const btns = cockpitSelector.querySelectorAll('.cockpit-day-btn');
        btns.forEach(btn => {
            if (btn.dataset.day === state.currentDay) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // 3.2. Money Flies Summary
    const currentMonth = state.money.currentFinanceMonth || new Date().toISOString().substring(0, 7);
    const expenses = (state.money.expenses || []).filter(e => e.date && e.date.substring(0, 7) === currentMonth);
    const incomes = (state.money.incomes || []).filter(i => i.date && i.date.substring(0, 7) === currentMonth);
    const totalExp = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalInc = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalInc - totalExp;
    
    // Projeta despesa cartão
    const activeCards = state.money.creditCards || [];
    let totalInvoiceProjected = 0;
    activeCards.forEach(card => {
        const invoiceItems = getCardExpensesForInvoice(currentMonth, card.id);
        totalInvoiceProjected += invoiceItems.reduce((acc, curr) => acc + curr.installmentAmount, 0);
    });

    // Orçamentos staus
    const budgets = state.money.budgets || {};
    let budgetsExceeded = 0;
    let budgetsActive = 0;
    for (const cat in budgets) {
        const limit = budgets[cat];
        if (limit > 0) {
            budgetsActive++;
            const catExp = expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0);
            if (catExp > limit) budgetsExceeded++;
        }
    }
    let budgetText = 'Sem orçamentos';
    if (budgetsActive > 0) {
        budgetText = budgetsExceeded > 0 ? `${budgetsExceeded} estourado(s)` : '100% OK';
    }

    const moneyBalanceEl = document.getElementById('cockpit-money-balance');
    const moneyInvoiceEl = document.getElementById('cockpit-money-invoice');
    const moneyBudgetsEl = document.getElementById('cockpit-money-budgets');
    const moneyProgressEl = document.getElementById('cockpit-money-progress');

    if (moneyBalanceEl) {
        moneyBalanceEl.textContent = formatCurrency(balance);
        moneyBalanceEl.className = balance >= 0 ? 'cockpit-metric-value text-success' : 'cockpit-metric-value text-danger';
    }
    if (moneyInvoiceEl) moneyInvoiceEl.textContent = formatCurrency(totalInvoiceProjected);
    if (moneyBudgetsEl) {
        moneyBudgetsEl.textContent = budgetText;
        moneyBudgetsEl.className = budgetsExceeded > 0 ? 'cockpit-metric-value text-danger' : 'cockpit-metric-value text-success';
    }
    if (moneyProgressEl) {
        moneyProgressEl.style.width = `${flyscores.money}%`;
    }

    // 3.3. Learn Flies Summary
    const projects = state.learn.projects || [];
    const learnCountEl = document.getElementById('cockpit-learn-count');
    const learnGpaEl = document.getElementById('cockpit-learn-gpa');
    const learnStreakEl = document.getElementById('cockpit-learn-streak');
    const learnProgressEl = document.getElementById('cockpit-learn-progress');

    if (learnCountEl) learnCountEl.textContent = projects.length;
    
    let gpaSum = 0;
    let gpaCount = 0;
    projects.forEach(p => {
        if (p.grade !== null && p.grade !== undefined) {
            gpaSum += parseFloat(p.grade);
            gpaCount++;
        }
    });
    const avgGpa = gpaCount > 0 ? (gpaSum / gpaCount) : null;
    
    if (learnGpaEl) learnGpaEl.textContent = avgGpa !== null ? avgGpa.toFixed(2) : 'N/A';
    if (learnStreakEl) {
        const streak = calculateLanguageStreak();
        learnStreakEl.textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'}`;
    }
    if (learnProgressEl) {
        learnProgressEl.style.width = `${flyscores.learn}%`;
    }

    // 3.4. ESG Flies Summary
    const esgLogs = state.esg.dailyLogs || [];
    const esgCo2El = document.getElementById('cockpit-esg-co2');
    const esgMeatlessEl = document.getElementById('cockpit-esg-meatless');
    const esgPlasticEl = document.getElementById('cockpit-esg-plastic');
    const esgProgressEl = document.getElementById('cockpit-esg-progress');

    let weeklyCo2 = 0;
    let meatlessDays = 0;
    let plasticAvoided = 0;
    esgLogs.slice(0, 7).forEach(l => {
        weeklyCo2 += (parseFloat(l.transportCar) || 0) * 0.18 + (parseFloat(l.transportPublic) || 0) * 0.04;
        if (l.meatless) meatlessDays++;
        plasticAvoided += (parseInt(l.plasticAvoided) || 0);
    });

    if (esgCo2El) esgCo2El.textContent = `${weeklyCo2.toFixed(1)} Kg`;
    if (esgMeatlessEl) esgMeatlessEl.textContent = `${meatlessDays} ${meatlessDays === 1 ? 'dia' : 'dias'}`;
    if (esgPlasticEl) esgPlasticEl.textContent = plasticAvoided;
    if (esgProgressEl) {
        esgProgressEl.style.width = `${flyscores.esg}%`;
    }

    // 3.5. Mind Flies Summary
    const mindLogs = state.mind.dailyLogs || [];
    const mindMoodEl = document.getElementById('cockpit-mind-mood');
    const mindEnergyEl = document.getElementById('cockpit-mind-energy');
    const mindPracticesEl = document.getElementById('cockpit-mind-practices');
    const mindProgressEl = document.getElementById('cockpit-mind-progress');

    let avgMood = 0;
    let avgEnergy = 0;
    let practicesCount = 0;
    if (mindLogs.length > 0) {
        const last7 = mindLogs.slice(0, 7);
        const sumMood = last7.reduce((acc, curr) => acc + (parseInt(curr.mood) || 3), 0);
        const sumEnergy = last7.reduce((acc, curr) => acc + (parseInt(curr.energy) || 3), 0);
        avgMood = sumMood / last7.length;
        avgEnergy = sumEnergy / last7.length;
        
        last7.forEach(l => {
            if (l.practices) practicesCount += l.practices.length;
        });
    }

    const moodEmojis = { 1: '😫', 2: '😔', 3: '😐', 4: '😊', 5: '🤩' };
    if (mindMoodEl) mindMoodEl.textContent = avgMood > 0 ? `${moodEmojis[Math.round(avgMood)]} (${avgMood.toFixed(1)})` : 'N/A';
    if (mindEnergyEl) mindEnergyEl.textContent = avgEnergy > 0 ? `${avgEnergy.toFixed(1)} / 5` : 'N/A';
    if (mindPracticesEl) mindPracticesEl.textContent = practicesCount;
    if (mindProgressEl) {
        mindProgressEl.style.width = `${flyscores.mind}%`;
    }

    // 3.6. Body Flies Summary
    const bodyLogs = state.body.dailyLogs || [];
    const bodyWaterEl = document.getElementById('cockpit-body-water');
    const bodySleepEl = document.getElementById('cockpit-body-sleep');
    const bodyExerciseEl = document.getElementById('cockpit-body-exercise');
    const bodyProgressEl = document.getElementById('cockpit-body-progress');

    const todayStr = new Date().toISOString().substring(0, 10);
    const todayBodyLog = bodyLogs.find(l => l.date === todayStr);
    const todayWater = todayBodyLog ? (todayBodyLog.waterCups || 0) : 0;

    let totalSleep = 0;
    let exerciseMins = 0;
    let validSleepLogs = 0;
    
    bodyLogs.slice(0, 7).forEach(l => {
        if (l.sleepStart && l.sleepEnd) {
            const start = new Date(`${l.date}T${l.sleepStart}`);
            let end = new Date(`${l.date}T${l.sleepEnd}`);
            if (end < start) end.setDate(end.getDate() + 1);
            const diffHours = (end - start) / (1000 * 60 * 60);
            totalSleep += diffHours;
            validSleepLogs++;
        }
        exerciseMins += (parseInt(l.exerciseDuration) || 0);
    });

    const avgSleepVal = validSleepLogs > 0 ? (totalSleep / validSleepLogs) : 0;

    if (bodyWaterEl) bodyWaterEl.textContent = `${todayWater} / 8 copos`;
    if (bodySleepEl) bodySleepEl.textContent = avgSleepVal > 0 ? `${avgSleepVal.toFixed(1)}h` : 'N/A';
    if (bodyExerciseEl) bodyExerciseEl.textContent = `${exerciseMins} min`;
    if (bodyProgressEl) {
        bodyProgressEl.style.width = `${flyscores.body}%`;
    }
    
    // Render do widget de alimentos na Home
    if (typeof renderHomeFreshFoods === 'function') renderHomeFreshFoods();
}

// CÁLCULO GERAL DE FLYSCORE
function calculateFlyScore() {
    // 1. Core (Tempo/Tarefas) Score - 25%
    let coreScore = 100;
    const totalTasks = state.tasks.length;
    if (totalTasks > 0) {
        const completed = state.tasks.filter(t => t.completed).length;
        coreScore = (completed / totalTasks) * 100;
    }
    
    // 2. Money Score - 20%
    let moneyScore = 100;
    const currentMonth = state.money.currentFinanceMonth || new Date().toISOString().substring(0, 7);
    const expenses = (state.money.expenses || []).filter(e => e.date && e.date.substring(0, 7) === currentMonth);
    const incomes = (state.money.incomes || []).filter(i => i.date && i.date.substring(0, 7) === currentMonth);
    const totalExp = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalInc = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    
    if (totalInc > 0 && totalExp > totalInc) {
        const excessRatio = (totalExp - totalInc) / totalInc;
        moneyScore -= Math.min(40, excessRatio * 100);
    }
    
    let budgetExceededCount = 0;
    let totalBudgets = 0;
    const budgets = state.money.budgets || {};
    for (const cat in budgets) {
        const limit = budgets[cat];
        if (limit > 0) {
            totalBudgets++;
            const catExp = expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0);
            if (catExp > limit) {
                budgetExceededCount++;
            }
        }
    }
    if (totalBudgets > 0) {
        moneyScore -= (budgetExceededCount / totalBudgets) * 40;
    }
    moneyScore = Math.max(0, Math.min(100, moneyScore));
    
    // 3. ESG Score - 20%
    let esgScore = 100;
    const esgLogs = state.esg.dailyLogs || [];
    if (esgLogs.length > 0) {
        // Calculate based on last 7 logs
        const lastLogs = esgLogs.slice(0, 7);
        let waterDeficitDays = 0;
        let meatlessDays = 0;
        let plasticsAvoided = 0;
        let recycledDays = 0;
        let co2Sum = 0;
        
        lastLogs.forEach(l => {
            if ((l.water || 0) < 1.5) waterDeficitDays++;
            if (l.meatless) meatlessDays++;
            if (l.recycled) recycledDays++;
            plasticsAvoided += (parseInt(l.plasticAvoided) || 0);
            
            const co2 = (parseFloat(l.transportCar) || 0) * 0.18 + (parseFloat(l.transportPublic) || 0) * 0.04;
            co2Sum += co2;
        });
        
        esgScore -= (waterDeficitDays * 8);
        esgScore -= (co2Sum > 10 ? 15 : 0);
        esgScore += (meatlessDays * 5);
        esgScore += (recycledDays * 5);
        esgScore += (plasticsAvoided * 2);
    }
    
    // Bônus/Penalidade de Alimentos Consumidos/Desperdiçados nos últimos 7 dias
    const todayDate = new Date();
    const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentFoodLogs = state.esg.foodLogs || [];
    recentFoodLogs.forEach(fl => {
        const logDate = new Date(fl.date);
        if (logDate >= sevenDaysAgo) {
            if (fl.action === 'consumed') esgScore += 5;
            if (fl.action === 'wasted') esgScore -= 10;
        }
    });
    esgScore = Math.max(0, Math.min(100, esgScore));
    
    // 4. Mind Score - 15%
    let mindScore = 100;
    const mindLogs = state.mind.dailyLogs || [];
    if (mindLogs.length > 0) {
        const lastLogs = mindLogs.slice(0, 7);
        const sumMood = lastLogs.reduce((acc, curr) => acc + (parseInt(curr.mood) || 3), 0);
        mindScore = (sumMood / (lastLogs.length * 5)) * 100;
    }
    
    // 5. Body Score - 10%
    let bodyScore = 100;
    const bodyLogs = state.body.dailyLogs || [];
    const hasWorkoutsCompleted = state.body.workouts && state.body.workouts.some(w => w.completedDays && w.completedDays.length > 0);
    if (bodyLogs.length > 0 || hasWorkoutsCompleted) {
        const lastLogs = bodyLogs.slice(0, 7);
        let waterCupScore = 0;
        let sleepScore = 0;
        let exerciseMins = 0;
        
        lastLogs.forEach(l => {
            waterCupScore += Math.min(100, ((l.waterCups || 0) / 8) * 100);
            sleepScore += Math.min(100, ((parseInt(l.sleepQuality) || 3) / 5) * 100);
            exerciseMins += (parseInt(l.exerciseDuration) || 0);
        });
        
        // Contar treinos concluídos nos últimos 7 dias e adicionar 45 minutos para cada um
        const sevenDaysAgoStr = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        let completedWorkoutsMins = 0;
        if (state.body.workouts) {
            state.body.workouts.forEach(w => {
                if (w.completedDays) {
                    w.completedDays.forEach(d => {
                        if (d >= sevenDaysAgoStr) {
                            completedWorkoutsMins += 45; // 45 minutos por treino
                        }
                    });
                }
            });
        }
        exerciseMins += completedWorkoutsMins;
        
        const avgWater = lastLogs.length > 0 ? (waterCupScore / lastLogs.length) : 50;
        const avgSleep = lastLogs.length > 0 ? (sleepScore / lastLogs.length) : 60;
        const avgExercise = Math.min(100, (exerciseMins / 150) * 100); // Meta de 150 mins
        
        bodyScore = (avgWater * 0.3) + (avgSleep * 0.3) + (avgExercise * 0.4);
    }
    bodyScore = Math.max(0, Math.min(100, bodyScore));
    
    // 6. Learn Score - 10%
    let learnScore = 100;
    const projects = state.learn.projects || [];
    const books = state.learn.books || [];
    const langs = state.learn.languages || [];
    
    let projPart = 100;
    if (projects.length > 0) {
        let gpaSum = 0;
        let gpaCount = 0;
        projects.forEach(p => {
            if (p.grade !== null && p.grade !== undefined) {
                gpaSum += parseFloat(p.grade);
                gpaCount++;
            }
        });
        if (gpaCount > 0) {
            projPart = (gpaSum / gpaCount) * 10;
        }
    }
    
    let bookPart = 100;
    if (books.length > 0) {
        const completedBooks = books.filter(b => b.status === 'completed').length;
        bookPart = (completedBooks / books.length) * 100;
    }
    
    let langPart = langs.length > 0 ? Math.min(100, calculateLanguageStreak() * 10) : 0;
    
    learnScore = (projPart * 0.5) + (bookPart * 0.3) + (langPart * 0.2);
    learnScore = Math.max(0, Math.min(100, learnScore));
    
    const finalScore = Math.round(
        (coreScore * 0.25) + 
        (moneyScore * 0.20) + 
        (esgScore * 0.20) + 
        (mindScore * 0.15) + 
        (bodyScore * 0.10) + 
        (learnScore * 0.10)
    );
    
    return {
        score: finalScore,
        core: Math.round(coreScore),
        money: Math.round(moneyScore),
        esg: Math.round(esgScore),
        mind: Math.round(mindScore),
        body: Math.round(bodyScore),
        learn: Math.round(learnScore)
    };
}

// RENDERING FUNCTIONS
function renderAll() {
    renderHome();
    // Sync active day chip in agenda selector
    if (elements.agendaDaySelector) {
        const chips = elements.agendaDaySelector.querySelectorAll('.day-chip');
        chips.forEach(chip => {
            if (chip.dataset.day === state.currentDay) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    renderTimeline();
    
    // Renderiza tarefas com base na visualização selecionada
    if (state.taskView === 'priorities') {
        renderPrioritiesGrid();
    } else {
        renderTasks();
    }
    
    renderHeaderStats();
    renderCharts();
    renderAssistantDropdown();
    renderTimerTaskDropdown();
    renderPendingTasksPanel();
    renderProjects(); // Renderiza projetos e estudos
    renderFinances(); // Renderiza lançamentos financeiros locais
    renderEsg();
    renderMind();
    renderBody();
    renderBooks();
    renderLanguages();
    updateAlarmsButtonUI();
    safeCreateIcons();
}

function renderTimeline() {
    const slots = calculateTimeSlots();
    elements.timeline.innerHTML = '';

    slots.forEach(slot => {
        const row = document.createElement('div');
        row.className = 'time-row';

        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = slot.start;
        row.appendChild(label);

        const content = document.createElement('div');
        if (slot.type === 'free') {
            content.className = 'time-slot-content slot-free';
            content.innerHTML = `Livre (${formatMinutesDuration(slot.duration)}) <span class="slot-time-range">${slot.start} - ${slot.end}</span>`;
            content.addEventListener('click', () => {
                openBlockModal(null, slot.start, slot.end);
            });
        } else {
            content.className = `time-slot-content slot-occupied bg-${slot.color}`;
            
            let colorIcon = 'circle';
            if (slot.color === 'faculdade') colorIcon = 'graduation-cap';
            if (slot.color === 'trabalho') colorIcon = 'briefcase';
            if (slot.color === 'casa') colorIcon = 'home';
            if (slot.color === 'busy') colorIcon = 'slash';

            content.innerHTML = `
                <i data-lucide="${colorIcon}" style="width:14px; height:14px; margin-right:8px; display:inline-block; vertical-align:middle;"></i>
                <span style="font-weight:600;">${slot.title}</span>
                <span class="slot-time-range">${slot.start} - ${slot.end}</span>
            `;
            content.addEventListener('click', () => {
                openBlockModal(slot.id);
            });
        }
        row.appendChild(content);
        elements.timeline.appendChild(row);
    });
}

function renderTasks() {
    elements.tasksContainer.innerHTML = '';
    
    const DAY_LABELS = {
        seg: 'Segunda',
        ter: 'Terça',
        qua: 'Quarta',
        qui: 'Quinta',
        sex: 'Sexta',
        sab: 'Sábado',
        dom: 'Domingo'
    };
    
    const filteredTasks = state.tasks.filter(task => {
        const matchesCategory = (state.currentFilter === 'all' || task.category === state.currentFilter);
        
        let matchesDay = true;
        if (state.currentDayFilter === 'none') {
            matchesDay = (!task.day);
        } else if (state.currentDayFilter !== 'all') {
            matchesDay = (task.day === state.currentDayFilter);
        }
        
        return matchesCategory && matchesDay;
    });

    if (filteredTasks.length === 0) {
        elements.tasksContainer.innerHTML = `
            <div class="placeholder-msg">
                <i data-lucide="inbox"></i>
                Nenhuma tarefa encontrada neste filtro.
            </div>
        `;
        safeCreateIcons();
        return;
    }

    // Sort tasks: pending first, then completed. Inside that, priority high -> medium -> low.
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    filteredTasks.forEach(task => {
        const taskCard = document.createElement('div');
        const isExpanded = expandedTasks.has(task.id);
        taskCard.className = `task-item cat-${task.category} ${task.completed ? 'completed' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`;
        taskCard.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input')) {
                toggleTaskExpansion(task.id);
            }
        });
        
        // Priority tag name in Portuguese
        const priorityLabels = { low: 'Baixa', medium: 'Média', high: 'Alta' };
        
        const taskProgress = task.progress !== undefined ? task.progress : (task.completed ? 100 : 0);
        
        taskCard.innerHTML = `
            <div class="task-header" style="align-items: center;">
                <button class="btn-checkbox" onclick="toggleTaskCompletion('${task.id}', event)">
                    <i data-lucide="check" style="width:12px; height:12px;"></i>
                </button>
                <div class="task-info">
                    <span class="task-title" style="font-size: 0.92rem;">${task.title}</span>
                </div>
                <div class="task-actions" style="align-items: center;">
                    <button type="button" class="btn-card-toggle" onclick="toggleTaskExpansion('${task.id}', event)" title="${isExpanded ? 'Recolher' : 'Ver Detalhes'}">
                        <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width:14px; height:14px;"></i>
                    </button>
                    <button class="btn-task-action" onclick="openTaskModal('${task.id}', event)" title="Editar">
                        <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
                    </button>
                    <button class="btn-task-action delete" onclick="deleteTaskDirect('${task.id}', event)" title="Excluir">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                </div>
            </div>
            <div class="task-details-panel">
                ${task.desc ? `<p class="task-desc" style="margin-bottom: 8px;">${task.desc}</p>` : ''}
                <div class="task-progress-wrapper" style="margin-left: 0; margin-bottom: 10px;">
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${taskProgress}%"></div>
                    </div>
                    <span class="task-progress-text">${taskProgress}% concluído</span>
                </div>
                <div class="task-meta" style="margin-left: 0;">
                    <span class="meta-tag tag-duration">
                        <i data-lucide="hourglass"></i> ${formatMinutesDuration(task.duration)}
                    </span>
                    <span class="meta-tag tag-priority-${task.priority}">
                        Prioridade ${priorityLabels[task.priority]}
                    </span>
                    ${task.day ? `
                        <span class="meta-tag tag-day">
                            <i data-lucide="calendar-days"></i> ${DAY_LABELS[task.day]}
                        </span>
                    ` : ''}
                    ${task.deadline ? `
                        <span class="meta-tag tag-deadline">
                            <i data-lucide="clock"></i> Até ${formatDeadline(task.deadline, task.deadlineTime)}
                        </span>
                    ` : ''}
                    ${task.projectId ? `
                        <span class="meta-tag tag-project-name">
                            <i data-lucide="folder"></i> ${getProjectName(task.projectId)}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
        
        elements.tasksContainer.appendChild(taskCard);
    });
    
    safeCreateIcons();
}

function renderHeaderStats() {
    const slots = calculateTimeSlots();
    let occupiedMins = 0;
    
    slots.forEach(slot => {
        if (slot.type === 'occupied') {
            occupiedMins += slot.duration;
        }
    });

    const freeMins = 1440 - occupiedMins;
    
    document.querySelectorAll('.stats-committed-hours').forEach(el => {
        el.textContent = `${(occupiedMins / 60).toFixed(1)}h`;
    });
    document.querySelectorAll('.stats-free-hours').forEach(el => {
        el.textContent = `${(freeMins / 60).toFixed(1)}h`;
    });
    
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    document.querySelectorAll('.stats-tasks-completed').forEach(el => {
        el.textContent = `${completedTasks}/${totalTasks}`;
    });
}

function renderAssistantDropdown() {
    const selectedVal = elements.assistantTaskSelect.value;
    elements.assistantTaskSelect.innerHTML = '<option value="">Selecione uma tarefa pendente...</option>';
    
    const pendingTasks = state.tasks.filter(t => !t.completed && (!t.day || t.day === state.currentDay));
    
    pendingTasks.forEach(task => {
        const opt = document.createElement('option');
        opt.value = task.id;
        opt.textContent = `${task.title} (${formatMinutesDuration(task.duration)})`;
        elements.assistantTaskSelect.appendChild(opt);
    });

    // Restore selected value if still in list
    if (pendingTasks.some(t => t.id === selectedVal)) {
        elements.assistantTaskSelect.value = selectedVal;
    } else {
        elements.assistantTaskSelect.value = '';
        renderSmartSuggestions('');
    }
}

// PENDING TASKS PANEL (Agenda Tab)
let pendingPanelOpen = false;

function togglePendingTasksPanel() {
    pendingPanelOpen = !pendingPanelOpen;
    const list = elements.pendingTasksList;
    const chevron = elements.pendingChevron;
    if (pendingPanelOpen) {
        list.classList.add('open');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    } else {
        list.classList.remove('open');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
}

function renderPendingTasksPanel() {
    if (!elements.pendingTasksList || !elements.pendingTaskCount) return;

    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityLabels = { high: '🔴 Alta', medium: '🟡 Média', low: '🟢 Baixa' };
    const priorityClass = { high: 'high', medium: 'medium', low: 'low' };

    // Get all pending (not completed) tasks for the current day or unscheduled
    const pending = state.tasks
        .filter(t => !t.completed)
        .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    // Update badge count
    elements.pendingTaskCount.textContent = pending.length;
    elements.pendingTaskCount.style.display = pending.length > 0 ? 'inline-flex' : 'none';

    if (pending.length === 0) {
        elements.pendingTasksList.innerHTML = `
            <div class="pending-empty">
                <i data-lucide="check-circle-2"></i>
                Todas as tarefas concluídas!
            </div>
        `;
        safeCreateIcons();
        return;
    }

    // Get free slots for today to know which tasks can be scheduled
    const freeSlots = calculateTimeSlots().filter(s => s.type === 'free');
    const nextFreeSlot = freeSlots.find(s => s.duration > 0) || null;

    elements.pendingTasksList.innerHTML = '';

    pending.forEach(task => {
        const canFit = nextFreeSlot && nextFreeSlot.duration >= task.duration;
        const fitStart = canFit ? nextFreeSlot.start : null;
        const fitEnd = canFit ? minutesToTime(timeToMinutes(nextFreeSlot.start) + task.duration) : null;

        const row = document.createElement('div');
        row.className = `pending-task-row prio-${priorityClass[task.priority]}`;
        row.innerHTML = `
            <div class="pending-task-info">
                <span class="pending-task-title">${task.title}</span>
                <span class="pending-task-meta">
                    <span class="pending-prio-dot prio-dot-${priorityClass[task.priority]}"></span>
                    ${priorityLabels[task.priority]}
                    ${task.duration ? ` · ${formatMinutesDuration(task.duration)}` : ''}
                    ${task.day ? ` · ${task.day.charAt(0).toUpperCase() + task.day.slice(1)}` : ' · Não agendada'}
                </span>
            </div>
            <div class="pending-task-actions">
                ${canFit ? `
                    <button class="btn-encaixar" title="Encaixar às ${fitStart}" onclick="encaixarTarefaNaAgenda('${task.id}', '${fitStart}', '${fitEnd}')">
                        <i data-lucide="calendar-plus" style="width:13px;height:13px;"></i>
                        ${fitStart}
                    </button>
                ` : `
                    <button class="btn-encaixar btn-encaixar-manual" title="Abrir modal para agendar manualmente" onclick="encaixarTarefaManual('${task.id}')">
                        <i data-lucide="calendar-plus" style="width:13px;height:13px;"></i>
                        Manual
                    </button>
                `}
            </div>
        `;
        elements.pendingTasksList.appendChild(row);
    });

    safeCreateIcons();
}

function encaixarTarefaNaAgenda(taskId, startTime, endTime) {
    // Reuse the existing applySuggestion logic
    applySuggestion(taskId, startTime, endTime);
}

function encaixarTarefaManual(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    // Pre-fill modal with task name and let user pick times
    openBlockModal(null, null, null);
    // After modal opens, pre-fill the title field
    setTimeout(() => {
        const titleField = document.getElementById('block-title');
        if (titleField) titleField.value = task.title;
    }, 50);
}

// SMART SCHEDULING ALGORITHM
function renderSmartSuggestions(taskId) {
    elements.assistantSuggestions.innerHTML = '';
    
    if (!taskId) {
        elements.assistantSuggestions.innerHTML = `
            <div class="placeholder-msg">
                <i data-lucide="info"></i>
                Selecione uma tarefa acima para ver sugestões de encaixe.
            </div>
        `;
        safeCreateIcons();
        return;
    }

    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const slots = calculateTimeSlots();
    const freeSlots = slots.filter(s => s.type === 'free' && s.duration >= task.duration);

    if (freeSlots.length === 0) {
        elements.assistantSuggestions.innerHTML = `
            <div class="placeholder-msg" style="border-color: var(--danger); background: rgba(239,68,68,0.02); color: var(--danger);">
                <i data-lucide="alert-circle"></i>
                Nenhum horário livre contínuo suficiente para esta tarefa (${formatMinutesDuration(task.duration)}). Libere espaço na agenda!
            </div>
        `;
        safeCreateIcons();
        return;
    }

    freeSlots.forEach(slot => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';

        // Display suggestions with logical splits: e.g. at the start of the free block
        const suggestionStart = slot.start;
        const suggestionEnd = minutesToTime(timeToMinutes(slot.start) + task.duration);

        card.innerHTML = `
            <div class="suggestion-info">
                <span class="suggestion-time">${suggestionStart} às ${suggestionEnd}</span>
                <span class="suggestion-duration">Janela livre total de ${formatMinutesDuration(slot.duration)} (de ${slot.start} às ${slot.end})</span>
            </div>
            <button class="btn-apply-suggestion" onclick="applySuggestion('${task.id}', '${suggestionStart}', '${suggestionEnd}')">
                Encaixar
            </button>
        `;
        elements.assistantSuggestions.appendChild(card);
    });
    
    safeCreateIcons();
}

function applySuggestion(taskId, startTime, endTime) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Create a new block matching the task
    const newBlock = {
        id: 'b_' + Date.now(),
        title: `Tarefa: ${task.title}`,
        day: state.currentDay,
        start: startTime,
        end: endTime,
        color: task.category,
        updatedAt: Date.now()
    };

    state.blocks.push(newBlock);
    
    // Set task's day to currentDay since it is now scheduled on this day
    task.day = state.currentDay;
    
    // Complete or update task reference if needed
    // In this case, we keep it as pending but it is now scheduled
    task.scheduledTime = `${startTime}-${endTime}`;
    task.updatedAt = Date.now();
    
    saveData();
    renderAll();
    
    // Highlight suggestion was applied
    elements.assistantTaskSelect.value = '';
    renderSmartSuggestions('');
}

// CHARTS (Chart.js)
function renderCharts() {
    renderFinancialMetrics();
    
    if (typeof Chart === 'undefined') {
        const legendEl = document.getElementById('chart-legend');
        if (legendEl) {
            legendEl.innerHTML = '<div class="placeholder-msg">Métricas indisponíveis (sem internet)</div>';
        }
        const pLegendEl = document.getElementById('priority-chart-legend');
        if (pLegendEl) {
            pLegendEl.innerHTML = '<div class="placeholder-msg">Métricas indisponíveis (sem internet)</div>';
        }
        return;
    }
    
    const slots = calculateTimeSlots();
    const isDark = state.theme === 'dark';
    
    // Retrieve colors dynamically from computed CSS variables
    const rootStyles = window.getComputedStyle(document.documentElement);
    const getThemeColor = (varName) => rootStyles.getPropertyValue(varName).trim();
    
    const textColor = getThemeColor('--text-muted') || (isDark ? '#94a3b8' : '#64748b');
    const panelBgColor = getThemeColor('--panel-bg') || (isDark ? '#16110e' : '#ffffff');
    
    // --- 1. GRÁFICO DE ALOCAÇÃO DE TEMPO ---
    let stats = {
        faculdade: 0,
        trabalho: 0,
        casa: 0,
        busy: 0, // Outros compromissos / Sono
        free: 0
    };

    slots.forEach(slot => {
        if (slot.type === 'free') {
            stats.free += slot.duration;
        } else {
            stats[slot.color] = (stats[slot.color] || 0) + slot.duration;
        }
    });

    const dataValues = [
        (stats.faculdade / 60),
        (stats.trabalho / 60),
        (stats.casa / 60),
        (stats.busy / 60),
        (stats.free / 60)
    ];

    const chartColors = [
        getThemeColor('--color-faculdade') || '#a855f7',
        getThemeColor('--color-trabalho') || '#06b6d4',
        getThemeColor('--color-casa') || '#f59e0b',
        getThemeColor('--color-busy') || '#f43f5e',
        getThemeColor('--color-free') || '#10b981'
    ];

    // Render Legend Text
    const legendEl = document.getElementById('chart-legend');
    const labelsText = ['Faculdade', 'Trabalho', 'Casa', 'Comprometido', 'Livre'];
    
    legendEl.innerHTML = '';
    labelsText.forEach((label, idx) => {
        const hours = dataValues[idx];
        if (hours > 0) {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-label">
                    <span class="legend-color" style="background-color: ${chartColors[idx]}"></span>
                    ${label}
                </span>
                <span class="legend-value">${hours.toFixed(1)}h</span>
            `;
            legendEl.appendChild(item);
        }
    });

    if (timeChart) {
        timeChart.data.datasets[0].data = dataValues;
        timeChart.data.datasets[0].backgroundColor = chartColors;
        timeChart.data.datasets[0].borderColor = panelBgColor;
        timeChart.options.plugins.legend.labels.color = textColor;
        timeChart.update();
    } else {
        const ctx = document.getElementById('timeAllocationChart').getContext('2d');
        timeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labelsText,
                datasets: [{
                    data: dataValues,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    borderColor: panelBgColor,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // We use our own custom Legend DOM element
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'hsl(18, 20%, 9%)' : 'hsl(0, 0%, 100%)',
                        titleColor: isDark ? 'hsl(18, 25%, 92%)' : 'hsl(0, 10%, 15%)',
                        bodyColor: isDark ? 'hsl(18, 15%, 70%)' : 'hsl(0, 5%, 45%)',
                        borderColor: getThemeColor('--panel-border') || 'transparent',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw.toFixed(1)}h`;
                            }
                        }
                    }
                },
                cutout: '82%'
            }
        });
    }

    // --- 2. GRÁFICO DE PRIORIDADES DE TAREFAS ---
    let priorityStats = {
        high: 0,
        medium: 0,
        low: 0
    };

    state.tasks.forEach(task => {
        if (!task.completed) {
            priorityStats[task.priority] = (priorityStats[task.priority] || 0) + 1;
        }
    });

    const priorityValues = [
        priorityStats.high,
        priorityStats.medium,
        priorityStats.low
    ];

    const priorityChartColors = [
        getThemeColor('--danger') || '#ef4444', // Alta (Red)
        getThemeColor('--warning') || '#f59e0b', // Média (Amber)
        getThemeColor('--color-free') || '#10b981'  // Baixa (Emerald)
    ];

    const priorityLabels = ['Alta', 'Média', 'Baixa'];

    // Render Priority Legend
    const pLegendEl = document.getElementById('priority-chart-legend');
    if (pLegendEl) {
        pLegendEl.innerHTML = '';
        priorityLabels.forEach((label, idx) => {
            const count = priorityValues[idx];
            const color = priorityChartColors[idx];
            
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-label">
                    <span class="legend-color" style="background-color: ${color}"></span>
                    ${label}
                </span>
                <span class="legend-value">${count} ${count === 1 ? 'tarefa' : 'tarefas'}</span>
            `;
            pLegendEl.appendChild(item);
        });
    }

    if (priorityChart) {
        priorityChart.data.datasets[0].data = priorityValues;
        priorityChart.data.datasets[0].backgroundColor = priorityChartColors;
        priorityChart.data.datasets[0].borderColor = panelBgColor;
        priorityChart.options.plugins.legend.labels.color = textColor;
        priorityChart.update();
    } else {
        const pCtx = document.getElementById('taskPriorityChart').getContext('2d');
        priorityChart = new Chart(pCtx, {
            type: 'doughnut',
            data: {
                labels: priorityLabels,
                datasets: [{
                    data: priorityValues,
                    backgroundColor: priorityChartColors,
                    borderWidth: 0,
                    borderColor: panelBgColor,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'hsl(18, 20%, 9%)' : 'hsl(0, 0%, 100%)',
                        titleColor: isDark ? 'hsl(18, 25%, 92%)' : 'hsl(0, 10%, 15%)',
                        bodyColor: isDark ? 'hsl(18, 15%, 70%)' : 'hsl(0, 5%, 45%)',
                        borderColor: getThemeColor('--panel-border') || 'transparent',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw} ${context.raw === 1 ? 'tarefa' : 'tarefas'}`;
                            }
                        }
                    }
                },
                cutout: '82%'
            }
        });
    }
}

// Collapsible metric card logic
function toggleMetricCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    const isCollapsed = card.classList.toggle('collapsed');
    
    if (!isCollapsed) {
        setTimeout(() => {
            if (cardId === 'card-metric-time' && timeChart) {
                timeChart.resize();
                timeChart.update();
            } else if (cardId === 'card-metric-priority' && priorityChart) {
                priorityChart.resize();
                priorityChart.update();
            }
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 50);
    }
}

// Expanded chart modal logic
let expandedChartInstance = null;

function expandChart(sourceCanvasId, title) {
    const modal = document.getElementById('modal-expand-chart');
    if (!modal) return;
    
    document.getElementById('expanded-chart-title').textContent = title;
    
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
        expandedChartInstance = null;
    }
    
    const expandedCanvas = document.getElementById('expandedChartCanvas');
    const ctx = expandedCanvas.getContext('2d');
    ctx.clearRect(0, 0, expandedCanvas.width, expandedCanvas.height);
    
    let sourceChart = null;
    if (sourceCanvasId === 'timeAllocationChart') sourceChart = timeChart;
    else if (sourceCanvasId === 'taskPriorityChart') sourceChart = priorityChart;
    else if (sourceCanvasId === 'financeCategoryChart') sourceChart = financeCategoryChart;
    
    if (!sourceChart) return;
    
    const rootStyles = window.getComputedStyle(document.documentElement);
    const getThemeColor = (varName) => rootStyles.getPropertyValue(varName).trim();
    const textColor = getThemeColor('--text-muted') || (state.theme === 'dark' ? '#94a3b8' : '#64748b');
    const panelBgColor = getThemeColor('--panel-bg') || (state.theme === 'dark' ? '#16110e' : '#ffffff');
    const isDark = state.theme === 'dark';
    
    const config = {
        type: sourceChart.config.type,
        data: {
            labels: [...sourceChart.config.data.labels],
            datasets: sourceChart.config.data.datasets.map(ds => ({
                ...ds,
                backgroundColor: Array.isArray(ds.backgroundColor) ? [...ds.backgroundColor] : ds.backgroundColor,
                borderColor: panelBgColor,
                borderWidth: 0,
                hoverOffset: 8
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? 'hsl(18, 20%, 9%)' : 'hsl(0, 0%, 100%)',
                    titleColor: isDark ? 'hsl(18, 25%, 92%)' : 'hsl(0, 10%, 15%)',
                    bodyColor: isDark ? 'hsl(18, 15%, 70%)' : 'hsl(0, 5%, 45%)',
                    borderColor: getThemeColor('--panel-border') || 'transparent',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: sourceChart.config.options.plugins?.tooltip?.callbacks || {}
                }
            },
            cutout: sourceChart.config.options.cutout || '70%'
        }
    };
    
    const legendEl = document.getElementById('expanded-chart-legend');
    legendEl.innerHTML = '';
    
    const sourceLegendId = sourceCanvasId === 'timeAllocationChart' ? 'chart-legend' : 
                           (sourceCanvasId === 'taskPriorityChart' ? 'priority-chart-legend' : 'finance-category-legend');
    const sourceLegend = document.getElementById(sourceLegendId);
    if (sourceLegend) {
        legendEl.innerHTML = sourceLegend.innerHTML;
        legendEl.style.display = 'grid';
        legendEl.style.gridTemplateColumns = '1fr 1fr';
        legendEl.style.gap = '8px';
    }
    
    expandedChartInstance = new Chart(expandedCanvas, config);
    modal.classList.add('active');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeExpandedChartModal() {
    const modal = document.getElementById('modal-expand-chart');
    if (modal) modal.classList.remove('active');
    
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
        expandedChartInstance = null;
    }
}

// Financial Metrics Calculations & Rendering
function getCategoryColor(category) {
    const colors = {
        alimentacao: '#f43f5e',
        bem_duravel: '#ec4899',
        filhos: '#d946ef',
        ensino: '#a855f7',
        gasto_terceiro: '#8b5cf6',
        glp: '#6366f1',
        lazer: '#3b82f6',
        mercado: '#0ea5e9',
        obra: '#06b6d4',
        pet: '#14b8a6',
        roupa: '#10b981',
        saude: '#22c55e',
        servico: '#84cc16',
        taxa: '#eab308',
        transporte: '#f97316',
        outros: '#ef4444'
    };
    return colors[category] || '#94a3b8';
}

function getMonthlyFinancialSummary(monthStr) {
    const incomes = state.finances.incomes || [];
    const monthlyIncomes = incomes.filter(i => i.date.substring(0, 7) === monthStr);
    const totalIncome = monthlyIncomes.reduce((acc, i) => acc + i.amount, 0);
    
    const expenses = state.finances.expenses || [];
    const monthlyCash = expenses.filter(e => e.method === 'cash' && e.date.substring(0, 7) === monthStr);
    const totalCash = monthlyCash.reduce((acc, e) => acc + e.amount, 0);
    
    let totalCard = 0;
    const cards = state.finances.creditCards || [];
    cards.forEach(card => {
        const cardExpenses = getCardExpensesForInvoice(monthStr, card.id);
        totalCard += cardExpenses.reduce((acc, e) => acc + e.installmentAmount, 0);
    });
    
    const fixedList = state.finances.fixedExpenses || [];
    const totalFixed = fixedList.reduce((acc, f) => {
        const val = f.monthlyAmounts && f.monthlyAmounts[monthStr] !== undefined ? f.monthlyAmounts[monthStr] : f.amount;
        return acc + val;
    }, 0);
    
    const totalExpenses = totalCash + totalCard + totalFixed;
    const balance = totalIncome - totalExpenses;
    
    return {
        totalIncome,
        totalExpenses,
        balance
    };
}

function getAverageMonthlyExpenses() {
    const expenses = state.finances.expenses || [];
    const fixedExpenses = state.finances.fixedExpenses || [];
    const cards = state.finances.creditCards || [];
    
    const monthsSet = new Set();
    expenses.forEach(e => {
        if (e.date) monthsSet.add(e.date.substring(0, 7));
    });
    (state.finances.incomes || []).forEach(i => {
        if (i.date) monthsSet.add(i.date.substring(0, 7));
    });
    monthsSet.add(state.currentFinanceMonth);
    
    const monthsList = Array.from(monthsSet).sort();
    const numMonths = monthsList.length || 1;
    
    const categoryTotals = {};
    let totalAllMonths = 0;
    
    monthsList.forEach(monthStr => {
        // Cash expenses
        const monthlyCash = expenses.filter(e => e.method === 'cash' && e.date.substring(0, 7) === monthStr);
        monthlyCash.forEach(e => {
            const cat = e.category || 'outros';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
            totalAllMonths += e.amount;
        });
        
        // Card expenses
        cards.forEach(card => {
            const cardExpenses = getCardExpensesForInvoice(monthStr, card.id);
            cardExpenses.forEach(e => {
                const cat = e.category || 'outros';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + e.installmentAmount;
                totalAllMonths += e.installmentAmount;
            });
        });
        
        // Fixed expenses
        fixedExpenses.forEach(f => {
            const cat = f.category || 'outros';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + f.amount;
            totalAllMonths += f.amount;
        });
    });
    
    const categoryAverages = [];
    Object.entries(categoryTotals).forEach(([cat, total]) => {
        categoryAverages.push({
            category: cat,
            average: total / numMonths
        });
    });
    
    categoryAverages.sort((a, b) => b.average - a.average);
    
    return {
        generalAverage: totalAllMonths / numMonths,
        categoryAverages: categoryAverages
    };
}

function getPredictedCardExpenses(nextMonthStr) {
    const cards = state.finances.creditCards || [];
    const expenses = state.finances.expenses || [];
    const fixedExpenses = state.finances.fixedExpenses || [];
    
    const results = [];
    
    cards.forEach(card => {
        let cardTotal = 0;
        const items = [];
        
        // 1. Installments in nextMonthStr
        expenses.forEach(exp => {
            if (exp.method !== 'card' || exp.cardId !== card.id) return;
            
            const [expY, expM, expD] = exp.date.split('-').map(Number);
            let purchaseInvoiceMonth = expM;
            let purchaseInvoiceYear = expY;
            
            if (expD > card.closingDay) {
                purchaseInvoiceMonth += 1;
                if (purchaseInvoiceMonth > 12) {
                    purchaseInvoiceMonth = 1;
                    purchaseInvoiceYear += 1;
                }
            }
            
            const installmentsCount = exp.installments || 1;
            
            for (let i = 0; i < installmentsCount; i++) {
                let instMonth = purchaseInvoiceMonth + i;
                let instYear = purchaseInvoiceYear;
                
                while (instMonth > 12) {
                    instMonth -= 12;
                    instYear += 1;
                }
                
                const instMonthStr = `${instYear}-${instMonth.toString().padStart(2, '0')}`;
                
                if (instMonthStr === nextMonthStr) {
                    const amount = exp.amount / installmentsCount;
                    cardTotal += amount;
                    items.push({
                        desc: `${exp.desc || 'Compra'} (${i + 1}/${installmentsCount})`,
                        amount: amount,
                        category: exp.category
                    });
                }
            }
        });
        
        // 2. Fixed expenses on this card
        fixedExpenses.forEach(fixed => {
            if (fixed.method === 'card' && fixed.cardId === card.id) {
                cardTotal += fixed.amount;
                items.push({
                    desc: `${fixed.title} (Despesa Fixa)`,
                    amount: fixed.amount,
                    category: fixed.category
                });
            }
        });
        
        results.push({
            cardName: card.name,
            cardLimit: card.limit,
            total: cardTotal,
            items: items
        });
    });
    
    return results;
}

function renderFinancialMetrics() {
    const [year, month] = state.currentFinanceMonth.split('-').map(Number);
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
    }
    const nextMonthStr = `${nextYear}-${nextMonth.toString().padStart(2, '0')}`;
    const nextMonthLabel = getFinanceMonthLabel(nextMonthStr);
    
    // 1. Predicted Credit Card Expenses
    const cardForecastContainer = document.getElementById('financial-card-forecast-container');
    if (cardForecastContainer) {
        const forecasts = getPredictedCardExpenses(nextMonthStr);
        if (forecasts.length === 0 || forecasts.every(f => f.total === 0)) {
            cardForecastContainer.innerHTML = `<div class="placeholder-msg">Nenhum gasto previsto no cartão para ${nextMonthLabel}.</div>`;
        } else {
            let html = '';
            forecasts.forEach(card => {
                const pct = card.cardLimit > 0 ? ((card.total / card.cardLimit) * 100).toFixed(0) : 0;
                html += `
                    <div style="margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; width: 100%;">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.85rem; margin-bottom: 4px;">
                            <span style="color: var(--text-main);">${card.cardName}</span>
                            <span style="color: var(--accent);">R$ ${card.total.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 8px;">
                            Limite: R$ ${card.cardLimit.toFixed(2).replace('.', ',')} (${pct}% do limite)
                        </div>
                        <table class="finance-table" style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.75rem; color:var(--text-muted);">
                                    <th style="padding: 6px; text-align:left; text-transform:none; font-weight:600;">Descrição</th>
                                    <th style="padding: 6px; text-align:right; text-transform:none; font-weight:600; width:90px;">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${card.items.map(item => `
                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                                        <td style="padding: 6px; font-size:0.75rem; color: var(--text-main);">${item.desc}</td>
                                        <td style="padding: 6px; text-align:right; font-size:0.75rem; color: var(--text-main); font-weight:600;">R$ ${item.amount.toFixed(2).replace('.', ',')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });
            cardForecastContainer.innerHTML = html;
        }
    }
    
    // 2. Average Monthly Expenses
    const averagesContainer = document.getElementById('financial-averages-container');
    if (averagesContainer) {
        const averages = getAverageMonthlyExpenses();
        const categoriesLabels = {
            alimentacao: 'Alimentação', bem_duravel: 'Bem durável', filhos: 'Filhos',
            ensino: 'Ensino', gasto_terceiro: 'Gasto de Terceiro', glp: 'GLP',
            lazer: 'Lazer', mercado: 'Mercado', obra: 'Obra', pet: 'Pet',
            roupa: 'Roupa', saude: 'Saúde', servico: 'Serviço', taxa: 'Taxa',
            transporte: 'Transporte', outros: 'Outros'
        };
        
        if (averages.generalAverage === 0) {
            averagesContainer.innerHTML = `<div class="placeholder-msg">Nenhuma despesa registrada para calcular médias.</div>`;
        } else {
            let html = `
                <div style="margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px dashed rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span style="font-weight:700; font-size:0.8rem; color: var(--text-main);">Média Geral Mensal:</span>
                    <span style="color: var(--danger); font-weight:800; font-size:0.95rem;">R$ ${averages.generalAverage.toFixed(2).replace('.', ',')}</span>
                </div>
                <table class="finance-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.75rem; color:var(--text-muted);">
                            <th style="padding: 8px 6px; text-align:left; text-transform:none; font-weight:600;">Categoria</th>
                            <th style="padding: 8px 6px; text-align:right; text-transform:none; font-weight:600; width:100px;">Média Mensal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${averages.categoryAverages.map(catAvg => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                                <td style="padding: 8px 6px; font-size:0.75rem; color: var(--text-main); display:flex; align-items:center; gap:8px;">
                                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${getCategoryColor(catAvg.category)};"></span>
                                    ${categoriesLabels[catAvg.category] || catAvg.category}
                                </td>
                                <td style="padding: 8px 6px; text-align:right; font-size:0.75rem; color: var(--text-main); font-weight:600;">R$ ${catAvg.average.toFixed(2).replace('.', ',')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            averagesContainer.innerHTML = html;
        }
    }
    
    // 3. Total Expenses vs. Total Incomes (History)
    const historyContainer = document.getElementById('financial-history-container');
    if (historyContainer) {
        const expenses = state.finances.expenses || [];
        const monthsSet = new Set();
        expenses.forEach(e => {
            if (e.date) monthsSet.add(e.date.substring(0, 7));
        });
        (state.finances.incomes || []).forEach(i => {
            if (i.date) monthsSet.add(i.date.substring(0, 7));
        });
        monthsSet.add(state.currentFinanceMonth);
        
        const monthsList = Array.from(monthsSet).sort().reverse().slice(0, 6);
        
        const historyData = monthsList.map(mStr => {
            const summary = getMonthlyFinancialSummary(mStr);
            return {
                month: mStr,
                label: getFinanceMonthLabel(mStr),
                income: summary.totalIncome,
                expense: summary.totalExpenses,
                balance: summary.balance
            };
        });
        
        if (historyData.length === 0 || historyData.every(h => h.income === 0 && h.expense === 0)) {
            historyContainer.innerHTML = `<div class="placeholder-msg">Nenhum histórico financeiro disponível.</div>`;
        } else {
            let html = `
                <table class="finance-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.75rem; color:var(--text-muted);">
                            <th style="padding: 8px 6px; text-align:left; text-transform:none; font-weight:600;">Mês</th>
                            <th style="padding: 8px 6px; text-align:right; text-transform:none; font-weight:600; color:var(--success);">Receitas</th>
                            <th style="padding: 8px 6px; text-align:right; text-transform:none; font-weight:600; color:var(--warning);">Gastos</th>
                            <th style="padding: 8px 6px; text-align:right; text-transform:none; font-weight:600;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyData.map(h => {
                            const balanceColor = h.balance >= 0 ? 'var(--success)' : 'var(--danger)';
                            return `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                                    <td style="padding: 8px 6px; font-size:0.75rem; color: var(--text-main); font-weight:700;">${h.label}</td>
                                    <td style="padding: 8px 6px; text-align:right; font-size:0.75rem; color: var(--success); font-weight:600;">R$ ${h.income.toFixed(2).replace('.', ',')}</td>
                                    <td style="padding: 8px 6px; text-align:right; font-size:0.75rem; color: var(--warning); font-weight:600;">R$ ${h.expense.toFixed(2).replace('.', ',')}</td>
                                    <td style="padding: 8px 6px; text-align:right; font-size:0.75rem; color: ${balanceColor}; font-weight:700;">R$ ${h.balance.toFixed(2).replace('.', ',')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            historyContainer.innerHTML = html;
        }
    }
}

// Expose functions globally
window.toggleMetricCard = toggleMetricCard;
window.expandChart = expandChart;
window.closeExpandedChartModal = closeExpandedChartModal;
window.renderFinancialMetrics = renderFinancialMetrics;

function updateChartTheme() {
    if (typeof Chart !== 'undefined') {
        const isDark = state.theme === 'dark';
        const rootStyles = window.getComputedStyle(document.documentElement);
        const getThemeColor = (varName) => rootStyles.getPropertyValue(varName).trim();
        const panelBgColor = getThemeColor('--panel-bg') || (isDark ? '#16110e' : '#ffffff');
        
        if (timeChart) {
            timeChart.data.datasets[0].borderColor = panelBgColor;
            timeChart.data.datasets[0].borderWidth = 0;
            timeChart.update();
        }
        if (priorityChart) {
            priorityChart.data.datasets[0].borderColor = panelBgColor;
            priorityChart.data.datasets[0].borderWidth = 0;
            priorityChart.update();
        }
        if (financeCategoryChart) {
            financeCategoryChart.data.datasets[0].borderColor = panelBgColor;
            financeCategoryChart.data.datasets[0].borderWidth = 0;
            financeCategoryChart.update();
        }
        renderCharts();
    }
}

// DATE HELPER
function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year.substring(2)}`;
}

function formatDeadline(deadline, deadlineTime) {
    if (!deadline) return '';
    const datePart = formatDate(deadline);
    return deadlineTime ? `${datePart} às ${deadlineTime}` : datePart;
}

// MODAL HANDLERS
function closeModal() {
    elements.modalBlock.classList.remove('active');
    elements.modalTask.classList.remove('active');
}

// Block Modal Functions
function openBlockModal(id = null, defaultStart = '', defaultEnd = '') {
    elements.blockForm.reset();
    elements.blockId.value = '';
    elements.btnDeleteBlock.classList.add('hidden');
    elements.blockModalTitle.textContent = 'Bloquear Horário Ocupado';

    if (id) {
        const block = state.blocks.find(b => b.id === id);
        if (block) {
            elements.blockId.value = block.id;
            elements.blockTitle.value = block.title;
            
            const targetDay = block.day || state.currentDay;
            elements.blockDays.forEach(cb => {
                cb.checked = (cb.value === targetDay);
                if (cb.checked) cb.parentElement.classList.add('checked');
                else cb.parentElement.classList.remove('checked');
            });
            
            elements.blockStart.value = block.start;
            elements.blockEnd.value = block.end;
            elements.btnDeleteBlock.classList.remove('hidden');
            elements.blockModalTitle.textContent = 'Editar Horário Ocupado';
            
            // Check correct radio option
            const radio = elements.blockForm.querySelector(`input[name="block-color"][value="${block.color}"]`);
            if (radio) radio.checked = true;
        }
    } else {
        elements.blockDays.forEach(cb => {
            cb.checked = (cb.value === state.currentDay);
            if (cb.checked) cb.parentElement.classList.add('checked');
            else cb.parentElement.classList.remove('checked');
        });
        
        if (defaultStart) {
            elements.blockStart.value = defaultStart;
        } else {
            const now = new Date();
            const hour = now.getHours();
            elements.blockStart.value = `${hour.toString().padStart(2, '0')}:00`;
        }
        
        if (defaultEnd) {
            elements.blockEnd.value = defaultEnd === '24:00' ? '23:59' : defaultEnd;
        } else {
            const now = new Date();
            const hour = (now.getHours() + 1) % 24;
            elements.blockEnd.value = `${hour.toString().padStart(2, '0')}:00`;
        }
    }

    elements.modalBlock.classList.add('active');
    elements.blockTitle.focus();
}

function saveBlock() {
    const id = elements.blockId.value;
    const title = elements.blockTitle.value.trim();
    const start = elements.blockStart.value;
    const end = elements.blockEnd.value;
    
    // Get checked days
    const selectedDays = Array.from(elements.blockDays)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    const colorEl = elements.blockForm.querySelector('input[name="block-color"]:checked');
    const color = colorEl ? colorEl.value : 'busy';

    if (!title) {
        alert('Por favor, insira um título para o compromisso.');
        return;
    }

    if (!start || !end) {
        alert('Por favor, informe a hora de início e de término.');
        return;
    }

    if (timeToMinutes(start) >= timeToMinutes(end)) {
        alert('A hora de término deve ser após a hora de início.');
        return;
    }
    
    if (selectedDays.length === 0) {
        alert('Por favor, selecione pelo menos um dia da semana.');
        return;
    }

    if (id) {
        // Edit existing
        const index = state.blocks.findIndex(b => b.id === id);
        if (index !== -1) {
            // Update the existing block with the first selected day
            state.blocks[index] = { id, title, day: selectedDays[0], start, end, color, updatedAt: Date.now() };
        }
        // If more days are selected, create new blocks for those days
        for (let i = 1; i < selectedDays.length; i++) {
            const newBlock = {
                id: 'b_' + Date.now() + '_' + i,
                title,
                day: selectedDays[i],
                start,
                end,
                color,
                updatedAt: Date.now()
            };
            state.blocks.push(newBlock);
        }
    } else {
        // Create new block(s) for each selected day
        selectedDays.forEach((day, i) => {
            const newBlock = {
                id: 'b_' + Date.now() + '_' + i,
                title,
                day,
                start,
                end,
                color,
                updatedAt: Date.now()
            };
            state.blocks.push(newBlock);
        });
    }

    saveData();
    closeModal();
    renderAll();
}

function deleteBlock() {
    const id = elements.blockId.value;
    if (id) {
        state.blocks = state.blocks.filter(b => b.id !== id);
        saveData();
        closeModal();
        renderAll();
    }
}

// Task Modal Functions
function openTaskModal(id = null, event = null) {
    if (event) event.stopPropagation();
    
    // Atualizar dropdown de projetos no modal de tarefas
    const projectSelect = document.getElementById('task-project-id');
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">Nenhum projeto vinculado</option>';
        (state.projects || []).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            projectSelect.appendChild(opt);
        });
    }

    elements.taskForm.reset();
    elements.taskId.value = '';
    elements.btnDeleteTask.classList.add('hidden');
    elements.taskModalTitle.textContent = 'Nova Tarefa';

    if (id) {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            elements.taskId.value = task.id;
            elements.taskTitle.value = task.title;
            elements.taskDesc.value = task.desc;
            elements.taskCategory.value = task.category;
            elements.taskPriority.value = task.priority;
            elements.taskDuration.value = task.duration.toString();
            elements.taskDeadline.value = task.deadline || '';
            elements.taskDeadlineTime.value = task.deadlineTime || '';
            elements.taskDay.value = task.day || '';
            
            if (projectSelect) {
                projectSelect.value = task.projectId || '';
            }
            
            const progress = task.progress !== undefined ? task.progress : (task.completed ? 100 : 0);
            document.getElementById('task-progress').value = progress;
            document.getElementById('task-progress-val').textContent = progress + '%';
            
            elements.btnDeleteTask.classList.remove('hidden');
            elements.taskModalTitle.textContent = 'Editar Tarefa';
        }
    } else {
        const defaultDay = (state.currentDayFilter !== 'all' && state.currentDayFilter !== 'none') ? state.currentDayFilter : '';
        elements.taskDay.value = defaultDay;
        
        document.getElementById('task-progress').value = 0;
        document.getElementById('task-progress-val').textContent = '0%';
        
        if (projectSelect) {
            projectSelect.value = '';
        }
        
        // Pré-preenche a data limite com o dia atual (fuso local do celular)
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        elements.taskDeadline.value = `${yyyy}-${mm}-${dd}`;
    }

    elements.modalTask.classList.add('active');
    elements.taskTitle.focus();
}

function saveTask() {
    const id = elements.taskId.value;
    const title = elements.taskTitle.value.trim();
    const desc = elements.taskDesc.value.trim();
    const category = elements.taskCategory.value;
    const priority = elements.taskPriority.value;
    const duration = parseInt(elements.taskDuration.value);
    const deadline = elements.taskDeadline.value;
    const deadlineTime = elements.taskDeadlineTime.value;
    const day = elements.taskDay.value;
    const projectId = document.getElementById('task-project-id') ? document.getElementById('task-project-id').value : null;

    if (!title) {
        alert('Por favor, informe o título da tarefa.');
        return;
    }

    if (!deadline) {
        alert('Por favor, informe a data limite da tarefa.');
        return;
    }

    if (isNaN(duration) || duration <= 0) {
        alert('Duração estimada inválida.');
        return;
    }

    const progress = parseInt(document.getElementById('task-progress').value) || 0;
    const completed = progress === 100;

    if (id) {
        // Edit existing
        const index = state.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            state.tasks[index] = { 
                ...state.tasks[index], 
                title, desc, category, priority, duration, deadline, deadlineTime, day, progress, completed,
                projectId: projectId || null,
                updatedAt: Date.now()
            };
        }
    } else {
        // Create new
        const newTask = {
            id: 't_' + Date.now(),
            title,
            desc,
            category,
            priority,
            duration,
            deadline,
            deadlineTime,
            day,
            progress,
            completed,
            scheduledTime: null,
            projectId: projectId || null,
            updatedAt: Date.now()
        };
        state.tasks.push(newTask);
    }

    saveData();
    closeModal();
    renderAll();
}

function deleteTask() {
    const id = elements.taskId.value;
    if (id) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
        closeModal();
        renderAll();
    }
}

// Global actions exposed to HTML triggers
window.toggleTaskCompletion = function(id, event) {
    if (event) event.stopPropagation();
    
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.progress = task.completed ? 100 : 0;
        task.updatedAt = Date.now();
        saveData();
        renderAll();
    }
};

window.deleteTaskDirect = function(id, event) {
    if (event) event.stopPropagation();
    
    if (confirm('Deseja realmente excluir esta tarefa?')) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
        renderAll();
    }
};

window.openTaskModal = openTaskModal;
window.openBlockModal = openBlockModal;
window.applySuggestion = applySuggestion;

window.toggleDrawer = function(show) {
    const drawer = document.getElementById('app-drawer');
    if (!drawer) return;
    if (show) {
        drawer.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        drawer.classList.remove('active');
        document.body.style.overflow = '';
    }
};

window.selectDrawerTab = function(tabId) {
    toggleDrawer(false);
    switchMainTab(tabId);
};

window.switchMainTab = function(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tab links
    document.querySelectorAll('.app-tab-link').forEach(link => {
        link.classList.remove('active');
    });

    // Deactivate all drawer links
    document.querySelectorAll('.drawer-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Deactivate all bottom nav links (mobile)
    document.querySelectorAll('.bottom-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Activate target tab content
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Activate target link
    const targetLink = document.querySelector(`.app-tab-link[onclick*="${tabId}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }

    // Activate target drawer link
    const targetDrawerLink = document.querySelector(`.drawer-link[onclick*="${tabId}"]`);
    if (targetDrawerLink) {
        targetDrawerLink.classList.add('active');
    }
    
    // Activate target bottom nav link (mobile)
    const targetBottomLink = document.querySelector(`.bottom-nav-link[onclick*="${tabId}"]`);
    if (targetBottomLink) {
        targetBottomLink.classList.add('active');
    }
    
    // Scroll page to top on mobile for transition smoothness
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Recalcula exibição do mini-timer do cabeçalho
    updateTimerDisplay();

    // Special trigger: re-render charts when switching to metrics tab
    if (tabId === 'tab-metrics') {
        renderCharts();
    }
    if (tabId === 'tab-timeflies') {
        switchTimeFliesSubTab('agenda');
    }
};

// ============================================================
// EXPORTAÇÃO PARA WHATSAPP
// ============================================================
function exportToWhatsApp() {
    const DAY_NAMES = {
        seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira',
        qui: 'Quinta-feira', sex: 'Sexta-feira', sab: 'Sábado', dom: 'Domingo'
    };
    const dayLabel = DAY_NAMES[state.currentDay] || state.currentDay;
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // --- Blocos de agenda do dia atual ---
    const dayBlocks = state.blocks
        .filter(b => b.day === state.currentDay)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    let blocksText = '';
    if (dayBlocks.length > 0) {
        blocksText = dayBlocks.map(b => `  • *${b.start} às ${b.end}*: ${b.title}`).join('\n');
    } else {
        blocksText = '  _Nenhum compromisso agendado._';
    }

    // --- Tarefas pendentes ---
    const pendingTasks = state.tasks
        .filter(t => !t.completed)
        .sort((a, b) => {
            const pw = { high: 3, medium: 2, low: 1 };
            return pw[b.priority] - pw[a.priority];
        });

    const priorityLabels = { high: '🔴 Alta', medium: '🟡 Média', low: '🟢 Baixa' };

    let pendingText = '';
    if (pendingTasks.length > 0) {
        pendingText = pendingTasks.map(t => {
            const prio = priorityLabels[t.priority] || '';
            const dl = t.deadline ? ` _(Prazo: ${formatDeadline(t.deadline, t.deadlineTime)})_` : '';
            return `  ☐ *${t.title}* [${prio}]${dl}`;
        }).join('\n');
    } else {
        pendingText = '  _Nenhuma tarefa pendente. Excelente! 🎉_';
    }

    // --- Tarefas concluídas ---
    const doneTasks = state.tasks.filter(t => t.completed);
    let doneText = '';
    if (doneTasks.length > 0) {
        doneText = doneTasks.map(t => `  ✅ ~${t.title}~`).join('\n');
    } else {
        doneText = '  _Nenhuma atividade concluída hoje ainda._';
    }

    // --- Montar mensagem final com design premium de WhatsApp ---
    const msg =
`📅 *Planejamento Diário — TimeFlies*
🏆 _${dayLabel}, ${dateStr}_

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
⏰ *COMPROMISSOS DO DIA*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
${blocksText}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
📝 *TAREFAS PENDENTES*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
${pendingText}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
✅ *CONCLUÍDO HOJE*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
${doneText}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
_Foque no que importa. O tempo voa! ⏱️_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function exportProjectToWhatsApp(projectId) {
    const p = state.projects.find(proj => proj.id === projectId);
    if (!p) return;
    
    const typeLabels = {
        disciplina: '📚 Disciplina',
        tcc: '🎓 TCC / Monografia',
        curso: '💻 Curso Extra',
        projeto: '🚀 Projeto Geral'
    };
    
    const statusLabels = {
        andamento: '⚡ Em Andamento',
        planejado: '📋 Planejado',
        concluido: '✅ Concluído'
    };
    
    // Encontrar tarefas vinculadas a este projeto
    const projTasks = state.tasks.filter(t => t.projectId === p.id);
    const totalTasks = projTasks.length;
    const completedTasks = projTasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Minutos de estudos acumulados das tarefas concluídas
    const studyMins = projTasks.filter(t => t.completed).reduce((acc, t) => acc + t.duration, 0);
    const studyHrs = (studyMins / 60).toFixed(1);
    
    // Separar tarefas do projeto
    const pendingTasks = projTasks.filter(t => !t.completed);
    const doneTasks = projTasks.filter(t => t.completed);
    
    let pendingText = '';
    if (pendingTasks.length > 0) {
        pendingText = pendingTasks.map(t => {
            const pw = { high: '🔴', medium: '🟡', low: '🟢' };
            const priorityBadge = pw[t.priority] || '';
            const dl = t.deadline ? ` _(Prazo: ${formatDeadline(t.deadline, t.deadlineTime)})_` : '';
            return `  ☐ *${t.title}* ${priorityBadge}${dl}`;
        }).join('\n');
    } else {
        pendingText = '  _Nenhuma tarefa pendente neste projeto!_';
    }
    
    let doneText = '';
    if (doneTasks.length > 0) {
        doneText = doneTasks.map(t => `  ✅ ~${t.title}~`).join('\n');
    } else {
        doneText = '  _Nenhuma tarefa concluída neste projeto ainda._';
    }
    
    const gradeText = (p.grade !== null && p.grade !== undefined && p.grade !== '') ? `\n🎓 *Nota Final:* ${parseFloat(p.grade).toFixed(1)}` : '';
    const professorText = p.professor ? `\n👨‍🏫 *Professor/Responsável:* ${p.professor}` : '';
    const descText = p.desc ? `\n\n📖 *Descrição:* _${p.desc}_` : '';
    
    const msg =
`📂 *TimeFlies — Resumo de Projeto*
🎯 *${p.name}*

━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ *INFORMAÇÕES GERAIS*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Tipo:* ${typeLabels[p.type] || p.type}
📈 *Status:* ${statusLabels[p.status] || p.status}
📈 *Progresso:* ${completedTasks}/${totalTasks} tarefas (${progress}% Concluído)
⏱️ *Tempo Estudado:* ${studyHrs}h (Meta Semanal: ${p.studyGoal || 0}h)${gradeText}${professorText}${descText}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *TAREFAS PENDENTES*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${pendingText}

━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *TAREFAS CONCLUÍDAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${doneText}

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Gerado via TimeFlies — Foco e Produtividade_ ⏱️`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function exportAgendaToWhatsApp() {
    const DAY_NAMES = {
        seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira',
        qui: 'Quinta-feira', sex: 'Sexta-feira', sab: 'Sábado', dom: 'Domingo'
    };
    const dayLabel = DAY_NAMES[state.currentDay] || state.currentDay;
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // --- Blocos de agenda do dia atual ---
    const dayBlocks = state.blocks
        .filter(b => b.day === state.currentDay)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    let blocksText = '';
    if (dayBlocks.length > 0) {
        blocksText = dayBlocks.map(b => `  • *${b.start} às ${b.end}*: ${b.title}`).join('\n');
    } else {
        blocksText = '  _Nenhuma atividade ou compromisso agendado para hoje._';
    }

    // --- Montar mensagem final de cronograma ---
    const msg =
`📅 *Cronograma de Atividades — TimeFlies*
🏆 _${dayLabel}, ${dateStr}_

━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ *CRONOGRAMA PLANEJADO*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${blocksText}

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Gerado via TimeFlies — O Tempo Voa!_ ⏱️`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function exportAllProjectsToWhatsApp() {
    if (state.projects.length === 0) {
        alert("Você não possui projetos ou disciplinas cadastrados.");
        return;
    }
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const typeLabels = {
        disciplina: '📚 Disciplina',
        tcc: '🎓 TCC / Monografia',
        curso: '💻 Curso Extra',
        projeto: '🚀 Projeto Geral'
    };

    const statusLabels = {
        andamento: '⚡ Em Andamento',
        planejado: '📋 Planejado',
        concluido: '✅ Concluído'
    };

    const projectReports = state.projects.map(p => {
        // Encontrar tarefas vinculadas
        const projTasks = state.tasks.filter(t => t.projectId === p.id);
        const total = projTasks.length;
        const completed = projTasks.filter(t => t.completed).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const studyMins = projTasks.filter(t => t.completed).reduce((acc, t) => acc + t.duration, 0);
        const studyHrs = (studyMins / 60).toFixed(1);
        
        const typeLabel = typeLabels[p.type] || p.type;
        const statusLabel = statusLabels[p.status] || p.status;
        
        const gradeText = (p.grade !== null && p.grade !== undefined && p.grade !== '') ? ` | Nota: ${parseFloat(p.grade).toFixed(1)}` : '';
        
        return `*${p.name}* (${typeLabel})
  • Status: ${statusLabel}
  • Progresso: ${completed}/${total} tarefas (${progress}% Concluído)
  • Horas estudadas: ${studyHrs}h (Meta: ${p.studyGoal || 0}h)${gradeText}`;
    }).join('\n\n');

    const msg =
`📂 *TimeFlies — Relatório Geral de Projetos & Disciplinas*
📅 _Atualizado em ${dateStr}_

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *DISCIPLINAS E PROJETOS CADASTRADOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${projectReports}

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Gerado via TimeFlies — Gestão e Foco_ ⏱️`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// ============================================================
// SISTEMA DE ALARMES & SINTETIZADOR DE ÁUDIO (WEB AUDIO API)
// ============================================================
let audioCtx = null;
let alarmIntervalId = null;

function startAlarmAudio() {
    if (alarmIntervalId) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        // Loop sonoro repetitivo (bipe de alarme)
        alarmIntervalId = setInterval(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (tom de bip claro)
            
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }, 800);
    } catch (e) {
        console.error("Erro ao inicializar AudioContext:", e);
    }
}

function stopAlarmAudio() {
    if (alarmIntervalId) {
        clearInterval(alarmIntervalId);
        alarmIntervalId = null;
    }
}

// --- Sincronização Automática com o Dia Real do Celular ---
function syncCurrentDayWithSystem() {
    const now = new Date();
    const currentDateString = now.toDateString();
    
    // Inicializa se não existir
    if (!state.lastSystemDateString) {
        state.lastSystemDateString = currentDateString;
    }
    
    // Se a data real do sistema mudou (meia-noite passou)
    if (state.lastSystemDateString !== currentDateString) {
        state.lastSystemDateString = currentDateString;
        const systemDay = DAY_KEYS[now.getDay()];
        state.currentDay = systemDay;
        // Limpar bipes já tocados no dia anterior para permitir os novos de hoje
        notifiedBlocksToday = [];
        // Re-renderizar o aplicativo inteiro com a nova data atual
        renderAll();
        saveData();
    }
}

// --- Monitoramento Contínuo de Alarmes da Agenda ---
function checkAgendaAlarms() {
    // Sincroniza o dia atual do celular antes de checar os alarmes
    syncCurrentDayWithSystem();

    if (!state.alarmsActive) return;

    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${hh}:${mm}`;

    // Filtrar blocos de hoje
    const dayBlocks = state.blocks.filter(b => b.day === state.currentDay);

    dayBlocks.forEach(block => {
        if (block.start === currentTimeStr && !notifiedBlocksToday.includes(block.id)) {
            notifiedBlocksToday.push(block.id);
            triggerAlarm(
                "Compromisso Iniciando!", 
                `O compromisso "${block.title}" está agendado para começar agora (${block.start}).`, 
                false
            );
        }
    });
}

function triggerAlarm(title, message, isTimer = false) {
    if (elements.modalAlarmAlert) {
        elements.alarmTitleText.textContent = title;
        elements.alarmMessage.textContent = message;
        
        if (isTimer) {
            elements.alarmTimerStatus.classList.remove('hidden');
            elements.btnAlarmCompleteTask.classList.remove('hidden');
        } else {
            elements.alarmTimerStatus.classList.add('hidden');
            elements.btnAlarmCompleteTask.classList.add('hidden');
        }

        elements.modalAlarmAlert.classList.add('active');
    }

    // Tocar sinal sonoro
    startAlarmAudio();

    // Notificação Nativa do Sistema
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: message,
                icon: 'icon-192.png'
            });
        } catch (e) {
            console.warn("Erro ao emitir notificação nativa:", e);
        }
    }
}

function dismissAlarm() {
    if (elements.modalAlarmAlert) {
        elements.modalAlarmAlert.classList.remove('active');
    }
    stopAlarmAudio();
}

function updateAlarmsButtonUI() {
    if (elements.btnToggleAlarms) {
        if (state.alarmsActive) {
            elements.btnToggleAlarms.classList.remove('muted');
            elements.btnToggleAlarms.title = "Silenciar Alarmes de Agenda (Ativo)";
        } else {
            elements.btnToggleAlarms.classList.add('muted');
            elements.btnToggleAlarms.title = "Ativar Alarmes de Agenda (Silenciado)";
        }
    }
}

// ============================================================
// TIMER DE EXECUÇÃO
// ============================================================
let timerIntervalId = null;
let timerSecondsRemaining = 1500; // 25 minutos padrão
let timerTotalSeconds = 1500;
let timerTaskId = null;
let timerStatus = 'idle'; // 'idle', 'running', 'paused'

function renderTimerTaskDropdown() {
    if (!elements.timerTaskSelect) return;
    const selectedVal = elements.timerTaskSelect.value;
    elements.timerTaskSelect.innerHTML = '<option value="">Selecione uma tarefa para executar...</option>';

    const pendingTasks = state.tasks.filter(t => !t.completed);
    pendingTasks.forEach(task => {
        const opt = document.createElement('option');
        opt.value = task.id;
        opt.textContent = `${task.title} (${formatMinutesDuration(task.duration)})`;
        elements.timerTaskSelect.appendChild(opt);
    });

    if (pendingTasks.some(t => t.id === selectedVal)) {
        elements.timerTaskSelect.value = selectedVal;
    } else {
        elements.timerTaskSelect.value = '';
        if (timerStatus === 'idle') {
            timerTaskId = null;
        }
    }
}

function onTimerTaskSelect(taskId) {
    if (timerStatus === 'running') {
        if (!confirm("O timer está em execução. Deseja cancelar o timer atual para iniciar a nova tarefa?")) {
            elements.timerTaskSelect.value = timerTaskId || '';
            return;
        }
        resetTimer();
    }

    timerTaskId = taskId || null;

    if (timerTaskId) {
        const task = state.tasks.find(t => t.id === timerTaskId);
        if (task) {
            timerSecondsRemaining = task.duration * 60;
            timerTotalSeconds = timerSecondsRemaining;
        }
    } else {
        timerSecondsRemaining = 1500; // 25 min default
        timerTotalSeconds = 1500;
    }

    updateTimerDisplay();
}

function updateTimerDisplay() {
    if (!elements.timerDisplay) return;

    const mins = Math.floor(timerSecondsRemaining / 60).toString().padStart(2, '0');
    const secs = (timerSecondsRemaining % 60).toString().padStart(2, '0');
    const clockText = `${mins}:${secs}`;
    elements.timerDisplay.textContent = clockText;

    // Atualiza o mini-timer digital no cabeçalho
    const miniClock = document.getElementById('mini-timer-clock');
    if (miniClock) {
        miniClock.textContent = clockText;
    }

    // Atualiza barra de progresso
    if (elements.timerProgressFill && timerTotalSeconds > 0) {
        const pct = (timerSecondsRemaining / timerTotalSeconds) * 100;
        elements.timerProgressFill.style.width = `${pct}%`;
    }

    // Label do status
    if (elements.timerRunningLabel) {
        if (timerStatus === 'running') {
            elements.timerRunningLabel.textContent = "Executando...";
            elements.timerRunningLabel.style.color = "var(--success)";
        } else if (timerStatus === 'paused') {
            elements.timerRunningLabel.textContent = "Pausado";
            elements.timerRunningLabel.style.color = "var(--warning)";
        } else {
            elements.timerRunningLabel.textContent = "Pronto";
            elements.timerRunningLabel.style.color = "var(--text-muted)";
        }
    }

    // Toggle Icon Play/Pause no painel principal
    if (elements.timerPlayIcon) {
        if (timerStatus === 'running') {
            elements.timerPlayIcon.setAttribute('data-lucide', 'pause');
        } else {
            elements.timerPlayIcon.setAttribute('data-lucide', 'play');
        }
    }

    // Toggle Icon Play/Pause no mini-timer do cabeçalho
    const miniPlayIcon = document.getElementById('mini-timer-play-icon');
    if (miniPlayIcon) {
        if (timerStatus === 'running') {
            miniPlayIcon.setAttribute('data-lucide', 'pause');
        } else {
            miniPlayIcon.setAttribute('data-lucide', 'play');
        }
    }

    // Atualiza visibilidade e estado do mini-timer de cabeçalho
    const miniTimerEl = document.getElementById('header-mini-timer');
    if (miniTimerEl) {
        if (timerStatus === 'running') {
            miniTimerEl.classList.add('running');
        } else {
            miniTimerEl.classList.remove('running');
        }
        
        // Exibir sempre que o usuário estiver fora da aba de Foco (para facilitar início rápido e visibilidade)
        const activeTab = document.querySelector('.tab-content.active');
        const activeTabId = activeTab ? activeTab.id : '';
        
        if (activeTabId !== 'tab-timer') {
            miniTimerEl.classList.remove('hidden');
        } else {
            miniTimerEl.classList.add('hidden');
        }
    }

    safeCreateIcons();
}

function toggleTimer() {
    if (timerStatus === 'running') {
        // Pausar
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        timerStatus = 'paused';
        updateTimerDisplay();
    } else {
        // Iniciar ou Retomar
        timerStatus = 'running';
        updateTimerDisplay();
        
        timerIntervalId = setInterval(() => {
            if (timerSecondsRemaining > 0) {
                timerSecondsRemaining--;
                updateTimerDisplay();
            } else {
                // Tempo acabou!
                clearInterval(timerIntervalId);
                timerIntervalId = null;
                timerStatus = 'idle';
                updateTimerDisplay();

                let alarmMsg = "O tempo limite para a execução do foco acabou!";
                if (timerTaskId) {
                    const task = state.tasks.find(t => t.id === timerTaskId);
                    if (task) alarmMsg = `O tempo limite de execução para a tarefa "${task.title}" acabou!`;
                }

                triggerAlarm("Tempo Limite Atingido!", alarmMsg, true);
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    timerStatus = 'idle';

    if (timerTaskId) {
        const task = state.tasks.find(t => t.id === timerTaskId);
        if (task) {
            timerSecondsRemaining = task.duration * 60;
            timerTotalSeconds = timerSecondsRemaining;
        }
    } else {
        timerSecondsRemaining = 1500;
        timerTotalSeconds = 1500;
    }

    updateTimerDisplay();
}

function adjustTimer(amount) {
    timerSecondsRemaining = Math.max(0, timerSecondsRemaining + amount);
    if (timerSecondsRemaining > timerTotalSeconds) {
        timerTotalSeconds = timerSecondsRemaining;
    }
    updateTimerDisplay();
}

function completeTimerTask() {
    if (timerTaskId) {
        toggleTaskCompletion(timerTaskId);
        // Limpa seleção do timer
        elements.timerTaskSelect.value = '';
        timerTaskId = null;
        resetTimer();
    }
    dismissAlarm();
}

// ============================================================
// TABELA E PAINEL DE PRIORIDADES (EISENHOWER-STYLE BOARD)
// ============================================================
function switchTaskView(viewMode) {
    state.taskView = viewMode;
    saveData();

    const btnList = document.getElementById('btn-view-list');
    const btnPriorities = document.getElementById('btn-view-priorities');
    
    if (viewMode === 'priorities') {
        if (btnList) btnList.classList.remove('active');
        if (btnPriorities) btnPriorities.classList.add('active');
        
        elements.tasksContainer.classList.add('hidden');
        document.getElementById('tasks-priorities-container').classList.remove('hidden');
        renderPrioritiesGrid();
    } else {
        if (btnList) btnList.classList.add('active');
        if (btnPriorities) btnPriorities.classList.remove('active');
        
        elements.tasksContainer.classList.remove('hidden');
        document.getElementById('tasks-priorities-container').classList.add('hidden');
        renderTasks();
    }
    safeCreateIcons();
}

function renderPrioritiesGrid() {
    const container = document.getElementById('tasks-priorities-container');
    if (!container) return;

    container.innerHTML = '';

    const priorityColumns = {
        high: { title: 'Alta Prioridade', class: 'col-high' },
        medium: { title: 'Média Prioridade', class: 'col-medium' },
        low: { title: 'Baixa Prioridade', class: 'col-low' }
    };

    const categoriesLabels = { casa: 'Casa', trabalho: 'Trabalho', faculdade: 'Faculdade' };
    const dayLabels = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };

    // Filtra tarefas conforme categorias
    const filteredTasks = state.tasks.filter(task => {
        const matchesCategory = (state.currentFilter === 'all' || task.category === state.currentFilter);
        
        let matchesDay = true;
        if (state.currentDayFilter === 'none') {
            matchesDay = (!task.day);
        } else if (state.currentDayFilter !== 'all') {
            matchesDay = (task.day === state.currentDayFilter);
        }
        
        return matchesCategory && matchesDay && !task.completed;
    });

    Object.entries(priorityColumns).forEach(([pKey, pCol]) => {
        const colDiv = document.createElement('div');
        colDiv.className = `priority-column ${pCol.class}`;

        const colTasks = filteredTasks.filter(t => t.priority === pKey);

        colDiv.innerHTML = `
            <div class="priority-column-header">
                <h3>${pCol.title}</h3>
                <span class="priority-count-badge">${colTasks.length}</span>
            </div>
            <div class="priority-column-body" id="col-body-${pKey}">
                <!-- Inserido dinamicamente -->
            </div>
        `;

        container.appendChild(colDiv);

        const bodyDiv = colDiv.querySelector(`#col-body-${pKey}`);

        if (colTasks.length === 0) {
            bodyDiv.innerHTML = `
                <div class="placeholder-msg" style="padding: 16px 8px; font-size: 0.75rem;">
                    Nenhuma tarefa pendente
                </div>
            `;
            return;
        }

        colTasks.forEach(task => {
            const card = document.createElement('div');
            const isExpanded = expandedTasks.has(task.id);
            card.className = `priority-task-card cat-${task.category} ${isExpanded ? 'expanded' : 'collapsed'}`;
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input')) {
                    toggleTaskExpansion(task.id);
                }
            });

            let moveUpBtn = '';
            let moveDownBtn = '';

            // Se for Média ou Baixa, pode subir
            if (pKey === 'medium') {
                moveUpBtn = `<button class="btn-priority-move" onclick="changeTaskPriority('${task.id}', 'high')" title="Subir para Alta"><i data-lucide="chevron-left" style="width:14px; height:14px;"></i></button>`;
                moveDownBtn = `<button class="btn-priority-move" onclick="changeTaskPriority('${task.id}', 'low')" title="Descer para Baixa"><i data-lucide="chevron-right" style="width:14px; height:14px;"></i></button>`;
            } else if (pKey === 'low') {
                moveUpBtn = `<button class="btn-priority-move" onclick="changeTaskPriority('${task.id}', 'medium')" title="Subir para Média"><i data-lucide="chevron-left" style="width:14px; height:14px;"></i></button>`;
            } else if (pKey === 'high') {
                moveDownBtn = `<button class="btn-priority-move" onclick="changeTaskPriority('${task.id}', 'medium')" title="Descer para Média"><i data-lucide="chevron-right" style="width:14px; height:14px;"></i></button>`;
            }

            const taskProgress = task.progress !== undefined ? task.progress : (task.completed ? 100 : 0);

            card.innerHTML = `
                <div class="task-header" style="padding: 0; border: none; background: transparent; box-shadow: none; align-items: center;">
                    <button class="btn-checkbox" onclick="toggleTaskCompletion('${task.id}', event)">
                        <i data-lucide="check" style="width:12px; height:12px;"></i>
                    </button>
                    <div class="task-info" style="cursor: pointer;">
                        <span class="priority-task-title">${task.title}</span>
                    </div>
                    <button type="button" class="btn-card-toggle" onclick="toggleTaskExpansion('${task.id}', event)" title="${isExpanded ? 'Recolher' : 'Ver Detalhes'}" style="width: 24px; height: 24px; padding: 0;">
                        <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width:12px; height:12px;"></i>
                    </button>
                </div>
                <div class="task-details-panel">
                    <div class="task-progress-wrapper" style="margin-left: 0; margin-top: 0; margin-bottom: 8px;">
                        <div class="task-progress-bar">
                            <div class="task-progress-fill" style="width: ${taskProgress}%"></div>
                        </div>
                        <span class="task-progress-text" style="min-width: 32px;">${taskProgress}%</span>
                    </div>
                    <div class="priority-task-meta" style="margin-bottom: 8px;">
                        <span class="meta-tag tag-duration"><i data-lucide="hourglass"></i> ${formatMinutesDuration(task.duration)}</span>
                        <span class="meta-tag tag-category" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px; color: var(--text-muted);">${categoriesLabels[task.category]}</span>
                        ${task.day ? `<span class="meta-tag tag-day"><i data-lucide="calendar"></i> ${dayLabels[task.day]}</span>` : ''}
                        ${task.projectId ? `<span class="meta-tag tag-project-name"><i data-lucide="folder" style="width:10px; height:10px; margin-right:2px;"></i> ${getProjectName(task.projectId)}</span>` : ''}
                    </div>
                    <div class="priority-task-actions">
                        <button class="btn-priority-move" onclick="openTaskModal('${task.id}', event)" title="Editar"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
                        <div style="flex: 1;"></div>
                        ${moveUpBtn}
                        ${moveDownBtn}
                    </div>
                </div>
            `;
            bodyDiv.appendChild(card);
        });
    });
}

function changeTaskPriority(taskId, newPriority) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.priority = newPriority;
        task.updatedAt = Date.now();
        saveData();
        renderAll();
    }
}

// Expor funções globais para escopos de eventos HTML
// Expor funções globais para escopos de eventos HTML
window.switchTaskView = switchTaskView;
window.changeTaskPriority = changeTaskPriority;
window.dismissAlarm = dismissAlarm;
window.toggleTimer = toggleTimer;
window.resetTimer = resetTimer;
window.adjustTimer = adjustTimer;
window.completeTimerTask = completeTimerTask;
window.onTimerTaskSelect = onTimerTaskSelect;
window.checkAgendaAlarms = checkAgendaAlarms;
window.syncCurrentDayWithSystem = syncCurrentDayWithSystem;

// ============================================================
// ANOTADOR FINANCEIRO LOCAL
// ============================================================
function openExpenseModal() {
    const modal = document.getElementById('modal-expense');
    if (!modal) return;
    
    document.getElementById('expense-form').reset();
    
    // Pré-preenche a data de hoje local
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    document.getElementById('expense-date').value = `${yyyy}-${mm}-${dd}`;
    
    modal.classList.add('active');
}

function closeExpenseModal() {
    const modal = document.getElementById('modal-expense');
    if (modal) modal.classList.remove('active');
}

function saveExpense(event) {
    event.preventDefault();
    
    const date = document.getElementById('expense-date').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const methodEl = document.querySelector('input[name="expense-method"]:checked');
    const method = methodEl ? methodEl.value : 'cash';
    const category = document.getElementById('expense-category').value;
    const desc = document.getElementById('expense-desc').value.trim();
    
    if (!date || isNaN(amount) || amount <= 0) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente.');
        return;
    }
    
    const newExpense = {
        id: 'e_' + Date.now(),
        date,
        amount,
        method,
        category,
        desc
    };
    
    if (!state.finances) state.finances = [];
    state.finances.unshift(newExpense); // Insere no topo
    
    saveData();
    closeExpenseModal();
    renderAll();
}

function deleteExpense(id) {
    if (confirm('Deseja realmente excluir este lançamento financeiro?')) {
        state.finances = state.finances.filter(e => e.id !== id);
        saveData();
        renderAll();
    }
}

function clearAllExpenses() {
    if (confirm('Atenção: Isso irá apagar permanentemente todos os lançamentos financeiros anotados localmente no seu celular. Deseja continuar?')) {
        state.finances = [];
        saveData();
        renderAll();
    }
}

function renderFinances() {
    const tbody = document.getElementById('finance-tbody');
    const emptyMsg = document.getElementById('finance-empty-msg');
    
    const totalCashEl = document.getElementById('finance-total-cash');
    const totalCardEl = document.getElementById('finance-total-card');
    const totalAllEl = document.getElementById('finance-total-all');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const finances = state.finances || [];
    
    let totalCash = 0;
    let totalCard = 0;
    
    const categoriesLabels = {
        alimentacao: 'Alimentação',
        bem_duravel: 'Bem durável',
        filhos: 'Filhos',
        ensino: 'Ensino',
        gasto_terceiro: 'Gasto de Terceiro',
        glp: 'GLP',
        lazer: 'Lazer',
        mercado: 'Mercado',
        obra: 'Obra',
        pet: 'Pet',
        roupa: 'Roupa',
        saude: 'Saúde',
        servico: 'Serviço',
        taxa: 'Taxa',
        transporte: 'Transporte'
    };
    
    if (finances.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        tbody.parentElement.style.display = 'none'; // Esconde a tabela se vazia
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        tbody.parentElement.style.display = 'table'; // Exibe a tabela
        
        finances.forEach(item => {
            const tr = document.createElement('tr');
            
            // Calcula totais
            if (item.method === 'cash') {
                totalCash += item.amount;
            } else {
                totalCard += item.amount;
            }
            
            const methodLabel = item.method === 'cash' ? 'À Vista' : 'Cartão';
            const methodClass = item.method === 'cash' ? 'cash' : 'card';
            
            // Format date to local standard DD/MM/YYYY
            const [y, m, d] = item.date.split('-');
            const formattedDate = `${d}/${m}/${y}`;
            
            tr.innerHTML = `
                <td data-label="Data" style="padding: 10px; font-weight: 500;">${formattedDate}</td>
                <td data-label="Categoria" style="padding: 10px; color: var(--text-muted);">${categoriesLabels[item.category] || item.category}</td>
                <td data-label="Método" style="padding: 10px;"><span class="badge-payment ${methodClass}">${methodLabel}</span></td>
                <td data-label="Valor" style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-main);">R$ ${item.amount.toFixed(2).replace('.', ',')}</td>
                <td data-label="Observação" style="padding: 10px; font-style: italic; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.desc || '-'}</td>
                <td data-label="Ação" style="padding: 10px; text-align: center;">
                    <button class="btn-task-action delete" onclick="deleteExpenseDirect('${item.id}', event)" title="Excluir" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--danger); cursor: pointer;">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // Atualiza indicadores de somatório
    if (totalCashEl) totalCashEl.textContent = `R$ ${totalCash.toFixed(2).replace('.', ',')}`;
    if (totalCardEl) totalCardEl.textContent = `R$ ${totalCard.toFixed(2).replace('.', ',')}`;
    if (totalAllEl) totalAllEl.textContent = `R$ ${(totalCash + totalCard).toFixed(2).replace('.', ',')}`;
    
    safeCreateIcons();
}

window.deleteExpenseDirect = function(id, event) {
    if (event) event.stopPropagation();
    deleteExpense(id);
};

// ============================================================
// SISTEMA DE SEGURANÇA E BACKUP LOCAL
// ============================================================
function exportBackup() {
    if (!state.hasPassword || !userDecryptionKey) {
        alert("Para exportar seus dados de forma segura, você precisa definir uma senha de acesso primeiro.");
        return;
    }
    
    try {
        const payload = {
            blocks: state.blocks,
            tasks: state.tasks,
            finances: state.finances || [],
            taskView: state.taskView,
            alarmsActive: state.alarmsActive
        };
        
        // Criptografa o backup completo
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), userDecryptionKey).toString();
        
        const backupData = {
            version: 'timeflies-v3-backup',
            payload: encrypted
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `timeflies_secure_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Erro ao exportar backup: " + e.message);
    }
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.version !== 'timeflies-v3-backup' || !data.payload) {
                alert("O arquivo selecionado não é um backup válido do TimeFlies.");
                return;
            }
            
            const backupPassword = prompt("Insira a senha usada para criptografar este arquivo de backup:");
            if (!backupPassword) {
                event.target.value = '';
                return;
            }
            
            // Tenta decodificar com a senha fornecida
            const bytes = CryptoJS.AES.decrypt(data.payload, backupPassword);
            const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedStr) {
                alert("Senha do backup incorreta. Não foi possível restaurar os dados.");
                event.target.value = '';
                return;
            }
            
            const parsed = JSON.parse(decryptedStr);
            
            // Restaura no estado e na memória
            state.blocks = parsed.blocks || [];
            state.tasks = parsed.tasks || [];
            state.finances = parsed.finances || [];
            state.taskView = parsed.taskView || 'list';
            state.alarmsActive = parsed.alarmsActive !== false;
            
            userDecryptionKey = backupPassword;
            state.hasPassword = true;
            
            // Salva no LocalStorage seguro
            saveData();
            
            // Recarrega visualizações
            renderAll();
            
            alert("Backup restaurado com sucesso!");
        } catch (err) {
            alert("Erro ao ler o arquivo de backup: " + err.message);
        }
        event.target.value = ''; // Limpa input
    };
    reader.readAsText(file);
}

function changeAccessPassword() {
    if (!state.hasPassword || !userDecryptionKey) {
        alert("Crie uma senha de acesso primeiro para poder alterá-la.");
        return;
    }
    
    const currentPass = prompt("Insira sua senha atual:");
    if (currentPass !== userDecryptionKey) {
        alert("Senha atual incorreta.");
        return;
    }
    
    const newPass = prompt("Insira a nova senha (não esqueça!):");
    if (!newPass) return;
    
    const confirmPass = prompt("Confirme a nova senha:");
    if (newPass !== confirmPass) {
        alert("A confirmação de senha não confere.");
        return;
    }
    
    // Altera a chave
    userDecryptionKey = newPass;
    saveData();
    alert("Senha de acesso alterada com sucesso!");
}

// ============================================================
// GESTÃO DE PROJETOS E ESTUDOS
// ============================================================
function openProjectModal(projectId = null) {
    const modal = document.getElementById('modal-project');
    if (!modal) return;
    
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = '';
    document.getElementById('btn-delete-project').classList.add('hidden');
    document.getElementById('project-modal-title').textContent = 'Novo Projeto / Disciplina';
    
    if (projectId) {
        const proj = state.projects.find(p => p.id === projectId);
        if (proj) {
            document.getElementById('project-id').value = proj.id;
            document.getElementById('project-name').value = proj.name;
            document.getElementById('project-code').value = proj.code || '';
            document.getElementById('project-professor').value = proj.professor || '';
            document.getElementById('project-type').value = proj.type || 'disciplina';
            document.getElementById('project-status').value = proj.status || 'andamento';
            document.getElementById('project-study-goal').value = proj.studyGoal !== undefined ? proj.studyGoal : 4;
            document.getElementById('project-grade').value = proj.grade !== undefined ? proj.grade : '';
            document.getElementById('project-desc').value = proj.desc || '';
            
            document.getElementById('btn-delete-project').classList.remove('hidden');
            document.getElementById('project-modal-title').textContent = 'Editar Projeto / Disciplina';
        }
    }
    
    modal.classList.add('active');
}

function closeProjectModal() {
    const modal = document.getElementById('modal-project');
    if (modal) modal.classList.remove('active');
}

function saveProject(event) {
    event.preventDefault();
    
    const id = document.getElementById('project-id').value;
    const name = document.getElementById('project-name').value.trim();
    const code = document.getElementById('project-code').value.trim();
    const professor = document.getElementById('project-professor').value.trim();
    const type = document.getElementById('project-type').value;
    const status = document.getElementById('project-status').value;
    const studyGoal = parseInt(document.getElementById('project-study-goal').value) || 0;
    const gradeVal = document.getElementById('project-grade').value;
    const grade = gradeVal !== '' ? parseFloat(gradeVal) : null;
    const desc = document.getElementById('project-desc').value.trim();
    
    if (!name) {
        alert('Por favor, informe o nome do projeto.');
        return;
    }
    
    if (id) {
        const index = state.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            state.projects[index] = {
                ...state.projects[index],
                name, code, professor, type, status, studyGoal, grade, desc,
                updatedAt: Date.now()
            };
        }
    } else {
        const newProj = {
            id: 'p_' + Date.now(),
            name, code, professor, type, status, studyGoal, grade, desc,
            updatedAt: Date.now()
        };
        state.projects.push(newProj);
    }
    
    saveData();
    closeProjectModal();
    renderAll();
}

function deleteProject() {
    const id = document.getElementById('project-id').value;
    if (!id) return;
    
    if (confirm('Deseja realmente excluir este projeto? As tarefas vinculadas a ele continuarão existindo, mas sem o vínculo.')) {
        state.projects = state.projects.filter(p => p.id !== id);
        // Desvincular tarefas
        state.tasks.forEach(t => {
            if (t.projectId === id) {
                t.projectId = null;
            }
        });
        saveData();
        closeProjectModal();
        renderAll();
    }
}

function getProjectName(projectId) {
    if (!projectId) return '';
    const proj = state.projects.find(p => p.id === projectId);
    return proj ? proj.name : '';
}

function renderProjects() {
    const container = document.getElementById('projects-grid-container');
    const emptyMsg = document.getElementById('projects-empty-msg');
    
    const remCountEl = document.getElementById('academic-remaining');
    const gpaEl = document.getElementById('academic-gpa');
    const hoursEl = document.getElementById('academic-total-hours');
    
    if (!container) return;
    container.innerHTML = '';
    
    const allProjects = state.projects || [];
    
    if (allProjects.length === 0) {
        if (emptyMsg) {
            emptyMsg.innerHTML = `<i data-lucide="folder-open"></i> Nenhum projeto ou disciplina cadastrada.`;
            emptyMsg.classList.remove('hidden');
        }
        if (remCountEl) remCountEl.textContent = '0';
        if (gpaEl) gpaEl.textContent = '0.00';
        if (hoursEl) hoursEl.textContent = '0.0h';
        return;
    }

    const typeFilter = document.getElementById('filter-project-type') ? document.getElementById('filter-project-type').value : 'all';
    const statusFilter = document.getElementById('filter-project-status') ? document.getElementById('filter-project-status').value : 'all';

    let displayProjects = [...allProjects];
    if (typeFilter !== 'all') {
        displayProjects = displayProjects.filter(p => p.type === typeFilter);
    }
    if (statusFilter !== 'all') {
        displayProjects = displayProjects.filter(p => p.status === statusFilter);
    }

    if (displayProjects.length === 0) {
        if (emptyMsg) {
            emptyMsg.innerHTML = `<i data-lucide="folder-open"></i> Nenhum projeto encontrado para os filtros selecionados.`;
            emptyMsg.classList.remove('hidden');
        }
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
    }
    
    let totalStudyMinutes = 0;
    
    // Sort projects: andamento first, then planejado, then concluído
    const statusWeight = { andamento: 3, planejado: 2, concluido: 1 };
    displayProjects.sort((a, b) => statusWeight[b.status] - statusWeight[a.status]);
    
    displayProjects.forEach(p => {
        const card = document.createElement('div');
        const isExpanded = expandedProjects.has(p.id);
        card.className = `project-card border-${p.status} ${isExpanded ? 'expanded' : 'collapsed'}`;
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input')) {
                toggleProjectExpansion(p.id);
            }
        });
        
        // Find tasks linked to this project
        const projTasks = state.tasks.filter(t => t.projectId === p.id);
        const totalTasks = projTasks.length;
        const completedTasks = projTasks.filter(t => t.completed).length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Cumulative study minutes from tasks
        const studyMins = projTasks.filter(t => t.completed).reduce((acc, t) => acc + t.duration, 0);
        totalStudyMinutes += studyMins;
        const studyHrs = (studyMins / 60).toFixed(1);
        
        const typeLabels = {
            disciplina: 'Disciplina',
            tcc: 'TCC / Monografia',
            curso: 'Curso Extra',
            projeto: 'Projeto'
        };
        const statusLabels = {
            andamento: 'Em Andamento',
            planejado: 'Planejado',
            concluido: 'Concluído'
        };
        
        // Render subtask previews (up to 3 pending ones)
        let subtasksHtml = '';
        const pendingSub = projTasks.filter(t => !t.completed).slice(0, 3);
        if (pendingSub.length > 0) {
            subtasksHtml = `
                <div class="project-tasks-list">
                    ${pendingSub.map(t => `
                        <div class="project-task-row">
                            <i data-lucide="square" style="width:12px; height:12px; opacity:0.6;"></i>
                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.title}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (totalTasks > 0 && completedTasks === totalTasks) {
            subtasksHtml = `
                <div style="font-size:0.75rem; color:var(--success); font-style:italic; margin-top:8px; display:flex; align-items:center; gap:4px;">
                    <i data-lucide="check-circle" style="width:12px; height:12px;"></i> Todas as tarefas concluídas!
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="project-header" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                <div style="max-width: 60%;">
                    <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin:0; line-height: 1.2;">${p.name}</h3>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    ${p.grade !== null && p.grade !== undefined ? `<span style="font-size:0.75rem; font-weight:700; color:var(--success); margin-right: 2px;">Nota: ${p.grade.toFixed(1)}</span>` : ''}
                    <span class="project-type-badge type-${p.type}" style="font-size: 0.65rem; padding: 2px 6px;">${typeLabels[p.type] || p.type}</span>
                    <button type="button" class="btn-card-toggle" onclick="toggleProjectExpansion('${p.id}', event)" title="${isExpanded ? 'Recolher' : 'Ver Detalhes'}">
                        <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width:14px; height:14px;"></i>
                    </button>
                </div>
            </div>
            
            <div class="project-progress-container" style="margin-top:2px;">
                <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">
                    <span>Progresso das Tarefas</span>
                    <span>${completedTasks}/${totalTasks} (${progress}%)</span>
                </div>
                <div class="task-progress-bar" style="height:5px; background:rgba(255,255,255,0.05);">
                    <div class="task-progress-fill" style="width: ${progress}%; background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);"></div>
                </div>
            </div>
            
            <div class="project-details-panel">
                ${p.professor ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;"><strong>Professor:</strong> ${p.professor}</div>` : ''}
                ${p.desc ? `<p class="project-desc" style="font-size:0.7rem; color:var(--text-muted); line-height:1.3; margin-bottom:6px; word-break:break-word;">${p.desc}</p>` : ''}
                
                <div class="project-stats-mini" style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-bottom:6px;">
                    <span>Meta Semanal: ${p.studyGoal || 0}h</span>
                    <span>Estudado: <strong>${studyHrs}h</strong></span>
                </div>
                
                ${subtasksHtml}
                
                <div class="project-card-actions" style="margin-top:6px; display: flex; gap: 8px;">
                    <button type="button" class="btn-secondary btn-sm" onclick="openProjectModal('${p.id}')" style="padding:2px 6px; font-size:0.65rem; display:flex; align-items:center; gap:4px; height: 24px;">
                        <i data-lucide="edit-3" style="width:12px; height:12px;"></i> Editar
                    </button>
                    <button type="button" class="btn-secondary btn-sm" onclick="exportProjectToWhatsApp('${p.id}')" style="padding:2px 6px; font-size:0.65rem; display:flex; align-items:center; gap:4px; height: 24px; color: #25d366; border-color: rgba(37, 211, 102, 0.2);">
                        <i data-lucide="share-2" style="width:12px; height:12px;"></i> WhatsApp
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Compute academics KPIs based on ALL projects
    const remDisciplines = allProjects.filter(p => p.status !== 'concluido' && p.type === 'disciplina').length;
    if (remCountEl) remCountEl.textContent = remDisciplines;
    
    const gradedProjects = allProjects.filter(p => p.status === 'concluido' && p.grade !== null && p.grade !== undefined && p.grade !== '');
    const gpa = gradedProjects.length > 0 ? (gradedProjects.reduce((acc, p) => acc + parseFloat(p.grade), 0) / gradedProjects.length).toFixed(2) : '0.00';
    if (gpaEl) gpaEl.textContent = gpa;
    
    // Calculate total study minutes from ALL projects
    let overallStudyMinutes = 0;
    allProjects.forEach(p => {
        const projTasks = state.tasks.filter(t => t.projectId === p.id);
        const studyMins = projTasks.filter(t => t.completed).reduce((acc, t) => acc + t.duration, 0);
        overallStudyMinutes += studyMins;
    });
    if (hoursEl) hoursEl.textContent = `${(overallStudyMinutes / 60).toFixed(1)}h`;
    
    safeCreateIcons();
}

// ============================================================
// CONTROLE FINANCEIRO COMPLETO (MODELO PLANILHA EXCEL)
// ============================================================

// Alternar entre as sub-abas financeiras
function switchFinanceSubTab(subTabId) {
    state.currentFinanceSubTab = subTabId;
    
    // Atualizar classe ativa dos botões
    const subTabButtons = document.querySelectorAll('.sub-tab-btn');
    subTabButtons.forEach(btn => {
        const onClickText = btn.getAttribute('onclick') || '';
        if (onClickText.includes(subTabId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Mostrar container correto
    const contents = document.querySelectorAll('.finance-subtab-content');
    contents.forEach(div => {
        if (div.id === `finance-subtab-${subTabId}`) {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    });
    
    renderFinances();
}

// Ajustar mês de referência
function adjustFinanceMonth(dir) {
    const [year, month] = state.currentFinanceMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + dir, 1);
    
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    state.currentFinanceMonth = `${yyyy}-${mm}`;
    
    renderFinances();
}

// Formatar rótulo do mês
function getFinanceMonthLabel(monthStr) {
    const [year, month] = monthStr.split('-');
    const monthsNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthsNames[parseInt(month) - 1]}/${year}`;
}

// Modal Lançamento Financeiro
function openFinanceTransactionModal(id = null) {
    const modal = document.getElementById('modal-finance-transaction');
    if (!modal) return;
    
    populateCardDropdowns();
    
    document.getElementById('finance-transaction-form').reset();
    document.getElementById('fin-trans-id').value = '';
    document.getElementById('btn-delete-finance-transaction').classList.add('hidden');
    document.getElementById('finance-transaction-modal-title').textContent = 'Novo Lançamento Financeiro';
    
    // Configurar data de hoje padrão
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    document.getElementById('fin-trans-date').value = `${yyyy}-${mm}-${dd}`;
    
    if (id) {
        // Encontra transação em expenses ou incomes
        let trans = (state.finances.expenses || []).find(e => e.id === id);
        let type = 'cash';
        
        if (trans) {
            type = trans.method === 'card' ? 'card' : 'cash';
        } else {
            trans = (state.finances.incomes || []).find(i => i.id === id);
            if (trans) type = 'income';
        }
        
        if (trans) {
            document.getElementById('fin-trans-id').value = trans.id;
            document.getElementById('fin-trans-date').value = trans.date;
            document.getElementById('fin-trans-amount').value = trans.amount;
            document.getElementById('fin-trans-desc').value = trans.desc || '';
            
            // Set radio button checked
            const typeRadio = document.querySelector(`input[name="fin-trans-type"][value="${type}"]`);
            if (typeRadio) {
                typeRadio.checked = true;
                toggleFinanceTransactionTypeFields();
            }
            
            if (type === 'card') {
                document.getElementById('fin-trans-card').value = trans.cardId || 'default';
                document.getElementById('fin-trans-installments').value = trans.installments || 1;
            }
            
            // Wait a tiny moment to let toggleFinanceTransactionTypeFields run, then set category
            setTimeout(() => {
                document.getElementById('fin-trans-category').value = trans.category;
            }, 10);
            
            document.getElementById('btn-delete-finance-transaction').classList.remove('hidden');
            document.getElementById('finance-transaction-modal-title').textContent = 'Editar Lançamento';
        }
    } else {
        // Se criar novo, define tipo baseado na aba atual
        let defaultType = 'cash';
        if (state.currentFinanceSubTab === 'card') defaultType = 'card';
        if (state.currentFinanceSubTab === 'income') defaultType = 'income';
        
        const typeRadio = document.querySelector(`input[name="fin-trans-type"][value="${defaultType}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            toggleFinanceTransactionTypeFields();
        }
    }
    
    modal.classList.add('active');
}

function closeFinanceTransactionModal() {
    const modal = document.getElementById('modal-finance-transaction');
    if (modal) modal.classList.remove('active');
}

// Alternar campos do modal dependendo do tipo de transação (Cartão/À Vista/Receita)
function toggleFinanceTransactionTypeFields() {
    const type = document.querySelector('input[name="fin-trans-type"]:checked').value;
    
    // Labels CSS active state helper
    const lblCash = document.getElementById('lbl-type-cash');
    const lblCard = document.getElementById('lbl-type-card');
    const lblIncome = document.getElementById('lbl-type-income');
    
    if (lblCash) lblCash.style.borderColor = type === 'cash' ? 'var(--primary)' : 'rgba(255,255,255,0.08)';
    if (lblCard) lblCard.style.borderColor = type === 'card' ? 'var(--accent)' : 'rgba(255,255,255,0.08)';
    if (lblIncome) lblIncome.style.borderColor = type === 'income' ? 'var(--success)' : 'rgba(255,255,255,0.08)';
    
    if (lblCash) lblCash.querySelector('.payment-radio-label').style.color = type === 'cash' ? 'var(--text-main)' : 'var(--text-muted)';
    if (lblCard) lblCard.querySelector('.payment-radio-label').style.color = type === 'card' ? 'var(--text-main)' : 'var(--text-muted)';
    if (lblIncome) lblIncome.querySelector('.payment-radio-label').style.color = type === 'income' ? 'var(--text-main)' : 'var(--text-muted)';

    const cardFields = document.getElementById('card-fields-row');
    if (cardFields) {
        cardFields.style.display = type === 'card' ? 'flex' : 'none';
    }
    
    // Categorias correspondentes
    const catSelect = document.getElementById('fin-trans-category');
    if (!catSelect) return;
    
    catSelect.innerHTML = '';
    
    if (type === 'income') {
        const incomeCats = {
            salario: 'Salário',
            bolsa: 'Bolsa de Estudos',
            freelance: 'Freelance',
            rendimentos: 'Rendimentos',
            outros: 'Outros'
        };
        Object.entries(incomeCats).forEach(([val, lbl]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = lbl;
            catSelect.appendChild(opt);
        });
    } else {
        const expenseCats = {
            alimentacao: 'Alimentação',
            bem_duravel: 'Bem durável',
            filhos: 'Filhos',
            ensino: 'Ensino',
            gasto_terceiro: 'Gasto de Terceiro',
            glp: 'GLP',
            lazer: 'Lazer',
            mercado: 'Mercado',
            obra: 'Obra',
            pet: 'Pet',
            roupa: 'Roupa',
            saude: 'Saúde',
            servico: 'Serviço',
            taxa: 'Taxa',
            transporte: 'Transporte',
            outros: 'Outros'
        };
        Object.entries(expenseCats).forEach(([val, lbl]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = lbl;
            catSelect.appendChild(opt);
        });
    }
}

// Salvar Lançamento Financeiro
function saveFinanceTransaction(event) {
    event.preventDefault();
    
    const id = document.getElementById('fin-trans-id').value;
    const type = document.querySelector('input[name="fin-trans-type"]:checked').value;
    const date = document.getElementById('fin-trans-date').value;
    const amount = parseFloat(document.getElementById('fin-trans-amount').value);
    const category = document.getElementById('fin-trans-category').value;
    const desc = document.getElementById('fin-trans-desc').value.trim();
    
    if (!date || isNaN(amount) || amount <= 0) {
        alert('Por favor, informe a data e valor corretos.');
        return;
    }
    
    if (id) {
        // Excluir anterior do local correto e reinserir atualizado (simplifica a edição de tipo)
        state.finances.expenses = (state.finances.expenses || []).filter(e => e.id !== id);
        state.finances.incomes = (state.finances.incomes || []).filter(i => i.id !== id);
    }
    
    const transId = id || 'e_' + Date.now();
    
    if (type === 'income') {
        const newIncome = {
            id: transId,
            date,
            amount,
            category,
            desc,
            updatedAt: Date.now()
        };
        state.finances.incomes.unshift(newIncome);
    } else {
        const method = type === 'card' ? 'card' : 'cash';
        const cardId = type === 'card' ? document.getElementById('fin-trans-card').value : null;
        const installments = type === 'card' ? parseInt(document.getElementById('fin-trans-installments').value) || 1 : 1;
        
        const newExpense = {
            id: transId,
            date,
            amount,
            method,
            category,
            desc,
            cardId,
            installments,
            currentInstallment: 1,
            updatedAt: Date.now()
        };
        state.finances.expenses.unshift(newExpense);
    }
    
    saveData();
    closeFinanceTransactionModal();
    renderAll();
}

function deleteFinanceTransaction() {
    const id = document.getElementById('fin-trans-id').value;
    if (!id) return;
    
    if (confirm('Deseja realmente excluir este lançamento financeiro?')) {
        state.finances.expenses = (state.finances.expenses || []).filter(e => e.id !== id);
        state.finances.incomes = (state.finances.incomes || []).filter(i => i.id !== id);
        saveData();
        closeFinanceTransactionModal();
        renderAll();
    }
}

function deleteFinanceTransactionDirect(id, event) {
    if (event) event.stopPropagation();
    if (confirm('Deseja realmente excluir este lançamento financeiro?')) {
        state.finances.expenses = (state.finances.expenses || []).filter(e => e.id !== id);
        state.finances.incomes = (state.finances.incomes || []).filter(i => i.id !== id);
        saveData();
        renderAll();
    }
}

// Modal Despesas Fixas
function openFixedExpenseModal(id = null) {
    const modal = document.getElementById('modal-fixed-expense');
    if (!modal) return;
    
    populateCardDropdowns();
    
    document.getElementById('fixed-expense-form').reset();
    document.getElementById('fixed-expense-id').value = '';
    document.getElementById('fixed-expense-method').value = 'cash';
    document.getElementById('fixed-expense-card-id').value = '';
    document.getElementById('btn-delete-fixed-expense').classList.add('hidden');
    document.getElementById('fixed-expense-modal-title').textContent = 'Nova Despesa Fixa';
    
    const targetMonth = state.currentFinanceMonth;
    const monthLabel = targetMonth.split('-').reverse().join('/');
    const checkboxLabel = document.getElementById('label-fixed-expense-only-current-month');
    if (checkboxLabel) {
        checkboxLabel.textContent = `Alterar valor apenas para o mês selecionado (${monthLabel})`;
    }
    
    const onlyCurrentMonthCheckbox = document.getElementById('fixed-expense-only-current-month');
    if (onlyCurrentMonthCheckbox) {
        onlyCurrentMonthCheckbox.checked = false; // default to unchecked (global change) for new items
    }
    
    if (id) {
        const item = (state.finances.fixedExpenses || []).find(f => f.id === id);
        if (item) {
            document.getElementById('fixed-expense-id').value = item.id;
            document.getElementById('fixed-expense-name').value = item.title;
            
            const currentAmount = (item.monthlyAmounts && item.monthlyAmounts[targetMonth] !== undefined)
                ? item.monthlyAmounts[targetMonth]
                : item.amount;
                
            document.getElementById('fixed-expense-amount').value = currentAmount;
            document.getElementById('fixed-expense-due-day').value = item.dueDay;
            document.getElementById('fixed-expense-desc').value = item.desc || '';
            document.getElementById('fixed-expense-method').value = item.method || 'cash';
            
            if (item.method === 'card') {
                document.getElementById('fixed-expense-card-id').value = item.cardId || 'default';
            }
            
            if (onlyCurrentMonthCheckbox) {
                onlyCurrentMonthCheckbox.checked = (item.monthlyAmounts && item.monthlyAmounts[targetMonth] !== undefined);
            }
            
            document.getElementById('btn-delete-fixed-expense').classList.remove('hidden');
            document.getElementById('fixed-expense-modal-title').textContent = 'Editar Despesa Fixa';
        }
    }
    
    toggleFixedExpenseMethodFields();
    modal.classList.add('active');
}

function closeFixedExpenseModal() {
    const modal = document.getElementById('modal-fixed-expense');
    if (modal) modal.classList.remove('active');
}

function toggleFixedExpenseMethodFields() {
    const method = document.getElementById('fixed-expense-method').value;
    const cardWrapper = document.getElementById('fixed-expense-card-wrapper');
    if (cardWrapper) {
        if (method === 'card') {
            cardWrapper.style.display = 'block';
            document.getElementById('fixed-expense-card-id').required = true;
        } else {
            cardWrapper.style.display = 'none';
            document.getElementById('fixed-expense-card-id').required = false;
        }
    }
}

function saveFixedExpense(event) {
    event.preventDefault();
    
    const id = document.getElementById('fixed-expense-id').value;
    const title = document.getElementById('fixed-expense-name').value.trim();
    const amount = parseFloat(document.getElementById('fixed-expense-amount').value);
    const dueDay = parseInt(document.getElementById('fixed-expense-due-day').value);
    const desc = document.getElementById('fixed-expense-desc').value.trim();
    const method = document.getElementById('fixed-expense-method').value;
    const cardId = method === 'card' ? document.getElementById('fixed-expense-card-id').value : null;
    
    const onlyCurrentMonthCheckbox = document.getElementById('fixed-expense-only-current-month');
    const onlyCurrentMonth = onlyCurrentMonthCheckbox ? onlyCurrentMonthCheckbox.checked : false;
    
    const targetMonth = state.currentFinanceMonth;
    
    if (!title || isNaN(amount) || amount <= 0 || isNaN(dueDay)) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    if (id) {
        const index = state.finances.fixedExpenses.findIndex(f => f.id === id);
        if (index !== -1) {
            const item = state.finances.fixedExpenses[index];
            if (!item.monthlyAmounts) item.monthlyAmounts = {};
            
            // Shallow copy to modify
            let updatedItem = {
                ...item,
                title,
                dueDay,
                desc,
                method,
                cardId,
                updatedAt: Date.now()
            };
            
            if (onlyCurrentMonth) {
                updatedItem.monthlyAmounts[targetMonth] = amount;
            } else {
                updatedItem.amount = amount;
                if (updatedItem.monthlyAmounts[targetMonth] !== undefined) {
                    delete updatedItem.monthlyAmounts[targetMonth];
                }
            }
            
            state.finances.fixedExpenses[index] = updatedItem;
        }
    } else {
        const newItem = {
            id: 'fx_' + Date.now(),
            title,
            amount: amount,
            dueDay,
            desc,
            method,
            cardId,
            history: {}, // Mapeia "YYYY-MM" -> boolean
            monthlyAmounts: {},
            updatedAt: Date.now()
        };
        
        if (onlyCurrentMonth) {
            newItem.monthlyAmounts[targetMonth] = amount;
        }
        
        state.finances.fixedExpenses.push(newItem);
    }
    
    saveData();
    closeFixedExpenseModal();
    renderAll();
}

function deleteFixedExpense() {
    const id = document.getElementById('fixed-expense-id').value;
    if (!id) return;
    
    if (confirm('Deseja realmente excluir esta despesa fixa?')) {
        state.finances.fixedExpenses = (state.finances.fixedExpenses || []).filter(f => f.id !== id);
        saveData();
        closeFixedExpenseModal();
        renderAll();
    }
}

function deleteFixedExpenseDirect(id, event) {
    if (event) event.stopPropagation();
    if (confirm('Deseja realmente excluir esta despesa fixa?')) {
        state.finances.fixedExpenses = (state.finances.fixedExpenses || []).filter(f => f.id !== id);
        saveData();
        renderAll();
    }
}

function toggleFixedExpensePayment(id, event) {
    const item = (state.finances.fixedExpenses || []).find(f => f.id === id);
    if (item) {
        if (!item.history) item.history = {};
        const isPaid = event.target.checked;
        item.history[state.currentFinanceMonth] = isPaid;
        item.updatedAt = Date.now();
        saveData();
        renderAll();
    }
}

// Configurações e Gerenciamento de Múltiplos Cartões
function renderCreditCardsList() {
    const listContainer = document.getElementById('modal-credit-cards-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const cards = state.finances.creditCards || [];
    
    if (cards.length === 0) {
        listContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; padding: 4px 0;">Nenhum cartão cadastrado.</div>';
        return;
    }
    
    cards.forEach(card => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'modal-card-item';
        itemDiv.style.marginBottom = '6px';
        itemDiv.innerHTML = `
            <div class="modal-card-item-info">
                <span class="modal-card-item-name">${card.name}</span>
                <span class="modal-card-item-meta">Lim.: R$ ${card.limit.toFixed(2).replace('.', ',')} | Fech.: Dia ${card.closingDay} | Venc.: Dia ${card.dueDay}</span>
            </div>
            <div class="modal-card-item-actions">
                <button type="button" class="btn-task-action" onclick="editCreditCard('${card.id}')" title="Editar" style="padding: 4px; border: none; background: transparent; color: var(--text-muted); cursor: pointer;">
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                </button>
                <button type="button" class="btn-task-action delete" onclick="deleteCreditCard('${card.id}')" title="Excluir" style="padding: 4px; border: none; background: transparent; color: var(--danger); cursor: pointer;">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(itemDiv);
    });
    safeCreateIcons();
}

function openCreditCardSettingsModal() {
    const modal = document.getElementById('modal-credit-card-settings');
    if (!modal) return;
    
    resetCreditCardForm();
    renderCreditCardsList();
    
    modal.classList.add('active');
}

function closeCreditCardSettingsModal() {
    const modal = document.getElementById('modal-credit-card-settings');
    if (modal) modal.classList.remove('active');
}

function resetCreditCardForm() {
    document.getElementById('card-settings-id').value = '';
    document.getElementById('card-settings-name').value = '';
    document.getElementById('card-settings-limit').value = '';
    document.getElementById('card-settings-closing-day').value = '';
    document.getElementById('card-settings-due-day').value = '';
    
    document.getElementById('card-form-title').textContent = 'Cadastrar Novo Cartão';
    document.getElementById('btn-submit-card').textContent = 'Salvar Cartão';
    document.getElementById('btn-cancel-card-edit').style.display = 'none';
}

function editCreditCard(id) {
    const card = (state.finances.creditCards || []).find(c => c.id === id);
    if (!card) return;
    
    document.getElementById('card-settings-id').value = card.id;
    document.getElementById('card-settings-name').value = card.name;
    document.getElementById('card-settings-limit').value = card.limit;
    document.getElementById('card-settings-closing-day').value = card.closingDay;
    document.getElementById('card-settings-due-day').value = card.dueDay;
    
    document.getElementById('card-form-title').textContent = `Editar Cartão: ${card.name}`;
    document.getElementById('btn-submit-card').textContent = 'Salvar Alterações';
    document.getElementById('btn-cancel-card-edit').style.display = 'block';
}

function saveCreditCardSettings(event) {
    event.preventDefault();
    
    const id = document.getElementById('card-settings-id').value;
    const name = document.getElementById('card-settings-name').value.trim() || 'Cartão Principal';
    const limit = parseFloat(document.getElementById('card-settings-limit').value) || 3000;
    const closingDay = parseInt(document.getElementById('card-settings-closing-day').value) || 5;
    const dueDay = parseInt(document.getElementById('card-settings-due-day').value) || 12;
    
    if (!state.finances.creditCards) state.finances.creditCards = [];
    
    if (id) {
        // Editar cartão existente
        const index = state.finances.creditCards.findIndex(c => c.id === id);
        if (index !== -1) {
            state.finances.creditCards[index] = {
                ...state.finances.creditCards[index],
                name, limit, closingDay, dueDay,
                updatedAt: Date.now()
            };
        }
    } else {
        // Adicionar novo cartão
        const newCard = {
            id: 'c_' + Date.now(),
            name, limit, closingDay, dueDay,
            updatedAt: Date.now()
        };
        state.finances.creditCards.push(newCard);
    }
    
    saveData();
    resetCreditCardForm();
    renderCreditCardsList();
    populateCardDropdowns();
    renderAll();
}

function deleteCreditCard(id) {
    const cards = state.finances.creditCards || [];
    if (cards.length <= 1) {
        alert("Você deve manter pelo menos um cartão de crédito cadastrado.");
        return;
    }
    
    if (confirm("Deseja realmente excluir este cartão de crédito?\nAs despesas vinculadas a ele continuarão existindo mas serão vinculadas ao primeiro cartão restante.")) {
        state.finances.creditCards = cards.filter(c => c.id !== id);
        
        // Atualizar transações vinculadas a este cartão para o cartão padrão restante
        const fallbackCardId = state.finances.creditCards[0].id;
        
        (state.finances.expenses || []).forEach(e => {
            if (e.cardId === id) e.cardId = fallbackCardId;
        });
        
        (state.finances.fixedExpenses || []).forEach(f => {
            if (f.cardId === id) f.cardId = fallbackCardId;
        });
        
        // Se o cartão visualizado na fatura foi removido, redefine para o primeiro disponível
        const cardSelect = document.getElementById('finance-card-view-select');
        if (cardSelect && cardSelect.value === id) {
            cardSelect.value = fallbackCardId;
        }
        
        saveData();
        renderCreditCardsList();
        populateCardDropdowns();
        renderAll();
    }
}

function populateCardDropdowns() {
    const cards = state.finances.creditCards || [];
    
    // 1. Dropdown de visualização na sub-aba do Cartão
    const viewSelect = document.getElementById('finance-card-view-select');
    if (viewSelect) {
        const currentVal = viewSelect.value;
        viewSelect.innerHTML = '';
        cards.forEach(card => {
            const opt = document.createElement('option');
            opt.value = card.id;
            opt.textContent = card.name;
            viewSelect.appendChild(opt);
        });
        if (cards.some(c => c.id === currentVal)) {
            viewSelect.value = currentVal;
        } else if (cards.length > 0) {
            viewSelect.value = cards[0].id;
        }
    }
    
    // 2. Dropdown de seleção no modal de transação
    const transSelect = document.getElementById('fin-trans-card');
    if (transSelect) {
        const currentVal = transSelect.value;
        transSelect.innerHTML = '';
        cards.forEach(card => {
            const opt = document.createElement('option');
            opt.value = card.id;
            opt.textContent = card.name;
            transSelect.appendChild(opt);
        });
        if (cards.some(c => c.id === currentVal)) {
            transSelect.value = currentVal;
        }
    }
    
    // 3. Dropdown de seleção no modal de despesa fixa
    const fixedSelect = document.getElementById('fixed-expense-card-id');
    if (fixedSelect) {
        const currentVal = fixedSelect.value;
        fixedSelect.innerHTML = '';
        cards.forEach(card => {
            const opt = document.createElement('option');
            opt.value = card.id;
            opt.textContent = card.name;
            fixedSelect.appendChild(opt);
        });
        if (cards.some(c => c.id === currentVal)) {
            fixedSelect.value = currentVal;
        }
    }
}

// Lógica de Lançamentos de Cartão de Crédito por Fatura (Com parcelamentos)
// Retorna a lista de transações ativas na fatura do mês selecionado "YYYY-MM"
function getCardExpensesForInvoice(targetMonthStr, cardId) {
    const expenses = state.finances.expenses || [];
    const cards = state.finances.creditCards || [];
    
    // Se nenhum cardId for informado, pega o primeiro cartão cadastrado ou default
    const activeCardId = cardId || (cards.length > 0 ? cards[0].id : 'default');
    const settings = cards.find(c => c.id === activeCardId) || { closingDay: 5, dueDay: 12 };
    const closingDay = settings.closingDay;
    
    const invoiceExpenses = [];
    
    // 1. Filtrar despesas normais do cartão de crédito selecionado
    expenses.forEach(exp => {
        if (exp.method !== 'card') return;
        if (exp.cardId !== activeCardId) return; // Filtra pelo cartão atual
        
        const [expY, expM, expD] = exp.date.split('-').map(Number);
        
        let purchaseInvoiceMonth = expM;
        let purchaseInvoiceYear = expY;
        
        if (expD > closingDay) {
            purchaseInvoiceMonth += 1;
            if (purchaseInvoiceMonth > 12) {
                purchaseInvoiceMonth = 1;
                purchaseInvoiceYear += 1;
            }
        }
        
        const installmentsCount = exp.installments || 1;
        
        for (let i = 0; i < installmentsCount; i++) {
            let instMonth = purchaseInvoiceMonth + i;
            let instYear = purchaseInvoiceYear;
            
            while (instMonth > 12) {
                instMonth -= 12;
                instYear += 1;
            }
            
            const instMonthStr = `${instYear}-${instMonth.toString().padStart(2, '0')}`;
            
            if (instMonthStr === targetMonthStr) {
                invoiceExpenses.push({
                    ...exp,
                    installmentLabel: `${i + 1}/${installmentsCount}`,
                    installmentAmount: exp.amount / installmentsCount
                });
            }
        }
    });
    
    // 2. Filtrar despesas fixas pagas via este cartão de crédito específico
    const fixedExpenses = state.finances.fixedExpenses || [];
    fixedExpenses.forEach(item => {
        if (item.method === 'card' && item.cardId === activeCardId) {
            if (item.history && item.history[targetMonthStr] === true) {
                // Se foi paga neste mês de referência, entra na fatura correspondente
                invoiceExpenses.push({
                    id: `${item.id}_${targetMonthStr}`,
                    date: `${targetMonthStr}-${item.dueDay.toString().padStart(2, '0')}`,
                    amount: item.amount,
                    category: item.category || 'servico',
                    desc: `${item.title} (Despesa Fixa)`,
                    installmentLabel: 'Fixo',
                    installmentAmount: item.amount,
                    isFixedExpense: true // Flag
                });
            }
        }
    });
    
    return invoiceExpenses;
}

// RENDERIZADORES FINANCEIROS
function renderFinances() {
    const labelEl = document.getElementById('finance-current-month-label');
    if (labelEl) {
        labelEl.textContent = getFinanceMonthLabel(state.currentFinanceMonth);
    }
    
    const subtab = state.currentFinanceSubTab || 'dashboard';
    
    // Forçar exibição da subaba correta ao carregar
    const contents = document.querySelectorAll('.finance-subtab-content');
    contents.forEach(div => {
        if (div.id === `finance-subtab-${subtab}`) {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    });
    
    if (subtab === 'dashboard') {
        renderFinanceDashboard();
    } else if (subtab === 'cash') {
        renderFinanceCash();
    } else if (subtab === 'card') {
        renderFinanceCard();
    } else if (subtab === 'income') {
        renderFinanceIncome();
    } else if (subtab === 'fixed') {
        renderFinanceFixed();
    }
}

function renderFinanceDashboard() {
    const targetMonth = state.currentFinanceMonth;
    const cards = state.finances.creditCards || [];
    
    // 1. Receitas do mês
    const incomes = state.finances.incomes || [];
    const monthlyIncomes = incomes.filter(i => i.date.substring(0, 7) === targetMonth);
    const totalIncome = monthlyIncomes.reduce((acc, i) => acc + i.amount, 0);
    
    // 2. Gastos à Vista do mês
    const expenses = state.finances.expenses || [];
    const monthlyCash = expenses.filter(e => e.method === 'cash' && e.date.substring(0, 7) === targetMonth);
    const totalCash = monthlyCash.reduce((acc, e) => acc + e.amount, 0);
    
    // 3. Fatura do Cartão do mês (com parcelamentos de todos os cartões)
    let totalCardConsolidated = 0;
    const allCardsExpenses = [];
    
    cards.forEach(card => {
        const cardExpenses = getCardExpensesForInvoice(targetMonth, card.id);
        const cardTotal = cardExpenses.reduce((acc, e) => acc + e.installmentAmount, 0);
        totalCardConsolidated += cardTotal;
        allCardsExpenses.push(...cardExpenses);
    });
    
    // 4. Despesas Fixas do mês (somar todas as despesas fixas cadastradas)
    const fixedList = state.finances.fixedExpenses || [];
    const totalFixed = fixedList.reduce((acc, f) => {
        const val = f.monthlyAmounts && f.monthlyAmounts[targetMonth] !== undefined ? f.monthlyAmounts[targetMonth] : f.amount;
        return acc + val;
    }, 0);
    
    // 5. Atualizar KPIs do dashboard
    const incEl = document.getElementById('fin-dash-income');
    const cshEl = document.getElementById('fin-dash-cash');
    const crdEl = document.getElementById('fin-dash-card');
    const fxdEl = document.getElementById('fin-dash-fixed');
    
    if (incEl) incEl.textContent = `R$ ${totalIncome.toFixed(2).replace('.', ',')}`;
    if (cshEl) cshEl.textContent = `R$ ${totalCash.toFixed(2).replace('.', ',')}`;
    if (crdEl) crdEl.textContent = `R$ ${totalCardConsolidated.toFixed(2).replace('.', ',')}`;
    if (fxdEl) fxdEl.textContent = `R$ ${totalFixed.toFixed(2).replace('.', ',')}`;
    
    // 6. Previsão de Saldo Final
    const totalExpenses = totalCash + totalCardConsolidated + totalFixed;
    const forecast = totalIncome - totalExpenses;
    const forecastEl = document.getElementById('fin-dash-forecast');
    const forecastDescEl = document.getElementById('fin-dash-forecast-desc');
    
    if (forecastEl) {
        forecastEl.textContent = `R$ ${forecast.toFixed(2).replace('.', ',')}`;
        if (forecast >= 0) {
            forecastEl.style.color = 'var(--success)';
            if (forecastDescEl) forecastDescEl.innerHTML = `<span style="color: var(--success); font-weight:700;">Positivo!</span> Sobra projetada para poupar.`;
        } else {
            forecastEl.style.color = 'var(--danger)';
            if (forecastDescEl) forecastDescEl.innerHTML = `<span style="color: var(--danger); font-weight:700;">Alerta!</span> Suas despesas excedem suas receitas em R$ ${Math.abs(forecast).toFixed(2).replace('.', ',')}.`;
        }
    }
    
    // 7. Renderizar Limites Individuais dos Cartões
    const limitsContainer = document.getElementById('fin-dash-limits-container');
    if (limitsContainer) {
        limitsContainer.innerHTML = '';
        if (cards.length === 0) {
            limitsContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">Nenhum cartão cadastrado.</div>';
        } else {
            cards.forEach(card => {
                const cardExpenses = getCardExpensesForInvoice(targetMonth, card.id);
                const cardTotal = cardExpenses.reduce((acc, e) => acc + e.installmentAmount, 0);
                const limitUsagePct = Math.min(100, Math.round((cardTotal / card.limit) * 100)) || 0;
                const remaining = Math.max(0, card.limit - cardTotal);
                
                const cardLimitDiv = document.createElement('div');
                cardLimitDiv.style.display = 'flex';
                cardLimitDiv.style.flexDirection = 'column';
                cardLimitDiv.style.gap = '4px';
                
                let progressColor = 'linear-gradient(90deg, var(--accent) 0%, var(--primary) 100%)';
                if (limitUsagePct > 90) progressColor = 'var(--danger)';
                else if (limitUsagePct > 70) progressColor = 'var(--warning)';
                
                cardLimitDiv.innerHTML = `
                    <div class="space-between" style="width: 100%; font-size: 0.75rem; margin-top: 2px;">
                        <span style="font-weight: 700; color: var(--text-main);">${card.name}</span>
                        <span style="color: var(--text-muted); font-weight: 600;">R$ ${cardTotal.toFixed(2).replace('.', ',')} / R$ ${card.limit.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="task-progress-bar" style="height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                        <div class="task-progress-fill" style="width: ${limitUsagePct}%; background: ${progressColor}; height: 100%; border-radius: 4px;"></div>
                    </div>
                    <div class="space-between" style="width: 100%; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 2px;">
                        <span>${limitUsagePct}% utilizado</span>
                        <span>R$ ${remaining.toFixed(2).replace('.', ',')} disp.</span>
                    </div>
                `;
                limitsContainer.appendChild(cardLimitDiv);
            });
        }
    }
    
    // Novos recursos do módulo Money Flies
    renderBudgetsProgress();
    renderMoneyGoals();
    renderCashFlowProjection();
    
    // 8. Renderizar Gráfico de Categorias Financeiras usando Chart.js
    renderFinanceChart(monthlyCash, allCardsExpenses, fixedList);
}

function renderFinanceChart(cashExpenses, cardExpenses, fixedExpenses) {
    if (typeof Chart === 'undefined') {
        const legendEl = document.getElementById('finance-category-legend');
        if (legendEl) legendEl.innerHTML = '<div class="placeholder-msg">Gráficos indisponíveis offline</div>';
        return;
    }
    
    // Consolidar todos os gastos por categoria
    const categoryTotals = {};
    
    // Categorias Português mapeamento
    const categoriesLabels = {
        alimentacao: 'Alimentação',
        bem_duravel: 'Bem durável',
        filhos: 'Filhos',
        ensino: 'Ensino',
        gasto_terceiro: 'Gasto de Terceiro',
        glp: 'GLP',
        lazer: 'Lazer',
        mercado: 'Mercado',
        obra: 'Obra',
        pet: 'Pet',
        roupa: 'Roupa',
        saude: 'Saúde',
        servico: 'Serviço',
        taxa: 'Taxa',
        transporte: 'Transporte',
        outros: 'Outros'
    };
    
    // Somar Gastos À Vista
    cashExpenses.forEach(e => {
        const cat = e.category || 'outros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
    });
    
    // Somar Parcelas do Cartão
    cardExpenses.forEach(e => {
        const cat = e.category || 'outros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + e.installmentAmount;
    });
    
    // Somar Despesas Fixas (como categoria 'Despesa Fixa' ou 'servico')
    fixedExpenses.forEach(f => {
        const val = f.monthlyAmounts && f.monthlyAmounts[state.currentFinanceMonth] !== undefined ? f.monthlyAmounts[state.currentFinanceMonth] : f.amount;
        categoryTotals['Despesas Fixas'] = (categoryTotals['Despesas Fixas'] || 0) + val;
    });
    
    // Extrair rótulos e valores para o gráfico
    const labels = [];
    const values = [];
    
    Object.entries(categoryTotals).forEach(([cat, val]) => {
        if (val > 0) {
            labels.push(categoriesLabels[cat] || cat);
            values.push(val);
        }
    });
    
    if (labels.length === 0) {
        const legendEl = document.getElementById('finance-category-legend');
        if (legendEl) legendEl.innerHTML = '<div class="placeholder-msg" style="grid-column: 1/-1;">Nenhum gasto lançado para gerar gráfico.</div>';
        
        // Limpar canvas
        const canvas = document.getElementById('financeCategoryChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (financeCategoryChart) {
            financeCategoryChart.destroy();
            financeCategoryChart = null;
        }
        return;
    }
    
    const chartColors = [
        '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
        '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
        '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'
    ];
    
    const legendEl = document.getElementById('finance-category-legend');
    if (legendEl) {
        legendEl.innerHTML = '';
        labels.forEach((label, idx) => {
            const val = values[idx];
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-label">
                    <span class="legend-color" style="background-color: ${chartColors[idx % chartColors.length]}"></span>
                    ${label}
                </span>
                <span class="legend-value">R$ ${val.toFixed(2).replace('.', ',')}</span>
            `;
            legendEl.appendChild(item);
        });
    }
    
    const rootStyles = window.getComputedStyle(document.documentElement);
    const getThemeColor = (varName) => rootStyles.getPropertyValue(varName).trim();
    const textColor = getThemeColor('--text-muted') || (state.theme === 'dark' ? '#94a3b8' : '#64748b');
    const panelBgColor = getThemeColor('--panel-bg') || (state.theme === 'dark' ? '#16110e' : '#ffffff');
    const isDark = state.theme === 'dark';

    if (financeCategoryChart) {
        financeCategoryChart.data.labels = labels;
        financeCategoryChart.data.datasets[0].data = values;
        financeCategoryChart.data.datasets[0].borderColor = panelBgColor;
        financeCategoryChart.options.plugins.legend.labels.color = textColor;
        financeCategoryChart.update();
    } else {
        const ctx = document.getElementById('financeCategoryChart').getContext('2d');
        financeCategoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    borderColor: panelBgColor,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? 'hsl(18, 20%, 9%)' : 'hsl(0, 0%, 100%)',
                        titleColor: isDark ? 'hsl(18, 25%, 92%)' : 'hsl(0, 10%, 15%)',
                        bodyColor: isDark ? 'hsl(18, 15%, 70%)' : 'hsl(0, 5%, 45%)',
                        borderColor: getThemeColor('--panel-border') || 'transparent',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: R$ ${context.raw.toFixed(2).replace('.', ',')}`;
                            }
                        }
                    }
                },
                cutout: '82%'
            }
        });
    }
}

function renderFinanceCash() {
    const tbody = document.getElementById('finance-cash-tbody');
    const emptyMsg = document.getElementById('finance-cash-empty');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const targetMonth = state.currentFinanceMonth;
    const expenses = state.finances.expenses || [];
    
    const monthlyCash = expenses
        .filter(e => e.method === 'cash' && e.date.substring(0, 7) === targetMonth)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
        
    const categoriesLabels = {
        alimentacao: 'Alimentação', bem_duravel: 'Bem durável', filhos: 'Filhos',
        ensino: 'Ensino', gasto_terceiro: 'Gasto de Terceiro', glp: 'GLP',
        lazer: 'Lazer', mercado: 'Mercado', obra: 'Obra', pet: 'Pet',
        roupa: 'Roupa', saude: 'Saúde', servico: 'Serviço', taxa: 'Taxa',
        transporte: 'Transporte', outros: 'Outros'
    };
    
    if (monthlyCash.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        tbody.parentElement.style.display = 'none';
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        tbody.parentElement.style.display = 'table';
        
        monthlyCash.forEach(item => {
            const tr = document.createElement('tr');
            const [y, m, d] = item.date.split('-');
            const formattedDate = `${d}/${m}/${y}`;
            
            tr.innerHTML = `
                <td data-label="Data" style="padding: 10px; font-weight: 500;">${formattedDate}</td>
                <td data-label="Categoria" style="padding: 10px; color: var(--text-muted);">${categoriesLabels[item.category] || item.category}</td>
                <td data-label="Observação" style="padding: 10px; font-style: italic; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.desc || '-'}</td>
                <td data-label="Valor" style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-main);">R$ ${item.amount.toFixed(2).replace('.', ',')}</td>
                <td data-label="Ação" style="padding: 10px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="btn-task-action" onclick="openFinanceTransactionModal('${item.id}')" title="Editar" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--text-muted); cursor: pointer;">
                            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-task-action delete" onclick="deleteFinanceTransactionDirect('${item.id}', event)" title="Excluir" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--danger); cursor: pointer;">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    safeCreateIcons();
}

function renderFinanceCard() {
    const tbody = document.getElementById('finance-card-tbody');
    const emptyMsg = document.getElementById('finance-card-empty');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Popular o seletor de cartões antes de pegar o valor ativo
    populateCardDropdowns();
    
    const targetMonth = state.currentFinanceMonth;
    const cardSelect = document.getElementById('finance-card-view-select');
    const activeCardId = cardSelect ? cardSelect.value : (state.finances.creditCards.length > 0 ? state.finances.creditCards[0].id : 'default');
    
    const cardExpenses = getCardExpensesForInvoice(targetMonth, activeCardId).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const totalFatura = cardExpenses.reduce((acc, e) => acc + e.installmentAmount, 0);
    document.getElementById('finance-fatura-total').textContent = `R$ ${totalFatura.toFixed(2).replace('.', ',')}`;
    
    const settings = (state.finances.creditCards || []).find(c => c.id === activeCardId) || { closingDay: 5, dueDay: 12 };
    document.getElementById('fatura-closing-lbl').textContent = settings.closingDay.toString().padStart(2, '0');
    document.getElementById('fatura-due-lbl').textContent = settings.dueDay.toString().padStart(2, '0');
    
    // Status da Fatura (ex: se o dia de hoje é antes ou depois do vencimento)
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonthStr = today.toISOString().substring(0, 7);
    const faturaStatusEl = document.getElementById('finance-fatura-status');
    if (faturaStatusEl) {
        if (targetMonth < todayMonthStr) {
            faturaStatusEl.textContent = "Fatura Fechada";
            faturaStatusEl.style.color = "var(--text-muted)";
        } else if (targetMonth === todayMonthStr) {
            if (todayDay > settings.closingDay) {
                faturaStatusEl.textContent = "Fatura Fechada";
                faturaStatusEl.style.color = "var(--warning)";
            } else {
                faturaStatusEl.textContent = "Fatura Aberta";
                faturaStatusEl.style.color = "var(--success)";
            }
        } else {
            faturaStatusEl.textContent = "Fatura Futura";
            faturaStatusEl.style.color = "var(--text-muted)";
        }
    }
    
    const categoriesLabels = {
        alimentacao: 'Alimentação', bem_duravel: 'Bem durável', filhos: 'Filhos',
        ensino: 'Ensino', gasto_terceiro: 'Gasto de Terceiro', glp: 'GLP',
        lazer: 'Lazer', mercado: 'Mercado', obra: 'Obra', pet: 'Pet',
        roupa: 'Roupa', saude: 'Saúde', servico: 'Serviço', taxa: 'Taxa',
        transporte: 'Consumo / Transporte', outros: 'Outros'
    };
    
    if (cardExpenses.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        tbody.parentElement.style.display = 'none';
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        tbody.parentElement.style.display = 'table';
        
        cardExpenses.forEach(item => {
            const tr = document.createElement('tr');
            const [y, m, d] = item.date.split('-');
            const formattedDate = `${d}/${m}/${y}`;
            
            // Ações: se for despesa fixa, desabilita edição/exclusão direta por aqui
            let actionHtml = '';
            if (item.isFixedExpense) {
                actionHtml = `<span style="font-size: 0.7rem; color: var(--text-muted); font-style: italic;">Despesa Fixa</span>`;
            } else {
                actionHtml = `
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="btn-task-action" onclick="openFinanceTransactionModal('${item.id}')" title="Editar" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--text-muted); cursor: pointer;">
                            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-task-action delete" onclick="deleteFinanceTransactionDirect('${item.id}', event)" title="Excluir" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--danger); cursor: pointer;">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `;
            }
            
            tr.innerHTML = `
                <td data-label="Data Compra" style="padding: 10px; font-weight: 500;">${formattedDate}</td>
                <td data-label="Categoria" style="padding: 10px; color: var(--text-muted);">${categoriesLabels[item.category] || item.category}</td>
                <td data-label="Observação" style="padding: 10px; font-style: italic; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.desc || '-'}</td>
                <td data-label="Parcela" style="padding: 10px; text-align: center; color: var(--accent); font-weight: 600;">${item.installmentLabel}</td>
                <td data-label="Valor" style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-main);">R$ ${item.installmentAmount.toFixed(2).replace('.', ',')}</td>
                <td data-label="Ação" style="padding: 10px; text-align: center;">
                    ${actionHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    safeCreateIcons();
}

function renderFinanceIncome() {
    const tbody = document.getElementById('finance-income-tbody');
    const emptyMsg = document.getElementById('finance-income-empty');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const targetMonth = state.currentFinanceMonth;
    const incomes = state.finances.incomes || [];
    
    const monthlyIncomes = incomes
        .filter(i => i.date.substring(0, 7) === targetMonth)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
        
    const categoriesLabels = {
        salario: 'Salário',
        bolsa: 'Bolsa de Estudos',
        freelance: 'Freelance',
        rendimentos: 'Rendimentos',
        outros: 'Outros'
    };
    
    if (monthlyIncomes.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        tbody.parentElement.style.display = 'none';
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        tbody.parentElement.style.display = 'table';
        
        monthlyIncomes.forEach(item => {
            const tr = document.createElement('tr');
            const [y, m, d] = item.date.split('-');
            const formattedDate = `${d}/${m}/${y}`;
            
            tr.innerHTML = `
                <td data-label="Data" style="padding: 10px; font-weight: 500;">${formattedDate}</td>
                <td data-label="Categoria" style="padding: 10px; color: var(--success); font-weight: 600;">${categoriesLabels[item.category] || item.category}</td>
                <td data-label="Origem / Detalhe" style="padding: 10px; font-style: italic; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.desc || '-'}</td>
                <td data-label="Valor" style="padding: 10px; text-align: right; font-weight: 700; color: var(--success);">R$ ${item.amount.toFixed(2).replace('.', ',')}</td>
                <td data-label="Ação" style="padding: 10px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="btn-task-action" onclick="openFinanceTransactionModal('${item.id}')" title="Editar" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--text-muted); cursor: pointer;">
                            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-task-action delete" onclick="deleteFinanceTransactionDirect('${item.id}', event)" title="Excluir" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--danger); cursor: pointer;">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    safeCreateIcons();
}

function renderFinanceFixed() {
    const tbody = document.getElementById('finance-fixed-tbody');
    const emptyMsg = document.getElementById('finance-fixed-empty');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const fixedList = state.finances.fixedExpenses || [];
    const targetMonth = state.currentFinanceMonth;
    
    let paidCount = 0;
    
    if (fixedList.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        tbody.parentElement.style.display = 'none';
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        tbody.parentElement.style.display = 'table';
        
        fixedList.forEach(item => {
            const tr = document.createElement('tr');
            
            if (!item.history) item.history = {};
            const isPaid = item.history[targetMonth] === true;
            if (isPaid) paidCount++;
            
            const currentAmount = (item.monthlyAmounts && item.monthlyAmounts[targetMonth] !== undefined)
                ? item.monthlyAmounts[targetMonth]
                : item.amount;
            
            tr.innerHTML = `
                <td data-label="Pago" style="padding: 10px; text-align: center;">
                    <input type="checkbox" onchange="toggleFixedExpensePayment('${item.id}', event)" ${isPaid ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
                </td>
                <td data-label="Despesa" style="padding: 10px; font-weight: 500;">
                    ${item.title}
                    ${item.desc ? `<div style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal; font-style: italic;">${item.desc}</div>` : ''}
                </td>
                <td data-label="Vence Dia" style="padding: 10px; text-align: center; color: var(--text-muted); font-weight: 600;">Dia ${item.dueDay}</td>
                <td data-label="Valor" style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-main);">R$ ${currentAmount.toFixed(2).replace('.', ',')}</td>
                <td data-label="Ação" style="padding: 10px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="btn-task-action" onclick="openFixedExpenseModal('${item.id}')" title="Editar" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--text-muted); cursor: pointer;">
                            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-task-action delete" onclick="deleteFixedExpenseDirect('${item.id}', event)" title="Excluir" style="padding: 4px; border-radius: 4px; border: none; background: transparent; color: var(--danger); cursor: pointer;">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    document.getElementById('fixed-paid-count').textContent = `${paidCount} de ${fixedList.length} pagas`;
    safeCreateIcons();
}

// Expor novas ações de projetos, financeiras e de segurança na janela
window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.getProjectName = getProjectName;
window.renderProjects = renderProjects;

window.switchFinanceSubTab = switchFinanceSubTab;
window.adjustFinanceMonth = adjustFinanceMonth;
window.openFinanceTransactionModal = openFinanceTransactionModal;
window.closeFinanceTransactionModal = closeFinanceTransactionModal;
window.toggleFinanceTransactionTypeFields = toggleFinanceTransactionTypeFields;
window.saveFinanceTransaction = saveFinanceTransaction;
window.deleteFinanceTransaction = deleteFinanceTransaction;
window.deleteFinanceTransactionDirect = deleteFinanceTransactionDirect;
window.openFixedExpenseModal = openFixedExpenseModal;
window.closeFixedExpenseModal = closeFixedExpenseModal;
window.saveFixedExpense = saveFixedExpense;
window.deleteFixedExpense = deleteFixedExpense;
window.deleteFixedExpenseDirect = deleteFixedExpenseDirect;
window.toggleFixedExpensePayment = toggleFixedExpensePayment;
window.openCreditCardSettingsModal = openCreditCardSettingsModal;
window.closeCreditCardSettingsModal = closeCreditCardSettingsModal;
window.saveCreditCardSettings = saveCreditCardSettings;
window.renderFinances = renderFinances;

window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.changeAccessPassword = changeAccessPassword;
window.handleLockSubmit = handleLockSubmit;
window.resetAllAppData = resetAllAppData;

// ============================================================
// FUNÇÕES DE EXPANSÃO E MINIMIZAÇÃO DE COMPONENTES (Chevron/Click)
// ============================================================
function toggleTaskExpansion(id, event) {
    if (event) event.stopPropagation();
    if (expandedTasks.has(id)) {
        expandedTasks.delete(id);
    } else {
        expandedTasks.add(id);
    }
    renderTasks();
    renderPrioritiesGrid();
}

function toggleProjectExpansion(id, event) {
    if (event) event.stopPropagation();
    if (expandedProjects.has(id)) {
        expandedProjects.delete(id);
    } else {
        expandedProjects.add(id);
    }
    renderProjects();
}

function toggleTimerMinimization() {
    const timerPanel = document.querySelector('.timer-panel');
    const btnMinimize = document.getElementById('btn-minimize-timer');
    
    if (timerPanel) {
        const isMinimized = timerPanel.classList.toggle('minimized');
        
        if (btnMinimize) {
            btnMinimize.innerHTML = isMinimized 
                ? '<i data-lucide="maximize-2" style="width: 16px; height: 16px;"></i>' 
                : '<i data-lucide="minimize-2" style="width: 16px; height: 16px;"></i>';
            safeCreateIcons();
        }
    }
}

window.toggleTaskExpansion = toggleTaskExpansion;
window.toggleProjectExpansion = toggleProjectExpansion;
window.toggleTimerMinimization = toggleTimerMinimization;

// ============================================================
// SMART SYNC - MESCLAGEM INTELIGENTE DE DISPOSITIVOS (LWW)
// ============================================================
function mergeEntities(localArray, incomingArray) {
    const mergedMap = new Map();
    
    const getUpdateT = (item) => {
        if (item && item.updatedAt) return Number(item.updatedAt);
        return 0;
    };
    
    // 1. Inserir itens locais no mapa
    localArray.forEach(item => {
        if (item && item.id) mergedMap.set(item.id, item);
    });
    
    // 2. Mesclar itens entrantes comparando timestamp
    incomingArray.forEach(incomingItem => {
        if (!incomingItem || !incomingItem.id) return;
        if (mergedMap.has(incomingItem.id)) {
            const localItem = mergedMap.get(incomingItem.id);
            if (getUpdateT(incomingItem) > getUpdateT(localItem)) {
                mergedMap.set(incomingItem.id, incomingItem);
            }
        } else {
            mergedMap.set(incomingItem.id, incomingItem);
        }
    });
    
    return Array.from(mergedMap.values());
}

function exportSyncBackup() {
    const payload = {
        tasks: state.tasks,
        blocks: state.blocks,
        projects: state.projects,
        finances: state.finances,
        exportedAt: Date.now()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `timeflies_sync_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importSyncMerge(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const incoming = JSON.parse(e.target.result);
            
            if (!incoming || (!incoming.tasks && !incoming.blocks && !incoming.projects && !incoming.finances)) {
                alert("Arquivo inválido. Formato de sincronização não reconhecido.");
                return;
            }
            
            const initialTasks = state.tasks.length;
            const initialProjects = state.projects.length;
            const initialBlocks = state.blocks.length;
            
            // Mesclagem campo a campo
            state.tasks = mergeEntities(state.tasks, incoming.tasks || []);
            state.blocks = mergeEntities(state.blocks, incoming.blocks || []);
            state.projects = mergeEntities(state.projects, incoming.projects || []);
            
            if (!state.finances) state.finances = { expenses: [], incomes: [], fixedExpenses: [] };
            if (incoming.finances) {
                state.finances.expenses = mergeEntities(state.finances.expenses || [], incoming.finances.expenses || []);
                state.finances.incomes = mergeEntities(state.finances.incomes || [], incoming.finances.incomes || []);
                state.finances.fixedExpenses = mergeEntities(state.finances.fixedExpenses || [], incoming.finances.fixedExpenses || []);
                
                if (incoming.finances.creditCards) {
                    state.finances.creditCards = mergeEntities(state.finances.creditCards || [], incoming.finances.creditCards || []);
                }
                
                if (incoming.finances.cardSettings) {
                    const localCard = state.finances.cardSettings || {};
                    const incomingCard = incoming.finances.cardSettings;
                    const localT = localCard.updatedAt ? Number(localCard.updatedAt) : 0;
                    const incomingT = incomingCard.updatedAt ? Number(incomingCard.updatedAt) : 0;
                    if (incomingT > localT) {
                        state.finances.cardSettings = incomingCard;
                    }
                }
            }
            
            saveData();
            renderAll();
            
            const finalTasks = state.tasks.length;
            const finalProjects = state.projects.length;
            const finalBlocks = state.blocks.length;
            
            alert(`Sincronização Offline realizada com sucesso!\n\n` + 
                  `- Tarefas totais: ${finalTasks} (antes: ${initialTasks})\n` +
                  `- Projetos totais: ${finalProjects} (antes: ${initialProjects})\n` +
                  `- Compromissos totais: ${finalBlocks} (antes: ${initialBlocks})`);
        } catch (err) {
            console.error(err);
            alert("Erro ao decodificar arquivo JSON.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================
// ORÇAMENTOS POR CATEGORIA (Money Flies)
// ==========================================
function openBudgetsModal() {
    const modal = document.getElementById('modal-money-budgets');
    if (!modal) return;
    
    // Pre-fill categories budgets
    const budgets = state.money.budgets || {};
    const categories = ['alimentacao', 'transporte', 'lazer', 'saude', 'casa', 'faculdade', 'outros'];
    
    categories.forEach(cat => {
        const input = document.getElementById(`budget-${cat}`);
        if (input) {
            input.value = budgets[cat] !== undefined ? budgets[cat] : '';
        }
    });
    
    modal.classList.add('active');
}

function closeBudgetsModal() {
    const modal = document.getElementById('modal-money-budgets');
    if (modal) modal.classList.remove('active');
}

function saveBudgets(event) {
    if (event) event.preventDefault();
    
    if (!state.money.budgets) state.money.budgets = {};
    
    const categories = ['alimentacao', 'transporte', 'lazer', 'saude', 'casa', 'faculdade', 'outros'];
    categories.forEach(cat => {
        const input = document.getElementById(`budget-${cat}`);
        if (input) {
            const val = parseFloat(input.value);
            if (!isNaN(val) && val >= 0) {
                state.money.budgets[cat] = val;
            } else {
                state.money.budgets[cat] = 0;
            }
        }
    });
    
    saveData();
    renderAll();
    closeBudgetsModal();
}

function renderBudgetsProgress() {
    const container = document.getElementById('fin-dash-budgets-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const budgets = state.money.budgets || {};
    const currentMonth = state.money.currentFinanceMonth || new Date().toISOString().substring(0, 7);
    const expenses = (state.money.expenses || []).filter(e => e.date && e.date.substring(0, 7) === currentMonth);
    
    const catLabels = {
        alimentacao: 'Alimentação',
        transporte: 'Transporte',
        lazer: 'Lazer',
        saude: 'Saúde',
        casa: 'Casa / Contas',
        faculdade: 'Faculdade / Educação',
        outros: 'Outros'
    };
    
    let activeBudgets = 0;
    
    for (const cat in budgets) {
        const limit = budgets[cat];
        if (limit > 0) {
            activeBudgets++;
            
            // Calculate actual expenses for this category this month
            const actual = expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0);
            const pct = Math.min(100, Math.round((actual / limit) * 100)) || 0;
            const remaining = Math.max(0, limit - actual);
            
            let progressColor = 'linear-gradient(90deg, var(--accent) 0%, var(--primary) 100%)';
            if (pct > 95) progressColor = 'var(--danger)';
            else if (pct > 75) progressColor = 'var(--warning)';
            
            const budgetDiv = document.createElement('div');
            budgetDiv.style.display = 'flex';
            budgetDiv.style.flexDirection = 'column';
            budgetDiv.style.gap = '4px';
            budgetDiv.innerHTML = `
                <div class="space-between" style="width: 100%; font-size: 0.75rem; margin-top: 2px;">
                    <span style="font-weight: 700; color: var(--text-main);">${catLabels[cat] || cat}</span>
                    <span style="color: var(--text-muted); font-weight: 600;">R$ ${actual.toFixed(2).replace('.', ',')} / R$ ${limit.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="task-progress-bar" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                    <div class="task-progress-fill" style="width: ${pct}%; background: ${progressColor}; height: 100%; border-radius: 3px;"></div>
                </div>
                <div class="space-between" style="width: 100%; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 2px;">
                    <span>${pct}% utilizado</span>
                    <span class="${pct > 100 ? 'text-danger' : ''}">${pct > 100 ? 'Estourado!' : `R$ ${remaining.toFixed(2).replace('.', ',')} disp.`}</span>
                </div>
            `;
            container.appendChild(budgetDiv);
        }
    }
    
    if (activeBudgets === 0) {
        container.innerHTML = `
            <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; text-align:center; padding:15px 0;">
                Nenhum orçamento definido para este mês.
            </div>
        `;
    }
}

// ==========================================
// METAS DE ECONOMIA (Money Flies)
// ==========================================
function openNewGoalModal() {
    const modal = document.getElementById('modal-money-goal');
    if (!modal) return;
    
    document.getElementById('money-goal-form').reset();
    document.getElementById('money-goal-id').value = '';
    document.getElementById('btn-delete-money-goal').classList.add('hidden');
    document.getElementById('money-goal-modal-title').textContent = 'Nova Meta de Economia';
    
    modal.classList.add('active');
}

function openEditGoalModal(id) {
    const modal = document.getElementById('modal-money-goal');
    const goal = (state.money.goals || []).find(g => g.id === id);
    if (!modal || !goal) return;
    
    document.getElementById('money-goal-id').value = goal.id;
    document.getElementById('money-goal-name').value = goal.name;
    document.getElementById('money-goal-target').value = goal.target;
    document.getElementById('money-goal-current').value = goal.current;
    document.getElementById('money-goal-deadline').value = goal.deadline;
    
    document.getElementById('btn-delete-money-goal').classList.remove('hidden');
    document.getElementById('money-goal-modal-title').textContent = 'Editar Meta de Economia';
    
    modal.classList.add('active');
}

function closeMoneyGoalModal() {
    const modal = document.getElementById('modal-money-goal');
    if (modal) modal.classList.remove('active');
}

function saveMoneyGoal(event) {
    if (event) event.preventDefault();
    
    if (!state.money.goals) state.money.goals = [];
    
    const id = document.getElementById('money-goal-id').value;
    const name = document.getElementById('money-goal-name').value.trim();
    const target = parseFloat(document.getElementById('money-goal-target').value);
    const current = parseFloat(document.getElementById('money-goal-current').value);
    const deadline = document.getElementById('money-goal-deadline').value;
    
    if (id) {
        // Edit existing
        const index = state.money.goals.findIndex(g => g.id === id);
        if (index !== -1) {
            state.money.goals[index] = {
                ...state.money.goals[index],
                name,
                target,
                current,
                deadline,
                updatedAt: Date.now()
            };
        }
    } else {
        // Create new
        state.money.goals.push({
            id: 'g_' + Date.now(),
            name,
            target,
            current,
            deadline,
            updatedAt: Date.now()
        });
    }
    
    saveData();
    renderAll();
    closeMoneyGoalModal();
}

function deleteMoneyGoal() {
    const id = document.getElementById('money-goal-id').value;
    if (!id) return;
    
    if (confirm("Tem certeza de que deseja excluir esta meta de economia?")) {
        state.money.goals = (state.money.goals || []).filter(g => g.id !== id);
        saveData();
        renderAll();
        closeMoneyGoalModal();
    }
}

function addGoalDeposit(id, amount) {
    const goal = (state.money.goals || []).find(g => g.id === id);
    if (!goal) return;
    
    goal.current = Math.min(goal.target, goal.current + amount);
    goal.updatedAt = Date.now();
    
    saveData();
    renderAll();
}

function renderMoneyGoals() {
    const container = document.getElementById('fin-dash-goals-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const goals = state.money.goals || [];
    
    goals.forEach(goal => {
        const pct = Math.min(100, Math.round((goal.current / goal.target) * 100)) || 0;
        const remaining = Math.max(0, goal.target - goal.current);
        
        // Format date from YYYY-MM-DD to DD/MM
        let dateStr = goal.deadline;
        if (dateStr) {
            const parts = dateStr.split('-');
            if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}`;
        }
        
        const goalDiv = document.createElement('div');
        goalDiv.style.display = 'flex';
        goalDiv.style.flexDirection = 'column';
        goalDiv.style.gap = '4px';
        goalDiv.style.padding = '8px';
        goalDiv.style.border = '1px solid rgba(255,255,255,0.04)';
        goalDiv.style.borderRadius = 'var(--border-radius-md)';
        goalDiv.style.background = 'rgba(255,255,255,0.005)';
        
        goalDiv.innerHTML = `
            <div class="space-between" style="width: 100%; font-size: 0.75rem; font-weight: 700;">
                <span onclick="openEditGoalModal('${goal.id}')" style="color: var(--text-main); cursor: pointer; text-decoration: underline;">${goal.name}</span>
                <span style="color: var(--text-muted);">Prazo: ${dateStr || 'S/D'}</span>
            </div>
            <div class="space-between" style="width: 100%; font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
                <span>Guardado: R$ ${goal.current.toFixed(2).replace('.', ',')}</span>
                <span>Alvo: R$ ${goal.target.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="task-progress-bar" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; margin: 4px 0;">
                <div class="task-progress-fill" style="width: ${pct}%; background: var(--success); height: 100%; border-radius: 3px;"></div>
            </div>
            <div class="space-between" style="width: 100%; align-items: center; font-size: 0.65rem; color: var(--text-muted);">
                <span>${pct}% concluído</span>
                <div style="display: flex; gap: 4px;">
                    <button class="btn-secondary" onclick="addGoalDeposit('${goal.id}', 50)" style="padding: 2px 4px; font-size: 0.6rem; min-height:0; height:auto; width:auto; border-radius:2px;">+R$50</button>
                    <button class="btn-secondary" onclick="addGoalDeposit('${goal.id}', 100)" style="padding: 2px 4px; font-size: 0.6rem; min-height:0; height:auto; width:auto; border-radius:2px;">+R$100</button>
                </div>
            </div>
        `;
        container.appendChild(goalDiv);
    });
    
    if (goals.length === 0) {
        container.innerHTML = `
            <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; text-align:center; padding:15px 0;">
                Nenhuma meta de economia definida.
            </div>
        `;
    }
}

// ==========================================
// PROJEÇÃO DE FLUXO DE CAIXA (3 MESES)
// ==========================================
function renderCashFlowProjection() {
    const tbody = document.getElementById('fin-dash-cashflow-projection-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const now = new Date();
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Obter média histórica de receitas e despesas fixas para projetar
    const currentMonth = state.money.currentFinanceMonth || now.toISOString().substring(0, 7);
    const expenses = (state.money.expenses || []).filter(e => e.date && e.date.substring(0, 7) === currentMonth);
    const incomes = (state.money.incomes || []).filter(i => i.date && i.date.substring(0, 7) === currentMonth);
    const totalExpCash = expenses.filter(e => e.method === 'cash').reduce((acc, curr) => acc + curr.amount, 0);
    const totalInc = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    
    const cards = state.money.creditCards || [];
    const fixedList = state.money.fixedExpenses || [];
    
    // Projetar para os próximos 3 meses
    for (let i = 1; i <= 3; i++) {
        const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const projMonthStr = projDate.toISOString().substring(0, 7);
        const monthLabel = `${months[projDate.getMonth()]}/${projDate.getFullYear()}`;
        
        const projIncome = totalInc;
        
        let projCardExpenses = 0;
        cards.forEach(card => {
            const invoiceItems = getCardExpensesForInvoice(projMonthStr, card.id);
            projCardExpenses += invoiceItems.reduce((acc, curr) => acc + curr.installmentAmount, 0);
        });
        
        const projFixed = fixedList.reduce((acc, f) => {
            const val = f.monthlyAmounts && f.monthlyAmounts[projMonthStr] !== undefined ? f.monthlyAmounts[projMonthStr] : f.amount;
            return acc + val;
        }, 0);
        
        const projExpenses = projFixed + totalExpCash + projCardExpenses;
        const projBalance = projIncome - projExpenses;
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
        row.innerHTML = `
            <td style="padding: 8px; font-weight: 700; color: var(--text-main);">${monthLabel}</td>
            <td style="padding: 8px; color: var(--success);">R$ ${projIncome.toFixed(2).replace('.', ',')}</td>
            <td style="padding: 8px; color: var(--text-muted);">R$ ${projExpenses.toFixed(2).replace('.', ',')}</td>
            <td style="padding: 8px; font-weight: 700; color: ${projBalance >= 0 ? 'var(--success)' : 'var(--danger)'};">R$ ${projBalance.toFixed(2).replace('.', ',')}</td>
        `;
        tbody.appendChild(row);
    }
}

window.exportSyncBackup = exportSyncBackup;
window.importSyncMerge = importSyncMerge;
window.editCreditCard = editCreditCard;
window.deleteCreditCard = deleteCreditCard;
window.resetCreditCardForm = resetCreditCardForm;
window.toggleFixedExpenseMethodFields = toggleFixedExpenseMethodFields;
window.exportProjectToWhatsApp = exportProjectToWhatsApp;
window.exportAgendaToWhatsApp = exportAgendaToWhatsApp;
window.exportAllProjectsToWhatsApp = exportAllProjectsToWhatsApp;

// Money Flies exports
window.openBudgetsModal = openBudgetsModal;
window.closeBudgetsModal = closeBudgetsModal;
window.saveBudgets = saveBudgets;
window.openNewGoalModal = openNewGoalModal;
window.openEditGoalModal = openEditGoalModal;
window.closeMoneyGoalModal = closeMoneyGoalModal;
window.saveMoneyGoal = saveMoneyGoal;
window.deleteMoneyGoal = deleteMoneyGoal;
window.addGoalDeposit = addGoalDeposit;

// ============================================================
// ESG FLIES CORE FUNCTIONS
// ============================================================
function openEsgLogModal() {
    const modal = document.getElementById('modal-esg-log');
    if (!modal) return;
    modal.classList.add('active');
    
    // Default values
    document.getElementById('esg-log-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('esg-log-water').value = '';
    document.getElementById('esg-log-car').value = '0';
    document.getElementById('esg-log-public').value = '0';
    document.getElementById('esg-log-active').value = '0';
    document.getElementById('esg-log-meatless').checked = false;
    document.getElementById('esg-log-recycled').checked = false;
    document.getElementById('esg-log-plastic').value = '0';
}

function closeEsgLogModal() {
    const modal = document.getElementById('modal-esg-log');
    if (modal) modal.classList.remove('active');
}

function saveEsgLog(event) {
    event.preventDefault();
    const date = document.getElementById('esg-log-date').value;
    const water = parseFloat(document.getElementById('esg-log-water').value) || 0;
    const transportCar = parseFloat(document.getElementById('esg-log-car').value) || 0;
    const transportPublic = parseFloat(document.getElementById('esg-log-public').value) || 0;
    const transportActive = parseFloat(document.getElementById('esg-log-active').value) || 0;
    const meatless = document.getElementById('esg-log-meatless').checked;
    const recycled = document.getElementById('esg-log-recycled').checked;
    const plasticAvoided = parseInt(document.getElementById('esg-log-plastic').value) || 0;
    
    const index = state.esg.dailyLogs.findIndex(l => l.date === date);
    const log = { date, water, transportCar, transportPublic, transportActive, meatless, recycled, plasticAvoided };
    
    if (index > -1) {
        state.esg.dailyLogs[index] = log;
    } else {
        state.esg.dailyLogs.push(log);
    }
    
    // Sort descending
    state.esg.dailyLogs.sort((a,b) => b.date.localeCompare(a.date));
    
    saveData();
    renderAll();
    closeEsgLogModal();
}

function renderEsg() {
    const logs = state.esg.dailyLogs || [];
    const waterEl = document.getElementById('esg-stat-water');
    const co2El = document.getElementById('esg-stat-co2');
    const meatlessEl = document.getElementById('esg-stat-meatless');
    const wasteEl = document.getElementById('esg-stat-waste');
    const tbody = document.getElementById('esg-history-tbody');
    
    if (!waterEl || !tbody) return;
    
    // Calculations
    let waterSum = 0;
    let co2Weekly = 0;
    let meatlessCount = 0;
    let plasticAvoidedTotal = 0;
    
    logs.forEach(l => {
        waterSum += l.water;
        plasticAvoidedTotal += (l.plasticAvoided || 0);
    });
    
    // CO2 footprint from last 7 logs
    logs.slice(0, 7).forEach(l => {
        co2Weekly += (parseFloat(l.transportCar) || 0) * 0.18 + (parseFloat(l.transportPublic) || 0) * 0.04;
        if (l.meatless) meatlessCount++;
    });
    
    const avgWater = logs.length > 0 ? (waterSum / logs.length) : 0;
    
    waterEl.textContent = `${avgWater.toFixed(1)} L`;
    co2El.textContent = `${co2Weekly.toFixed(1)} Kg`;
    meatlessEl.textContent = `${meatlessCount} ${meatlessCount === 1 ? 'dia' : 'dias'}`;
    wasteEl.textContent = `${plasticAvoidedTotal} garrafas`;
    
    tbody.innerHTML = '';
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 12px; text-align: center; color: var(--text-muted);">Nenhum hábito ESG registrado.</td></tr>`;
        return;
    }
    
    logs.forEach(l => {
        const co2 = (parseFloat(l.transportCar) || 0) * 0.18 + (parseFloat(l.transportPublic) || 0) * 0.04;
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
        row.innerHTML = `
            <td style="padding: 8px; font-weight: 700;">${l.date.split('-').reverse().join('/')}</td>
            <td style="padding: 8px;">${l.water.toFixed(1)} L</td>
            <td style="padding: 8px; color: ${co2 > 3 ? 'var(--danger)' : 'var(--success)'};">${co2.toFixed(2)} Kg</td>
            <td style="padding: 8px;">${l.meatless ? 'Sim 🌱' : 'Não'}</td>
            <td style="padding: 8px;">${l.plasticAvoided} ev. ${l.recycled ? '(Reciclado)' : ''}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Render novas abas/widgets da lista de compras e validade
    if (typeof renderShoppingList === 'function') renderShoppingList();
    if (typeof renderFreshFoods === 'function') renderFreshFoods();
}

// ============================================================
// MIND FLIES CORE FUNCTIONS
// ============================================================
function openMindLogModal() {
    const modal = document.getElementById('modal-mind-log');
    if (!modal) return;
    modal.classList.add('active');
    
    document.getElementById('mind-log-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('mind-log-mood').value = '';
    document.getElementById('mind-log-notes').value = '';
    document.getElementById('mind-log-energy').value = '3';
    
    document.querySelectorAll('.mood-emoji-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.onclick = () => {
            document.querySelectorAll('.mood-emoji-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('mind-log-mood').value = btn.dataset.mood;
        };
    });
    
    document.querySelectorAll('#modal-mind-log input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

function closeMindLogModal() {
    const modal = document.getElementById('modal-mind-log');
    if (modal) modal.classList.remove('active');
}

function saveMindLog(event) {
    event.preventDefault();
    const date = document.getElementById('mind-log-date').value;
    const mood = parseInt(document.getElementById('mind-log-mood').value);
    const energy = parseInt(document.getElementById('mind-log-energy').value);
    const notes = document.getElementById('mind-log-notes').value.trim();
    
    if (isNaN(mood)) {
        alert("Por favor, selecione um emoji de humor.");
        return;
    }
    
    const practices = [];
    document.querySelectorAll('#modal-mind-log input[type="checkbox"]:checked').forEach(cb => {
        practices.push(cb.value);
    });
    
    const index = state.mind.dailyLogs.findIndex(l => l.date === date);
    const log = { date, mood, energy, notes, practices };
    
    if (index > -1) {
        state.mind.dailyLogs[index] = log;
    } else {
        state.mind.dailyLogs.push(log);
    }
    
    state.mind.dailyLogs.sort((a,b) => b.date.localeCompare(a.date));
    
    saveData();
    renderAll();
    closeMindLogModal();
}

function renderMind() {
    const logs = state.mind.dailyLogs || [];
    const moodEl = document.getElementById('mind-stat-mood');
    const energyEl = document.getElementById('mind-stat-energy');
    const practicesEl = document.getElementById('mind-stat-practices');
    const container = document.getElementById('mind-history-container');
    
    if (!moodEl || !container) return;
    
    let moodSum = 0;
    let energySum = 0;
    let totalPractices = 0;
    
    logs.forEach(l => {
        moodSum += l.mood;
        energySum += l.energy;
        totalPractices += (l.practices || []).length;
    });
    
    const avgMood = logs.length > 0 ? (moodSum / logs.length) : 0;
    const avgEnergy = logs.length > 0 ? (energySum / logs.length) : 0;
    
    const moodEmojis = { 1: '😫', 2: '😔', 3: '😐', 4: '😊', 5: '🤩' };
    moodEl.textContent = avgMood > 0 ? `${moodEmojis[Math.round(avgMood)]} (${avgMood.toFixed(1)})` : 'N/A';
    energyEl.textContent = avgEnergy > 0 ? `${avgEnergy.toFixed(1)} / 5` : 'N/A';
    practicesEl.textContent = totalPractices;
    
    container.innerHTML = '';
    if (logs.length === 0) {
        container.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 20px;">Nenhum registro de saúde mental ainda.</div>`;
        return;
    }
    
    logs.forEach(l => {
        const formattedDate = l.date.split('-').reverse().join('/');
        const div = document.createElement('div');
        div.className = 'glass-panel';
        div.style.padding = '12px 14px';
        div.style.background = 'rgba(255,255,255,0.01)';
        div.style.borderColor = 'rgba(255,255,255,0.04)';
        
        let badgesHtml = '';
        l.practices.forEach(p => {
            badgesHtml += `<span style="font-size: 0.65rem; background: rgba(59,130,246,0.15); color: #3b82f6; border-radius: 4px; padding: 2px 6px; font-weight: 700; margin-right: 4px;">${p}</span>`;
        });
        
        div.innerHTML = `
            <div class="space-between" style="margin-bottom: 6px;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">${formattedDate}</span>
                <span style="font-size: 1.1rem;">${moodEmojis[l.mood]} <span style="font-size: 0.7rem; color: var(--text-muted);">⚡ ${l.energy}/5</span></span>
            </div>
            ${badgesHtml ? `<div style="margin-bottom: 6px; display: flex; flex-wrap: wrap;">${badgesHtml}</div>` : ''}
            ${l.notes ? `<p style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; margin: 0; line-height: 1.3;">"${l.notes}"</p>` : ''}
        `;
        container.appendChild(div);
    });
}

// ============================================================
// BODY FLIES CORE FUNCTIONS
// ============================================================
function openBodyLogModal() {
    const modal = document.getElementById('modal-body-log');
    if (!modal) return;
    modal.classList.add('active');
    
    document.getElementById('body-log-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('body-log-sleep-start').value = '23:00';
    document.getElementById('body-log-sleep-end').value = '07:00';
    document.getElementById('body-log-sleep-quality').value = '4';
    document.getElementById('body-log-exercise-type').value = '';
    document.getElementById('body-log-exercise-duration').value = '';
    document.getElementById('body-log-weight').value = '';
}

function closeBodyLogModal() {
    const modal = document.getElementById('modal-body-log');
    if (modal) modal.classList.remove('active');
}

function saveBodyLog(event) {
    event.preventDefault();
    const date = document.getElementById('body-log-date').value;
    const sleepStart = document.getElementById('body-log-sleep-start').value;
    const sleepEnd = document.getElementById('body-log-sleep-end').value;
    const sleepQuality = parseInt(document.getElementById('body-log-sleep-quality').value);
    const exerciseType = document.getElementById('body-log-exercise-type').value.trim();
    const exerciseDuration = parseInt(document.getElementById('body-log-exercise-duration').value) || 0;
    const weight = parseFloat(document.getElementById('body-log-weight').value) || 0;
    
    const index = state.body.dailyLogs.findIndex(l => l.date === date);
    
    // Preserve existing waterCups if any
    const existingWater = index > -1 ? (state.body.dailyLogs[index].waterCups || 0) : 0;
    
    const log = { date, waterCups: existingWater, sleepStart, sleepEnd, sleepQuality, exerciseType, exerciseDuration, weight };
    
    if (index > -1) {
        state.body.dailyLogs[index] = log;
    } else {
        state.body.dailyLogs.push(log);
    }
    
    if (weight > 0) {
        const wIdx = state.body.weightHistory.findIndex(w => w.date === date);
        if (wIdx > -1) state.body.weightHistory[wIdx].weight = weight;
        else state.body.weightHistory.push({ date, weight });
        state.body.weightHistory.sort((a,b) => b.date.localeCompare(a.date));
    }
    
    state.body.dailyLogs.sort((a,b) => b.date.localeCompare(a.date));
    
    saveData();
    renderAll();
    closeBodyLogModal();
}

function adjustWaterCups(change) {
    const today = new Date().toISOString().substring(0, 10);
    let index = state.body.dailyLogs.findIndex(l => l.date === today);
    
    if (index === -1) {
        const log = { date: today, waterCups: 0, sleepStart: '', sleepEnd: '', sleepQuality: 5, exerciseType: '', exerciseDuration: 0, weight: 0 };
        state.body.dailyLogs.push(log);
        index = state.body.dailyLogs.length - 1;
    }
    
    const current = state.body.dailyLogs[index].waterCups || 0;
    if (change === 1) {
        state.body.dailyLogs[index].waterCups = Math.min(8, current + 1);
    } else {
        state.body.dailyLogs[index].waterCups = Math.max(0, current - 1);
    }
    
    saveData();
    renderAll();
}

function renderBody() {
    const logs = state.body.dailyLogs || [];
    const sleepEl = document.getElementById('body-avg-sleep');
    const qualityEl = document.getElementById('body-avg-sleep-quality');
    const exerciseEl = document.getElementById('body-avg-exercise');
    const weightEl = document.getElementById('body-last-weight');
    const tbody = document.getElementById('body-history-tbody');
    
    // Render water cups today
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayLog = logs.find(l => l.date === todayStr);
    const waterCount = todayLog ? (todayLog.waterCups || 0) : 0;
    
    const cupsContainer = document.getElementById('water-cups-container');
    if (cupsContainer) {
        cupsContainer.innerHTML = '';
        for (let i = 1; i <= 8; i++) {
            const cup = document.createElement('div');
            cup.className = `water-cup ${i <= waterCount ? 'filled' : ''}`;
            cup.onclick = () => {
                adjustWaterCups(i <= waterCount ? -1 : 1);
            };
            cupsContainer.appendChild(cup);
        }
    }
    
    const waterLabel = document.getElementById('water-stat-label');
    if (waterLabel) {
        waterLabel.textContent = `${waterCount} / 8 copos (${(waterCount * 250 / 1000).toFixed(1)} L)`;
    }
    
    if (!sleepEl || !tbody) return;
    
    let totalSleep = 0;
    let sleepQualitySum = 0;
    let exerciseMins = 0;
    let validSleepLogs = 0;
    
    logs.forEach(l => {
        if (l.sleepStart && l.sleepEnd) {
            const start = new Date(`${l.date}T${l.sleepStart}`);
            let end = new Date(`${l.date}T${l.sleepEnd}`);
            if (end < start) end.setDate(end.getDate() + 1);
            const diffHours = (end - start) / (1000 * 60 * 60);
            totalSleep += diffHours;
            sleepQualitySum += l.sleepQuality;
            validSleepLogs++;
        }
        exerciseMins += (parseInt(l.exerciseDuration) || 0);
    });
    
    const avgSleepVal = validSleepLogs > 0 ? (totalSleep / validSleepLogs) : 0;
    const avgQualityVal = validSleepLogs > 0 ? (sleepQualitySum / validSleepLogs) : 0;
    
    sleepEl.textContent = avgSleepVal > 0 ? `${avgSleepVal.toFixed(1)}h` : 'N/A';
    qualityEl.textContent = avgQualityVal > 0 ? `${'⭐'.repeat(Math.round(avgQualityVal))}` : 'N/A';
    exerciseEl.textContent = `${exerciseMins} min`;
    
    const lastWeightLog = state.body.weightHistory[0];
    weightEl.textContent = lastWeightLog ? `${lastWeightLog.weight.toFixed(1)} Kg` : 'N/A';
    
    tbody.innerHTML = '';
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 12px; text-align: center; color: var(--text-muted);">Nenhum hábito físico registrado.</td></tr>`;
        return;
    }
    
    logs.forEach(l => {
        let sleepDiff = 'N/A';
        if (l.sleepStart && l.sleepEnd) {
            const start = new Date(`${l.date}T${l.sleepStart}`);
            let end = new Date(`${l.date}T${l.sleepEnd}`);
            if (end < start) end.setDate(end.getDate() + 1);
            sleepDiff = `${((end - start) / (1000*60*60)).toFixed(1)}h`;
        }
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
        row.innerHTML = `
            <td style="padding: 8px; font-weight: 700;">${l.date.split('-').reverse().join('/')}</td>
            <td style="padding: 8px;">${sleepDiff} (${l.sleepStart}-${l.sleepEnd})</td>
            <td style="padding: 8px;">${'⭐'.repeat(l.sleepQuality)}</td>
            <td style="padding: 8px;">${l.exerciseDuration > 0 ? `${l.exerciseType} (${l.exerciseDuration}m)` : 'Não'}</td>
            <td style="padding: 8px;">${l.weight > 0 ? `${l.weight.toFixed(1)} Kg` : '-'}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Render do painel de treinos
    if (typeof renderBodyWorkouts === 'function') renderBodyWorkouts();
}

// ============================================================
// LEARN FLIES CORE FUNCTIONS (BOOKS & LANGUAGES)
// ============================================================
function switchLearnSubTab(tab) {
    document.querySelectorAll('.learn-subtab-content').forEach(el => {
        el.style.display = 'none';
    });
    
    const activeTab = document.getElementById(`learn-subtab-${tab}`);
    if (activeTab) activeTab.style.display = 'block';
    
    document.querySelectorAll('.learn-sub-tabs .sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const btnMap = {
        'disciplines': 'btn-learn-tab-disciplines',
        'books': 'btn-learn-tab-books',
        'languages': 'btn-learn-tab-languages'
    };
    
    const activeBtn = document.getElementById(btnMap[tab]);
    if (activeBtn) activeBtn.classList.add('active');
    
    const mainActionBtn = document.getElementById('btn-learn-new-action');
    if (mainActionBtn) {
        if (tab === 'disciplines') {
            mainActionBtn.style.display = 'inline-flex';
            mainActionBtn.innerHTML = `<i data-lucide="plus"></i> Novo Projeto / Disciplina`;
            mainActionBtn.onclick = () => openProjectModal();
        } else if (tab === 'books') {
            mainActionBtn.style.display = 'inline-flex';
            mainActionBtn.innerHTML = `<i data-lucide="plus"></i> Novo Livro`;
            mainActionBtn.onclick = () => openLearnBookModal();
        } else {
            mainActionBtn.style.display = 'none';
        }
    }
    
    const shareBtn = document.getElementById('btn-learn-share');
    if (shareBtn) {
        if (tab === 'disciplines') {
            shareBtn.style.display = 'inline-flex';
        } else {
            shareBtn.style.display = 'none';
        }
    }
    safeCreateIcons();
}

function handleNewLearnAction() {
    const activeBtn = document.querySelector('.learn-sub-tabs .sub-tab-btn.active');
    if (activeBtn) {
        if (activeBtn.id === 'btn-learn-tab-disciplines') {
            openProjectModal();
        } else if (activeBtn.id === 'btn-learn-tab-books') {
            openLearnBookModal();
        }
    }
}

function openLearnBookModal() {
    const modal = document.getElementById('modal-learn-book');
    if (!modal) return;
    modal.classList.add('active');
    
    document.getElementById('learn-book-modal-title').textContent = 'Novo Livro';
    document.getElementById('learn-book-id').value = '';
    document.getElementById('learn-book-title').value = '';
    document.getElementById('learn-book-author').value = '';
    document.getElementById('learn-book-total-pages').value = '';
    document.getElementById('learn-book-current-page').value = '0';
    document.getElementById('learn-book-status').value = 'reading';
    
    document.getElementById('btn-delete-learn-book').classList.add('hidden');
}

function openEditBookModal(bookId) {
    const book = state.learn.books.find(b => b.id === bookId);
    if (!book) return;
    
    const modal = document.getElementById('modal-learn-book');
    if (!modal) return;
    modal.classList.add('active');
    
    document.getElementById('learn-book-modal-title').textContent = 'Editar Livro';
    document.getElementById('learn-book-id').value = book.id;
    document.getElementById('learn-book-title').value = book.title;
    document.getElementById('learn-book-author').value = book.author;
    document.getElementById('learn-book-total-pages').value = book.totalPages;
    document.getElementById('learn-book-current-page').value = book.currentPage;
    document.getElementById('learn-book-status').value = book.status;
    
    document.getElementById('btn-delete-learn-book').classList.remove('hidden');
}

function closeLearnBookModal() {
    const modal = document.getElementById('modal-learn-book');
    if (modal) modal.classList.remove('active');
}

function saveLearnBook(event) {
    event.preventDefault();
    const id = document.getElementById('learn-book-id').value || 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const title = document.getElementById('learn-book-title').value.trim();
    const author = document.getElementById('learn-book-author').value.trim();
    const totalPages = parseInt(document.getElementById('learn-book-total-pages').value) || 1;
    let currentPage = parseInt(document.getElementById('learn-book-current-page').value) || 0;
    let status = document.getElementById('learn-book-status').value;
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage === totalPages) status = 'completed';
    
    const index = state.learn.books.findIndex(b => b.id === id);
    const book = { id, title, author, totalPages, currentPage, status };
    
    if (index > -1) {
        state.learn.books[index] = book;
    } else {
        state.learn.books.push(book);
    }
    
    saveData();
    renderAll();
    closeLearnBookModal();
}

function deleteLearnBook() {
    const id = document.getElementById('learn-book-id').value;
    if (!id) return;
    if (!confirm("Tem certeza que deseja excluir este livro?")) return;
    
    state.learn.books = state.learn.books.filter(b => b.id !== id);
    saveData();
    renderAll();
    closeLearnBookModal();
}

function adjustBookPage(bookId, change) {
    const book = state.learn.books.find(b => b.id === bookId);
    if (!book) return;
    
    book.currentPage = Math.max(0, Math.min(book.totalPages, book.currentPage + change));
    if (book.currentPage === book.totalPages) {
        book.status = 'completed';
    } else if (book.currentPage > 0 && book.status === 'wishlist') {
        book.status = 'reading';
    }
    saveData();
    renderAll();
}

function promptDirectPageUpdate(bookId) {
    const book = state.learn.books.find(b => b.id === bookId);
    if (!book) return;
    const page = prompt(`Digite a página atual de "${book.title}" (de 0 a ${book.totalPages}):`, book.currentPage);
    if (page === null) return;
    const parsed = parseInt(page);
    if (isNaN(parsed) || parsed < 0 || parsed > book.totalPages) {
        alert("Número de página inválido.");
        return;
    }
    book.currentPage = parsed;
    if (book.currentPage === book.totalPages) {
        book.status = 'completed';
    } else if (book.currentPage > 0 && book.status === 'wishlist') {
        book.status = 'reading';
    }
    saveData();
    renderAll();
}

function saveLanguagePractice(event) {
    event.preventDefault();
    const language = document.getElementById('lang-select').value;
    const minutes = parseInt(document.getElementById('lang-minutes').value) || 0;
    const date = new Date().toISOString().substring(0, 10);
    
    if (minutes <= 0) return;
    
    const index = state.learn.languages.findIndex(l => l.date === date && l.language === language);
    if (index > -1) {
        state.learn.languages[index].minutes += minutes;
    } else {
        state.learn.languages.push({ date, language, minutes });
    }
    
    document.getElementById('lang-minutes').value = '';
    saveData();
    renderAll();
}

function calculateLanguageStreak() {
    const logs = state.learn.languages || [];
    if (logs.length === 0) return 0;
    
    const dates = [...new Set(logs.map(l => l.date))].sort().reverse();
    if (dates.length === 0) return 0;
    
    const today = new Date().toISOString().substring(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().substring(0, 10);
    
    if (dates[0] !== today && dates[0] !== yesterday) {
        return 0;
    }
    
    let streak = 1;
    let currentDate = new Date(dates[0]);
    
    for (let i = 1; i < dates.length; i++) {
        const nextDate = new Date(dates[i]);
        const diffTime = Math.abs(currentDate - nextDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++;
            currentDate = nextDate;
        } else if (diffDays > 1) {
            break;
        }
    }
    return streak;
}

function renderLanguages() {
    const streakVal = document.getElementById('lang-streak-value');
    const container = document.getElementById('lang-history-container');
    if (!streakVal || !container) return;
    
    const streak = calculateLanguageStreak();
    streakVal.textContent = `${streak} ${streak === 1 ? 'Dia' : 'Dias'}`;
    
    const cockpitStreak = document.getElementById('cockpit-learn-streak');
    if (cockpitStreak) {
        cockpitStreak.textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'}`;
    }
    
    container.innerHTML = '';
    const logs = [...(state.learn.languages || [])].sort((a,b) => b.date.localeCompare(a.date));
    
    if (logs.length === 0) {
        container.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px;">Nenhuma prática registrada ainda.</div>`;
        return;
    }
    
    logs.forEach(log => {
        const formattedDate = log.date.split('-').reverse().join('/');
        const div = document.createElement('div');
        div.className = 'pending-task-row';
        div.style.padding = '8px 10px';
        div.innerHTML = `
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">${log.language}</span>
                <span style="font-size: 0.65rem; color: var(--text-muted);">${formattedDate}</span>
            </div>
            <span class="tag-duration" style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 2px 6px; font-size: 0.7rem; font-weight: 700; border-radius: 4px;">
                ${log.minutes} min
            </span>
        `;
        container.appendChild(div);
    });
}

function renderBooks() {
    const container = document.getElementById('books-grid-container');
    const emptyMsg = document.getElementById('books-empty-msg');
    if (!container) return;
    
    container.innerHTML = '';
    const books = state.learn.books || [];
    
    if (books.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'flex';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';
    
    books.forEach(book => {
        const pct = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-cover-placeholder">
                <i data-lucide="book"></i>
            </div>
            <div class="book-info">
                <div class="space-between width-full" style="align-items: flex-start;">
                    <div style="min-width: 0; flex: 1;">
                        <h4 class="book-title" title="${book.title}" style="margin: 0; font-size: 0.85rem;">${book.title}</h4>
                        <span class="book-author" style="font-size: 0.7rem; color: var(--text-muted);">${book.author}</span>
                    </div>
                    <button class="btn-icon btn-sm" onclick="openEditBookModal('${book.id}')" style="padding: 4px; width: 24px; height: 24px; border: none; background: transparent; cursor: pointer;">
                        <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
                <div class="space-between width-full" style="margin: 6px 0;">
                    <span class="book-badge ${book.status}">
                        ${book.status === 'reading' ? 'Lendo' : book.status === 'completed' ? 'Lido' : 'Quero Ler'}
                    </span>
                    <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">
                        ${book.currentPage} / ${book.totalPages} pág (${pct}%)
                    </span>
                </div>
                <div class="cockpit-progress-container" style="height: 6px; margin-bottom: 8px; border-radius: 3px; background: rgba(255,255,255,0.05); overflow: hidden; width: 100%;">
                    <div class="cockpit-progress-bar" style="width: ${pct}%; background: var(--success); height: 100%;"></div>
                </div>
                <div class="space-between" style="gap: 6px;">
                    <button class="btn-secondary btn-sm" onclick="adjustBookPage('${book.id}', -10)" style="font-size: 0.65rem; padding: 4px 6px;">-10p</button>
                    <button class="btn-secondary btn-sm" onclick="adjustBookPage('${book.id}', 10)" style="font-size: 0.65rem; padding: 4px 6px;">+10p</button>
                    <button class="btn-primary btn-sm" onclick="promptDirectPageUpdate('${book.id}')" style="font-size: 0.65rem; padding: 4px 6px; background: var(--primary); color: var(--text-inverse); border: none; font-weight: 700;">Atualizar</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    safeCreateIcons();
}

// Window Exports for new modules
window.openEsgLogModal = openEsgLogModal;
window.closeEsgLogModal = closeEsgLogModal;
window.saveEsgLog = saveEsgLog;
window.openMindLogModal = openMindLogModal;
window.closeMindLogModal = closeMindLogModal;
window.saveMindLog = saveMindLog;
window.openBodyLogModal = openBodyLogModal;
window.closeBodyLogModal = closeBodyLogModal;
window.saveBodyLog = saveBodyLog;
window.adjustWaterCups = adjustWaterCups;
window.switchLearnSubTab = switchLearnSubTab;
window.handleNewLearnAction = handleNewLearnAction;
window.openLearnBookModal = openLearnBookModal;
window.openEditBookModal = openEditBookModal;
window.closeLearnBookModal = closeLearnBookModal;
window.saveLearnBook = saveLearnBook;
window.deleteLearnBook = deleteLearnBook;
window.adjustBookPage = adjustBookPage;
window.promptDirectPageUpdate = promptDirectPageUpdate;
window.saveLanguagePractice = saveLanguagePractice;

function switchTimeFliesSubTab(tab) {
    document.querySelectorAll('.timeflies-subtab-content').forEach(el => {
        el.style.display = 'none';
    });
    
    const activeTab = document.getElementById(`timeflies-subtab-${tab}`);
    if (activeTab) activeTab.style.display = 'flex';
    
    document.querySelectorAll('.timeflies-sub-tabs .sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const btnMap = {
        'agenda': 'btn-timeflies-tab-agenda',
        'tasks': 'btn-timeflies-tab-tasks'
    };
    
    const activeBtn = document.getElementById(btnMap[tab]);
    if (activeBtn) activeBtn.classList.add('active');
    
    const actionBtn = document.getElementById('btn-timeflies-action');
    const shareBtn = document.getElementById('btn-timeflies-share');
    
    if (actionBtn) {
        if (tab === 'agenda') {
            actionBtn.innerHTML = `<i data-lucide="plus"></i> Bloquear Horário`;
            actionBtn.onclick = () => openBlockModal();
        } else {
            actionBtn.innerHTML = `<i data-lucide="plus"></i> Nova Tarefa`;
            actionBtn.onclick = () => openTaskModal();
        }
    }
    
    if (shareBtn) {
        if (tab === 'agenda') {
            shareBtn.onclick = () => exportAgendaToWhatsApp();
        } else {
            shareBtn.onclick = () => exportToWhatsApp();
        }
    }
    safeCreateIcons();
}

window.switchTimeFliesSubTab = switchTimeFliesSubTab;

function changeCockpitDay(event, day) {
    if (event) {
        event.stopPropagation();
    }
    state.currentDay = day;
    renderAll();
}

window.changeCockpitDay = changeCockpitDay;

function exportProjectsToWhatsApp() {
    const projects = state.projects || [];
    if (projects.length === 0) {
        alert('Nenhum projeto cadastrado para exportar.');
        return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let text = `📚 *TimeFlies - Relação de Projetos e Disciplinas* 📚\n`;
    text += `Data: ${dateStr}\n\n`;

    const statusLabels = {
        andamento: '🟢 EM ANDAMENTO',
        planejado: '🟡 PLANEJADO',
        concluido: '🔴 CONCLUÍDO'
    };

    const typeLabels = {
        disciplina: 'Disciplina',
        tcc: 'TCC / Monografia',
        curso: 'Curso Extra',
        projeto: 'Projeto'
    };

    const groups = {
        andamento: [],
        planejado: [],
        concluido: []
    };

    projects.forEach(p => {
        if (groups[p.status]) {
            groups[p.status].push(p);
        }
    });

    let hasItems = false;
    for (const status in groups) {
        if (groups[status].length > 0) {
            hasItems = true;
            text += `*${statusLabels[status]}*\n`;
            groups[status].forEach(p => {
                const typeStr = typeLabels[p.type] || p.type;
                text += `• ${p.name} (${typeStr})\n`;
            });
            text += `\n`;
        }
    }

    if (!hasItems) {
        alert('Nenhum projeto para exportar.');
        return;
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text.trim())}`;
    window.open(url, '_blank');
}

// ============================================================
// LOGICA DE NOVAS FUNCOES DE ROTINA (TREINO, SHOPPING, VALIDADE)
// ============================================================

// 1. Seed de Treinos Padrão
function getDefaultWorkouts() {
    return [
        {
            id: 'A',
            name: 'Costas',
            day: 'Segunda',
            completedDays: [],
            exercises: [
                { name: 'Puxada Alta', sets: 3, reps: 8, weight: 15, completed: false },
                { name: 'Remada Baixa', sets: 3, reps: 8, weight: 20, completed: false },
                { name: 'Pull Down', sets: 3, reps: 8, weight: 8, completed: false }
            ]
        },
        {
            id: 'B',
            name: 'Membros Superiores',
            day: 'Quarta',
            completedDays: [],
            exercises: [
                { name: 'Supino Reto', sets: 3, reps: 10, weight: 30, completed: false },
                { name: 'Desenvolvimento Ombros', sets: 3, reps: 10, weight: 10, completed: false },
                { name: 'Rosca Direta', sets: 3, reps: 10, weight: 12, completed: false },
                { name: 'Tríceps Pulley', sets: 3, reps: 10, weight: 15, completed: false }
            ]
        },
        {
            id: 'C',
            name: 'Membros Inferiores',
            day: 'Sexta',
            completedDays: [],
            exercises: [
                { name: 'Agachamento Livre', sets: 3, reps: 7, weight: 40, completed: false },
                { name: 'Leg Press 45', sets: 3, reps: 7, weight: 80, completed: false },
                { name: 'Cadeira Extensora', sets: 3, reps: 7, weight: 25, completed: false },
                { name: 'Cadeira Flexora', sets: 3, reps: 7, weight: 20, completed: false }
            ]
        }
    ];
}

// 2. Lista de Compras Inteligente
function renderShoppingList() {
    const listContainer = document.getElementById('esg-shopping-list');
    if (!listContainer) return;
    
    const items = state.esg.shoppingList || [];
    listContainer.innerHTML = '';
    
    if (items.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); padding: 12px;">Nenhum item na lista de compras.</div>`;
        return;
    }
    
    // Group by category
    const categories = ['Hortifrúti', 'Frios/Proteínas', 'Mercearia', 'Outros'];
    categories.forEach(cat => {
        const catItems = items.filter(i => i.category === cat);
        if (catItems.length === 0) return;
        
        const catHeader = document.createElement('div');
        catHeader.style.cssText = 'font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin: 6px 0 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;';
        catHeader.textContent = cat;
        listContainer.appendChild(catHeader);
        
        catItems.forEach(item => {
            const card = document.createElement('div');
            card.className = `shopping-item-card ${item.checked ? 'checked' : ''}`;
            
            let actionBtn = '';
            if (item.checked) {
                // If checked, show the button to send to Expiration Control
                actionBtn = `<button type="button" class="btn-icon" onclick="openEsgFoodModal('${item.name}')" title="Mandar para Validade" style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 4px; border-radius: 4px; border: none; display: flex; align-items: center;"><i data-lucide="calendar-plus" style="width: 13px; height: 13px;"></i></button>`;
            }
            
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                    <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleShoppingItem('${item.id}')" style="cursor: pointer; width: 15px; height: 15px; accent-color: hsl(142, 60%, 45%);">
                    <span class="shopping-item-text" style="font-size: 0.8rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                    ${actionBtn}
                    <button type="button" class="btn-icon text-danger" onclick="deleteShoppingItem('${item.id}')" style="background: transparent; border: none; cursor: pointer; padding: 2px;"><i data-lucide="trash-2" style="width: 13px; height: 13px;"></i></button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    });
    
    safeCreateIcons();
}

function addShoppingItem(event) {
    event.preventDefault();
    const input = document.getElementById('shopping-item-name');
    const select = document.getElementById('shopping-item-category');
    if (!input) return;
    
    const name = input.value.trim();
    const category = select.value;
    if (!name) return;
    
    const newItem = {
        id: 'shop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name,
        category: category,
        checked: false
    };
    
    if (!state.esg.shoppingList) state.esg.shoppingList = [];
    state.esg.shoppingList.push(newItem);
    
    input.value = '';
    saveData();
    renderShoppingList();
}

function toggleShoppingItem(id) {
    const item = state.esg.shoppingList.find(i => i.id === id);
    if (item) {
        item.checked = !item.checked;
        saveData();
        renderShoppingList();
    }
}

function deleteShoppingItem(id) {
    state.esg.shoppingList = state.esg.shoppingList.filter(i => i.id !== id);
    saveData();
    renderShoppingList();
}

function clearCheckedShoppingItems() {
    state.esg.shoppingList = (state.esg.shoppingList || []).filter(i => !i.checked);
    saveData();
    renderShoppingList();
}

// 3. Controle de Validade / Desperdício Zero (ESG)
function renderFreshFoods() {
    const listContainer = document.getElementById('esg-food-list');
    if (!listContainer) return;
    
    const items = state.esg.freshFoods || [];
    listContainer.innerHTML = '';
    
    if (items.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); padding: 12px;">Nenhum alimento cadastrado na validade.</div>`;
        return;
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Sort by expiration date (closest first)
    items.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    items.forEach(item => {
        const expiry = new Date(item.expiryDate);
        expiry.setHours(0,0,0,0);
        
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let badgeClass = 'success';
        let badgeText = `${diffDays}d restantes`;
        
        if (diffDays <= 1) {
            badgeClass = 'danger';
            badgeText = diffDays < 0 ? 'Vencido!' : (diffDays === 0 ? 'Vence Hoje!' : 'Vence Amanhã!');
        } else if (diffDays <= 3) {
            badgeClass = 'warning';
            badgeText = `${diffDays}d restantes`;
        }
        
        const card = document.createElement('div');
        card.className = 'food-item-card';
        card.innerHTML = `
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
                <span style="font-size: 0.68rem; color: var(--text-muted);">Qtd: ${item.qty} • Vence em: ${expiry.toLocaleDateString('pt-BR')}</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <span class="expiry-badge ${badgeClass}">${badgeText}</span>
                <button type="button" class="btn-icon text-success" onclick="consumeFreshFood('${item.id}')" title="Consumido" style="background: rgba(16,185,129,0.1); border: none; cursor: pointer; padding: 4px; border-radius: 4px;"><i data-lucide="check" style="width: 14px; height: 14px;"></i></button>
                <button type="button" class="btn-icon text-danger" onclick="wasteFreshFood('${item.id}')" title="Desperdiçado (Lixo)" style="background: rgba(239,68,68,0.1); border: none; cursor: pointer; padding: 4px; border-radius: 4px;"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
            </div>
        `;
        listContainer.appendChild(card);
    });
    
    safeCreateIcons();
}

function openEsgFoodModal(prefilledName = '') {
    const modal = document.getElementById('modal-esg-food');
    if (!modal) return;
    
    modal.classList.add('active');
    document.getElementById('esg-food-form').reset();
    
    if (prefilledName) {
        document.getElementById('esg-food-name').value = prefilledName;
        document.getElementById('esg-food-days').value = '5'; // default validade
        document.getElementById('esg-food-qty').value = '1 un';
    }
}

function closeEsgFoodModal() {
    const modal = document.getElementById('modal-esg-food');
    if (modal) modal.classList.remove('active');
}

function saveEsgFood(event) {
    event.preventDefault();
    const name = document.getElementById('esg-food-name').value.trim();
    const qty = document.getElementById('esg-food-qty').value.trim();
    const days = parseInt(document.getElementById('esg-food-days').value) || 3;
    
    if (!name || !qty) return;
    
    const today = new Date();
    const expiry = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    const newItem = {
        id: 'food_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name,
        qty: qty,
        addedDate: today.toISOString().substring(0, 10),
        expiryDate: expiry.toISOString().substring(0, 10)
    };
    
    if (!state.esg.freshFoods) state.esg.freshFoods = [];
    state.esg.freshFoods.push(newItem);
    
    saveData();
    closeEsgFoodModal();
    renderEsg();
    renderHome(); // Updates the widget on home
}

function consumeFreshFood(id) {
    const item = state.esg.freshFoods.find(i => i.id === id);
    if (item) {
        // Log action to state
        if (!state.esg.foodLogs) state.esg.foodLogs = [];
        state.esg.foodLogs.push({
            id: 'log_' + Date.now(),
            date: new Date().toISOString().substring(0, 10),
            name: item.name,
            action: 'consumed'
        });
        
        // Remove from list
        state.esg.freshFoods = state.esg.freshFoods.filter(i => i.id !== id);
        
        saveData();
        renderEsg();
        renderHome();
        alert(`Você consumiu ${item.name} a tempo! +10 pontos no seu FlyScore por evitar o desperdício! 🎉`);
    }
}

function wasteFreshFood(id) {
    const item = state.esg.freshFoods.find(i => i.id === id);
    if (item) {
        if (confirm(`Confirmar descarte/desperdício de ${item.name}? Isso impactará seu FlyScore.`)) {
            // Log action to state
            if (!state.esg.foodLogs) state.esg.foodLogs = [];
            state.esg.foodLogs.push({
                id: 'log_' + Date.now(),
                date: new Date().toISOString().substring(0, 10),
                name: item.name,
                action: 'wasted'
            });
            
            // Remove from list
            state.esg.freshFoods = state.esg.freshFoods.filter(i => i.id !== id);
            
            saveData();
            renderEsg();
            renderHome();
        }
    }
}

// 4. Widget da Home: Frutas Disponíveis
function renderHomeFreshFoods() {
    const homeList = document.getElementById('home-fresh-foods-list');
    if (!homeList) return;
    
    const items = state.esg.freshFoods || [];
    homeList.innerHTML = '';
    
    if (items.length === 0) {
        homeList.innerHTML = `<div style="text-align: center; font-size: 0.72rem; color: var(--text-muted); padding: 8px;">Nenhum alimento na despensa de validade.</div>`;
        return;
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Sort by expiration (closest first)
    const sorted = [...items].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    // Show top 4
    sorted.slice(0, 4).forEach(item => {
        const expiry = new Date(item.expiryDate);
        expiry.setHours(0,0,0,0);
        
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let color = '#10b981'; // Green
        let status = `${diffDays} dias`;
        
        if (diffDays <= 1) {
            color = '#ef4444'; // Red
            status = diffDays < 0 ? 'Vencido' : (diffDays === 0 ? 'Hoje' : 'Amanhã');
        } else if (diffDays <= 3) {
            color = '#f59e0b'; // Yellow
        }
        
        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;';
        div.innerHTML = `
            <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
                <span style="font-size: 0.65rem; color: var(--text-muted);">${item.qty} • vence: ${expiry.toLocaleDateString('pt-BR')}</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-size: 0.65rem; font-weight: 700; color: ${color}; background: ${color}1a; padding: 2px 6px; border-radius: 4px; border: 1px solid ${color}33;">${status}</span>
                <button type="button" class="btn-icon text-success" onclick="consumeFreshFood('${item.id}')" title="Marcar como Consumido" style="background: transparent; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center;"><i data-lucide="check" style="width: 14px; height: 14px;"></i></button>
            </div>
        `;
        homeList.appendChild(div);
    });
    
    safeCreateIcons();
}

// 5. Ficha de Academia e Frequência (Body)
function getDatesOfCurrentWeek() {
    const today = new Date();
    const currentDay = today.getDay(); // 0: Dom, 1: Seg...
    // Queremos Segunda-feira como primeiro dia, Domingo como último
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today.getTime() + distanceToMonday * 24 * 60 * 60 * 1000);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
        weekDates.push(d.toISOString().substring(0, 10));
    }
    return weekDates;
}

function renderBodyWorkouts() {
    const tabsContainer = document.getElementById('workout-tabs-container');
    const contentContainer = document.getElementById('workout-active-content');
    const dayLabel = document.getElementById('workout-recommended-day');
    const chipsContainer = document.getElementById('workout-frequency-chips');
    
    if (!tabsContainer || !contentContainer) return;
    
    const workouts = state.body.workouts || [];
    
    // Garante que haja um treino ativo selecionado
    if (!state.body.activeWorkoutId && workouts.length > 0) {
        state.body.activeWorkoutId = workouts[0].id;
    }
    
    // 1. Renderizar Abas de Seleção
    tabsContainer.innerHTML = '';
    workouts.forEach(w => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `workout-tab-btn ${state.body.activeWorkoutId === w.id ? 'active' : ''}`;
        btn.textContent = `Treino ${w.id} - ${w.name}`;
        btn.onclick = () => selectWorkoutTab(w.id);
        tabsContainer.appendChild(btn);
    });
    
    const activeWorkout = workouts.find(w => w.id === state.body.activeWorkoutId);
    
    if (!activeWorkout) {
        contentContainer.innerHTML = `<div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); padding: 20px;">Nenhum treino selecionado. Crie um novo treino acima!</div>`;
        if (dayLabel) dayLabel.textContent = '';
        if (chipsContainer) chipsContainer.innerHTML = '';
        return;
    }
    
    // 2. Renderizar Detalhes e Recomendações
    if (dayLabel) {
        dayLabel.textContent = `Dia Recomendado: ${activeWorkout.day || 'Não definido'}`;
    }
    
    // 3. Renderizar Chips de Frequência Semanal (Seg a Dom)
    if (chipsContainer) {
        chipsContainer.innerHTML = '';
        const weekDates = getDatesOfCurrentWeek();
        const dayLetters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
        
        weekDates.forEach((dateStr, idx) => {
            const chip = document.createElement('div');
            chip.className = 'workout-day-chip';
            chip.textContent = dayLetters[idx];
            
            // Verifica se QUALQUER treino foi concluído nesta data
            const wasTrained = workouts.some(w => w.completedDays && w.completedDays.includes(dateStr));
            if (wasTrained) {
                chip.classList.add('active');
                chip.title = 'Você treinou neste dia! 💪';
            } else {
                chip.title = 'Sem registro de treino';
            }
            chipsContainer.appendChild(chip);
        });
    }
    
    // 4. Renderizar Exercícios do Treino Ativo
    contentContainer.innerHTML = '';
    const exercises = activeWorkout.exercises || [];
    
    if (exercises.length === 0) {
        contentContainer.innerHTML = `
            <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); padding: 16px;">
                Nenhum exercício neste treino.
                <button type="button" class="btn-accent btn-sm" onclick="openExerciseModal('${activeWorkout.id}')" style="margin-top: 8px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 0.72rem; border-radius: 4px;"><i data-lucide="plus" style="width: 12px; height: 12px;"></i> Adicionar Exercício</button>
            </div>
        `;
        safeCreateIcons();
        return;
    }
    
    exercises.forEach((ex, idx) => {
        const card = document.createElement('div');
        card.className = `exercise-row-card ${ex.completed ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                <input type="checkbox" ${ex.completed ? 'checked' : ''} onchange="toggleExerciseCompletion('${activeWorkout.id}', ${idx})" style="cursor: pointer; width: 16px; height: 16px; accent-color: hsl(0, 80%, 55%);">
                <div style="display: flex; flex-direction: column; min-width: 0;">
                    <span class="exercise-info-name" style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ex.name}</span>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${ex.sets} séries de ${ex.reps} repetições</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--text-muted);">
                    <input type="number" value="${ex.weight}" onchange="updateExerciseWeight('${activeWorkout.id}', ${idx}, this.value)" style="width: 44px; height: 26px; font-size: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); color: #fff; padding: 2px 4px; border-radius: 4px; text-align: center;" min="0">
                    <span>Kg</span>
                </div>
                <button type="button" onclick="startWorkoutRestTimer()" class="btn-icon" title="Iniciar Descanso (60s)" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 5px; border-radius: 4px; color: var(--text-muted);"><i data-lucide="timer" style="width: 13px; height: 13px;"></i></button>
                <button type="button" class="btn-icon" onclick="openExerciseModal('${activeWorkout.id}', ${idx})" style="background: transparent; border: none; cursor: pointer; padding: 2px; color: var(--text-muted);"><i data-lucide="edit-3" style="width: 13px; height: 13px;"></i></button>
            </div>
        `;
        contentContainer.appendChild(card);
    });
    
    // Barra de Ação do Treino
    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 6px; gap: 8px;';
    
    // Check se todos concluídos
    const allDone = exercises.every(e => e.completed);
    const todayStr = new Date().toISOString().substring(0, 10);
    const alreadyCompletedToday = activeWorkout.completedDays && activeWorkout.completedDays.includes(todayStr);
    
    let completeBtnText = alreadyCompletedToday ? 'Concluído Hoje! ✓' : 'Concluir Treino';
    let completeBtnStyle = alreadyCompletedToday 
        ? 'background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; font-weight: 700;' 
        : 'background: hsl(0, 80%, 55%); border: 1px solid hsl(0, 80%, 55%); color: #fff; font-weight: 700;';
        
    actionsRow.innerHTML = `
        <button type="button" class="btn-secondary" onclick="openExerciseModal('${activeWorkout.id}')" style="font-size: 0.72rem; padding: 6px 12px; display: flex; align-items: center; gap: 4px; border-radius: 6px;"><i data-lucide="plus" style="width: 13px; height: 13px;"></i> Add Exercício</button>
        <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-danger btn-sm" onclick="deleteWorkout('${activeWorkout.id}')" style="font-size: 0.72rem; padding: 6px 10px; border-radius: 6px; background: transparent; border: 1px solid var(--danger); color: var(--danger);">Excluir Treino</button>
            <button type="button" class="btn-primary" onclick="completeWorkout('${activeWorkout.id}')" style="font-size: 0.75rem; padding: 6px 14px; border-radius: 6px; ${completeBtnStyle}" ${alreadyCompletedToday ? 'disabled' : ''}>${completeBtnText}</button>
        </div>
    `;
    contentContainer.appendChild(actionsRow);
    
    safeCreateIcons();
}

function selectWorkoutTab(id) {
    state.body.activeWorkoutId = id;
    renderBodyWorkouts();
}

function updateExerciseWeight(workoutId, idx, val) {
    const workouts = state.body.workouts || [];
    const workout = workouts.find(w => w.id === workoutId);
    if (workout && workout.exercises[idx]) {
        workout.exercises[idx].weight = parseFloat(val) || 0;
        saveData();
    }
}

function toggleExerciseCompletion(workoutId, idx) {
    const workouts = state.body.workouts || [];
    const workout = workouts.find(w => w.id === workoutId);
    if (workout && workout.exercises[idx]) {
        workout.exercises[idx].completed = !workout.exercises[idx].completed;
        saveData();
        renderBodyWorkouts();
        
        // Se concluiu todas e ainda não foi marcado hoje, sugere finalizar
        const allDone = workout.exercises.every(e => e.completed);
        const todayStr = new Date().toISOString().substring(0, 10);
        const alreadyCompletedToday = workout.completedDays && workout.completedDays.includes(todayStr);
        if (allDone && !alreadyCompletedToday) {
            setTimeout(() => {
                if (confirm(`Parabéns! Todos os exercícios do Treino ${workout.id} foram concluídos. Deseja finalizar o treino e registrar a frequência hoje?`)) {
                    completeWorkout(workoutId);
                }
            }, 150);
        }
    }
}

function completeWorkout(workoutId) {
    const workouts = state.body.workouts || [];
    const workout = workouts.find(w => w.id === workoutId);
    if (workout) {
        const todayStr = new Date().toISOString().substring(0, 10);
        if (!workout.completedDays) workout.completedDays = [];
        
        if (!workout.completedDays.includes(todayStr)) {
            workout.completedDays.push(todayStr);
            // Marcar todos os exercícios como concluídos para consistência visual
            workout.exercises.forEach(ex => ex.completed = true);
            
            saveData();
            renderBody();
            renderHome();
            alert(`Treino ${workout.id} concluído com sucesso! Registro de frequência atualizado na sua ficha. +15 pontos de treino no FlyScore! 💪🚀`);
        }
    }
}

// 5.1. Modais de Fichas e Treinos
function openWorkoutModal() {
    const modal = document.getElementById('modal-body-workout');
    if (modal) modal.classList.add('active');
}

function closeWorkoutModal() {
    const modal = document.getElementById('modal-body-workout');
    if (modal) modal.classList.remove('active');
}

function saveWorkout(event) {
    event.preventDefault();
    const letter = document.getElementById('workout-letter').value.trim().toUpperCase();
    const name = document.getElementById('workout-name').value.trim();
    const day = document.getElementById('workout-day').value;
    
    if (!letter || !name) return;
    
    if (!state.body.workouts) state.body.workouts = [];
    
    // Check duplication
    if (state.body.workouts.some(w => w.id === letter)) {
        alert(`O treino com o identificador '${letter}' já existe.`);
        return;
    }
    
    const newWorkout = {
        id: letter,
        name: name,
        day: day,
        completedDays: [],
        exercises: []
    };
    
    state.body.workouts.push(newWorkout);
    state.body.activeWorkoutId = letter;
    
    saveData();
    closeWorkoutModal();
    renderBodyWorkouts();
}

function deleteWorkout(id) {
    if (confirm(`Aviso: Isso irá excluir o Treino ${id} permanentemente. Deseja continuar?`)) {
        state.body.workouts = state.body.workouts.filter(w => w.id !== id);
        if (state.body.workouts.length > 0) {
            state.body.activeWorkoutId = state.body.workouts[0].id;
        } else {
            state.body.activeWorkoutId = '';
        }
        saveData();
        renderBodyWorkouts();
    }
}

// 5.2. Modais de Exercícios
function openExerciseModal(workoutId, idx = null) {
    const modal = document.getElementById('modal-body-exercise');
    if (!modal) return;
    
    modal.classList.add('active');
    document.getElementById('body-exercise-form').reset();
    
    document.getElementById('exercise-workout-id').value = workoutId;
    document.getElementById('exercise-index').value = idx !== null ? idx : '';
    
    const deleteBtn = document.getElementById('btn-delete-exercise');
    const title = document.getElementById('exercise-modal-title');
    
    if (idx !== null) {
        // Edit Mode
        title.textContent = 'Editar Exercício';
        if (deleteBtn) deleteBtn.classList.remove('hidden');
        
        const workout = state.body.workouts.find(w => w.id === workoutId);
        const ex = workout.exercises[idx];
        
        document.getElementById('exercise-name').value = ex.name;
        document.getElementById('exercise-sets').value = ex.sets;
        document.getElementById('exercise-reps').value = ex.reps;
        document.getElementById('exercise-weight').value = ex.weight;
    } else {
        // Add Mode
        title.textContent = 'Adicionar Exercício';
        if (deleteBtn) deleteBtn.classList.add('hidden');
    }
}

function closeExerciseModal() {
    const modal = document.getElementById('modal-body-exercise');
    if (modal) modal.classList.remove('active');
}

function saveExercise(event) {
    event.preventDefault();
    const workoutId = document.getElementById('exercise-workout-id').value;
    const indexStr = document.getElementById('exercise-index').value;
    
    const name = document.getElementById('exercise-name').value.trim();
    const sets = parseInt(document.getElementById('exercise-sets').value) || 3;
    const reps = parseInt(document.getElementById('exercise-reps').value) || 10;
    const weight = parseFloat(document.getElementById('exercise-weight').value) || 0;
    
    if (!name) return;
    
    const workout = state.body.workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    const exObj = { name, sets, reps, weight, completed: false };
    
    if (indexStr !== '') {
        // Edit existing
        const idx = parseInt(indexStr);
        const oldComp = workout.exercises[idx].completed;
        exObj.completed = oldComp; // keep completion state
        workout.exercises[idx] = exObj;
    } else {
        // Add new
        workout.exercises.push(exObj);
    }
    
    saveData();
    closeExerciseModal();
    renderBodyWorkouts();
}

function deleteExercise() {
    const workoutId = document.getElementById('exercise-workout-id').value;
    const indexStr = document.getElementById('exercise-index').value;
    
    if (indexStr === '') return;
    
    if (confirm('Deseja excluir este exercício?')) {
        const workout = state.body.workouts.find(w => w.id === workoutId);
        if (workout) {
            const idx = parseInt(indexStr);
            workout.exercises.splice(idx, 1);
            saveData();
            closeExerciseModal();
            renderBodyWorkouts();
        }
    }
}

// 6. Timer de Descanso de Academia (Visual, Sem Som)
let workoutRestIntervalId = null;
let workoutRestTimeRemaining = 0;

function startWorkoutRestTimer() {
    // Para cronômetro anterior se estiver ativo
    stopWorkoutRestTimer();
    
    const restTimerEl = document.getElementById('workout-rest-timer');
    const secondsDisplay = document.getElementById('rest-seconds-display');
    
    if (!restTimerEl || !secondsDisplay) return;
    
    workoutRestTimeRemaining = 60; // 60 segundos padrão de descanso
    secondsDisplay.textContent = `${workoutRestTimeRemaining}s`;
    restTimerEl.classList.remove('hidden');
    
    workoutRestIntervalId = setInterval(() => {
        if (workoutRestTimeRemaining > 1) {
            workoutRestTimeRemaining--;
            secondsDisplay.textContent = `${workoutRestTimeRemaining}s`;
        } else {
            // Tempo esgotado
            stopWorkoutRestTimer();
            // Alerta visual discreto piscando a tela do temporizador
            const flashTimer = document.createElement('div');
            flashTimer.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;font-weight:bold;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:pulse 1s infinite;';
            flashTimer.innerHTML = '⏱️ Fim do Descanso! Hora de treinar!';
            document.body.appendChild(flashTimer);
            
            setTimeout(() => {
                flashTimer.remove();
            }, 3000);
        }
    }, 1000);
}

function stopWorkoutRestTimer() {
    if (workoutRestIntervalId) {
        clearInterval(workoutRestIntervalId);
        workoutRestIntervalId = null;
    }
    const restTimerEl = document.getElementById('workout-rest-timer');
    if (restTimerEl) {
        restTimerEl.classList.add('hidden');
    }
}

// Exportar funções novas no escopo window
window.addShoppingItem = addShoppingItem;
window.toggleShoppingItem = toggleShoppingItem;
window.deleteShoppingItem = deleteShoppingItem;
window.clearCheckedShoppingItems = clearCheckedShoppingItems;
window.openEsgFoodModal = openEsgFoodModal;
window.closeEsgFoodModal = closeEsgFoodModal;
window.saveEsgFood = saveEsgFood;
window.consumeFreshFood = consumeFreshFood;
window.wasteFreshFood = wasteFreshFood;
window.openWorkoutModal = openWorkoutModal;
window.closeWorkoutModal = closeWorkoutModal;
window.saveWorkout = saveWorkout;
window.deleteWorkout = deleteWorkout;
window.openExerciseModal = openExerciseModal;
window.closeExerciseModal = closeExerciseModal;
window.saveExercise = saveExercise;
window.deleteExercise = deleteExercise;
window.selectWorkoutTab = selectWorkoutTab;
window.updateExerciseWeight = updateExerciseWeight;
window.toggleExerciseCompletion = toggleExerciseCompletion;
window.completeWorkout = completeWorkout;
window.startWorkoutRestTimer = startWorkoutRestTimer;
window.stopWorkoutRestTimer = stopWorkoutRestTimer;

window.exportProjectsToWhatsApp = exportProjectsToWhatsApp;


