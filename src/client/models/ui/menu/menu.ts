import {client} from "../../../client";

import { Submenu } from "./submenu";

export class Menu {
  public name: string;
  public resource: string;
  public position: string;
  public handle: string;

  constructor(menuName: string, menuResource: string, menuPosition: string = "top-left") {
    this.name = menuName;
    this.resource = menuResource;
    this.position = menuPosition;
    this.handle = client.menuManager.AddMenu(menuName, menuResource, menuPosition);
  }

  // Methods
  public async IsAnyMenuOpen(): Promise<boolean> {
    return client.menuManager.IsAnyMenuOpen();
  }

  public async Open(): Promise<void> {
    await client.menuManager.OpenMenu(this.handle);
  }

  public async Close(): Promise<void> {
    await client.menuManager.CloseMenu();
  }

  public BindSubmenu(menuName: string): Submenu {
    return new Submenu(menuName, this.resource, this.handle, this.position);
  }

  public BindButton(buttonLabel: string, callback: CallableFunction): string {
    return client.menuManager.AddButton(buttonLabel, this.handle, callback, this.resource);
  }

  public BindCheckbox(checkboxLabel: string, checkState: boolean, callback: CallableFunction): string {
    return client.menuManager.AddCheckbox(checkboxLabel, this.handle, checkState, callback, this.resource)
  }

  public BindList(listName: string, menuList: Record<number, any>, callback: CallableFunction): string {
    return client.menuManager.AddList(listName, this.handle, menuList, callback, this.resource);
  }

  public async Clear(): Promise<void> {
    client.menuManager.ClearMenu(this.handle);
  }
}
