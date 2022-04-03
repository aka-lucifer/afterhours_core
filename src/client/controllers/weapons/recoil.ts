import { AmmoType, Game, Prop } from "fivem-js";

import { Client } from "../../client";
import { GetHash, Inform } from "../../utils";

import { LXEvents } from "../../../shared/enums/events/lxEvents";
import { Weapons } from "../../../shared/enums/weapons";

import clientConfig from "../../../configs/client.json";

export class WeaponRecoil {
  private client: Client;

  // Weapon Data
  private currentWeapon: number;
  private ammoType: number;
  private weapon: Prop;

  // Recoil Data
  private baseRecoil: number;
  private shortGunsMult: number;
  private longGunsMult: number;
  private pistolAmmoRecoil: number;
  private smgAmmoRecoil: number;
  private lmgAmmoRecoil: number;
  private rifleAmmoRecoil: number;
  private sniperAmmoRecoil: number;
  private shotgunAmmoRecoil: number;
  private gripSubtractor: number;
  private silencerSubtractor: number;
  private tickHandler: number;
  private currentRecoil: number;

  constructor(client: Client) {
    this.client = client;
    
    // Events
    onNet(LXEvents.Gunshot_Cl, this.gunshot.bind(this));
  }

  // Methods
  private loadSettings(): void {
    this.baseRecoil = clientConfig.controllers.weapons.recoil.baseRecoil;
    this.shortGunsMult = clientConfig.controllers.weapons.recoil.shortGunsMult;
    this.longGunsMult = clientConfig.controllers.weapons.recoil.longGunsMult;
    this.pistolAmmoRecoil = clientConfig.controllers.weapons.recoil.pistolAmmoRecoil;
    this.smgAmmoRecoil = clientConfig.controllers.weapons.recoil.smgAmmoRecoil;
    this.lmgAmmoRecoil = clientConfig.controllers.weapons.recoil.lmgAmmoRecoil;
    this.sniperAmmoRecoil = clientConfig.controllers.weapons.recoil.sniperAmmoRecoil;
    this.rifleAmmoRecoil = clientConfig.controllers.weapons.recoil.rifleAmmoRecoil;
    this.shotgunAmmoRecoil = clientConfig.controllers.weapons.recoil.shotgunAmmoRecoil;
    this.silencerSubtractor = clientConfig.controllers.weapons.recoil.silencerSubtractor;
    this.gripSubtractor = clientConfig.controllers.weapons.recoil.gripSubtractor;
    this.longGunsMult = clientConfig.controllers.weapons.recoil.longGunsMult;
  }

  public init(): void {
    this.loadSettings();
  }

  // Events
  private async gunshot(): Promise<void> {
    this.currentWeapon = GetSelectedPedWeapon(Game.PlayerPed.Handle); // Update our current weapon variable

    // if we aren't unarmed
    if (this.currentWeapon != Weapons.Unarmed) {
      // If our gun shoots bullets
      if (GetWeaponDamageType(this.currentWeapon) == 3) {
        const myPed = Game.PlayerPed;
        this.ammoType = GetPedAmmoType(myPed.Handle, this.currentWeapon);
        this.weapon = new Prop(GetCurrentPedWeaponEntityIndex(myPed.Handle));

        console.log(`Weapon: ${this.currentWeapon} | Object: ${this.weapon.Handle} | Ammo Type: ${this.ammoType} | Default Recoil: ${this.baseRecoil} | Wind Speed: ${GetWindSpeed()} | Wind Direction: ${GetWindDirection()}`);
        
        switch(this.ammoType) {
          case AmmoType.Pistol:
            this.currentRecoil = this.pistolAmmoRecoil;
            break;
          case AmmoType.SMG:
            this.currentRecoil = this.smgAmmoRecoil;
            break;
          case AmmoType.AssaultRifle:
            this.currentRecoil = this.rifleAmmoRecoil;
            break;
          case AmmoType.Sniper:
            this.currentRecoil = this.sniperAmmoRecoil;
            break;
          case AmmoType.Shotgun:
            this.currentRecoil = this.shotgunAmmoRecoil;
            break;
        }

        if (this.currentRecoil > 0) {
          this.currentRecoil = this.baseRecoil + this.currentRecoil;
          if (this.client.IsDebugging) console.log(`Stage 1 Recoil: ${this.currentRecoil}`);

          const weapDimensions = GetModelDimensions(GetEntityModel(this.weapon.Handle));
          const modelLength = Math.abs(weapDimensions[0][1])
          if (modelLength > 0.05) { // Y Coord
            this.currentRecoil = this.currentRecoil * this.longGunsMult;
            if (this.client.IsDebugging) console.log("Using Long Gun");
          } else if (modelLength > 0.02) {
            if (this.client.IsDebugging) console.log("Using Normal Gun");
          } else {
            this.currentRecoil = this.currentRecoil * this.shortGunsMult;
            if (this.client.IsDebugging) console.log("Using Short Gun");
          }

          if (IsPedCurrentWeaponSilenced(Game.PlayerPed.Handle)) {
            this.currentRecoil = this.currentRecoil - this.silencerSubtractor;
            if (this.client.IsDebugging) console.log(`Silenced Recoil: ${this.silencerSubtractor} = ${this.currentRecoil}`);
          }

          if (HasPedGotWeaponComponent(Game.PlayerPed.Handle, this.currentWeapon, GetHash("COMPONENT_AT_AR_AFGRIP"))) {
            this.currentRecoil = this.currentRecoil - this.gripSubtractor;
            if (this.client.IsDebugging) console.log(`Grip Recoil: ${this.gripSubtractor} = ${this.currentRecoil}`);
          }

          const windDirection = GetWindDirection();
          const windSpeed = GetWindSpeed();

          if (this.client.IsDebugging) console.log(`Final Recoil: ${this.currentRecoil}`)
          if (this.client.IsDebugging) console.log(`Cam Pitch: ${GetGameplayCamRelativePitch()}`)
          console.log(`Wind Data - Speed: ${windSpeed} | Direction: ${windDirection}`);
          // if (this.ammoType == AmmoType.Sniper) SetGameplayCamRelativeHeading(GetGameplayCamRelativeHeading() + (windSpeed / 4));
          SetGameplayCamRelativePitch(GetGameplayCamRelativePitch() + this.currentRecoil, 1.0);

          // If health is too low, recieve damage from the recoil to your player
          if (Game.PlayerPed.Health <= 5) {
            Game.PlayerPed.applyDamage(2);
            Inform("Recoil Manager", "Applied damage as you fire a weapon with very low health!");
          }
        }
      }
    }
  }
}