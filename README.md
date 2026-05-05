<div align="center">

<img src="./docs/banner.svg" alt="FitCommunity" width="100%"/>

<br/>

<p>
  <img src="https://img.shields.io/badge/status-MVP%20listo-success?style=flat-square" alt="Status"/>
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 20"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 18"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="Postgres"/>
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma"/>
  <img src="https://img.shields.io/badge/Stripe-integrado-635BFF?style=flat-square&logo=stripe&logoColor=white" alt="Stripe"/>
  <img src="https://img.shields.io/badge/IA-Llama%203.3%20vía%20Groq-F97316?style=flat-square" alt="IA"/>
  <img src="https://img.shields.io/badge/license-académica-lightgrey?style=flat-square" alt="Licencia"/>
</p>

<h3>Plataforma social de fitness con Coach IA personalizado · TFG · Mayo 2026</h3>

<p><i>Registra cada serie, sigue tu progreso con análisis avanzado y comparte tus logros con una comunidad de atletas.</i></p>

<sub>
  <a href="#-características-principales">Características</a> ·
  <a href="#-arquitectura">Arquitectura</a> ·
  <a href="#-stack-técnico">Stack</a> ·
  <a href="#-puesta-en-marcha">Setup</a> ·
  <a href="#-scripts-disponibles">Scripts</a> ·
  <a href="#-api">API</a> ·
  <a href="#-testing">Testing</a> ·
  <a href="#-despliegue">Despliegue</a>
</sub>

</div>

---

## 📖 Sobre el proyecto

**FitCommunity** es una plataforma social de fitness desarrollada como Trabajo Fin de Grado. Combina las funcionalidades clásicas de un *workout logger* (registro detallado de entrenamientos, ejercicios y series) con un **Coach IA personalizado** que tiene acceso al histórico real del usuario, generación automática de rutinas y planes de nutrición, análisis de progreso con foco configurable, y un feed social al estilo Strava.

El proyecto incorpora un **modelo de monetización Premium** real (suscripción mensual con Stripe) y un **panel de administración profesional** con KPIs en tiempo real, moderación, comunicaciones masivas y analytics.

> **Pensado para defenderse**: cumple los criterios de un proyecto fullstack moderno (TypeScript estricto, autenticación robusta con JWT + refresh tokens + 2FA opcional, integraciones con servicios externos reales, panel admin completo, despliegue cloud-ready).

---

## ✨ Características principales

### Para usuarios

- 🏋️ **Registro detallado de entrenamientos** — ejercicios del catálogo o personalizados, series con peso/reps/RPE/tipo (calentamiento/fallo), notas, fotos, intensidad
- 📅 **Calendario y heatmap anual** estilo GitHub contributions con tooltip al pasar el ratón y navegación entre años
- 🏆 **Marcas personales (PRs)** calculadas automáticamente con fórmula de Epley para estimación de 1RM
- 📊 **Estadísticas en tiempo real**: volumen total, racha de días entrenando, distribución por grupo muscular, evolución semanal
- 🤖 **Coach IA con contexto real** — el chat tiene acceso a todos tus datos (PRs, ejercicios más entrenados, distribución muscular, últimas sesiones) y responde con números concretos del usuario, no respuestas genéricas
- ✨ **Generación de rutinas IA** con calidad mínima garantizada (volumen por sesión según duración, división óptima por días/semana, estructura compuestos→asistencia→aislamiento)
- 🍎 **Planes de nutrición IA** con cálculo de macros y plan semanal de comidas
- 📈 **Análisis de progreso avanzado** con 7 focos seleccionables (general, fuerza, hipertrofia, pérdida de grasa, recuperación, balance muscular, prevención de lesiones), periodo configurable y pregunta libre. La IA detecta intención (ejercicio mencionado, grupo muscular, queja de progreso, fatiga) y trae datos específicos antes de responder
- 🎯 **Rutina activa con avance secuencial** — activas una rutina IA y cada día el dashboard te dice qué toca con pesos pre-rellenados de tu histórico
- ⏱️ **Modo entrenamiento en vivo** — pantalla optimizada para usar EN el gym, con cronómetro de descanso entre series, sonido + vibración al terminar, navegación rápida set→set
- 📄 **Export PDF** profesional de rutinas y dietas con diseño branded
- 👥 **Feed social** — sigue a otros atletas, da likes, comenta entrenamientos
- 🔔 **Notificaciones en tiempo real** (likes, comentarios, follows, broadcasts admin)
- 🔐 **Seguridad**: 2FA opcional con TOTP, verificación de email, reset de contraseña

