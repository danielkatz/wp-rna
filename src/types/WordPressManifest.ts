export interface WordPressManifest {
    wordpress: WordPressCoreDefinition,
    plugins: WordPressComponentDefinition[],
    themes: WordPressComponentDefinition[],
}

export interface WordPressCoreDefinition {
    version: string,
}

export interface WordPressComponentDefinition {
    slug: string,
    version: string,
}
