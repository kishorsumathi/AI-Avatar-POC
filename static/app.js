// ── State ──────────────────────────────────────────────────────────────
const state = {
  currentCourseId: 'biology_101',
  currentModuleId: 1,
  currentModuleCount: 4,
  avatarState: 'idle',   // idle | thinking | talking
  isSpeaking: false,
  fullResponse: '',
};

// ── Avatar Controller ──────────────────────────────────────────────────
const Avatar = {
  container: null,
  card: null,
  statusBadge: null,
  statusText: null,

  init() {
    this.container   = document.getElementById('avatar-container');
    this.statusBadge = document.getElementById('status-badge');
    this.statusText  = document.getElementById('status-text');
  },

  setState(s) {
    state.avatarState = s;
    this.container.className   = `avatar-container ${s}`;
    this.statusBadge.className = `status-pill ${s}`;
    const labels = { idle: 'Ready', thinking: 'Thinking…', talking: 'Speaking' };
    this.statusText.textContent = labels[s] || s;
  },

  showMouthShape(shape) {
    ['mouth-closed', 'mouth-open-sm', 'mouth-open-md', 'mouth-open-lg'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === shape) {
        el.removeAttribute('style');          // make visible
      } else {
        el.setAttribute('style', 'display:none');
      }
    });
  },

  resetMouth() {
    this.showMouthShape('mouth-closed');
  },
};

// ── TTS / Lip Sync ─────────────────────────────────────────────────────
// onboundary is unreliable on macOS — drive mouth with setInterval instead.
// Weighted cycle: spends most time at sm/closed (natural resting positions),
// briefly peaks at lg for emphasis.
const TTS = {
  mouthCycle: [
    'mouth-open-sm', 'mouth-open-sm',
    'mouth-open-md',
    'mouth-open-lg',
    'mouth-open-md',
    'mouth-open-sm',
    'mouth-closed', 'mouth-closed',
  ],
  _interval: null,
  _cycleIdx: 0,
  preferredVoice: null,

  init() {
    if (!window.speechSynthesis) return;
    const pickVoice = () => {
      const voices = speechSynthesis.getVoices();
      this.preferredVoice =
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang === 'en-US') ||
        voices[0] || null;
    };
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  },

  _startMouthAnimation() {
    this._stopMouthAnimation();
    this._cycleIdx = 0;
    this._interval = setInterval(() => {
      Avatar.showMouthShape(this.mouthCycle[this._cycleIdx % this.mouthCycle.length]);
      this._cycleIdx++;
    }, 160);
  },

  _stopMouthAnimation() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    Avatar.resetMouth();
  },

  speak(text) {
    if (!window.speechSynthesis) { Avatar.setState('idle'); return; }
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.preferredVoice) utterance.voice = this.preferredVoice;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    // Start mouth immediately when synthesis is queued — avoids gap
    // where speech starts but mouth is still closed
    this._startMouthAnimation();
    Avatar.setState('talking');
    state.isSpeaking = true;

    utterance.onend = () => {
      this._stopMouthAnimation();
      state.isSpeaking = false;
      Avatar.setState('idle');
    };

    utterance.onerror = () => {
      this._stopMouthAnimation();
      state.isSpeaking = false;
      Avatar.setState('idle');
    };

    speechSynthesis.speak(utterance);
  },
};

// ── Course / Module UI ─────────────────────────────────────────────────
const CourseUI = {
  async load(courseId) {
    state.currentCourseId = courseId;
    const res = await fetch(`/api/course/${courseId}`);
    const course = await res.json();
    state.currentModuleCount = course.modules.length;

    // Build module tabs
    const tabsEl = document.getElementById('module-tabs');
    tabsEl.innerHTML = '';
    course.modules.forEach(mod => {
      const btn = document.createElement('button');
      btn.className = 'module-tab' + (mod.id === state.currentModuleId ? ' active' : '');
      btn.textContent = `M${mod.id}`;
      btn.title = mod.name;
      btn.onclick = () => this.selectModule(mod.id, course.modules.length);
      tabsEl.appendChild(btn);
    });

    await this.selectModule(state.currentModuleId, course.modules.length);
  },

  async selectModule(moduleId, total) {
    state.currentModuleId = moduleId;
    const res = await fetch(`/api/module/${state.currentCourseId}/${moduleId}`);
    const mod = await res.json();

    document.getElementById('module-name').textContent = mod.name;

    // Update tab active state
    document.querySelectorAll('.module-tab').forEach((btn, i) => {
      btn.classList.toggle('active', i + 1 === moduleId);
    });

    // Progress
    const pct = Math.round(((moduleId - 1) / total) * 100);
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-label').textContent = `Module ${moduleId}/${total}`;

    // Sample questions
    const sqEl = document.getElementById('sample-questions');
    sqEl.innerHTML = '';
    mod.sample_questions.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-chip';
      btn.innerHTML = `<span class="chip-icon">💬</span>${q}`;
      btn.onclick = () => {
        document.getElementById('question-input').value = q;
        submitQuestion();
      };
      sqEl.appendChild(btn);
    });
  },
};

