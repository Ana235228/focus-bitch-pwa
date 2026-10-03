// ===== FOCUS BITCH PWA v8 — Firebase Edition =====

let tasks = [];
let habits = [];
let practices = [];
let languages = [];
let words = [];
let langSessions = [];
let learned = [];
let dailyWord = null;

let activeTab = 'today';
let viewDayOffset = 0;
let practiceGoal = 30;
let selectedPracticeType = 'Yoga';
let openLangName = null;
let openTaskId = null;

const PRACTICE_TYPES = ['Yoga','Stretching','Gym','Boxing','Tennis','Run','Другое'];

const ONBOARDING_HABITS = [
  { emoji: '💊', name: 'Витамины' },
  { emoji: '💧', name: 'Вода 2 литра' },
  { emoji: '🧘', name: 'Йога 15 минут' },
  { emoji: '📖', name: 'Чтение 20 минут' },
  { emoji: '🚶', name: 'Прогулка' },
  { emoji: '😴', name: 'Сон до 23:00' },
  { emoji: '📵', name: 'Без соцсетей час' },
  { emoji: '🏃', name: 'Спорт 30 минут' },
  { emoji: '☕', name: 'Без кофе после 16:00' },
  { emoji: '🦷', name: 'Зубы 2 раза' }
];

const DICT = {
  'АНГЛИЙСКИЙ': [...(window.DICT_EN || []), ...(window.DICT_EN2 || [])],
  'АРМЯНСКИЙ': [...(window.DICT_HY || [])],
  'ГРУЗИНСКИЙ': [
    ['გამარჯობა','/гамарджо́ба/','здравствуйте'],['მადლობა','/мадло́ба/','спасибо'],
    ['დიახ','/диа́х/','да'],['არა','/а́ра/','нет'],
    ['გთხოვ','/гтхо́в/','пожалуйста'],['დილა მშვიდობისა','/ди́ла мшвидо́биса/','доброе утро'],
    ['ღამე მშვიდობისა','/га́ме мшвидо́биса/','доброй ночи'],['როგორ ხარ','/ро́гор хар/','как дела'],
    ['სიყვარული','/сикварю́ли/','любовь'],['ცხოვრება','/цховре́ба/','жизнь']
  ],
  'КИТАЙСКИЙ': [
    ['你好','nǐ hǎo / ниха́о/','привет'],['谢谢','xiè xie / сесе́/','спасибо'],
    ['是','shì / шы/','да'],['不','bù / бу/','нет'],
    ['请','qǐng / цин/','пожалуйста'],['早上好','zǎo shang hǎo / цзаоша́нха́о/','доброе утро'],
    ['晚安','wǎn ān / вана́нь/','спокойной ночи'],['你好吗','nǐ hǎo ma / ниха́о ма/','как дела'],
    ['爱','ài / ай/','любовь'],['生活','shēng huó / шэнхуо́/','жизнь']
  ]
};

const LANG_TEMPLATES = [
  { name: 'АНГЛИЙСКИЙ', goal: 'B1 → C1' },
  { name: 'АРМЯНСКИЙ', goal: 'алфавит + 500 слов' },
  { name: 'ГРУЗИНСКИЙ', goal: 'разговорный A2' },
  { name: 'КИТАЙСКИЙ', goal: 'HSK 3 → HSK 5' }
];

// ═══ FIRESTORE SYNC ═══
function userDoc() {
  if (!currentUser) return null;
  return fbDb.collection('users').doc(currentUser.uid);
}

