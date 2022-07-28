import { Server } from "../server";

import { LogTypes } from "../enums/logging";

import WebhookMessage from "../models/webhook/discord/webhookMessage";

import { Events } from "../../shared/enums/events/events";
import { EmbedColours } from "../../shared/enums/logging/embedColours";
import { Ranks } from "../../shared/enums/ranks";
import { NotificationTypes } from "../../shared/enums/ui/notifications/types";
import { Weapons } from "../../shared/enums/weapons";
import { formatRank } from "../../shared/utils";

import sharedConfig from "../../configs/shared.json";

export class WeaponsManager {
  private server: Server;

  constructor(server: Server) {
    this.server = server;

    // Events
    onNet(Events.checkWeapon, this.EVENT_checkWeapon.bind(this));
  }

  // Methods
  private async hasPermission(myRank: Ranks, weaponRanks: number[] | number, donatorAsset: boolean): Promise<[boolean, number]> {
    // If the asset is a donator package or whatever, only the donators of that rank or above, or admin and above can drive the Weapon (disables honor & trusted from accesing)
    if (donatorAsset) {
      if (weaponRanks !== undefined) {
        if (typeof weaponRanks == "object") {
          for (let i = 0; i < weaponRanks.length; i++) {
            if (myRank == weaponRanks[i] || myRank >= Ranks.Admin) {
              return [true, weaponRanks[i]];
            }
          }
        } else if (typeof weaponRanks == "number") {
          if (myRank == weaponRanks || myRank >= Ranks.Admin) {
            return [true, weaponRanks];
          }
        }

        return [false, -1];
      } else {
        return [true, -1]; // for fun debugging
      }
    } else { // If it's not a donator package, any rank that is equal or above can drive it.
      if (weaponRanks !== undefined) {
        if (typeof weaponRanks == "object") {
          for (let i = 0; i < weaponRanks.length; i++) {
            if (myRank >= weaponRanks[i]) {
              return [true, weaponRanks[i]];
            }
          }
        } else if (typeof weaponRanks == "number") {
          if (myRank >= weaponRanks) {
            return [true, weaponRanks];
          } else {
            return [false, weaponRanks];
          }
        }
      } else {
        return [true, 0]; // for fun debugging
      }
    }
  }

  // Events
  private async EVENT_checkWeapon(currentWeapon: number): Promise<void> {
    const player = await this.server.connectedPlayerManager.GetPlayer(source.toString());
    if (player) {
      // console.log("curr weapon!", currentWeapon);
      const weaponData = sharedConfig.weapons[currentWeapon];
      // console.log("weap data", JSON.stringify(weaponData, null, 4));

      if (weaponData !== undefined) {
        const donatorAsset = weaponData.donatorAsset !== undefined && true;
        const [hasPermission, rank] = await this.hasPermission(player.Rank, weaponData.rank, donatorAsset);
        
        if (!hasPermission) {
          // Remove weapon from ped and set to unarmed
          const ped = GetPlayerPed(player.Handle);
          RemoveWeaponFromPed(ped, currentWeapon);
          SetCurrentPedWeapon(ped, Weapons.Unarmed, true);

          const requiredRank = formatRank(Ranks[rank]);
          await player.Notify("Weapons", `You aren't the correct rank to equip this weapon! (${requiredRank})`, NotificationTypes.Error, 4000);

          const discord = await player.GetIdentifier("discord");
          await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
            username: "Weapon Logs", embeds: [{
              color: EmbedColours.Green,
              title: "__Weapon Removed__",
              description: `A player has tried to equip a weapon, they don't have access to!\n\n**Weapon Data**: ${JSON.stringify(weaponData, null, 4)}\n**Id**: ${player.Id}\n**Name**: ${player.GetName}\n**Rank**: ${Ranks[player.Rank]}\n**Playtime**: ${await player.GetPlaytime.FormatTime()}\n**Whitelisted**: ${await player.Whitelisted()}\n**Discord**: ${discord != "Unknown" ? `<@${discord}>` : discord}\n**Identifiers**: ${JSON.stringify(player.identifiers, null, 4)}`,
              footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
            }]
          }));
        }
      }

      // else {
      //   const discord = await player.GetIdentifier("discord");
      //   await this.server.logManager.Send(LogTypes.Action, new WebhookMessage({
      //     username: "Weapon Logs", embeds: [{
      //       color: EmbedColours.Green,
      //       title: "__Player Killed__",
      //       description: `Weapon not found (${currentWeapon}) | Error Code: ${ErrorCodes.WeaponNotFound}\n\n**If you see this, contact <@276069255559118859>!**`,
      //       footer: {text: `${sharedConfig.serverName} - ${new Date().toUTCString()}`, icon_url: sharedConfig.serverLogo}
      //     }]
      //   }));
      // }
    }
  }
}
