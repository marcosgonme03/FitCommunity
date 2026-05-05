import { Prisma, FitnessGoal, ExperienceLevel, MuscleGroup } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { aiChat } from '../lib/groq';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { cached, invalidate } from '../utils/memoryCache';

const COACH_CONTEXT_TTL_SECONDS = 60;
const coachCtxKey = (userId: string) => `coach:ctx:${userId}`;

/** Llamar tras crear/editar/borrar workout para que el coach refresque su contexto */
export function invalidateCoachContext(userId: string): void {
  invalidate(coachCtxKey(userId));
}

const COACH_SYSTEM_PROMPT = `Eres "Coach FitCommunity", un entrenador personal experto en gimnasio, fitness y nutrición deportiva con acceso a los DATOS REALES del usuario (entrenamientos, PRs, ejercicios más frecuentes, distribución muscular, racha, sesiones recientes).

REGLAS DE RESPUESTA OBLIGATORIAS:

1. **Usa SIEMPRE los datos reales del usuario** cuando la pregunta sea sobre él/ella. No respondas genéricamente. Ejemplos:
   - "¿Cuál es mi ejercicio estrella?" → mira el bloque "EJERCICIOS MÁS ENTRENADOS" o "RÉCORDS PERSONALES" y responde con números reales del usuario.
   - "¿Cómo voy de progreso?" → mira "ESTADÍSTICAS" y "ÚLTIMAS SESIONES" y compara con números concretos.
   - "¿Qué grupo muscular descuido?" → mira "DISTRIBUCIÓN POR GRUPO MUSCULAR" y señala los más bajos.
   - "¿Cuánto peso debo poner en sentadilla?" → mira sus PRs y propón un trabajo basado en ese 1RM.

2. **Sé concreto con números**. En lugar de "entrenas mucho pecho", di "has hecho X sesiones de pecho en el periodo, lo que representa el N% de tu volumen total".

3. **Si la pregunta es general** (ej: "¿qué es la sobrecarga progresiva?"), responde como un experto pero AL FINAL relaciona la respuesta con los datos del usuario ("en tu caso, podrías aplicarlo subiendo X kg en tu Y").

4. **Tono**: directo, profesional y honesto. Cercano pero NO empalagoso. NADA de "¡Hola! Me alegra que estés aquí". Entra al tema directo. Sin emojis.

5. **Longitud**: máximo 250 palabras salvo que el usuario pida un plan detallado. Sé denso en información, no relleno motivacional.

6. **Estructura**: si la respuesta tiene varios puntos, usa encabezados breves (## Título) y listas con guiones. Si es una respuesta corta, párrafo limpio sin estructura artificial.

7. **Si te falta dato**: dilo claramente. "No veo entrenamientos de press banca registrados en tu histórico, así que no puedo decirte tu PR".

8. **Si la pregunta cae fuera de tu área** (entrenamiento, nutrición, descanso, lesiones leves, motivación), dilo educadamente y redirige.

9. **NUNCA des consejo médico específico** — sugiere consultar con un profesional cuando proceda.`;

const ROUTINE_SYSTEM_PROMPT = `Eres un entrenador personal de élite con 15 años de experiencia entrenando atletas y personas avanzadas. Aplicas principios de evidencia científica (sobrecarga progresiva, especificidad, gestión de la fatiga, periodización).

REGLAS OBLIGATORIAS DE CALIDAD que debes respetar SIEMPRE:

1. **VOLUMEN MÍNIMO POR SESIÓN según duración solicitada:**
   - 30-45 min → mínimo 5 ejercicios por sesión
   - 46-60 min → mínimo 6 ejercicios por sesión
   - 61-90 min → mínimo 7-8 ejercicios por sesión
   - 91-120 min → mínimo 8-10 ejercicios por sesión
   - >120 min → mínimo 10 ejercicios por sesión
   NUNCA generes una sesión con menos de 5 ejercicios. Una rutina con 2-3 ejercicios es inaceptable y será rechazada.

2. **VOLUMEN MÍNIMO SEMANAL POR GRUPO MUSCULAR (sets de trabajo, sin contar calentamiento):**
   - Principiante: 8-12 sets/semana por grupo principal
   - Intermedio: 12-18 sets/semana por grupo principal
   - Avanzado/Profesional: 16-22 sets/semana por grupo principal
   Reparte el volumen entre los días según la división elegida.

3. **ESTRUCTURA OBLIGATORIA DE CADA SESIÓN:**
   - 1-2 ejercicios COMPUESTOS pesados primero (sentadilla, peso muerto, press banca, dominadas, press militar, remo) con 3-5 series de 4-8 reps si el objetivo es fuerza/hipertrofia
   - 2-3 ejercicios de ASISTENCIA con 3-4 series de 8-12 reps
   - 2-3 ejercicios de AISLAMIENTO al final con 3-4 series de 10-15 reps
   - Opcional: 1 finisher metabólico

4. **ELIGE LA DIVISIÓN ÓPTIMA según días/semana:**
   - 2 días: Full body × 2
   - 3 días: Full body × 3 o Push/Pull/Legs
   - 4 días: Upper/Lower × 2 o PPL+Full body
   - 5 días: PPL + Upper/Lower
   - 6 días: PPL × 2 o Bro split
   - 7 días: 6 días entreno + 1 ligero/movilidad

5. **DESCANSOS POR TIPO DE EJERCICIO:**
   - Compuestos pesados (4-6 reps): 180-240s
   - Compuestos hipertrofia (6-12 reps): 120-180s
   - Aislamiento: 60-90s
   - Metabólicos/cardio: 30-60s

6. **AJUSTA INTENSIDAD AL OBJETIVO:**
   - HYPERTROPHY/GAIN_MUSCLE: Mayoría 6-12 reps, RPE 7-9
   - IMPROVE_STRENGTH/POWERLIFTING: 3-6 reps en compuestos, RPE 8-9
   - LOSE_WEIGHT: Más volumen total, descansos más cortos, incluir circuitos o supersets, 8-15 reps
   - STAY_HEALTHY: Equilibrio total, 8-12 reps, RPE 6-8
   - RECOMP: Combinación hipertrofia + déficit calórico

7. **NOMBRES DE EJERCICIOS** en español neutro y consistente. Usa nombres CLÁSICOS reconocibles: "Press banca con barra", "Sentadilla con barra", "Peso muerto convencional", "Dominadas", "Remo con barra", "Press militar con barra", "Hip thrust", "Curl bíceps con mancuernas", "Extensiones de tríceps en polea", "Elevaciones laterales", "Prensa de piernas", "Femoral tumbado", "Extensiones de cuádriceps", "Pájaros", "Face pulls", etc.

8. **EVITA repetir el mismo ejercicio entre días consecutivos** salvo que sea un programa específico tipo Smolov.

9. **Cada ejercicio debe tener notas técnicas útiles** (no genéricas tipo "buena técnica"): qué activar, qué evitar, tips ejecutivos.

10. **Adapta al equipamiento real disponible.** Si solo hay BODYWEIGHT_ONLY, no propongas peso muerto con barra.

Devuelve EXCLUSIVAMENTE un JSON válido (sin markdown, sin backticks, sin texto fuera del JSON) con esta estructura EXACTA:
{
  "title": "Nombre corto y descriptivo (ej: 'PPL hipertrofia 5 días')",
  "summary": "Resumen 2-3 frases del enfoque, división elegida y volumen semanal aproximado por grupo muscular",
  "weekly_plan": [
    {
      "day": 1,
      "focus": "Pecho, hombros y tríceps (Push)",
      "warmup": "5-10 min cardio suave + movilidad de hombros + 2 series ligeras del primer compuesto",
      "exercises": [
        {
          "name": "Press banca con barra",
          "sets": 4,
          "reps": "6-8",
          "rest_sec": 180,
          "notes": "Retracción escapular, codos a 45°, controla bajada 2s, no rebotes en el pecho"
        }
      ],
      "cooldown": "Estiramientos pectoral mayor, deltoides y tríceps 5 min"
    }
  ],
  "tips": ["Sube peso o reps cada 1-2 semanas (sobrecarga progresiva)", "Duerme mínimo 7h", "Proteína: 1.6-2.2g/kg peso corporal/día", "Si sientes dolor articular, baja peso y revisa técnica"]
}`;