function save() {
  if (!currentUser) return;
  const data = {
    tasks, habits, practices, languages, words,
    langSessions, learned, dailyWord, practiceGoal,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  userDoc().set(data, { merge: true }).catch(err => {
    console.error('Save error:', err);
  });
}

function loadFromCloud(data) {
  tasks = data.tasks || [];
  habits = data.habits || [];
  practices = data.practices || [];
  languages = data.languages || [];
  words = data.words || [];
  langSessions = data.langSessions || [];
  learned = data.learned || [];
  dailyWord = data.dailyWord || null;
  practiceGoal = data.practiceGoal || 30;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function viewDate() { const d = new Date(); d.setDate(d.getDate() + viewDayOffset); return d; }
function viewDateStr() { return viewDate().toISOString().slice(0, 10); }
function months(d) { return ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][d.getMonth()]; }
function shortDay(d) { return ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'][d.getDay()]; }
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function statsFor(dateStr) {
  const dt = tasks.filter(t => t.date === dateStr);
  return { done: dt.filter(t => t.done).length, total: dt.length };
}

function practiceMinFor(dateStr) {
  return practices.filter(p => p.date === dateStr).reduce((s, p) => s + p.minutes, 0);
}

function habitStreak(h) {
  if (!h.dates) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (h.dates[ds]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      if (i === 0) { d.setDate(d.getDate() - 1); continue; }
      break;
    }
  }
  return streak;
}

function progressPct() {
  const ds = viewDateStr();
  const s = statsFor(ds);
  const pMin = practiceMinFor(ds);
  const sessionsToday = langSessions.filter(x => x.date === ds);

  let score = 0, max = 0;
  if (s.total > 0) { score += (s.done / s.total) * 3; max += 3; }
  if (practices.length > 0) { score += Math.min(pMin / practiceGoal, 3); max += 2; }
  if (languages.length > 0) {
    if (sessionsToday.length > 0) score += 1;
    max += 1;
  }
  if (max === 0) return 0;
  return Math.round((score / max) * 100);
}

function computeStreak() {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    const dayTasks = tasks.filter(t => t.date === ds);
    const dayPractice = practices.filter(p => p.date === ds);
    const dayLang = langSessions.filter(x => x.date === ds);
    const dayHabit = habits.some(h => h.dates && h.dates[ds]);
    const tasksOk = dayTasks.length > 0 && dayTasks.every(t => t.done);
    const practiceOk = dayPractice.length > 0;
    const langOk = dayLang.length > 0;
    if (tasksOk || practiceOk || langOk || dayHabit) { streak++; d.setDate(d.getDate() - 1); }
    else { if (i === 0) { d.setDate(d.getDate() - 1); continue; } break; }
  }
  return streak;
}

function pickDailyWord() {
  if (languages.length === 0) return null;
  const myLangs = languages.map(l => l.name);
  const todayKey = todayStr();
  if (dailyWord && dailyWord.date === todayKey) return dailyWord;

  const pool = [];
  myLangs.forEach(lang => {
    const dict = DICT[lang] || [];
    dict.forEach(w => {
      const isLearned = learned.find(x => x.lang === lang && x.orig === w[0]);
      if (!isLearned) pool.push({ lang, orig: w[0], trans: w[1], mean: w[2] });
    });
  });

  if (pool.length === 0) return null;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  dailyWord = { date: todayKey, ...chosen };
  save();
  return dailyWord;
}

function markDailyWord(action) {
  if (!dailyWord) return;
  if (action === 'know') {
    learned.push({ lang: dailyWord.lang, orig: dailyWord.orig, trans: dailyWord.trans, mean: dailyWord.mean, date: todayStr() });
    dailyWord = null;
  } else {
    dailyWord = null;
  }
  save();
  renderAll();
}

function renderHeader() {
  const d = viewDate();
  let label;
  if (viewDayOffset === 0) label = 'СЕГОДНЯ';
  else if (viewDayOffset === -1) label = 'ВЧЕРА';
  else if (viewDayOffset === 1) label = 'ЗАВТРА';
  else label = shortDay(d);
  document.getElementById('dateLine').textContent = label + ', ' + d.getDate() + ' ' + months(d).toUpperCase();
}

function renderRing() {
  const pct = progressPct();
  const inner = document.getElementById('ringProgress');
  const outer = document.getElementById('ringOuter');
  const C = 2 * Math.PI * 42;
  const Co = 2 * Math.PI * 50;
  const innerPct = Math.min(pct, 100);
  inner.setAttribute('stroke-dasharray', ((innerPct/100)*C) + ' ' + C);
  if (pct > 100) {
    outer.style.display = '';
    const op = Math.min(pct - 100, 100);
    outer.setAttribute('stroke-dasharray', ((op/100)*Co) + ' ' + Co);
  } else {
    outer.style.display = 'none';
  }
  document.getElementById('ringPct').textContent = pct + '%';
}

function renderStreak() {
  const s = computeStreak();
  const word = (s % 10 === 1 && s % 100 !== 11) ? 'день' :
               ([2,3,4].includes(s % 10) && ![12,13,14].includes(s % 100)) ? 'дня' : 'дней';
  document.getElementById('streak').textContent = '🔥 ' + s + ' ' + word;
}

