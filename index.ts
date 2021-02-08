import yargs, { Arguments, Argv } from "yargs";
import yargsParser from "yargs-parser";
import { CommonArgs } from "./src/commands/CommonArgs";
import { ScaffoldCommand } from "./src/commands/ScaffoldCommand";
import { LoggingService } from "./src/LoggingService";

const defaultArgs: CommonArgs = {
    pretty: false,
    verbose: false,
};

let loggingService = new LoggingService();

async function main() {
    const parsed = yargsParser(process.argv) as (Arguments & CommonArgs);
    const args = Object.assign({}, defaultArgs, parsed);

    loggingService = new LoggingService(args);

    const scaffoldCommand = new ScaffoldCommand(loggingService);

    yargs
        .command(scaffoldCommand)
        .demandCommand()
        .help()
        .showHelpOnFail(true, "Specify --help for available options")
        .fail(handleError)
        .argv;
}

function handleError(msg: string, error?: Error, yargs?: Argv) {
    const logger = loggingService.createLogger();

    if (error) {
        if (error instanceof Error) {
            logger.error(error.message, { error });
        } else {
            logger.error(error);
        }
    } else if (msg) {
        logger.error(msg);
    } else {
        logger.error("Unknown error");
    }

    process.exit(1);
}

main().catch(err => {
    handleError("Fatal error", err);
});
