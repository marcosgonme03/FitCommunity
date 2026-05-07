import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { UserStatus } from '@prisma/client';

/**
 * Servicio de exportación de datos del panel admin.
 *
 * Genera ficheros profesionales (XLSX con cabeceras en negrita, anchos de
 * columna automáticos, congelación de la primera fila, formato de fechas) y
 * PDF tabulado para impresión / archivo. Comparte la lógica de filtrado con
 * `admin.service.listUsers` para que el resultado exportado sea exactamente
 * igual a lo que el admin está viendo en el panel.
 */

export interface ExportUsersFilters {
  search?: string;
  status?: UserStatus;
  role?: 'USER' | 'ADMIN';
  isPremium?: boolean;
  /** Filtro por ciudad / location del perfil (case-insensitive, contiene) */
  location?: string;
  /** Filtro por nivel de experiencia */
  experienceLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
}

interface ExportRow {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
  plan: string;
  emailVerified: string;
  twoFa: string;
  experienceLevel: string;
  location: string;
  workouts: number;
  followers: number;
  following: number;
  createdAt: Date;
  lastLoginAt: Date | null;
}

const STATUS_ES: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  BANNED: 'Baneado',
  PENDING_VERIFICATION: 'Sin verificar',
};

const EXP_ES: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
  PROFESSIONAL: 'Profesional',
};

function buildWhere(opts: ExportUsersFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (opts.status) where.status = opts.status;
  if (opts.role) where.role = opts.role;
  if (typeof opts.isPremium === 'boolean') where.is_premium = opts.isPremium;

  const profileFilters: Prisma.UserProfileWhereInput = {};
  if (opts.location && opts.location.trim().length > 0) {
    profileFilters.location = { contains: opts.location.trim(), mode: 'insensitive' };
  }
  if (opts.experienceLevel) {
    profileFilters.experience_level = opts.experienceLevel;
  }

  if (opts.search) {
    where.OR = [
      { email: { contains: opts.search, mode: 'insensitive' } },
      { profile: { username: { contains: opts.search, mode: 'insensitive' } } },
      { profile: { display_name: { contains: opts.search, mode: 'insensitive' } } },
    ];
  }

  if (Object.keys(profileFilters).length > 0) {
    where.profile = profileFilters;
  }

  return where;
}

async function fetchRows(opts: ExportUsersFilters): Promise<ExportRow[]> {
  const where = buildWhere(opts);

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      is_email_verified: true,
      two_fa_enabled: true,
      is_premium: true,
      created_at: true,
      last_login_at: true,
      profile: {
        select: {
          username: true,
          display_name: true,
          location: true,
          experience_level: true,
        },
      },
      _count: { select: { workouts: true, followers: true, following: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 10000,
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    username: u.profile?.username ?? '',
    displayName: u.profile?.display_name ?? '',
    role: u.role,
    status: STATUS_ES[u.status] ?? u.status,
    plan: u.is_premium ? 'Premium' : 'Free',
    emailVerified: u.is_email_verified ? 'Sí' : 'No',
    twoFa: u.two_fa_enabled ? 'Sí' : 'No',
    experienceLevel: u.profile?.experience_level
      ? EXP_ES[u.profile.experience_level] ?? u.profile.experience_level
      : '',
    location: u.profile?.location ?? '',
    workouts: u._count.workouts,
    followers: u._count.followers,
    following: u._count.following,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
  }));
}

/**
 * Filtros aplicados como texto legible (se inyecta en cabecera de ficheros).
 */
function filtersAsText(opts: ExportUsersFilters): string {
  const parts: string[] = [];
  if (opts.search) parts.push(`Búsqueda: "${opts.search}"`);
  if (opts.status) parts.push(`Estado: ${STATUS_ES[opts.status] ?? opts.status}`);
  if (opts.role) parts.push(`Rol: ${opts.role}`);
  if (typeof opts.isPremium === 'boolean') parts.push(`Plan: ${opts.isPremium ? 'Premium' : 'Free'}`);
  if (opts.location) parts.push(`Ciudad: ${opts.location}`);
  if (opts.experienceLevel) parts.push(`Nivel: ${EXP_ES[opts.experienceLevel] ?? opts.experienceLevel}`);
  return parts.length ? parts.join(' · ') : 'Sin filtros aplicados';
}

// ─── XLSX ────────────────────────────────────────────────────────────────────

/**
 * Genera un buffer XLSX profesional con cabeceras en negrita, anchos de
 * columna ajustados, freeze pane en la fila de cabecera, banded rows y
 * formato de fechas español. Excel lo abre directamente sin pasos manuales.
 */
