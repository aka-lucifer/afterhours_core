import {Player} from "../database/player";

import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";
import {Events} from "../../../shared/enums/events";

export class Notification {
  private player: Player;
  private readonly title: string;
  private readonly description: string;
  private readonly type: NotificationTypes;
  private readonly timer: number = 3000;
  private readonly progress: boolean = false;

  constructor(player: Player, title: string, description: string, type: NotificationTypes, timer?: number, progressBar?: boolean) {
    this.player = player;
    this.title = title;
    this.description = description;
    this.type = type;
    if (timer) this.timer = timer;
    if (progressBar) this.progress = progressBar;
  }

  // Methods
  public async send(): Promise<void> {
    await this.player.TriggerEvent(Events.notify, this.title, this.description, this.type, this.timer, this.progress);
  }
}
