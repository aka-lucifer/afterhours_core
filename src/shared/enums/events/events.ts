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
  logDeath = "astrid:server:logDeath",
  
  // Astrid Server (Gravity Gun)
  gravityPlayer = "astrid:server:gravityPlayer",
  ungravityPlayer = "astrid:server:ungravityPlayer",
  shootEntity = "astrid:shootEntity:shootEntity",

  // (Scoreboard Server)
  requestPlayers = "astrid:server:requestPlayers",

  // (Chat Server)
  sendMessage = "astrid:server:sendMessage",
  createCommand = "astrid:createCommand:createCommand",

  // (Warnings Server)
  requestWarnings = "astrid:server:requestWarnings",

  // (Commends Server)
  requestCommends = "astrid:server:requestCommends",

  // Astrid Client Events
  serverStarted = "astrid:client:serverStarted",
  playerLoaded = "astrid:client:playerLoaded",
  receiveServerCB = "astrid:client:recieveServerCB",
  developmentMode = "astrid:client:developmentMode",
  clearWorldVehs = "astrid:client:clearWorldVehs",
  notify = "astrid:client:notify",
  syncTime = "astrid:client:syncTime",
  freezeTime = "astrid:client:freezeTime",
  syncWeather = "astrid:client:syncWeather",

  // Astrid Client (Characters)
  setupCharacters = "astrid:client:setupCharacters",
  displayCharacters = "astrid:client:displayCharacters",
  
  // Astrid Client (Gravity Gun)
  adminGun = "astrid:client:adminGun",
  setHeldEntity = "astrid:client:setHeldEntity",
  unsetHeldEntity = "astrid:unsetHeldEntity:unsetHeldEntity",
  holdPlayer = "astrid:client:holdPlayer",
  releasePlayer = "astrid:client:releasePlayer",
  getGravitied = "astrid:getGravitied:getGravitied",

  // (Scoreboard Client)
  receivePlayers = "astrid:client:receivePlayers",

  // (Chat Client)
  sendClientMessage = "astrid:client:sendClientMessage",
  sendSystemMessage = "astrid:client:sendSystemMessage",
  addSuggestion = "astrid:client:addSuggestion",
  removeSuggestion = "astrid:client:removeSuggestion",
  clearChat = "astrid:client:clearChat",
  freezeChat = "astrid:client:freezeChat",

  // (Warnings Client)
  receiveWarnings = "astrid:client:receiveWarnings",

  // (Commends Client)
  receiveCommends = "astrid:client:receiveCommends"
}