const NUTRITION_SYSTEM_PROMPT = `Eres un nutricionista deportivo. Calculas necesidades calóricas y macros con precisión y diseñas un plan alimentario realista.
Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura exacta (en español):
{
  "title": "Plan de [objetivo] — N kcal",
  "summary": "Justificación breve del plan",
  "daily_calories": 2500,
  "macros": { "protein_g": 180, "carbs_g": 280, "fat_g": 80 },
  "weekly_plan": [
    {
      "day": "Lunes",
      "meals": [
        {
          "name": "Desayuno",
          "kcal": 600,
          "items": ["3 huevos revueltos", "Avena 80g con leche y plátano", "1 puñado de frutos secos"]
        }
      ]
    }
  ],
  "tips": ["Beber 2-3 L de agua", "Comer cada 3-4 h"]
}
Solo JSON, sin texto extra ni markdown.`;

const ANALYSIS_SYSTEM_PROMPT = `Eres un entrenador deportivo analítico de élite. Recibes datos cuantitativos del progreso del usuario (volumen, frecuencia, distribución muscular, PRs, racha, intensidad) y le devuelves un análisis EXPERTO y accionable.

REGLAS:
- Responde SIEMPRE en español, formato Markdown limpio (sin bloques de código, sin tablas).
- Sé CONCRETO con números: "has hecho X entrenamientos en Y días, eso son Z/semana".
- Sé HONESTO: si lo está haciendo mal, dilo claramente con datos.
- Adapta tu análisis al FOCO solicitado (general, fuerza, hipertrofia, pérdida de peso, recuperación, balance muscular, prevención de lesiones).
- Si el usuario plantea una pregunta concreta, ATIÉNDELA explícitamente además del análisis general.

ESTRUCTURA OBLIGATORIA (con estos H2 EXACTOS, sin emojis ni iconos):
## Lo que estás haciendo bien
2-3 puntos con datos concretos.

## Áreas de mejora
2-3 puntos accionables, basados en los datos. Identifica desbalances de volumen, frecuencia insuficiente, etc.

## Plan de acción
4-5 acciones MUY específicas para los próximos 7 días: días que entrenar, qué grupo muscular añadir, qué ejercicio incorporar, qué medir, etc.

## Métricas a vigilar
2-3 KPIs que el usuario debería monitorizar para saber si va por buen camino.

NO uses emojis NUNCA en el output (ni en headings ni en el cuerpo). Mantén un tono profesional y directo.
Máximo 450 palabras totales. Si hay pregunta específica del usuario, dedícale 1-2 párrafos extra al final con título exacto "## Tu pregunta".`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Wrapper cacheado (60s) que devuelve el contexto enriquecido del usuario
 * para inyectar en el system prompt del Coach IA.
 *
 * El cache se invalida automáticamente cuando el usuario crea/edita/borra
 * un workout (ver `invalidateCoachContext` llamado desde workouts.service).
 */
async function getUserContext(userId: string): Promise<string> {
  return cached(coachCtxKey(userId), COACH_CONTEXT_TTL_SECONDS, () => buildUserContext(userId));
}

/**
 * Construye el contexto enriquecido del usuario que se inyecta en el system prompt
 * del Coach IA. Incluye perfil, estadísticas reales, top ejercicios, PRs, distribución
 * muscular y últimas sesiones — para que el coach pueda dar respuestas basadas en
 * datos concretos en lugar de respuestas genéricas.
 *
 * Coste: ~6 queries en paralelo, ~600-800 tokens en el prompt. Cacheado 60s por usuario.
 */
