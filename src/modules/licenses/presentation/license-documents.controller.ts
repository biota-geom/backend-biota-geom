import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { GetLicenseDocumentUrlUseCase } from '../application/get-license-document-url.use-case';
import {
  LicenseDocumentUrlResponseDto,
  toLicenseDocumentUrlResponse,
} from './dto/license-document-url-response.dto';
import { LicensesExceptionFilter } from './filters/licenses-exception.filter';
import { invalidCustomerIdException } from './licenses.controller';

export const licenseIdPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('licenses')
@UseFilters(LicensesExceptionFilter)
@Controller('licenses')
export class LicenseDocumentsController {
  constructor(
    private readonly getLicenseDocumentUrlUseCase: GetLicenseDocumentUrlUseCase,
  ) {}

  @Get(':licenseId/document/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Gera uma URL temporária (pré-assinada) para visualizar o PDF da licença.',
  })
  @ApiOkResponse({ type: LicenseDocumentUrlResponseDto })
  @ApiNotFoundResponse({
    description: 'License not found or owned by another user.',
  })
  async getDocumentUrl(
    @Param('licenseId', licenseIdPipe) licenseId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseDocumentUrlResponseDto> {
    const accessUrl = await this.getLicenseDocumentUrlUseCase.execute(
      licenseId,
      user.id,
    );

    return toLicenseDocumentUrlResponse(accessUrl);
  }
}
