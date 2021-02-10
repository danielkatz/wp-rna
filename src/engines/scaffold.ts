import { promises as fs, createWriteStream } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import path from "path";
import fetch from "node-fetch";
import maxSatisfying from "semver/ranges/max-satisfying";
import extract from "extract-zip";
import { PluginInfo, ThemeInfo, VersionCheck } from "../types/WordPressOrg";
import { WordPressComponentDefinition, WordPressManifest } from "../types/WordPressManifest";
import { SEMVER_RANGE } from "../constants";

const streamPipeline = promisify(pipeline);

export async function scaffold(manifest: WordPressManifest, destination: string) {
    const resolvedManifest = await resolveVersionRanges(manifest);

    await scaffoldWordpress(resolvedManifest, destination);
}

async function resolveVersionRanges(manifest: WordPressManifest): Promise<WordPressManifest> {
    const wordpressVersions = await getWordpressVersions();
    const wordpressVersion = findBestWordpressVersion(manifest.wordpress.version, wordpressVersions);

    const resolvedManifest: WordPressManifest = {
        wordpress: {
            version: wordpressVersion
        },
        plugins: [],
        themes: [],
    };

    for (const pluginMetadata of manifest.plugins) {
        const pluginInfo = await getPluginInfo(pluginMetadata.slug);
        const pluginSource = findBestPluginVersion(pluginMetadata.version, pluginInfo);
        resolvedManifest.plugins.push(pluginSource);
    }

    for (const themeMetadata of manifest.themes) {
        const themeInfo = await getThemeInfo(themeMetadata.slug);
        const themeSource = findBestThemeVersion(themeMetadata.version, themeInfo);
        resolvedManifest.themes.push(themeSource);
    }

    return resolvedManifest;
}

async function scaffoldWordpress(resolvedManifest: WordPressManifest, destination: string) {
    const temp = await fs.mkdtemp("scaffold-");
    console.log(`Created temp dir: ${temp}`);

    try {
        const wordpressZip = path.join(temp, `wordpress-${resolvedManifest.wordpress.version}.zip`);
        const wordpressDownloadUrl = `https://downloads.wordpress.org/release/wordpress-${resolvedManifest.wordpress.version}-no-content.zip`;

        await downloadFile(wordpressDownloadUrl, wordpressZip);
        await extractZip(wordpressZip, destination);

        await fs.mkdir(path.join(destination, "wordpress/wp-content"));

        const pluginsFolder = path.join(destination, "wordpress/wp-content/plugins");
        const themesFolder = path.join(destination, "wordpress/wp-content/themes");
        const uploadsFolder = path.join(destination, "wordpress/wp-content/uploads");

        await fs.mkdir(pluginsFolder);
        await fs.mkdir(themesFolder);
        await fs.mkdir(uploadsFolder);

        for (const plugin of resolvedManifest.plugins) {
            const pluginZip = path.join(temp, `${plugin.slug}-${plugin.version}.zip`);
            const pluginDownloadUrl = `https://downloads.wordpress.org/plugin/${plugin.slug}.${plugin.version}.zip`;

            await downloadFile(pluginDownloadUrl, pluginZip);
            await extractZip(pluginZip, pluginsFolder);
        }

        for (const theme of resolvedManifest.themes) {
            const themeZip = path.join(temp, `${theme.slug}-${theme.version}.zip`);
            const themeDownloadUrl = `https://downloads.wordpress.org/theme/${theme.slug}.${theme.version}.zip`;

            await downloadFile(themeDownloadUrl, themeZip);
            await extractZip(themeZip, themesFolder);
        }

        console.log(resolvedManifest);
    } finally {
        await fs.rm(temp, { recursive: true, force: true });
        console.log(`Removed temp dir: ${temp}`);
    }
}

async function downloadFile(url: string, dest: string) {
    const response = await fetch(url);

    console.log(`Downloading ${url} to ${dest}...`);

    if (!response.ok) {
        throw new Error(`Faild to download '${url}'. Status: ${response.status}`);
    }

    await streamPipeline(response.body, createWriteStream(dest));
}

async function extractZip(file: string, dest: string) {
    console.log(`Extracting ${file} into ${dest}...`);

    await extract(file, { dir: dest });
}

function resolveVersion(unresolved: string, versions: string[]): string | null {
    if (unresolved.match(SEMVER_RANGE)) {
        return maxSatisfying(versions, unresolved);
    } else {
        return unresolved;
    }
}

function findBestWordpressVersion(unresolved: string, versions: VersionCheck.Response): string {
    const resolved = resolveVersion(unresolved, versions.offers.map(x => x.version));

    if (resolved === null) {
        throw Error(`No version of wordpress matches the range '${unresolved}'`);
    }

    return resolved;
}

function findBestPluginVersion(unresolved: string, info: PluginInfo.Response): WordPressComponentDefinition {
    const resolved = resolveVersion(unresolved, Object.getOwnPropertyNames(info.versions));

    if (resolved === null) {
        throw Error(`No version of ${info.slug} matches the range '${unresolved}'`);
    }

    return {
        slug: info.slug,
        version: resolved,
    };
}

function findBestThemeVersion(unresolved: string, info: ThemeInfo.Response): WordPressComponentDefinition {
    const resolved = resolveVersion(unresolved, Object.getOwnPropertyNames(info.versions));

    if (resolved === null) {
        throw Error(`No version of ${info.slug} matches the range '${unresolved}'`);
    }

    return {
        slug: info.slug,
        version: resolved,
    };
}

async function getWordpressVersions(): Promise<VersionCheck.Response> {
    const uri = "https://api.wordpress.org/core/version-check/1.7/";
    const response = await fetch(uri);

    if (!response.ok) {
        throw new Error(`WordPress Org API error ${uri}. Status: ${response.status}`);
    }

    const json = await response.json() as VersionCheck.Response;
    return json;
}

async function getPluginInfo(slug: string): Promise<PluginInfo.Response> {
    const uri = `https://api.wordpress.org/plugins/info/1.0/${encodeURIComponent(slug)}.json`;
    const response = await fetch(uri);

    if (!response.ok) {
        throw new Error(`WordPress Org API error ${uri}. Status: ${response.status}`);
    }

    const json = await response.json();

    if (json === false) {
        throw new Error(`Plugin '${slug}' is not found`);
    }

    return json as PluginInfo.Response;
}

async function getThemeInfo(slug: string): Promise<ThemeInfo.Response> {
    const uri = `https://api.wordpress.org/themes/info/1.1/?action=theme_information&request[slug]=${encodeURIComponent(slug)}&request[fields][versions]=1`;
    const response = await fetch(uri);

    if (!response.ok) {
        throw new Error(`WordPress Org API error ${uri}. Status: ${response.status}`);
    }

    const json = await response.json();

    if (json === false) {
        throw new Error(`Theme '${slug}' is not found`);
    }

    return json as ThemeInfo.Response;
}
