import { Injectable } from '@nestjs/common';
import { LeadAttachment } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Metadata-only — no binary storage, `fileUrl` assumes an already-hosted resource
// (research.md #8, same pattern as User.avatarUrl/Organization.logoUrl).
@Injectable()
export class LeadAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { leadId: string; fileName: string; fileUrl: string; uploadedByUserId: string }): Promise<LeadAttachment> {
    return this.prisma.leadAttachment.create({ data });
  }

  findByLeadId(leadId: string): Promise<LeadAttachment[]> {
    return this.prisma.leadAttachment.findMany({ where: { leadId }, orderBy: { uploadedAt: 'asc' } });
  }
}
