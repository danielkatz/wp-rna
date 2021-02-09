import { Argv } from "yargs";
import * as yaml from "js-yaml";
import { extractManifest } from "../engines/manifest";
import { BaseCommand } from "./BaseCommand";
import { CommonArgs } from "./CommonArgs";

type ManifestCommandArgs = CommonArgs & {
    path: string,
    output: "yaml" | "json",
}

export class ManifestCommand extends BaseCommand<ManifestCommandArgs> {
    public readonly command: string = "manifest";
    public readonly describe: string = "Create a manifest from wordpress filesystem";

    builder(yargs: Argv): Argv {
        return yargs
            .option("path", {
                alias: "p",
                type: "string",
                default: process.cwd(),
            })
            .option("output", {
                alias: "o",
                type: "string",
                choices: ["yaml", "json"],
                default: "yaml",
            });
    }

    async action(args: ManifestCommandArgs): Promise<void> {
        const manifest = await extractManifest(args.path);

        if (args.output === "yaml") {
            console.log(yaml.dump(manifest));
        } else {
            console.log(manifest);
        }
    }
}
