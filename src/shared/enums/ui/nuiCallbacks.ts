export enum NuiCallbacks {
  // Readier
  Ready = "NUI_READY",

  // Spawner
  CloseSpawner = "CLOSE_SPAWNER",

  // Characters
  CreateCharacter = "CREATE_CHARACTER",
  EditCharacter = "EDIT_CHARACTER",
  SelectCharacter = "SELECT_CHARACTER",
  DeleteCharacter = "DELETE_CHARACTER",

  // Vehicles
  CloseVehicles = "CLOSE_VEHICLES",
  CreateVehicle = "CREATE_VEHICLE",
  EditVehicle = "EDIT_VEHICLE",
  DeleteVehicle = "DELETE_VEHICLE",
  
  // Chat
  CloseChat = "CLOSE_CHAT",
  SendMessage = "SEND_MESSAGE",

  // Progress Bar
  ProgressStarted = "PROGRESS_STARTED",
  ProgressFinished = "PROGRESS_FINISHED",
  ProgressCancelled = "PROGRESS_CANCELLED",

  // Bug Reporting
  CloseBugReport = "CLOSE_BUG_REPORT",
  SubmitBug = "SUBMIT_BUG",

  // Hex Menu
  CloseHexMenu = "CLOSE_HEX_MENU",
  HexEvent = "HEX_EVENT"
}