### Para administradores

- 📡 **Live Activity Feed** — eventos de la plataforma en tiempo real con polling (registros, workouts, suscripciones, likes, comentarios) — los nuevos eventos se resaltan automáticamente
- 👥 **Gestión avanzada de usuarios** con drawer de detalle completo (perfil, suscripciones histórico, audit log, últimos workouts), filtros por estado/plan, ordenación por columnas, banear/desbanear, force logout, verificar email manualmente, activar/quitar Premium
- 💳 **Panel de suscripciones Premium** con MRR, ARR, churn rate, conversión, gestión de subscripciones
- 📢 **Broadcasts segmentados** — envía notificaciones a todos / Premium / inactivos 7d / inactivos 14d / nuevos usuarios. Con plantillas predefinidas y preview
- 🛡️ **Moderación de entrenamientos** con detección de reportes
- 📋 **Audit log** de todas las acciones administrativas (banear, eliminar, conceder Premium, etc.)
- 📥 **Export CSV** de la lista filtrada de usuarios (compatible con Excel)
- 📊 **Analytics**: crecimiento de usuarios, workouts/día, ingresos, distribución por grupo muscular, adopción de rutinas activas, PDFs descargados, uso de IA
- 🚦 **Health check en tiempo real** de servicios (DB, Redis) con latencia

---

## 🖼️ Capturas de la aplicación

> Las capturas se encuentran en `docs/screenshots/`. Si todavía no están subidas, sigue las instrucciones de `docs/screenshots/README.md` para generarlas.

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./docs/screenshots/01-login.png" alt="Pantalla de login" width="100%"/>
      <sub><b>Login</b> — hero panel branded con copy y social proof</sub>
    </td>
    <td align="center" width="50%">
      <img src="./docs/screenshots/02-dashboard.png" alt="Dashboard de usuario" width="100%"/>
      <sub><b>Dashboard</b> — stats, gráficas, rutina activa del día y heatmap</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="./docs/screenshots/03-live-workout.png" alt="Modo en vivo" width="100%"/>
      <sub><b>Modo en vivo</b> — cronómetro de descanso entre series</sub>
    </td>
    <td align="center">
      <img src="./docs/screenshots/04-coach-ia.png" alt="Coach IA" width="100%"/>
      <sub><b>Coach IA</b> — respuestas basadas en tu histórico real</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="./docs/screenshots/05-progress-analysis.png" alt="Análisis de progreso" width="100%"/>
      <sub><b>Análisis IA avanzado</b> — foco configurable, datos específicos por intención</sub>
    </td>
    <td align="center">
      <img src="./docs/screenshots/07-admin-dashboard.png" alt="Admin dashboard" width="100%"/>
      <sub><b>Admin</b> — KPIs, live activity feed, MRR/ARR, churn</sub>
    </td>
  </tr>
</table>

---

## 🏗️ Arquitectura

### Vista de alto nivel

