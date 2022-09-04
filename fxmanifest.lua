------------------------------------------------------------------------------------
-- Astrid Core
-- Designed & Written By akaLucifer#0103
-- Releasing or Claiming this as your own is against, this resources License
------------------------------------------------------------------------------------
fx_version "cerulean"
game "gta5"

author "akaLucifer#0103"
description "Core systems that manages and controls everything in the server"
version "1.0.0"

lua54 "yes"

ui_page "ui/index.html"

files {
	"configs/*.json",
  "ui/libraries/css/*.css",
  "ui/libraries/js/*.js",
	"ui/assets/fonts/*.eot",
	"ui/assets/fonts/*.svg",
	"ui/assets/fonts/*.ttf",
	"ui/assets/fonts/scoreboard/*.ttf",
	"ui/assets/fonts/*.otf",
	"ui/assets/img/*.png",
	"ui/assets/img/*.jpg",
	"ui/index.html",
	"ui/*.js",
	"ui/style.css"
}

client_scripts {
	"client/vehGodmode.lua",
	"dist/client/main.js"
}

server_scripts {
	"server/security.lua",
	"dist/server/main.js"
}
dependency '/assetpacks'
dependency '/assetpacks'
dependency '/assetpacks'