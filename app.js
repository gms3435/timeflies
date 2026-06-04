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
    currentFilter: 'all',
    currentDayFilter: 'all', // 'all', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom', 'none'
    currentDay: DAY_KEYS[currentDayIndex],
    theme: 'dark',
    taskView: 'list', // 'list' ou 'priorities'
    alarmsActive: true
};

// CHART VARIABLES
let timeChart = null;
let priorityChart = null;

// NOTIFIED BLOCKS TODAY (evita re-disparos no mesmo minuto)
let notifiedBlocksToday = [];

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
                finances: state.finances || [],
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
            localStorage.setItem('tempus_finances', JSON.stringify(state.finances || []));
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
        let savedBlocks, savedTasks, savedFinances, savedAlarms, savedView;
        try {
            savedBlocks = localStorage.getItem('tempus_blocks');
            savedTasks = localStorage.getItem('tempus_tasks');
            savedFinances = localStorage.getItem('tempus_finances');
            savedAlarms = localStorage.getItem('tempus_alarms');
            savedView = localStorage.getItem('tempus_view');
        } catch (e) {}
        
        state.blocks = savedBlocks ? JSON.parse(savedBlocks) : DEFAULT_BLOCKS;
        state.tasks = savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS;
        state.finances = savedFinances ? JSON.parse(savedFinances) : [];
        state.alarmsActive = savedAlarms !== 'false';
        state.taskView = savedView === 'priorities' ? 'priorities' : 'list';
        
        // Remove chaves antigas por segurança
        try {
            localStorage.removeItem('tempus_blocks');
            localStorage.removeItem('tempus_tasks');
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
                state.finances = parsed.finances || [];
                state.taskView = parsed.taskView || 'list';
                state.alarmsActive = parsed.alarmsActive !== false;
            } catch (e) {
                console.error("Erro na descriptografia:", e);
                return false; // Senha incorreta ou dados corrompidos
            }
        } else {
            // Inicializa dados vazios
            state.blocks = DEFAULT_BLOCKS;
            state.tasks = DEFAULT_TASKS;
            state.finances = [];
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
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
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
        '#a855f7', // Faculdade (Purple)
        '#06b6d4', // Trabalho (Cyan)
        '#f59e0b', // Casa (Amber)
        '#f43f5e', // Busy (Rose)
        '#10b981'  // Free (Emerald)
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
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#0f172a' : '#ffffff',
                    hoverOffset: 4
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
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw.toFixed(1)}h`;
                            }
                        }
                    }
                },
                cutout: '70%'
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
        '#ef4444', // Alta (Red)
        '#f59e0b', // Média (Amber)
        '#10b981'  // Baixa (Emerald)
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
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#0f172a' : '#ffffff',
                    hoverOffset: 4
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
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw} ${context.raw === 1 ? 'tarefa' : 'tarefas'}`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

function updateChartTheme() {
    if (typeof Chart !== 'undefined') {
        const isDark = state.theme === 'dark';
        if (timeChart) {
            timeChart.data.datasets[0].borderColor = isDark ? '#0f172a' : '#ffffff';
            timeChart.data.datasets[0].borderWidth = isDark ? 2 : 1;
            timeChart.update();
        }
        if (priorityChart) {
            priorityChart.data.datasets[0].borderColor = isDark ? '#0f172a' : '#ffffff';
            priorityChart.data.datasets[0].borderWidth = isDark ? 2 : 1;
            priorityChart.update();
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
                title, desc, category, priority, duration, deadline, deadlineTime, day, progress, completed 
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
            scheduledTime: null
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

// Expor novas ações financeiras e de segurança na janela
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.saveExpense = saveExpense;
window.clearAllExpenses = clearAllExpenses;
window.deleteExpense = deleteExpense;
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.changeAccessPassword = changeAccessPassword;
window.handleLockSubmit = handleLockSubmit;
window.resetAllAppData = resetAllAppData;

