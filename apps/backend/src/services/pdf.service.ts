/**
 * Servicio de generación de PDFs profesionales para rutinas y planes nutricionales.
 *
 * Usa PDFKit (sin dependencias de Chrome/Puppeteer) para generar PDFs server-side
 * con la paleta brand de FitCommunity.
 */

import PDFDocument from 'pdfkit';
import type { GeneratedRoutine, NutritionPlan } from '@prisma/client';

// ─── Paleta brand (replica del frontend para consistencia visual) ──────────
const COLORS = {
  brand500: '#f97316',
  brand600: '#ea580c',
  brand700: '#c2410c',
  brand50: '#fff7ed',
  accent600: '#ca8a04',
  accent50: '#fefce8',
  surface900: '#1c1917',
  surface700: '#44403c',
  surface600: '#57534e',
  surface500: '#78716c',
  surface400: '#a8a29e',
  surface300: '#d6d3d1',
  surface200: '#e7e5e4',
  surface100: '#f5f5f4',
  surface50: '#fafaf9',
  white: '#ffffff',
};

// ─── Tipos del JSON de la IA ───────────────────────────────────────────────
interface RoutinePlan {
  title?: string;
  summary?: string;
  weekly_plan: Array<{
    day: number | string;
    focus: string;
    warmup?: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string | number;
      rest_sec?: number;
      notes?: string;
    }>;
    cooldown?: string;
  }>;
  tips?: string[];
}

interface NutritionPlanJson {
  title?: string;
  summary?: string;
  daily_calories?: number;
  macros?: { protein_g: number; carbs_g: number; fat_g: number };
  weekly_plan: Array<{
    day: string;
    meals: Array<{ name: string; kcal: number; items: string[] }>;
  }>;
  tips?: string[];
}

// ─── Helpers de dibujo ─────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string): void {
  // Banda superior brand
  doc.save();
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.brand500);
  doc.restore();

  // Logo/marca
  doc.fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('FitCommunity', 50, 28);

  doc.fillColor(COLORS.white)
    .font('Helvetica')
    .fontSize(9)
    .text('Tu app de gimnasio · fitcommunity.app'.toUpperCase(), 50, 52, { characterSpacing: 1.5 });

  // Fecha de generación a la derecha
  doc.fillColor(COLORS.white)
    .fontSize(9)
    .text(
      new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
      doc.page.width - 200,
      32,
      { width: 150, align: 'right' }
    );

  // Título principal
  doc.fillColor(COLORS.surface900)
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(title, 50, 110, { width: doc.page.width - 100 });

  // Subtítulo
  doc.fillColor(COLORS.surface600)
    .font('Helvetica')
    .fontSize(11)
    .text(subtitle, 50, doc.y + 6, { width: doc.page.width - 100 });

  // Línea separadora
  doc.moveTo(50, doc.y + 18)
    .lineTo(doc.page.width - 50, doc.y + 18)
    .strokeColor(COLORS.surface200)
    .lineWidth(1)
    .stroke();

  doc.y += 30;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const bottom = doc.page.height - 35;

    doc.fillColor(COLORS.surface400)
      .font('Helvetica')
      .fontSize(8)
      .text(
        `Generado por FitCommunity · Página ${i + 1} de ${range.count}`,
        50,
        bottom,
        { width: doc.page.width - 100, align: 'center' }
      );
  }
}

function drawSectionTitle(doc: PDFKit.PDFDocument, text: string, color = COLORS.brand700): void {
  doc.moveDown(0.5);
  doc.fillColor(color)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text(text, { characterSpacing: 0.2 });
  doc.moveDown(0.3);
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number): void {
  // Margen inferior reservado para el footer
  if (doc.y + neededHeight > doc.page.height - 60) {
    doc.addPage();
  }
}

// ─── Generador de PDF de rutina ────────────────────────────────────────────

