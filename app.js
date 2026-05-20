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
    theme: 'dark'
};

// CHART VARIABLE
let timeChart = null;

// UI ELEMENTS
const elements = {
    timeline: document.getElementById('daily-timeline'),
    tasksContainer: document.getElementById('tasks-list-container'),
    themeToggle: document.getElementById('theme-toggle'),
    btnResetData: document.getElementById('btn-reset-data'),
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
    btnExportWhatsApp: document.getElementById('btn-export-whatsapp')
};

// INITIALIZATION — usa 'load' para garantir que Chart.js e Lucide já carregaram
window.addEventListener('load', () => {
    loadData();
    initAppEvents();
    renderAll();
});

// LOAD & SAVE DATA (LocalStorage with fallback)
function loadData() {
    let savedBlocks, savedTasks, savedTheme;
    try {
        const currentVersion = localStorage.getItem('tempus_version');
        if (currentVersion !== '5') {
            localStorage.removeItem('tempus_blocks');
            localStorage.removeItem('tempus_tasks');
            localStorage.setItem('tempus_version', '5');
        }
        savedBlocks = localStorage.getItem('tempus_blocks');
        savedTasks = localStorage.getItem('tempus_tasks');
        savedTheme = localStorage.getItem('tempus_theme');
    } catch (e) {
        console.warn('localStorage is not available. Using memory storage.', e);
    }
    
    try {
        state.blocks = savedBlocks ? JSON.parse(savedBlocks) : DEFAULT_BLOCKS;
    } catch (e) {
        console.error('Error parsing saved blocks, resetting to default.', e);
        state.blocks = DEFAULT_BLOCKS;
    }
    
    try {
        state.tasks = savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS;
    } catch (e) {
        console.error('Error parsing saved tasks, resetting to default.', e);
        state.tasks = DEFAULT_TASKS;
    }
    
    // Migration/Data Sanity check for weekdays
    if (state.blocks) {
        state.blocks.forEach(block => {
            if (!block.day) block.day = state.currentDay;
        });
    }
    if (state.tasks) {
        state.tasks.forEach(task => {
            if (task.day === undefined) task.day = "";
        });
    }

    state.theme = savedTheme || 'dark';
    
    // Apply Theme
    document.documentElement.setAttribute('data-theme', state.theme);
}

function saveData() {
    try {
        localStorage.setItem('tempus_blocks', JSON.stringify(state.blocks));
        localStorage.setItem('tempus_tasks', JSON.stringify(state.tasks));
        localStorage.setItem('tempus_theme', state.theme);
    } catch (e) {
        console.warn('Could not save to localStorage.', e);
    }
}

// EVENTS BINDING
function initAppEvents() {
    // Reset Data
    if (elements.btnResetData) {
        elements.btnResetData.addEventListener('click', () => {
            if (confirm('Aviso: Isso irá apagar todas as tarefas e blocos salvos e restaurar os dados iniciais do aplicativo. Deseja continuar?')) {
                try {
                    localStorage.removeItem('tempus_blocks');
                    localStorage.removeItem('tempus_tasks');
                    localStorage.removeItem('tempus_theme');
                } catch (e) {}
                location.reload();
            }
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
    renderTasks();
    renderHeaderStats();
    renderCharts();
    renderAssistantDropdown();
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
        return;
    }
    const slots = calculateTimeSlots();
    
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

    const isDark = state.theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

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
}

function updateChartTheme() {
    if (typeof Chart !== 'undefined' && timeChart) {
        const isDark = state.theme === 'dark';
        timeChart.data.datasets[0].borderColor = isDark ? '#0f172a' : '#ffffff';
        timeChart.data.datasets[0].borderWidth = isDark ? 2 : 1;
        timeChart.update();
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
            elements.btnDeleteTask.classList.remove('hidden');
            elements.taskModalTitle.textContent = 'Editar Tarefa';
        }
    } else {
        const defaultDay = (state.currentDayFilter !== 'all' && state.currentDayFilter !== 'none') ? state.currentDayFilter : '';
        elements.taskDay.value = defaultDay;
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

    if (id) {
        // Edit existing
        const index = state.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            state.tasks[index] = { 
                ...state.tasks[index], 
                title, desc, category, priority, duration, deadline, deadlineTime, day 
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
            completed: false,
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

window.switchMainTab = function(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tab links
    document.querySelectorAll('.app-tab-link').forEach(link => {
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
