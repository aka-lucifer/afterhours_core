import {NotificationTypes} from "../../enums/ui/notifications/types";
import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import {Delay} from "../../utils";

export class Notification {
  private header: string = "UNSET_HEADER";
  private body: string = "UNSET_BODY";

  private status: NotificationTypes = NotificationTypes.Info;

  private readonly effect: string = "slide";
  private readonly speed: number = 300;

  // Closing
  private autoclose: boolean = false;
  private timer: number = 3000;

  private readonly type: number = 2;

  private progressBar: boolean = false;

  private icon: string;

  // Callable Functions
  private start: CallableFunction;
  private timeout: NodeJS.Timeout = undefined;
  private finish:CallableFunction;

  constructor(header: string, body: string, type: NotificationTypes, progressBar: boolean, icon?: string, timer?: number, start?: CallableFunction, finish?: CallableFunction) {
    this.header = header;
    this.body = body;
    this.status = type;
    this.progressBar = progressBar;
    this.icon = icon;

    if (timer) {
      this.autoclose = true;
      this.timer = timer;
      this.start = start;
      this.finish = finish;
    }
  }

  public async send(): Promise<void> {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.CreateNotification,
      data: {
        title: this.header,
        text: this.body,
        status: this.status,
        effect: this.effect,
        speed: this.speed,
        autoclose: this.autoclose,
        autotimeout: this.timer,
        type: this.type,
        customIcon: this.icon,
        progressBar: this.progressBar,
        position: "top left",
        showCloseButton: false
      }
    }));
    await Delay(0);

    this.start();
    this.timeout = setTimeout(() => {
      console.log(`TIMEOUT OF (${this.timer}) is finished!`);
      this.finish();
    }, this.timer);
  }
}
