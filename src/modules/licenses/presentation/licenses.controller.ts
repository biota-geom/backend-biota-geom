import {
  BadRequestException,
  Body,
  Controller,
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
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { LicenseType } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { CreateLicenseUseCase } from '../application/create-license.use-case';
import { CreateLicenseDto } from './dto/create-license.dto';
import {
  LicenseCreatedResponseDto,
  toLicenseCreatedResponse,
} from './dto/license-created-response.dto';
import { LicensesExceptionFilter } from './filters/licenses-exception.filter';
import { LICENSES_MESSAGES } from './messages/licenses.messages.pt-br';
import { PdfFileValidator } from './validators/pdf-file.validator';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function invalidCustomerIdException(): BadRequestException {
  return new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST);
}

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

// Only our own PT-BR messages are trusted verbatim; anything else (e.g. Nest's
// default "File is required") falls back to a generic, still-PT-BR reason.
function fileValidationExceptionFactory(
  error: string,
): UnprocessableEntityException {
  const knownMessages: string[] = [
    LICENSES_MESSAGES.FILE_TOO_LARGE,
    LICENSES_MESSAGES.INVALID_FILE_TYPE,
  ];

  return new UnprocessableEntityException(
    knownMessages.includes(error) ? error : LICENSES_MESSAGES.FILE_REQUIRED,
  );
}

@ApiTags('licenses')
@UseFilters(LicensesExceptionFilter)
@Controller('customers/:customerId/licenses')
export class LicensesController {
  constructor(private readonly createLicenseUseCase: CreateLicenseUseCase) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @UseInterceptors(
    FileInterceptor('document_file', { storage: memoryStorage() }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'type',
        'process_number',
        'issuing_agency_id',
        'issue_date',
        'expiration_date',
        'document_file',
      ],
      properties: {
        type: { type: 'string', enum: Object.values(LicenseType) },
        process_number: { type: 'string', example: 'LO nº 118/2020' },
        issuing_agency_id: { type: 'string', format: 'uuid' },
        issue_date: { type: 'string', format: 'date-time' },
        expiration_date: { type: 'string', format: 'date-time' },
        document_file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Cadastra uma licença ambiental da empresa e calcula seu status a partir da data de validade.',
  })
  @ApiCreatedResponse({ type: LicenseCreatedResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'Órgão emissor inexistente ou arquivo inválido.',
  })
  async createLicense(
    @Param('customerId', uuidPipe) customerId: string,
    @Body() dto: CreateLicenseDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE_BYTES,
            message: LICENSES_MESSAGES.FILE_TOO_LARGE,
          }),
          new PdfFileValidator(LICENSES_MESSAGES.INVALID_FILE_TYPE),
        ],
        exceptionFactory: fileValidationExceptionFactory,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseCreatedResponseDto> {
    const license = await this.createLicenseUseCase.execute({
      customerId,
      ownerUserId: user.id,
      type: dto.type,
      processNumber: dto.process_number,
      issuingAgencyId: dto.issuing_agency_id,
      issueDate: new Date(dto.issue_date),
      expirationDate: new Date(dto.expiration_date),
      file: {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
    });

    return toLicenseCreatedResponse(license);
  }
}
