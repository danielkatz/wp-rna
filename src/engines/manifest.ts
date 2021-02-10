import path from "path";
import { promises as fs } from "fs";
import { StringDecoder } from "string_decoder";
import { WordPressComponentDefinition, WordPressManifest } from "../types/WordPressManifest";

const WP_VERSION_REGEX = /\$wp_version\s*?=\s*?'([^']+)'\s*?;/;
const COMPONENT_VERSION_REGEX = /^[ \t/*#@]*Version:\s{0,}(.*)\s{0,}$/im;

export async function extractManifest(target: string) {
    const wordpressVersion = await readWordPressVersion(target);

    const definition: WordPressManifest = {
        wordpress: {
            version: wordpressVersion,
            versionType: "strict",
        },
        plugins: [],
        themes: [],
    }

    const pluginsFolder = path.join(target, "wp-content/plugins");
    const themesFolder = path.join(target, "wp-content/themes");

    const plugins = await listDirectories(pluginsFolder);
    const themes = await listDirectories(themesFolder);

    for (const plugin of plugins) {
        const pluginInfo = await readPluginDefinition(pluginsFolder, plugin);
        definition.plugins.push(pluginInfo);
    }

    for (const theme of themes) {
        const themeInfo = await readThemeDefinition(themesFolder, theme);
        definition.themes.push(themeInfo);
    }

    return definition;
}

async function readWordPressVersion(target: string) {
    const versionPhpPath = path.join(target, "wp-includes/version.php");

    try {
        const text = await fs.readFile(versionPhpPath, "utf-8");
        const [, version] = WP_VERSION_REGEX.exec(text) ?? [];

        if (!version) {
            throw new Error(`Can't find wordpress version in ${versionPhpPath}`);
        }

        return version;
    } catch (error: any) {
        if (error.code === "ENOENT") {
            throw new Error(`${target} is not a wordpress folder`);
        }
    }

    return "unknown";
}

async function readPluginDefinition(pluginsFolder: string, slug: string): Promise<WordPressComponentDefinition> {
    const pluginFolder = path.join(pluginsFolder, slug);
    const phpFiles = await listFilesOfType(pluginFolder, ".php");

    for (const phpFile of phpFiles) {
        const head = await readFileHead(path.join(pluginFolder, phpFile));
        const match = COMPONENT_VERSION_REGEX.exec(head);

        if (match) {
            const version = match[1];

            return {
                slug,
                version,
                versionType: "strict",
            };
        }
    }

    return { slug, version: "unknown", versionType: "strict" };
}

async function readThemeDefinition(themesFolder: string, slug: string): Promise<WordPressComponentDefinition> {
    const themeFolder = path.join(themesFolder, slug);
    const styleCss = path.join(themeFolder, "style.css");

    const head = await readFileHead(styleCss);
    const match = COMPONENT_VERSION_REGEX.exec(head);

    if (match) {
        const version = match[1];

        return {
            slug,
            version,
            versionType: "strict",
        };
    }

    return { slug, version: "unknown", versionType: "strict" };
}

async function listFilesOfType(location: string, fileExtension: string) {
    const raw = await fs.readdir(location);
    const result = raw.filter((fileName) => path.extname(fileName) === fileExtension);
    return result;
}

async function listDirectories(location: string) {
    const raw = await fs.readdir(location, { withFileTypes: true });
    const result = raw.filter(x => x.isDirectory()).map(x => x.name);
    return result;
}

async function readFileHead(pathToFile: string, readSize: number = 8192) {
    const buffer = Buffer.alloc(readSize);
    const fd = await fs.open(pathToFile, "r");
    const decoder = new StringDecoder("utf8");

    try {
        const data = await fd.read(buffer, 0, readSize, null);
        const decodedData = decoder.write(data.buffer);

        return decodedData;
    } finally {
        decoder.end();
        await fd.close();
    }
}