```mermaid
flowchart LR
  user[Usuario]
  admin[Admin]
  browser[Browser - PWA-ready]

  subgraph frontend [Frontend · Vite + React 18]
    pages[Páginas lazy-loaded]
    state[Zustand store]
    forms[React Hook Form + Zod]
  end

  subgraph backend [Backend · Express + TypeScript]
    api[REST API]
    auth[Auth · JWT + refresh + 2FA]
    services[Services layer]
    cache[Memory cache TTL]
  end

  db[(PostgreSQL · Supabase)]
  redis[(Redis · cache + blacklist)]

  subgraph external [Servicios externos]
    stripe{{Stripe · suscripciones}}
    groq{{Groq · Llama 3.3 70B}}
    smtp{{SMTP · emails}}
  end

  user --> browser
  admin --> browser
  browser --> frontend
  frontend -->|HTTPS + cookies HttpOnly| api
  api --> auth
  auth --> services
  services --> cache
  services --> db
  services --> redis
  services --> stripe
  services --> groq
  services --> smtp
  stripe -.webhook.-> api
```

### Modelo de datos (simplificado)

```mermaid
erDiagram
  User ||--o| UserProfile : "1 a 1"
  User ||--o{ Workout : "crea"
  User ||--o{ Subscription : "tiene"
  User ||--o{ AiConversation : "chatea"
  User ||--o{ GeneratedRoutine : "genera"
  User ||--o{ NutritionPlan : "genera"
  User ||--o{ SocialFollow : "sigue/seguido"
  User ||--o{ Notification : "recibe"
  User ||--o{ RefreshToken : "sesiones"

  Workout ||--o{ WorkoutExercise : "contiene"
  WorkoutExercise }o--|| Exercise : "es-un"
  WorkoutExercise ||--o{ WorkoutSet : "series"
  Workout ||--o{ SocialLike : "recibe"
  Workout ||--o{ SocialComment : "recibe"

  GeneratedRoutine {
    uuid id
    string title
    enum goal
    int days_per_week
    json plan_json
    bool is_active
    int current_day_idx
    int download_count
  }

  Subscription {
    uuid id
    string stripe_subscription_id
    enum status
    datetime current_period_end
    bool cancel_at_period_end
  }

  Workout {
    uuid id
    string title
    int duration_min
    enum intensity
    int calories
    bool is_public
    datetime workout_date
  }
```

### Flujo de autenticación

```mermaid
sequenceDiagram
  participant U as Usuario (Browser)
  participant F as Frontend
  participant B as Backend
  participant DB as PostgreSQL
  participant R as Redis

  U->>F: Email + password (+ TOTP opcional)
  F->>B: POST /auth/login
  B->>DB: Verificar usuario + bcrypt
  alt 2FA habilitado
    B-->>F: 401 TOTP_REQUIRED
    F->>U: Solicitar código 2FA
    U->>F: Código 6 dígitos
    F->>B: POST /auth/login con totpCode
    B->>B: Verificar TOTP (otplib)
  end
  B->>R: Almacenar refresh token (hashed)
  B->>DB: Persistir RefreshToken row
  B-->>F: { accessToken (15min) } + Set-Cookie refreshToken (HttpOnly, 7d)
  F->>F: Persistir accessToken en Zustand store
  Note over F,B: Petición protegida
  F->>B: GET /api/users/me<br/>Authorization: Bearer accessToken
  B-->>F: Datos del usuario
  Note over F,B: Token expira
  F->>B: POST /auth/refresh-token<br/>(cookie HttpOnly)
  B->>R: Verificar token no revocado
  B-->>F: Nuevo accessToken
```

### Coach IA — flujo de datos personalizados

```mermaid
sequenceDiagram
  participant U as Usuario
  participant F as Frontend
  participant B as Backend
  participant Cache as Memory Cache
  participant DB as PostgreSQL
  participant AI as Groq · Llama 3.3

  U->>F: "¿cuál es mi ejercicio estrella?"
  F->>B: POST /ai/chat
  B->>Cache: getUserContext(userId)?
  alt Hit en cache (<60s)
    Cache-->>B: Contexto cacheado
  else Miss
    B->>DB: Profile + Workouts agg + PRs + Top exercises<br/>+ Muscle distribution + Last sessions
    DB-->>B: Datos crudos
    B->>B: Construir contexto enriquecido (~700 tokens)
    B->>Cache: Guardar TTL 60s
  end
  B->>AI: Chat completion<br/>(system prompt + contexto + mensajes previos + nuevo mensaje)
  AI-->>B: Respuesta basada en datos reales
  B->>DB: Persistir AiMessage
  B-->>F: { message, conversationId }
  F-->>U: "Tu PR de Prensa de piernas es 199.8kg × 10..."
```

