
# Astrid Network (FiveM) v1.0.0 Change Log

### Server Additions ###

* Player manager controlling ranks, playtime, metadata, etc.

* Character manager controlling all of your characters data (name, dob, phone, metadata, backstory, job)

* Client & Server callbacks for instant data retreval on the opposite, instead of using events, slowing down server performance and response time.

* Connected player manager that controls automatic promoting to Honourable and high ping kicking and already connected logic.

* Adaptive card on connecting with correct ban information formatting.

* Job manager that handles going on duty, job blips (police, community police), automatic timesheet logging, updating callsign.

* Vehicle manager than handles vehicle spawning permissions.

* Weapon manager than handles weapon equiping permissions.

* Ban manager that logs, saves and automatically processes bans, to automatically remove bans on the correct time.

* Commend, kick & warning manager that logs and saves them.

* Weather & time manager with real time syncing.

* AOP manager that uses player count to determine the correct AOP for the server, unless a staff member disables and controls this manually.

* Character vehicles manager which handles obtaining, creating, editing and deleting character vehicles.

* Chat manager for running commands with permissions, chat types (Global instead of OOC, local & staff chat).


### Client Additions

* /me messages are drawn in the chat and above the players head for a set time.

* Commends & warnings UI to view and search all of them via (/warnings | /commends).

* Scoreboard that contains player server ID's, name and playtime, also shows players server ID above nearby peds.

* Spawner UI that displays the server change-log, searchable keybinds (can be changed in your keybind settings), searchable commands and finally the rules.

* Safezone manager to protects inside players from all forms of damage, from other players.

* World manager that has a minimap controller (allowing you to zoom in & out of the minimap) and a variety of disablers & features such as (pickups, vehicle rewards, flashlight always on, disable idle cam, disable AI EMS & police, health re-charge disabled and interior ped cleaning, ambient sirens disabled, world traffic controlling).

* Job manager with controllers (police & community police), going on duty, changing callsign, toggling the correct controllers based if you're on or off duty (recruitment menu, garage, unit blips, cuffing, grabbing).

* Discord rich presence with cycling stages, buttons, image assets on hover information.
Staff manager and a variety of controllers such as the (staff menu, no clipping, gravity gun and ghost players after a player disconnects).

* Vehicle manager with a massive amount of controllers (Speedzones for none staff & on duty LEO | Weapon prop inside vehicle | Anti rolling when upside down / Anti air control in a car | Leave LEO vehicle door open [Hold F] | Cruise control [F4] | Repair shops | GPS system that allows you to go to any street or postal [/gps street_name or /gps postal_code] | Keep wheel position when parked or exiting /turning off vehicle | Vehicle rolling via interactive eye | Seatbelt toggling, ejecting and damage if toggled, based on your speed | Seating inside a vehicle (can be done via the F3 hex menu) | Seat shuffling with /shuffle when in the passenger seat | Drive-by controlling [allows you to fire in any seat if driving less than 30 mph, if you're exceeding 30mph and you're the driver, you won't be able to fire your weapon]).

* Weapon manager with a massive amount of controllers (Disarming (you get disarmed if you're shot in the hand, you will drop your weapon on the ground) | Reloading [R] | Firing modes & weapon safety | Spam preventor (restricts all semi automatic weapons to require you to re-press the firing key, preventing you from holding it down, to continuously fire the weapon) | Recoil | Disablers (Disables you from combat rolling, spam punching & doing the silly combat stance after firing a weapon) | Jamming [G] | Taser cartridges & laser [K] | Weapons on back).

* Menu manager with menu & submenu classes.

* Progress class with real time UI, callbacks based on behaviour (start, cancelling, finishing).

* Notification class with a variety of custom options and types.

* Poly & Box zone helpers rewritten in TypeScript for the core.

* Player names that display your server ID, character name, job department and rank, there are also a variety of icons based on what you're doing (typing, talking, driver, passenger, in a car, in a bike, health), different coloured name based on your rank in the server, staff members can see players steam names and their rank.

* Death system with custom animations for attachment support, reviving and respawn menu after certain amount of time, respawn counter and input key UI.

* World blip controllers for a variety of world locations (shops, police & fire/ems stations, interiors & activities for civilians).

* Bug reporting controller that can be done via the /bug command, which will open a bug report UI form, for you to fill out.

* Hex interactive menu that can be toggled via [F3], of course like every other keybind, this can be changed in your (Settings -> Keybinds -> FiveM).

* Player & Vehicle HUD controller that can be toggled with [Right CTRL].

* Variety of civilian controllers (Carrying (places a player over your shoulder), Gagging (sock in players mouth, disables them talking), kidnapping (places a bag prop over a players head and turns their screen black), surrending (placing hands up/down, kneeling on the ground).

* Radio that allows you to use either your mouse, or your arrow keys to control the radio, you also have the ability to set 3 custom radio on & off clicks.

* DP Emotes.

* Radar for emergency vehicles that allows you to set fastest speed, track vehicle plates, etc.

* Loading screen with spawning in log and progress bar, also contains your steam avatar, your rank, steam name and server rank.

* LVC lighting system for emergency vehicles (that has unique sirens for each department, and for some of the sub divisions of that dept).

* Nozzle refueling system.

* A variety of server assets (Addon Vehicles, EUP, Weapons, Sirens, Pause & Minimap, Engine Sounds, Coloured HUD, nitrous (orange -> purple), replacement weapons and all of the DLC clothing (Diamond Casino, Cayo Perico, The Contract), you should also be able to fly to the Cayo Perico island.