export enum Callbacks {
  // Astrid Client -> Server Callbacks
  takeScreenshot = "astrid:client:screenshot",

  // Astrid Server -> Client Callbacks

  // Characters
  createCharacter = "astrid:server:createCharacter",
  editCharacter = "astrid:server:editCharacter",
  selectCharacter = "astrid:server:selectCharacter",
  deleteCharacter = "astrid:server:deleteCharacter",
  
  // Chat
  sendMessage = "astrid:server:sendMessage"
}
