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
  Put,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
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
import { ListLicensesByCustomerUseCase } from '../application/list-licenses-by-customer.use-case';
import { CreateLicenseDto } from './dto/create-license.dto';
import {
  LicenseCreatedResponseDto,
  toLicenseCreatedResponse,
} from './dto/license-created-response.dto';
import {
  LicensePanelResponseDto,
  toLicensePanelResponse,
} from './dto/license-panel-response.dto';
import { LicensesExceptionFilter } from './filters/licenses-exception.filter';
import { LICENSES_MESSAGES } from './messages/licenses.messages.pt-br';
import { PdfFileValidator } from './validators/pdf-file.validator';
import { CreateLicenseConditionsDto } from './dto/create-license-conditions.dto';
import { CreateLicenseConditionsResponseDto } from './dto/create-license-conditions-response.dto';
import { CreateLicenseConditionUseCase } from '../application/create-license-conditions.use-case';
import { GetLicenseDetailsUseCase } from '../application/get-license-details.use-case';
import { UpdateLicenseConditionUseCase } from '../application/update-license-conditions.use-case';
import { DeleteLicenseConditionUseCase } from '../application/delete-license-condition.use-case';
import {
  LicenseConditionDetailsResponseDto,
  LicenseDetailsResponseDto,
  toConditionStatus,
  toConditionPeriodicity,
  toConditionType,
  toLicenseConditionDetailsResponse,
  toLicenseDetailsResponse,
  toNullableIsoDate,
} from './dto/license-details-response.dto';
import { UpdateLicenseConditionDto } from './dto/update-license-condition.dto';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/*
 * Only the fields this handler reads, rather than Express.Multer.File. Besides
 * not depending on more of Multer's shape than needed, a plain interface keeps
 * the decorated parameter's emitted metadata trivial: a namespaced type like
 * Express.Multer.File makes TypeScript emit an `Express && Express.Multer &&
 * ...` chain there, which shows up as uncoverable branches.
 */
interface UploadedDocument {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export function invalidCustomerIdException(): BadRequestException {
  return new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST);
}

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

// Only our own PT-BR messages are trusted verbatim; anything else (e.g. Nest's
// default "File is required") falls back to a generic, still-PT-BR reason.
export function fileValidationExceptionFactory(
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
  constructor(
    private readonly createLicenseUseCase: CreateLicenseUseCase,
    private readonly listLicensesByCustomerUseCase: ListLicensesByCustomerUseCase,
    private readonly createLicenseConditionUseCase: CreateLicenseConditionUseCase,
    private readonly getLicenseDetailsUseCase: GetLicenseDetailsUseCase,
    private readonly updateLicenseConditionUseCase: UpdateLicenseConditionUseCase,
    private readonly deleteLicenseConditionUseCase: DeleteLicenseConditionUseCase,
  ) {}

  @Get(':licenseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiOperation({ summary: 'Get a license and its conditions.' })
  @ApiOkResponse({ type: LicenseDetailsResponseDto })
  @ApiNotFoundResponse({ description: 'Customer or license not found.' })
  async getLicenseDetails(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('licenseId', uuidPipe) licenseId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseDetailsResponseDto> {
    const license = await this.getLicenseDetailsUseCase.execute(
      customerId,
      licenseId,
      user.id,
    );

    return toLicenseDetailsResponse(license);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Lista as licenças ambientais da empresa com o resumo agregado de status.',
  })
  @ApiOkResponse({ type: LicensePanelResponseDto })
  async listLicenses(
    @Param('customerId', uuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LicensePanelResponseDto> {
    const result = await this.listLicensesByCustomerUseCase.execute(
      customerId,
      user.id,
    );

    return toLicensePanelResponse(result);
  }

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
    file: UploadedDocument,
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

  @Post(':licenseId/conditions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  async createLicenseConditions(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('licenseId', uuidPipe) licenseId: string,
    @Body() dto: CreateLicenseConditionsDto,
    @CurrentUser() user: { id: string },
  ): Promise<CreateLicenseConditionsResponseDto> {
    return this.createLicenseConditionUseCase.execute({
      customerId: customerId,
      licenseId: licenseId,
      userId: user.id,
      data: dto,
    });
  }

  @Put(':licenseId/conditions/:conditionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiParam({ name: 'conditionId', format: 'uuid' })
  @ApiOkResponse({ type: LicenseConditionDetailsResponseDto })
  @ApiNotFoundResponse({ description: 'Customer or condition not found.' })
  async updateLicenseCondition(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('licenseId', uuidPipe) licenseId: string,
    @Param('conditionId', uuidPipe) conditionId: string,
    @Body() dto: UpdateLicenseConditionDto,
    @CurrentUser() user: { id: string },
  ) {
    const condition = await this.updateLicenseConditionUseCase.execute({
      customerId,
      licenseId,
      conditionId,
      ownerUserId: user.id,
      data: {
        itemNumber: dto.item_number,
        title: dto.title,
        description: dto.description,
        responsibleName: dto.responsible_name,
        conditionType: toConditionType(dto.condition_type),
        periodicity: toConditionPeriodicity(dto.periodicity),
        deadline: toNullableIsoDate(dto.deadline),
        dueDate:
          dto.due_date === undefined ? undefined : new Date(dto.due_date),
        alertDate: toNullableIsoDate(dto.alert_date),
        completionDate: toNullableIsoDate(dto.completion_date),
        status: toConditionStatus(dto.status, dto.is_violated),
        isViolated: dto.is_violated,
      },
    });

    return toLicenseConditionDetailsResponse(condition);
  }

  @Delete(':licenseId/conditions/:conditionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiParam({ name: 'conditionId', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Condition deleted.' })
  @ApiNotFoundResponse({ description: 'Customer or condition not found.' })
  async deleteLicenseCondition(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('licenseId', uuidPipe) licenseId: string,
    @Param('conditionId', uuidPipe) conditionId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.deleteLicenseConditionUseCase.execute(
      customerId,
      licenseId,
      conditionId,
      user.id,
    );
  }
}
