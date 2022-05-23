import { Server } from "../server";

import { LogTypes } from "../enums/logTypes";
import WebhookMessage from "../models/webhook/discord/webhookMessage";

import { Events } from "../../shared/enums/events/events";
import sharedConfig from "../../configs/shared.json";
import { EmbedColours } from "../../shared/enums/logging/embedColours";
import { ErrorCodes } from "../../shared/enums/logging/errors";
import { Ranks } from "../../shared/enums/ranks";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { Weapons } from "../../shared/enums/weapons";

export class WeaponsManager {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.checkWeapon, this.EVENT_checkWeapon.bind(this));
  }

  // Methods
  private async hasPermission(myRank: Ranks, weaponRanks: number[] | number, donatorAsset: boolean): Promise<boolean> {
    // If the asset is a donator package or whatever, only the donators of that rank or above, or admin and above can drive the vehicle (disables honor & trusted from accesing)
    if (donatorAsset) {
      if (weaponRanks !== undefined) {
        if (typeof weaponRanks == "object") {
          for (let i = 0; i < weaponRanks.length; i++) {
            if (myRank == weaponRanks[i] || myRank >= Ranks.Admin) {
              return true;
            }
          }
        } else if (typeof weaponRanks == "number") {
          if (myRank == weaponRanks || myRank >= Ranks.Admin) {
            return true;
          }
        }

        return false;
      } else {
        return true; // for fun debugging
      }
    } else { // If it's not a donator package, any rank that is equal or above can drive it.
      if (weaponRanks !== undefined) {
        if (typeof weaponRanks == "object") {
          for (let i = 0; i < weaponRanks.length; i++) {
            if (myRank >= weaponRanks[i]) {
              return true;
            }
          }
        } else if (typeof weaponRanks == "number") {
          if (myRank >= weaponRanks) {
            return true;
          }
        }

        return false;
      } else {
        return true; // for fun debugging
      }
    }
  }

  // Events
  private async EVENT_checkWeapon(currentWeapon: number): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source);
    if (player) {
      // console.log("curr weapon!", currentWeapon);
      const weaponData = sharedConfig.weapons[currentWeapon];
      // console.log("weap data", JSON.stringify(weaponData, null, 4));

      if (weaponData !== undefined) {
        const donatorAsset = weaponData.donatorAsset !== undefined && true ? true : false;
        const hasPermission = await this.hasPermission(player.Rank, weaponData.rank, donatorAsset);
        
        if (!hasPermission) {
          // Remove weapon from ped and set to unarmed
          const ped = GetPlayerPed(player.Handle);
          RemoveWeaponFromPed(ped, currentWeapon);
          SetCurrentPedWeapon(ped, Weapons.Unarmed, true);

          await player.Notify("Weapons", "You aren't the correct rank to equip this weapon!", NotificationTypes.Error, 4000);

          const discord = await player.GetIdentifier("discord");
          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
            username: "Vehicle Logs", embeds: [{
              color: EmbedColours.Green,
              title: "__Weapon Removed__",
              description: `A player has tried to equip a weapon, they don't have access to!\n\n**Veh Data**: ${JSON.stringify(weaponData, null, 4)}**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
              footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
            }]
          }));
        }
      } else {
        const discord = await player.GetIdentifier("discord");
        await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
          username: "Weapon Logs", embeds: [{
            color: EmbedColours.Green,
            title: "__Player Killed__",
            description: `Weapon not found (${currentWeapon}) | Error Code: ${ErrorCodes.WeaponNotFound}\n\n**If you see this, contact <@276069255559118859>!**`,
            footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
          }]
        }));
      }
    }
  }
}
