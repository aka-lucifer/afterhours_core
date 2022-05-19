export enum JobEvents {
  // All (Server)

  // All (Client)
  toggleDuty = "astrid:client:jobs:toggleDuty",
  setCallsign = "astrid:client:jobs:setCallsign",

  // All (Client | Job Blips)
  refreshBlipData = "astrid:client:jobs:refreshBlipData",

  // LEO (Client)
  setupMRAP = "astrid:client:jobs:police:setupMRAP"
}