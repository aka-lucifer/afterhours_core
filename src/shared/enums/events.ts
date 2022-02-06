export enum Events {
  // CitizenFX Events
  gameEventTriggered = "gameEventTriggered",
  entityCreated = "entityCreated",
  entityCreating = "entityCreating",
  entityRemoved = "entityRemoved",
  resourceListRefreshed = "onResourceListRefresh",
  resourceStart = "onResourceStart",
  resourceStarting = "onResourceStarting",
  resourceStop = "onResourceStop",
  serverResourceStart = "onServerResourceStart",
  serverResourceStop = "onServerResourceStop",
  playerConnecting = "playerConnecting",
  playerEnteredScope = "playerEnteredScope",
  playerLeftScope = "playerLeftScope",
  playerConnected = "playerJoining",
  playerDisconnected = "playerDropped",
  populationPedCreating = "populationPedCreating",
  playerSpawned = "playerSpawned",
  chatSuggestion = "chat:addSuggestion",

  // Base Events
  playerDied = "baseevents:onPlayerDied",
  playerKilled = "baseevents:onPlayerKilled",
  playerWasted = "baseevents:onPlayerWasted",
  enteringVehicle = "baseevents:enteringVehicle",
  enteringAborted = "baseevents:enteringAborted",
  enteredVehicle = "baseevents:enteredVehicle",
  leftVehicle = "baseevents:leftVehicle",

  // Astrid Server Events
  getPlayer = "astrid:server:getPlayer",
  receiveClientCB = "astrid:server:receiveClientCB",

  // (Chat)
  sendMessage = "astrid:server:sendMessage",

  // Astrid Client Events
  serverStarted = "astrid:client:serverStarted",
  playerLoaded = "astrid:client:playerLoaded",
  receiveServerCB = "astrid:client:recieveServerCB",

  // (Chat)
  sendClientMessage = "astrid:client:sendClientMessage",
  sendSystemMessage = "astrid:client:sendSystemMessage",
  addSuggestion = "astrid:client:addSuggestion",
  removeSuggestion = "astrid:client:removeSuggestion"
}
