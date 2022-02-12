const HUD = new Vue({
  el: "#HUD",
  vuetify: new Vuetify(),
  data: {
    // Important 
    resource: "astrid_core",

    // [SCOREBOARD]
    displaying: false,

    // Server Data
    currentPlayers: 0,
    maxPlayers: 32,

    // Page Data
    selectedPage: 1,
    maxPerPage: 10,
    animating: false,

    // Players
    connectedPlayers: [],

    // [CHAT]
    chatToggled: true,

    // Chat Types
    chatTypes: ["local", "global"],
    currentType: 0,

    // Chat Messages
    chatMessages: [],
    closeTimeout: null,

    // Chat Input
    chatMessage: "",
    showInput: false,
    focusTimer: 0,

    // Message Cycler
    sentMessages: [],
    cycledMessage: 0,

    // Suggestions
    suggestions: []
  },
  methods: {
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

    CycleMode() {
      if (this.currentType >= this.chatTypes.length - 1) {
        this.currentType = 0;
      } else {
        this.currentType++;
      }
    },

    SendMessage() {
      if (this.chatMessage.length > 0 && this.chatMessage[0] !== " ") { // If chat message has content and isn't a space
        this.Post("SEND_MESSAGE", {message: this.chatMessage, type: this.currentType}, (callbackData) => {
          if (callbackData) {
            this.sentMessages.push(this.chatMessage);
            this.cycledMessage = this.sentMessages.length;
            this.chatMessage = "";
            this.CloseChat();
          }
        });
      }
    },

    NewMsg(data) {
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
  },

  mounted() {
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

    // Key Presses
    window.addEventListener("keydown", function(event) {
      switch(event.key) {
        case "Escape": // Close UI
          HUD.CloseChat();
          break;

        case "Alt": // Change Mode
          HUD.CycleMode();
          break;

        case "Enter": // Send Message
          HUD.SendMessage();
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
      }
    });
  }
});
