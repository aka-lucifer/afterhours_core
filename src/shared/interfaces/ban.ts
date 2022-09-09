import { BanStates } from "../enums/bans";

export interface PlayerBan {
  id: number,
  playerId: number,
  playerName: string,
  reason: string,
  banState: BanStates,
  issuedBy: number,
  issuedName: string,
  issuedOn: string,
  issuedUntil: string
}
