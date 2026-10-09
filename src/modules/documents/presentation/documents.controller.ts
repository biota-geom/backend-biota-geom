import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { ListDocumentsUseCase } from '../application/list-documents.use-case';
import { CustomerDocumentType } from '../domain/customer-document-type';
import { CreateDocumentDto } from './dto/create-document.dto';
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

export function invalidDocumentCustomerIdException(): BadRequestException {
  return new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST);
}

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidDocumentCustomerIdException,
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
  ) {}

  @Post()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title', 'type', 'document_date'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Noise Report 2026' },
        type: { type: 'string', enum: Object.values(CustomerDocumentType) },
        document_date: {
          type: 'string',
          format: 'date',
          example: '2026-08-15',
        },
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
    @Param('customerId', uuidPipe) customerId: string,
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
      type: dto.type,
      documentDate: new Date(`${dto.document_date}T00:00:00.000Z`),
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
    @Param('customerId', uuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.listDocumentsUseCase.execute(
      customerId,
      user.id,
    );

    return documents.map(toDocumentResponse);
  }
}
