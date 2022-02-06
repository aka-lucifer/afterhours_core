import { Log } from "../../../utils";
import { server } from "../../../server";

import { Ranks } from "../../../../shared/enums/ranks";

export class Command {
    public name: string;
    public description: string;
    public args: Record<number, any> = {};
    public argsRequired: boolean;
    public callback: CallableFunction;
    public permission: number;

    constructor(cmdName: string, cmdDescription: string, cmdArguments: Record<any, any>, argsRequired: boolean, cmdCallback: CallableFunction, cmdPermission: number) {
        this.name = cmdName;
        this.description = cmdDescription;
        this.args = cmdArguments;
        this.argsRequired = argsRequired;
        this.callback = cmdCallback;
        this.permission = cmdPermission;

        server.chatManager.addCommand(this);
        Log("Commands Manager", `Command (${this.name}) added with permission (${(Ranks[this.permission]) || Ranks[Ranks.User]})`);
    }
}