const HUD = new Vue({
  el: "#HUD",
  vuetify: new Vuetify(),
  data: {
    // Important 
    resource: "astrid_core",
    ranks: {},
    myRank: 0,

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
    staticProgressBar: false,

    // Bug Reporting
    bugRules: [
      (v) => !!v || "Field Required"
    ],
    bugData: {
      type: null,
      reportTypes: ["Script", "Vehicle", "EUP", "Map"],
      description: null,
      reproduce: null,
      evidence: null
    },
    reportingBug: false,
    bugReportMenu: null,

    // Death System
    deathDisplaying: false,
    deathState: "counting_down",
    deathData: {
      respawnCounter: "34",
      holdCounter: "5"
    },

    // HUD
    hudActive: false,
    activeUnits: 0,
    totalUnits: 0,

    priorityState: 2,

    locationData: {
      visible: false,
      time: "16:39",
      street: "Senora Freeway",
      crossing: "Crossing Road",
      postal: 224,
      direction: "North Bound"
    },
    vehicleData: {
      visible: false,
      rpm: undefined,
      mph: undefined,
      fuel: undefined,
      seatbelt: false
    },
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
      this.currentPlayers = this.connectedPlayers.length;
      this.maxPlayers = data.maxPlayers || 32;
      console.log("page", this.pageCount);
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

    UpdateSuggestions(data) {
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
      if (str !== null) {
        let s = `<span class='message'>` + (str.replace(/\^([0-9])/g, (str, color) => `</span><span class='color-${color}'>`)) + "</span>";

        const styleDict = {
          '*': 'font-weight: bold;',
          '_': 'text-decoration: underline;',
          '~': 'text-decoration: line-through;',
          '=': 'text-decoration: underline line-through;',
          'r': 'text-decoration: none;font-weight: normal;',
        };

        const styleRegex = /\^(\_|\*|\=|\~|\/|r)(.*?)(?=$|\^r|<\/em>)/;
        while (s.match(styleRegex)) { //Any better solution would be appreciated :P
          s = s.replace(styleRegex, (str, style, inner) => `<em style='${styleDict[style]}'>${inner}</em>`)
        }
        return s.replace(/<span[^>]*><\/span[^>]*>/g, '');
      }
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

      $.post(`https://${this.resource}/${event}`, JSON.stringify(data), cb);
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
    },

    // Bug Reporting
    OpenBugReport() {
      this.reportingBug = true;
    },
    
    CloseBugReport() {
      this.reportingBug = false;
      this.resetBugData();
      this.Post("CLOSE_BUG_REPORT", {});
    },

    submitBug() {
      const isFormComplete = this.$refs.bugReportForm.validate();
      if (isFormComplete) {
        this.Post("SUBMIT_BUG", {
          type: this.bugData.type.toUpperCase(),
          description: this.bugData.description,
          reproduction: this.bugData.reproduce,
          evidence: this.bugData.evidence
        }, (charData) => {
          if (this.reportingBug !== !charData) this.reportingBug = !charData; // If it's posted (true), then set the display to (false).
          this.resetBugData();
        });
      }
    },

    resetBugData() {
      this.$refs.bugReportForm.reset();
    },

    // Death UI
    DisplayDeath(data) {
      if (Object.keys(data).length > 0) {

        if (data.type === "counting_down") {
          this.deathData.respawnCounter = data.respawnRemaining;
          this.deathState = data.type;
        }

        this.deathDisplaying = data.display;
        if (!this.deathDisplaying) { // If hiding the UI (set data back to default)
          if (data.respawnCounter !== undefined) this.deathData.respawnCounter = data.respawnCounter;
          if (data.holdCounter !== undefined) this.deathData.holdCounter = data.holdCounter;
        }
      }
    },

    UpdateRespawnTimer(data) {
      if (this.deathState === "counting_down") {
        this.deathData.respawnCounter = data.newTimer;
      }
    },

    StartRespawnable(data) {
      if (data.type === "respawn_now") {
        this.deathData.holdCounter = data.counter;
        this.deathState = data.type;
      }
    },

    UpdateRespawnCountdown(data) {
      if (this.deathState === "respawn_now") {
        this.deathData.holdCounter = data.newCounter;
      }
    },

    // Ghost Players
    CopyCode(data) {
      const stringElement = document.createElement('textarea');
      stringElement.value = data.text;
      stringElement.setAttribute('readonly', '');
      stringElement.style = {position: 'absolute', left: '-9999px'};
      document.body.appendChild(stringElement);
      stringElement.select();
      document.execCommand('copy');
      document.body.removeChild(stringElement);
    },

    // HUD
    UpdateHud(data) {
      this.hudActive = data.active;

      if (this.hudActive) {
        $("#Hud_Container").fadeIn(200);
      } else {
        $("#Hud_Container").fadeOut(200);
      }
    },

    UpdateAOP(data) {
      this.currentAOP = data.newAOP;
    },

    UpdateUnits(data) {
      this.activeUnits = data.activeUnits;
      this.totalUnits = data.units;

      // console.log(`Recieved New Units (UI) | ${this.activeUnits} | ${this.totalUnits}`);
    },

    UpdatePriority(data) {
      this.priorityState = data.priority;
    },

    UpdateLocation(data) {
      if (data.visible) {
        this.locationData = {
          visible: true,
          time: data.time,
          street: data.street,
          crossing: data.crossing,
          postal: data.postal,
          direction: data.direction
        }
      } else {
        this.locationData.visible = data.visible;
      }
    },

    UpdateVeh(data) {
      if (data.visible) {
        this.vehicleData.mph = data.mph;
        const dialValue = Number(this.vehicleData.mph * 1.70);
        const mphBackgroundElement = document.querySelector("#atess2");
        var mphElement = document.querySelector("#atess");
        mphBackgroundElement.setAttribute("stroke-dasharray", dialValue + "," + 943);
        mphElement.setAttribute("stroke-dasharray", dialValue + "," + 943);

        // RPM
        this.vehicleData.rpm = data.rpm;
        const rpmString = this.vehicleData.rpm.toFixed(2);

        if (rpmString === "0.20") {
          const rpmValue = 0;
          const rpmElement = document.querySelector("#icibre");

          rpmElement.setAttribute("stroke-dasharray", rpmValue + "," + 943);
          document.getElementById("rpmText").innerHTML = "0.00 rpm";
        } else {
          const rpmValue = Number(Number(rpmString) * 440);
          const rpmElement = document.querySelector("#icibre");

          rpmElement.setAttribute("stroke-dasharray", rpmValue + "," + 943);
          document.getElementById("rpmText").innerHTML = rpmString + ' rpm';
          // document.getElementById("rpmText").innerHTML = rpmString + ' rpm';
        }

        // Fuel
        this.vehicleData.fuel = data.fuel;

        if (this.vehicleData.fuel > 50 && this.vehicleData.fuel < 100) {
          document.getElementById("fuelFull").style.display = "block";
          document.getElementById("fuelHalf").style.display = "none";
          document.getElementById("fuelLow").style.display = "none";
        } else if (this.vehicleData.fuel > 30 && this.vehicleData.fuel < 50) {
          document.getElementById("fuelFull").style.display = "none";
          document.getElementById("fuelHalf").style.display = "block";
          document.getElementById("fuelLow").style.display = "none";
        } else if (this.vehicleData.fuel < 30) {
          document.getElementById("fuelFull").style.display = "none";
          document.getElementById("fuelHalf").style.display = "none";
          document.getElementById("fuelLow").style.display = "block";
        }

        if (this.vehicleData.seatbelt !== data.seatbelt) {
          this.vehicleData.seatbelt = data.seatbelt;
          if (this.vehicleData.seatbelt) {
            document.getElementById("seatbelt").style.color = "#1cbd1c";
          } else {
            document.getElementById("seatbelt").style.color = "rgb(207, 32, 32)";
          }
        }

        if (!this.vehicleData.visible) {
          this.vehicleData.visible = true;
          $("#Speedometer_Container").fadeIn(200);
        }
      } else {
        if (this.vehicleData.visible) {
          this.vehicleData.visible = false;
          $("#Speedometer_Container").fadeOut(200);

          this.vehicleData.mph = undefined;
          this.vehicleData.rpm = undefined;
          this.vehicleData.fuel = undefined;
        }
      }
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
      return Math.ceil(this.connectedPlayers.length / 10);
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

      if (this.chatMessage[0] === "/") { // if chat content is a command
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
          if (keybind.key.toLowerCase().search(this.keybindSearch.toLowerCase()) !== -1 || keybind.description.toLowerCase().search(this.keybindSearch.toLowerCase()) !== -1)
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
    // Important Data
    RegisterEvent("SET_IMPORTANT", (data) => {
      this.ranks = data.ranks;
      this.myRank = data.myRank;
    });

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
    RegisterEvent("UPDATE_SUGGESTIONS", this.UpdateSuggestions);
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

    // Progress UI
    this.progressElement = document.getElementById("progressBar");
    RegisterEvent("PROGRESS_START", this.StartProgress);
    RegisterEvent("CANCEL_PROGRESS", this.CancelProgress);

    // Bug Reporting
    RegisterEvent("OPEN_BUG_REPORT", this.OpenBugReport);

    // Death System
    RegisterEvent("DISPLAY_DEATH", this.DisplayDeath);
    RegisterEvent("UPDATE_RESPAWN_TIMER", this.UpdateRespawnTimer);
    RegisterEvent("START_RESPAWNABLE", this.StartRespawnable);
    RegisterEvent("UPDATE_RESPAWN_COUNTDOWN", this.UpdateRespawnCountdown);

    // Ghost Players
    RegisterEvent("COPY_CODE", this.CopyCode);

    // HUD
    RegisterEvent("UPDATE_HUD", this.UpdateHud);
    RegisterEvent("UPDATE_AOP", this.UpdateAOP);
    RegisterEvent("UPDATE_UNITS", this.UpdateUnits);
    RegisterEvent("UPDATE_PRIORITY", this.UpdatePriority);
    RegisterEvent("UPDATE_LOCATION", this.UpdateLocation);
    RegisterEvent("UPDATE_VEH", this.UpdateVeh);

    // Kidnap Blindfold
    RegisterEvent("KIDNAP_PLAYER", (data) => {
      const blackness = document.getElementById("kidnapBlindfold");
      if (data.toggle) {
        blackness.style.display = "block";
      } else {
        blackness.style.display = "none";
      }
    });

    // Key Presses
    window.addEventListener("keydown", function(event) {
      switch(event.key) {
        case "Escape": // Close UI
          if ($("#Chat-Input").is(":visible") && HUD.$refs.input === document.activeElement) {
            HUD.CloseChat();
          } else if ($("#Vehicles_Container").is(":visible")) {
            HUD.closeVehicles();
          } else if ($("#warnings_container").is(":visible")) {
            HUD.CloseWarnings();
          } else if ($("#commends_container").is(":visible")) {
            HUD.CloseCommends();
          } else if ($("#Bug_Report_Container").is(":visible")) {
            HUD.CloseBugReport();
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
  }
});

function isDateValid(date) {
  return date.getTime() === date.getTime(); // If the date object is invalid, it will return 'NaN' on getTime() and NaN is never equal to itself.
}

// Hex Menu
AxMenu = {}
AxMenu.Open = function(data) {
  console.log("OPEN MENU!", JSON.stringify(data));
  AxMenu.HomeMenu = data;
  AxMenu.PreviousMenu = undefined;
  AxMenu.CurrentMenu = undefined;
  $(".hexMenu").show();
  AxMenu.SetupMenu(data);
}

AxMenu.SetupMenu = function(table){
  AxMenu.CurrentMenu = table;
  AxMenu.Reset();

  $.each(table, function(i, label){
    i++
    $('#label-'+i).html(label.label);
    $('.hex-'+i).data(label);
    // $('.i-'+i).addClass(label.icon+' fa');

    $('.hex-'+i).click(function() {
      var menu = $(this).data()
      if (menu.submenu == false) {
        HUD.Post("HEX_EVENT", {
          event: menu.event,
          parameters: menu.parameters,
          type: menu.type
        });

        if (menu.shouldClose) {
          AxMenu.Close()
        }
      } else {
        AxMenu.PreviousMenu = AxMenu.CurrentMenu;
        AxMenu.CurrentMenu = menu.submenu;
        AxMenu.SetupMenu(menu.submenu)
      }
    })
  })
}

AxMenu.Reset = function(){
  for (i = 0; i < 7; i++) {
    $('#label-'+i).html('')
    $('.hex-'+i).data('')
    $('.i-'+i).attr('class','i-'+i)
  };

  $('.hexagon').off()

  $('.close').click(function(){
    if (AxMenu.CurrentMenu == AxMenu.HomeMenu){
      AxMenu.Close()
    }else if(AxMenu.CurrentMenu == AxMenu.PreviousMenu){
      AxMenu.SetupMenu(AxMenu.HomeMenu)
    }else{
      AxMenu.SetupMenu(AxMenu.PreviousMenu)
    }
  })

  if(AxMenu.CurrentMenu == AxMenu.HomeMenu){
    // $('.i-close').attr('class','i-close fa fa-times fa');
    $('#label-close').html('Close')
  } else{
    // $('.i-close').attr('class','i-close fas fa-chevron-circle-right fa');
    $('#label-close').html('Back')
  }

  $(".hexMenu").hide();
  setTimeout(function(){$(".hexMenu").fadeIn(500)},100)
}

AxMenu.Close = function(){
  HUD.Post("CLOSE_HEX_MENU", {});
  $(".hexMenu").fadeOut()
  $('.hexagon').off()
}

$(document).on('keydown', function(event) {
  switch(event.keyCode) {
    case 27:
      if ($(".hexMenu").is(":visible")) {
        AxMenu.Close()
      }
      break;
  }
});

RegisterEvent("OPEN_HEX_MENU", AxMenu.Open);
RegisterEvent("CLOSE_HEX_MENU", AxMenu.Close);


$(document).ready(function (){
  $.post(`https://${GetParentResourceName()}/NUI_READY`, {});
});