export interface WordPressManifest {
    wordpress: WordPressCoreDefinition,
    plugins: WordPressComponentDefinition[],
    themes: WordPressComponentDefinition[],
}

export interface WordPressVersionDefinition {
    version: string,
    versionType: "strict" | "range"
}

export interface WordPressCoreDefinition extends WordPressVersionDefinition {
}

export interface WordPressComponentDefinition extends WordPressVersionDefinition {
    slug: string,
}
