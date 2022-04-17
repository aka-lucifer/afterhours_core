import { NuiMessages } from "../../../shared/enums/ui/nuiMessages";
import { Client } from "../../client";
import { CreateUUID, Delay } from "../../utils";

// Important Data
const menus: Record<number, any> = {};
const components: Record<number, any> = {};
const resources: string[] = [];

// Basic Variables
let openedMenu = null;
let hoveredIndex = 0;

export class MenuManager {
  private client: Client;
  
  private menuHidden: boolean;

  constructor(client: Client) {
    this.client = client;
    
    // Events

    // Handles removing menu data from created resources with imports in other TS resources
    on("onResourceStop", this.EVENT_resourceStopped.bind(this));

    // Key Bindings

    // (Keyboard)
    RegisterKeyMapping("+menu_go_up", "Menu (Go Up)", "keyboard", "up");
    RegisterKeyMapping("+menu_go_down", "Menu (Go Down)", "keyboard", "down");
    RegisterKeyMapping("+menu_go_left", "Menu (Go Left)", "keyboard", "left");
    RegisterKeyMapping("+menu_go_right", "Menu (Go Right)", "keyboard", "right");
    RegisterKeyMapping("+menu_enter", "Menu (Enter)", "keyboard", "return");
    RegisterKeyMapping("+menu_back", "Menu (Back)", "keyboard", "back");

    // Controller
    RegisterKeyMapping("+menu_go_up", "Menu (Go Down)", "PAD_ANALOGBUTTON", "LDOWN_INDEX");
    RegisterKeyMapping("+menu_go_down", "Menu (Go Up)", "PAD_ANALOGBUTTON", "LUP_INDEX");
    RegisterKeyMapping("+menu_go_left", "Menu (Go Left)", "PAD_ANALOGBUTTON", "LLEFT_INDEX");
    RegisterKeyMapping("+menu_go_right", "Menu (Go Right)", "PAD_ANALOGBUTTON", "LRIGHT_INDEX");
    RegisterKeyMapping("+menu_enter", "Menu (Enter)", "PAD_ANALOGBUTTON", "RDOWN_INDEX");
    RegisterKeyMapping("+menu_back", "Menu (Back)", "PAD_ANALOGBUTTON", "RRIGHT_INDEX");

    // Keybind Commands
    RegisterCommand("+menu_go_up", () => { this.GoUp()}, false);
    RegisterCommand("+menu_go_down", () => { this.GoDown()}, false);
    RegisterCommand("+menu_go_left", () => { this.GoLeft()}, false);
    RegisterCommand("+menu_go_right", () => { this.GoRight()}, false);
    RegisterCommand("+menu_enter", async() => { await this.Enter()}, false);
    RegisterCommand("+menu_back", async() => { await this.Backspace()}, false);
  }

  // Getters
  public get Hidden(): boolean {
    return this.menuHidden;
  }

  // Methods

  /**
   * Check if a resource which is using a menu, is started
   * @param resourceName The resource the menu was created from.
   */
  public IsResourceStarted(resourceName: string): boolean {
    resources.forEach(function(value, index) {
      if (value == resourceName) {
        return true;
      }
    })

    return false;
  }

  public AddMenu(menuName: string, menuResource: string, menuPosition: string): string {
    const index = CreateUUID();
    resources.push(menuResource);

    menus[index] = {
      name: menuName,
      type: "base",
      components: [],
      resource: menuResource,
      position: menuPosition
    }

    return index;
  }

  public AddSubmenu(menuName: string, parentMenu: string, menuResource: string, menuPosition: string): string {
    const index = CreateUUID();

    menus[index] = {
      name: menuName,
      type: "submenu",
      components: [],
      parent: parentMenu,
      resource: menuResource,
      position: menuPosition
    }

    menus[parentMenu].components.push({
      index: index,
      name: menuName,
      parent: parentMenu,
      type: "submenu",
      resource: menuResource,
      position: menuPosition
    });
    return index;
  }

  public AddButton(buttonLabel: string, parentMenu: string, buttonCallback: any, menuResource: string): string {
    const index = CreateUUID();

    components[index] = {
      name: buttonLabel,
      type: "button",
      action: buttonCallback,
      resource: menuResource
    }

    menus[parentMenu].components.push({
      index: index,
      name: buttonLabel,
      type: "button"
    });
    return index;
  }

  public AddCheckbox(checkboxLabel: string, parentMenu: string, checkState: boolean, checkboxCallback: any, menuResource: string): string {
    const index = CreateUUID();

    components[index] = {
      name: checkboxLabel,
      type: "checkbox",
      action: checkboxCallback,
      state: checkState,
      resource: menuResource
    }

    menus[parentMenu].components.push({
      index: index,
      name: checkboxLabel,
      type: "checkbox",
      state: checkState
    });
    return index;
  }

  public AddList(listLabel: string, parentMenu: string, menuList: Record<number, any>, listCallback: any, menuResource: string): string {
    const index = CreateUUID();

    components[index] = {
      name: listLabel,
      type: "list",
      action: listCallback,
      list: menuList,
      listIndex: 0,
      resource: menuResource
    }

    menus[parentMenu].components.push({
      index: index,
      name: listLabel,
      type: "list",
      list: menuList,
      listIndex: 0
    });
    return index;
  }

