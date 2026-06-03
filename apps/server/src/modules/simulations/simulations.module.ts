import { Module } from '@nestjs/common';

import { SimulationsRepository } from './simulations.repository.js';
import { SimulationsService } from './simulations.service.js';

@Module({
  providers: [SimulationsRepository, SimulationsService],
  exports: [SimulationsService],
})
export class SimulationsModule {}
