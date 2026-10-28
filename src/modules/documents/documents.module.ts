import { Module } from '@nestjs/common';
import { FileStorageModule } from '../../common/storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { CreateDocumentUseCase } from './application/create-document.use-case';
import { CreateDocumentFolderUseCase } from './application/create-document-folder.use-case';
import { DeleteDocumentUseCase } from './application/delete-document.use-case';
import { GetDocumentUrlUseCase } from './application/get-document-url.use-case';
import { ListDocumentFoldersUseCase } from './application/list-document-folders.use-case';
import { ListDocumentsUseCase } from './application/list-documents.use-case';
import { DocumentFoldersRepository } from './domain/document-folders.repository';
import { DocumentsRepository } from './domain/documents.repository';
import { PrismaDocumentRepository } from './infra/prisma-document.repository';
import { PrismaDocumentFolderRepository } from './infra/prisma-document-folder.repository';
import { DocumentsController } from './presentation/documents.controller';

@Module({
  imports: [AuthModule, CustomerModule, FileStorageModule],
  controllers: [DocumentsController],
  providers: [
    { provide: DocumentsRepository, useClass: PrismaDocumentRepository },
    {
      provide: DocumentFoldersRepository,
      useClass: PrismaDocumentFolderRepository,
    },
    CreateDocumentUseCase,
    CreateDocumentFolderUseCase,
    DeleteDocumentUseCase,
    GetDocumentUrlUseCase,
    ListDocumentFoldersUseCase,
    ListDocumentsUseCase,
  ],
})
export class DocumentsModule {}
