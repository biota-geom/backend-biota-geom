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
        documentDate: data.documentDate,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        folder:
          data.folderId === null
            ? undefined
            : { connect: { id: data.folderId } },
      },
      include: { uploadedBy: { select: UPLOADER_SELECT } },
    });
  }

  async findByIdForOwner(
    id: string,
    customerId: string,
    ownerUserId: string,
  ): Promise<CustomerDocument | null> {
    return this.prisma.document.findFirst({
      where: {
        id,
        customerId,
        deletedAt: null,
        customer: { ownerUserId },
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