export function buildRoutinePdf(routine: GeneratedRoutine): PDFKit.PDFDocument {
  const plan = routine.plan_json as unknown as RoutinePlan;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true, // necesario para pintar el footer al final
    info: {
      Title: routine.title,
      Author: 'FitCommunity',
      Subject: `Rutina IA · ${routine.days_per_week} días/semana`,
      Keywords: 'rutina, gimnasio, fitcommunity',
    },
  });

  drawHeader(
    doc,
    routine.title,
    `${routine.days_per_week} días/semana · ${routine.session_minutes} min/sesión · Nivel ${routine.experience_level}`
  );

  // Resumen
  if (plan.summary) {
    drawSectionTitle(doc, 'Resumen');
    doc.fillColor(COLORS.surface700)
      .font('Helvetica')
      .fontSize(11)
      .text(plan.summary, { lineGap: 3 });
    doc.moveDown(0.8);
  }

  // Plan semanal
  drawSectionTitle(doc, 'Plan semanal');

  for (const [idx, day] of (plan.weekly_plan ?? []).entries()) {
    ensureSpace(doc, 80);

    // Card de día
    const dayStartY = doc.y;
    const dayLabel = typeof day.day === 'number' ? `Día ${day.day}` : String(day.day);

    // Banda lateral brand (4px)
    doc.save();
    doc.rect(50, dayStartY, 3, 24).fill(COLORS.brand500);
    doc.restore();

    doc.fillColor(COLORS.surface900)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(`${dayLabel} — ${day.focus || 'Entrenamiento'}`, 60, dayStartY + 4, {
        width: doc.page.width - 110,
      });

    doc.y = dayStartY + 28;

    // Calentamiento
    if (day.warmup) {
      doc.fillColor(COLORS.surface600)
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text(`Calentamiento: ${day.warmup}`, 60, doc.y, {
          width: doc.page.width - 110,
          lineGap: 2,
        });
      doc.moveDown(0.4);
    }

    // Tabla de ejercicios
    for (const ex of day.exercises ?? []) {
      ensureSpace(doc, 50);

      const exStartY = doc.y;

      // Nombre
      doc.fillColor(COLORS.surface900)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`${ex.name}`, 60, exStartY, { width: doc.page.width - 220, continued: false });

      // Sets × reps · descanso (a la derecha)
      const setsText = `${ex.sets} × ${ex.reps}`;
      const restText = ex.rest_sec ? ` · ${ex.rest_sec}s descanso` : '';
      doc.fillColor(COLORS.brand700)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`${setsText}${restText}`, doc.page.width - 220, exStartY, {
          width: 170,
          align: 'right',
        });

      // Reset Y para que las notas vayan debajo del nombre
      const namingHeight = doc.heightOfString(ex.name, { width: doc.page.width - 220 });
      doc.y = exStartY + namingHeight + 2;

      if (ex.notes) {
        doc.fillColor(COLORS.surface600)
          .font('Helvetica')
          .fontSize(9)
          .text(ex.notes, 60, doc.y, { width: doc.page.width - 110, lineGap: 2 });
      }

      doc.moveDown(0.6);
    }

    // Vuelta a la calma
    if (day.cooldown) {
      doc.fillColor(COLORS.surface600)
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text(`Vuelta a la calma: ${day.cooldown}`, 60, doc.y, {
          width: doc.page.width - 110,
          lineGap: 2,
        });
      doc.moveDown(0.4);
    }

    // Espacio entre días (excepto último)
    if (idx < (plan.weekly_plan?.length ?? 0) - 1) {
      doc.moveTo(50, doc.y + 4)
        .lineTo(doc.page.width - 50, doc.y + 4)
        .strokeColor(COLORS.surface200)
        .lineWidth(0.5)
        .stroke();
      doc.y += 14;
    }
  }

  // Tips
  if (plan.tips && plan.tips.length > 0) {
    ensureSpace(doc, 80);
    drawSectionTitle(doc, 'Consejos');
    for (const tip of plan.tips) {
      doc.fillColor(COLORS.surface700)
        .font('Helvetica')
        .fontSize(10)
        .text(`• ${tip}`, { indent: 10, lineGap: 2 });
      doc.moveDown(0.2);
    }
  }

  drawFooter(doc);
  return doc;
}

