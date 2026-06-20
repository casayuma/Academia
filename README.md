# Academia Casa Yuma — La Marea

Plataforma de capacitación interna para colaboradores de Casa Yuma.

**URL en producción:** `https://casayuma.github.io/academia`

---

## Antes de publicar — configuración necesaria

### 1. Firebase (firebase.js)

Reemplaza los valores en `firebase.js`:

```js
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};
```

Usa el mismo proyecto Firebase que ya tienes (`casayuma-dashboard`) o crea una nueva colección `academia_colaboradores` en el mismo Firestore.

**Reglas de Firestore recomendadas:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /academia_colaboradores/{docId} {
      allow read, write: if true; // Ajustar con autenticación si se requiere
    }
  }
}
```

### 2. PIN de líderes (lideres.html)

En `lideres.html`, línea con `PIN_CORRECTO`, cambia el valor:
```js
const PIN_CORRECTO = '2024'; // ← pon el PIN que prefieras
```

### 3. Links de Google Drive (lideres.html)

En la sección "Recursos de capacitación", reemplaza los `href="#"` con los links reales de Drive de cada documento.

---

## Estructura de archivos

```
academia/
├── index.html              # Pantalla de entrada (selector de rol)
├── colaborador-login.html  # Login colaboradores (nombre + # empleado)
├── academia.html           # Hub de módulos + progreso
├── modulo-1.html           # Historia y el nombre Yuma
├── modulo-2.html           # La Marea — identidad + valores CASA
├── modulo-3.html           # Código YUMA
├── modulo-4.html           # Los espacios del hotel
├── modulo-5.html           # Do's & Don'ts + conducta
├── modulo-6.html           # Protocolo al huésped
├── evaluacion-final.html   # Evaluación final (20 preguntas)
├── lideres.html            # Dashboard líderes + tracking
├── style.css               # Brand tokens y estilos compartidos
├── modulo.css              # Estilos de módulos y quizzes
├── modulo.js               # Motor de renderizado de módulos
└── firebase.js             # Config y utilidades de Firebase
```

## Sistema de puntaje

| Componente | Peso |
|---|---|
| Promedio de los 6 módulos | 60% |
| Evaluación final (20 preguntas) | 40% |

**Niveles:**
- 🐚 Ola Nueva — 0–2 módulos completados
- 🌊 Marea Activa — 3–4 módulos completados  
- ⭐ La Marea — 6 módulos + evaluación final

## Subir a GitHub Pages

```bash
# Si el repo ya existe:
git clone https://github.com/casayuma/casayuma.github.io
cp -r academia/ casayuma.github.io/academia/
cd casayuma.github.io
git add academia/
git commit -m "Add: Academia La Marea - plataforma de capacitación"
git push origin main
```