function renderPills() {
  const c = document.getElementById('pillsContainer');
  c.innerHTML = '';
  const vd = viewDate();
  const dow = vd.getDay();
  const monOff = dow === 0 ? -6 : 1 - dow;
  const todayS = todayStr();
  const viewS = viewDateStr();
  for (let i = 0; i < 7; i++) {
    const d = new Date(vd);
    d.setDate(vd.getDate() + monOff + i);
    const ds = d.toISOString().slice(0, 10);
    const btn = document.createElement('button');
    btn.className = 'pill';
    if (ds === viewS) btn.classList.add('active');
    if (ds === todayS) btn.classList.add('today');
    btn.innerHTML = '<span class="pill-day">' + shortDay(d) + '</span><span class="pill-num">' + d.getDate() + '</span>';
    (function(dateObj) {
      btn.onclick = function() {
        const t = new Date(); t.setHours(0,0,0,0);
        const dd = new Date(dateObj); dd.setHours(0,0,0,0);
        viewDayOffset = Math.round((dd - t) / 86400000);
        renderAll();
      };
    })(d);
    c.appendChild(btn);
  }
}

function renderContent() {
  const c = document.getElementById('content');
  if (activeTab === 'today') renderToday(c);
  else if (activeTab === 'tasks') renderTasks(c);
  else if (activeTab === 'habits') renderHabits(c);
  else if (activeTab === 'practice') renderPractice(c);
  else if (activeTab === 'language') renderLanguage(c);
}

function renderToday(c) {
  const ds = viewDateStr();
  const s = statsFor(ds);
  const pMin = practiceMinFor(ds);
  const dw = pickDailyWord();
  const yesterDate = new Date();
  yesterDate.setDate(yesterDate.getDate() - 1);
  const yesterKey = yesterDate.toISOString().slice(0, 10);
  const learnedYesterday = learned.filter(x => x.date === yesterKey);

  let wordHtml = '';
  if (dw) {
    wordHtml =
      '<div class="daily-card">' +
        '<div class="daily-label">СЛОВО ДНЯ · ' + escapeHtml(dw.lang) + '</div>' +
        '<div class="daily-word">' + escapeHtml(dw.orig) + '</div>' +
        '<div class="daily-trans">' + escapeHtml(dw.trans) + '</div>' +
        '<div class="daily-mean">' + escapeHtml(dw.mean) + '</div>' +
        '<div class="daily-buttons">' +
          '<button class="btn-accent" onclick="markDailyWord(\'know\')">ЗНАЮ</button>' +
          '<button class="btn-muted" onclick="markDailyWord(\'again\')">ПОВТОРИТЬ</button>' +
        '</div>' +
      '</div>';
  } else if (languages.length === 0) {
    wordHtml = '<div class="summary-line small" style="margin-top:20px">добавь язык во вкладке LANGUAGE, чтобы учить слова</div>';
  } else {
    wordHtml = '<div class="summary-line small" style="margin-top:20px">все слова из словаря выучены 🎉</div>';
  }

  let historyHtml = '';
  if (learnedYesterday.length > 0) {
    historyHtml = '<h3 class="mini-label" style="margin-top:30px">ВЧЕРА УЧИЛ</h3>';
    learnedYesterday.forEach(x => {
      historyHtml += '<div class="word-item">' +
        '<div class="word-orig">' + escapeHtml(x.orig) + '</div>' +
        '<div class="word-meta">' + escapeHtml(x.trans) + ' · ' + escapeHtml(x.mean) + '</div>' +
      '</div>';
    });
  }

  c.innerHTML =
    '<h2 class="section-title">СЕГОДНЯ</h2>' +
    '<div class="summary-line">' + s.done + ' из ' + s.total + ' задач</div>' +
    '<div class="summary-line">' + pMin + ' минут практики</div>' +
    '<div class="summary-line">Выучено слов: ' + learned.length + '</div>' +
    '<button class="quick-add" onclick="switchTab(\'tasks\')">+ добавить задачу</button>' +
    '<button class="quick-add" onclick="openPracticeModal()">+ добавить практику</button>' +
    '<button class="quick-add" onclick="switchTab(\'language\')">+ добавить язык</button>' +
    wordHtml +
    historyHtml;
}

