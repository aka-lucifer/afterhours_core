export enum Callbacks {
  // AfterHours Client -> Server Callbacks
  takeScreenshot = "afterhours:client:screenshot",

  // AfterHours Client -> Server Callbacks ([Controllers] | Staff] - Menu)
  getVehicleFreeSeat = "afterhours:client:controllers:staff:menu:getVehicleFreeSeat",
  spectatePlayer = "afterhours:client:controllers:staff:menu:spectatePlayer",
  getSummoned = "afterhours:client:controllers:staff:menu:getSummoned",
  getKilled = "afterhours:client:controllers:staff:menu:getKilled",
  getSummonReturned = "afterhours:client:controllers:staff:menu:getSummonReturned",

  // AfterHours Client -> Server Callbacks ([Controllers] | Police] - Cuffing)
  getCuffed = "afterhours:client:controllers:police:cuffing:getCuffed",
  startUncuffing = "afterhours:client:controllers:police:cuffing:startUncuffing",

  // AfterHours Client -> Server Callbacks ([Managers] | Vehicle)
  getVehicleLabel = "afterhours:client:managers:vehicle:getVehicleLabel",

  // AfterHours Server -> Client Callbacks

  // Characters
  createCharacter = "afterhours:server:createCharacter",
  editCharacter = "afterhours:server:editCharacter",
  selectCharacter = "afterhours:server:selectCharacter",
  deleteCharacter = "afterhours:server:deleteCharacter",

  // Vehicles
  createVehicle = "afterhours:server:createVehicle",
  editVehicle = "afterhours:server:editVehicle",
  deleteVehicle = "afterhours:server:deleteVehicle",
  
  // Chat
  sendMessage = "afterhours:server:sendMessage",

  // AOP
  setAOP = "afterhours:server:managers:aop:setAOP",

  // Bug Reporting
  submitBug = "afterhours:server:controllers:ui:submitBug",
  
  // AfterHours Server -> Client Callbacks ([Controllers] | UI] - Scoreboard)
  getScoreboardData = "afterhours:server:controllers:ui:scoreboard:getScoreboardData",
  
  // AfterHours Server -> Client Callbacks ([Controllers] | Staff] - Menu),
  getBans = "afterhours:server:controllers:staff:menu:getBans",
  togglePlayerBlips = "afterhours:server:controllers:staff:menu:togglePlayerBlips",
  updatePlayerJob = "afterhours:server:controllers:staff:menu:updatePlayerJob"
}
