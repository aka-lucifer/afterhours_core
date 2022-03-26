import { Control, Game, InputMode } from "fivem-js";
import { RegisterNuiCallback } from "../../utils";

import { NuiCallbacks } from "../../../shared/enums/ui/nuiCallbacks";
import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";

interface ProgressDisablers {
  movement?: boolean,
  vehicle?: boolean;
  mouse?: boolean,
  combat?: boolean
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
      movement: false,
      vehicle: false,
      mouse: false,
      combat: false
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
      if (this.options.controlDisablers.movement) {
        DisableControlAction(0, 30, true); // Left/Right
        DisableControlAction(0, 31, true); // Forward/Back
        DisableControlAction(0, 36, true); // Ducking
        DisableControlAction(0, 21, true); // Sprinting
      }
      
      if (this.options.controlDisablers.vehicle) {
        DisableControlAction(0, 63, true); // Turn Left
        DisableControlAction(0, 64, true); // Turn Right
        DisableControlAction(0, 71, true); // Forward
        DisableControlAction(0, 72, true); // Backwards
        DisableControlAction(0, 75, true); // Exit Vehicle
      }
      
      if (this.options.controlDisablers.mouse) {
        DisableControlAction(0, 1, true); // LookLeftRight
        DisableControlAction(0, 2, true); // LookUpDown
        DisableControlAction(0, 106, true); // VehicleMouseControlOverride
      }
      
      if (this.options.controlDisablers.combat) {
        DisablePlayerFiring(Game.PlayerPed.Handle, true); // Disable weapon firing
        DisableControlAction(0, 24, true); // Disable attack
        DisableControlAction(0, 25, true); // Disable aim
        DisableControlAction(1, 37, true); // Disable weapon select
        DisableControlAction(0, 47, true); // Disable weapon
        DisableControlAction(0, 58, true); // Disable weapon
        DisableControlAction(0, 140, true); // Disable melee
        DisableControlAction(0, 141, true); // Disable melee
        DisableControlAction(0, 142, true); // Disable melee
        DisableControlAction(0, 143, true); // Disable melee
        DisableControlAction(0, 263, true); // Disable melee
        DisableControlAction(0, 264, true); // Disable melee
        DisableControlAction(0, 257, true); // Disable melee
      }

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