import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { CreateDocumentUseCase } from '../application/create-document.use-case';
import { DeleteDocumentUseCase } from '../application/delete-document.use-case';
import { CreateDocumentFolderUseCase } from '../application/create-document-folder.use-case';
import { GetDocumentUrlUseCase } from '../application/get-document-url.use-case';
import { ListDocumentFoldersUseCase } from '../application/list-document-folders.use-case';
import { ListDocumentsUseCase } from '../application/list-documents.use-case';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateDocumentFolderDto } from './dto/create-document-folder.dto';
import {
  DocumentFolderResponseDto,
  toDocumentFolderResponse,
} from './dto/document-folder-response.dto';
import {
  DocumentUrlResponseDto,
  toDocumentUrlResponse,
} from './dto/document-url-response.dto';
import {
  DocumentResponseDto,
  toDocumentResponse,
} from './dto/document-response.dto';
import { DocumentsExceptionFilter } from './filters/documents-exception.filter';
import { DocumentFileValidator } from './validators/document-file.validator';

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

interface UploadedDocument {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export function invalidDocumentRouteIdException(): BadRequestException {
  return new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST);
}

const routeUuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidDocumentRouteIdException,
});

export function documentFileValidationExceptionFactory(
  error: string,
): UnprocessableEntityException {
  const knownMessages: string[] = [
    AUTH_MESSAGES.DOCUMENT_FILE_TOO_LARGE,
    AUTH_MESSAGES.DOCUMENT_INVALID_FILE_TYPE,
  ];

  return new UnprocessableEntityException(
    knownMessages.includes(error)
      ? error
      : AUTH_MESSAGES.DOCUMENT_FILE_REQUIRED,
  );
}

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(DocumentsExceptionFilter)
@Controller('customers/:customerId/documents')
export class DocumentsController {
  constructor(
    private readonly createDocumentUseCase: CreateDocumentUseCase,
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
    private readonly getDocumentUrlUseCase: GetDocumentUrlUseCase,
    private readonly deleteDocumentUseCase: DeleteDocumentUseCase,
    private readonly createDocumentFolderUseCase: CreateDocumentFolderUseCase,
    private readonly listDocumentFoldersUseCase: ListDocumentFoldersUseCase,
  ) {}

  @Post()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Noise Report 2026' },
        document_date: {
          type: 'string',
          format: 'date',
          example: '2026-08-15',
        },
        folder_id: { type: 'string', format: 'uuid', nullable: true },
      },
    },
  })
  @ApiOperation({ summary: 'Upload one document for a company.' })
  @ApiCreatedResponse({ type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found.' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid document file.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
    }),
  )
  async create(
    @Param('customerId', routeUuidPipe) customerId: string,
    @Body() dto: CreateDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_DOCUMENT_SIZE_BYTES,
            message: AUTH_MESSAGES.DOCUMENT_FILE_TOO_LARGE,
          }),
          new DocumentFileValidator(AUTH_MESSAGES.DOCUMENT_INVALID_FILE_TYPE),
        ],
        exceptionFactory: documentFileValidationExceptionFactory,
      }),
    )
    file: UploadedDocument,
    @CurrentUser() user: { id: string },
  ): Promise<DocumentResponseDto> {
    const document = await this.createDocumentUseCase.execute({
      customerId,
      ownerUserId: user.id,
      title: dto.title,
      documentDate: new Date(`${dto.document_date}T00:00:00.000Z`),
      folderId: dto.folder_id ?? null,
      file: {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return toDocumentResponse(document);
  }

  @Get()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({ summary: 'List active documents for a company.' })
  @ApiOkResponse({ type: DocumentResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Company not found.' })
  async list(
    @Param('customerId', routeUuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.listDocumentsUseCase.execute(
      customerId,
      user.id,
    );

    return documents.map(toDocumentResponse);
  }

  @Post('folders')
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({ summary: 'Create a folder for company documents.' })
  @ApiCreatedResponse({ type: DocumentFolderResponseDto })
  @ApiNotFoundResponse({ description: 'Company or parent folder not found.' })
  @ApiConflictResponse({ description: 'Folder name already exists.' })
  async createFolder(
    @Param('customerId', routeUuidPipe) customerId: string,
    @Body() dto: CreateDocumentFolderDto,
    @CurrentUser() user: { id: string },
  ): Promise<DocumentFolderResponseDto> {
    const folder = await this.createDocumentFolderUseCase.execute({
      customerId,
      ownerUserId: user.id,
      parentId: dto.parent_id ?? null,
      name: dto.name,
    });

    return toDocumentFolderResponse(folder);
  }

  @Get('folders')
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({ summary: 'List the company document folders.' })
  @ApiOkResponse({ type: DocumentFolderResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Company not found.' })
  async listFolders(
    @Param('customerId', routeUuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DocumentFolderResponseDto[]> {
    const folders = await this.listDocumentFoldersUseCase.execute(
      customerId,
      user.id,
    );

    return folders.map(toDocumentFolderResponse);
  }

  @Get(':documentId/url')
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'documentId', format: 'uuid' })
  @ApiOperation({ summary: 'Generate an access URL for a company document.' })
  @ApiOkResponse({ type: DocumentUrlResponseDto })
  @ApiNotFoundResponse({
    description: 'Document not found or owned by another user.',
  })
  async getUrl(
    @Param('customerId', routeUuidPipe) customerId: string,
    @Param('documentId', routeUuidPipe) documentId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DocumentUrlResponseDto> {
    const accessUrl = await this.getDocumentUrlUseCase.execute(
      documentId,
      customerId,
      user.id,
    );

    return toDocumentUrlResponse(accessUrl);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'documentId', format: 'uuid' })
  @ApiOperation({ summary: 'Logically delete a company document.' })
  @ApiNoContentResponse({ description: 'Document deleted.' })
  @ApiNotFoundResponse({
    description:
      'Document not found, already deleted or owned by another user.',
  })
  async remove(
    @Param('customerId', routeUuidPipe) customerId: string,
    @Param('documentId', routeUuidPipe) documentId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.deleteDocumentUseCase.execute(documentId, customerId, user.id);
  }
}
