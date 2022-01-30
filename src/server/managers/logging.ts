import axios, { AxiosError} from "axios";
import { StatusCodes } from "http-status-codes";

import { LogTypes } from "../enums/logTypes";
import WebhookMessage from "../models/webhook/webhookMessage";
import RateLimitInfo from "../models/webhook/rateLimitInfo";

import { Server } from "../server";
import { Delay, Log } from "../utils";
import serverConfig from "../../configs/server.json"

export class LogManager {
  private server: Server;
  private readonly connectionsURL: string = serverConfig.discordLogs.urls.connectionsURL;
  private readonly killURL: string;
  private readonly chatURL: string;
  private readonly actionURL: string;

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

    try {
      await axios.post(url, message.toJSON(), {
          headers: { 'Content-Type': 'application/json' }
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