async function buildUserContext(userId: string): Promise<string> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [profile, totalsAgg, monthAgg, byMuscle, topByFreq, topPRs, recentWorkouts, allDates] =
    await Promise.all([
      prisma.userProfile.findUnique({
        where: { user_id: userId },
        select: {
          display_name: true,
          height_cm: true,
          weight_kg: true,
          fitness_goal: true,
          experience_level: true,
        },
      }),
      prisma.workout.aggregate({
        where: { user_id: userId },
        _count: true,
        _sum: { duration_min: true, calories: true },
      }),
      prisma.workout.aggregate({
        where: { user_id: userId, workout_date: { gte: thirtyDaysAgo } },
        _count: true,
        _sum: { duration_min: true },
      }),
      prisma.$queryRaw<Array<{ muscle: MuscleGroup; sessions: bigint }>>`
        SELECT e.primary_muscle as muscle, COUNT(DISTINCT w.id)::bigint as sessions
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN exercises e ON e.id = we.exercise_id
        WHERE w.user_id = ${userId}
        GROUP BY e.primary_muscle
        ORDER BY sessions DESC
        LIMIT 6
      `,
      // Top 5 ejercicios por frecuencia
      prisma.$queryRaw<Array<{ name: string; sessions: bigint }>>`
        SELECT e.name, COUNT(DISTINCT w.id)::bigint as sessions
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN exercises e ON e.id = we.exercise_id
        WHERE w.user_id = ${userId}
        GROUP BY e.id, e.name
        ORDER BY sessions DESC
        LIMIT 5
      `,
      // Top 5 PRs (mejor peso × reps por ejercicio)
      prisma.$queryRaw<Array<{
        name: string;
        max_weight: number;
        reps_at_max: number;
        estimated_1rm: number;
      }>>`
        WITH best_set AS (
          SELECT DISTINCT ON (e.id)
            e.name,
            ws.weight_kg as max_weight,
            ws.reps as reps_at_max,
            ROUND((ws.weight_kg * (1 + ws.reps::numeric / 30))::numeric, 1) as estimated_1rm
          FROM workouts w
          INNER JOIN workout_exercises we ON we.workout_id = w.id
          INNER JOIN exercises e ON e.id = we.exercise_id
          INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
          WHERE w.user_id = ${userId}
            AND ws.is_warmup = false
            AND ws.weight_kg IS NOT NULL
            AND ws.weight_kg > 0
          ORDER BY e.id, ws.weight_kg DESC, ws.reps DESC
        )
        SELECT * FROM best_set
        ORDER BY estimated_1rm DESC
        LIMIT 5
      `,
      // Últimas 3 sesiones con resumen
      prisma.workout.findMany({
        where: { user_id: userId },
        select: {
          title: true,
          workout_date: true,
          duration_min: true,
          intensity: true,
          exercises: {
            select: {
              exercise: { select: { name: true } },
            },
            take: 5,
          },
        },
        orderBy: { workout_date: 'desc' },
        take: 3,
      }),
      // Para calcular racha
      prisma.workout.findMany({
        where: { user_id: userId },
        select: { workout_date: true },
        orderBy: { workout_date: 'desc' },
        take: 90,
      }),
    ]);

  if (!profile) return '';

  const totalWorkouts = totalsAgg._count;
  const totalMinutes = totalsAgg._sum.duration_min ?? 0;
  const totalCalories = totalsAgg._sum.calories ?? 0;
  const monthWorkouts = monthAgg._count;
  const monthMinutes = monthAgg._sum.duration_min ?? 0;

  // Calcular racha de días consecutivos (entrenando hoy o ayer hacia atrás)
  let streak = 0;
  if (allDates.length > 0) {
    const dayKeys = new Set(allDates.map((d) => d.workout_date.toISOString().slice(0, 10)));
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    if (!dayKeys.has(cursor.toISOString().slice(0, 10))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  // Frecuencia semanal aprox (sobre últimos 30 días)
  const freqPerWeek = monthWorkouts > 0 ? +(monthWorkouts / (30 / 7)).toFixed(1) : 0;

  // Construir el bloque de contexto
  const lines: string[] = [];

  lines.push('=== DATOS REALES DEL USUARIO (extraídos de su histórico en FitCommunity) ===\n');

  // Perfil
  lines.push('PERFIL:');
  lines.push(`- Nombre: ${profile.display_name ?? 'Atleta'}`);
  if (profile.height_cm) lines.push(`- Altura: ${profile.height_cm} cm`);
  if (profile.weight_kg) lines.push(`- Peso: ${profile.weight_kg} kg`);
  if (profile.fitness_goal) lines.push(`- Objetivo: ${profile.fitness_goal}`);
  if (profile.experience_level) lines.push(`- Nivel: ${profile.experience_level}`);

  // Estadísticas
  lines.push('\nESTADÍSTICAS DE ENTRENAMIENTO:');
  if (totalWorkouts === 0) {
    lines.push('- Sin entrenamientos registrados todavía');
  } else {
    const totalHours = (totalMinutes / 60).toFixed(1);
    lines.push(`- ${totalWorkouts} entrenamientos totales · ${totalHours}h · ${totalCalories} kcal estimadas`);
    lines.push(`- Últimos 30 días: ${monthWorkouts} sesiones (${freqPerWeek}/semana) · ${(monthMinutes / 60).toFixed(1)}h`);
    lines.push(`- Racha actual: ${streak} día${streak === 1 ? '' : 's'} consecutivo${streak === 1 ? '' : 's'} entrenando`);
  }

  // Distribución muscular
  if (byMuscle.length > 0) {
    lines.push('\nDISTRIBUCIÓN POR GRUPO MUSCULAR (sesiones que ha tocado cada uno):');
    byMuscle.forEach((m) => {
      lines.push(`- ${m.muscle}: ${Number(m.sessions)} sesiones`);
    });
  }

  // Top ejercicios por frecuencia
  if (topByFreq.length > 0) {
    lines.push('\nEJERCICIOS MÁS ENTRENADOS (top 5 por frecuencia):');
    topByFreq.forEach((e, i) => {
      lines.push(`${i + 1}. ${e.name} — ${Number(e.sessions)} sesiones`);
    });
  }

  // PRs
  if (topPRs.length > 0) {
    lines.push('\nRÉCORDS PERSONALES (top 5 por 1RM estimado, fórmula Epley):');
    topPRs.forEach((pr, i) => {
      lines.push(`${i + 1}. ${pr.name}: ${pr.max_weight}kg × ${pr.reps_at_max} reps (≈ ${pr.estimated_1rm}kg 1RM)`);
    });
  }

  // Últimas sesiones
  if (recentWorkouts.length > 0) {
    lines.push('\nÚLTIMAS SESIONES:');
    recentWorkouts.forEach((w) => {
      const exNames = w.exercises.map((we) => we.exercise.name).join(', ');
      const date = w.workout_date.toISOString().slice(0, 10);
      lines.push(`- ${date} · ${w.title} · ${w.duration_min}min · ${w.intensity} · [${exNames}]`);
    });
  }

  lines.push('\n=== FIN DE LOS DATOS DEL USUARIO ===');

  return `\n\n${lines.join('\n')}`;
}

function tryParseJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    // Strip code-fences if the model added them despite the instructions
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Coach Chat — multi-turn conversation persisted to DB.
   */
  async chat(userId: string, params: { conversationId?: string; message: string }) {
    let conversation = params.conversationId
      ? await prisma.aiConversation.findFirst({
          where: { id: params.conversationId, user_id: userId },
          include: { messages: { orderBy: { created_at: 'asc' } } },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: {
          user_id: userId,
          kind: 'COACH_CHAT',
          title: params.message.slice(0, 60),
        },
        include: { messages: true },
      });
    }

    // Persist user message
    await prisma.aiMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'user',
        content: params.message,
      },
    });

    const userContext = await getUserContext(userId);
    const messages = [
      { role: 'system' as const, content: COACH_SYSTEM_PROMPT + userContext },
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: params.message },
    ];

    const completion = await aiChat({ messages, temperature: 0.5, maxTokens: 1000 });

    // Persist assistant message
    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'assistant',
        content: completion.content,
        tokens: completion.completionTokens,
      },
    });

    // Refresh updated_at
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updated_at: new Date() },
    });

    return {
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: 'assistant',
        content: completion.content,
        createdAt: assistantMessage.created_at,
      },
    };
  },

  async listConversations(userId: string) {
    return prisma.aiConversation.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        kind: true,
        title: true,
        created_at: true,
        updated_at: true,
        _count: { select: { messages: true } },
      },
      orderBy: { updated_at: 'desc' },
    });
  },

  async getConversation(userId: string, conversationId: string) {
    const conv = await prisma.aiConversation.findFirst({
      where: { id: conversationId, user_id: userId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            created_at: true,
          },
        },
      },
    });
    if (!conv) return null;
    return conv;
  },

  async deleteConversation(userId: string, conversationId: string) {
    const conv = await prisma.aiConversation.findFirst({
      where: { id: conversationId, user_id: userId },
    });
    if (!conv) return false;
    await prisma.aiConversation.delete({ where: { id: conversationId } });
    return true;
  },

  /**
   * Generate a workout routine and persist it.
   */
  async generateRoutine(userId: string, params: {
    goal: FitnessGoal;
    daysPerWeek: number;
    sessionMinutes: number;
    experienceLevel: ExperienceLevel;
    equipment: string[];
    notes?: string;
  }) {
    const userContext = await getUserContext(userId);

    // Calcular ejercicios mínimos esperados según duración (debe coincidir con la regla
    // del system prompt) para reforzar el requisito en el mensaje del usuario.
    const minExercisesPerSession =
      params.sessionMinutes <= 45 ? 5
      : params.sessionMinutes <= 60 ? 6
      : params.sessionMinutes <= 90 ? 8
      : params.sessionMinutes <= 120 ? 10
      : 10;

    const prompt = `Genera una rutina semanal de gimnasio personalizada con estos parámetros:
- Objetivo: ${params.goal}
- Días por semana: ${params.daysPerWeek}
- Duración por sesión: ${params.sessionMinutes} min
- Nivel: ${params.experienceLevel}
- Equipamiento disponible: ${params.equipment.join(', ')}
${params.notes ? `- Notas adicionales: ${params.notes}` : ''}
${userContext}

REQUISITOS CRÍTICOS para esta rutina concreta:
- DEBE incluir EXACTAMENTE ${params.daysPerWeek} días en weekly_plan, ni más ni menos.
- CADA día DEBE tener AL MENOS ${minExercisesPerSession} ejercicios (es la duración de ${params.sessionMinutes} min).
- Empieza siempre por compuestos pesados, asistencia en el medio, aislamiento al final.
- Cumple el volumen semanal mínimo por grupo muscular según el nivel ${params.experienceLevel}.
- Si rechazas algún ejercicio por equipamiento, sustitúyelo por una alternativa equivalente, NUNCA reduzcas el número total.

Devuelve únicamente el JSON con la estructura indicada. Sin markdown.`;

    const completion = await aiChat({
      messages: [
        { role: 'system', content: ROUTINE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5, // Más bajo = más coherente y menos creativo en estructura
      maxTokens: 4500,  // Subido de 2500: necesitamos espacio para rutinas con 7-10 ejercicios × 5-6 días
      responseJson: true,
    });

    const parsed = tryParseJson<{
      title: string;
      summary: string;
      weekly_plan: unknown;
      tips?: string[];
    }>(completion.content);

    if (!parsed || !parsed.title || !parsed.weekly_plan) {
      logger.warn('Routine JSON parse failed:', completion.content.slice(0, 300));
      throw new AppError('La IA devolvió una rutina con formato inválido', 502, 'AI_INVALID_FORMAT');
    }

    // ─── Validación de calidad mínima ─────────────────────────────────────
    // Rechazamos rutinas que claramente no cumplen el prompt (ej: solo 2-3
    // ejercicios por día) para que el usuario pueda reintentar.
    const weeklyPlan = parsed.weekly_plan as Array<{ exercises?: unknown[] }>;
    if (!Array.isArray(weeklyPlan) || weeklyPlan.length === 0) {
      throw new AppError('La IA generó una rutina vacía. Vuelve a intentarlo.', 502, 'AI_LOW_QUALITY');
    }
    if (weeklyPlan.length !== params.daysPerWeek) {
      logger.warn(
        `Routine has ${weeklyPlan.length} days but user asked for ${params.daysPerWeek}`
      );
      // No la rechazamos, pero lo registramos
    }
    const tooThinDays = weeklyPlan.filter(
      (d) => !Array.isArray(d.exercises) || d.exercises.length < 3
    );
    if (tooThinDays.length > 0) {
      logger.warn(
        `Routine quality too low: ${tooThinDays.length}/${weeklyPlan.length} days have <3 exercises`
      );
      throw new AppError(
        'La IA ha generado una rutina demasiado corta. Vuelve a intentarlo (suele funcionar al segundo intento).',
        502,
        'AI_LOW_QUALITY'
      );
    }

    const routine = await prisma.generatedRoutine.create({
      data: {
        user_id: userId,
        title: parsed.title.slice(0, 200),
        goal: params.goal,
        days_per_week: params.daysPerWeek,
        session_minutes: params.sessionMinutes,
        experience_level: params.experienceLevel,
        plan_json: parsed as Prisma.InputJsonValue,
      },
    });

    return routine;
  },

  async listRoutines(userId: string) {
    return prisma.generatedRoutine.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  },

  async getRoutine(userId: string, routineId: string) {
    return prisma.generatedRoutine.findFirst({
      where: { id: routineId, user_id: userId },
    });
  },

  async toggleRoutineFavorite(userId: string, routineId: string) {
    const r = await prisma.generatedRoutine.findFirst({ where: { id: routineId, user_id: userId } });
    if (!r) return null;
    return prisma.generatedRoutine.update({
      where: { id: routineId },
      data: { is_favorite: !r.is_favorite },
    });
  },

  async deleteRoutine(userId: string, routineId: string) {
    const r = await prisma.generatedRoutine.findFirst({ where: { id: routineId, user_id: userId } });
    if (!r) return false;
    await prisma.generatedRoutine.delete({ where: { id: routineId } });
    return true;
  },

  /**
   * Generate a nutrition plan.
   */
  async generateNutrition(userId: string, params: {
    goal: FitnessGoal;
    heightCm: number;
    weightKg: number;
    age: number;
    sex: 'MALE' | 'FEMALE' | 'OTHER';
    activityLevel: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'INTENSE' | 'EXTREME';
    dietaryRestrictions?: string[];
    notes?: string;
  }) {
    const prompt = `Genera un plan nutricional semanal personalizado:
- Objetivo: ${params.goal}
- Altura: ${params.heightCm} cm
- Peso: ${params.weightKg} kg
- Edad: ${params.age} años
- Sexo: ${params.sex}
- Nivel de actividad: ${params.activityLevel}
${params.dietaryRestrictions?.length ? `- Restricciones: ${params.dietaryRestrictions.join(', ')}` : ''}
${params.notes ? `- Notas: ${params.notes}` : ''}

Calcula primero las kcal y macros usando la fórmula de Mifflin-St Jeor + factor de actividad.
Devuelve únicamente el JSON con la estructura indicada.`;

    const completion = await aiChat({
      messages: [
        { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 3000,
      responseJson: true,
    });

    const parsed = tryParseJson<{
      title: string;
      summary: string;
      daily_calories: number;
      macros: { protein_g: number; carbs_g: number; fat_g: number };
      weekly_plan: unknown;
      tips?: string[];
    }>(completion.content);

    if (!parsed || !parsed.daily_calories || !parsed.macros) {
      logger.warn('Nutrition JSON parse failed:', completion.content.slice(0, 300));
      throw new AppError('La IA devolvió un plan con formato inválido', 502, 'AI_INVALID_FORMAT');
    }

    const plan = await prisma.nutritionPlan.create({
      data: {
        user_id: userId,
        title: parsed.title.slice(0, 200),
        goal: params.goal,
        daily_calories: parsed.daily_calories,
        protein_g: parsed.macros.protein_g,
        carbs_g: parsed.macros.carbs_g,
        fat_g: parsed.macros.fat_g,
        plan_json: parsed as Prisma.InputJsonValue,
      },
    });

    return plan;
  },

  async listNutritionPlans(userId: string) {
    return prisma.nutritionPlan.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  },

  async getNutritionPlan(userId: string, planId: string) {
    return prisma.nutritionPlan.findFirst({
      where: { id: planId, user_id: userId },
    });
  },

  /** Incrementa el contador de descargas de PDF de una rutina (fire-and-forget) */
  async incrementRoutineDownload(routineId: string): Promise<void> {
    await prisma.generatedRoutine.update({
      where: { id: routineId },
      data: { download_count: { increment: 1 } },
    }).catch(() => undefined);
  },

  /** Incrementa el contador de descargas de PDF de un plan nutricional */
  async incrementNutritionDownload(planId: string): Promise<void> {
    await prisma.nutritionPlan.update({
      where: { id: planId },
      data: { download_count: { increment: 1 } },
    }).catch(() => undefined);
  },

  async deleteNutritionPlan(userId: string, planId: string) {
    const p = await prisma.nutritionPlan.findFirst({ where: { id: planId, user_id: userId } });
    if (!p) return false;
    await prisma.nutritionPlan.delete({ where: { id: planId } });
    return true;
  },

  /**
   * Analyze recent progress with HYPER-PERSONALIZED data based on focus,
   * muscle focus, and free-text question intent. Returns Markdown advice.
   */
  async analyzeProgress(
    userId: string,
    options: {
      periodDays?: number;
      focus?: 'GENERAL' | 'STRENGTH' | 'HYPERTROPHY' | 'WEIGHT_LOSS' | 'RECOVERY' | 'MUSCLE_BALANCE' | 'INJURY_PREVENTION';
      muscleFocus?: string;
      customQuestion?: string;
    } = {}
  ) {
    const periodDays = Math.min(Math.max(options.periodDays ?? 30, 7), 365);
    const focus = options.focus ?? 'GENERAL';
    const muscleFocus = options.muscleFocus?.trim();
    const customQuestion = options.customQuestion?.trim();

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - periodDays);

    // ─── 1. Datos base (siempre) ─────────────────────────────────────────
    const [profile, workouts, byMuscle, volumeStats, prCount] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { user_id: userId },
        select: {
          fitness_goal: true,
          experience_level: true,
          weight_kg: true,
          height_cm: true,
        },
      }),
      prisma.workout.aggregate({
        where: { user_id: userId, workout_date: { gte: periodStart } },
        _count: true,
        _sum: { duration_min: true, calories: true },
        _avg: { duration_min: true },
      }),
      prisma.$queryRaw<Array<{ muscle: MuscleGroup; count: bigint }>>`
        SELECT e.primary_muscle as muscle, COUNT(DISTINCT w.id)::bigint as count
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN exercises e ON e.id = we.exercise_id
        WHERE w.user_id = ${userId}
          AND w.workout_date >= ${periodStart}
        GROUP BY e.primary_muscle
        ORDER BY count DESC
      `,
      prisma.$queryRaw<Array<{ total_volume: number | null; total_sets: bigint; avg_intensity: string | null }>>`
        SELECT
          COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float as total_volume,
          COUNT(ws.id)::bigint as total_sets,
          MODE() WITHIN GROUP (ORDER BY w.intensity)::text as avg_intensity
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ${userId}
          AND w.workout_date >= ${periodStart}
          AND ws.is_warmup = false
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT we.exercise_id)::bigint as count
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ${userId}
          AND ws.weight_kg IS NOT NULL
          AND ws.weight_kg > 0
      `,
    ]);

    if (!workouts._count) {
      throw new AppError(
        `Sin entrenamientos en los últimos ${periodDays} días. Registra alguno o amplía el periodo.`,
        400,
        'NOT_ENOUGH_DATA'
      );
    }

    const muscleDistribution = byMuscle.map((m) => ({
      muscle: m.muscle,
      count: Number(m.count),
    }));

    const volume = volumeStats[0] ?? { total_volume: 0, total_sets: 0n, avg_intensity: null };
    const totalPRs = Number(prCount[0]?.count ?? 0n);

    // ─── 2. Detección de intención en la pregunta del usuario ──────────
    const intent = customQuestion ? await detectQuestionIntent(customQuestion) : null;

    // ─── 3. Datos específicos según foco / pregunta ─────────────────────
    const enrichedContext: string[] = [];

    // 3a. Patrón de frecuencia (siempre útil para todos los focos)
    const dailyWorkouts = await prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>`
      SELECT DATE_TRUNC('day', workout_date) as day, COUNT(*)::bigint as cnt
      FROM workouts
      WHERE user_id = ${userId} AND workout_date >= ${periodStart}
      GROUP BY DATE_TRUNC('day', workout_date)
      ORDER BY day ASC
    `;
    const trainedDays = dailyWorkouts.length;
    const restDays = periodDays - trainedDays;
    const consecDays = computeMaxConsecutive(dailyWorkouts.map((d) => d.day));
    enrichedContext.push(
      `PATRÓN DE FRECUENCIA:\n- Días entrenados: ${trainedDays}/${periodDays}\n- Días descansados: ${restDays}\n- Racha máxima de días seguidos sin descansar: ${consecDays}`
    );

    // 3b. Tendencia: comparar primera mitad vs segunda mitad del periodo
    const midpoint = new Date(periodStart);
    midpoint.setDate(midpoint.getDate() + Math.floor(periodDays / 2));
    const trendData = await prisma.$queryRaw<Array<{ half: number; cnt: bigint; vol: number | null }>>`
      SELECT
        CASE WHEN w.workout_date < ${midpoint} THEN 1 ELSE 2 END as half,
        COUNT(DISTINCT w.id)::bigint as cnt,
        COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float as vol
      FROM workouts w
      LEFT JOIN workout_exercises we ON we.workout_id = w.id
      LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.is_warmup = false
      WHERE w.user_id = ${userId} AND w.workout_date >= ${periodStart}
      GROUP BY half
      ORDER BY half
    `;
    if (trendData.length === 2) {
      const first = trendData[0];
      const second = trendData[1];
      const cntChange = ((Number(second.cnt) - Number(first.cnt)) / Math.max(Number(first.cnt), 1)) * 100;
      const volChange = ((Number(second.vol ?? 0) - Number(first.vol ?? 0)) / Math.max(Number(first.vol ?? 0), 1)) * 100;
      enrichedContext.push(
        `TENDENCIA (1ª mitad vs 2ª mitad del periodo):\n- Frecuencia: ${first.cnt} → ${second.cnt} sesiones (${cntChange >= 0 ? '+' : ''}${cntChange.toFixed(0)}%)\n- Volumen: ${Math.round(Number(first.vol ?? 0))} kg → ${Math.round(Number(second.vol ?? 0))} kg (${volChange >= 0 ? '+' : ''}${volChange.toFixed(0)}%)`
      );
    }

    // 3c. Si pregunta sobre un EJERCICIO específico, traer su histórico
    if (intent?.matchedExercise) {
      const progressionRows = await prisma.$queryRaw<Array<{
        workout_date: Date;
        max_weight: number;
        max_reps: number;
        total_volume: number;
      }>>`
        SELECT
          w.workout_date,
          MAX(ws.weight_kg) as max_weight,
          MAX(ws.reps) as max_reps,
          SUM(ws.weight_kg * ws.reps) as total_volume
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ${userId}
          AND we.exercise_id = ${intent.matchedExercise.id}
          AND ws.is_warmup = false
          AND ws.weight_kg IS NOT NULL
        GROUP BY w.workout_date
        ORDER BY w.workout_date DESC
        LIMIT 12
      `;

      if (progressionRows.length > 0) {
        const first = progressionRows[progressionRows.length - 1];
        const last = progressionRows[0];
        const change = first.max_weight > 0
          ? ((last.max_weight - first.max_weight) / first.max_weight) * 100
          : 0;

        enrichedContext.push(
          `HISTÓRICO ESPECÍFICO DE "${intent.matchedExercise.name}" (últimas ${progressionRows.length} sesiones, más reciente primero):\n${progressionRows
            .slice(0, 8)
            .map(
              (r, i) =>
                `  ${i + 1}. ${r.workout_date.toISOString().slice(0, 10)} → max ${r.max_weight}kg × ${r.max_reps} reps · vol ${Math.round(r.total_volume)} kg`
            )
            .join('\n')}\n- Evolución del peso máximo: ${first.max_weight}kg → ${last.max_weight}kg (${change >= 0 ? '+' : ''}${change.toFixed(1)}%)`
        );
      } else {
        enrichedContext.push(
          `EJERCICIO MENCIONADO: "${intent.matchedExercise.name}" — pero no hay sesiones registradas con peso para este ejercicio en el histórico del usuario.`
        );
      }
    }

    // 3d. Si hay foco de músculo o intención de músculo, traer volumen detallado
    const targetMuscle = (muscleFocus || intent?.matchedMuscle) ?? null;
    if (targetMuscle) {
      const muscleDetail = await prisma.$queryRaw<Array<{
        week_start: Date;
        sessions: bigint;
        total_sets: bigint;
        total_volume: number;
      }>>`
        SELECT
          DATE_TRUNC('week', w.workout_date) as week_start,
          COUNT(DISTINCT w.id)::bigint as sessions,
          COUNT(ws.id)::bigint as total_sets,
          COALESCE(SUM(ws.weight_kg * ws.reps), 0)::float as total_volume
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN exercises e ON e.id = we.exercise_id
        LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.is_warmup = false
        WHERE w.user_id = ${userId}
          AND w.workout_date >= ${periodStart}
          AND e.primary_muscle = ${targetMuscle}::"MuscleGroup"
        GROUP BY DATE_TRUNC('week', w.workout_date)
        ORDER BY week_start ASC
      `;

      if (muscleDetail.length > 0) {
        enrichedContext.push(
          `EVOLUCIÓN SEMANAL DE "${targetMuscle}" en el periodo:\n${muscleDetail
            .map(
              (w) =>
                `  Semana ${w.week_start.toISOString().slice(0, 10)}: ${Number(w.sessions)} sesiones · ${Number(w.total_sets)} series · ${Math.round(Number(w.total_volume ?? 0))} kg vol`
            )
            .join('\n')}`
        );
      } else {
        enrichedContext.push(
          `Grupo muscular "${targetMuscle}" sin trabajo registrado en el periodo. Eso ya es un dato relevante.`
        );
      }
    }

    // 3e. Si foco es STRENGTH o pregunta sobre progreso, top 5 lifts
    if (focus === 'STRENGTH' || intent?.mentionsProgress) {
      const topLifts = await prisma.$queryRaw<Array<{
        exercise_name: string;
        max_weight: number;
        reps_at_max: number;
        last_session: Date;
      }>>`
        SELECT DISTINCT ON (e.id)
          e.name as exercise_name,
          ws.weight_kg as max_weight,
          ws.reps as reps_at_max,
          w.workout_date as last_session
        FROM workouts w
        INNER JOIN workout_exercises we ON we.workout_id = w.id
        INNER JOIN exercises e ON e.id = we.exercise_id
        INNER JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ${userId}
          AND ws.is_warmup = false
          AND ws.weight_kg IS NOT NULL
          AND ws.weight_kg > 0
        ORDER BY e.id, ws.weight_kg DESC, ws.reps DESC
        LIMIT 5
      `;
      if (topLifts.length > 0) {
        enrichedContext.push(
          `TOP 5 LIFTS DEL USUARIO (todos los tiempos):\n${topLifts
            .map((l) => `  - ${l.exercise_name}: ${l.max_weight}kg × ${l.reps_at_max} reps (última sesión: ${l.last_session.toISOString().slice(0, 10)})`)
            .join('\n')}`
        );
      }
    }

    // 3f. Si foco es MUSCLE_BALANCE, mostrar ratios push/pull, quad/ham, etc.
    if (focus === 'MUSCLE_BALANCE') {
      const balance = computeMuscleBalance(muscleDistribution);
      enrichedContext.push(`RATIOS DE BALANCE MUSCULAR (sesiones por grupo):\n${balance}`);
    }

    // 3g. Si foco es RECOVERY o pregunta sobre descanso/cansancio
    if (focus === 'RECOVERY' || intent?.mentionsRest) {
      enrichedContext.push(
        `INDICADORES DE RECUPERACIÓN:\n- Días entrenados consecutivos máximo: ${consecDays}\n- Ratio descanso: ${restDays}/${periodDays} días (${((restDays / periodDays) * 100).toFixed(0)}%)\n- Si racha consecutiva > 5 días: posible falta de descanso. Si > 7 días: alto riesgo de overtraining.`
      );
    }

    // ─── 4. Construcción del prompt enriquecido ──────────────────────────
    const FOCUS_LABELS: Record<typeof focus, string> = {
      GENERAL: 'análisis general equilibrado',
      STRENGTH: 'fuerza máxima y desarrollo de 1RM',
      HYPERTROPHY: 'hipertrofia (ganancia de masa muscular)',
      WEIGHT_LOSS: 'pérdida de grasa y composición corporal',
      RECOVERY: 'recuperación, descanso y prevención de overtraining',
      MUSCLE_BALANCE: 'balance muscular y simetría (detectar desequilibrios)',
      INJURY_PREVENTION: 'prevención de lesiones y técnica',
    };

    let summary = `DATOS CUANTITATIVOS del usuario en los últimos ${periodDays} días:
- Total entrenamientos: ${workouts._count} (${(workouts._count / (periodDays / 7)).toFixed(1)}/semana)
- Minutos totales: ${workouts._sum.duration_min ?? 0} (media ${Math.round(workouts._avg.duration_min ?? 0)} min/sesión)
- Calorías estimadas quemadas: ${workouts._sum.calories ?? 0}
- Volumen total levantado (no calentamiento): ${Math.round(Number(volume.total_volume ?? 0))} kg
- Series totales de trabajo: ${Number(volume.total_sets ?? 0n)}
- Intensidad predominante: ${volume.avg_intensity ?? 'N/A'}
- Distribución por grupo muscular (sesiones): ${muscleDistribution.map((m) => `${m.muscle}=${m.count}`).join(', ') || 'sin datos'}
- PRs registrados (ejercicios distintos con peso): ${totalPRs}

PERFIL DEL USUARIO:
${profile?.fitness_goal ? `- Objetivo declarado: ${profile.fitness_goal}` : '- Objetivo: no declarado'}
${profile?.experience_level ? `- Nivel de experiencia: ${profile.experience_level}` : '- Nivel: no declarado'}
${profile?.weight_kg ? `- Peso corporal: ${profile.weight_kg} kg` : ''}
${profile?.height_cm ? `- Altura: ${profile.height_cm} cm` : ''}

FOCO DEL ANÁLISIS SOLICITADO: ${FOCUS_LABELS[focus]}`;

    // Inyectar el contexto enriquecido (datos específicos según pregunta/foco)
    if (enrichedContext.length > 0) {
      summary += `\n\nDATOS ESPECÍFICOS PARA ESTE ANÁLISIS:\n\n${enrichedContext.join('\n\n')}`;
    }

    if (muscleFocus) {
      summary += `\n\nGRUPO MUSCULAR ESPECÍFICO A ANALIZAR: ${muscleFocus}. USA los datos semanales de "${muscleFocus}" arriba para fundamentar tu análisis con números concretos.`;
    }

    if (customQuestion) {
      summary += `\n\nPREGUNTA ESPECÍFICA DEL USUARIO: "${customQuestion}"`;
      if (intent?.matchedExercise) {
        summary += `\n→ El usuario mencionó "${intent.matchedExercise.name}". Usa los datos del HISTÓRICO ESPECÍFICO arriba para responder con números reales (no genéricos).`;
      }
      if (intent?.mentionsProgress) {
        summary += `\n→ El usuario pregunta sobre progreso/estancamiento. Usa el TOP 5 LIFTS y la TENDENCIA arriba para evaluar si realmente está estancado o progresando, y propón causas concretas.`;
      }
      if (intent?.mentionsRest) {
        summary += `\n→ El usuario pregunta sobre descanso/sobreentrenamiento. Usa los INDICADORES DE RECUPERACIÓN arriba para diagnosticar.`;
      }
      summary += `\nResponde a esta pregunta concreta en la sección "## Tu pregunta" al final del análisis, FUNDAMENTANDO con los números reales del usuario (no genéricamente).`;
    }

    const completion = await aiChat({
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: summary },
      ],
      temperature: 0.4, // Más bajo para que se ciña a los datos reales
      maxTokens: 2000,
    });

    return {
      analysis: completion.content,
      stats: {
        totalWorkouts: workouts._count,
        totalMinutes: workouts._sum.duration_min ?? 0,
        totalCalories: workouts._sum.calories ?? 0,
        avgMinutes: Math.round(workouts._avg.duration_min ?? 0),
        muscleDistribution,
        totalVolume: Math.round(Number(volume.total_volume ?? 0)),
        totalSets: Number(volume.total_sets ?? 0n),
        prCount: totalPRs,
        periodDays,
        workoutsPerWeek: +(workouts._count / (periodDays / 7)).toFixed(1),
        trainedDays,
        restDays,
        maxConsecDays: consecDays,
      },
      params: { periodDays, focus, muscleFocus: muscleFocus ?? null, customQuestion: customQuestion ?? null },
      detectedIntent: intent ? {
        matchedExerciseName: intent.matchedExercise?.name ?? null,
        matchedMuscle: intent.matchedMuscle,
        mentionsProgress: intent.mentionsProgress,
        mentionsRest: intent.mentionsRest,
        mentionsBalance: intent.mentionsBalance,
      } : null,
    };
  },
};