// ── Q&A Streaming ──────────────────────────────────────────────────────
function submitQuestion() {
  const input = document.getElementById('question-input');
  const question = input.value.trim();
  if (!question || state.avatarState !== 'idle') return;

  input.value = '';
  state.fullResponse = '';

  const responseBox = document.getElementById('response-box');
  responseBox.innerHTML = '<span class="dot-typing"><span></span><span></span><span></span></span>';
  responseBox.classList.add('active');

  Avatar.setState('thinking');

  const url = `/api/stream?q=${encodeURIComponent(question)}&course_id=${state.currentCourseId}&module_id=${state.currentModuleId}`;
  const source = new EventSource(url);
  let firstToken = true;

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (firstToken) {
      responseBox.textContent = '';
      firstToken = false;
    }
    state.fullResponse += data.text;
    responseBox.textContent = state.fullResponse;
    responseBox.scrollTop = responseBox.scrollHeight;
  };

  source.addEventListener('done', () => {
    source.close();
    responseBox.classList.remove('active');
    addToHistory(question, state.fullResponse);
    TTS.speak(state.fullResponse);
  });

  source.addEventListener('error', (event) => {
    source.close();
    const data = event.data ? JSON.parse(event.data) : {};
    responseBox.textContent = data.error || 'Something went wrong. Please try again.';
    responseBox.classList.remove('active');
    Avatar.setState('idle');
  });

  source.onerror = () => {
    source.close();
    if (state.avatarState !== 'idle') {
      Avatar.setState('idle');
      responseBox.classList.remove('active');
    }
  };
}

// ── Q&A History ────────────────────────────────────────────────────────
function addToHistory(question, answer) {
  const history = document.getElementById('qa-history');
  const item = document.createElement('div');
  item.className = 'qa-item';
  item.innerHTML = `
    <div class="qa-q">
      <span class="qa-icon">💬</span>
      <span class="qa-q-text">${question}</span>
    </div>
    <div class="qa-a">${answer}</div>
  `;
  history.appendChild(item);
  item.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// ── Course selector ────────────────────────────────────────────────────
async function populateCourseSelector() {
  const res = await fetch('/api/courses');
  const courses = await res.json();
  const sel = document.getElementById('course-selector');
  sel.innerHTML = '';
  courses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.title} — ${c.subtitle}`;
    if (c.id === state.currentCourseId) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    state.currentModuleId = 1;
    document.getElementById('qa-history').innerHTML = '';
    document.getElementById('response-box').innerHTML = '<span class="response-placeholder">Professor Ada is ready to teach…</span>';
    CourseUI.load(sel.value);
  };
}

// ── Floating Particles ─────────────────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['#a78bfa', '#67e8f9', '#f9a8d4', '#93c5fd', '#86efac'];

  function spawn() {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 4 + Math.random() * 8;
    const left = 10 + Math.random() * 80;
    const duration = 6 + Math.random() * 8;
    const delay = Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${left}%; bottom: ${10 + Math.random() * 20}%;
      background:${color};
      animation-duration:${duration}s;
      animation-delay:${delay}s;
      border-radius:50%;
      opacity:0;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), (duration + delay) * 1000);
  }

  for (let i = 0; i < 12; i++) spawn();
  setInterval(spawn, 1400);
}

// ── Inline SVG so CSS + JS can manipulate internals ────────────────────
async function inlineSVG() {
  const res = await fetch('/static/avatar.svg');
  const svgText = await res.text();
  const wrap = document.getElementById('avatar-svg-wrap');
  wrap.innerHTML = svgText;
  const svg = wrap.querySelector('svg');
  if (svg) {
    svg.setAttribute('width', '190');
    svg.setAttribute('height', '257');
  }
}

// ── Boot ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await inlineSVG();
  Avatar.init();
  TTS.init();
  Avatar.setState('idle');

  // Enter key submits
  document.getElementById('question-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuestion();
    }
  });
  document.getElementById('ask-btn').onclick = submitQuestion;

  await populateCourseSelector();
  await CourseUI.load(state.currentCourseId);
});
