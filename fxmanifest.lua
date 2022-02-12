------------------------------------------------------------------------------------
-- Astrid Core
-- Designed & Written By akaLucifer#0103
-- Releasing or Claiming this as your own is against, this resources License
------------------------------------------------------------------------------------
fx_version "bodacious"
game "gta5"

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
	"ui/index.html",
	"ui/*.js",
	"ui/style.css"
}

client_script "dist/client/main.js"
server_script "dist/server/main.js"