// ─── Helpers de personalización del análisis ─────────────────────────────────

/**
 * Detecta entidades clave en la pregunta del usuario:
 * - Ejercicio mencionado (busca un match en el catálogo)
 * - Grupo muscular mencionado
 * - Intención (progreso, descanso, balance)
 */
async function detectQuestionIntent(question: string): Promise<{
  matchedExercise: { id: string; name: string } | null;
  matchedMuscle: string | null;
  mentionsProgress: boolean;
  mentionsRest: boolean;
  mentionsBalance: boolean;
}> {
  const q = question.toLowerCase();

  const mentionsProgress = /no\s+(progres|avanz|sub|mejor)|estanca|plateau|atasc|por qu[eé]\s+no|quedad[oa]|no\s+gano/i.test(q);
  const mentionsRest = /descans|recuper|sobrentren|overtrain|cansa|fatiga|dorm|sue[ñn]o|dolor|agotad/i.test(q);
  const mentionsBalance = /desequilibri|asimetr|balance|simetr|desbalance/i.test(q);

  // Detección de músculo por palabras clave en español
  const MUSCLE_KEYWORDS: Record<string, string> = {
    'pecho': 'CHEST',
    'pectoral': 'CHEST',
    'pectorales': 'CHEST',
    'espalda': 'BACK',
    'dorsales': 'BACK',
    'lat': 'BACK',
    'hombro': 'SHOULDERS',
    'hombros': 'SHOULDERS',
    'deltoide': 'SHOULDERS',
    'biceps': 'BICEPS',
    'bíceps': 'BICEPS',
    'triceps': 'TRICEPS',
    'tríceps': 'TRICEPS',
    'pierna': 'QUADS',
    'piernas': 'QUADS',
    'cuadriceps': 'QUADS',
    'cuádriceps': 'QUADS',
    'femoral': 'HAMSTRINGS',
    'isquiotibial': 'HAMSTRINGS',
    'gluteo': 'GLUTES',
    'glúteo': 'GLUTES',
    'gluteos': 'GLUTES',
    'gemelo': 'CALVES',
    'gemelos': 'CALVES',
    'pantorrilla': 'CALVES',
    'core': 'CORE',
    'abdominal': 'CORE',
    'abdominales': 'CORE',
    'antebrazo': 'FOREARMS',
  };

  let matchedMuscle: string | null = null;
  for (const [keyword, muscle] of Object.entries(MUSCLE_KEYWORDS)) {
    if (q.includes(keyword)) {
      matchedMuscle = muscle;
      break;
    }
  }

  // Match de ejercicio: buscamos contra el catálogo (limitado a ejercicios conocidos)
  // Tokenizamos la pregunta y buscamos ejercicios cuyo nombre tenga >50% de tokens en común
  const qTokens = new Set(
    q
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );

  let matchedExercise: { id: string; name: string } | null = null;
  if (qTokens.size > 0) {
    const candidates = await prisma.exercise.findMany({
      where: { is_custom: false },
      select: { id: true, name: true },
    });

    let bestScore = 0;
    for (const ex of candidates) {
      const exTokens = new Set(
        ex.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 3)
      );
      if (exTokens.size === 0) continue;
      let intersection = 0;
      for (const t of exTokens) if (qTokens.has(t)) intersection++;
      const score = intersection / exTokens.size;
      // Threshold alto para evitar falsos positivos (ej: "como estoy con el pecho" no debe matchear "press banca")
      if (score >= 0.6 && score > bestScore && intersection >= 2) {
        bestScore = score;
        matchedExercise = { id: ex.id, name: ex.name };
      }
    }
  }

  return { matchedExercise, matchedMuscle, mentionsProgress, mentionsRest, mentionsBalance };
}

