// ===========================
// CASA YUMA — ACADEMIA
// Firebase config & utilities
// ===========================
// INSTRUCCIONES: Reemplaza los valores de firebaseConfig con los de tu proyecto Firebase.
// Proyecto actual: casayuma-dashboard (o el que uses para academia)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDw6hf9ZN3KAZZGkkMjjXUpLZjsD34FXgc",
  authDomain:        "academia-461d6.firebaseapp.com",
  projectId:         "academia-461d6",
  storageBucket:     "academia-461d6.firebasestorage.app",
  messagingSenderId: "90812153114",
  appId:             "1:90812153114:web:77c220ef8ceb46e96580a3"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Estructura Firestore ──
// academia_colaboradores/{empleadoId}
//   nombre: string
//   departamento: string
//   numero_empleado: string
//   fecha_inicio: timestamp
//   modulos: {
//     m1: { completado: bool, puntaje: number, intentos: number, fecha: timestamp }
//     m2: ...  m3: ...  m4: ...  m5: ...  m6: ...
//   }
//   evaluacion_final: { completado: bool, puntaje: number, fecha: timestamp }
//   puntaje_total: number     // 0–100
//   porcentaje_completado: number  // 0–100

// ── ID único por colaborador ──
export function getEmpleadoId(nombre, numero) {
  return `emp_${numero}_${nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
}

// ── Registrar / recuperar colaborador ──
export async function registrarColaborador(nombre, numeroEmpleado, departamento) {
  const id  = getEmpleadoId(nombre, numeroEmpleado);
  const ref = doc(db, "academia_colaboradores", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      nombre,
      numero_empleado: numeroEmpleado,
      departamento,
      fecha_inicio: serverTimestamp(),
      modulos: {},
      evaluacion_final: { completado: false, puntaje: 0 },
      puntaje_total: 0,
      porcentaje_completado: 0
    });
  }
  return { id, data: snap.exists() ? snap.data() : null, esNuevo: !snap.exists() };
}

// ── Guardar resultado de módulo ──
export async function guardarModulo(empleadoId, moduloKey, puntaje, totalPreguntas) {
  const ref = doc(db, "academia_colaboradores", empleadoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const modulos = data.modulos || {};

  // Guardar módulo (solo mejora el puntaje si ya existía)
  const yaExiste = modulos[moduloKey];
  const puntajeAnterior = yaExiste ? modulos[moduloKey].puntaje : 0;
  const nuevosPuntos = Math.max(puntajeAnterior, puntaje);

  modulos[moduloKey] = {
    completado: true,
    puntaje: nuevosPuntos,
    total_preguntas: totalPreguntas,
    porcentaje: Math.round((nuevosPuntos / totalPreguntas) * 100),
    intentos: (yaExiste ? (modulos[moduloKey].intentos || 0) : 0) + 1,
    fecha: new Date().toISOString()
  };

  // Recalcular totales
  const { puntajeTotal, porcentajeCompletado } = calcularTotales(modulos, data.evaluacion_final);

  await updateDoc(ref, {
    [`modulos.${moduloKey}`]: modulos[moduloKey],
    puntaje_total: puntajeTotal,
    porcentaje_completado: porcentajeCompletado
  });

  return modulos[moduloKey];
}

// ── Guardar evaluación final ──
export async function guardarEvaluacionFinal(empleadoId, puntaje, totalPreguntas) {
  const ref = doc(db, "academia_colaboradores", empleadoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const evalFinal = {
    completado: true,
    puntaje,
    total_preguntas: totalPreguntas,
    porcentaje: Math.round((puntaje / totalPreguntas) * 100),
    fecha: new Date().toISOString()
  };

  const { puntajeTotal, porcentajeCompletado } = calcularTotales(data.modulos || {}, evalFinal);

  await updateDoc(ref, {
    evaluacion_final: evalFinal,
    puntaje_total: puntajeTotal,
    porcentaje_completado: porcentajeCompletado
  });

  return evalFinal;
}

// ── Calcular puntaje global (módulos 60% + final 40%) ──
function calcularTotales(modulos, evalFinal) {
  const modulosKeys = ['m1','m2','m3','m4','m5','m6'];
  let sumaModulos = 0;
  let completados = 0;

  modulosKeys.forEach(k => {
    if (modulos[k]?.completado) {
      sumaModulos += modulos[k].porcentaje || 0;
      completados++;
    }
  });

  const promedioModulos = completados > 0 ? sumaModulos / completados : 0;
  const puntosFinal = evalFinal?.completado ? (evalFinal.porcentaje || 0) : 0;

  // Si no hay final aún, puntaje es sólo de módulos completados
  const puntajeTotal = evalFinal?.completado
    ? Math.round(promedioModulos * 0.6 + puntosFinal * 0.4)
    : Math.round(promedioModulos * (completados / 6));

  // % completado: 6 módulos + 1 evaluación final = 7 pasos
  const pasos = completados + (evalFinal?.completado ? 1 : 0);
  const porcentajeCompletado = Math.round((pasos / 7) * 100);

  return { puntajeTotal, porcentajeCompletado };
}

// ── Obtener datos de un colaborador ──
export async function getColaborador(empleadoId) {
  const ref  = doc(db, "academia_colaboradores", empleadoId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ── Obtener todos los colaboradores (para dashboard líderes) ──
export async function getTodosColaboradores() {
  const col  = collection(db, "academia_colaboradores");
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Session helpers (localStorage) ──
export function setSession(empleadoId, nombre, departamento) {
  sessionStorage.setItem('cy_academia_id',    empleadoId);
  sessionStorage.setItem('cy_academia_nombre', nombre);
  sessionStorage.setItem('cy_academia_depto',  departamento);
}

export function getSession() {
  return {
    id:          sessionStorage.getItem('cy_academia_id'),
    nombre:      sessionStorage.getItem('cy_academia_nombre'),
    departamento:sessionStorage.getItem('cy_academia_depto')
  };
}

export function clearSession() {
  sessionStorage.removeItem('cy_academia_id');
  sessionStorage.removeItem('cy_academia_nombre');
  sessionStorage.removeItem('cy_academia_depto');
}

export { db };
