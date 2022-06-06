export enum Callbacks {
  // Astrid Client -> Server Callbacks
  takeScreenshot = "astrid:client:screenshot",

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
  submitBug = "astrid:server:controllers:ui:submitBug"
}
