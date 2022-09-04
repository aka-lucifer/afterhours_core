export enum JobEvents {
  // All (Server)

  // All (Client)
  toggleDuty = "afterhours:client:jobs:toggleDuty",
  setCallsign = "afterhours:client:jobs:setCallsign",

  // All (Client | Job Blips)
  refreshBlipData = "afterhours:client:jobs:refreshBlipData",
  deleteOffDutyUnit = "afterhours:client:jobs:deleteOffDutyUnit",
  deleteJobBlips = "afterhours:client:jobs:deleteJobBlips",

  // LEO (Client)
  setupMRAP = "afterhours:client:jobs:police:setupMRAP",

  // LEO (Client | Calls)
  deleteCall = "afterhours:client:jobs:police:deleteCall",
  
  start911Call = "afterhours:client:jobs:police:start911Call",
  receive911Call = "afterhours:client:jobs:police:receive911Call",

  start311Call = "afterhours:client:jobs:police:start311Call",
  receive311Call = "afterhours:client:jobs:police:receive311Call",
  teleportMenu = "afterhours:client:jobs:police:teleportMenu",

  // LEO (Server | Calls)
  send911Call = "afterhours:server:jobs:police:send911Call",
  send311Call = "afterhours:server:jobs:police:send311Call",
  removeMask = "afterhours:server:jobs:police:removeMask",

  // LEO (Client | Cuffing)
  startCuffing = "afterhours:client:jobs:police:startCuffing",
  startUncuffing = "afterhours:client:jobs:police:startUncuffing",
  playPerpBackAnim = "afterhours:client:jobs:police:playPerpBackAnim",
  playPerpFrontAnim = "afterhours:client:jobs:police:playPerpFrontAnim",
  setCuffed = "afterhours:client:jobs:police:setCuffed",
  setUncuffed = "afterhours:client:jobs:police:setUncuffed",

  // LEO (Client | Remove Mask)
  takeOffMask = "afterhours:client:jobs:police:takeOffMask",

  // LEO (Server | Cuffing)
  cuffPlayer = "afterhours:server:jobs:police:cuffPlayer",
  uncuffPlayer = "afterhours:server:jobs:police:uncuffPlayer",
  doPerpBackAnim = "afterhours:server:jobs:police:doPerpBackAnim",
  doPerpFrontAnim = "afterhours:server:jobs:police:doPerpFrontAnim",
  setFinished = "afterhours:server:jobs:police:setFinished",

  // LEO (Client | Grabbing)
  setGrabbed = "afterhours:client:police:setGrabbed",
  startGrabbing = "afterhours:client:police:startGrabbing",
  stopGrabbing = "afterhours:client:police:stopGrabbing",

  // LEO (Server | Grabbing)
  tryGrabbing = "afterhours:server:police:tryGrabbing",
  grabPlayer = "afterhours:server:police:grabPlayer",

  // LEO (Client | Unit Menu)
  dutyStateChange = "afterhours:client:police:dutyStateChange",

  // LEO (Server | Unit Menu)
  fireUnit = "afterhours:server:police:fireUnit"
}
