import { CommandModule } from "yargs";
import { CommonArgs } from "./CommonArgs";

export abstract class BaseCommand<T extends CommonArgs> implements CommandModule {
    constructor() {
        this.handler = this.handler.bind(this);
    }

    async handler(args: Partial<CommonArgs>): Promise<void> {
        await this.action(args as T);
    }

    abstract action(args: T): Promise<void>;
}
