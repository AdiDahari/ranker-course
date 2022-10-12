import {
  BadRequestException,
  Logger,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Namespace } from 'socket.io';
import { WsCatchAllFilter } from 'src/exceptions/ws-catch-all-filter';
import { WsBadRequestException } from 'src/exceptions/ws-exceptions';
import { PollsService } from './polls.service';
import { SocketWithAuth } from './types';

@UsePipes(new ValidationPipe())
@UseFilters(new WsCatchAllFilter())
@WebSocketGateway({
  namespace: 'polls',
})
export class PollsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PollsGateway.name);

  constructor(private readonly pollsService: PollsService) {}

  @WebSocketServer() io: Namespace;

  afterInit(): void {
    this.logger.log(`WebSocket Gateway initialized`);
  }

  handleConnection(client: SocketWithAuth) {
    const sockets = this.io.sockets;

    this.logger.debug(
      `Socket connected with userID: ${client.userID}, pollID: ${client.pollID}, and name: "${client.name}"`,
    );

    this.logger.log(`WS Client with id ${client.id} connected!`);
    this.logger.debug(`Number of connected sockets is ${sockets.size}`);

    this.io.emit('hello', client.id);
  }

  handleDisconnect(client: SocketWithAuth) {
    const sockets = this.io.sockets;

    this.logger.debug(
      `Socket disconnected with userID: ${client.userID}, pollID: ${client.pollID}, and name: "${client.name}"`,
    );

    this.logger.log(`client with id ${client.id} disconnected!`);
    this.logger.debug(`Number of connected clients is ${sockets.size}`);
  }

  @SubscribeMessage('test')
  async test() {
    throw new BadRequestException('text test');
  }
}
