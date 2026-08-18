import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  isJidGroup,
  isJidBroadcast,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

export type WaStatus = 'DISCONNECTED' | 'QR_READY' | 'INITIALIZING' | 'CONNECTED';

export interface ActivityEntry {
  timestamp: Date;
  phone: string;
  userName?: string;
  role?: string;
  message: string;
  response: string;
  intent: string;
}

// ─── Intent detection ─────────────────────────────────────────────────────────

const INTENT_RULES: { intent: string; keywords: string[] }[] = [
  {
    intent: 'daily_briefing',
    keywords: [
      'novedades', 'novedad', 'updates', 'update', 'hay hoy', 'que hay', 'qué hay',
      'noticias', 'resumen', 'brief', 'overview', 'situacion', 'situación',
      'buenos dias', 'buenos días', 'good morning', 'bom dia', 'como va todo',
      'cómo va todo', 'como esta todo', 'cómo está todo', 'que paso', 'qué pasó',
    ],
  },
  {
    intent: 'my_tasks',
    keywords: [
      'que tengo que hacer', 'qué tengo que hacer', 'mis tareas', 'tareas',
      'what should i do', 'what do i have', 'my tasks', 'trabajo pendiente',
      'pendiente mio', 'pendiente mío', 'que debo hacer', 'qué debo hacer',
      'asignado a mi', 'asignado a mí', 'me toca', 'tengo pendiente',
    ],
  },
  {
    intent: 'agenda_today',
    keywords: [
      'agenda', 'reuniones', 'reunión', 'meeting', 'meetings', 'schedule',
      'horario', 'citas', 'eventos de hoy', 'calendar', 'viaje', 'visita',
      'conferencia', 'que tiene el ministro', 'qué tiene el ministro',
    ],
  },
  {
    intent: 'deadlines',
    keywords: [
      'plazos', 'plazo', 'vence', 'vencen', 'vencimiento', 'deadline',
      'deadlines', 'que vence', 'qué vence', 'fecha limite', 'fecha límite',
      'urgente', 'urgentes', 'por vencer',
    ],
  },
  {
    intent: 'pending_docs',
    keywords: [
      'documentos', 'documento', 'docs', 'doc', 'pendientes', 'oficios',
      'memorandos', 'circulares', 'expedientes', 'expediente', 'papeles',
      'cuantos documentos', 'cuántos documentos',
    ],
  },
  {
    intent: 'doc_status',
    keywords: ['estado de', 'status of', 'como va el', 'cómo va el', 'que paso con', 'qué pasó con', 'busco el'],
  },
  {
    intent: 'search',
    keywords: ['buscar', 'busca', 'search', 'find', 'encontrar', 'donde esta', 'dónde está', 'busco'],
  },
  {
    intent: 'stats',
    keywords: [
      'estadisticas', 'estadísticas', 'stats', 'cuantos', 'cuántos',
      'how many', 'total documentos', 'resumen general', 'informe',
    ],
  },
  {
    intent: 'greeting',
    keywords: ['hola', 'hi', 'hello', 'buenas', 'hey', 'ola', 'saludos'],
  },
  {
    intent: 'help',
    keywords: ['ayuda', 'help', 'menu', 'menú', 'inicio', 'start', 'comandos', 'que puedes', 'qué puedes'],
  },
  {
    intent: 'thanks',
    keywords: ['gracias', 'thanks', 'thank you', 'perfecto', 'excelente', 'ok gracias', 'listo'],
  },
  {
    intent: 'goodbye',
    keywords: ['adios', 'adiós', 'bye', 'hasta luego', 'chao', 'ciao', 'nos vemos'],
  },
];

function detectIntent(text: string): { intent: string; param?: string } {
  const lower = text.toLowerCase().trim();

  const estadoMatch = lower.match(/^estado\s+(.+)$/) || lower.match(/estado del?\s+(.+)/);
  if (estadoMatch) return { intent: 'doc_status', param: estadoMatch[1] };

  const buscarMatch = lower.match(/^buscar\s+(.+)$/);
  if (buscarMatch) return { intent: 'search', param: buscarMatch[1] };

  for (const rule of INTENT_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { intent: rule.intent };
    }
  }

  return { intent: 'daily_briefing' };
}

function greeting(user: any): string {
  const hour = new Date().getHours();
  const name = user?.firstName ? user.firstName : null;
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  return name ? `${saludo}, ${name}!` : `${saludo}!`;
}

