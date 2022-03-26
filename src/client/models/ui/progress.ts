import { Control, Game, InputMode } from "fivem-js";
import { RegisterNuiCallback } from "../../utils";

import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";

interface ProgressDisablers {
  mouse?: boolean,
  player?: boolean,
  vehicle?: boolean
}

interface ProgressOptions {
  startPercentage?: number,
  stopPercentage?: number,
  duratation?: number,
  colour?: string,
  backgroundColour?: string,
  x?: number,
  y?: number,
  rotation?: number,
  maxAngle?: number,
  radius?: number,
  stroke?: number,
  controlDisablers?: ProgressDisablers,
  useTime?: boolean,
  usePercent?: boolean
}

export class Progress {
  private duration: number;
  private disablers: ProgressDisablers;

  private options: ProgressOptions = {
    duratation: 5000,
    colour: "white",
    backgroundColour: "rgba(255, 255, 255, 0.35)",
    x: 0.5,
    y: 0.5,
    rotation: 0,
    maxAngle: 360,
    radius: 25,
    stroke: 7.5,
    controlDisablers: {
      mouse: false,
      player: false,
      vehicle: false
    },
    useTime: true,
    usePercent: false
  }
  
  private onStart: CallableFunction;
  private onFinish: CallableFunction;
  private onCancel: CallableFunction;

  private controlTick: number = undefined;
  private cancelled: boolean = false;

  constructor(duration: number, disablers: ProgressDisablers, onCancel?: CallableFunction, onStart?: CallableFunction, onFinish?: CallableFunction) {
    this.options.duratation = duration;
    this.options.controlDisablers = disablers;
    this.onCancel = onCancel;
    this.onStart = onStart;
    this.onFinish = onFinish;

    this.registerCallbacks();
  }

  // Methods
  public registerCallbacks(): void {
    RegisterNuiCallback(NuiCallbacks.ProgressStarted, (data, cb) => {
      if (this.onStart !== undefined) {
        // console.log("start function is defined, so we're running it!");
        this.onStart();
      }

      cb("ok");
    })
    
    RegisterNuiCallback(NuiCallbacks.ProgressFinished, (data, cb) => {
      if (!this.cancelled) {
        if (this.onFinish !== undefined) {
          // console.log("duration timeout is finished and finish function is defined, so we're running it!");
          this.onFinish();

          // Clear control ticks after timer is finished
          clearTick(this.controlTick);
          this.controlTick = undefined;
        }
      } else {
        // console.log("progress was finished but it was already cancelled!");
      }
      
      cb("ok");
    })
    
    RegisterNuiCallback(NuiCallbacks.ProgressCancelled, (data, cb) => {
      this.cancelled = true;
      if (this.onCancel !== undefined) this.onCancel();
      clearTick(this.controlTick);
      this.controlTick = undefined;

      // console.log("disabled progress via UI!");

      cb("ok");
    })
  }

  public start(): void {
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.StartProgress,
      data: this.options
    }));

    this.controlTick = setTick(() => {
      if (Game.isControlJustPressed(InputMode.MouseAndKeyboard, Control.FrontendCancel)) {
        // disable progress UI
        SendNuiMessage(JSON.stringify({
          event: NuiMessages.CancelProgress
        }))

        this.cancelled = true;
        if (this.onCancel !== undefined) this.onCancel();
        clearTick(this.controlTick);
        this.controlTick = undefined;

        // console.log("disable progress UI & ticks as you cancelled your current action!");
      }
    });
  }
}