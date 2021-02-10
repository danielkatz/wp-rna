import { Argv } from "yargs";
import * as yaml from "js-yaml";
import { promises as fs } from "fs";
import { scaffold } from "../engines/scaffold";
import { BaseCommand } from "./BaseCommand";
import { CommonArgs } from "./CommonArgs";
import semverValidRange from "semver/ranges/valid";
import { WordPressComponentDefinition, WordPressManifest } from "../types/WordPressManifest";

type ScaffoldCommandArgs = CommonArgs & {
    file: string,
    wp: string,
    plugins: string[],
    themes: string[],
    dest: string,
}

export class ScaffoldCommand extends BaseCommand<ScaffoldCommandArgs> {
    public readonly command: string = "scaffold";
    public readonly describe: string = "Scaffold a fresh wordpress filesystem";

    builder(yargs: Argv): Argv {
        return yargs
            .option("file", {
                alias: "f",
                type: "string",
            })
            .option("wp", {
                type: "string",
                default: ">=0.0.0",
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
        const manifest = (args.file)
            ? await this.loadManifestFromFile(args)
            : this.getManifestFromArgs(args);

        await scaffold(manifest, args.dest);
    }

    private async loadManifestFromFile(args: ScaffoldCommandArgs): Promise<WordPressManifest> {
        const yml = await fs.readFile(args.file, "utf-8");
        return yaml.load(yml) as WordPressManifest;
    }

    private getManifestFromArgs(args: ScaffoldCommandArgs): WordPressManifest {
        const manifest: WordPressManifest = {
            wordpress: {
                version: ">=0.0.0",
            },
            plugins: [],
            themes: [],
        };

        if (args.wp) {
            manifest.wordpress.version = args.wp;
        }

        if (args.plugins) {
            for (const plugin of args.plugins) {
                const component = this.parseComponent(plugin);
                manifest.plugins.push(component);
            }
        }

        if (args.themes) {
            for (const theme of args.themes) {
                const component = this.parseComponent(theme);
                manifest.themes.push(component);
            }
        }

        return manifest;
    }

    private parseComponent(componentString: string): WordPressComponentDefinition {
        const [name, version] = componentString.split(":");
        if (name.length === 0) throw new Error(`component name cannot be an empty string`);

        const component: WordPressComponentDefinition = {
            slug: name,
            version: ">=0.0.0",
        }

        if (version) {
            component.version = version;
        }

        return component;
    }
}