function renderTasks(c) {
  const ds = viewDateStr();
  const dayTasks = tasks.filter(t => t.date === ds);
  c.innerHTML =
    '<h2 class="section-title">ЗАДАЧИ</h2>' +
    '<input type="text" class="task-input" id="taskInput" placeholder="Что нужно сделать..." autocomplete="off">' +
    '<div id="taskList"></div>';
  const list = document.getElementById('taskList');
  if (dayTasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-title">just start.</div><div class="empty-sub">добавь первую запись</div></div>';
  } else {
    dayTasks.forEach(t => {
      const row = document.createElement('div');
      row.className = 'task-row';
      
      const prio = t.prio === 'important' ? 'Важно' : 'Обычно';
      const prioLabel = t.prio === 'important' ? '<span class="meta-prio">⚡ ' + prio + '</span>' : prio;
      const dateLabel = t.date === todayStr() ? 'Сегодня' : 
                        (t.date === viewDateStr() ? 'выбранный день' : t.date);
      
      const expanded = openTaskId === t.id;
      
      row.innerHTML =
        '<div class="task-main">' +
          '<button class="task-check ' + (t.done ? 'done' : '') + '" data-check="' + t.id + '"></button>' +
          '<div class="task-body" data-expand="' + t.id + '">' +
            '<span class="task-text ' + (t.done ? 'done' : '') + '">' + escapeHtml(t.text) + '</span>' +
            '<div class="task-meta">' + dateLabel + ' · ' + prioLabel + '</div>' +
          '</div>' +
          '<button class="task-del" data-del="' + t.id + '">×</button>' +
        '</div>' +
        '<div class="task-expand' + (expanded ? ' open' : '') + '">' +
          '<div class="task-expand-label">Дата</div>' +
          '<div class="task-pills-row">' +
            '<button class="task-pill' + (t.date === todayStr() ? ' selected' : '') + '" data-date="' + t.id + '" data-val="' + todayStr() + '">Сегодня</button>' +
            '<button class="task-pill' + (t.date === tomorrowStr() ? ' selected' : '') + '" data-date="' + t.id + '" data-val="' + tomorrowStr() + '">Завтра</button>' +
          '</div>' +
          '<div class="task-expand-label">Приоритет</div>' +
          '<div class="task-pills-row">' +
            '<button class="task-pill prio' + (t.prio === 'important' ? ' selected' : '') + '" data-prio="' + t.id + '" data-val="important">Важно</button>' +
            '<button class="task-pill prio' + (t.prio !== 'important' ? ' selected' : '') + '" data-prio="' + t.id + '" data-val="normal">Обычно</button>' +
          '</div>' +
        '</div>';
      list.appendChild(row);
    });
  }
  
  const input = document.getElementById('taskInput');
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      tasks.push({ id: Date.now(), text: input.value.trim(), done: false, date: ds, prio: 'normal' });
      save(); renderAll();
      setTimeout(() => { const el = document.getElementById('taskInput'); if (el) el.focus(); }, 10);
    }
  });

  list.querySelectorAll('[data-check]').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.check;
      const t = tasks.find(x => x.id === id);
      if (t) { t.done = !t.done; save(); renderAll(); }
    };
  });

  list.querySelectorAll('[data-expand]').forEach(el => {
    el.onclick = () => {
      const id = +el.dataset.expand;
      openTaskId = openTaskId === id ? null : id;
      renderAll();
    };
  });

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = +btn.dataset.del;
      const t = tasks.find(x => x.id === id);
      if (t) openConfirm('Удалить задачу "<strong>' + escapeHtml(t.text) + '</strong>"?', () => {
        tasks = tasks.filter(x => x.id !== id);
        openTaskId = null;
        save(); renderAll();
      });
    };
  });

  list.querySelectorAll('[data-date]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = +btn.dataset.date;
      const val = btn.dataset.val;
      const t = tasks.find(x => x.id === id);
      if (t) { t.date = val; save(); renderAll(); }
    };
  });

  list.querySelectorAll('[data-prio]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = +btn.dataset.prio;
      const val = btn.dataset.val;
      const t = tasks.find(x => x.id === id);
      if (t) { t.prio = val; save(); renderAll(); }
    };
  });

  input.focus();
}

