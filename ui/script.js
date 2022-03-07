const HUD = new Vue({
  el: "#HUD",
  vuetify: new Vuetify(),
  data: {
    // Important 
    resource: "astrid_core",

    // [SPAWN INFO]
    // IMPORTANT
    spawnActive: false,
    keybindSearch: "",
    commandSearch: "",

    currentAOP: null,
    players: {
      current: null,
      max: null,
      percent: null,
      bestPlayer: null
    },
    bestPlayer: null,

    serverKeybinds: [],
    serverCommands: [],
    serverRules: [],
    pages: [
      {icon: "home", label: "home"},
      {icon: "keyboard", label: "keybinds"},
      {icon: "forum", label: "commands"},
      {icon: "book", label: "rules"}
    ],
    currentPage: 0,

    // [SCOREBOARD]
    displaying: false,

    // [SCOREBOARD] - Server Data
    currentPlayers: 0,
    maxPlayers: 32,

    // [SCOREBOARD] - Page Data
    selectedPage: 1,
    maxPerPage: 10,
    animating: false,

    // [SCOREBOARD] - Players
    connectedPlayers: [],

    // [CHAT]
    chatToggled: true, // Chat Visibility (INSERT)

    // [CHAT] - Chat Types
    chatTypes: ["local", "global", "admin"],
    currentType: 0,

    // [CHAT] - Chat Messages
    chatMessages: [],
    closeTimeout: null,

    // [CHAT] - Input
    chatMessage: "",
    showInput: true,
    focusTimer: 0,

    // [CHAT] - Prev Message Cycler
    sentMessages: [],
    cycledMessage: 0,

    // [CHAT] - Suggestions
    suggestions: [],

    // [CHAT] - Autofill
    usedAutofill: false,

    // [WARNINGS]
    displayWarnings: false,
    warningSearch: "",

    // [WARNINGS] - Server Data
    issuedWarnings: [],

    // [COMMENDS]
    displayCommends: false,
    commendSearch: "",

    // [COMMENDS] - Server Data
    issuedCommends: []
  },
  methods: {
    // Spawn UI
    SetupSpawn(data) {
      this.currentAOP = data.aop || "Sandy Shores";
      this.players.current = data.players.current || 40;
      this.players.max = data.players.max || 64
      this.players.percent = (this.players.current / this.players.max) * 100;
      this.players.bestPlayer = data.players.bestPlayer || "akaLucifer - 0d 0h 0m";
      this.serverKeybinds = data.keybinds || [];
      this.serverCommands = data.commands || [];
      this.serverRules = data.rules || [];
      this.spawnActive = true;
    },

    CloseSpawner() {
      this.spawnActive = false;
      this.Post("CLOSE_SPAWNER");
    },

    // Notification
    Notification(data) {
      new Notify(data);
    },

    // SCOREBOARD
    DisplayScoreboard(data) {
      this.connectedPlayers = data.players || [];
      this.currentPlayers = Object.keys(this.connectedPlayers).length;
      this.maxPlayers = data.maxPlayers || 32;
      this.displaying = true;
    },

    CloseScoreboard() {
      this.displaying = false;
      this.connectedPlayers = [];
      this.pageCount = 1;
      this.maxPlayers = 0;
    },

    ChangePage(data) {
      if (this.animating || this.pageCount === 1) { return; }
        const element = document.getElementById("scoreboard_animation");
        element.className = "fadeIn";
        this.animating = true;
        setTimeout(() => {
          this.selectedPage = this.selectedPage + data.value;
          if (this.selectedPage > this.pageCount) {
            this.selectedPage = 1;
          } else if (this.selectedPage < 1) {
            this.selectedPage = this.pageCount;
          }
          element.className = "fadeOut";
          this.animating = false;
      }, 500);
    },

    // CHAT
    SetupChat(data) {
      if (data.types) {
        this.chatTypes = data.types;
      }
    },

    AddSuggestion(data) {
      console.log("Push suggestion data", JSON.stringify(data));
      this.suggestions.push(data);
    },
    
    OpenChat(data) {
      setTimeout(() => {
        if (data.toggle) {
          // Clear close timeout if exists
          if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
            this.closeTimeout = null;
          }

          setTimeout(() => {
            // Slide into view and slide to bottom
            if (!$('#Chat-Messages').is(":visible")) {
              $("#Chat-Messages").css("display", "block");
              $('#Chat-Messages').animate({"margin-right": '+=' + "35%"}, 500);
            }
            $("#Chat-Messages").get(0).scrollTop = $("#Chat-Messages").get(0).scrollHeight;
          }, 0);
          
          // Enable Elements (Messages & Input)
          this.showInput = true;
          
          // Focus chat input
          this.focusTimer = window.setInterval(() => {
            if (this.$refs.input) {
              this.$refs.input.focus();
            } else {
              clearInterval(this.focusTimer);
            }
          }, 100);
        }
      }, 0);
    },

    CloseChat() {
      if (this.showInput) this.showInput = false;
      clearTimeout(this.focusTimer);

      // console.log("CLOSE TIMEOUT");

      if (this.closeTimeout === undefined) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = undefined;
      }

      this.closeTimeout = setTimeout(() => {
        if (!this.showInput) { // Double check if chat isn't toggled
          $('#Chat-Messages').animate({"margin-right": '-=' + "35%"}, 500);

          clearTimeout(this.closeTimeout);
          this.closeTimeout = null;

          setTimeout(() => {
            $("#Chat-Messages").css("display", "none");
          }, 500);
        }
      }, 4700);
      this.Post("CLOSE_CHAT");
    },

    CycleMode(direction) {
      if (direction == "right") {
        if ((this.currentType + 1) > (this.chatTypes.length - 1)) {
          this.currentType = 0;
        } else {
          this.currentType++;
        }
      } else if (direction == "left") {
        if ((this.currentType - 1) < 0) {
          this.currentType = this.chatTypes.length - 1;
        } else {
          this.currentType--;
        }
      }
    },

    ColorizeMsg(str) {
      let s = `<span class="message">` + (str.replace(/\^([0-9])/g, (str, color) => `</span><span class="color-${color}">`)) + "</span>";

      const styleDict = {
        '*': 'font-weight: bold;',
        '_': 'text-decoration: underline;',
        '~': 'text-decoration: line-through;',
        '=': 'text-decoration: underline line-through;',
        'r': 'text-decoration: none;font-weight: normal;',
      };

      const styleRegex = /\^(\_|\*|\=|\~|\/|r)(.*?)(?=$|\^r|<\/em>)/;
      while (s.match(styleRegex)) { //Any better solution would be appreciated :P
        s = s.replace(styleRegex, (str, style, inner) => `<em style="${styleDict[style]}">${inner}</em>`)
      }
      return s.replace(/<span[^>]*><\/span[^>]*>/g, '');
    },

    SendMessage() {
      if (this.chatMessage.length > 0 && this.chatMessage[0] !== " ") { // If chat message has content and isn't a space
        this.CloseChat();
        this.Post("SEND_MESSAGE", {message: this.chatMessage, type: this.currentType}, (callbackData) => {
          this.chatMessage = "";
          // this.sentMessages.push(this.chatMessage);
          // this.cycledMessage = this.sentMessages.length;
          console.log("cb", callbackData)
          if (callbackData) {
            this.sentMessages.push(this.chatMessage);
            this.cycledMessage = this.sentMessages.length;
          }
        });
      }
    },

    NewMsg(data) {
      if (data.type === "system") data.contents = this.ColorizeMsg(data.contents);
      this.chatMessages.push(data);

      if (this.chatToggled) {
        if (!$('#Chat-Messages').is(":visible")) {
          $("#Chat-Messages").css("display", "block");
          $('#Chat-Messages').animate({"margin-right": '+=' + "35%"}, 500);
        }

        setTimeout(() => {
          $("#Chat-Messages").get(0).scrollTop = $("#Chat-Messages").get(0).scrollHeight; // Scroll to bottom of messages
        }, 10);

        if (this.closeTimeout == undefined) {
          this.closeTimeout = setTimeout(() => {
            if (!this.showInput) { // Double check if chat isn't toggled
              $('#Chat-Messages').animate({"margin-right": '-=' + "35%"}, 500);

              clearTimeout(this.closeTimeout);
              this.closeTimeout = null;

              setTimeout(() => {
                $("#Chat-Messages").css("display", "none");
              }, 500);
            }
          }, 2500);
        }
      } else {
        console.log("ADDED CHAT MESSAGE BUT NOT DISPLAYING AS CHAT IS DISABLED!");
      }
    },

    Toggle(data) {
      this.chatToggled = data.state;
    },

    Post(event, data, cb) {
      if (data === undefined) {	
        data = {};
      }

      $.post(`http://${this.resource}/${event}`, JSON.stringify(data), cb);
    },

    Clear() {
      this.chatMessages = []
    },

    DisplayWarnings(data) {
      this.issuedWarnings = data.warnings;
      this.issuedWarnings.sort(function compare(a, b) {
        const dateA = new Date(a.issuedOn);
        const dateB = new Date(b.issuedOn);
        return dateA - dateB;
      });

      this.displayWarnings = true;
    },

    CloseWarnings() {
      this.Post("CLOSE_WARNINGS", JSON.stringify({}), (callback) => {
        if (callback === "UNFOCUSED") {
          this.displayWarnings = false;
        }
      });
    },

    DisplayCommends(data) {
      this.issuedCommends = data.commends;
      this.issuedCommends.sort(function compare(a, b) {
        const dateA = new Date(a.issuedOn);
        const dateB = new Date(b.issuedOn);
        return dateA - dateB;
      });

      this.displayCommends = true;
    },

    CloseCommends() {
      this.Post("CLOSE_COMMENDS", JSON.stringify({}), (callback) => {
        if (callback === "UNFOCUSED") {
          this.displayCommends = false;
        }
      });
    },

    SetCompass(data) {
      $(".mapdirections").css("transform", `rotate(${data.rotation}deg)`);
    }
  },

  computed: {
    pageCount: function() {
      return Math.ceil(Object.keys(this.connectedPlayers).length / 10);
    },

    currentSuggestions() {
      if (this.chatMessage === "" || this.chatMessage == null) {
        return [];
      }

      const currentSuggestions = this.suggestions.filter((s) => {
        if (!s.name.startsWith(this.chatMessage)) {
          const suggestionSplitted = s.name.split(" ");
          const messageSplitted = this.chatMessage.split(" ");
          for (let i = 0; i < messageSplitted.length; i += 1) {
            if (i >= suggestionSplitted.length) {
              return i < suggestionSplitted.length + s.params.length;
            }
            if (suggestionSplitted[i] !== messageSplitted[i]) {
              return false;
            }
          }
        }
        return true;
      }).slice(0, 5);

      currentSuggestions.forEach((s) => {
        // eslint-disable-next-line no-param-reassign
        s.disabled = !s.name.startsWith(this.chatMessage);

        s.params.forEach((p, index) => {
          const wType = (index === s.params.length - 1) ? "." : "\\S";
          const regex = new RegExp(`${s.name} (?:\\w+ ){${index}}(?:${wType}*)$`, "g");

          // eslint-disable-next-line no-param-reassign
          // @ts-ignore
          p.disabled = this.chatMessage.match(regex) == null;
        });
      });
      return currentSuggestions;
    },

    searchKeybinds() {
      if (this.keybindSearch !== "" || this.keybindSearch != null) {
        return this.serverKeybinds.filter(keybind => {
          if (keybind.description.toLowerCase().search(this.keybindSearch.toLowerCase()) !== -1)
          return keybind;
        })
      }
    },

    searchCommands() {
      if (this.commandSearch !== "" || this.commandSearch != null) {
        return this.serverCommands.filter(command => {
          if (command.name.toLowerCase().search(this.commandSearch.toLowerCase()) !== -1 || command.description.toLowerCase().search(this.commandSearch.toLowerCase()) !== -1)
          return command;
        })
      }
    },

    searchWarnings() {
      if (this.warningSearch !== "" || this.warningSearch != null) {
        return this.issuedWarnings.filter(warning => {
          if (warning.reason.toLowerCase().search(this.warningSearch.toLowerCase()) !== -1 || warning.issuedBy.toLowerCase().search(this.warningSearch.toLowerCase()) !== -1 || warning.issuedOn.toLowerCase().search(this.warningSearch.toLowerCase()) !== -1)
          return warning;
        })
      }
    },

    searchCommends() {
      if (this.commendSearch !== "" || this.commendSearch != null) {
        return this.issuedCommends.filter(commend => {
          if (commend.reason.toLowerCase().search(this.commendSearch.toLowerCase()) !== -1 || commend.issuedBy.toLowerCase().search(this.commendSearch.toLowerCase()) !== -1 || commend.issuedOn.toLowerCase().search(this.commendSearch.toLowerCase()) !== -1)
          return commend;
        })
      }
    }
  },

  mounted() {
    // Spawner UI
    RegisterEvent("OPEN_SPAWNER", this.SetupSpawn);

    // Notification
    RegisterEvent("CREATE_NOTIFICATION", this.Notification);

    // SCOREBOARD EVENTS
    RegisterEvent("OPEN_SCOREBOARD", this.DisplayScoreboard);
    RegisterEvent("CLOSE_SCOREBOARD", this.CloseScoreboard);
    RegisterEvent("CHANGE_PAGE", this.ChangePage);

    // CHAT EVENTS
    RegisterEvent("SETUP_CHAT", this.SetupChat);
    RegisterEvent("ADD_SUGGESTION", this.AddSuggestion);
    RegisterEvent("OPEN_CHAT", this.OpenChat);
    RegisterEvent("SEND_MESSAGE", this.NewMsg);
    RegisterEvent("TOGGLE_CHAT", this.Toggle);
    RegisterEvent("CLEAR_CHAT", this.Clear);

    // Warning Events
    RegisterEvent("OPEN_WARNINGS", this.DisplayWarnings);

    // Commend Events
    RegisterEvent("OPEN_COMMENDS", this.DisplayCommends);

    // HUD Events
    RegisterEvent("SET_COMPASS", this.SetCompass);

    setTimeout(() => {
      $(".mapdirections").css("transform", "rotate(0deg)");
    }, 1000);

    // Mouse Scrolling
    window.addEventListener("wheel", function(event) {
      if (event.deltaY < 0) { // Increase Chat Mode
        if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
          HUD.CycleMode("right");
        }
      } else if (event.deltaY > 0) { // Decrease Chat Mode
        if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
          HUD.CycleMode("left");
        }
      }
    });

    // Key Presses
    window.addEventListener("keydown", function(event) {
      console.log("Key Down", event.key, event.keyCode)
      switch(event.key) {
        case "Escape": // Close UI
          if ($("#Chat-Input").is(":visible")) {
            HUD.CloseChat();
          } else if ($("#warnings_container").is(":visible") && HUD.$refs.input === document.activeElement) {
            HUD.CloseWarnings();
          } else if ($("#commends_container").is(":visible") && HUD.$refs.input === document.activeElement) {
            HUD.CloseCommends();
          }
          break;

        case "Enter": // Send Message
          if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
            HUD.SendMessage();
          }
          break;

        case "ArrowUp":
          if (HUD.$refs.input === document.activeElement && HUD.sentMessages.length > 0) { // If chat input is focused and you've sent message/s
            if ((HUD.cycledMessage - 1) >= 0) {
              HUD.cycledMessage--;
              HUD.chatMessage = HUD.sentMessages[HUD.cycledMessage];
            }
          }
          break;
        
        case "ArrowDown":
          if (HUD.$refs.input === document.activeElement && HUD.sentMessages.length > 0) { // If chat input is focused and you've sent message/s
            if (HUD.cycledMessage < HUD.sentMessages.length) {
              HUD.cycledMessage++;
              HUD.chatMessage = HUD.sentMessages[HUD.cycledMessage];
            }
          }
          break;

        case "Tab":
          if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
            for (let i = 0; i < HUD.suggestions.length; i++) {
              if (HUD.suggestions[i].name.startsWith(HUD.chatMessage)) {
                const suggestionSplitted = HUD.suggestions[i].name.split(" ");
                const messageSplitted = HUD.chatMessage.split(" ");

                if (!HUD.usedAutofill) {
                  HUD.usedAutofill = true;
                  HUD.chatMessage = HUD.suggestions[i].name;
                  HUD.usedAutofill = false;
                  break;
                }
              }
            }
          }
          break;
      }
    });
  }
});
