import { ArgumentsHost } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { EsgMetricAlreadyExistsError } from '../../domain/errors/esg-metric-already-exists.error';
import { EsgMetricsExceptionFilter } from './esg-metrics-exception.filter';
import { describe, it, expect, jest } from '@jest/globals';

function buildHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('EsgMetricsExceptionFilter', () => {
  const filter = new EsgMetricsExceptionFilter();

  it('maps EsgMetricAlreadyExistsError to 409 with the exact PT-BR message', () => {
    const { host, status, json } = buildHost();

    filter.catch(new EsgMetricAlreadyExistsError('Water consumption'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.ESG_METRIC_NAME_ALREADY_EXISTS,
      }),
    );
  });
});