  public async OpenMenu(menuIndex: string): Promise<void> {
    const menuFound = menus[menuIndex];
    if (menuFound) {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.OpenMenu,
        data: {
          position: menuFound.position,
          name: menuFound.name,
          components: menuFound.components,
          option: 0
        }
      }))

      openedMenu = menuFound;
      hoveredIndex = 0;
    }
  }

  public emptyMenu(menuIndex: string): void {
    const menuFound = menus[menuIndex];
    if (menuFound) {
      if (menuFound.type === "submenu") {
        console.log("empty submenu components");
        menus[menuIndex].components = [];

        SendNuiMessage(JSON.stringify({
          event: NuiMessages.EmptyMenu,
          data: {
            components: menus[menuIndex].components
          }
        }))
      } else {
        console.log("not submenu, so can't empty components");
      }
    }
  }

  public async CloseMenu(): Promise<void> {
    if (openedMenu) {
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.CloseMenu,
      }))
      
      openedMenu = null;
      hoveredIndex = 0;
    }
  }

  public async IsAnyMenuOpen(): Promise<boolean> {
    if (openedMenu) {
      return true;
    }

    return false
  }

  public async IsMenuOpen(menuIndex: string): Promise<boolean> {
    if (openedMenu !== null) {
      if (openedMenu.index == menuIndex) {
        return true;
      }
    }

    return false;
  }

  public async GetOpenedMenu(): Promise<string> {
    if (openedMenu) {
      return openedMenu.index;
    }

    return null;
  }

  public ClearMenu(menuIndex: string): void {
    for (let a = 0; a < Object.keys(menus[menuIndex]).length; a++) {
      const index = menus[a].index;

      for (let b = 0; Object.keys(components).length; b++) {
        delete components[index];
      }

      delete menus[menuIndex].components[a];
    }
  }

  public UpdateState(checkboxHandle: string, newState: boolean): void {
    for (const [key, value] of Object.entries(components)) {
      if (key == checkboxHandle) {
        value.state = newState;
        break;
      }
    }

    for (const [key, value] of Object.entries(menus)) {
      const componentIndex = value.components.findIndex(foundMenu => foundMenu.index == checkboxHandle);
      if (componentIndex != -1) {
        value.components[componentIndex].state = newState;

        SendNuiMessage(JSON.stringify({
          event: NuiMessages.SetCheckboxState,
          data: {
            id: checkboxHandle,
            state: newState
          }
        }))
              
        return;
      }
    }
  }

  public hide(): void {
    this.menuHidden = true;

    SendNuiMessage(JSON.stringify({
      event: NuiMessages.HideMenu
    }))
  }

  public show(): void {
    this.menuHidden = false;
    
    SendNuiMessage(JSON.stringify({
      event: NuiMessages.ShowMenu
    }))
  }

  // Controls
  private GoUp(): void {
    if (openedMenu != undefined) {
      let prev = hoveredIndex - 1;
      if (prev < 0) {
        prev = openedMenu.components.length - 1;
      }

      hoveredIndex = prev;
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.SetMenuOption,
        data: {
          option: hoveredIndex
        }
      }))
    }
  }

  private GoDown(): void {
    if (openedMenu != undefined) {
      let next = hoveredIndex + 1;
      if (next > openedMenu.components.length - 1) {
        next = 0;
      }

      hoveredIndex = next;
      SendNuiMessage(JSON.stringify({
        event: NuiMessages.SetMenuOption,
        data: {
          option: hoveredIndex
        }
      }))
    }
  }

  private GoLeft(): void {
    if (openedMenu != undefined) {
      const selected = openedMenu.components[hoveredIndex];
      if (selected) {
        if (selected.type == "list") {
          const comp = components[selected.index];
          let next = selected.listIndex - 1;

          if (next < 0) {
            next = selected.list.length - 1;
          }

          selected.listIndex = next;
          comp.listIndex = next;
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.SetListItem,
            data: {
              index: selected.index,
              listIndex: next
            }
          }))
        }
      }
    }
  }

  private GoRight(): void {
    if (openedMenu != undefined) {
      const selected = openedMenu.components[hoveredIndex];
      if (selected) {
        if (selected.type == "list") {
          const comp = components[selected.index];
          let next = selected.listIndex + 1;

          if (next > selected.list.length - 1) {
            next = 0;
          }

          selected.listIndex = next;
          comp.listIndex = next;
          SendNuiMessage(JSON.stringify({
            event: NuiMessages.SetListItem,
            data: {
              index: selected.index,
              listIndex: next
            }
          }))
        }
      }
    }
  }

  private async Enter(): Promise<void> {
    if (openedMenu != undefined) {
      const selected = openedMenu.components[hoveredIndex];
      if (selected) {
        if (selected.type == "submenu") {
          await this.OpenMenu(selected.index);
        } else {
          const component = components[selected.index];
          
          if (selected.type == "checkbox") {
            const newState = !component.state;
            component.state = newState;
            selected.state = newState;
            component.action(newState);

            SendNuiMessage(JSON.stringify({
              event: NuiMessages.SetCheckboxState,
              data: {
                id: selected.index,
                state: newState
              }
            }))
          } else if (selected.type == "list") {
            const comp = components[selected.index];
            comp.action(comp.list[comp.listIndex]);
          } else if (selected.type == "button") {
            components[selected.index].action();
          }
        }
      }
    }
  }

  private async Backspace(): Promise<void> {
    if (openedMenu) {
      if (!openedMenu.parent) {
        await this.CloseMenu();
      } else {
        await this.OpenMenu(openedMenu.parent);
      }
    }
  }

  // Events
  public EVENT_resourceStopped(resourceName: string): void {
    if (resourceName == GetCurrentResourceName()) return;
    if (!this.IsResourceStarted(resourceName)) return;

    for (let i = 0; Object.keys(menus).length; i++) {
      if (menus[i].resource == resourceName) {
        delete menus[i];
      }
    }

    for (let i = 0; Object.keys(components).length; i++) {
      if (components[i].resource == resourceName) {
        delete components[i];
      }
    }

    resources.forEach(function(value, index) {
      if (value == resourceName) {
        resources.splice(index, 1);
      }
    })
  }
}