/** Calcula la racha máxima de días consecutivos con entrenamiento */
function computeMaxConsecutive(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let maxStreak = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 1;
    }
  }
  return maxStreak;
}

/** Calcula y formatea ratios de balance muscular típicos */
function computeMuscleBalance(distribution: Array<{ muscle: string; count: number }>): string {
  const map = new Map(distribution.map((d) => [d.muscle, d.count]));
  const get = (m: string) => map.get(m) ?? 0;
  const ratio = (a: number, b: number) => (b > 0 ? (a / b).toFixed(2) : 'N/A');

  const lines = [
    `- Empuje (pecho+hombros+tríceps): ${get('CHEST') + get('SHOULDERS') + get('TRICEPS')} sesiones`,
    `- Tirón (espalda+bíceps): ${get('BACK') + get('BICEPS')} sesiones`,
    `- Ratio empuje/tirón: ${ratio(get('CHEST') + get('SHOULDERS') + get('TRICEPS'), get('BACK') + get('BICEPS'))} (ideal: ~1.0)`,
    `- Cuádriceps vs Femoral: ${get('QUADS')} vs ${get('HAMSTRINGS')} (ratio ${ratio(get('QUADS'), get('HAMSTRINGS'))}, ideal: ~1.0-1.2)`,
    `- Pecho vs Espalda: ${get('CHEST')} vs ${get('BACK')} (ratio ${ratio(get('CHEST'), get('BACK'))}, ideal: ≤1.0 para postura)`,
    `- Core trabajo directo: ${get('CORE')} sesiones`,
  ];
  return lines.join('\n');
}
