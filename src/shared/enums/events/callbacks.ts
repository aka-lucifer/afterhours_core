export enum Callbacks {
  // Astrid Client -> Server Callbacks
  takeScreenshot = "astrid:client:screenshot",

  // Astrid Client -> Server Callbacks ([Controllers] | Staff] - Menu)
  getVehicleFreeSeat = "astrid:client:controllers:staff:menu:getVehicleFreeSeat",
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

  // AOP
  setAOP = "astrid:server:managers:aop:setAOP",

  // Bug Reporting
  submitBug = "astrid:server:controllers:ui:submitBug",
  
  // Astrid Server -> Client Callbacks ([Controllers] | Staff] - Menu)
  togglePlayerBlips = "astrid:server:controllers:staff:menu:togglePlayerBlips",
  updatePlayerJob = "astrid:server:controllers:staff:menu:updatePlayerJob"
}
