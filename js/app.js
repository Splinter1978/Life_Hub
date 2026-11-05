// ============================================
// IMPORTS / CONFIG
// ============================================
const STORAGE_KEYS = {
    tasks: 'lifehub_tasks',
    habits: 'lifehub_habits',
    theme: 'theme',
};

const TIMER_PRESETS = {
    work: { seconds: 25 * 60, label: 'Фокус', subtext: 'Час працювати!' },
    shortBreak: { seconds: 5 * 60, label: 'Коротка Пауза', subtext: 'Перепочинь трохи!' },
    longBreak: { seconds: 15 * 60, label: 'Довгий Відпочинок', subtext: 'Час розслабитися!' },
};

const CATEGORY_LABELS = {
    health: "Здоров'я",
    mind: 'Розум',
    work: 'Продуктивність',
};

const QUOTES = [
    { text: 'Найкращий спосіб передбачити майбутнє — створити його.', author: 'Пітер Друкер' },
    { text: 'Складні речі робляться легко, якщо робити їх поступово.', author: 'Конфуцій' },
    { text: 'Ваш час обмежений, тому не витрачайте його на чуже життя.', author: 'Стів Джобс' },
    { text: 'Успіх — це здатність рухатися від однієї невдачі до іншої, не втрачаючи ентузіазму.', author: 'Вінстон Черчілль' },
    { text: 'Дисципліна — це міст між цілями та досягненнями.', author: 'Джим Рон' },
];

const TIMER_CIRCUMFERENCE = 2 * Math.PI * 42;

// ============================================
// STATE
// ============================================
const state = {
    tasks: JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks)) ?? [
        { id: 1, text: 'Опланувати робочий тиждень', completed: true },
        { id: 2, text: 'Прочитати 15 сторінок книги', completed: false },
        { id: 3, text: 'Провести тренування', completed: false },
    ],
    habits: JSON.parse(localStorage.getItem(STORAGE_KEYS.habits)) ?? [
        { id: 1, title: 'Питний режим (2L)', streak: 5, doneToday: false, category: 'health' },
        { id: 2, title: 'Медитація 10 хв', streak: 12, doneToday: true, category: 'mind' },
    ],
    filter: 'all',
    timer: {
        intervalId: null,
        timeLeft: TIMER_PRESETS.work.seconds,
        totalTime: TIMER_PRESETS.work.seconds,
        isRunning: false,
        mode: 'work',
    },
};

// ============================================
// DOM HELPERS
// ============================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const els = {
    date: $('#current-date'),
    themeToggle: $('#theme-toggle'),
    // Timer
    timerDisplay: $('#timer-display'),
    timerSubtext: $('#timer-subtext'),
    timerModeLabel: $('#timer-mode-label'),
    timerProgress: $('#timer-progress'),
    startBtn: $('#start-timer-btn'),
    pauseBtn: $('#pause-timer-btn'),
    resetBtn: $('#reset-timer-btn'),
    // Tasks
    taskForm: $('#add-task-form'),
    taskInput: $('#task-input'),
    tasksList: $('#tasks-list'),
    tasksStats: $('#tasks-stats'),
    tasksProgressBar: $('#tasks-progress-bar'),
    // Habits
    habitsGrid: $('#habits-grid'),
    habitModal: $('#habit-modal'),
    habitForm: $('#add-habit-form'),
    habitTitleInput: $('#habit-title-input'),
    habitCategoryInput: $('#habit-category-input'),
    addHabitBtn: $('#add-habit-btn'),
    closeHabitModalBtn: $('#close-habit-modal'),
    cancelHabitBtn: $('#cancel-habit-btn'),
    // Quote
    quoteText: $('#quote-text'),
    quoteAuthor: $('#quote-author'),
    newQuoteBtn: $('#new-quote-btn'),
};

// ============================================
// UTILS
// ============================================
const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const persist = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const triggerConfetti = () => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
};

const saveTasks = () => persist(STORAGE_KEYS.tasks, state.tasks);
const saveHabits = () => persist(STORAGE_KEYS.habits, state.habits);

// ============================================
// DATE
// ============================================
const updateDateDisplay = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('uk-UA', options);
    els.date.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
};

// ============================================
// THEME
// ============================================
const applyTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    persist(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
};

const initTheme = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
};

const handleThemeToggle = () => {
    const isDark = !document.documentElement.classList.contains('dark');
    applyTheme(isDark);
};

