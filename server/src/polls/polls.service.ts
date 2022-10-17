import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Poll } from 'shared';
import { createPollID, createUserID } from 'src/ids';
import { PollsRepository } from './polls.repository';
import {
  AddParticipantFields,
  CreatePollFields,
  JoinPollFields,
  RejoinPollFields,
  RemoveParticipantFields,
} from './types';

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);

  constructor(
    private readonly pollsRepository: PollsRepository,
    private readonly jwtService: JwtService,
  ) {}

  async createPoll(fields: CreatePollFields) {
    const pollID = createPollID();
    const userID = createUserID();

    const createdPoll = await this.pollsRepository.createPoll({
      ...fields,
      pollID,
      userID,
    });

    this.logger.debug(`Creating token for poll ${pollID}, user ${userID}`);

    const signedString = this.jwtService.sign(
      {
        pollID: createdPoll.id,
        name: fields.name,
      },
      {
        subject: userID,
      },
    );

    return {
      poll: createdPoll,
      accessToken: signedString,
    };
  }

  async joinPoll(fields: JoinPollFields) {
    const userID = createUserID();

    this.logger.debug(
      `Fetching poll ${fields.pollID} for user ${userID}/${fields.name}`,
    );

    const joinedPoll = await this.pollsRepository.getPoll(fields.pollID);

    this.logger.debug(
      `Creating token for poll ${joinedPoll.id}, user ${userID}`,
    );

    const signedString = this.jwtService.sign(
      {
        pollID: joinedPoll.id,
        name: fields.name,
      },
      {
        subject: userID,
      },
    );

    return {
      poll: joinedPoll,
      accessToken: signedString,
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

  async addParticipant(addParticipant: AddParticipantFields): Promise<Poll> {
    return this.pollsRepository.addParticipant(addParticipant);
  }

  async removeParticipant(
    pollID: string,
    userID: string,
  ): Promise<Poll | void> {
    const poll = await this.pollsRepository.getPoll(pollID);

    if (!poll.hasStarted) {
      const updatedPoll = await this.pollsRepository.removeParticipant(
        pollID,
        userID,
      );

      return updatedPoll;
    }
  }

  async getPoll(pollID: string): Promise<Poll> {
    return this.pollsRepository.getPoll(pollID);
  }
}
