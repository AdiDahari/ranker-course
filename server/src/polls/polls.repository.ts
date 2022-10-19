import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { IO_REDIS_KEY } from 'src/redis.module';
import {
  AddNominationData,
  AddParticipantData,
  AddParticipantRankingsData,
  CreatePollData,
} from './types';
import { Poll, Results } from 'shared';

@Injectable()
export class PollsRepository {
  private readonly ttl: string;
  private readonly logger = new Logger(PollsRepository.name);

  constructor(
    configService: ConfigService,
    @Inject(IO_REDIS_KEY) private readonly redisClient: Redis,
  ) {
    this.ttl = configService.get('POLL_DURATION');
  }

  async createPoll({
    votesPerVoter,
    topic,
    pollID,
    userID,
  }: CreatePollData): Promise<Poll> {
    const initialPoll = {
      id: pollID,
      topic,
      votesPerVoter,
      participants: {},
      nominations: {},
      rankings: {},
      results: [],
      adminID: userID,
      hasStarted: false,
    };

    this.logger.log(
      `Creating new Poll: ${JSON.stringify(initialPoll, null, 2)} with TTL: ${
        this.ttl
      }`,
    );

    const key = `polls:${pollID}`;

    try {
      await this.redisClient
        .multi([
          ['send_command', 'JSON.SET', key, '.', JSON.stringify(initialPoll)],
          ['expire', key, this.ttl],
        ])
        .exec();

      return initialPoll;
    } catch (error) {
      this.logger.error(
        `Failed to add poll ${JSON.stringify(initialPoll)}\n${error}`,
      );

      throw new InternalServerErrorException();
    }
  }

  async getPoll(pollID: string): Promise<Poll> {
    this.logger.log(`Attempt to get poll ${pollID}`);

    const key = `polls:${pollID}`;

    try {
      const currentPoll = await this.redisClient.send_command(
        'JSON.GET',
        key,
        '.',
      );

      this.logger.verbose(currentPoll);

      return JSON.parse(currentPoll);
    } catch (error) {
      this.logger.error(`Failed to get poll ${pollID}`, error);
      throw new InternalServerErrorException(`Failed to get poll ${pollID}`);
    }
  }

  async addParticipant({
    pollID,
    userID,
    name,
  }: AddParticipantData): Promise<Poll> {
    this.logger.log(
      `Attempt to add participant with userID/name: ${userID}/${name} to poll ${pollID}`,
    );

    const key = `polls:${pollID}`;

    const participantPath = `.participants.${userID}`;

    try {
      await this.redisClient.send_command(
        'JSON.SET',
        key,
        participantPath,
        JSON.stringify(name),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to add participant ${userID}/${name} to poll ${pollID}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to add participant ${userID}/${name} to poll ${pollID}`,
      );
    }
  }

  async removeParticipant(pollID: string, userID: string): Promise<Poll> {
    this.logger.log(`Removing user ${userID} from poll ${pollID}`);

    const key = `polls:${pollID}`;
    const participantsPath = `.participants.${userID}`;

    try {
      await this.redisClient.send_command('JSON.DEL', key, participantsPath);

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to remove user ${userID} from poll ${pollID}`,
        error,
      );

      throw new InternalServerErrorException('Failed to remove participant');
    }
  }

  async addNomination({
    pollID,
    nominationID,
    nomination,
  }: AddNominationData): Promise<Poll> {
    this.logger.log(
      `Attempting to add a nomination with nominationID/nomination: ${nominationID}/${nomination.text} to poll ${pollID}`,
    );

    const key = `polls:${pollID}`;
    const nominationPath = `.nominations.${nominationID}`;

    try {
      await this.redisClient.send_command(
        'JSON.SET',
        key,
        nominationPath,
        JSON.stringify(nomination),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to add nomination ${nominationID}/${nomination.text} to poll ${pollID}`,
        error,
      );

      throw new InternalServerErrorException(
        `Failed to add nomination ${nominationID}/${nomination.text} to poll ${pollID}`,
      );
    }
  }

  async removeNomination(pollID: string, nominationID: string): Promise<Poll> {
    this.logger.log(`Removing nomination ${nominationID} from poll ${pollID}`);

    const key = `polls:${pollID}`;
    const nominationPath = `.nominations.${nominationID}`;

    try {
      await this.redisClient.send_command('JSON.DEL', key, nominationPath);

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to remove nomination ${nominationID} from poll ${pollID}`,
        error,
      );

      throw new InternalServerErrorException(
        `Failed to remove nomination ${nominationID} from poll ${pollID}`,
      );
    }
  }

  async startPoll(pollID: string): Promise<Poll> {
    this.logger.log(`Setting hasStarted for poll ${pollID}`);

    const key = `polls:${pollID}`;

    try {
      await this.redisClient.send_command(
        'JSON.SET',
        key,
        'hasStarted',
        JSON.stringify(true),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(`Failed to set hasStarted for poll ${pollID}`, error);

      throw new InternalServerErrorException(
        'There was an error starting the poll',
      );
    }
  }

  async addParticipantRankings({
    pollID,
    userID,
    rankings,
  }: AddParticipantRankingsData): Promise<Poll> {
    this.logger.log(
      `Attemting to add rankings for user ${userID} to poll ${pollID}`,
      rankings,
    );

    const key = `polls:${pollID}`;
    const rankingsPath = `.rankings.${userID}`;

    try {
      this.redisClient.send_command(
        'JSON.SET',
        key,
        rankingsPath,
        JSON.stringify(rankings),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to add rankings for user ${userID} to poll ${pollID}`,
        error,
      );

      throw new InternalServerErrorException(
        `Failed to add rankings for user ${userID} to poll ${pollID}`,
      );
    }
  }

  async addResults(pollID: string, results: Results): Promise<Poll> {
    this.logger.log(
      `Attempting to add results to poll ${pollID}`,
      JSON.stringify(results),
    );

    const key = `polls:${pollID}`;
    const resultsPath = `.results`;

    try {
      await this.redisClient.send_command(
        'JSON.SET',
        key,
        resultsPath,
        JSON.stringify(results),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to add results to poll ${pollID}`,
        results,
        error,
      );

      throw new InternalServerErrorException(
        `Failed to add results to poll ${pollID}`,
      );
    }
  }

  async deletePoll(pollID: string): Promise<void> {
    const key = `polls:${pollID}`;

    this.logger.log(`Deleting poll ${pollID}`);

    try {
      await this.redisClient.send_command('JSON.DEL', key);
    } catch (error) {
      this.logger.error(`Failed to delete poll ${pollID}`, error);

      throw new InternalServerErrorException(`Failed to delete poll ${pollID}`);
    }
  }
}