### Flujo de rutina activa

```mermaid
flowchart TD
  A[Usuario genera rutina con IA] --> B[Click Activar en card]
  B --> C[Backend: marca is_active=true<br/>desactiva otras del mismo user]
  C --> D[Dashboard muestra widget<br/>'Hoy te toca: Día N']
  D --> E{¿Cómo entrenar?}
  E -->|Empezar en vivo| F[/workouts/live<br/>cronómetro + audio]
  E -->|Editar| G[/workouts/new<br/>formulario clásico]
  F --> H[Completar series<br/>una a una con descanso]
  G --> H
  H --> I[Guardar workout]
  I --> J[Backend: crea Workout<br/>+ avanza current_day_idx]
  J --> K{¿Último día?}
  K -->|No| D
  K -->|Sí| L[current_day_idx vuelve a 0<br/>ciclo se repite]
  L --> D
```

### Estructura del repositorio

```
TFG Marcos Entrenamientos/
├── apps/
│   ├── backend/                  # API Express + TypeScript
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # 20+ modelos: User, Workout, AI, Stripe, Social
│   │   │   ├── seed.ts           # Datos de ejemplo + catálogo de ejercicios
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── controllers/      # Handlers HTTP por dominio
│   │       ├── services/         # Lógica de negocio
│   │       ├── routes/           # Definición de rutas + middleware
│   │       ├── middleware/       # auth, validate, errorHandler, rateLimiter
│   │       ├── validators/       # Schemas Zod por dominio
│   │       ├── lib/              # prisma, redis, groq, stripe, swagger
│   │       ├── utils/            # apiResponse, jwt, password, logger, memoryCache
│   │       └── server.ts         # Entry point
│   │
│   └── frontend/                 # SPA Vite + React 18 + TypeScript
│       ├── public/
│       │   └── logo.png          # Icono de la app
│       └── src/
│           ├── pages/            # Páginas (lazy loaded)
│           ├── components/       # ui, layout, charts, admin
│           ├── services/         # axios + service por dominio
│           ├── hooks/            # useAuth, useApi
│           ├── store/            # Zustand stores
│           ├── lib/              # format, muscles, validators
│           ├── types/            # TS interfaces compartidas
│           └── App.tsx           # Router principal con lazy + Suspense
│
├── docs/
│   ├── banner.svg                # Banner del README
│   └── screenshots/              # Capturas de la app
│
├── package.json                  # Workspace raíz
└── README.md
```

---

## 🛠️ Stack técnico