function renderHabits(c) {
  c.innerHTML =
    '<h2 class="section-title">ПРИВЫЧКИ</h2>' +
    '<input type="text" class="task-input" id="habitInput" placeholder="Название привычки..." autocomplete="off">' +
    '<button class="quick-add" id="onboardBtn" style="margin-bottom:16px">📚 Выбрать из готовых</button>' +
    '<div id="habitList"></div>';
  
  const list = document.getElementById('habitList');
  if (habits.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-title">пока пусто</div><div class="empty-sub">добавь первую привычку</div></div>';
  } else {
    const vd = viewDate();
    const dow = vd.getDay();
    const monOff = dow === 0 ? -6 : 1 - dow;
    const todayS = todayStr();
    
    habits.forEach(h => {
      const card = document.createElement('div');
      card.className = 'habit-card';
      
      const st = habitStreak(h);
      const streakHtml = st > 0 ? '🔥 ' + st : '';
      
      let daysHtml = '<div class="habit-days">';
      for (let i = 0; i < 7; i++) {
        const d = new Date(vd);
        d.setDate(vd.getDate() + monOff + i);
        const ds = d.toISOString().slice(0, 10);
        const done = h.dates && h.dates[ds];
        const isToday = ds === todayS;
        daysHtml +=
          '<div class="habit-day-col">' +
            '<div class="habit-day-label">' + shortDay(d) + '</div>' +
            '<button class="habit-check' + (done ? ' done' : '') + (isToday ? ' today' : '') + '" ' +
              'data-habit="' + h.id + '" data-date="' + ds + '"></button>' +
          '</div>';
      }
      daysHtml += '</div>';
      
      card.innerHTML =
        '<div class="habit-header">' +
          '<span class="habit-emoji">' + (h.emoji || '🎯') + '</span>' +
          '<span class="habit-name" data-edit="' + h.id + '">' + escapeHtml(h.name) + '</span>' +
          (streakHtml ? '<span class="habit-streak">' + streakHtml + '</span>' : '') +
          '<button class="habit-del" data-del="' + h.id + '">×</button>' +
        '</div>' +
        daysHtml;
      list.appendChild(card);
    });
  }
  
  const input = document.getElementById('habitInput');
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      habits.push({ id: Date.now(), name: input.value.trim(), emoji: '🎯', dates: {} });
      save(); renderAll();
      setTimeout(() => { const el = document.getElementById('habitInput'); if (el) el.focus(); }, 10);
    }
  });

  list.querySelectorAll('[data-habit]').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.habit;
      const ds = btn.dataset.date;
      const h = habits.find(x => x.id === id);
      if (h) {
        if (!h.dates) h.dates = {};
        if (h.dates[ds]) delete h.dates[ds];
        else h.dates[ds] = true;
        save(); renderAll();
      }
    };
  });

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.del;
      const h = habits.find(x => x.id === id);
      if (h) openConfirm('Удалить привычку "<strong>' + (h.emoji || '🎯') + ' ' + escapeHtml(h.name) + '</strong>"?', () => {
        habits = habits.filter(x => x.id !== id);
        save(); renderAll();
      });
    };
  });

  list.querySelectorAll('[data-edit]').forEach(el => {
    el.onclick = () => {
      const id = +el.dataset.edit;
      const h = habits.find(x => x.id === id);
      if (h) {
        const newName = prompt('Название привычки:', h.name);
        if (newName && newName.trim()) {
          h.name = newName.trim();
          save(); renderAll();
        }
      }
    };
  });

  document.getElementById('onboardBtn').onclick = () => showOnboarding(true);

  input.focus();
}

let confirmCallback = null;

function openConfirm(text, cb) {
  document.getElementById('confirmText').innerHTML = text;
  confirmCallback = cb;
  document.getElementById('confirmModal').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('open');
  confirmCallback = null;
}

let onboardingSelected = new Set();

