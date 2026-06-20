// ===========================
// CASA YUMA — ACADEMIA
// Module render engine
// ===========================
import { guardarModulo, getColaborador, getSession } from './firebase.js';

export async function renderModulo(MOD) {
  const session = getSession();
  if (!session.id) { window.location.href = 'colaborador-login.html'; return; }

  const app = document.getElementById('app');
  let slideIndex = 0;         // current content slide
  let enQuiz = false;
  let qIndex = 0;             // current question
  let respuestas = [];        // {correcta: bool} per question
  let yaGuardado = false;

  // Check if already completed (load existing score)
  let modData = null;
  try {
    const col = await getColaborador(session.id);
    modData = col?.modulos?.[MOD.key];
  } catch(e) {}

  const totalSlides = MOD.slides.length;

  function pct() {
    if (enQuiz) return Math.round(((totalSlides + qIndex) / (totalSlides + MOD.preguntas.length)) * 100);
    return Math.round((slideIndex / (totalSlides + MOD.preguntas.length)) * 100);
  }

  function render() {
    if (!enQuiz) renderSlide();
    else renderQuiz();
  }

  // ── SLIDES ──────────────────────────
  function renderSlide() {
    const slide = MOD.slides[slideIndex];
    const isLast = slideIndex === totalSlides - 1;

    app.innerHTML = `
      ${header()}
      <div class="slide-container">
        ${renderSlideContent(slide)}
      </div>
      <div class="bottom-nav">
        <div class="bottom-nav-inner">
          ${slideIndex > 0
            ? `<button class="btn-nav-back" onclick="window.navBack()">← Atrás</button>`
            : `<span></span>`
          }
          <button class="btn-nav-next" onclick="window.navNext()">
            ${isLast ? 'Ir al quiz →' : 'Siguiente →'}
          </button>
        </div>
      </div>
    `;
  }

  function renderSlideContent(slide) {
    if (slide.tipo === 'portada') {
      return `
        <div class="slide-portada">
          <span class="big-icon">${slide.imagen || MOD.icono}</span>
          <h1>${slide.titulo}</h1>
          <p>${slide.texto}</p>
        </div>`;
    }
    if (slide.tipo === 'dato') {
      return `
        <div class="slide-dato">
          <h2>${slide.titulo}</h2>
          <div class="dato-items">
            ${slide.items.map(it => `
              <div class="dato-item">
                <span class="dato-icon">${it.icono}</span>
                <span class="dato-text">${it.texto}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }
    if (slide.tipo === 'cita') {
      return `
        <div class="slide-cita">
          <div class="cita-box">
            <span class="cita-mark">"</span>
            <p class="cita-text">${slide.texto}</p>
          </div>
        </div>`;
    }
    if (slide.tipo === 'imagen-texto') {
      return `
        <div class="slide-dato">
          <h2>${slide.titulo}</h2>
          <p style="font-size:16px;line-height:1.8;color:var(--mid);">${slide.texto}</p>
        </div>`;
    }
    return `<div><p>${JSON.stringify(slide)}</p></div>`;
  }

  // ── QUIZ ────────────────────────────
  function renderQuiz() {
    if (qIndex >= MOD.preguntas.length) {
      renderResultado();
      return;
    }
    const q = MOD.preguntas[qIndex];
    const letras = ['A', 'B', 'C', 'D', 'E'];
    let respondido = false;

    app.innerHTML = `
      ${header()}
      <div class="slide-container">
        <div class="quiz-section">
          <div class="quiz-header">
            <div class="quiz-num">Pregunta ${qIndex + 1} de ${MOD.preguntas.length}</div>
            <div class="quiz-progress-row">
              ${MOD.preguntas.map((_, i) => `
                <div class="quiz-dot ${i < qIndex ? (respuestas[i]?.correcta ? 'done-ok' : 'done-fail') : i === qIndex ? 'active' : ''}"></div>
              `).join('')}
            </div>
            <div class="quiz-question">${q.pregunta}</div>
          </div>
          <div class="quiz-options" id="opts">
            ${q.opciones.map((op, i) => `
              <button class="quiz-option" onclick="window.responder(${i})" data-index="${i}">
                <span class="option-letter">${letras[i]}</span>
                ${op}
              </button>
            `).join('')}
          </div>
          <div class="quiz-feedback" id="feedback"></div>
        </div>
      </div>
      <div class="bottom-nav">
        <div class="bottom-nav-inner">
          <span></span>
          <button class="btn-nav-next" id="btnSig" disabled onclick="window.siguientePregunta()">Siguiente →</button>
        </div>
      </div>
    `;

    window.responder = function(idx) {
      if (respondido) return;
      respondido = true;

      const correcta = idx === q.correcta;
      respuestas.push({ correcta });

      const opts = document.querySelectorAll('.quiz-option');
      opts.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correcta) btn.classList.add('correct');
        else if (i === idx && !correcta) btn.classList.add('wrong');
      });

      const fb = document.getElementById('feedback');
      fb.classList.add('show', correcta ? 'correct' : 'wrong');
      fb.innerHTML = correcta
        ? `✅ <span>¡Correcto! Muy bien.</span>`
        : `❌ <span>No exactamente. La respuesta correcta es: <strong>${q.opciones[q.correcta]}</strong></span>`;

      document.getElementById('btnSig').disabled = false;

      // Update progress
      updateProgress();
    };

    window.siguientePregunta = function() {
      qIndex++;
      if (qIndex >= MOD.preguntas.length) renderResultado();
      else renderQuiz();
    };
  }

  // ── RESULTADO ───────────────────────
  async function renderResultado() {
    const correctas = respuestas.filter(r => r.correcta).length;
    const total = MOD.preguntas.length;
    const porcentaje = Math.round((correctas / total) * 100);

    let emoji, clase, msg;
    if (porcentaje >= 80) {
      emoji = '🎉'; clase = 'high';
      msg = '¡Excelente! Demostraste que conoces bien este tema. ¡Así se hace en La Marea!';
    } else if (porcentaje >= 60) {
      emoji = '👍'; clase = 'mid';
      msg = 'Buen intento. Hay algunos puntos que vale la pena repasar. Puedes volver a intentarlo cuando quieras.';
    } else {
      emoji = '📚'; clase = 'low';
      msg = 'Vamos a reforzar este tema. Te recomendamos revisar el módulo de nuevo antes de continuar. ¡Tú puedes!';
    }

    // Save to Firebase
    if (!yaGuardado) {
      yaGuardado = true;
      try {
        await guardarModulo(session.id, MOD.key, correctas, total);
      } catch(e) { console.error('Error saving:', e); }
    }

    app.innerHTML = `
      ${header()}
      <div class="slide-container">
        <div class="quiz-section result-card">
          <span class="result-icon">${emoji}</span>
          <div class="result-score ${clase}">${porcentaje}%</div>
          <p class="result-msg">${msg}</p>

          <div class="result-breakdown">
            <div class="result-stat">
              <div class="result-stat-num">${correctas}</div>
              <div class="result-stat-label">Correctas</div>
            </div>
            <div class="result-stat">
              <div class="result-stat-num">${total - correctas}</div>
              <div class="result-stat-label">A mejorar</div>
            </div>
            <div class="result-stat">
              <div class="result-stat-num">${total}</div>
              <div class="result-stat-label">Preguntas</div>
            </div>
          </div>

          ${modData && modData.puntaje > correctas
            ? `<div class="alert alert-info mb-24">Tu mejor puntaje anterior fue ${modData.porcentaje}%. Se conserva el mayor.</div>`
            : ''
          }

          <div style="display:flex;flex-direction:column;gap:12px;">
            <a href="${MOD.siguiente}" class="btn btn-primary" style="justify-content:center;">
              Siguiente módulo →
            </a>
            <button onclick="reintentar()" class="btn btn-outline" style="justify-content:center;">
              Intentar de nuevo
            </button>
            <a href="academia.html" style="display:block;text-align:center;font-size:12px;color:var(--mid);opacity:0.5;margin-top:4px;text-decoration:none;">
              Volver a mis módulos
            </a>
          </div>
          <p class="retry-note">Puedes repetir el módulo cuantas veces quieras. Se guarda tu mejor puntaje.</p>
        </div>
      </div>
    `;

    window.reintentar = function() {
      qIndex = 0;
      respuestas = [];
      yaGuardado = false;
      enQuiz = true;
      render();
    };
  }

  // ── HELPERS ─────────────────────────
  function header() {
    const progress = enQuiz
      ? Math.round(((totalSlides + qIndex) / (totalSlides + MOD.preguntas.length)) * 100)
      : Math.round((slideIndex / (totalSlides + MOD.preguntas.length)) * 100);

    const fase = enQuiz ? 'Quiz' : `Slide ${slideIndex + 1} de ${totalSlides}`;

    return `
      <div class="mod-header">
        <div class="mod-header-inner">
          <div class="mod-header-icon" style="background:${MOD.color}22;">${MOD.icono}</div>
          <div class="mod-header-info">
            <div class="mod-header-steps">${fase} · Módulo ${MOD.numero}</div>
            <div class="mod-header-title">${MOD.titulo}</div>
            <div class="mod-progress-bar">
              <div class="mod-progress-fill" style="width:${progress}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function updateProgress() {
    const bars = document.querySelectorAll('.mod-progress-fill');
    bars.forEach(b => b.style.width = pct() + '%');
  }

  window.navNext = function() {
    if (slideIndex < totalSlides - 1) {
      slideIndex++;
      render();
    } else {
      enQuiz = true;
      qIndex = 0;
      respuestas = [];
      renderQuiz();
    }
    window.scrollTo(0, 0);
  };

  window.navBack = function() {
    if (slideIndex > 0) { slideIndex--; render(); }
    else window.location.href = 'academia.html';
    window.scrollTo(0, 0);
  };

  render();
}