export async function buildUsersXlsx(opts: ExportUsersFilters): Promise<Buffer> {
  const rows = await fetchRows(opts);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FitCommunity Admin';
  wb.created = new Date();
  wb.title = 'Listado de usuarios FitCommunity';
  wb.company = 'FitCommunity';

  const sheet = wb.addWorksheet('Usuarios', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { defaultRowHeight: 18 },
  });

  // ── Cabecera del documento ────────────────────────────────────────────────
  sheet.mergeCells('A1:O1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'FitCommunity — Listado de usuarios';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEA580C' }, // brand-600 (orange)
  };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:O2');
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value =
    `Generado el ${new Date().toLocaleString('es-ES')} · ${rows.length} usuario${rows.length === 1 ? '' : 's'} · ${filtersAsText(opts)}`;
  subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(2).height = 18;

  // ── Definición de columnas ────────────────────────────────────────────────
  sheet.columns = [
    { key: 'id', header: 'ID', width: 38 },
    { key: 'email', header: 'Email', width: 32 },
    { key: 'username', header: 'Usuario', width: 18 },
    { key: 'displayName', header: 'Nombre mostrado', width: 22 },
    { key: 'role', header: 'Rol', width: 10 },
    { key: 'status', header: 'Estado', width: 14 },
    { key: 'plan', header: 'Plan', width: 12 },
    { key: 'emailVerified', header: 'Email verificado', width: 16 },
    { key: 'twoFa', header: '2FA', width: 8 },
    { key: 'experienceLevel', header: 'Nivel', width: 14 },
    { key: 'location', header: 'Ciudad', width: 16 },
    { key: 'workouts', header: 'Entrenos', width: 11 },
    { key: 'followers', header: 'Seguidores', width: 12 },
    { key: 'following', header: 'Siguiendo', width: 11 },
    { key: 'createdAt', header: 'Registro', width: 18 },
    { key: 'lastLoginAt', header: 'Último login', width: 18 },
  ];

  // ── Estilo de la fila de cabeceras (fila 4) ──────────────────────────────
  sheet.getRow(4).values = sheet.columns.map((c) => c.header as string);
  const headerRow = sheet.getRow(4);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }, // surface-800 (dark gray)
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF374151' } },
      bottom: { style: 'medium', color: { argb: 'FFEA580C' } },
      left: { style: 'thin', color: { argb: 'FF374151' } },
      right: { style: 'thin', color: { argb: 'FF374151' } },
    };
  });

  // ── Datos ─────────────────────────────────────────────────────────────────
  rows.forEach((r, idx) => {
    const row = sheet.addRow({
      id: r.id,
      email: r.email,
      username: r.username,
      displayName: r.displayName,
      role: r.role,
      status: r.status,
      plan: r.plan,
      emailVerified: r.emailVerified,
      twoFa: r.twoFa,
      experienceLevel: r.experienceLevel,
      location: r.location,
      workouts: r.workouts,
      followers: r.followers,
      following: r.following,
      createdAt: r.createdAt,
      lastLoginAt: r.lastLoginAt,
    });

    // Banded rows para legibilidad
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      });
    }

    // Formato de fechas legible en castellano
    row.getCell('createdAt').numFmt = 'dd/mm/yyyy hh:mm';
    if (r.lastLoginAt) row.getCell('lastLoginAt').numFmt = 'dd/mm/yyyy hh:mm';

    // Color del badge plan
    const planCell = row.getCell('plan');
    if (r.plan === 'Premium') {
      planCell.font = { bold: true, color: { argb: 'FFB45309' } };
    }

    // Color del badge estado
    const statusCell = row.getCell('status');
    if (r.status === 'Baneado') {
      statusCell.font = { bold: true, color: { argb: 'FFB91C1C' } };
    } else if (r.status === 'Activo') {
      statusCell.font = { color: { argb: 'FF15803D' } };
    } else if (r.status === 'Sin verificar') {
      statusCell.font = { color: { argb: 'FFB45309' } };
    }

    // Bordes finos en todas las celdas de datos
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  // ── Auto-filter sobre la zona de datos ───────────────────────────────────
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + rows.length, column: sheet.columnCount },
  };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

/**
 * Genera un PDF tabulado A4 horizontal con cabecera en color de marca y
 * filas alternas. Pensado para impresión / archivo, no para análisis posterior
 * (para eso sirve el XLSX).
 */
