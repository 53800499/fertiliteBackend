import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../../super-admin/entities/support-ticket.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminSupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  listTickets(status?: string) {
    const where = status && status !== 'tous' ? { statut: status } : {};
    return this.ticketRepo.find({ where, order: { dateMaj: 'DESC' } });
  }

  async createTicket(dto: Partial<SupportTicket>, actor: AdminActor) {
    if (!dto.utilisateurEmail?.trim() || !dto.sujet?.trim()) {
      throw new BadRequestException("L'email et le sujet du ticket sont requis.");
    }
    const ticket = this.ticketRepo.create({
      utilisateurId: dto.utilisateurId || null,
      utilisateurEmail: dto.utilisateurEmail.trim(),
      sujet: dto.sujet.trim(),
      categorie: dto.categorie || 'compte',
      priorite: dto.priorite || 'normale',
      statut: 'nouveau',
      assigneA: dto.assigneA || null,
      messages: dto.messages || [],
    });
    const saved = await this.ticketRepo.save(ticket);
    await this.auditLogger.log(actor, 'support', 'CREATE_TICKET', 'ticket', saved.id);
    return saved;
  }

  async updateTicket(id: string, dto: Partial<SupportTicket>, actor: AdminActor) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket introuvable.');
    if (dto.statut !== undefined) ticket.statut = dto.statut;
    if (dto.priorite !== undefined) ticket.priorite = dto.priorite;
    if (dto.assigneA !== undefined) ticket.assigneA = dto.assigneA;
    const saved = await this.ticketRepo.save(ticket);
    await this.auditLogger.log(actor, 'support', 'UPDATE_TICKET', 'ticket', id, {
      statut: saved.statut,
      priorite: saved.priorite,
    });
    return saved;
  }

  async replyTicket(id: string, contenu: string, actor: AdminActor) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket introuvable.');
    if (!contenu?.trim()) throw new BadRequestException('Le message est vide.');

    const messages = Array.isArray(ticket.messages) ? [...ticket.messages] : [];
    messages.push({
      auteur: actor.email,
      contenu: contenu.trim(),
      date: new Date().toISOString(),
    });
    ticket.messages = messages;
    if (ticket.statut === 'nouveau') ticket.statut = 'en_cours';
    const saved = await this.ticketRepo.save(ticket);
    await this.auditLogger.log(actor, 'support', 'REPLY_TICKET', 'ticket', id);
    return saved;
  }
}

