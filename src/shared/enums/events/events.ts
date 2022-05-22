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
  playerJoined = "playerJoining",
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
  playerConnected = "astrid:server:playerConnected",
  getPlayer = "astrid:server:getPlayer",
  receiveClientCB = "astrid:server:receiveClientCB",
  logDeath = "astrid:server:logDeath",
  
  // Astrid Server (Gravity Gun)
  gravityPlayer = "astrid:server:gravityPlayer",
  ungravityPlayer = "astrid:server:ungravityPlayer",
  shootEntity = "astrid:shootEntity:shootEntity",

  // Astrid Server ([AOP] - Syncers)
  setAOP = "astrid:server:setAOP",
  setCycling = "astrid:server:setCycling",

  // Astrid Server ([Controllers | Vehicle] - GPS)
  syncGPS = "astrid:server:syncGPS",

  // Astrid Server ([Controllers | Vehicle] - Seatbelt)
  ejectPassengers = "astrid:server:ejectPassengers",
  harmPassengers = "astrid:server:harmPassengers",
  
  // Astrid Server ([Controllers] | Staff] - Menu | [Connected Players])
  banPlayer = "astrid:server:banPlayer",
  kickPlayer = "astrid:server:kickPlayer",
  warnPlayer = "astrid:server:warnPlayer",
  commendPlayer = "astrid:server:commendPlayer",
  freezePlayer = "astrid:server:freezePlayer",
  tpToPlayer = "astrid:server:tpToPlayer",
  tpToVehicle = "astrid:server:tpToVehicle",
  spectatePlayer = "astrid:server:spectatePlayer",

  // Astrid Server ([Controllers] | Staff] - Menu | [Server Management])
  changeWeather = "astrid:server:changeWeather",
  changeTime = "astrid:server:changeTime",
  bringAll = "astrid:server:bringAll",
  freezeAll = "astrid:server:freezeAll",

  // Astrid Server ([Controllers] | Staff] - Menu | [Player Management])

  // Astrid Server (Weapons)
  checkWeapon = "astrid:server:checkWeapon",

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
  setCharacter = "astrid:setCharacter:setCharacter",
  receiveServerCB = "astrid:client:recieveServerCB",
  changeDevMode = "astrid:client:changeDevMode",
  syncPlayers = "astrid:client:syncPlayers",

  // Astrid Client (Utils)
  soundFrontEnd = "astrid:client:soundFrontEnd",

  // Astrid Client ([Staff] - AFK)
  setAFK = "astrid:client:setAFK",

  // Astrid Client ([Staff] - Commands)
  teleportToMarker = "astrid:client:teleportToMarker",
  teleportBack = "astrid:client:teleportToMarker",
  clearWorldVehs = "astrid:client:clearWorldVehs",
  showRank = "astrid:client:showRank",
  
  // Astrid Client ([Staff] - Gravity Gun)
  adminGun = "astrid:client:adminGun",
  setHeldEntity = "astrid:client:setHeldEntity",
  unsetHeldEntity = "astrid:unsetHeldEntity:unsetHeldEntity",
  holdPlayer = "astrid:client:holdPlayer",
  releasePlayer = "astrid:client:releasePlayer",
  getGravitied = "astrid:client:getGravitied",
  
  // Astrid Client ([Controllers] | Staff] - Menu)
  receiveWarning = "astrid:client:receiveWarning",
  goToPlayer = "astrid:client:goToPlayer",
  startSpectating = "astrid:client:startSpectating",

  // Astrid Client (Syncers)
  syncTime = "astrid:client:syncTime",
  freezeTime = "astrid:client:freezeTime",
  syncWeather = "astrid:client:syncWeather",

  // Astrid Client ([AOP] - Syncers)
  syncAOP = "astrid:client:syncAOP",
  syncAOPCycling = "astrid:client:syncAOPCycling",
  updateCycling = "astrid:client:updateCycling",
  aopMenu = "astrid:client:aopMenu",

  // Astrid Client ([Vehicle] - GPS)
  setGPS = "astrid:client:setGPS",
  listStreets = "astrid:client:listStreets",
  clearGPS = "astrid:client:clearGPS",
  updateGPS = "astrid:client:updateGPS",

  // Astrid Client ([Vehicle] - Flip Vehicle)
  flipVehicle = "astrid:client:flipVehicle",

  // Astrid Client ([Vehicle] - Seatbelt)
  ejectFromVeh = "astrid:client:ejectFromVeh",
  harmPassenger = "astrid:client:harmPassenger",

  // Astrid Client (Notifications)
  notify = "astrid:client:notify",

  // Astrid Client (Spawner)
  setupSpawner = "astrid:client:setupSpawner",

  // Astrid Client (Characters)
  receiveCharacters = "astrid:client:receiveCharacters",
  // setupCharacters = "astrid:client:setupCharacters",
  displayCharacters = "astrid:client:displayCharacters",
  syncMeMessages = "astrid:client:syncMeMessages",

  // Astrid Client (Vehicles)
  setupVehicles = "astrid:client:setupVehicles",
  displayVehicles = "astrid:client:displayVehicles",

  // Astrid Client (Scoreboard)
  receivePlayers = "astrid:client:receivePlayers",

  // Astrid Client (Chat)
  sendClientMessage = "astrid:client:sendClientMessage",
  sendSystemMessage = "astrid:client:sendSystemMessage",
  setTypes = "astrid:setTypes:setTypes",
  addSuggestion = "astrid:client:addSuggestion",
  removeSuggestion = "astrid:client:removeSuggestion",
  updateSuggestions = "astrid:client:updateSuggestions",
  clearChat = "astrid:client:clearChat",
  freezeChat = "astrid:client:freezeChat",

  // Astrid Client (Warnings)
  receiveWarnings = "astrid:client:receiveWarnings",

  // Astrid Client (Commends)
  receiveCommends = "astrid:client:receiveCommends"
}

export enum PoliceEvents {
  // Server
  grabPlayer = "astrid:server:police:grabPlayer",

  // Client
  setGrabbed = "astrid:client:police:setGrabbed",
  startGrabbing = "astrid:client:police:startGrabbing"
}
