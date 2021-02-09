import yargs, { Argv } from "yargs";
import { ManifestCommand } from "./src/commands/ManifestCommand";
import { ScaffoldCommand } from "./src/commands/ScaffoldCommand";

async function main() {
    const scaffoldCommand = new ScaffoldCommand();
    const manifestCommand = new ManifestCommand();

    yargs
        .command(scaffoldCommand)
        .command(manifestCommand)
        .demandCommand()
        .help()
        .showHelpOnFail(true, "Specify --help for available options")
        .fail(handleError)
        .argv;
}

function handleError(msg: string, error?: Error, yargs?: Argv) {
    if (error) {
        if (error instanceof Error) {
            console.error(error.message, { error });
        } else {
            console.error(error);
        }
    } else if (msg) {
        console.error(msg);
    } else {
        console.error("Unknown error");
    }

    process.exit(1);
}

main().catch(err => {
    handleError("Fatal error", err);
});