| Capa | Tecnología | Versión | Por qué |
|---|---|---|---|
| **Lenguaje** | TypeScript | 5.4+ | Strict mode en backend y frontend |
| **Backend runtime** | Node.js | 20 LTS | Estable y rápido |
| **Backend framework** | Express | 4.19 | Ecosistema maduro |
| **ORM** | Prisma | 5.13 | Type-safe, migraciones automáticas, schema declarativo |
| **Base de datos** | PostgreSQL | 15 (Supabase) | Soporta enums, JSON, raw queries |
| **Cache** | Redis | 7 | Sessions, blacklist de tokens |
| **Autenticación** | JWT (access + refresh) | jsonwebtoken 9 | Stateless access, refresh con rotation |
| **2FA** | TOTP | otplib + qrcode | Compatible con Google Authenticator, Authy |
| **Hashing** | bcryptjs | 2.4 | Estándar para passwords |
| **Validación** | Zod | 3.23 | Schemas tipados, frontend + backend |
| **Pagos** | Stripe | 17.5 | Checkout sessions + webhooks + customer portal |
| **IA** | Groq · Llama 3.3 70B | API REST | Free tier generoso, latencia baja |
| **PDF** | PDFKit | 0.15 | Server-side PDF con paleta brand |
| **Email** | Nodemailer | 6.9 | SMTP estándar |
| **Logging** | Winston | 3.13 | Niveles, transports, archivo y consola |
| **Frontend framework** | React | 18 | Hooks, lazy + Suspense, concurrent |
| **Build** | Vite | 5 | Dev server rápido, ESM, code splitting automático |
| **Routing** | react-router-dom | 6 | Lazy routes, type-safe state |
| **State** | Zustand | 4 | Más simple que Redux, hooks, sin boilerplate |
| **Forms** | React Hook Form + Zod | 7 + 3 | Performance, validación end-to-end |
| **Estilos** | Tailwind CSS | 3.4 | Utility-first, paleta custom brand |
| **Iconos** | Lucide React | 0.383 | SVG vectoriales, consistentes |
| **HTTP client** | Axios | 1.16 | Interceptores para refresh automático |
| **Charts** | Custom SVG | — | Sin dependencias pesadas (BarChart, DonutChart, LineChart, YearlyHeatmap propios) |
| **Testing** | Jest + Supertest | 29 + 7 | Unit y de integración |
| **Lint/Format** | ESLint + Prettier | 8 + 3 | Configuración compartida |
| **API Docs** | Swagger (swagger-jsdoc) | 6 | Disponible en `/api/docs` |

---

## 🚀 Puesta en marcha

### Requisitos previos

