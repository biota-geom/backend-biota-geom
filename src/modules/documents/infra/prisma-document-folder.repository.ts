import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentFolder } from '../domain/document-folder.entity';
import {
  CreateDocumentFolderData,
  DocumentFoldersRepository,
} from '../domain/document-folders.repository';

@Injectable()
export class PrismaDocumentFolderRepository implements DocumentFoldersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDocumentFolderData): Promise<DocumentFolder> {
    return this.prisma.documentFolder.create({ data });
  }

  findAllByCustomerId(customerId: string): Promise<DocumentFolder[]> {
    return this.prisma.documentFolder.findMany({
      where: { customerId },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findByIdForOwner(
    id: string,
    customerId: string,
    ownerUserId: string,
  ): Promise<DocumentFolder | null> {
    return this.prisma.documentFolder.findFirst({
      where: { id, customerId, customer: { ownerUserId } },
    });
  }

  findByName(
    customerId: string,
    parentId: string | null,
    name: string,
  ): Promise<DocumentFolder | null> {
    return this.prisma.documentFolder.findFirst({
      where: {
        customerId,
        parentId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }
}