function randomFrom(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  // Maps LID JID → real phone JID (populated from contacts.upsert events)
  private lidMap = new Map<string, string>();
  private status: WaStatus = 'DISCONNECTED';
  private qrDataUrl: string | null = null;
  private connectedPhone: string | null = null;
  private activityLog: ActivityEntry[] = [];
  private isInitializing = false;
  private destroyed = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly AUTH_DIR = path.join(process.cwd(), '.wa-auth');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    setTimeout(() => this.initClient(), 3000);
  }

  async onModuleDestroy() {
    this.destroyed = true;
    this.clearReconnectTimer();
    try { await this.sock?.end(undefined); } catch (_) {}
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  private scheduleReconnect(ms = 5000) {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) this.initClient();
    }, ms);
  }

  // ─── Client Lifecycle ────────────────────────────────────────────────────────

  private async initClient() {
    if (this.isInitializing || this.destroyed) return;
    this.isInitializing = true;
    this.status = 'INITIALIZING';
    this.logger.log('Initializing Baileys WhatsApp client...');

    try {
      if (!fs.existsSync(this.AUTH_DIR)) {
        fs.mkdirSync(this.AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      // Minimal silent logger — Baileys is very verbose with default logger
      const noop = () => {};
      const silentLogger: any = { level: 'silent', trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop, child: () => silentLogger };

      this.sock = makeWASocket({
        version,
        auth: state,
        logger: silentLogger as any,
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 2000,
        browser: ['Ministerial Bot', 'Chrome', '124.0.0'],
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Build LID → phone map from contacts so @lid JIDs can be resolved to real numbers
      this.sock.ev.on('contacts.upsert', (contacts) => {
        for (const c of contacts) {
          if (c.id?.endsWith('@lid') && c.notify) {
            // contacts sometimes carry the linked phone JID in other fields
          }
          // When WhatsApp sends both a lid and a regular jid for same person
          if (c.id?.endsWith('@s.whatsapp.net')) {
            // Store mapping: if this contact also has a lid, map it
            if ((c as any).lid) {
              this.lidMap.set((c as any).lid, c.id);
              this.logger.log(`LID map: ${(c as any).lid} → ${c.id}`);
            }
          }
        }
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.logger.log('QR generated — waiting for scan');
          this.qrDataUrl = await QRCode.toDataURL(qr);
          this.status = 'QR_READY';
          this.isInitializing = false;
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrDataUrl = null;
          this.isInitializing = false;
          const jid = this.sock?.user?.id ?? '';
          this.connectedPhone = jid.split(':')[0].split('@')[0] || null;
          this.logger.log(`WhatsApp CONNECTED — ${this.connectedPhone ?? 'unknown'}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          this.logger.warn(`Connection closed — code ${statusCode}, loggedOut: ${loggedOut}`);

          this.status = 'DISCONNECTED';
          this.connectedPhone = null;
          this.isInitializing = false;

          if (loggedOut) {
            // Clear saved credentials so next init shows QR again
            try {
              fs.rmSync(this.AUTH_DIR, { recursive: true, force: true });
              fs.mkdirSync(this.AUTH_DIR, { recursive: true });
            } catch (_) {}
          }

          if (!this.destroyed) {
            this.scheduleReconnect(loggedOut ? 2000 : 5000);
          }
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
          if (msg.key.fromMe) continue;
          let jid = msg.key.remoteJid ?? '';
          if (!jid || isJidGroup(jid) || isJidBroadcast(jid)) continue;

          // WhatsApp LID privacy: resolve @lid to real @s.whatsapp.net JID via lidMap
          if (jid.endsWith('@lid') && this.lidMap.has(jid)) {
            const resolved = this.lidMap.get(jid)!;
            this.logger.log(`Resolved LID ${jid} → ${resolved}`);
            jid = resolved;
          }

          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';
          if (!text.trim()) continue;
          await this.handleMessage(jid, text.trim(), msg, msg.pushName);
        }
      });

    } catch (error) {
      this.logger.error(`Init failed: ${error.message}`);
      this.status = 'DISCONNECTED';
      this.isInitializing = false;
      this.scheduleReconnect(10000);
    }
  }

  // ─── Message Handler ─────────────────────────────────────────────────────────

  private async handleMessage(jid: string, rawText: string, msg: proto.IWebMessageInfo, pushName?: string) {
    const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    let user = await this.resolveUser(phone);

    // Fallback: if still unresolved (LID not yet in store), match by WhatsApp display name
    if (!user && pushName) {
      const namePart = pushName.trim().split(' ')[0];
      user = await this.prisma.user.findFirst({
        where: { firstName: { contains: namePart, mode: 'insensitive' }, isActive: true },
      });
      if (user) this.logger.log(`Resolved user by pushName "${pushName}" → ${user.firstName} ${user.lastName}`);
    }

    this.logger.log(`MSG from ${phone} (pushName: ${pushName ?? 'unknown'}) → user: ${user ? user.firstName : 'NOT FOUND'}`);
    const { intent, param } = detectIntent(rawText);

    let response = '';

    switch (intent) {
      case 'greeting':      response = this.replyGreeting(user); break;
      case 'thanks':        response = this.replyThanks(user); break;
      case 'goodbye':       response = this.replyGoodbye(user); break;
      case 'help':          response = this.replyHelp(user); break;
      case 'daily_briefing': response = await this.replyDailyBriefing(user); break;
      case 'my_tasks':      response = await this.replyMyTasks(user); break;
      case 'agenda_today':  response = await this.replyAgendaToday(user); break;
      case 'deadlines':     response = await this.replyDeadlines(user); break;
      case 'pending_docs':  response = await this.replyPendingDocs(user); break;
      case 'doc_status':    response = await this.replyDocStatus(param || rawText.replace(/estado\s*/i, '').trim()); break;
      case 'search':        response = await this.replySearch(param || rawText); break;
      case 'stats':         response = await this.replyStats(user); break;
      default:              response = await this.replyDailyBriefing(user);
    }

    this.logger.log(`Replying to ${phone} — intent: ${intent}`);
    try {
      await this.sock?.sendMessage(jid, { text: response }, { quoted: msg });
      this.logger.log(`Reply sent OK to ${phone}`);
    } catch (err) {
      this.logger.error(`Reply FAILED to ${phone}: ${err.message}`);
    }
    this.addActivity(phone, rawText, response, intent, user);
  }

  private async resolveUser(phone: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { whatsapp: phone }, { whatsapp: `+${phone}` },
          { phone: phone }, { phone: `+${phone}` },
        ],
        isActive: true,
      },
    });
  }

  // ─── Conversational Replies ───────────────────────────────────────────────────

  private replyGreeting(user: any): string {
    const name = user?.firstName ?? 'amigo';
    const hour = new Date().getHours();
    const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    return randomFrom([
      `${saludo}, ${name}! 😊 ¿En qué te puedo ayudar hoy?`,
      `${saludo}, ${name}! Aquí estoy para ayudarte. ¿Qué necesitas?`,
      `¡Hola, ${name}! ${saludo}. ¿Cómo puedo ayudarte?`,
    ]);
  }

  private replyThanks(user: any): string {
    const name = user?.firstName ?? '';
    return randomFrom([
      `¡De nada${name ? ', ' + name : ''}! Si necesitas algo más, aquí estoy. 😊`,
      `¡Con mucho gusto${name ? ', ' + name : ''}! Para eso estoy.`,
      `¡Claro que sí! Cualquier cosa que necesites, me avisas. 👍`,
    ]);
  }

  private replyGoodbye(user: any): string {
    const name = user?.firstName ?? '';
    return randomFrom([
      `¡Hasta luego${name ? ', ' + name : ''}! Que tengas un buen día. 👋`,
      `¡Adiós${name ? ', ' + name : ''}! Aquí estaré cuando me necesites.`,
      `¡Nos vemos${name ? ', ' + name : ''}! Cuídate mucho. 😊`,
    ]);
  }

  private replyHelp(user: any): string {
    const name = user?.firstName ?? 'usuario';
    const isStaff = user?.role === 'ADMIN' || user?.role === 'GABINETE';
    return (
      `¡Hola, ${name}! Soy el asistente del Ministerio. 🏛️\n\n` +
      `Puedo ayudarte con varias cosas, solo escríbeme de forma natural:\n\n` +
      `📋 *¿Qué hay hoy?* — te doy un resumen completo del día\n` +
      `✅ *¿Qué tengo que hacer?* — tus documentos y tareas pendientes\n` +
      `🗓️ *Agenda* — los eventos del Ministro para hoy\n` +
      `⏰ *¿Qué vence hoy?* — plazos urgentes\n` +
      `📄 *Documentos pendientes* — documentos sin resolver\n` +
      `🔍 *Buscar [texto]* — busco cualquier documento\n` +
      `📊 *Estadísticas* — resumen general del sistema\n\n` +
      (isStaff ? `💡 _Cuando registras un evento en la agenda, aviso automáticamente a todos._\n\n` : '') +
      `_¿Necesitas algo específico?_`
    );
  }

  private async replyDailyBriefing(user: any): Promise<string> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrow = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000);

    const hi = greeting(user);
    const parts: string[] = [`${hi} Aquí tienes el resumen de hoy:\n`];

    const events = await this.prisma.agendaEvent.findMany({
      where: { startDate: { gte: todayStart, lt: todayEnd }, status: { not: 'CANCELLED' } },
      orderBy: { startDate: 'asc' },
      take: 5,
    });

    if (events.length > 0) {
      parts.push(`🗓️ *Agenda de hoy* — ${events.length} evento${events.length > 1 ? 's' : ''}`);
      events.forEach((e) => {
        const time = new Date(e.startDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Malabo' });
        parts.push(`  • ${time} — ${e.title}${e.location ? ` (${e.location})` : ''}`);
      });
      parts.push('');
    } else {
      parts.push(`🗓️ *Agenda*: Sin eventos programados hoy.\n`);
    }

    const docWhere: any = { status: { in: ['PENDING', 'IN_PROGRESS'] } };
    if (user && user.role !== 'ADMIN' && user.role !== 'GABINETE') docWhere.responsibleId = user.id;

    const pendingCount = await this.prisma.document.count({ where: docWhere });
    if (pendingCount > 0) {
      const top = await this.prisma.document.findMany({
        where: docWhere,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 3,
        select: { correlativeNumber: true, title: true, priority: true },
      });
      parts.push(`📄 *Documentos pendientes* — ${pendingCount} en total`);
      top.forEach((d) => {
        const urgent = d.priority === 'URGENT' ? ' 🔴' : '';
        parts.push(`  • ${d.correlativeNumber}${urgent} — ${(d.title || '').slice(0, 45)}`);
      });
      if (pendingCount > 3) parts.push(`  _...y ${pendingCount - 3} más_`);
      parts.push('');
    } else {
      parts.push(`📄 *Documentos*: Todo al día, sin pendientes. ✅\n`);
    }

    const urgent = await this.prisma.deadline.findMany({
      where: { dueDate: { lte: tomorrow }, status: { not: 'COMPLETED' } },
      orderBy: { dueDate: 'asc' },
      take: 3,
    });

    if (urgent.length > 0) {
      parts.push(`⚠️ *Plazos urgentes* — ${urgent.length}`);
      urgent.forEach((d) => {
        const overdue = d.dueDate < now;
        parts.push(`  • ${overdue ? '🔴 VENCIDO' : '🟡 Hoy'} — ${d.title}`);
      });
      parts.push('');
    }

    parts.push(`_Escríbeme lo que necesitas y te ayudo enseguida._`);
    return parts.join('\n');
  }

  private async replyMyTasks(user: any): Promise<string> {
    if (!user) {
      return (
        `Para ver tus tareas necesito saber quién eres. 😊\n\n` +
        `Pídele al administrador que registre tu número de WhatsApp en el sistema ` +
        `(Usuarios → Editar → campo WhatsApp).`
      );
    }

    const docs = await this.prisma.document.findMany({
      where: { responsibleId: user.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      select: { correlativeNumber: true, title: true, currentStage: true, priority: true, direction: true },
    });

    const deadlines = await this.prisma.deadline.findMany({
      where: { status: { not: 'COMPLETED' }, dueDate: { gte: new Date() }, document: { responsibleId: user.id } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    if (docs.length === 0 && deadlines.length === 0) {
      return `¡${user.firstName}, no tienes nada pendiente ahora mismo! 🎉 Buen trabajo.`;
    }

    const parts: string[] = [`${greeting(user)} Aquí están tus pendientes:\n`];

    if (docs.length > 0) {
      parts.push(`📄 *Documentos a tu cargo* — ${docs.length}`);
      docs.forEach((d) => {
        const dir = d.direction === 'IN' ? '📥' : '📤';
        const urgent = d.priority === 'URGENT' ? ' 🔴' : '';
        parts.push(`  ${dir} *${d.correlativeNumber}*${urgent}`);
        parts.push(`     ${(d.title || 'Sin título').slice(0, 50)}`);
        parts.push(`     Etapa: ${d.currentStage || 'N/A'}`);
      });
      parts.push('');
    }

    if (deadlines.length > 0) {
      parts.push(`⏰ *Plazos próximos*`);
      deadlines.forEach((d) => {
        const days = Math.ceil((d.dueDate.getTime() - Date.now()) / 86400000);
        parts.push(`  • ${d.title} — vence en ${days} día${days !== 1 ? 's' : ''}`);
      });
    }

    return parts.join('\n');
  }

  private async replyAgendaToday(user: any): Promise<string> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const events = await this.prisma.agendaEvent.findMany({
      where: { startDate: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
      orderBy: { startDate: 'asc' },
      take: 10,
    });

    if (events.length === 0) {
      const tmrEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      const tomorrow = await this.prisma.agendaEvent.findMany({
        where: { startDate: { gte: end, lt: tmrEnd }, status: { not: 'CANCELLED' } },
        orderBy: { startDate: 'asc' }, take: 3,
      });
      if (tomorrow.length > 0) {
        const lines = tomorrow.map((e) => `  • ${e.title} — ${new Date(e.startDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        return `Hoy no hay eventos agendados. 😊\n\nPara *mañana* ya hay ${tomorrow.length} evento${tomorrow.length > 1 ? 's' : ''}:\n${lines.join('\n')}`;
      }
      return `Hoy no hay eventos en la agenda del Ministro. 📅`;
    }

    const typeLabel: Record<string, string> = {
      TRIP: '✈️ Viaje', VISIT: '🤝 Visita', MEETING: '💼 Reunión',
      INVITATION: '📩 Invitación', CONFERENCE: '🎙️ Conferencia', CEREMONY: '🎖️ Ceremonia',
    };

    const parts: string[] = [`🗓️ *Agenda del Ministro — Hoy* (${events.length} evento${events.length > 1 ? 's' : ''})\n`];
    events.forEach((e) => {
      const time = new Date(e.startDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Malabo' });
      const type = typeLabel[e.type] || e.type;
      parts.push(`*${time}* ${type}`);
      parts.push(`${e.title}`);
      if (e.location) parts.push(`📍 ${e.location}`);
      if (e.description) parts.push(`_${e.description.slice(0, 100)}_`);
      parts.push('');
    });

    return parts.join('\n');
  }

  private async replyDeadlines(user: any): Promise<string> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const deadlines = await this.prisma.deadline.findMany({
      where: { dueDate: { lte: tomorrow }, status: { not: 'COMPLETED' } },
      include: { document: { select: { correlativeNumber: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    if (deadlines.length === 0) {
      return `No hay plazos urgentes en este momento. ✅ Todo tranquilo por ahora.`;
    }

    const parts: string[] = [`⚠️ Hay *${deadlines.length} plazo${deadlines.length > 1 ? 's' : ''}* urgentes:\n`];
    deadlines.forEach((d) => {
      const overdue = d.dueDate < now;
      const icon = overdue ? '🔴' : '🟡';
      const doc = d.document ? ` _(${d.document.correlativeNumber})_` : '';
      const when = overdue ? 'VENCIDO' : d.dueDate.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });
      parts.push(`${icon} *${d.title}*${doc} — ${when}`);
    });

    parts.push(`\n_Resuelve estos lo antes posible._`);
    return parts.join('\n');
  }

  private async replyPendingDocs(user: any): Promise<string> {
    const where: any = { status: { in: ['PENDING', 'IN_PROGRESS'] } };
    if (user && user.role !== 'ADMIN' && user.role !== 'GABINETE') where.responsibleId = user.id;

    const docs = await this.prisma.document.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: { correlativeNumber: true, title: true, currentStage: true, direction: true, priority: true },
    });

    if (docs.length === 0) {
      return `No hay documentos pendientes en este momento. ✅ Todo al día.`;
    }

    const total = await this.prisma.document.count({ where });
    const parts: string[] = [`Hay *${total} documento${total > 1 ? 's' : ''}* pendiente${total > 1 ? 's' : ''}${total > 5 ? ` (te muestro los 5 más recientes)` : ''}:\n`];

    docs.forEach((d) => {
      const dir = d.direction === 'IN' ? '📥' : '📤';
      const urgent = d.priority === 'URGENT' ? ' 🔴' : '';
      parts.push(`${dir}${urgent} *${d.correlativeNumber}* — ${(d.title || 'Sin título').slice(0, 50)}`);
      parts.push(`   Etapa: ${d.currentStage || 'N/A'}`);
    });

    parts.push(`\n_Escribe "estado [número]" para ver los detalles de uno específico._`);
    return parts.join('\n');
  }

  private async replyDocStatus(correlativeNumber: string): Promise<string> {
    const num = correlativeNumber.trim();
    const doc = await this.prisma.document.findFirst({
      where: { correlativeNumber: { contains: num, mode: 'insensitive' } },
      include: {
        responsible: { select: { firstName: true, lastName: true } },
        entity: { select: { name: true } },
      },
    });

    if (!doc) {
      return (
        `No encontré ningún documento con el número "${num}". 🤔\n\n` +
        `Verifica que el número esté bien escrito, por ejemplo:\n_estado ENT-2026-000008_`
      );
    }

    const signed = doc.signedAt
      ? `✅ Firmado el ${doc.signedAt.toLocaleDateString('es-ES')}`
      : `📝 Pendiente de firma`;
    const responsible = doc.responsible
      ? `${doc.responsible.firstName} ${doc.responsible.lastName}`
      : 'Sin asignar';

    return (
      `Aquí tienes la información del documento:\n\n` +
      `📄 *${doc.correlativeNumber}*\n` +
      `*${doc.title || 'Sin título'}*\n\n` +
      `Estado: ${doc.status}\n` +
      `Etapa: ${doc.currentStage || 'N/A'}\n` +
      `Dirección: ${doc.direction === 'IN' ? '📥 Entrada' : '📤 Salida'}\n` +
      `${signed}\n` +
      `Responsable: ${responsible}\n` +
      `Entidad: ${doc.entity?.name || 'N/A'}`
    );
  }

  private async replySearch(query: string): Promise<string> {
    const q = query.replace(/^buscar\s*/i, '').trim();
    if (!q) return `¿Qué deseas buscar? Escribe por ejemplo: _buscar oficio ministerio_`;

    const docs = await this.prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { correlativeNumber: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { correlativeNumber: true, title: true, status: true, direction: true },
    });

    if (docs.length === 0) {
      return `No encontré documentos que coincidan con "*${q}*". 🔍\n\nIntenta con otras palabras.`;
    }

    const parts: string[] = [`Encontré *${docs.length} resultado${docs.length > 1 ? 's' : ''}* para "*${q}*":\n`];
    docs.forEach((d) => {
      const dir = d.direction === 'IN' ? '📥' : '📤';
      parts.push(`${dir} *${d.correlativeNumber}* — ${(d.title || '').slice(0, 50)}`);
      parts.push(`   Estado: ${d.status}`);
    });

    return parts.join('\n');
  }

  private async replyStats(user: any): Promise<string> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [total, pending, signed, overdue, todayDocs, todayEvents] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      this.prisma.document.count({ where: { signedAt: { not: null } } }),
      this.prisma.deadline.count({ where: { dueDate: { lt: today }, status: { not: 'COMPLETED' } } }),
      this.prisma.document.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.agendaEvent.count({ where: { startDate: { gte: todayStart }, status: { not: 'CANCELLED' } } }),
    ]);

    return (
      `📊 *Resumen del sistema*\n\n` +
      `En total hay *${total}* documentos registrados. ` +
      `Hoy ingresaron *${todayDocs}* nuevos.\n\n` +
      `Actualmente *${pending}* están pendientes de resolución ` +
      `y *${signed}* ya han sido firmados por el Ministro.\n\n` +
      (overdue > 0 ? `⚠️ Hay *${overdue}* plazo${overdue > 1 ? 's' : ''} vencido${overdue > 1 ? 's' : ''} sin resolver.\n\n` : `✅ Todos los plazos están al día.\n\n`) +
      `Hoy hay *${todayEvents}* evento${todayEvents !== 1 ? 's' : ''} en la agenda.\n\n` +
      `_Actualizado: ${new Date().toLocaleTimeString('es-ES', { timeZone: 'Africa/Malabo' })}_`
    );
  }

  private addActivity(phone: string, message: string, response: string, intent: string, user?: any) {
    this.activityLog.unshift({ timestamp: new Date(), phone, message, response, intent, userName: user ? `${user.firstName} ${user.lastName}` : undefined, role: user?.role });
    if (this.activityLog.length > 100) this.activityLog.length = 100;
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  getStatus(): WaStatus { return this.status; }
  getQrDataUrl(): string | null { return this.qrDataUrl; }
  getConnectedPhone(): string | null { return this.connectedPhone; }
  getActivityLog(): ActivityEntry[] { return this.activityLog; }

  async getRegisteredUsers() {
    return this.prisma.user.findMany({
      where: { OR: [{ whatsapp: { not: null } }, { phone: { not: null } }] },
      select: { id: true, firstName: true, lastName: true, whatsapp: true, phone: true, role: true },
    });
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (this.status !== 'CONNECTED' || !this.sock) return;
    try {
      const jid = phone.replace(/\D/g, '') + '@s.whatsapp.net';
      await this.sock.sendMessage(jid, { text: message });
    } catch (error) {
      this.logger.error(`Send failed: ${error.message}`);
    }
  }

  async sendToUser(userId: string, message: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { whatsapp: true, phone: true } });
    const phone = user?.whatsapp || user?.phone;
    if (phone) await this.sendMessage(phone, message);
  }

  async broadcast(message: string, roles?: string[]): Promise<number> {
    const where: any = { OR: [{ whatsapp: { not: null } }, { phone: { not: null } }], isActive: true };
    if (roles?.length) where.role = { in: roles };
    const users = await this.prisma.user.findMany({ where, select: { whatsapp: true, phone: true } });
    let sent = 0;
    for (const u of users) {
      const phone = u.whatsapp || u.phone;
      if (phone) { await this.sendMessage(phone, message); sent++; await new Promise((r) => setTimeout(r, 500)); }
    }
    return sent;
  }

  async notifyNewAgendaEvent(event: { title: string; startDate: Date; type: string; location?: string; description?: string }): Promise<void> {
    const typeLabel: Record<string, string> = {
      TRIP: '✈️ Viaje', VISIT: '🤝 Visita', MEETING: '💼 Reunión',
      INVITATION: '📩 Invitación', CONFERENCE: '🎙️ Conferencia', CEREMONY: '🎖️ Ceremonia',
    };
    const time = event.startDate.toLocaleString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Malabo' });
    const msg =
      `📢 *Nueva actividad ministerial*\n\n` +
      `*${event.title}*\n` +
      `${typeLabel[event.type] || event.type} — ${time}\n` +
      (event.location ? `📍 ${event.location}\n` : '') +
      (event.description ? `\n_${event.description.slice(0, 150)}_\n` : '') +
      `\n_Escribe "agenda" para ver el programa completo._`;
    await this.broadcast(msg);
  }

  async notifyDocumentReceived(responsibleId: string, correlativeNumber: string, title: string): Promise<void> {
    await this.sendToUser(responsibleId,
      `📥 *Te asignaron un documento*\n\n*${correlativeNumber}*\n${title || 'Sin título'}\n\n_Escribe "estado ${correlativeNumber}" para ver los detalles._`
    );
  }

  async notifyDocumentSigned(creatorId: string, correlativeNumber: string, ministerName: string): Promise<void> {
    await this.sendToUser(creatorId,
      `✅ *Documento firmado*\n\n*${correlativeNumber}* ha sido firmado por el Ministro ${ministerName}.\n\nFecha: ${new Date().toLocaleDateString('es-ES')}`
    );
  }

  async notifyDeadlineAlert(responsibleId: string, deadlineTitle: string, dueDate: Date): Promise<void> {
    const hours = Math.round((dueDate.getTime() - Date.now()) / 3600000);
    await this.sendToUser(responsibleId,
      `⏰ *Alerta de plazo*\n\n*${deadlineTitle}*\nVence: ${dueDate.toLocaleString('es-ES')}\n${hours > 0 ? `Tiempo restante: ${hours} horas` : '⚠️ *VENCIDO*'}`
    );
  }

  async disconnect(): Promise<void> {
    this.clearReconnectTimer();
    try { await this.sock?.logout(); } catch (_) {}
    try { await this.sock?.end(undefined); } catch (_) {}
    this.sock = null;
    this.status = 'DISCONNECTED';
    this.qrDataUrl = null;
    this.connectedPhone = null;
    this.isInitializing = false;
    // Clear saved session so next connect shows QR
    try {
      fs.rmSync(this.AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(this.AUTH_DIR, { recursive: true });
    } catch (_) {}
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    setTimeout(() => this.initClient(), 1000);
  }
}