function showOnboarding(fromSettings) {
  const overlay = document.getElementById('onboardingOverlay');
  if (!overlay) return;
  
  if (!fromSettings) {
    onboardingSelected = new Set();
  }
  
  const list = document.getElementById('onboardingList');
  list.innerHTML = '';
  
  ONBOARDING_HABITS.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.className = 'onboarding-item' + (onboardingSelected.has(h.name) ? ' selected' : '');
    btn.dataset.name = h.name;
    btn.innerHTML =
      '<span class="onboarding-emoji">' + h.emoji + '</span>' +
      '<span class="onboarding-text">' + escapeHtml(h.name) + '</span>' +
      '<span class="onboarding-check"></span>';
    btn.onclick = () => {
      if (onboardingSelected.has(h.name)) onboardingSelected.delete(h.name);
      else onboardingSelected.add(h.name);
      btn.classList.toggle('selected');
    };
    list.appendChild(btn);
  });
  
  const title = document.getElementById('onboardingTitle');
  const btn = document.getElementById('onboardingBtn');
  if (fromSettings) {
    title.textContent = 'ДОБАВИТЬ ИЗ ГОТОВЫХ';
    btn.textContent = 'ДОБАВИТЬ ВЫБРАННЫЕ';
  } else {
    title.textContent = 'ДОБРО ПОЖАЛОВАТЬ В FOCUS BITCH';
    btn.textContent = 'НАЧАТЬ';
  }
  
  document.getElementById('onboardingOverlay').style.display = 'block';
}

function finishOnboarding() {
  const fromSettings = document.getElementById('onboardingTitle').textContent === 'ДОБАВИТЬ ИЗ ГОТОВЫХ';
  
  ONBOARDING_HABITS.forEach(h => {
    if (onboardingSelected.has(h.name)) {
      const exists = habits.find(x => x.name === h.name);
      if (!exists) {
        habits.push({ id: Date.now() + Math.random(), name: h.name, emoji: h.emoji, dates: {} });
      }
    }
  });
  
  save();
  
  if (!fromSettings) {
    localStorage.setItem('fb_onboarding_done', 'true');
  }
  
  document.getElementById('onboardingOverlay').style.display = 'none';
  onboardingSelected = new Set();
  renderAll();
}

function renderPractice(c) {
  const ds = viewDateStr();
  const todayP = practices.filter(p => p.date === ds);
  const totalMin = todayP.reduce((s, p) => s + p.minutes, 0);
  c.innerHTML =
    '<h2 class="section-title">ПРАКТИКА</h2>' +
    '<div class="summary-line">Сегодня: ' + totalMin + ' мин</div>' +
    '<button class="quick-add" onclick="openPracticeModal()">+ добавить практику</button>' +
    '<h3 class="mini-label" style="margin-top:30px">СЕГОДНЯШНИЕ ЗАПИСИ</h3>' +
    '<div id="practiceList"></div>';
  const list = document.getElementById('practiceList');
  if (todayP.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:20px 0"><div class="empty-sub">сегодня ещё не было практики</div></div>';
  } else {
    todayP.forEach(p => {
      const div = document.createElement('div');
      div.className = 'task-item';
      div.innerHTML = '<span class="task-text">' + escapeHtml(p.type) + '</span>' +
        '<span class="task-prio">' + p.minutes + ' мин</span>' +
        '<button class="del-btn" data-id="' + p.id + '">×</button>';
      list.appendChild(div);
    });
  }
  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      practices = practices.filter(p => p.id !== id);
      save(); renderAll();
    };
  });
}

function openPracticeModal() {
  document.getElementById('modalPrType').value = '';
  document.getElementById('modalPrMin').value = '30';
  const pills = document.getElementById('modalPrPills');
  pills.innerHTML = '';
  PRACTICE_TYPES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'pill-btn' + (t === selectedPracticeType ? ' selected' : '');
    b.textContent = t;
    b.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedPracticeType = t;
      document.getElementById('modalPrType').value = t;
      document.querySelectorAll('#modalPrPills .pill-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
    };
    pills.appendChild(b);
  });
  document.getElementById('practiceModal').classList.add('open');
}

function closePracticeModal() {
  document.getElementById('practiceModal').classList.remove('open');
}

function savePracticeForm() {
  const t = document.getElementById('modalPrType').value.trim() || selectedPracticeType;
  const m = parseInt(document.getElementById('modalPrMin').value) || 30;
  practices.push({ id: Date.now(), type: t, minutes: m, date: viewDateStr() });
  save();
  closePracticeModal();
  renderAll();
}

