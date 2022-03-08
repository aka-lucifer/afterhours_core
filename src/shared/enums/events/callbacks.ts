export enum Callbacks {
  // Astrid Client -> Server Callbacks
  takeScreenshot = "astrid:client:screenshot",

  // Astrid Server -> Client Callbacks
  selectCharacter = "astrid:server:selectCharacter",
  sendMessage = "astrid:server:sendMessage"
}
