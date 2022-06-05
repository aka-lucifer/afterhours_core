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

    serverChangelog: [],
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

    // [CHARACTERS]
    showCharacters: false,
    characters: [],
    hoveringCharacter: false,
    hoveredCharacter: {},
    selectedCharacter: undefined,
    
    // Char Creation
    newCharacter: {
      firstName: "",
      lastName: "",
      nationality: "",
      backstory: "",
      dob: (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString().substr(0, 10),
      age: 0,
      isFemale: false,
      licenses: ["Driver", "Weapon"],
      licenseValues: [],
      mugshot: null
    },
    creatingCharacter: false,
    charCreatorMenu: null,
    incorrectDOB: false,
    incorrectDOBTimer: null,

    // Char Editing
    editingCharacter: false,
    charEditorMenu: null,

    // Char Rules
    nameRules: [
      (v) => !!v || "Name required",
      (v) => (!!v && v.split(' ').length <= 1) || 'No spaces allowed',
      (v) => !!v && v.length <= 50 || "Name must be 50 characters or less",
      (v) => !!v && RegExp("^[a-z A-Z]+$").test(v) || "Invalid Characters",
      (v) => !!v && v.length >= 3 || "Name must be 3 - 50 characters"
    ],
      
    nationalityRules: [
      (v) => !!v || "Nationality required",
      (v) => !!v && v.length <= 50 || "Nationality must be 50 characters or less",
      (v) => !!v && RegExp("^[a-z A-Z]+$").test(v) || "Invalid Characters",
      (v) => !!v && v.length >= 3 || "Nationality must be 3 - 50 characters"
    ],
      
    backstoryRules: [
      (v) => !!v || "Backstory required",
      (v) => !!v && v.length > 10 || "Backstory must be greater than 10 characters"
    ],

    dobRules: [
      (v) => !!v || "You must choose have a DOB"
    ],
  
    ageRules: [
      (v) => !!v && v >= 18 || "You must be 18+ to create a character",
      (v) => !!v && v <= 80 || "You must be less than 80 to create a character"
    ],

    // Char Deletion
    showCharacterDelete: false,
    deletedCharacter: false,
    deleteTimeout: undefined,

    // Vehicles
    showVehicles: false,
    registeredVehicles: [],

    // [Vehicles] Creating
    creatingVehicle: false,
    vehCreatorMenu: null,

    insideVeh: false,
    insideNotify: false,
    insideTimeout: undefined,
    createVehData: {
      label: "",
      model: "",
      colour: "",
      type: "",
      plate: ""
    },

    // [Vehicles] Editing
    editingVehicle: false,
    vehEditorMenu: null,

    editVehIndex: -1,
    editedVehData: {
      id: 0,
      label: "",
      model: "",
      colour: "",
      type: "",
      plate: ""
    },

    // [Vehicles] Deletion
    showVehicleDelete: false,

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
    chatTypes: [],
    currentType: 0,

    // [CHAT] - Chat Messages
    chatMessages: [],
    closeTimeout: null,

    // [CHAT] - Input
    chatMessage: "",
    showInput: false,
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
    issuedCommends: [],

    // [ASTRID MENU]
    menuVisible: false,
    menuPosition: "middle-right",
    menuName: "Default",
    menuComponents: [],
    menuOption: 0,

    // Progress Bar
    progressElement: null,
    runningProgress: false,
    progressBar: false,
    staticProgressBar: false
  },
  methods: {
    // Spawn UI
    SetupSpawn(data) {
      this.currentAOP = data.aop || "Sandy Shores";
      this.players.current = data.players.current || 40;
      this.players.max = data.players.max || 64
      this.players.percent = (this.players.current / this.players.max) * 100;
      this.players.bestPlayer = data.players.bestPlayer || "akaLucifer - 0d 0h 0m";
      this.serverChangelog = data.changelog || [];
      this.serverKeybinds = data.keybinds || [];
      this.serverCommands = data.commands || [];
      this.serverRules = data.rules || [];
      this.spawnActive = true;
    },

    CloseSpawner() {
      this.spawnActive = false;
      this.Post("CLOSE_SPAWNER");
    },

    // CHARACTERS
    displayCharcaters(data) {
      this.resetCharacters();
      if (data.characters != undefined) {
        if (data.characters.length > 0) {
          for (let i = 0; i < data.characters.length; i++) {
            data.characters[i].jobName = data.characters[i].job.name; // Define this first as job var is overridden below
            data.characters[i].jobLabel = data.characters[i].job.label;
            data.characters[i].jobRank = data.characters[i].job.rankLabel; // Define this first as job var is overridden below
          }
        }
      }
      
      this.characters = data.characters;
      this.showCharacters = true;
    },

    showCharacter(charIndex) {
      this.hoveredCharacter = this.characters[charIndex];
      if (!this.hoveringCharacter) this.hoveringCharacter = true;

      // console.log("hovered char is", JSON.stringify(this.hoveredCharacter));
    },

    startCreatingChar() {
      // Set date to current date when you start creating a character
      const date = new Date();
      this.newCharacter.dob = `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;

      // Show the create character form
      this.creatingCharacter = true;
    },

    resetCharCreation() {
      this.$refs.charCreatorForm.reset();
      const date = new Date();
      this.newCharacter.dob = `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;
    },

    createCharacter() {
      const isFormComplete = this.$refs.charCreatorForm.validate();
      if (isFormComplete) {
        const dobDate = new Date(this.newCharacter.dob);
        console.log("dob valid", this.newCharacter.dob, dobDate);
        const dobValid = isDateValid(dobDate);

        if (dobValid) {
          this.Post("CREATE_CHARACTER", {
            firstName: this.newCharacter.firstName,
            lastName: this.newCharacter.lastName,
            nationality: this.newCharacter.nationality,
            backstory: this.newCharacter.backstory,
            dob: this.newCharacter.dob,
            gender: this.newCharacter.isFemale,
            licenses: this.newCharacter.licenseValues,
            mugshot: this.newCharacter.mugshot
          }, (charData) => {
            if (Object.keys(charData).length > 0) {
              charData.jobName = charData.job.name;
              charData.jobLabel = charData.job.label;

              // If chars empty (quick fix)
              if (this.characters === undefined) {
                this.characters = [];
              }

              this.characters.push(charData);
              this.creatingCharacter = false;
              this.resetCharCreation();
            }
          });
        } else {
          this.incorrectDOB = true;
          
          if (this.incorrectDOBTimer !== undefined) {
            this.incorrectDOBTimer = setTimeout(() => {
              this.incorrectDOBTimer = undefined;
              clearTimeout(this.incorrectDOBTimer);
              this.incorrectDOB = false;
            }, 2000);
          } else {
            this.insideTincorrectDOBTimerimeout = undefined;
            clearTimeout(this.incorrectDOBTimer);
            
            this.incorrectDOBTimer = setTimeout(() => {
              this.incorrectDOB = false;
            }, 2000);
          }
        }
      }
    },

    startEditingChar() {
      this.editingCharacter = true;

      const licenses = [];
      if (this.characters[this.selectedCharacter].metadata.licenses.driver) licenses.push("Driver");
      if (this.characters[this.selectedCharacter].metadata.licenses.weapon) licenses.push("Weapon");

      this.characters[this.selectedCharacter].licenseValues = licenses;
    },

    editCharacter() {
      const isFormComplete = this.$refs.charEditorForm.validate();
      if (isFormComplete) {
        this.Post("EDIT_CHARACTER", {
          characterId: this.characters[this.selectedCharacter].id,
          firstName: this.characters[this.selectedCharacter].firstName,
          lastName: this.characters[this.selectedCharacter].lastName,
          nationality: this.characters[this.selectedCharacter].nationality,
          backstory: this.characters[this.selectedCharacter].backstory,
          mugshot: this.characters[this.selectedCharacter].mugshot,
          licenses: this.characters[this.selectedCharacter].licenseValues
        }, (charLicenses) => {
          if (Object.keys(charLicenses).length > 0) {
            this.characters[this.selectedCharacter].metadata.licenses = charLicenses;
            this.editingCharacter = false;
          }
        });
      }
    },

    hideCharacter() {
      // console.log("hide");
      if (this.hoveringCharacter) this.hoveringCharacter = false;
    },

    selectCharacter(charIndex) {
      this.selectedCharacter = charIndex;
    },

    checkCharDeletion() {
      this.showCharacterDelete = true;
    },

    deleteCharacter() {
      if (this.selectedCharacter !== undefined) {
        this.Post("DELETE_CHARACTER", {characterId: this.characters[this.selectedCharacter].id}, (callbackData) => {
          if (callbackData) {
            this.characters.splice(this.selectedCharacter, 1);
            this.selectedCharacter = undefined;
            this.showCharacterDelete = false;
            this.deletedCharacter = true;

            if (this.deleteTimeout !== undefined) {
              this.deleteTimeout = setTimeout(() => {
                this.deleteTimeout = undefined;
                clearTimeout(this.deleteTimeout);
                this.deletedCharacter = false;
              }, 2000);
            } else {
              this.deleteTimeout = undefined;
              clearTimeout(this.deleteTimeout);
              
              this.deleteTimeout = setTimeout(() => {
                this.deletedCharacter = false;
              }, 2000);
            }
          }
        });
      }
    },

    spawnCharacter() {
      this.Post("SELECT_CHARACTER", {characterId: this.characters[this.selectedCharacter].id}, (callbackData) => {
        // console.log("NUI CB", JSON.stringify(callbackData));
        if (callbackData) {
          this.showCharacters = false;
        }
      });
    },

    resetCharacters() {
      this.selectedCharacter = undefined;
      this.hoveredCharacter = {};
      this.hoveringCharacter = false;
    },
    
    formatAge(dob) {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age = age - 1;
      }
      return age;
    },

    // Vehicles
    setupVehicles(data) {
      if (data.vehicles) {
        for (let i = 0; i < data.vehicles.length; i++) {
          data.vehicles[i].displayDate = new Date(data.vehicles[i].registeredOn).toUTCString();
        }

        this.registeredVehicles = data.vehicles;
        // console.log("Recieved vehicles", JSON.stringify(this.registeredVehicles, null, 2));
      }
    },

    displayVehicles(data) {
      this.insideVeh = data.vehData.inside;
      this.createVehData = {
        label: data.vehData.label,
        model: data.vehData.model,
        type: data.vehData.type,
        colour: data.vehData.colour,
        plate: data.vehData.plate
      }

      this.showVehicles = true;
    },

    startCreatingVehicles() {
      this.creatingVehicle = true;
      if (!this.insideVeh) {
        this.insideNotify = true;

        if (this.insideTimeout !== undefined) {
          this.insideTimeout = setTimeout(() => {
            this.insideTimeout = undefined;
            clearTimeout(this.insideTimeout);
            this.creatingVehicle = false; // Hide create vehicle dialog
            this.insideNotify = false; // Not inside vehicle notification
          }, 2000);
        } else {
          this.insideTimeout = undefined;
          clearTimeout(this.insideTimeout);
          
          this.insideTimeout = setTimeout(() => {
            this.creatingVehicle = false; // Hide create vehicle dialog
            this.insideNotify = false; // Not inside vehicle notification
          }, 2000);
        }
      }
    },

    createVehicle() {
      this.Post("CREATE_VEHICLE", {
        label: this.createVehData.label,
        model: this.createVehData.model,
        type: this.createVehData.type,
        colour: this.createVehData.colour,
        plate: this.createVehData.plate.toUpperCase()
      }, (vehData) => {
        if (vehData.id > 0) {
          vehData.displayDate = new Date(vehData.registeredOn).toUTCString();
          this.registeredVehicles.push(vehData);

          this.Notification({
            title: "Vehicles",
            text: "Vehicle Registered!",
            status: "success",
            effect: "slide",
            speed: 300,
            autoclose: true,
            autotimeout: 3000,
            type: 2,
            position: "top left",
            progress: false,
            showCloseButton: false
          });

          this.creatingVehicle = false;
        }
      });
    },

    startEditingVehicle(index) {
      this.editVehIndex = index;
      this.editedVehData = {
        id: this.registeredVehicles[this.editVehIndex].id,
        label: this.registeredVehicles[this.editVehIndex].label,
        model: this.registeredVehicles[this.editVehIndex].model,
        type: this.registeredVehicles[this.editVehIndex].type,
        colour: this.registeredVehicles[this.editVehIndex].colour,
        plate: this.registeredVehicles[this.editVehIndex].plate
      }

      this.editingVehicle = true;
    },

    editVehicle() {
      this.Post("EDIT_VEHICLE", {
        id: this.editedVehData.id,
        label: this.editedVehData.label,
        model: this.editedVehData.model,
        type: this.editedVehData.type,
        colour: this.editedVehData.colour,
        oldPlate: this.registeredVehicles[this.editVehIndex].plate,
        plate: this.editedVehData.plate
      }, (charLicenses) => {
        if (charLicenses) {
          if (this.registeredVehicles[this.editVehIndex].plate != this.editedVehData.plate) {
            this.registeredVehicles[this.editVehIndex].plate = this.editedVehData.plate;
          }

          this.Notification({
            title: "Vehicles",
            text: "Vehicle Edited!",
            status: "info",
            effect: "slide",
            speed: 300,
            autoclose: true,
            autotimeout: 3000,
            type: 2,
            position: "top left",
            progress: false,
            showCloseButton: false
          });

          this.editingVehicle = false;
        }
      });
    },

    startVehDeletion(index) {
      this.editVehIndex = index;
      this.editedVehData = {
        id: this.registeredVehicles[this.editVehIndex].id
      }

      this.showVehicleDelete = true;
    },

    deleteVehicle() {
      this.Post("DELETE_VEHICLE", {
        id: this.editedVehData.id
      }, (deletedVeh) => {
        if (deletedVeh) {
          this.registeredVehicles.splice(this.editVehIndex, 1);

          this.Notification({
            title: "Vehicles",
            text: "Vehicle Deleted!",
            status: "error",
            effect: "slide",
            speed: 300,
            autoclose: true,
            autotimeout: 3000,
            type: 2,
            position: "top left",
            progress: false,
            showCloseButton: false
          });

          this.showVehicleDelete = false;
        }
      });
    },

    closeVehicles() {
      this.Post("CLOSE_VEHICLES", {}, (callbackData) => {
        if (callbackData) {
          // console.log("close vehs init bruv!");
          this.showVehicles = false;
        }
      });
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

    AddSuggestions(data) {
      // console.log("Push suggestion data", JSON.stringify(data.suggestions));
      this.suggestions = data.suggestions;
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

      if (this.closeTimeout !== null) { // changed from "this.closeTimeout === undefined"
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
          // this.sentMessages.push(this.chatMessage);
          // this.cycledMessage = this.sentMessages.length;
          // console.log("cb", callbackData)
          if (callbackData) {
            this.sentMessages.push(this.chatMessage);
            this.cycledMessage = this.sentMessages.length;
          }
          this.chatMessage = "";
        });
      }
    },

    NewMsg(data) {
      if (data.type === "system") data.contents = this.ColorizeMsg(data.contents);
      this.chatMessages.push(data);

      if (this.chatToggled) {
        // If not visible slide into view
        if (!$('#Chat-Messages').is(":visible")) {
          $("#Chat-Messages").css("display", "block");
          $('#Chat-Messages').animate({"margin-right": '+=' + "35%"}, 500);
        } else {
          // console.log("is visible!");
          if (this.closeTimeout !== null) { // changed from "this.closeTimeout === undefined"
            // console.log("clear timeout init!");
            clearTimeout(this.closeTimeout);
            this.closeTimeout = undefined;
          }
        }

        setTimeout(() => {
          $("#Chat-Messages").get(0).scrollTop = $("#Chat-Messages").get(0).scrollHeight; // Scroll to bottom of messages
        }, 10);

        // console.log("closetimeout", this.closeTimeout);
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
          }, 3200);
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

    // ASTRID MENU
    OpenMenu(data) {
      this.menuPosition = data.position;
      this.menuName = data.name;
      this.menuComponents = data.components;
      this.menuOption = data.option;
      this.menuVisible = true;
    },

    CloseMenu() {
      this.menuName = "";
      this.menuComponents = {};
      this.menuOption = 0;
      this.menuVisible = false;
    },

    RenameMenu(data) {
      this.menuName = data.name;
    },

    EmptyMenu(data) {
      this.menuComponents = data.components;
      this.menuOption = 0;
    },

    DeleteMenu(data) {
      this.menuComponents.splice(data.index, 1);
      this.menuOption = 0;
    },

    DeleteComponent(data) {
      this.menuComponents[data.menuIndex].splice(data.componentIndex, 1);
    },

    SetMenuOption(data) {
      // console.log("set menu option", JSON.stringify(data));
      this.menuOption = data.option;
      const element = document.getElementById(`${this.menuOption}`);
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    },

    SetCheckboxState(data) {
      const comp = this.GetMenuIndexById(data.id)

      // console.log("comp", JSON.stringify(comp), JSON.stringify(data))
      if (comp != null) {
        // console.log("set value", this.menuComponents[comp].state);
        this.menuComponents[comp].state = data.state
        // console.log("setted value", this.menuComponents[comp].state)
      }
    },

    SetListItem(data) {
      this.menuComponents.forEach(comp => {
        if (comp.index == data.index) {
          comp.listIndex = data.listIndex
        }
      });
    },

    GetMenuIndexById(id) {
      for (let a = 0; a < this.menuComponents.length; a++) {
        if (this.menuComponents[a].index == id) {
          return a
        }
      }
      return null;
    },
    
    HideMenu() {
      this.menuVisible = false;
    },

    ShowMenu() {
      this.menuVisible = true;
    },

    // PROGRESS UI
    StartProgress(data) {
      HUD.progressBar = new RadialProgress({
        r: data.radius,
        s: data.stroke,
        x: data.x,
        y: data.y,
        color: data.colour,
        bgColor: data.backgroundColour,
        rotation: data.rotation,
        maxAngle: data.maxAngle,
        progress: 0,

        onStart: function() {
          HUD.running = true;

          this.container.classList.add(`label-${data.LabelPosition}`);
          this.label.textContent = data.Label;

          HUD.Post("PROGRESS_STARTED")
        },

        onChange: function(progress, t, duration) {
          if (data.useTime) {
            this.indicator.style.fontSize = "30"; // Better Sized Overall
            this.indicator.textContent = `${((duration - t) / 1000).toFixed(1)}`;
          }

          if (data.usePercent) {
            this.indicator.textContent = `${Math.ceil(progress)}%`;
          }                
        },  

        onComplete: function () {
          this.indicator.textContent = "";
          this.label.textContent = "";
          this.container.classList.add("done");

          setTimeout(() => {
            this.remove();
          }, 1000)
  
          HUD.Post("PROGRESS_FINISHED");
                
          HUD.running = false;
        }
      });

      HUD.progressBar.render(HUD.progressElement);
      HUD.progressBar.start(100, 0, data.duration);
    },

    StartStaticProgress(data) {
      if (HUD.staticProgressBar === undefined) {	
        HUD.staticProgressBar = new RadialProgress({	
          r: data.radius,	
          s: data.stroke,	
          x: data.x,	
          y: data.y,	
          color: data.color,	
          bgColor: data.backgroundColour,	
          rotation: data.rotation,
          maxAngle: data.maxAngle,	
          progress: 0,	
          onChange: function(progress) {	
            if (data.showProgress) {	
              this.indicator.style.fontSize = "17"; // Better Sized Overall
              this.indicator.textContent = `${Math.ceil(progress)}%`;	
            }                	
          },                 	
        });

        HUD.staticProgressBar.container.classList.add(`label-${data.LabelPosition}`);	
        HUD.staticProgressBar.label.textContent = data.Label;            	
        HUD.Post("static", data)	
      } else {	
        if (data.show) {
          HUD.staticProgressBar.render(HUD.progressElement);	
        }

        if (data.hide) {
          HUD.staticProgressBar.remove();
        }

        if (data.progress !== false) {
          HUD.staticProgressBar.setProgress(data.progress)
        }

        if (data.destroy) {
          HUD.staticProgressBar.remove();	
          HUD.staticProgressBar = false;	
        }             	
      }
    },

    CancelProgress() {
      HUD.running = false;
      if (this.progressBar) {
        this.progressBar.stop();	
        this.progressBar = false;
      }
      
      if (this.staticProgressBar) {
        this.staticProgressBar.stop();	
        this.staticProgressBar = false;
      }

      HUD.Post("PROGRESS_CANCELLED");
    }
  },

  watch: {
    "newCharacter.dob" : (val, oldVal) => {
      if (val != oldVal) {
        HUD.newCharacter.age = HUD.formatAge(HUD.newCharacter.dob);
      }
    },
  },
  
  computed: {
    pageCount: function() {
      return Math.ceil(Object.keys(this.connectedPlayers).length / 10);
    },

    getters: {
      get() {
        return this.pageCount;
      },
      set(newValue) {
        return newValue;
      }
    },

    currentSuggestions() {
      if (this.chatMessage === "" || this.chatMessage == null) {
        return [];
      }

      if (this.chatMessage[0] == "/") { // if chat content is a command
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

          if (s.params.length > 0) {
            s.params.forEach((p, index) => {
              const wType = (index === s.params.length - 1) ? "." : "\\S";
              const regex = new RegExp(`${s.name} (?:\\w+ ){${index}}(?:${wType}*)$`, "g");

              // eslint-disable-next-line no-param-reassign
              // @ts-ignore
              p.disabled = this.chatMessage.match(regex) == null;
            });
          }
        });

        return currentSuggestions;
      } else {
        return [];
      }
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

    // Characters
    RegisterEvent("DISPLAY_CHARACTERS", this.displayCharcaters);

    // Vehicles
    RegisterEvent("SETUP_VEHICLES", this.setupVehicles);
    RegisterEvent("DISPLAY_VEHICLES", this.displayVehicles);

    // Notification
    RegisterEvent("CREATE_NOTIFICATION", this.Notification);

    // SCOREBOARD EVENTS
    RegisterEvent("OPEN_SCOREBOARD", this.DisplayScoreboard);
    RegisterEvent("CLOSE_SCOREBOARD", this.CloseScoreboard);
    RegisterEvent("CHANGE_PAGE", this.ChangePage);

    // CHAT EVENTS
    RegisterEvent("SETUP_CHAT", this.SetupChat);
    RegisterEvent("ADD_SUGGESTIONS", this.AddSuggestions);
    RegisterEvent("OPEN_CHAT", this.OpenChat);
    RegisterEvent("SEND_MESSAGE", this.NewMsg);
    RegisterEvent("TOGGLE_CHAT", this.Toggle);
    RegisterEvent("CLEAR_CHAT", this.Clear);

    // Warning Events
    RegisterEvent("OPEN_WARNINGS", this.DisplayWarnings);

    // Commend Events
    RegisterEvent("OPEN_COMMENDS", this.DisplayCommends);

    // ASTRID MENU Events
    RegisterEvent("OPEN_MENU", this.OpenMenu);
    RegisterEvent("CLOSE_MENU", this.CloseMenu);
    RegisterEvent("RENAME_MENU", this.RenameMenu);
    RegisterEvent("EMPTY_MENU", this.EmptyMenu)
    RegisterEvent("DELETE_MENU", this.DeleteMenu)
    RegisterEvent("DELETE_COMPONENT", this.DeleteComponent);
    RegisterEvent("SET_MENU_OPTION", this.SetMenuOption);
    RegisterEvent("SET_CHECKBOX_STATE", this.SetCheckboxState);
    RegisterEvent("SET_LIST_ITEM", this.SetListItem);
    RegisterEvent("HIDE_MENU", this.HideMenu);
    RegisterEvent("SHOW_MENU", this.ShowMenu);

    this.progressElement = document.getElementById("progressBar");
    RegisterEvent("PROGRESS_START", this.StartProgress);
    RegisterEvent("CANCEL_PROGRESS", this.CancelProgress);

    // HUD Events
    RegisterEvent("SET_COMPASS", this.SetCompass);

    // Key Presses
    window.addEventListener("keydown", function(event) {
      switch(event.key) {
        case "Escape": // Close UI
          if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
            HUD.CloseChat();
          } else if ($("#warnings_container").is(":visible")) {
            HUD.CloseChat();
            HUD.CloseWarnings();
          } else if ($("#commends_container").is(":visible")) {
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

        case "PageUp":
          if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
            HUD.CycleMode("right");
          }
          break;

        case "PageDown":
          if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
            HUD.CycleMode("left");
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

    // NUI Ready
    setTimeout(() => {
      HUD.Post("NUI_READY");
    }, 0);
  }
});

function isDateValid(date) {
  return date.getTime() === date.getTime(); // If the date object is invalid, it will return 'NaN' on getTime() and NaN is never equal to itself.
}

async function Delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function setCaretPosition(elemId, caretPos) {
  var elem = document.getElementById(elemId);

  if(elem != null) {
    if(elem.createTextRange) {
      console.log("ONE!");
      var range = elem.createTextRange();
      range.move('character', caretPos);
      range.select();
    }
    else {
      console.log("TWO!");
      if(elem.selectionStart) {
        elem.focus();
        elem.setSelectionRange(caretPos, caretPos);
      }
      else
        elem.focus();
    }
  }
}