// ─── Generador de PDF de plan nutricional ──────────────────────────────────

export function buildNutritionPdf(plan: NutritionPlan): PDFKit.PDFDocument {
  const json = plan.plan_json as unknown as NutritionPlanJson;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: plan.title,
      Author: 'FitCommunity',
      Subject: `Plan nutricional · ${plan.daily_calories} kcal`,
      Keywords: 'nutrición, dieta, fitcommunity',
    },
  });

  drawHeader(
    doc,
    plan.title,
    `${plan.daily_calories} kcal/día · ${plan.protein_g}g proteína · ${plan.carbs_g}g carbohidratos · ${plan.fat_g}g grasa`
  );

  // Tarjetas de macros
  const cardWidth = (doc.page.width - 100 - 30) / 4;
  const cardY = doc.y;
  const macros = [
    { label: 'KCAL/DÍA', value: String(plan.daily_calories), color: COLORS.brand500 },
    { label: 'PROTEÍNA', value: `${plan.protein_g}g`, color: '#3b82f6' },
    { label: 'CARBOS', value: `${plan.carbs_g}g`, color: '#10b981' },
    { label: 'GRASAS', value: `${plan.fat_g}g`, color: '#eab308' },
  ];

  macros.forEach((m, i) => {
    const x = 50 + i * (cardWidth + 10);
    doc.save();
    doc.roundedRect(x, cardY, cardWidth, 60, 6).fillAndStroke(COLORS.surface50, COLORS.surface200);
    doc.restore();

    doc.fillColor(COLORS.surface500)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(m.label, x + 10, cardY + 10, { width: cardWidth - 20, characterSpacing: 1.2 });

    doc.fillColor(m.color)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(m.value, x + 10, cardY + 26, { width: cardWidth - 20 });
  });

  doc.y = cardY + 80;

  // Resumen
  if (json.summary) {
    drawSectionTitle(doc, 'Justificación del plan');
    doc.fillColor(COLORS.surface700)
      .font('Helvetica')
      .fontSize(11)
      .text(json.summary, { lineGap: 3 });
    doc.moveDown(0.8);
  }

  // Plan semanal
  drawSectionTitle(doc, 'Plan semanal');

  for (const [idx, day] of (json.weekly_plan ?? []).entries()) {
    ensureSpace(doc, 100);

    const dayStartY = doc.y;
    doc.save();
    doc.rect(50, dayStartY, 3, 22).fill(COLORS.brand500);
    doc.restore();

    doc.fillColor(COLORS.surface900)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(day.day, 60, dayStartY + 3);

    doc.y = dayStartY + 26;

    for (const meal of day.meals ?? []) {
      ensureSpace(doc, 40);

      // Cabecera de la comida
      doc.fillColor(COLORS.brand700)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(meal.name, 60, doc.y, { continued: true })
        .fillColor(COLORS.surface500)
        .font('Helvetica')
        .text(`  ·  ${meal.kcal} kcal`, { continued: false });

      doc.moveDown(0.2);

      // Items
      for (const item of meal.items ?? []) {
        doc.fillColor(COLORS.surface700)
          .font('Helvetica')
          .fontSize(10)
          .text(`• ${item}`, { indent: 14, lineGap: 1 });
      }
      doc.moveDown(0.4);
    }

    if (idx < (json.weekly_plan?.length ?? 0) - 1) {
      doc.moveTo(50, doc.y + 2)
        .lineTo(doc.page.width - 50, doc.y + 2)
        .strokeColor(COLORS.surface200)
        .lineWidth(0.5)
        .stroke();
      doc.y += 12;
    }
  }

  // Tips
  if (json.tips && json.tips.length > 0) {
    ensureSpace(doc, 80);
    drawSectionTitle(doc, 'Consejos');
    for (const tip of json.tips) {
      doc.fillColor(COLORS.surface700)
        .font('Helvetica')
        .fontSize(10)
        .text(`• ${tip}`, { indent: 10, lineGap: 2 });
      doc.moveDown(0.2);
    }
  }

  drawFooter(doc);
  return doc;
}
