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

  // AfterHours Server Events
  playerConnected = "afterhours:server:playerConnected",
  getPlayer = "afterhours:server:getPlayer",
  receiveClientCB = "afterhours:server:receiveClientCB",
  logDeath = "afterhours:server:logDeath",
  
  // AfterHours Server (Gravity Gun)
  gravityPlayer = "afterhours:server:gravityPlayer",
  ungravityPlayer = "afterhours:server:ungravityPlayer",
  shootEntity = "afterhours:shootEntity:shootEntity",

  // AfterHours Server ([AOP] - Syncers)
  setAOP = "afterhours:server:setAOP",
  setCycling = "afterhours:server:setCycling",

  // AfterHours Server ([Controllers | Vehicle] - GPS)
  syncGPS = "afterhours:server:syncGPS",

  // AfterHours Server ([Controllers | Vehicle] - Seatbelt)
  ejectPassengers = "afterhours:server:ejectPassengers",
  harmPassengers = "afterhours:server:harmPassengers",

  // AfterHours Server ([Controllers] | Staff) - Menu
  logAdminAction = "afterhours:server:controllers:staff:menu:logAdminAction",
  
  // AfterHours Server ([Controllers] | Staff] - Menu | [Connected Players])
  banPlayer = "afterhours:server:controllers:staff:menu:banPlayer",
  kickPlayer = "afterhours:server:controllers:staff:menu:kickPlayer",
  warnPlayer = "afterhours:server:controllers:staff:menu:warnPlayer",
  commendPlayer = "afterhours:server:controllers:staff:menu:commendPlayer",
  updatePlayerRank = "afterhours:server:controllers:staff:menu:controllers:updatePlayerRank",
  killPlayer = "afterhours:server:controllers:staff:menu:controllers:killPlayer",
  freezePlayer = "afterhours:server:controllers:staff:menu:freezePlayer",
  tpToPlayer = "afterhours:server:controllers:staff:menu:tpToPlayer",
  tpToVehicle = "afterhours:server:controllers:staff:menu:tpToVehicle",
  summonPlayer = "afterhours:server:controllers:staff:menu:summonPlayer",
  returnSummonedPlayer = "afterhours:server:controllers:staff:menu:returnSummonedPlayer",
  spectatePlayer = "afterhours:server:controllers:staff:menu:spectatePlayer",
  unbanPlayer = "afterhours:server:controllers:staff:menu:unbanPlayer",

  // AfterHours Server ([Controllers] | Staff] - Menu | [Server Management])
  changeWeather = "afterhours:server:changeWeather",
  changeTime = "afterhours:server:changeTime",
  bringAll = "afterhours:server:bringAll",
  freezeAll = "afterhours:server:freezeAll",

  // AfterHours Server ([Controllers] | Vehicle] - Seating)
  seatPlayer = "afterhours:server:controllers:vehicle:seatPlayer",
  unseatPlayer = "afterhours:server:controllers:vehicle:unseatPlayer",

  // AfterHours Server ([Controllers] | Civilian] - Kidnapping)
  tryKidnapping = "afterhours:server:controllers:civilian:tryKidnapping",

  // AfterHours Server ([Controllers] | Civilian] - Carrying)
  tryCarrying = "afterhours:server:controllers:civilian:tryCarrying",

  // AfterHours Server ([Controllers] | Civilian] - Gagging)
  tryGagging = "afterhours:server:controllers:civilian:tryGagging",

  // AfterHours Server ([Controllers] | Civilian] - Model Blacklist)
  changedPed = "afterhours:server:controllers:civilian:changedPed",

  // AfterHours Server (Weapons)
  checkWeapon = "afterhours:server:checkWeapon",

  // (Scoreboard Server)
  requestPlayers = "afterhours:server:requestPlayers",

  // (Chat Server)
  sendMessage = "afterhours:server:sendMessage",
  createCommand = "afterhours:createCommand:createCommand",

  // (Warnings Server)
  requestWarnings = "afterhours:server:requestWarnings",

  // (Commends Server)
  requestCommends = "afterhours:server:requestCommends",

  // AfterHours Client Events
  exportsReady = "afterhours:client:exportsReady",
  serverStarted = "afterhours:client:serverStarted",
  playerLoaded = "afterhours:client:playerLoaded",
  playerReady = "afterhours:client:playerReady",
  setCharacter = "afterhours:client:setCharacter",
  updateCharacter = "afterhours:client:updateCharacter",
  characterSpawned = "afterhours:client:characterSpawned",
  receiveServerCB = "afterhours:client:recieveServerCB",
  changeDevMode = "afterhours:client:changeDevMode",
  syncPlayers = "afterhours:client:syncPlayers",
  teleporting = "afterhours:client:teleporting",
  chatBugFix = "afterhours:client:chatBugFix",
  playEmote = "DPEmotes:client:emote:emoteCommand",

  // AfterHours Client (Utils)
  soundFrontEnd = "afterhours:client:utils:soundFrontEnd",
  showLoading = "afterhours:client:utils:showLoading",
  stopLoading = "afterhours:client:utils:stopLoading",

  // AfterHours Client ([Staff])
  rankUpdated = "afterhours:client:staffManager:rankUpdated",

  // AfterHours Client ([Staff] - AFK)
  setAFK = "afterhours:client:setAFK",

  // AfterHours Client ([Staff] - Commands)
  clearWorldVehs = "afterhours:client:clearWorldVehs",
  showRank = "afterhours:client:showRank",
  showAnnouncement = "afterhours:client:managers:staff:showAnnouncement",
  
  // AfterHours Client ([Staff] - Gravity Gun)
  adminGun = "afterhours:client:adminGun",
  setHeldEntity = "afterhours:client:setHeldEntity",
  unsetHeldEntity = "afterhours:unsetHeldEntity:unsetHeldEntity",
  holdPlayer = "afterhours:client:holdPlayer",
  releasePlayer = "afterhours:client:releasePlayer",
  getGravitied = "afterhours:client:getGravitied",
  
  // AfterHours Client ([Controllers] | Staff] - Menu)
  teleportToMarker = "afterhours:client:teleportToMarker",
  teleportBack = "afterhours:client:teleportBack",
  updatePlayerBlips = "afterhours:client:controllers:staff:menu:updatePlayerBlips",
  deleteLeftPlayer = "afterhours:client:controllers:staff:menu:deleteLeftPlayer",
  receiveWarning = "afterhours:client:receiveWarning",
  goToPlayer = "afterhours:client:goToPlayer",
  startSpectating = "afterhours:client:startSpectating",
  vehGodmode = "afterhours:client:controllers:staff:menu:vehGodmode",
  setStaffDuty = "afterhours:client:controllers:staff:menu:setStaffDuty",
  
  // AfterHours Client ([Controllers] | Staff] - Ghost Players)
  createGhostPlayer = "afterhours:client:controllers:staff:ghostPlayers:createGhostPlayer",
  deleteGhostPlayer = "afterhours:client:controllers:staff:ghostPlayers:deleteGhostPlayer",

  // AfterHours Client ([Controllers] | Civilian] - Model Blacklist)
  setPed = "afterhours:client:controllers:civilian:setPed",

  // AfterHours Client (Syncers)
  syncTime = "afterhours:client:syncTime",
  freezeTime = "afterhours:client:freezeTime",
  syncWeather = "afterhours:client:syncWeather",

  // AfterHours Client ([AOP] - Syncers)
  syncAOP = "afterhours:client:syncAOP",
  syncAOPCycling = "afterhours:client:syncAOPCycling",
  updateCycling = "afterhours:client:updateCycling",
  aopMenu = "afterhours:client:aopMenu",

  // AfterHours Client ([Vehicle] - GPS)
  setGPS = "afterhours:client:setGPS",
  listStreets = "afterhours:client:listStreets",
  clearGPS = "afterhours:client:clearGPS",
  updateGPS = "afterhours:client:updateGPS",

  // AfterHours Client ([Vehicle] - Flip Vehicle)
  flipVehicle = "afterhours:client:flipVehicle",

  // AfterHours Client ([Vehicle] - Seatbelt)
  ejectFromVeh = "afterhours:client:ejectFromVeh",
  harmPassenger = "afterhours:client:harmPassenger",

  // AfterHours Client ([Controllers] | Vehicle - Seating)
  trySeating = "afterhours:client:controllers:vehicle:seating:trySeating",
  seatCuffAnim = "afterhours:client:controllers:vehicle:seating:seatCuffAnim",

  // AfterHours Client ([Controllers] | Vehicle - Shuffling)
  shuffleSeats = "afterhours:client:controllers:vehicle:shuffling:shuffleSeats",

  // AfterHours Client ([Controllers | UI] - Bug Reporting)
  startReporting = "afterhours:client:controllers:ui:startBugReporting",

  // AfterHours Client ([Controllers | UI] - Hud)
  updateUnits = "afterhours:client:controllers:hud:updateUnits",
  updatePriority = "afterhours:client:controllers:hud:updatePriority",

  // AfterHours Client ([Controllers] | Civilian] - Kidnapping)
  kidnapPlayer = "afterhours:client:controllers:civilian:kidnapPlayer",

  // AfterHours Client ([Controllers] | Civilian] - Carrying)
  carryPlayer = "afterhours:client:controllers:civilian:carryPlayer",
  startCarrying = "afterhours:client:controllers:civilian:startCarrying",
  stopCarrying = "afterhours:client:controllers:civilian:stopCarrying",

  // AfterHours Client ([Controllers] | Civilian] - Surrending)
  toggleHands = "afterhours:client:controllers:civilian:toggleHands",
  startKneeling = "afterhours:client:controllers:civilianstartKneeling",

  // AfterHours Server ([Controllers] | Civilian] - Gagging)
  gagPlayer = "afterhours:server:controllers:civilian:gagPlayer",

  // AfterHours Client (Notifications)
  notify = "afterhours:client:notify",

  // AfterHours Client (Spawner)
  setupSpawner = "afterhours:client:setupSpawner",

  // AfterHours Client (Characters)
  receiveCharacters = "afterhours:client:receiveCharacters",
  // setupCharacters = "afterhours:client:setupCharacters",
  displayCharacters = "afterhours:client:displayCharacters",
  addMeMessage = "afterhours:client:characters:meMessages:add",
  removeMeMessage = "afterhours:client:characters:meMessages:remove",

  // AfterHours Client (Vehicles)
  setupVehicles = "afterhours:client:setupVehicles",
  displayVehicles = "afterhours:client:displayVehicles",

  // AfterHours Client (Scoreboard)
  receivePlayers = "afterhours:client:receivePlayers",

  // AfterHours Client (Chat)
  sendClientMessage = "afterhours:client:sendClientMessage",
  sendSystemMessage = "afterhours:client:sendSystemMessage",
  setTypes = "afterhours:setTypes:setTypes",
  addSuggestion = "afterhours:client:addSuggestion",
  updateSuggestions = "afterhours:client:updateSuggestions",
  removeSuggestions = "afterhours:client:removeSuggestions",
  clearChat = "afterhours:client:clearChat",
  freezeChat = "afterhours:client:freezeChat",

  // AfterHours Client (Warnings)
  receiveWarnings = "afterhours:client:receiveWarnings",

  // AfterHours Client (Commends)
  receiveCommends = "afterhours:client:receiveCommends",

  // AfterHours Client ([Hex Menu] - Civilian)
  dropWeapon = "afterhours:client:hexMenu:dropWeapon",

  // AfterHours Client (Death)
  playerDead = "afterhours:client:death:playerDead",
  revive = "afterhours:client:death:revive",

  // AfterHours Server (Death)
  playersDeath = "afterhours:server:death:playersDeath",
  revivePlayer = "afterhours:server:death:revivePlayer",
  syncRevive = "afterhours:server:death:syncRevive"
}
