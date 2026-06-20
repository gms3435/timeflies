// TEMPUSFLOW - STATE & DATA MANAGEMENT

// Default Seed Data
const DEFAULT_BLOCKS = [];
const DEFAULT_TASKS = [];

const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const currentDayIndex = new Date().getDay();

// App State
let state = {
    blocks: [],
    tasks: [],
    projects: [], // Novo
    finances: {
        expenses: [],
        incomes: [],
        fixedExpenses: [],
        cardSettings: { limit: 3000, closingDay: 5, dueDay: 12, name: 'Cartão Principal' }
    }, // Reestruturado
    currentFilter: 'all',
    currentDayFilter: 'all', // 'all', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom', 'none'
    currentDay: DAY_KEYS[currentDayIndex],
    theme: 'dark',
    taskView: 'list', // 'list' ou 'priorities'
    alarmsActive: true,
    currentFinanceMonth: new Date().toISOString().substring(0, 7), // Novo: YYYY-MM
    currentFinanceSubTab: 'dashboard' // Novo: 'dashboard', 'cash', 'card', 'income', 'fixed'
};

// CHART VARIABLES
let timeChart = null;
let priorityChart = null;
let financeCategoryChart = null; // Novo

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
}

// UI ELEMENTS
const elements = {
    timeline: document.getElementById('daily-timeline'),
    tasksContainer: document.getElementById('tasks-list-container'),
    themeToggle: document.getElementById('theme-toggle'),
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
    
    // Export
    btnExportWhatsApp: document.getElementById('btn-export-whatsapp'),

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
    
    // Exibir Tela de Bloqueio na inicialização
    const lockOverlay = document.getElementById('lock-screen-overlay');
    if (lockOverlay) {
        lockOverlay.classList.add('active');
        const lockTitle = document.getElementById('lock-title');
        const lockDesc = document.getElementById('lock-desc');
        const lockReset = document.getElementById('lock-reset-section');
        
        if (state.hasPassword) {
            if (lockTitle) lockTitle.textContent = "TimeFlies Seguro";
            if (lockDesc) lockDesc.textContent = "Insira sua senha de acesso local para entrar.";
            if (lockReset) lockReset.classList.remove('hidden');
        } else {
            if (lockTitle) lockTitle.textContent = "Configurar Senha Local";
            if (lockDesc) lockDesc.textContent = "Crie uma senha de acesso local para proteger seus dados no celular.";
            if (lockReset) lockReset.classList.add('hidden');
        }
    }
}

