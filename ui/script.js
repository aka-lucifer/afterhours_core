const Chat = new Vue({
  el: "#Astrid_Chat",
  vuetify: new Vuetify(),
  data: {
    // Important Data
    resource: "astrid_core",

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
    Setup(data) {
      if (data.types) {
        this.chatTypes = data.types;
      }
    },

    AddSuggestion(data) {
      console.log("Push suggestion data", JSON.stringify(data));
      this.suggestions.push(data);
    },
    
    Toggle(data) {
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

    Close() {
      if (this.showInput) this.showInput = false;
      clearTimeout(this.focusTimer);
      
      if (this.closeTimeout === undefined) {
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
      }
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
            this.Close();
          }
        });
      }
    },

    NewMsg(data) {
      this.chatMessages.push(data);
      
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
    },

    Post(event, data, cb) {
      if (data === undefined) {	
        data = {};
      }

      $.post(`http://${this.resource}/${event}`, JSON.stringify(data), cb);
    }
  },

  computed: {
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
    // Events
    RegisterEvent("SETUP_CHAT", this.Setup);
    RegisterEvent("ADD_SUGGESTION", this.AddSuggestion);
    RegisterEvent("TOGGLE_CHAT", this.Toggle);
    RegisterEvent("SEND_MESSAGE", this.NewMsg)

    // Key Presses
    window.addEventListener("keydown", function(event) {
      switch(event.key) {
        case "Escape": // Close UI
          Chat.Close();
          break;

        case "Alt": // Change Mode
          Chat.CycleMode();
          break;

        case "Enter": // Send Message
          Chat.SendMessage();
          break;

        case "ArrowUp":
          if (Chat.$refs.input === document.activeElement && Chat.sentMessages.length > 0) { // If chat input is focused and you've sent message/s
            if ((Chat.cycledMessage - 1) >= 0) {
              Chat.cycledMessage--;
              Chat.chatMessage = Chat.sentMessages[Chat.cycledMessage];
            }
          }
          break;
        
        case "ArrowDown":
          if (Chat.$refs.input === document.activeElement && Chat.sentMessages.length > 0) { // If chat input is focused and you've sent message/s
            if (Chat.cycledMessage < Chat.sentMessages.length) {
              Chat.cycledMessage++;
              Chat.chatMessage = Chat.sentMessages[Chat.cycledMessage];
            }
          }
          break;
      }
    });
  }
});
