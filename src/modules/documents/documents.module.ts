import { Module } from '@nestjs/common';
import { FileStorageModule } from '../../common/storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { CreateDocumentUseCase } from './application/create-document.use-case';
import { ListDocumentsUseCase } from './application/list-documents.use-case';
import { DocumentsRepository } from './domain/documents.repository';
import { PrismaDocumentRepository } from './infra/prisma-document.repository';
import { DocumentsController } from './presentation/documents.controller';

@Module({
  imports: [AuthModule, CustomerModule, FileStorageModule],
  controllers: [DocumentsController],
  providers: [
    { provide: DocumentsRepository, useClass: PrismaDocumentRepository },
    CreateDocumentUseCase,
    ListDocumentsUseCase,
  ],
})
export class DocumentsModule {}
