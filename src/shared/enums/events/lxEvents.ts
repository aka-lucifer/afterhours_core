export enum LXEvents {
  // Client
  PedInjured_Cl = "LX_Events:client:pedInjured",
  VehDamaged_Cl = "LX_Events:client:VehDamaged",
  ObjDamaged_Cl = "LX_Events:client:ObjDamaged",
  VehCollision_Cl = "LX_Events:client:vehCollision",
  Gunshot_Cl = "LX_Events:client:gunshot",
  EnteredVeh_Cl = "LX_Events:client:enteredVeh",
  EnteringVeh_Cl = "LX_Events:client:enteringVehicle",
  EnteringVehAborted_Cl = "LX_Events:client:enteringVehAborted",
  LeftVeh_Cl = "LX_Events:client:leftVehicle",
  PlayerDied_Cl = "LX_Events:client:playerDied",
  PlayerKilled_Cl = "LX_Events:client:playerKilled",

  // Server
  PedInjured_Sv = "LX_Events:server:pedInjured",
  Gunshot_Sv = "LX_Events:server:gunshot",
  VehCollision_Sv = "LX_Events:server:vehCollision",
  EnteredVeh_Sv = "LX_Events:server:enteredVeh",
  EnteringVeh_Sv = "LX_Events:server:enteringVehicle",
  EnteringVehAborted_Sv = "LX_Events:server:enteringVehAborted",
  LeftVeh_Sv = "LX_Events:server:leftVehicle",
  PlayerDied_Sv = "LX_Events:server:playerDied",
  PlayerKill_Sv = "LX_Events:server:playerKilled"
}