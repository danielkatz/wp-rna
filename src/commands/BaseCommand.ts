import { CommandModule } from "yargs";
import { AppError } from "../AppError";
import { Logger, LoggingService } from "../LoggingService";
import { CommonArgs } from "./CommonArgs";

export abstract class BaseCommand<T extends CommonArgs> implements CommandModule {
    protected readonly loggingService: LoggingService;
    protected readonly logger: Logger;

    constructor(loggingService: LoggingService) {
        this.loggingService = loggingService;
        this.logger = this.loggingService.createLogger({ command: this.constructor.name });

        this.handler = this.handler.bind(this);
    }

    async handler(args: Partial<CommonArgs>): Promise<void> {
        this.logger.debug("Received the following options", { args });

        await this.action(args as T);
    }

    abstract action(args: T): Promise<void>;
}
