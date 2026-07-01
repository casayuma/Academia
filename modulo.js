// ===========================
// CASA YUMA — ACADEMIA
// Module render engine v3
// Tipos: mc, vf, escenario, ordenar, ordenar_mini, relacionar
// Sin reintentos — un solo intento por módulo
// ===========================
import { guardarModulo, getColaborador, getSession } from './firebase.js';

export async function renderModulo(MOD) {
  const session = getSession();
  if (!session.id) { window.location.href = 'index.html'; return; }

  const app = document.getElementById('app');
  let slideIndex = 0;
  let enQuiz = false;
  let qIndex = 0;
  let respuestas = [];
  let yaGuardado = false;

  // Check if already completed — block retake
  let modData = null;
  try {
    const col = await getColaborador(session.id);
    modData = col?.modulos?.[MOD.key];
  } catch(e) {}

  if (modData?.completado) {
    app.innerHTML = `
      <div style="max-width:520px;margin:60px auto;padding:32px 20px;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">✅</div>
        <h2 style="font-size:22px;font-family:var(--font-mono);margin-bottom:10px;">Ya completaste este módulo</h2>
        <p style="font-size:14px;color:var(--mid);line-height:1.6;margin-bottom:8px;">Obtuviste <strong>${modData.porcentaje}%</strong> en tu evaluación.</p>
        <p style="font-size:13px;color:var(--mid);opacity:0.6;margin-bottom:28px;">Cada módulo se completa una sola vez.</p>
        <a href="index.html" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:var(--blue);color:var(--white);border-radius:10px;text-decoration:none;font-family:var(--font-mono);font-size:13px;letter-spacing:0.06em;">
          ← Volver a mis módulos
        </a>
      </div>`;
    return;
  }

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
          ${slideIndex > 0 ? `<button class="btn-nav-back" onclick="window.navBack()">← Atrás</button>` : `<span></span>`}
          <button class="btn-nav-next" id="btnNext" onclick="window.navNext()">
            ${isLast ? 'Ir al quiz →' : 'Siguiente →'}
          </button>
        </div>
      </div>`;

    // If slide has interactive (ordenar/relacionar), disable next until complete
    if (slide.tipo === 'ordenar' || slide.tipo === 'relacionar') {
      document.getElementById('btnNext').disabled = true;
      if (slide.tipo === 'ordenar') initOrdenar(slide);
      if (slide.tipo === 'relacionar') initRelacionar(slide);
    }
  }

  function renderSlideContent(slide) {
    if (slide.tipo === 'portada') return `
      <div class="slide-portada">
        <span class="big-icon">${slide.imagen || MOD.icono}</span>
        <h1>${slide.titulo}</h1>
        <p>${slide.texto}</p>
      </div>`;
    if (slide.tipo === 'dato') return `
      <div class="slide-dato">
        <h2>${slide.titulo}</h2>
        <div class="dato-items">
          ${slide.items.map(it => `<div class="dato-item"><span class="dato-icon">${it.icono}</span><span class="dato-text">${it.texto}</span></div>`).join('')}
        </div>
      </div>`;
    if (slide.tipo === 'cita') return `
      <div class="slide-cita">
        <div class="cita-box">
          <span class="cita-mark">"</span>
          <p class="cita-text">${slide.texto}</p>
        </div>
      </div>`;
    if (slide.tipo === 'ordenar') return `
      <div class="slide-dato">
        <h2>${slide.titulo}</h2>
        <p style="font-size:13px;color:var(--mid);opacity:0.7;margin-bottom:16px;">${slide.instruccion}</p>
        <div id="ordenar-list" style="display:flex;flex-direction:column;gap:10px;"></div>
        <div id="ordenar-feedback" style="margin-top:14px;display:none;"></div>
        <button id="btn-check-orden" onclick="window.checkOrden()" style="margin-top:16px;padding:12px 24px;background:var(--blue);color:white;border:none;border-radius:9px;font-family:var(--font-mono);font-size:13px;cursor:pointer;display:none;">Verificar orden →</button>
      </div>`;
    if (slide.tipo === 'relacionar') return `
      <div class="slide-dato">
        <h2>${slide.titulo}</h2>
        <p style="font-size:13px;color:var(--mid);opacity:0.7;margin-bottom:18px;">${slide.instruccion}</p>
        <div id="relacionar-wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"></div>
        <div id="relacionar-feedback" style="margin-top:14px;display:none;"></div>
        <button id="btn-check-rel" onclick="window.checkRelacionar()" style="margin-top:16px;padding:12px 24px;background:var(--blue);color:white;border:none;border-radius:9px;font-family:var(--font-mono);font-size:13px;cursor:pointer;display:none;">Verificar →</button>
      </div>`;
    return '';
  }

  // ── ORDENAR (drag) ──────────────────
  function initOrdenar(slide) {
    const list = document.getElementById('ordenar-list');
    let items = [...slide.items].sort(() => Math.random() - 0.5);
    let dragSrc = null;

    function render() {
      list.innerHTML = '';
      items.forEach((item, i) => {
        const div = document.createElement('div');
        div.draggable = true;
        div.dataset.id = item.id;
        div.style.cssText = 'background:white;border:1.5px solid #e0dcd0;border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;cursor:grab;user-select:none;transition:all 0.15s;font-size:14px;color:var(--dark);';
        div.innerHTML = `<span style="font-size:18px;opacity:0.35;cursor:grab;">⠿</span>${item.texto}`;
        div.addEventListener('dragstart', e => { dragSrc = i; div.style.opacity = '0.4'; });
        div.addEventListener('dragend', () => { div.style.opacity = '1'; });
        div.addEventListener('dragover', e => { e.preventDefault(); div.style.borderColor = 'var(--blue)'; });
        div.addEventListener('dragleave', () => div.style.borderColor = '#e0dcd0');
        div.addEventListener('drop', e => {
          e.preventDefault(); div.style.borderColor = '#e0dcd0';
          if (dragSrc !== null && dragSrc !== i) {
            [items[dragSrc], items[i]] = [items[i], items[dragSrc]];
            dragSrc = null; render();
          }
        });
        list.appendChild(div);
      });
      document.getElementById('btn-check-orden').style.display = 'block';
    }
    render();

    window.checkOrden = () => {
      const actual = items.map(it => it.id);
      const correcto = actual.every((id, i) => id === slide.ordenCorrecto[i]);
      const fb = document.getElementById('ordenar-feedback');
      fb.style.display = 'block';
      if (correcto) {
        fb.innerHTML = `<div style="background:#e8f5e9;border-radius:9px;padding:13px 16px;color:#1a5c2a;font-size:14px;">✅ ¡Correcto! El orden es el indicado.</div>`;
        document.getElementById('btnNext').disabled = false;
        document.getElementById('btn-check-orden').style.display = 'none';
      } else {
        fb.innerHTML = `<div style="background:#fde8e8;border-radius:9px;padding:13px 16px;color:#7a1a1a;font-size:14px;">❌ No exactamente. Intenta de nuevo reorganizando los elementos.</div>`;
      }
    };
  }

  // ── RELACIONAR (click-to-pair) ──────
  function initRelacionar(slide) {
    const wrap = document.getElementById('relacionar-wrap');
    let selectedA = null, pairs = {};
    const colores = ['#e0f0f1','#faf6dc','#e8ead5','#f5e0ec'];

    function renderRel() {
      wrap.innerHTML = '';
      // Column A
      const colA = document.createElement('div');
      colA.style.display = 'flex'; colA.style.flexDirection = 'column'; colA.style.gap = '10px';
      slide.columnaA.forEach((txt, i) => {
        const btn = document.createElement('button');
        btn.dataset.idx = i;
        const isPaired = Object.keys(pairs).includes(String(i));
        btn.style.cssText = `padding:12px 14px;border-radius:9px;border:1.5px solid ${isPaired ? '#27ae60' : selectedA === i ? 'var(--blue)' : '#e0dcd0'};background:${isPaired ? '#e8f5e9' : selectedA === i ? '#e0f0f1' : 'white'};font-size:13px;cursor:pointer;text-align:left;font-family:var(--font-mono);color:var(--dark);transition:all 0.15s;`;
        btn.textContent = txt;
        btn.onclick = () => { if (isPaired) return; selectedA = i; renderRel(); };
        colA.appendChild(btn);
      });
      // Column B
      const colB = document.createElement('div');
      colB.style.display = 'flex'; colB.style.flexDirection = 'column'; colB.style.gap = '10px';
      slide.columnaB.forEach((txt, i) => {
        const btn = document.createElement('button');
        const isPaired = Object.values(pairs).includes(i);
        btn.style.cssText = `padding:12px 14px;border-radius:9px;border:1.5px solid ${isPaired ? '#27ae60' : '#e0dcd0'};background:${isPaired ? '#e8f5e9' : 'white'};font-size:13px;cursor:pointer;text-align:left;font-family:var(--font-mono);color:var(--dark);transition:all 0.15s;`;
        btn.textContent = txt;
        btn.onclick = () => {
          if (selectedA === null || isPaired) return;
          pairs[selectedA] = i; selectedA = null;
          renderRel();
          if (Object.keys(pairs).length === slide.columnaA.length)
            document.getElementById('btn-check-rel').style.display = 'block';
        };
        colB.appendChild(btn);
      });
      wrap.appendChild(colA); wrap.appendChild(colB);
    }
    renderRel();

    window.checkRelacionar = () => {
      const correcto = slide.columnaA.every((_, i) => pairs[i] === slide.pares[i]);
      const fb = document.getElementById('relacionar-feedback');
      fb.style.display = 'block';
      if (correcto) {
        fb.innerHTML = `<div style="background:#e8f5e9;border-radius:9px;padding:13px 16px;color:#1a5c2a;font-size:14px;">✅ ¡Perfecto! Todas las relaciones son correctas.</div>`;
        document.getElementById('btnNext').disabled = false;
        document.getElementById('btn-check-rel').style.display = 'none';
      } else {
        pairs = {};
        fb.innerHTML = `<div style="background:#fde8e8;border-radius:9px;padding:13px 16px;color:#7a1a1a;font-size:14px;">❌ Algunas relaciones no son correctas. Vuelve a intentarlo.</div>`;
        renderRel();
      }
    };
  }

  // ── QUIZ ────────────────────────────
  function renderQuiz() {
    if (qIndex >= MOD.preguntas.length) { renderResultado(); return; }
    const q = MOD.preguntas[qIndex];
    let respondido = false;
    const letras = ['A','B','C','D','E'];

    let contenidoQuiz = '';
    if (q.tipo === 'mc' || q.tipo === 'escenario') {
      contenidoQuiz = `
        <div class="quiz-options" id="opts">
          ${q.opciones.map((op,i) => `<button class="quiz-option" onclick="window.responder(${i})" data-index="${i}"><span class="option-letter">${letras[i]}</span>${op}</button>`).join('')}
        </div>`;
    }
    if (q.tipo === 'vf') {
      contenidoQuiz = `
        <div class="quiz-options" id="opts" style="flex-direction:row;gap:16px;">
          <button class="quiz-option" onclick="window.responder(true)" style="flex:1;justify-content:center;font-size:16px;padding:20px;"><span class="option-letter">V</span>Verdadero</button>
          <button class="quiz-option" onclick="window.responder(false)" style="flex:1;justify-content:center;font-size:16px;padding:20px;"><span class="option-letter">F</span>Falso</button>
        </div>`;
    }
    if (q.tipo === 'ordenar_mini') {
      let ord = [...q.items].map((t,i)=>({t,i})).sort(()=>Math.random()-0.5);
      let dragI = null;
      contenidoQuiz = `<div id="omini" style="display:flex;flex-direction:column;gap:8px;"></div>
        <button id="btn-omini" onclick="window.checkMini()" style="margin-top:14px;padding:12px 20px;background:var(--blue);color:white;border:none;border-radius:9px;font-family:var(--font-mono);font-size:13px;cursor:pointer;">Verificar orden →</button>`;
      setTimeout(() => {
        const container = document.getElementById('omini');
        if (!container) return;
        function renderMini() {
          container.innerHTML = '';
          ord.forEach((item, i) => {
            const div = document.createElement('div');
            div.draggable = true;
            div.style.cssText = 'background:white;border:1.5px solid #e0dcd0;border-radius:9px;padding:12px 16px;display:flex;align-items:center;gap:10px;cursor:grab;font-size:13px;color:var(--dark);';
            div.innerHTML = `<span style="opacity:0.3;font-size:16px;">⠿</span>${item.t}`;
            div.addEventListener('dragstart', () => { dragI = i; div.style.opacity='0.4'; });
            div.addEventListener('dragend', () => { div.style.opacity='1'; });
            div.addEventListener('dragover', e => { e.preventDefault(); div.style.borderColor='var(--blue)'; });
            div.addEventListener('dragleave', () => div.style.borderColor='#e0dcd0');
            div.addEventListener('drop', e => {
              e.preventDefault(); div.style.borderColor='#e0dcd0';
              if (dragI !== null && dragI !== i) { [ord[dragI],ord[i]]=[ord[i],ord[dragI]]; dragI=null; renderMini(); }
            });
            container.appendChild(div);
          });
        }
        renderMini();
        window.checkMini = () => {
          const actual = ord.map(x=>x.i);
          const ok = actual.every((v,i)=>v===q.ordenCorrecto[i]);
          if (ok) {
            respuestas.push({correcta:true});
            document.getElementById('btn-omini').style.display='none';
            document.querySelectorAll('#omini div').forEach(d=>{ d.style.borderColor='#27ae60'; d.style.background='#e8f5e9'; d.draggable=false; });
            const fb=document.createElement('div');
            fb.style.cssText='margin-top:12px;background:#e8f5e9;border-radius:9px;padding:12px 15px;color:#1a5c2a;font-size:13px;';
            fb.textContent='✅ ¡Orden correcto!';
            document.getElementById('omini').parentNode.appendChild(fb);
            document.getElementById('btnSig').disabled=false; respondido=true;
          } else {
            const fb=document.getElementById('omini').parentNode.querySelector('.fb-mini');
            if (!fb) {
              const nfb=document.createElement('div');
              nfb.className='fb-mini';
              nfb.style.cssText='margin-top:12px;background:#fde8e8;border-radius:9px;padding:12px 15px;color:#7a1a1a;font-size:13px;';
              nfb.textContent='❌ No es el orden correcto. Intenta de nuevo.';
              document.getElementById('omini').parentNode.appendChild(nfb);
            }
          }
        };
      }, 50);
    }

    app.innerHTML = `
      ${header()}
      <div class="slide-container">
        <div class="quiz-section">
          <div class="quiz-header">
            <div class="quiz-num">Pregunta ${qIndex+1} de ${MOD.preguntas.length}</div>
            <div class="quiz-progress-row">${MOD.preguntas.map((_,i)=>`<div class="quiz-dot ${i<qIndex?(respuestas[i]?.correcta?'done-ok':'done-fail'):i===qIndex?'active':''}"></div>`).join('')}</div>
            <div class="quiz-question">${q.pregunta || q.p}</div>
            ${q.tipo==='escenario'?'<div style="font-size:11px;background:#e0f0f1;border-radius:6px;padding:6px 10px;color:var(--blue);display:inline-block;margin-top:8px;letter-spacing:0.05em;">ESCENARIO — ¿Qué harías?</div>':''}
            ${q.tipo==='vf'?'<div style="font-size:11px;background:#faf6dc;border-radius:6px;padding:6px 10px;color:#7a6e1a;display:inline-block;margin-top:8px;letter-spacing:0.05em;">VERDADERO o FALSO</div>':''}
          </div>
          ${contenidoQuiz}
          <div class="quiz-feedback" id="feedback"></div>
        </div>
      </div>
      <div class="bottom-nav">
        <div class="bottom-nav-inner">
          <span></span>
          <button class="btn-nav-next" id="btnSig" disabled onclick="window.siguientePregunta()">
            ${qIndex < MOD.preguntas.length-1 ? 'Siguiente →' : 'Ver resultado →'}
          </button>
        </div>
      </div>`;

    if (q.tipo !== 'ordenar_mini') {
      window.responder = function(idx) {
        if (respondido) return;
        respondido = true;
        let correcta;
        if (q.tipo === 'vf') correcta = (idx === q.correcta);
        else correcta = (idx === q.correcta);
        respuestas.push({ correcta });
        // Mark options
        const opts = document.querySelectorAll('.quiz-option');
        opts.forEach((btn, i) => {
          btn.disabled = true;
          if (q.tipo === 'vf') {
            if ((i===0&&q.correcta===true)||(i===1&&q.correcta===false)) btn.classList.add('correct');
            else if ((i===0&&idx===true&&!correcta)||(i===1&&idx===false&&!correcta)) btn.classList.add('wrong');
          } else {
            if (i === q.correcta) btn.classList.add('correct');
            else if (i === idx && !correcta) btn.classList.add('wrong');
          }
        });
        const fb = document.getElementById('feedback');
        fb.classList.add('show', correcta ? 'correct' : 'wrong');
        let msg = correcta ? '✅ <span>¡Correcto!</span>' : `❌ <span>La respuesta correcta es: <strong>${q.tipo==='vf'?(q.correcta?'Verdadero':'Falso'):q.opciones[q.correcta]}</strong></span>`;
        if (!correcta && q.justificacion) msg += `<br><span style="font-size:12px;margin-top:6px;display:block;opacity:0.8;">${q.justificacion}</span>`;
        if (q.tipo==='escenario' && q.explicacion) msg += `<br><span style="font-size:12px;margin-top:6px;display:block;opacity:0.85;">${q.explicacion}</span>`;
        fb.innerHTML = msg;
        document.getElementById('btnSig').disabled = false;
      };
    }

    window.siguientePregunta = function() { qIndex++; if (qIndex>=MOD.preguntas.length) renderResultado(); else renderQuiz(); window.scrollTo(0,0); };
  }

  // ── RESULTADO ───────────────────────
  async function renderResultado() {
    const correctas = respuestas.filter(r => r.correcta).length;
    const total = MOD.preguntas.length;
    const porcentaje = Math.round((correctas / total) * 100);
    let emoji, clase, msg;
    if (porcentaje >= 80) { emoji='🎉'; clase='high'; msg='¡Excelente! Demostraste que conoces bien este tema. ¡Así se hace en La Marea!'; }
    else if (porcentaje >= 60) { emoji='👍'; clase='mid'; msg='Buen intento. Hay algunos puntos que vale la pena repasar.'; }
    else { emoji='📚'; clase='low'; msg='Este módulo necesita más atención. Habla con tu líder para reforzar los temas.'; }

    if (!yaGuardado) {
      yaGuardado = true;
      try { await guardarModulo(session.id, MOD.key, correctas, total); } catch(e) { console.error(e); }
    }

    app.innerHTML = `
      ${header()}
      <div class="slide-container">
        <div class="quiz-section result-card">
          <span class="result-icon">${emoji}</span>
          <div class="result-score ${clase}">${porcentaje}%</div>
          <p class="result-msg">${msg}</p>
          <div class="result-breakdown">
            <div class="result-stat"><div class="result-stat-num">${correctas}</div><div class="result-stat-label">Correctas</div></div>
            <div class="result-stat"><div class="result-stat-num">${total-correctas}</div><div class="result-stat-label">A mejorar</div></div>
            <div class="result-stat"><div class="result-stat-num">${total}</div><div class="result-stat-label">Preguntas</div></div>
          </div>
          <a href="index.html" class="btn btn-primary" style="justify-content:center;width:100%;">Volver a mis módulos →</a>
        </div>
      </div>`;
  }

  // ── HEADER ──────────────────────────
  function header() {
    const progress = enQuiz
      ? Math.round(((totalSlides+qIndex)/(totalSlides+MOD.preguntas.length))*100)
      : Math.round((slideIndex/(totalSlides+MOD.preguntas.length))*100);
    const fase = enQuiz ? 'Quiz' : `Slide ${slideIndex+1} de ${totalSlides}`;
    return `
      <div class="mod-header">
        <div class="mod-header-inner">
          <div class="mod-header-icon" style="background:${MOD.color}22;">${MOD.icono}</div>
          <div class="mod-header-info">
            <div class="mod-header-steps">${fase} · Módulo ${MOD.numero}</div>
            <div class="mod-header-title">${MOD.titulo}</div>
            <div class="mod-progress-bar"><div class="mod-progress-fill" style="width:${progress}%"></div></div>
          </div>
        </div>
      </div>`;
  }

  window.navNext = function() {
    if (slideIndex < totalSlides-1) { slideIndex++; render(); }
    else { enQuiz=true; qIndex=0; respuestas=[]; renderQuiz(); }
    window.scrollTo(0,0);
  };
  window.navBack = function() {
    if (slideIndex > 0) { slideIndex--; render(); }
    else window.location.href = 'index.html';
    window.scrollTo(0,0);
  };

  render();
}