// ============================================
// TASKS
// ============================================
const getFilteredTasks = () => {
    const { tasks, filter } = state;
    if (filter === 'active') return tasks.filter((t) => !t.completed);
    if (filter === 'completed') return tasks.filter((t) => t.completed);
    return tasks;
};

const createTaskElement = (task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' task-item-completed' : ''}`;

    const checkboxClass = task.completed
        ? 'task-checkbox task-checkbox-checked'
        : 'task-checkbox';

    li.innerHTML = `
        <div class="task-left">
            <button class="${checkboxClass}" data-action="toggle" data-id="${task.id}">
                ${task.completed ? '<i data-lucide="check" class="task-check-icon"></i>' : ''}
            </button>
            <span class="task-text${task.completed ? ' task-text-completed' : ''}">
                ${escapeHtml(task.text)}
            </span>
        </div>
        <button class="task-delete-btn" data-action="delete" data-id="${task.id}">
            <i data-lucide="trash-2"></i>
        </button>
    `;
    return li;
};

const renderTasks = () => {
    const filtered = getFilteredTasks();
    els.tasksList.innerHTML = '';

    if (filtered.length === 0) {
        els.tasksList.innerHTML = `<li class="tasks-empty">Немає завдань у цій категорії.</li>`;
    } else {
        filtered.forEach((task) => els.tasksList.appendChild(createTaskElement(task)));
    }

    updateTaskStats();
    saveTasks();
    lucide.createIcons();
};

const updateTaskStats = () => {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    els.tasksStats.textContent = `Виконано: ${done} з ${total}`;
    els.tasksProgressBar.style.width = `${percent}%`;
};

const handleAddTask = (event) => {
    event.preventDefault();
    const text = els.taskInput.value.trim();
    if (!text) return;

    state.tasks.push({ id: Date.now(), text, completed: false });
    els.taskInput.value = '';
    renderTasks();
};

const toggleTask = (id) => {
    state.tasks = state.tasks.map((task) => {
        if (task.id !== id) return task;
        const updated = { ...task, completed: !task.completed };
        if (updated.completed) triggerConfetti();
        return updated;
    });
    renderTasks();
};

const deleteTask = (id) => {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    renderTasks();
};

const filterTasks = (filter) => {
    state.filter = filter;

    $$('[data-filter]').forEach((btn) => {
        btn.classList.toggle('filter-btn-active', btn.dataset.filter === filter);
    });

    renderTasks();
};

// ============================================
// HABITS
// ============================================
const createHabitElement = (habit) => {
    const card = document.createElement('div');
    card.className = `habit-card${habit.doneToday ? ' habit-card-done' : ''}`;

    const toggleClass = habit.doneToday
        ? 'habit-toggle-btn habit-toggle-btn-done'
        : 'habit-toggle-btn';

    card.innerHTML = `
        <div class="habit-header">
            <div>
                <h3 class="habit-title">${escapeHtml(habit.title)}</h3>
                <span class="habit-category">${CATEGORY_LABELS[habit.category] ?? CATEGORY_LABELS.work}</span>
            </div>
            <button class="habit-delete-btn" data-action="delete-habit" data-id="${habit.id}">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="habit-footer">
            <div class="habit-streak">
                <i data-lucide="flame"></i> ${habit.streak} днів поспіль
            </div>
            <button class="${toggleClass}" data-action="toggle-habit" data-id="${habit.id}">
                ${habit.doneToday ? 'Виконано ✓' : 'Відмітити'}
            </button>
        </div>
    `;
    return card;
};

const renderHabits = () => {
    els.habitsGrid.innerHTML = '';
    state.habits.forEach((habit) => els.habitsGrid.appendChild(createHabitElement(habit)));

    saveHabits();
    lucide.createIcons();
};

const toggleHabit = (id) => {
    state.habits = state.habits.map((habit) => {
        if (habit.id !== id) return habit;
        const doneToday = !habit.doneToday;
        const streak = doneToday ? habit.streak + 1 : Math.max(0, habit.streak - 1);
        if (doneToday) triggerConfetti();
        return { ...habit, doneToday, streak };
    });
    renderHabits();
};

const deleteHabit = (id) => {
    state.habits = state.habits.filter((habit) => habit.id !== id);
    renderHabits();
};

const handleAddHabit = (event) => {
    event.preventDefault();
    const title = els.habitTitleInput.value.trim();
    const category = els.habitCategoryInput.value;
    if (!title) return;

    state.habits.push({ id: Date.now(), title, streak: 0, doneToday: false, category });
    els.habitTitleInput.value = '';
    closeHabitModal();
    renderHabits();
};

const openHabitModal = () => els.habitModal.classList.add('modal-backdrop-open');
const closeHabitModal = () => els.habitModal.classList.remove('modal-backdrop-open');

// ============================================
// TIMER
// ============================================
const updateTimerDisplay = () => {
    const { timeLeft, totalTime } = state.timer;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    els.timerDisplay.textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const offset = TIMER_CIRCUMFERENCE - (timeLeft / totalTime) * TIMER_CIRCUMFERENCE;
    els.timerProgress.style.strokeDashoffset = offset;
};

const tickTimer = () => {
    if (state.timer.timeLeft > 0) {
        state.timer.timeLeft -= 1;
        updateTimerDisplay();
        return;
    }

    pauseTimer();
    triggerConfetti();
    alert('Час вийшов! Чудова робота!');
};

const startTimer = () => {
    if (state.timer.isRunning) return;

    state.timer.isRunning = true;
    els.startBtn.classList.add('btn-hidden');
    els.pauseBtn.classList.remove('btn-hidden');

    state.timer.intervalId = setInterval(tickTimer, 1000);
};

const pauseTimer = () => {
    state.timer.isRunning = false;
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;

    els.startBtn.classList.remove('btn-hidden');
    els.pauseBtn.classList.add('btn-hidden');
};

const resetTimer = () => {
    pauseTimer();
    state.timer.timeLeft = state.timer.totalTime;
    updateTimerDisplay();
};

const setTimerMode = (mode) => {
    const preset = TIMER_PRESETS[mode];
    if (!preset) return;

    pauseTimer();
    state.timer.mode = mode;
    state.timer.totalTime = preset.seconds;
    state.timer.timeLeft = preset.seconds;

    els.timerModeLabel.textContent = preset.label;
    els.timerSubtext.textContent = preset.subtext;

    updateTimerDisplay();
};

// ============================================
// QUOTES
// ============================================
const getRandomQuote = () => {
    const index = Math.floor(Math.random() * QUOTES.length);
    const { text, author } = QUOTES[index];
    els.quoteText.textContent = `"${text}"`;
    els.quoteAuthor.textContent = `— ${author}`;
};

// ============================================
// EVENT BINDING
// ============================================
const bindEvents = () => {
    // Theme
    els.themeToggle.addEventListener('click', handleThemeToggle);

    // Timer
    els.startBtn.addEventListener('click', startTimer);
    els.pauseBtn.addEventListener('click', pauseTimer);
    els.resetBtn.addEventListener('click', resetTimer);
    $$('[data-timer-mode]').forEach((btn) => {
        btn.addEventListener('click', () => setTimerMode(btn.dataset.timerMode));
    });

    // Tasks — form submit
    els.taskForm.addEventListener('submit', handleAddTask);

    // Tasks — event delegation for toggle/delete
    els.tasksList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const id = Number(button.dataset.id);
        const { action } = button.dataset;

        if (action === 'toggle') toggleTask(id);
        if (action === 'delete') deleteTask(id);
    });

    // Tasks — filter buttons
    $$('[data-filter]').forEach((btn) => {
        btn.addEventListener('click', () => filterTasks(btn.dataset.filter));
    });

    // Habits — form submit
    els.habitForm.addEventListener('submit', handleAddHabit);

    // Habits — event delegation
    els.habitsGrid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const id = Number(button.dataset.id);
        const { action } = button.dataset;

        if (action === 'toggle-habit') toggleHabit(id);
        if (action === 'delete-habit') deleteHabit(id);
    });

    // Habits — modal
    els.addHabitBtn.addEventListener('click', openHabitModal);
    els.closeHabitModalBtn.addEventListener('click', closeHabitModal);
    els.cancelHabitBtn.addEventListener('click', closeHabitModal);
    els.habitModal.addEventListener('click', (event) => {
        if (event.target === els.habitModal) closeHabitModal();
    });

    // Quote
    els.newQuoteBtn.addEventListener('click', getRandomQuote);
};

// ============================================
// INIT
// ============================================
const init = () => {
    lucide.createIcons();
    initTheme();
    updateDateDisplay();
    renderTasks();
    renderHabits();
    updateTimerDisplay();
    getRandomQuote();
    bindEvents();
};

document.addEventListener('DOMContentLoaded', init);