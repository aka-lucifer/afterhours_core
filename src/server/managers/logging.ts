import axios, { AxiosError } from 'axios';
import { StatusCodes } from 'http-status-codes';

import { Bugs, LogTypes } from '../enums/logging';
import WebhookMessage from '../models/webhook/discord/webhookMessage';
import RateLimitInfo from '../models/webhook/discord/rateLimitInfo';

import { Server } from '../server';
import { Delay, Error } from '../utils';
import serverConfig from '../../configs/server.json';
import { ErrorCodes } from '../../shared/enums/logging/errors';

export class LogManager {
  private server: Server;

  // Admin Logs
  private readonly connectionsURL: string = serverConfig.discordLogs.urls.connectionsURL;
  private readonly killURL: string = serverConfig.discordLogs.urls.killURL;
  private readonly chatURL: string = serverConfig.discordLogs.urls.chatURL;
  private readonly actionURL: string = serverConfig.discordLogs.urls.actionURL;
  private readonly anticheatURL: string = serverConfig.discordLogs.urls.anticheatURL;
  private readonly commendURL: string = serverConfig.discordLogs.urls.commendURL;
  private readonly timesheetURL: string = serverConfig.discordLogs.urls.timesheetURL;
  private readonly reportURL: string = serverConfig.discordLogs.urls.reportURL;

  // Bugs
  private readonly scriptBugs: string = serverConfig.discordLogs.bugs.script;
  private readonly vehicleBugs: string = serverConfig.discordLogs.bugs.vehicle;
  private readonly eupBugs: string = serverConfig.discordLogs.bugs.eup;
  private readonly mloBugs: string = serverConfig.discordLogs.bugs.mlo;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public async Send(type: LogTypes | Bugs, message: WebhookMessage): Promise<void> {
    let url;

    switch (type) {
      case LogTypes.Connection:
        url = this.connectionsURL;
        break;
      case LogTypes.Kill:
        url = this.killURL;
        break;
      case LogTypes.Chat:
        url = this.chatURL;
        break;
      case LogTypes.Action:
        url = this.actionURL;
        break;
      case LogTypes.Anticheat:
        url = this.anticheatURL;
        break;
      case LogTypes.Commend:
        url = this.commendURL;
        break;
      case LogTypes.Timesheet:
        url = this.timesheetURL;
        break;
      case LogTypes.Report:
        url = this.reportURL;
        break;
      case Bugs.Script:
        url = this.scriptBugs;
        break;
      case Bugs.Vehicle:
        url = this.vehicleBugs;
        break;
      case Bugs.EUP:
        url = this.eupBugs;
        break;
      case Bugs.MLO:
        url = this.mloBugs;
        break;
    }

    try {
      const formData = message.toFormData();

      await axios.post(url, formData.getBuffer(), {
        headers: formData.getHeaders()
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      const response = axiosError.response;

      if (response?.status === StatusCodes.TOO_MANY_REQUESTS) {
        const rateLimitInfo = new RateLimitInfo(response.headers);

        await Delay(rateLimitInfo.retryAfter);
        return await this.Send(type, message);
      } else if (response?.status == StatusCodes.FORBIDDEN || response?.status == StatusCodes.NOT_FOUND) {
        Error("Webhook Send Method", `Error posting content to webhook!\nError Code: ${ErrorCodes.DiscordDown}`);
      }
    }
  }
}
