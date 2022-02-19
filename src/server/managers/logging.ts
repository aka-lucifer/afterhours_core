import axios, {AxiosError} from "axios";
import {StatusCodes} from "http-status-codes";

import {LogTypes} from "../enums/logTypes";
import WebhookMessage from "../models/webhook/discord/webhookMessage";
import RateLimitInfo from "../models/webhook/discord/rateLimitInfo";

import {Server} from "../server";
import {Delay} from "../utils";
import serverConfig from "../../configs/server.json"

export class LogManager {
  private server: Server;
  private readonly connectionsURL: string = serverConfig.discordLogs.urls.connectionsURL;
  private readonly killURL: string = serverConfig.discordLogs.urls.killURL;
  private readonly chatURL: string = serverConfig.discordLogs.urls.chatURL;
  private readonly actionURL: string = serverConfig.discordLogs.urls.actionURL;
  private readonly anticheatURL: string = serverConfig.discordLogs.urls.anticheatURL;
  private readonly commendURL: string = serverConfig.discordLogs.urls.commendURL;

  constructor(server: Server) {
    this.server = server;
  }

  // Methods
  public async Send(type: LogTypes, message: WebhookMessage) {
    let url;

    if (type == LogTypes.Connection) url = this.connectionsURL;
    if (type == LogTypes.Kill) url = this.killURL;
    if (type == LogTypes.Chat) url = this.chatURL;
    if (type == LogTypes.Action) url = this.actionURL;
    if (type == LogTypes.Anticheat) url = this.anticheatURL;
    if (type == LogTypes.Commend) url = this.commendURL;

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
      }

      throw axiosError;
    }
  }
}
