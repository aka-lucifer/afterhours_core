import {NotificationTypes} from "../../../shared/enums/ui/notifications/types";
import {NuiMessages} from "../../../shared/enums/ui/nuiMessages";
import {Delay} from "../../utils";

export class Notification {
  private header: string = "UNSET_HEADER";
  private body: string = "UNSET_BODY";

  private status: NotificationTypes = NotificationTypes.Info;

  private readonly effect: string = "slide";
  private readonly speed: number = 300;

  // Closing
  private autoclose: boolean = true;
  private timer: number = 3000;

  private readonly type: number = 2;

  private progress: boolean = false;

  private icon: string;

  // Callable Functions
  private start: CallableFunction;
  private timeout: NodeJS.Timeout = undefined;
  private finish:CallableFunction;

  constructor(header: string, body: string, type: NotificationTypes, timer?: number, progressBar?: boolean, start?: CallableFunction, finish?: CallableFunction, icon?: string) {
    this.header = header;
    this.body = body;
    this.status = type;
    
    if (timer) this.timer = timer;
    if (progressBar) this.progress = progressBar;
    if (start) this.start = start;
    if (finish) this.finish = finish;
    if (icon) this.icon = icon;
  }

  public async send(): Promise<void> {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.CreateNotification,
      data: {
        title: this.header,
        text: this.body,
        status: this.status,
        effect: "slide",
        speed: 300,
        autoclose: true,
        autotimeout: this.timer,
        type: 2,
        position: "top left",
        progress: this.progress,
        showCloseButton: false
      }
    }));
    await Delay(0);

    if (this.start) this.start();
    this.timeout = setTimeout(() => {
      console.log(`TIMEOUT OF (${this.timer}) is finished!`);
      if (this.finish) this.finish();
    }, this.timer);
  }
}
