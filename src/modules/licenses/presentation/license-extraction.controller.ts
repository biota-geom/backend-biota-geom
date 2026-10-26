import {
  Controller,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
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
  ApiGatewayTimeoutResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { ExtractLicenseDataUseCase } from '../application/extract-license-data.use-case';
import {
  LicenseExtractionResponseDto,
  toLicenseExtractionResponse,
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
    private readonly extractLicenseDataUseCase: ExtractLicenseDataUseCase,
  ) {}

  @Post('extract')
  @HttpCode(HttpStatus.OK)
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
      'Lê o PDF de uma licença ambiental com IA (Amazon Nova 2 Lite) e devolve sugestões de preenchimento. Não salva nenhum dado.',
  })
  @ApiOkResponse({ type: LicenseExtractionResponseDto })
  @ApiUnprocessableEntityResponse({
    description:
      'Arquivo ausente, inválido ou documento do qual não foi possível extrair dados.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Serviço de IA indisponível ou não configurado.',
  })
  @ApiGatewayTimeoutResponse({
    description: 'A leitura do documento excedeu o tempo limite.',
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
  ): Promise<LicenseExtractionResponseDto> {
    const extraction = await this.extractLicenseDataUseCase.execute(
      file.buffer,
    );

    return toLicenseExtractionResponse(extraction);
  }
}
