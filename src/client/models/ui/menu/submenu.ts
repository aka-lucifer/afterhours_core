import {client} from "../../../client";

import { MenuManager } from "../../../managers/ui/menu";

export class Submenu {
  public name: string;
  public resource: string;
  public position: string;
  public handle: string;

  constructor(menuName: string, menuResource: string, menuHandle: string, menuPosition: string = "top-left") {
    this.name = menuName;
    this.resource = menuResource;
    if (menuPosition) {
      this.position = menuPosition;
    }
    this.handle = client.menuManager.AddSubmenu(menuName, menuHandle, menuResource, menuPosition);
  }

  // Methods
  public async BindSubmenu(menuName: string): Promise<Submenu> {
    const newHandle = client.menuManager.AddSubmenu(menuName, this.handle, this.resource, this.position)
    return new Submenu(menuName, this.resource, newHandle, this.position);
  }

  public async BindButton(buttonLabel: string, callback: any): Promise<string> {
    return client.menuManager.AddButton(buttonLabel, this.handle, callback, this.resource);
  }

  public async BindCheckbox(checkboxLabel: string, checkState: boolean, callback: any): Promise<string> {
    return client.menuManager.AddCheckbox(checkboxLabel, this.handle, checkState, callback, this.resource)
  }

  public async BindList(listLabel: string, menuList: Record<number, any>, callback: any): Promise<string> {
    return client.menuManager.AddList(listLabel, this.handle, menuList, callback, this.resource);
  }

  public async Clear(): Promise<void> {
    client.menuManager.ClearMenu(this.handle);
  }
}