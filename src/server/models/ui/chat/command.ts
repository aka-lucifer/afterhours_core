import { Log } from "../../../utils";
import { server } from "../../../server";

import { Ranks } from "../../../../shared/enums/ranks";
import { Jobs } from "../../../../shared/enums/jobs/jobs";

export class Command {
    public name: string;
    public description: string;
    public args: Record<number, any> = {};
    public argsRequired: boolean;
    public callback: CallableFunction;
    public permission: Ranks;

    constructor(cmdName: string, cmdDescription: string, cmdArguments: Record<any, any>, argsRequired: boolean, cmdCallback: CallableFunction, cmdPermission: Ranks) {
        this.name = cmdName;
        this.description = cmdDescription;
        this.args = cmdArguments;
        this.argsRequired = argsRequired;
        this.callback = cmdCallback;
        this.permission = cmdPermission;

        server.commandManager.addCommand(this);
        Log("Commands Manager", `Command (${this.name}) added with permission (${(Ranks[this.permission]) || Ranks[Ranks.User]})`);
    }
}

export class JobCommand {
    public name: string;
    public description: string;
    public args: Record<number, any> = {};
    public argsRequired: boolean;
    public callback: CallableFunction;
    public permission: Jobs[] | Jobs;

    constructor(cmdName: string, cmdDescription: string, cmdArguments: Record<any, any>, argsRequired: boolean, cmdCallback: CallableFunction, cmdPermission: Jobs[] | Jobs) {
        this.name = cmdName;
        this.description = cmdDescription;
        this.args = cmdArguments;
        this.argsRequired = argsRequired;
        this.callback = cmdCallback;
        this.permission = cmdPermission;

        server.commandManager.addJobCommand(this);

        if (typeof cmdPermission == "object") {
            Log("Commands Manager", `Command (${this.name}) added with permission (${JSON.stringify(this.permission)} || Ranks[Ranks.User]})`);
        } else {
            Log("Commands Manager", `Command (${this.name}) added with permission (${this.permission} || Ranks[Ranks.User]})`);
        }
    }
}