import { Body, Controller, Logger, Post } from '@nestjs/common';

import { CreatePollDto, JoinPollDto } from './dtos';

@Controller('polls')
export class PollsController {
  @Post()
  async create(@Body() createPollDto: CreatePollDto) {
    Logger.log('In Create Method');
    return createPollDto;
  }

  @Post('/join')
  async join(@Body() joinPollDto: JoinPollDto) {
    Logger.log('In Join Method');
    return joinPollDto;
  }

  @Post('/rejoin')
  async rejoin() {
    Logger.log('In Rejoin Method');
  }
}
