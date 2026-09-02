import { Injectable } from '@nestjs/common';
import { CustomerResponseDTO } from '../presentation/dto/customer-responde.dto';

@Injectable()
export abstract class CustomerRepository {
  abstract findAll(): CustomerResponseDTO[];
}
