import { Argv } from "yargs";
import { WordPressMetadata, WordPressComponentMetadata, scaffold } from "../engines/scaffold";
import { BaseCommand } from "./BaseCommand";
import { CommonArgs } from "./CommonArgs";
import semverValidRange from "semver/ranges/valid";

type ScaffoldCommandArgs = CommonArgs & {
    ver: string,
    plugins: string[],
    themes: string[],
    dest: string,
}

export class ScaffoldCommand extends BaseCommand<ScaffoldCommandArgs> {
    public readonly command: string = "scaffold <ver>";
    public readonly describe: string = "Scaffold a fresh wordpress filesystem";

    builder(yargs: Argv): Argv {
        return yargs
            .positional("ver", {
                type: "string",
                default: "latest",
            })
            .option("plugins", {
                type: "array",
            })
            .option("themes", {
                type: "array",
            })
            .option("dest", {
                type: "string",
                demandOption: true,
            });
    }

    async action(args: ScaffoldCommandArgs): Promise<void> {
        const metadata: WordPressMetadata = {
            plugins: [],
            themes: [],
        };

        if (args.ver && args.ver !== "latest") {
            const validRange = semverValidRange(args.ver);
            if (validRange) {
                metadata.version = validRange;
            }
            else {
                throw new Error(`--version '${args.ver}' is not a valid version`);
            }
        }

        if (args.plugins) {
            for (const plugin of args.plugins) {
                const component = this.parseComponent(plugin);
                metadata.plugins.push(component);
            }
        }

        if (args.themes) {
            for (const theme of args.themes) {
                const component = this.parseComponent(theme);
                metadata.themes.push(component);
            }
        }

        await scaffold(metadata, args.dest);
    }

    private parseComponent(componentString: string): WordPressComponentMetadata {
        const [name, version] = componentString.split(":");
        if (name.length === 0) throw new Error(`component name cannot be an empty string`);

        const component: WordPressComponentMetadata = {
            slug: name,
        }

        if (version && version !== "latest") {
            const validRange = semverValidRange(version);
            if (validRange) {
                component.version = validRange;
            }
            else {
                throw new Error(`invalid version '${version}' for component '${name}'`);
            }
        }

        return component;
    }
}