export async function buildUsersPdf(opts: ExportUsersFilters): Promise<Buffer> {
  const rows = await fetchRows(opts);

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 32,
        info: {
          Title: 'FitCommunity — Listado de usuarios',
          Author: 'FitCommunity Admin',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Paleta
      const BRAND = '#EA580C';
      const DARK = '#1F2937';
      const MUTED = '#6B7280';
      const ZEBRA = '#F9FAFB';
      const BORDER = '#E5E7EB';

      // Anchos de columna ajustados al ancho útil de A4 landscape (~ 781 pt)
      const cols: Array<{ label: string; width: number; key: keyof ExportRow; align?: 'left' | 'right' | 'center' }> = [
        { label: 'Email', width: 150, key: 'email', align: 'left' },
        { label: 'Usuario', width: 90, key: 'username', align: 'left' },
        { label: 'Nombre', width: 110, key: 'displayName', align: 'left' },
        { label: 'Estado', width: 70, key: 'status', align: 'left' },
        { label: 'Plan', width: 55, key: 'plan', align: 'left' },
        { label: 'Nivel', width: 75, key: 'experienceLevel', align: 'left' },
        { label: 'Ciudad', width: 75, key: 'location', align: 'left' },
        { label: 'Entr.', width: 38, key: 'workouts', align: 'right' },
        { label: 'Seg.', width: 38, key: 'followers', align: 'right' },
        { label: 'Registro', width: 80, key: 'createdAt', align: 'left' },
      ];
      const totalWidth = cols.reduce((acc, c) => acc + c.width, 0);
      const startX = doc.page.margins.left;
      const rowHeight = 16;

      function formatCell(key: keyof ExportRow, value: ExportRow[keyof ExportRow]): string {
        if (value == null || value === '') return '—';
        if (key === 'createdAt' || key === 'lastLoginAt') {
          const d = value as Date;
          return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return String(value);
      }

      function drawHeader() {
        // Banda de marca
        doc.save();
        doc.rect(0, 0, doc.page.width, 56).fill(BRAND);
        doc.fillColor('#FFFFFF')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('FitCommunity', startX, 14);
        doc.fontSize(11)
          .font('Helvetica')
          .fillColor('#FFE7D6')
          .text('Listado de usuarios — Panel de administración', startX, 34);

        // Texto de generación a la derecha
        doc.fontSize(9)
          .fillColor('#FFFFFF')
          .text(
            `Generado el ${new Date().toLocaleString('es-ES')}`,
            startX,
            14,
            { align: 'right', width: doc.page.width - 2 * doc.page.margins.left },
          );
        doc.fontSize(9)
          .fillColor('#FFE7D6')
          .text(
            `${rows.length} usuario${rows.length === 1 ? '' : 's'} · ${filtersAsText(opts)}`,
            startX,
            34,
            { align: 'right', width: doc.page.width - 2 * doc.page.margins.left },
          );
        doc.restore();
      }

      function drawTableHeader(y: number) {
        doc.save();
        doc.rect(startX, y, totalWidth, rowHeight + 4).fill(DARK);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        let x = startX;
        cols.forEach((col) => {
          doc.text(col.label, x + 4, y + 5, { width: col.width - 8, align: col.align ?? 'left', lineBreak: false });
          x += col.width;
        });
        // Línea brand
        doc.rect(startX, y + rowHeight + 3, totalWidth, 1).fill(BRAND);
        doc.restore();
      }

      drawHeader();
      let y = 72;
      drawTableHeader(y);
      y += rowHeight + 6;

      doc.font('Helvetica').fontSize(8).fillColor(DARK);

      rows.forEach((r, idx) => {
        // Salto de página
        if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
          doc.addPage();
          drawHeader();
          y = 72;
          drawTableHeader(y);
          y += rowHeight + 6;
        }

        // Banded rows
        if (idx % 2 === 1) {
          doc.save();
          doc.rect(startX, y - 2, totalWidth, rowHeight).fill(ZEBRA);
          doc.restore();
        }

        // Contenido
        let x = startX;
        cols.forEach((col) => {
          const raw = r[col.key];
          const txt = formatCell(col.key, raw);
          const color =
            col.key === 'status' && txt === 'Baneado'
              ? '#B91C1C'
              : col.key === 'plan' && txt === 'Premium'
                ? '#B45309'
                : DARK;
          doc.fillColor(color)
            .text(txt, x + 4, y, {
              width: col.width - 8,
              align: col.align ?? 'left',
              lineBreak: false,
              ellipsis: true,
            });
          x += col.width;
        });
        // Borde inferior fino
        doc.save();
        doc.strokeColor(BORDER).lineWidth(0.3);
        doc.moveTo(startX, y + rowHeight - 2).lineTo(startX + totalWidth, y + rowHeight - 2).stroke();
        doc.restore();

        y += rowHeight;
      });

      // Pie de página
      const pageRange = doc.bufferedPageRange();
      for (let i = 0; i < pageRange.count; i++) {
        doc.switchToPage(pageRange.start + i);
        doc.fontSize(8)
          .fillColor(MUTED)
          .text(
            `FitCommunity · Página ${i + 1} de ${pageRange.count}`,
            startX,
            doc.page.height - doc.page.margins.bottom - 10,
            { align: 'center', width: doc.page.width - 2 * doc.page.margins.left },
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
