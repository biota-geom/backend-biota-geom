import { ConfigService } from '@nestjs/config';
import { AuthConfigService } from './modules/auth/infra/auth-config.service';

jest.mock('@nestjs/core', () => ({
  ...jest.requireActual<object>('@nestjs/core'),
  NestFactory: { create: jest.fn() },
}));

jest.mock('@nestjs/swagger', () => ({
  ...jest.requireActual<object>('@nestjs/swagger'),
  DocumentBuilder: jest.fn(),
  SwaggerModule: { createDocument: jest.fn(), setup: jest.fn() },
}));

describe('bootstrap', () => {
  it('configures CORS and Swagger, then listens on the configured port', async () => {
    const mockApp = {
      get: jest.fn((token: unknown) => {
        if (token === AuthConfigService) {
          return { corsOrigins: ['http://localhost:5173'] };
        }
        if (token === ConfigService) {
          return { get: jest.fn().mockReturnValue(3000) };
        }
        throw new Error(`Unexpected token: ${String(token)}`);
      }),
      set: jest.fn(),
      enableCors: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    const documentBuilderInstance = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addBearerAuth: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ info: {} }),
    };

    const { NestFactory } = jest.requireMock<{
      NestFactory: { create: jest.Mock };
    }>('@nestjs/core');
    const { DocumentBuilder, SwaggerModule } = jest.requireMock<{
      DocumentBuilder: jest.Mock;
      SwaggerModule: { createDocument: jest.Mock; setup: jest.Mock };
    }>('@nestjs/swagger');

    NestFactory.create.mockResolvedValue(mockApp);
    DocumentBuilder.mockImplementation(() => documentBuilderInstance);
    SwaggerModule.createDocument.mockReturnValue({ info: {} });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./main');
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 1);
    expect(mockApp.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: ['http://localhost:5173'],
        credentials: false,
      }),
    );
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'docs',
      mockApp,
      expect.anything(),
    );
    expect(mockApp.listen).toHaveBeenCalledWith(3000, '0.0.0.0');
  });
});