- **Node.js** ≥ 20 LTS
- **npm** ≥ 10 (incluido con Node)
- **PostgreSQL** ≥ 14 (local con Docker o cuenta gratuita en [Supabase](https://supabase.com))
- **Redis** ≥ 6 (opcional en dev — la app funciona sin él, solo se desactivan algunos caches)
- Cuenta gratuita en [**Groq**](https://groq.com) para la API de IA (gratis con límites generosos)
- Cuenta de [**Stripe**](https://stripe.com) en modo test (opcional — sin Stripe el flujo de Premium queda capado pero la app arranca)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/<tu-usuario>/fitcommunity.git
cd fitcommunity

# 2. Instalar dependencias (un único npm install en la raíz)
npm install

# 3. Configurar variables de entorno
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edita ambos .env con tus valores reales

# 4. Sincronizar schema de Prisma con la BD (crea tablas)
cd apps/backend
npx prisma db push
npx prisma generate

# 5. (Opcional) Cargar datos de ejemplo para desarrollo
npm run db:seed

# 6. Volver a la raíz y arrancar TODO con un comando
cd ../..
npm run dev
```

Después de `npm run dev`:

- **Frontend** → http://localhost:5174
- **Backend** → http://localhost:3001
- **API docs (Swagger UI)** → http://localhost:3001/api/docs
- **Prisma Studio** (explorar la BD) → `cd apps/backend && npm run db:studio` → http://localhost:5555

### Cuentas de demo (tras `npm run db:seed`)

| Cuenta | Email | Contraseña | Acceso |
|---|---|---|---|
| **Admin** | `admin@fitcommunity.com` | `Admin123!` | Panel `/admin` |
| **Marcos** *(Premium)* | `marcos@fitcommunity.com` | `Marcos123!` | IA + todas las features |
| `alex_lifts` *(Premium)* | `alex.strength@fitcommunity.demo` | `Demo123!` | Powerlifter avanzado |
| `sara_gains` *(Premium)* | `sara.gains@fitcommunity.demo` | `Demo123!` | Hipertrofia |
| 6 demos *(Free)* | `*@fitcommunity.demo` | `Demo123!` | Distintos perfiles |

### Variables de entorno mínimas

**`apps/backend/.env`**

```env
# ─── Servidor ────────────────────────────────────
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5174

# ─── Base de datos (Supabase / local) ────────────
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# ─── Auth (genera con: openssl rand -base64 32) ──
JWT_ACCESS_SECRET=cambia-esto-en-produccion-32-chars-min
JWT_REFRESH_SECRET=otro-secreto-distinto-32-chars-min
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Redis (opcional) ────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Email (opcional) ────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@email.com
SMTP_PASS=tu-app-password
SMTP_FROM=FitCommunity <noreply@fitcommunity.app>

# ─── Stripe (opcional) ───────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
PREMIUM_PRICE_EUR=4.99

# ─── IA (Groq) ───────────────────────────────────
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# ─── Rate limiting ───────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=10
```

**`apps/frontend/.env`**

```env
VITE_API_URL=/api
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

> El frontend usa el proxy de Vite para redirigir `/api` al backend en `:3001` durante desarrollo. En producción apuntará al dominio del backend.

---

## 📜 Scripts disponibles

Desde la raíz:

| Comando | Descripción |
|---|---|
| `npm run dev` | Arranca backend + frontend en paralelo con `concurrently` |
| `npm run build` | Compila el backend (`tsc`) y construye el frontend (`vite build`) |
| `npm run lint` | ESLint sobre backend y frontend |
| `npm run format` | Prettier sobre todo el monorepo |
| `npm test` | Ejecuta Jest en el backend |

Específicos del backend (en `apps/backend/`):

| Comando | Descripción |
|---|---|
| `npm run dev` | Nodemon con kill-port para liberar 3001 |
| `npm run build` | Compila TS a `dist/` |
| `npm run start` | Ejecuta `dist/server.js` (producción) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Carga datos de ejemplo |
| `npm run db:studio` | GUI para explorar la BD |
| `npm test` | Jest |
| `npm run test:coverage` | Cobertura de tests |

---

## 🌐 API

La API está documentada con **OpenAPI 3** vía `swagger-jsdoc`. En desarrollo, accede a:

```
http://localhost:3001/api/docs
```

### Endpoints principales

#### Auth (`/api/auth`)

- `POST /register` — registro con email + password (+ verificación email)
- `POST /login` — login (con TOTP si 2FA habilitado)
- `POST /refresh-token` — refresca el access token
- `POST /logout` — cierra sesión y revoca refresh
- `POST /forgot-password` · `POST /reset-password/:token`
- `GET /verify-email/:token`
- `POST /2fa/setup` · `POST /2fa/verify` · `POST /2fa/disable`

#### Users (`/api/users`)

- `GET /me` · `PUT /me` · `POST /me/avatar`
- `GET /me/stats` · `GET /me/export` (GDPR data export en JSON)
- `GET /:idOrUsername` (perfil público)
- `GET /suggestions` (usuarios para seguir)
- `POST /:id/follow` · `DELETE /:id/follow`

#### Workouts (`/api/workouts`)

- `GET /` (paginado + filtros) · `POST /` · `GET /:id` · `PUT /:id` · `DELETE /:id`
- `GET /stats` · `GET /personal-records` · `GET /exercise-progress/:id`
- `GET /calendar/:year/:month` · `GET /heatmap/:year`
- `POST /:id/like` · `DELETE /:id/like`
- `GET /:id/comments` · `POST /:id/comments` · `DELETE /:id/comments/:cid`

#### IA (`/api/ai`) — requiere Premium

- `POST /chat` (multi-turn, contexto enriquecido)
- `GET /conversations` · `GET /conversations/:id` · `DELETE /conversations/:id`
- `POST /routines/generate` · `GET /routines` · `GET /routines/:id`
- `GET /routines/:id/pdf` · `POST /routines/:id/favorite` · `DELETE /routines/:id`
- `POST /routines/:id/activate` · `GET /routines/active/today` · `POST /routines/active/advance`
- `POST /nutrition/generate` · `GET /nutrition` · `GET /nutrition/:id` · `GET /nutrition/:id/pdf`
- `POST /analyze-progress` (con `focus`, `periodDays`, `muscleFocus`, `customQuestion`)

#### Billing (`/api/billing`)

- `POST /checkout-session` · `POST /portal-session` · `GET /subscription`
- `POST /webhook` (raw body, recibe eventos de Stripe)

#### Admin (`/api/admin`) — requiere rol `ADMIN`

- `GET /analytics/overview` · `GET /analytics/users-growth` · `GET /analytics/workouts-stats`
- `GET /activity-feed` (live feed)
- `GET /users` (filtros: status, role, isPremium, search, sortBy, sortDir)
- `GET /users/summary` · `GET /users/export` (CSV)
- `GET /users/:id/details` (ficha completa)
- `POST /users/:id/ban` · `POST /users/:id/unban` · `DELETE /users/:id`
- `PUT /users/:id/premium` · `POST /users/:id/force-logout` · `POST /users/:id/verify-email`
- `POST /users/:id/message` · `GET /workouts` · `DELETE /workouts/:id`
- `GET /subscriptions` · `GET /broadcasts` · `POST /broadcasts`
- `GET /logs` · `GET /health`

### Formato de respuesta

Todas las respuestas siguen el contrato:

```json
{
  "success": true,
  "data": { },
  "message": "Descripción opcional",
  "meta": { "pagination": { "page": 1, "totalPages": 5 } }
}
```

Errores:

```json
{
  "success": false,
  "error": "Mensaje legible para usuario",
  "code": "MACHINE_CODE",
  "details": []
}
```

---

## 🧪 Testing

```bash
cd apps/backend
npm test
npm run test:coverage
```

Suite actual:

- **Unit tests** — `password`, `jwt`, `apiResponse`, `errorHandler`, `workoutsService`
- **Integration tests** (Supertest) — `auth` (registro, login, refresh), `notifications`, `health`, `workouts` (filtros, stats, validación)

Convenciones:

- Tests en `__tests__/` junto al módulo que prueban
- Naming: `<archivo>.test.ts`
- Setup: cada test crea su propio usuario y limpia tras de sí (no compartido state)

---

## 🚢 Despliegue

Recomendado con **3 servicios gratuitos**:

| Servicio | Plataforma | Plan |
|---|---|---|
| Frontend (estático) | [Vercel](https://vercel.com) | Hobby (gratis) |
| Backend (Node) | [Railway](https://railway.app) o [Render](https://render.com) | Gratis con límites |
| Base de datos | [Supabase](https://supabase.com) | Free tier (500MB) |

### Pasos resumidos

1. **Supabase**: crea un nuevo proyecto, copia la `DATABASE_URL` con pooling
2. **Railway**: nuevo proyecto desde GitHub, root directory = `apps/backend`, añade variables de entorno
3. **Vercel**: nuevo proyecto desde GitHub, root directory = `apps/frontend`, configura `VITE_API_URL` apuntando al dominio de Railway
4. **Stripe**: crea un producto + precio en modo test, configura el webhook a `https://<tu-backend>.railway.app/api/billing/webhook` con eventos: `customer.subscription.*`, `invoice.payment_*`
5. **Migrations**: en Railway ejecuta `npx prisma migrate deploy` o `npx prisma db push`

---

## 📁 Estructura completa del schema

20+ modelos en Prisma divididos por dominio:

| Dominio | Modelos |
|---|---|
| Identidad | `User`, `UserProfile`, `RefreshToken`, `EmailVerification`, `PasswordReset` |
| Entrenamiento | `Workout`, `WorkoutExercise`, `WorkoutSet`, `Exercise` |
| Social | `SocialFollow`, `SocialLike`, `SocialComment`, `Notification`, `ContentReport` |
| IA | `AiConversation`, `AiMessage`, `GeneratedRoutine`, `NutritionPlan` |
| Premium | `Subscription` |
| Admin | `AdminLog`, `BroadcastCampaign`, `WorkoutReport` |
| Gamificación | `Badge`, `UserBadge` |

Indexes optimizados en columnas de uso frecuente (`user_id`, `workout_date`, `is_public`, etc.).

---

## 🔐 Seguridad

- ✅ Passwords con **bcryptjs** (rounds = 10)
- ✅ JWT con **secrets diferentes** para access y refresh
- ✅ Refresh tokens **persistidos en BD** con flag `is_revoked` (force logout posible)
- ✅ Refresh tokens en **cookies HttpOnly + SameSite + Secure**
- ✅ **2FA opcional** con TOTP (Google Authenticator compatible)
- ✅ Verificación de email obligatoria
- ✅ Reset de contraseña con tokens de un solo uso (1h expiración)
- ✅ **Rate limiting** general + estricto en `/auth/*` (10 intentos / 15min)
- ✅ **Helmet** para cabeceras de seguridad
- ✅ **CORS** restringido a dominios conocidos
- ✅ Validación de input con **Zod** en todos los endpoints
- ✅ **GDPR data export** (`GET /users/me/export`) en JSON descargable
- ✅ Stripe webhook con **verificación de firma** (raw body)
- ✅ **Audit log** de todas las acciones administrativas

---

## 📈 Decisiones técnicas relevantes

- **Monorepo simple sin Turborepo/Nx**: dos `apps/` (backend, frontend) con un único `package.json` raíz que orquesta scripts. Más simple para un TFG, sin perder beneficios.
- **Lazy loading agresivo del frontend**: todas las rutas se cargan bajo demanda con `React.lazy()` + `Suspense`. Bundle inicial reducido ~6×.
- **Cache en memoria con TTL** propio en lugar de Redis para queries pesadas (`/admin/overview`, `/workouts/stats`, contexto del Coach IA). Funciona sin Redis y es invalidado automáticamente al modificar datos.
- **Charts custom en SVG** (BarChart, DonutChart, LineChart, YearlyHeatmap) — sin Chart.js / Recharts. Reduce dependencias y bundle.
- **Coach IA con contexto enriquecido cacheado**: en lugar de pasar solo el perfil al modelo, inyectamos PRs reales, ejercicios más entrenados, distribución muscular y últimas sesiones. Esto convierte respuestas genéricas en respuestas con números concretos del usuario.
- **Modo entrenamiento en vivo**: vista alternativa al formulario clásico, optimizada para usar EN el gym con cronómetro de descanso, sonido (Web Audio API) y vibración (Vibration API).
- **PDF server-side con PDFKit**: rutinas y dietas exportables a PDF con diseño branded, sin dependencias de Chromium/Puppeteer.

---

## 🎯 Sprints completados

| Sprint | Módulo | Estado |
|---|---|---|
| 1-2 | Auth completo (JWT + 2FA + reset) | ✅ |
| 3-4 | Perfil + Onboarding | ✅ |
| 5-7 | Entrenamientos (workouts + ejercicios + sets) | ✅ |
| 8-9 | Feed comunidad (likes, comentarios, follows) | ✅ |
| 10-11 | Admin Panel (KPIs, usuarios, suscripciones, audit log) | ✅ |
| Post-MVP | Premium · Stripe · IA Groq · Notificaciones · PRs · Swagger | ✅ |
| Diferenciadores | Heatmap anual · Modo en vivo · Live Activity Feed admin | ✅ |
| 12 | Testing + Deployment | 🔜 |

---

## 🤝 Convenciones del proyecto

**Código:**
- TypeScript **strict mode** siempre (cero `any` salvo casts justificados)
- ESLint + Prettier configurados (ejecutar `npm run format` antes de commitear)
- Naming: `camelCase` variables/funciones, `PascalCase` clases/componentes, `snake_case` columnas BD

**Git:**
- Branches: `feature/<nombre>`, `bugfix/<nombre>`, `release/vX.Y.Z`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- Main protegida, requiere PR + 1 review

**API:**
- Respuestas con shape `{ success, data, error?, code?, meta? }`
- Paginación: `{ data: [], meta: { pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } } }`
- Errores con `code` semántico (`UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, …)

---

## 📄 Licencia

Proyecto académico desarrollado como Trabajo Fin de Grado. No apto para uso comercial sin autorización del autor.

---

## 👤 Autor

**Marcos González** — TFG · Mayo 2026

<sub>Desarrollado con TypeScript, café y muchas horas de gimnasio.</sub>