function renderLanguage(c) {
  if (openLangName) {
    const lang = languages.find(l => l.name === openLangName);
    if (!lang) { openLangName = null; renderLanguage(c); return; }
    const dict = DICT[lang.name] || [];
    const learnedForLang = learned.filter(x => x.lang === lang.name);
    let dictHtml = '';
    dict.forEach(w => {
      const isLearned = learnedForLang.find(x => x.orig === w[0]);
      dictHtml += '<div class="word-item">' +
        '<div class="word-orig">' + escapeHtml(w[0]) + (isLearned ? ' <span style="color:#B8956A">✓</span>' : '') + '</div>' +
        '<div class="word-meta">' + escapeHtml(w[1]) + ' · ' + escapeHtml(w[2]) + '</div>' +
      '</div>';
    });

    const pct = dict.length > 0 ? Math.round((learnedForLang.length / dict.length) * 100) : 0;

    c.innerHTML =
      '<button class="quick-add" onclick="openLangName=null;renderAll()">← назад</button>' +
      '<h2 class="section-title" style="margin-top:20px">' + escapeHtml(lang.name) + '</h2>' +
      '<div class="lang-goal">' + escapeHtml(lang.goal) + '</div>' +
      '<div class="lang-bar" style="margin:20px 0 10px"><div class="lang-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="summary-line small">Выучено: ' + learnedForLang.length + ' из ' + dict.length + ' (' + pct + '%)</div>' +
      '<button class="quick-add" onclick="openLangEditModal()">+ изменить язык</button>' +
      '<h3 class="mini-label" style="margin-top:30px">СЛОВАРЬ (' + dict.length + ')</h3>' +
      dictHtml;
    return;
  }

  c.innerHTML = '<h2 class="section-title">ЯЗЫКИ</h2><div id="langList"></div>';
  const list = document.getElementById('langList');
  if (languages.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-title">пока пусто</div><div class="empty-sub">добавь языки ниже</div></div>';
  }
  const ds = viewDateStr();
  languages.forEach(l => {
    const sessionToday = langSessions.find(s => s.date === ds && s.lang === l.name);
    const dictSize = (DICT[l.name] || []).length;
    const learnedCount = learned.filter(x => x.lang === l.name).length;
    const pct = dictSize > 0 ? Math.round((learnedCount / dictSize) * 100) : 0;
    const div = document.createElement('div');
    div.className = 'lang-item';
    div.innerHTML =
      '<div class="lang-name">' + escapeHtml(l.name) + '</div>' +
      '<div class="lang-goal">' + escapeHtml(l.goal) + '</div>' +
      '<div class="lang-bar"><div class="lang-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="lang-meta">' + learnedCount + ' / ' + dictSize + ' слов · ' + pct + '%</div>' +
      '<button class="session-btn' + (sessionToday ? ' done' : '') + '" data-lang="' + escapeHtml(l.name) + '">' +
        (sessionToday ? '✓ занимался' : '○ занимался') + '</button>' +
      '<button class="del-btn" data-del="' + escapeHtml(l.name) + '" style="float:right;margin-top:-40px;font-size:22px">×</button>';
    div.onclick = (e) => {
      if (e.target.classList.contains('session-btn')) return;
      if (e.target.classList.contains('del-btn')) return;
      openLangName = l.name;
      renderAll();
    };
    div.style.cursor = 'pointer';
    list.appendChild(div);
  });
  list.querySelectorAll('.session-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.dataset.lang;
      const idx = langSessions.findIndex(s => s.date === ds && s.lang === name);
      if (idx >= 0) langSessions.splice(idx, 1);
      else langSessions.push({ date: ds, lang: name });
      save(); renderAll();
    };
  });
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const name = btn.dataset.del;
      languages = languages.filter(l => l.name !== name);
      words = words.filter(w => w.lang !== name);
      langSessions = langSessions.filter(s => s.lang !== name);
      save(); renderAll();
    };
  });
  const hdr = document.createElement('h3');
  hdr.className = 'mini-label';
  hdr.style.marginTop = '30px';
  hdr.textContent = 'ДОБАВИТЬ ЯЗЫК';
  c.appendChild(hdr);
  LANG_TEMPLATES.forEach(t => {
    const exists = languages.find(l => l.name === t.name);
    const btn = document.createElement('button');
    btn.className = 'quick-add';
    btn.textContent = (exists ? '✓ ' : '+ ') + t.name;
    btn.disabled = !!exists;
    if (exists) btn.style.opacity = '0.4';
    btn.onclick = () => {
      languages.push({ id: Date.now(), name: t.name, goal: t.goal, pct: 0, words: 0 });
      save(); renderAll();
    };
    c.appendChild(btn);
  });
}

