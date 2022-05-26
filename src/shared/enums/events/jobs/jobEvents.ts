export enum JobEvents {
  // All (Server)

  // All (Client)
  toggleDuty = "astrid:client:jobs:toggleDuty",
  setCallsign = "astrid:client:jobs:setCallsign",

  // All (Client | Job Blips)
  refreshBlipData = "astrid:client:jobs:refreshBlipData",
  unitOffDuty = "astrid:client:jobs:unitOffDuty",
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

  // LEO (Client | Cuffing)
  startCuffing = "astrid:client:jobs:police:startCuffing",
  startUncuffing = "astrid:client:jobs:police:startUncuffing",
  playPerpBackAnim = "astrid:client:jobs:police:playPerpBackAnim",
  playPerpFrontAnim = "astrid:client:jobs:police:playPerpFrontAnim",
  setCuffed = "astrid:client:jobs:police:setCuffed",
  setUncuffed = "astrid:client:jobs:police:setUncuffed",

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
  grabPlayer = "astrid:server:police:grabPlayer",

  // LEO (Server | Unit Menu)
  fireUnit = "astrid:server:police:fireUnit"
}
