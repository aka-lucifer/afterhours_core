export enum Events {
  // CitizenFX Events
  gameEventTriggered = "gameEventTriggered",
  mapStarted = "onClientMapStart",
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

  // Astrid Server ([Controllers] | Staff) - Menu
  logAdminAction = "astrid:server:controllers:staff:menu:logAdminAction",
  
  // Astrid Server ([Controllers] | Staff] - Menu | [Connected Players])
  banPlayer = "astrid:server:controllers:staff:menu:banPlayer",
  kickPlayer = "astrid:server:controllers:staff:menu:kickPlayer",
  warnPlayer = "astrid:server:controllers:staff:menu:warnPlayer",
  commendPlayer = "astrid:server:controllers:staff:menu:commendPlayer",
  updatePlayerRank = "astrid:server:controllers:staff:menu:controllers:updatePlayerRank",
  freezePlayer = "astrid:server:controllers:staff:menu:freezePlayer",
  tpToPlayer = "astrid:server:controllers:staff:menu:tpToPlayer",
  tpToVehicle = "astrid:server:controllers:staff:menu:tpToVehicle",
  summonPlayer = "astrid:server:controllers:staff:menu:summonPlayer",
  returnSummonedPlayer = "astrid:server:controllers:staff:menu:returnSummonedPlayer",
  spectatePlayer = "astrid:server:controllers:staff:menu:spectatePlayer",

  // Astrid Server ([Controllers] | Staff] - Menu | [Server Management])
  changeWeather = "astrid:server:changeWeather",
  changeTime = "astrid:server:changeTime",
  bringAll = "astrid:server:bringAll",
  freezeAll = "astrid:server:freezeAll",

  // Astrid Server ([Controllers] | Vehicle] - Seating)
  seatPlayer = "astrid:server:controllers:vehicle:seatPlayer",
  unseatPlayer = "astrid:server:controllers:vehicle:unseatPlayer",

  // Astrid Server ([Controllers] | Civilian] - Kidnapping)
  tryKidnapping = "astrid:server:controllers:civilian:tryKidnapping",

  // Astrid Server ([Controllers] | Civilian] - Carrying)
  tryCarrying = "astrid:server:controllers:civilian:tryCarrying",

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
  playerReady = "astrid:client:playerReady",
  setCharacter = "astrid:client:setCharacter",
  updateCharacter = "astrid:client:updateCharacter",
  receiveServerCB = "astrid:client:recieveServerCB",
  changeDevMode = "astrid:client:changeDevMode",
  syncPlayers = "astrid:client:syncPlayers",

  // Astrid Client (Utils)
  soundFrontEnd = "astrid:client:soundFrontEnd",

  // Astrid Client ([Staff] - AFK)
  setAFK = "astrid:client:setAFK",

  // Astrid Client ([Staff] - Commands)
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
  teleportToMarker = "astrid:client:teleportToMarker",
  teleportBack = "astrid:client:teleportBack",
  updatePlayerBlips = "astrid:client:controllers:staff:menu:updatePlayerBlips",
  deleteLeftPlayer = "astrid:client:controllers:staff:menu:deleteLeftPlayer",
  receiveWarning = "astrid:client:receiveWarning",
  goToPlayer = "astrid:client:goToPlayer",
  startSpectating = "astrid:client:startSpectating",
  
  // Astrid Client ([Controllers] | Staff] - Ghost Players)
  createGhostPlayer = "astrid:client:controllers:staff:ghostPlayers:createGhostPlayer",
  deleteGhostPlayer = "astrid:client:controllers:staff:ghostPlayers:deleteGhostPlayer",

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

  // Astrid Client ([Controllers] | Vehicle - Seating)
  trySeating = "astrid:client:controllers:vehicle:seating:trySeating",
  seatCuffAnim = "astrid:client:controllers:vehicle:seating:seatCuffAnim",

  // Astrid Client ([Controllers] | Vehicle - Shuffling)
  shuffleSeats = "astrid:client:controllers:vehicle:shuffling:shuffleSeats",

  // Astrid Client ([Controllers | UI] - Bug Reporting)
  startReporting = "astrid:client:controllers:ui:startBugReporting",

  // Astrid Client ([Controllers | UI] - Hud)
  updateUnits = "astrid:client:controllers:hud:updateUnits",
  updatePriority = "astrid:client:controllers:hud:updatePriority",

  // Astrid Client ([Controllers] | Civilian] - Kidnapping)
  kidnapPlayer = "astrid:client:controllers:civilian:kidnapPlayer",

  // Astrid Client ([Controllers] | Civilian] - Carrying)
  carryPlayer = "astrid:client:controllers:civilian:carryPlayer",
  startCarrying = "astrid:client:controllers:civilian:startCarrying",
  stopCarrying = "astrid:client:controllers:civilian:stopCarrying",

  // Astrid Client ([Controllers] | Civilian] - Surrending)
  toggleHands = "astrid:client:controllers:civilian:toggleHands",
  startKneeling = "astrid:client:controllers:civilianstartKneeling",

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
  receiveCommends = "astrid:client:receiveCommends",

  // Astrid Client ([Hex Menu] - Civilian)
  dropWeapon = "astrid:client:hexMenu:dropWeapon",

  // Astrid Client (Death)
  playerDead = "astrid:client:death:playerDead",
  revive = "astrid:client:death:revive",

  // Astrid Server (Death)
  revivePlayer = "astrid:server:death:revivePlayer"
}
