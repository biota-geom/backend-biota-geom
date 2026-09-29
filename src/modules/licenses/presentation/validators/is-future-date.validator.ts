import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
  }

  defaultMessage(): string {
    return LICENSES_MESSAGES.CONDITION_DUE_DATE_MUST_BE_FUTURE;
  }
}
