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
  start911Call = "astrid:client:jobs:police:start911Call",
  receive911Call = "astrid:client:jobs:police:receive911Call",

  start311Call = "astrid:client:jobs:police:start311Call",

  // LEO (Server | Calls)
  send911Call = "astrid:server:jobs:police:send911Call",
  send311Call = "astrid:server:jobs:police:send311Call"
}