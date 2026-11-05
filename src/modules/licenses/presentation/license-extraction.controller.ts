import {
  Controller,
  HttpCode,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
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
  ApiAcceptedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { GetLicenseExtractionJobUseCase } from '../application/get-license-extraction-job.use-case';
import { StartLicenseExtractionUseCase } from '../application/start-license-extraction.use-case';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import {
  LicenseExtractionJobResponseDto,
  StartLicenseExtractionResponseDto,
  toLicenseExtractionJobResponse,
} from './dto/license-extraction-response.dto';
import { LicenseExtractionExceptionFilter } from './filters/license-extraction-exception.filter';
import { fileValidationExceptionFactory } from './licenses.controller';
import { LICENSES_MESSAGES } from './messages/licenses.messages.pt-br';
import { PdfFileValidator } from './validators/pdf-file.validator';

// Same limit as the registration upload, so any PDF the form accepts can be
// sent for extraction.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface UploadedDocument {
  buffer: Buffer;
}

@ApiTags('licenses')
@UseFilters(LicenseExtractionExceptionFilter)
@Controller('licenses')
export class LicenseExtractionController {
  constructor(
    private readonly startLicenseExtractionUseCase: StartLicenseExtractionUseCase,
    private readonly getLicenseExtractionJobUseCase: GetLicenseExtractionJobUseCase,
  ) {}

  @Post('extract')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['document'],
      properties: { document: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Inicia a leitura do PDF de uma licença ambiental com IA (Claude Sonnet 5.5 no Amazon Bedrock) em segundo plano e devolve o id do job. Consulte o resultado em GET /licenses/extract/:jobId. Não salva nenhum dado.',
  })
  @ApiAcceptedResponse({ type: StartLicenseExtractionResponseDto })
  @ApiUnprocessableEntityResponse({
    description:
      'Arquivo ausente, inválido ou documento do qual não foi possível extrair dados.',
  })
  async extract(
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
  ): Promise<StartLicenseExtractionResponseDto> {
    const jobId = await this.startLicenseExtractionUseCase.execute(
      file.buffer,
      user.id,
    );

    return { job_id: jobId };
  }

  @Get('extract/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'jobId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Consulta o andamento da leitura iniciada em POST /licenses/extract. Falhas da IA voltam como status FAILED, não como erro HTTP.',
  })
  @ApiOkResponse({ type: LicenseExtractionJobResponseDto })
  @ApiNotFoundResponse({
    description: 'Job inexistente, expirado ou de outro usuário.',
  })
  async getExtraction(
    @Param('jobId') jobId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseExtractionJobResponseDto> {
    const job = await this.getLicenseExtractionJobUseCase.execute(
      jobId,
      user.id,
    );

    return toLicenseExtractionJobResponse(job);
  }
}
