import { Injectable, Logger } from '@nestjs/common';
import { createPollID, createUserID } from 'src/ids';
import { PollsRepository } from './polls.repository';
import { CreatePollFields, JoinPollFields, RejoinPollFields } from './types';

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);

  constructor(private readonly pollsRepository: PollsRepository) {}

  async createPoll(fields: CreatePollFields) {
    const pollID = createPollID();
    const userID = createUserID();

    const createdPoll = await this.pollsRepository.createPoll({
      ...fields,
      pollID,
      userID,
    });
    return {
      poll: createdPoll,
    };
  }

  async joinPoll(fields: JoinPollFields) {
    const userID = createUserID();

    this.logger.debug(
      `Fetching poll ${fields.pollID} for user ${userID}/${fields.name}`,
    );

    const joinedPoll = await this.pollsRepository.getPoll(fields.pollID);
    return {
      poll: joinedPoll,
    };
  }

  async rejoinPoll(fields: RejoinPollFields) {
    this.logger.debug(
      `Rejoining poll ${fields.pollID} for user ${fields.userID}/${fields.name}`,
    );

    const rejoinedPoll = await this.pollsRepository.addParticipant(fields);
    return {
      poll: rejoinedPoll,
    };
  }
}