function saveData() {
    try {
        localStorage.setItem('tempus_theme', state.theme);
        localStorage.setItem('tempus_has_password', state.hasPassword ? 'true' : 'false');
        
        if (state.hasPassword && userDecryptionKey) {
            // Payload completo que vai para o LocalStorage de forma cifrada
            const payload = {
                blocks: state.blocks,
                tasks: state.tasks,
                projects: state.projects || [],
                finances: state.finances || {},
                taskView: state.taskView,
                alarmsActive: state.alarmsActive
            };
            
            // Criptografa o JSON do payload usando a senha em memória
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), userDecryptionKey).toString();
            localStorage.setItem('tempus_secure_payload', encrypted);
        } else if (!state.hasPassword) {
            // Salva sem criptografia se não tiver senha
            localStorage.setItem('tempus_blocks', JSON.stringify(state.blocks));
            localStorage.setItem('tempus_tasks', JSON.stringify(state.tasks));
            localStorage.setItem('tempus_projects', JSON.stringify(state.projects || []));
            localStorage.setItem('tempus_finances', JSON.stringify(state.finances || {}));
            localStorage.setItem('tempus_alarms', state.alarmsActive);
            localStorage.setItem('tempus_view', state.taskView);
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
        try {
            savedBlocks = localStorage.getItem('tempus_blocks');
            savedTasks = localStorage.getItem('tempus_tasks');
            savedFinances = localStorage.getItem('tempus_finances');
            savedProjects = localStorage.getItem('tempus_projects');
            savedAlarms = localStorage.getItem('tempus_alarms');
            savedView = localStorage.getItem('tempus_view');
        } catch (e) {}
        
        state.blocks = savedBlocks ? JSON.parse(savedBlocks) : DEFAULT_BLOCKS;
        state.tasks = savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS;
        state.projects = savedProjects ? JSON.parse(savedProjects) : [];
        try {
            state.finances = savedFinances ? JSON.parse(savedFinances) : {};
        } catch (e) {
            state.finances = {};
        }
        state.alarmsActive = savedAlarms !== 'false';
        state.taskView = savedView === 'priorities' ? 'priorities' : 'list';
        
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
                
                state.blocks = parsed.blocks || [];
                state.tasks = parsed.tasks || [];
                state.projects = parsed.projects || [];
                state.finances = parsed.finances || {};
                state.taskView = parsed.taskView || 'list';
                state.alarmsActive = parsed.alarmsActive !== false;
                
                // Executa migração
                migrateFinanceAndProjectData();
            } catch (e) {
                console.error("Erro na descriptografia:", e);
                return false; // Senha incorreta ou dados corrompidos
            }
        } else {
            // Inicializa dados vazios
            state.blocks = DEFAULT_BLOCKS;
            state.tasks = DEFAULT_TASKS;
            state.projects = [];
            state.finances = {
                expenses: [],
                incomes: [],
                fixedExpenses: [],
                cardSettings: { limit: 3000, closingDay: 5, dueDay: 12, name: 'Cartão Principal' }
            };
            state.taskView = 'list';
            state.alarmsActive = true;
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

    // Theme Toggle
    elements.themeToggle.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        saveData();
        updateChartTheme();
    });

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
    
    // WhatsApp Export Button
    if (elements.btnExportWhatsApp) {
        elements.btnExportWhatsApp.addEventListener('click', exportToWhatsApp);
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

// RENDERING FUNCTIONS
function renderAll() {
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
    renderProjects(); // Renderiza projetos e estudos
    renderFinances(); // Renderiza lançamentos financeiros locais
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
        taskCard.className = `task-item cat-${task.category} ${task.completed ? 'completed' : ''}`;
        
        // Priority tag name in Portuguese
        const priorityLabels = { low: 'Baixa', medium: 'Média', high: 'Alta' };
        
        const taskProgress = task.progress !== undefined ? task.progress : (task.completed ? 100 : 0);
        
        taskCard.innerHTML = `
            <div class="task-header">
                <button class="btn-checkbox" onclick="toggleTaskCompletion('${task.id}', event)">
                    <i data-lucide="check" style="width:12px; height:12px;"></i>
                </button>
                <div class="task-info" onclick="openTaskModal('${task.id}')">
                    <span class="task-title">${task.title}</span>
                    ${task.desc ? `<p class="task-desc">${task.desc}</p>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-task-action" onclick="openTaskModal('${task.id}', event)" title="Editar">
                        <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
                    </button>
                    <button class="btn-task-action delete" onclick="deleteTaskDirect('${task.id}', event)" title="Excluir">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                </div>
            </div>
            <div class="task-progress-wrapper" onclick="openTaskModal('${task.id}')" style="cursor: pointer; margin-left: 32px;">
                <div class="task-progress-bar">
                    <div class="task-progress-fill" style="width: ${taskProgress}%"></div>
                </div>
                <span class="task-progress-text">${taskProgress}% concluído</span>
            </div>
            <div class="task-meta" onclick="openTaskModal('${task.id}')">
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
    
    elements.statsCommittedHours.textContent = `${(occupiedMins / 60).toFixed(1)}h`;
    elements.statsFreeHours.textContent = `${(freeMins / 60).toFixed(1)}h`;
    
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    elements.statsTasksCompleted.textContent = `${completedTasks}/${totalTasks}`;
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
        color: task.category
    };

    state.blocks.push(newBlock);
    
    // Set task's day to currentDay since it is now scheduled on this day
    task.day = state.currentDay;
    
    // Complete or update task reference if needed
    // In this case, we keep it as pending but it is now scheduled
    task.scheduledTime = `${startTime}-${endTime}`;
    
    saveData();
    renderAll();
    
    // Highlight suggestion was applied
    elements.assistantTaskSelect.value = '';
    renderSmartSuggestions('');
}

