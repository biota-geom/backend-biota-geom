import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDocumentData } from '../domain/create-document.data';
import { CustomerDocument } from '../domain/document.entity';
import { DocumentsRepository } from '../domain/documents.repository';

const UPLOADER_SELECT = { id: true, name: true } as const;

@Injectable()
export class PrismaDocumentRepository implements DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDocumentData): Promise<CustomerDocument> {
    return this.prisma.document.create({
      data: {
        customer: { connect: { id: data.customerId } },
        uploadedBy: { connect: { id: data.uploadedById } },
        title: data.title,
        type: data.type,
        documentDate: data.documentDate,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      },
      include: { uploadedBy: { select: UPLOADER_SELECT } },
    });
  }

  async findActiveByCustomerId(
    customerId: string,
  ): Promise<CustomerDocument[]> {
    return this.prisma.document.findMany({
      where: { customerId, deletedAt: null },
      include: { uploadedBy: { select: UPLOADER_SELECT } },
      orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
