export enum JobEvents {
  // All (Server)

  // All (Client)
  toggleDuty = "astrid:client:jobs:toggleDuty",
  setCallsign = "astrid:client:jobs:setCallsign",

  // All (Client | Job Blips)
  refreshBlipData = "astrid:client:jobs:refreshBlipData",
  deleteOffDutyUnit = "astrid:client:jobs:deleteOffDutyUnit",
  deleteJobBlips = "astrid:client:jobs:deleteJobBlips",

  // LEO (Client)
  setupMRAP = "astrid:client:jobs:police:setupMRAP",

  // LEO (Client | Calls)
  deleteCall = "astrid:client:jobs:police:deleteCall",
  
  start911Call = "astrid:client:jobs:police:start911Call",
  receive911Call = "astrid:client:jobs:police:receive911Call",

  start311Call = "astrid:client:jobs:police:start311Call",
  receive311Call = "astrid:client:jobs:police:receive311Call",

  // LEO (Server | Calls)
  send911Call = "astrid:server:jobs:police:send911Call",
  send311Call = "astrid:server:jobs:police:send311Call",
  removeMask = "astrid:server:jobs:police:removeMask",

  // LEO (Client | Cuffing)
  startCuffing = "astrid:client:jobs:police:startCuffing",
  startUncuffing = "astrid:client:jobs:police:startUncuffing",
  playPerpBackAnim = "astrid:client:jobs:police:playPerpBackAnim",
  playPerpFrontAnim = "astrid:client:jobs:police:playPerpFrontAnim",
  setCuffed = "astrid:client:jobs:police:setCuffed",
  setUncuffed = "astrid:client:jobs:police:setUncuffed",

  // LEO (Client | Remove Mask)
  takeOffMask = "astrid:client:jobs:police:takeOffMask",

  // LEO (Server | Cuffing)
  cuffPlayer = "astrid:server:jobs:police:cuffPlayer",
  uncuffPlayer = "astrid:server:jobs:police:uncuffPlayer",
  doPerpBackAnim = "astrid:server:jobs:police:doPerpBackAnim",
  doPerpFrontAnim = "astrid:server:jobs:police:doPerpFrontAnim",
  setFinished = "astrid:server:jobs:police:setFinished",

  // LEO (Client | Grabbing)
  setGrabbed = "astrid:client:police:setGrabbed",
  startGrabbing = "astrid:client:police:startGrabbing",
  stopGrabbing = "astrid:client:police:stopGrabbing",

  // LEO (Server | Grabbing)
  tryGrabbing = "astrid:server:police:tryGrabbing",
  grabPlayer = "astrid:server:police:grabPlayer",

  // LEO (Client | Unit Menu)
  dutyStateChange = "astrid:client:police:dutyStateChange",

  // LEO (Server | Unit Menu)
  fireUnit = "astrid:server:police:fireUnit"
}