// CHARTS (Chart.js)
function renderCharts() {
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
            state.blocks[index] = { id, title, day: selectedDays[0], start, end, color };
        }
        // If more days are selected, create new blocks for those days
        for (let i = 1; i < selectedDays.length; i++) {
            const newBlock = {
                id: 'b_' + Date.now() + '_' + i,
                title,
                day: selectedDays[i],
                start,
                end,
                color
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
                color
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
                projectId: projectId || null
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
            projectId: projectId || null
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
    
    // Special trigger: re-render charts when switching to metrics tab
    if (tabId === 'tab-metrics') {
        renderCharts();
    }
};

// ============================================================
// EXPORTAÇÃO PARA WHATSAPP
// ============================================================
function exportToWhatsApp() {
    const DAY_NAMES = {
        seg: 'Segunda', ter: 'Terça', qua: 'Quarta',
        qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo'
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
        blocksText = dayBlocks.map(b => `  • ${b.start} às ${b.end}: ${b.title}`).join('\n');
    } else {
        blocksText = '  Nenhum compromisso agendado.';
    }

    // --- Tarefas pendentes ---
    const pendingTasks = state.tasks
        .filter(t => !t.completed)
        .sort((a, b) => {
            const pw = { high: 3, medium: 2, low: 1 };
            return pw[b.priority] - pw[a.priority];
        });

    let pendingText = '';
    if (pendingTasks.length > 0) {
        pendingText = pendingTasks.map(t => {
            const dl = t.deadline ? ` _(até ${formatDeadline(t.deadline, t.deadlineTime)})_` : '';
            return `  ☐ ${t.title}${dl}`;
        }).join('\n');
    } else {
        pendingText = '  Nenhuma tarefa pendente. 🎉';
    }

    // --- Tarefas concluídas ---
    const doneTasks = state.tasks.filter(t => t.completed);
    let doneText = '';
    if (doneTasks.length > 0) {
        doneText = doneTasks.map(t => `  ✅ ${t.title}`).join('\n');
    } else {
        doneText = '  Nenhuma tarefa concluída ainda.';
    }

    // --- Montar mensagem final ---
    const msg =
`⏱️ *TimeFlies — Resumo de ${dayLabel}* (${dateStr})

⏰ *Compromissos do Dia:*
${blocksText}

📝 *Tarefas Pendentes:*
${pendingText}

✅ *Tarefas Concluídas:*
${doneText}

_Gerado via TimeFlies — O Tempo Voa!_`;

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
    const todayIndex = new Date().getDay();
    const systemDay = DAY_KEYS[todayIndex];
    
    // Se o dia da semana no celular mudou desde a última renderização (ex: meia-noite passou ou app saiu de background)
    if (state.currentDay !== systemDay) {
        state.currentDay = systemDay;
        // Limpar bipes já tocados no dia anterior para permitir os novos de hoje
        notifiedBlocksToday = [];
        // Re-renderizar o aplicativo inteiro com a nova data atual
        renderAll();
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
    elements.timerDisplay.textContent = `${mins}:${secs}`;

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

    // Toggle Icon Play/Pause
    if (elements.timerPlayIcon) {
        if (timerStatus === 'running') {
            elements.timerPlayIcon.setAttribute('data-lucide', 'pause');
        } else {
            elements.timerPlayIcon.setAttribute('data-lucide', 'play');
        }
        safeCreateIcons();
    }
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
            card.className = `priority-task-card cat-${task.category}`;

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
                <div class="task-header" style="padding: 0; border: none; background: transparent; box-shadow: none;">
                    <button class="btn-checkbox" onclick="toggleTaskCompletion('${task.id}', event)">
                        <i data-lucide="check" style="width:12px; height:12px;"></i>
                    </button>
                    <div class="task-info" onclick="openTaskModal('${task.id}')" style="cursor: pointer;">
                        <span class="priority-task-title">${task.title}</span>
                    </div>
                </div>
                <div class="task-progress-wrapper" onclick="openTaskModal('${task.id}')" style="cursor: pointer; margin-left: 24px; margin-top: -2px;">
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${taskProgress}%"></div>
                    </div>
                    <span class="task-progress-text" style="min-width: 32px;">${taskProgress}%</span>
                </div>
                <div class="priority-task-meta">
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
            `;
            bodyDiv.appendChild(card);
        });
    });
}

function changeTaskPriority(taskId, newPriority) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.priority = newPriority;
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
                name, code, professor, type, status, studyGoal, grade, desc
            };
        }
    } else {
        const newProj = {
            id: 'p_' + Date.now(),
            name, code, professor, type, status, studyGoal, grade, desc
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
    
    const projects = state.projects || [];
    
    if (projects.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        if (remCountEl) remCountEl.textContent = '0';
        if (gpaEl) gpaEl.textContent = '0.00';
        if (hoursEl) hoursEl.textContent = '0.0h';
        return;
    }
    
    if (emptyMsg) emptyMsg.classList.add('hidden');
    
    let totalStudyMinutes = 0;
    
    // Sort projects: andamento first, then planejado, then concluído
    const statusWeight = { andamento: 3, planejado: 2, concluido: 1 };
    projects.sort((a, b) => statusWeight[b.status] - statusWeight[a.status]);
    
    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = `project-card border-${p.status}`;
        
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
                <div style="max-width: 70%;">
                    <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-main); margin:0;">${p.name}</h3>
                    ${p.code ? `<span style="font-size:0.7rem; color:var(--text-muted);">${p.code} ${p.professor ? `• Prof. ${p.professor}` : ''}</span>` : ''}
                </div>
                <span class="project-type-badge type-${p.type}">${typeLabels[p.type] || p.type}</span>
            </div>
            
            <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-muted);">
                <span class="project-status-dot status-${p.status}"></span>
                <span>${statusLabels[p.status] || p.status}</span>
                ${p.grade !== null && p.grade !== undefined ? `<span style="margin-left:auto; font-weight:700; color:var(--success);">Nota: ${p.grade.toFixed(1)}</span>` : ''}
            </div>
            
            <div class="project-progress-container" style="margin-top:4px;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
                    <span>Tarefas</span>
                    <span>${completedTasks}/${totalTasks} (${progress}%)</span>
                </div>
                <div class="task-progress-bar" style="height:6px; background:rgba(255,255,255,0.05);">
                    <div class="task-progress-fill" style="width: ${progress}%; background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);"></div>
                </div>
            </div>
            
            <div class="project-stats-mini" style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                <span>Meta Semanal: ${p.studyGoal || 0}h</span>
                <span>Horas de Estudo: <strong>${studyHrs}h</strong></span>
            </div>
            
            ${subtasksHtml}
            
            <div class="project-card-actions">
                <button type="button" class="btn-secondary btn-sm" onclick="openProjectModal('${p.id}')" style="padding:4px 8px; font-size:0.7rem; display:flex; align-items:center; gap:4px;">
                    <i data-lucide="edit-3" style="width:12px; height:12px;"></i> Editar
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Compute academics KPIs
    const remDisciplines = projects.filter(p => p.status !== 'concluido' && p.type === 'disciplina').length;
    if (remCountEl) remCountEl.textContent = remDisciplines;
    
    const gradedProjects = projects.filter(p => p.status === 'concluido' && p.grade !== null && p.grade !== undefined && p.grade !== '');
    const gpa = gradedProjects.length > 0 ? (gradedProjects.reduce((acc, p) => acc + parseFloat(p.grade), 0) / gradedProjects.length).toFixed(2) : '0.00';
    if (gpaEl) gpaEl.textContent = gpa;
    
    if (hoursEl) hoursEl.textContent = `${(totalStudyMinutes / 60).toFixed(1)}h`;
    
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
            desc
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
            currentInstallment: 1
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
    
    document.getElementById('fixed-expense-form').reset();
    document.getElementById('fixed-expense-id').value = '';
    document.getElementById('btn-delete-fixed-expense').classList.add('hidden');
    document.getElementById('fixed-expense-modal-title').textContent = 'Nova Despesa Fixa';
    
    if (id) {
        const item = (state.finances.fixedExpenses || []).find(f => f.id === id);
        if (item) {
            document.getElementById('fixed-expense-id').value = item.id;
            document.getElementById('fixed-expense-name').value = item.title;
            document.getElementById('fixed-expense-amount').value = item.amount;
            document.getElementById('fixed-expense-due-day').value = item.dueDay;
            document.getElementById('fixed-expense-desc').value = item.desc || '';
            
            document.getElementById('btn-delete-fixed-expense').classList.remove('hidden');
            document.getElementById('fixed-expense-modal-title').textContent = 'Editar Despesa Fixa';
        }
    }
    
    modal.classList.add('active');
}

function closeFixedExpenseModal() {
    const modal = document.getElementById('modal-fixed-expense');
    if (modal) modal.classList.remove('active');
}

function saveFixedExpense(event) {
    event.preventDefault();
    
    const id = document.getElementById('fixed-expense-id').value;
    const title = document.getElementById('fixed-expense-name').value.trim();
    const amount = parseFloat(document.getElementById('fixed-expense-amount').value);
    const dueDay = parseInt(document.getElementById('fixed-expense-due-day').value);
    const desc = document.getElementById('fixed-expense-desc').value.trim();
    
    if (!title || isNaN(amount) || amount <= 0 || isNaN(dueDay)) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    if (id) {
        const index = state.finances.fixedExpenses.findIndex(f => f.id === id);
        if (index !== -1) {
            state.finances.fixedExpenses[index] = {
                ...state.finances.fixedExpenses[index],
                title, amount, dueDay, desc
            };
        }
    } else {
        const newItem = {
            id: 'fx_' + Date.now(),
            title,
            amount,
            dueDay,
            desc,
            history: {} // Mapeia "YYYY-MM" -> boolean
        };
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
        saveData();
        renderAll();
    }
}

// Configurações do Cartão
function openCreditCardSettingsModal() {
    const modal = document.getElementById('modal-credit-card-settings');
    if (!modal) return;
    
    const settings = state.finances.cardSettings || { limit: 3000, closingDay: 5, dueDay: 12, name: 'Cartão Principal' };
    
    document.getElementById('card-settings-name').value = settings.name || 'Cartão Principal';
    document.getElementById('card-settings-limit').value = settings.limit || 3000;
    document.getElementById('card-settings-closing-day').value = settings.closingDay || 5;
    document.getElementById('card-settings-due-day').value = settings.dueDay || 12;
    
    modal.classList.add('active');
}

function closeCreditCardSettingsModal() {
    const modal = document.getElementById('modal-credit-card-settings');
    if (modal) modal.classList.remove('active');
}

function saveCreditCardSettings(event) {
    event.preventDefault();
    
    const name = document.getElementById('card-settings-name').value.trim() || 'Cartão Principal';
    const limit = parseFloat(document.getElementById('card-settings-limit').value) || 3000;
    const closingDay = parseInt(document.getElementById('card-settings-closing-day').value) || 5;
    const dueDay = parseInt(document.getElementById('card-settings-due-day').value) || 12;
    
    state.finances.cardSettings = { name, limit, closingDay, dueDay };
    
    saveData();
    closeCreditCardSettingsModal();
    renderAll();
}

// Lógica de Lançamentos de Cartão de Crédito por Fatura (Com parcelamentos)
// Retorna a lista de transações ativas na fatura do mês selecionado "YYYY-MM"
function getCardExpensesForInvoice(targetMonthStr) {
    const expenses = state.finances.expenses || [];
    const settings = state.finances.cardSettings || { closingDay: 5, dueDay: 12 };
    const closingDay = settings.closingDay;
    
    const invoiceExpenses = [];
    
    expenses.forEach(exp => {
        if (exp.method !== 'card') return;
        
        const [expY, expM, expD] = exp.date.split('-').map(Number);
        
        // Determina o mês de fatura original em que esta compra entra.
        // Se o dia da compra é MAIOR que o dia de fechamento, entra na fatura do mês subsequente.
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
        
        // Loop por cada parcela
        for (let i = 0; i < installmentsCount; i++) {
            // Calcula o mês de fatura desta parcela específica
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
    const settings = state.finances.cardSettings || { limit: 3000, closingDay: 5, dueDay: 12 };
    
    // 1. Receitas do mês
    const incomes = state.finances.incomes || [];
    const monthlyIncomes = incomes.filter(i => i.date.substring(0, 7) === targetMonth);
    const totalIncome = monthlyIncomes.reduce((acc, i) => acc + i.amount, 0);
    
    // 2. Gastos à Vista do mês
    const expenses = state.finances.expenses || [];
    const monthlyCash = expenses.filter(e => e.method === 'cash' && e.date.substring(0, 7) === targetMonth);
    const totalCash = monthlyCash.reduce((acc, e) => acc + e.amount, 0);
    
    // 3. Fatura do Cartão do mês (com parcelamentos)
    const cardExpenses = getCardExpensesForInvoice(targetMonth);
    const totalCard = cardExpenses.reduce((acc, e) => acc + e.installmentAmount, 0);
    
    // 4. Despesas Fixas do mês (somar todas as despesas fixas cadastradas)
    const fixedList = state.finances.fixedExpenses || [];
    const totalFixed = fixedList.reduce((acc, f) => acc + f.amount, 0);
    
    // 5. Atualizar KPIs do dashboard
    const incEl = document.getElementById('fin-dash-income');
    const cshEl = document.getElementById('fin-dash-cash');
    const crdEl = document.getElementById('fin-dash-card');
    const fxdEl = document.getElementById('fin-dash-fixed');
    
    if (incEl) incEl.textContent = `R$ ${totalIncome.toFixed(2).replace('.', ',')}`;
    if (cshEl) cshEl.textContent = `R$ ${totalCash.toFixed(2).replace('.', ',')}`;
    if (crdEl) crdEl.textContent = `R$ ${totalCard.toFixed(2).replace('.', ',')}`;
    if (fxdEl) fxdEl.textContent = `R$ ${totalFixed.toFixed(2).replace('.', ',')}`;
    
    // 6. Previsão de Saldo Final
    const totalExpenses = totalCash + totalCard + totalFixed;
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
    
    // 7. Limite do Cartão de Crédito
    const cardLimit = settings.limit || 3000;
    const limitLabelEl = document.getElementById('fin-dash-limit-label');
    const limitProgressEl = document.getElementById('fin-dash-limit-progress');
    const limitPercentEl = document.getElementById('fin-dash-limit-percent');
    const limitRemainingEl = document.getElementById('fin-dash-limit-remaining');
    
    if (limitLabelEl) {
        limitLabelEl.textContent = `R$ ${totalCard.toFixed(2).replace('.', ',')} / R$ ${cardLimit.toFixed(2).replace('.', ',')}`;
    }
    
    const limitUsagePct = Math.min(100, Math.round((totalCard / cardLimit) * 100)) || 0;
    if (limitProgressEl) {
        limitProgressEl.style.width = `${limitUsagePct}%`;
        if (limitUsagePct > 90) {
            limitProgressEl.style.background = 'var(--danger)';
        } else if (limitUsagePct > 70) {
            limitProgressEl.style.background = 'var(--warning)';
        } else {
            limitProgressEl.style.background = 'linear-gradient(90deg, var(--accent) 0%, var(--primary) 100%)';
        }
    }
    if (limitPercentEl) limitPercentEl.textContent = `${limitUsagePct}% utilizado`;
    if (limitRemainingEl) {
        const remaining = Math.max(0, cardLimit - totalCard);
        limitRemainingEl.textContent = `R$ ${remaining.toFixed(2).replace('.', ',')} disponível`;
    }
    
    // 8. Renderizar Gráfico de Categorias Financeiras usando Chart.js
    renderFinanceChart(monthlyCash, cardExpenses, fixedList);
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
        categoryTotals['Despesas Fixas'] = (categoryTotals['Despesas Fixas'] || 0) + f.amount;
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
    const targetMonth = state.currentFinanceMonth;
    const cardExpenses = getCardExpensesForInvoice(targetMonth).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const totalFatura = cardExpenses.reduce((acc, e) => acc + e.installmentAmount, 0);
    document.getElementById('finance-fatura-total').textContent = `R$ ${totalFatura.toFixed(2).replace('.', ',')}`;
    
    const settings = state.finances.cardSettings || { closingDay: 5, dueDay: 12 };
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
        transporte: 'Transporte', outros: 'Outros'
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
            
            tr.innerHTML = `
                <td data-label="Data Compra" style="padding: 10px; font-weight: 500;">${formattedDate}</td>
                <td data-label="Categoria" style="padding: 10px; color: var(--text-muted);">${categoriesLabels[item.category] || item.category}</td>
                <td data-label="Observação" style="padding: 10px; font-style: italic; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.desc || '-'}</td>
                <td data-label="Parcela" style="padding: 10px; text-align: center; color: var(--accent); font-weight: 600;">${item.installmentLabel}</td>
                <td data-label="Valor" style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-main);">R$ ${item.installmentAmount.toFixed(2).replace('.', ',')}</td>
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
            
            tr.innerHTML = `
                <td data-label="Pago" style="padding: 10px; text-align: center;">
                    <input type="checkbox" onchange="toggleFixedExpensePayment('${item.id}', event)" ${isPaid ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
                </td>
                <td data-label="Despesa" style="padding: 10px; font-weight: 500;">
                    ${item.title}
                    ${item.desc ? `<div style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal; font-style: italic;">${item.desc}</div>` : ''}
                </td>
                <td data-label="Vence Dia" style="padding: 10px; text-align: center; color: var(--text-muted); font-weight: 600;">Dia ${item.dueDay}</td>
                <td data-label="Valor" style="padding: 10px; text-align: right; font-weight: 700; color: var(--text-main);">R$ ${item.amount.toFixed(2).replace('.', ',')}</td>
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