function openLangEditModal() {
  const lang = languages.find(l => l.name === openLangName);
  if (!lang) return;
  document.getElementById('langModalTitle').textContent = lang.name;
  document.getElementById('modalLangGoal').value = lang.goal;
  document.getElementById('modalLangPct').value = lang.pct || 0;
  document.getElementById('modalLangWords').value = lang.words || 0;
  document.getElementById('langModal').classList.add('open');
}
function closeLangModal() {
  document.getElementById('langModal').classList.remove('open');
}
function saveLangForm() {
  const lang = languages.find(l => l.name === openLangName);
  if (!lang) return;
  lang.goal = document.getElementById('modalLangGoal').value;
  lang.pct = parseInt(document.getElementById('modalLangPct').value) || 0;
  lang.words = parseInt(document.getElementById('modalLangWords').value) || 0;
  save(); closeLangModal(); renderAll();
}

function openWordModal() { closeWordModal(); }
function closeWordModal() {}
function saveWordForm() {}

function openCalendarModal() {
  const cg = document.getElementById('calendarGrid');
  const vd = viewDate();
  const year = vd.getFullYear();
  const month = vd.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const viewS = viewDateStr();
  const todayS = todayStr();
  document.getElementById('calendarTitle').textContent = months(first).toUpperCase() + ' ' + year;
  cg.innerHTML = '';
  ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-label';
    el.textContent = d;
    cg.appendChild(el);
  });
  for (let i = 0; i < startDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    cg.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const ds = dt.toISOString().slice(0, 10);
    const btn = document.createElement('button');
    btn.className = 'cal-day';
    if (ds === viewS) btn.classList.add('active');
    if (ds === todayS) btn.classList.add('today');
    btn.textContent = d;
    btn.onclick = () => {
      const t = new Date(); t.setHours(0,0,0,0);
      const dd = new Date(dt); dd.setHours(0,0,0,0);
      viewDayOffset = Math.round((dd - t) / 86400000);
      closeCalendarModal();
      renderAll();
    };
    cg.appendChild(btn);
  }
  document.getElementById('calendarModal').classList.add('open');
}
function closeCalendarModal() {
  document.getElementById('calendarModal').classList.remove('open');
}
function jumpToToday() {
  viewDayOffset = 0;
  closeCalendarModal();
  renderAll();
}

function switchTab(t) {
  activeTab = t;
  openLangName = null;
  openTaskId = null;
  document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.tab === t));
  renderAll();
}

function renderAll() {
  renderHeader();
  renderRing();
  renderStreak();
  renderPills();
  renderContent();
}

// ═══════════════════════════════════════════
// ЗАПУСК: авторизация + синхронизация
// ═══════════════════════════════════════════

document.querySelectorAll('.tab').forEach(el => {
  el.onclick = () => switchTab(el.dataset.tab);
});
document.getElementById('prevWeek').onclick = () => { viewDayOffset -= 7; renderAll(); };
document.getElementById('nextWeek').onclick = () => { viewDayOffset += 7; renderAll(); };
document.getElementById('dateLine').onclick = openCalendarModal;
document.getElementById('dateLine').style.cursor = 'pointer';

document.getElementById('confirmYes').onclick = () => {
  if (confirmCallback) confirmCallback();
  closeConfirm();
};
document.getElementById('confirmNo').onclick = closeConfirm;
document.getElementById('confirmModal').onclick = (e) => {
  if (e.target.id === 'confirmModal') closeConfirm();
};

// Следим за состоянием авторизации
fbAuth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    hideAuthScreen();

    // Слушаем изменения в Firestore в реальном времени
    userDoc().onSnapshot(snapshot => {
      if (snapshot.exists) {
        loadFromCloud(snapshot.data());
      } else {
        // Первый вход — данных нет, покажем онбординг
        if (!localStorage.getItem('fb_onboarding_done')) {
          setTimeout(() => showOnboarding(false), 300);
        }
      }
      renderAll();
    }, err => {
      console.error('Firestore snapshot error:', err);
    });
  } else {
    currentUser = null;
    showAuthScreen();
  }
});