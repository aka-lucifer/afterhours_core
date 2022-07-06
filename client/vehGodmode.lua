-- VEHICLE GODMODE
local vehGodmode = false

RegisterNetEvent("astrid:client:controllers:staff:menu:vehGodmode")
AddEventHandler("astrid:client:controllers:staff:menu:vehGodmode", function(newState)
  local playerData = exports.astrid_core.getPlayer()
  local myRank = tonumber(playerData.rank)
  if (myRank >= 9) then -- If admin or above
    vehGodmode = newState
  end
end)

CreateThread(function()
  local waitDelay = 500
  while true do
    Wait(waitDelay)

    local myPed = PlayerPedId()
    if IsPedInAnyVehicle(myPed, false) then
      waitDelay = 0
      local currVeh = GetVehiclePedIsIn(myPed, false)

      if vehGodmode then
        -- Indestrucible
        SetEntityInvincible(currVeh, true)

        -- No Mechanical Damage
        SetVehicleEngineCanDegrade(currVeh, false)
        SetVehicleCanBreak(currVeh, false)
        SetVehicleWheelsCanBreak(currVeh, false)
        SetDisableVehiclePetrolTankDamage(currVeh, true)

        -- No Cosmetic Damage
        SetVehicleCanBeVisiblyDamaged(currVeh, false)
        SetVehicleStrong(currVeh, true)

        if IsVehicleDamaged(currVeh) then
          SetVehicleFixed(currVeh)
          SetVehicleDirtLevel(currVeh, 0)
        end

        for i = 0, 6 do
          SetVehicleDoorCanBreak(currVeh, i, false)
        end
      else
        -- Indestrucible
        SetEntityInvincible(currVeh, false)

        -- No Mechanical Damage
        SetVehicleEngineCanDegrade(currVeh, true)
        SetVehicleCanBreak(currVeh, true)
        SetVehicleWheelsCanBreak(currVeh, true)
        SetDisableVehiclePetrolTankDamage(currVeh, false)

        -- No Cosmetic Damage
        SetVehicleCanBeVisiblyDamaged(currVeh, true)
        SetVehicleStrong(currVeh, false)

        for i = 0, 6 do
          SetVehicleDoorCanBreak(currVeh, i, true)
        end
      end
    else
      waitDelay = 500
    end
  end
end)