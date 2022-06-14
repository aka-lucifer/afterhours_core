export enum Callbacks {
  // Astrid Client -> Server Callbacks
  takeScreenshot = "astrid:client:screenshot",

  // Astrid Client -> Server Callbacks ([Controllers] | Staff] - Menu)
  spectatePlayer = "astrid:client:controllers:staff:menu:spectatePlayer",
  getSummoned = "astrid:client:controllers:staff:menu:getSummoned",
  getSummonReturned = "astrid:client:controllers:staff:menu:getSummonReturned",

  // Astrid Server -> Client Callbacks

  // Characters
  createCharacter = "astrid:server:createCharacter",
  editCharacter = "astrid:server:editCharacter",
  selectCharacter = "astrid:server:selectCharacter",
  deleteCharacter = "astrid:server:deleteCharacter",

  // Vehicles
  createVehicle = "astrid:server:createVehicle",
  editVehicle = "astrid:server:editVehicle",
  deleteVehicle = "astrid:server:deleteVehicle",
  
  // Chat
  sendMessage = "astrid:server:sendMessage",

  // Bug Reporting
  submitBug = "astrid:server:controllers:ui:submitBug",
}
