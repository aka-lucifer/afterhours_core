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
  public BindSubmenu(menuName: string): Submenu {
    return new Submenu(menuName, this.resource, this.handle, this.position);
  }

  public BindButton(buttonLabel: string, callback: any): string {
    return client.menuManager.AddButton(buttonLabel, this.handle, callback, this.resource);
  }

  public BindCheckbox(checkboxLabel: string, checkState: boolean, callback: any): string {
    return client.menuManager.AddCheckbox(checkboxLabel, this.handle, checkState, callback, this.resource)
  }

  public BindList(listLabel: string, menuList: Record<number, any>, callback: any): string {
    return client.menuManager.AddList(listLabel, this.handle, menuList, callback, this.resource);
  }

  public async Clear(): Promise<void> {
    client.menuManager.ClearMenu(this.handle);
  }

  public Empty(): void {
    console.log("empty menu void", this.handle);
    client.menuManager.emptyMenu(this.handle);
  }
}