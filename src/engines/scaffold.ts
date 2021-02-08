import { promises as fs, createWriteStream } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import path from "path";
import fetch from "node-fetch";
import semver, { SemVer } from "semver";
import maxSatisfying from "semver/ranges/max-satisfying";
import extract from "extract-zip";
import { PluginInfo, ThemeInfo, VersionCheck } from "../types/WordPressOrg";

const streamPipeline = promisify(pipeline);

export interface WordPressComponentMetadata {
    slug: string,
    version?: string,
}

export interface WordPressMetadata {
    version?: string,
    plugins: WordPressComponentMetadata[],
    themes: WordPressComponentMetadata[],
}

export interface WordPressSource {
    version: string,
    ref: string,
    plugins: WordPressComponentSource[],
    themes: WordPressComponentSource[],
}

export interface WordPressComponentSource {
    slug: string,
    version: string,
    ref: string,
}

export async function scaffold(metadata: WordPressMetadata, destination: string) {
    const wordpressVersions = await getWordpressVersions();
    const wordpressVersion = findBestWordpressVersion(metadata.version, wordpressVersions);

    const resolvedMetadata: WordPressSource = {
        version: wordpressVersion,
        ref: `https://downloads.wordpress.org/release/wordpress-${wordpressVersion}-no-content.zip`,
        plugins: [],
        themes: [],
    };

    for (const pluginMetadata of metadata.plugins) {
        const pluginInfo = await getPluginInfo(pluginMetadata.slug);
        const pluginSource = findBestPluginVersion(pluginMetadata.version, pluginInfo);
        resolvedMetadata.plugins.push(pluginSource);
    }

    for (const themeMetadata of metadata.themes) {
        const themeInfo = await getThemeInfo(themeMetadata.slug);
        const themeSource = findBestThemeVersion(themeMetadata.version, themeInfo);
        resolvedMetadata.themes.push(themeSource);
    }

    await scaffoldWordpress(resolvedMetadata, destination);
}

async function scaffoldWordpress(source: WordPressSource, destination: string) {
    const temp = await fs.mkdtemp("scaffold-");
    console.log(`Created temp dir: ${temp}`);

    try {
        const wordpressZip = path.join(temp, `wordpress-${source.version}.zip`);

        await downloadFile(source.ref, wordpressZip);
        await extractZip(wordpressZip, destination);

        await fs.mkdir(path.join(destination, "wordpress/wp-content"));

        const pluginsFolder = path.join(destination, "wordpress/wp-content/plugins");
        const themesFolder = path.join(destination, "wordpress/wp-content/themes");
        const uploadsFolder = path.join(destination, "wordpress/wp-content/uploads");

        await fs.mkdir(pluginsFolder);
        await fs.mkdir(themesFolder);
        await fs.mkdir(uploadsFolder);

        for (const plugin of source.plugins) {
            const pluginZip = path.join(temp, `${plugin.slug}-${plugin.version}.zip`);

            await downloadFile(plugin.ref, pluginZip);
            await extractZip(pluginZip, pluginsFolder);
        }

        for (const theme of source.themes) {
            const themeZip = path.join(temp, `${theme.slug}-${theme.version}.zip`);

            await downloadFile(theme.ref, themeZip);
            await extractZip(themeZip, themesFolder);
        }

        console.log(source);
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

function findBestWordpressVersion(range: string | undefined, versions: VersionCheck.Response): string {
    const specificVersion = semver.valid(range);
    if (specificVersion) {
        return specificVersion;
    }

    const unique = [... new Set<SemVer>(versions.offers.map(x => semver.coerce(x.version)!))];
    const ver = maxSatisfying(unique, range || ">=0.0.0");

    if (ver === null) {
        throw Error(`No version of wordpress matches the range '${range}'`);
    }

    return ver.format();
}

function findBestPluginVersion(range: string | undefined, info: PluginInfo.Response): WordPressComponentSource {
    let version = semver.valid(range);

    if (!version) {
        const unique = Object.getOwnPropertyNames(info.versions);
        version = maxSatisfying(unique, range || ">=0.0.0");

        if (version === null) {
            throw Error(`No version of ${info.slug} matches the range '${range}'`);
        }
    }

    return {
        slug: info.slug,
        version: version,
        ref: `https://downloads.wordpress.org/plugin/${info.slug}.${version}.zip`,
    };
}

function findBestThemeVersion(range: string | undefined, info: ThemeInfo.Response): WordPressComponentSource {
    let version = semver.valid(range);

    if (!version) {
        const unique = Object.getOwnPropertyNames(info.versions);
        version = maxSatisfying(unique, range || ">=0.0.0");

        if (version === null) {
            throw Error(`No version of ${info.slug} matches the range '${range}'`);
        }
    }

    return {
        slug: info.slug,
        version: version,
        ref: `https://downloads.wordpress.org/theme/${info.slug}.${version}.zip`,
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
