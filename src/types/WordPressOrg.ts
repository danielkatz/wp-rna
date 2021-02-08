export declare module VersionCheck {

    export interface Packages {
        full: string;
        no_content: string;
        new_bundled: string;
        partial: boolean;
        rollback: boolean;
    }

    export interface Offer {
        response: string;
        download: string;
        locale: string;
        packages: Packages;
        current: string;
        version: string;
        php_version: string;
        mysql_version: string;
        new_bundled: string;
        partial_version: boolean;
        new_files?: boolean;
    }

    export interface Response {
        offers: Offer[];
        translations: any[];
    }

}

export declare module PluginInfo {

    export interface Ratings {
        "1": number;
        "2": number;
        "3": number;
        "4": number;
        "5": number;
    }

    export interface Screenshot {
        src: string;
        caption: string;
    }

    export interface Response {
        name: string;
        slug: string;
        version: string;
        author: string;
        author_profile: string;
        requires: string;
        tested: string;
        requires_php: string;
        compatibility: any[];
        rating: number;
        ratings: Ratings;
        num_ratings: number;
        support_threads: number;
        support_threads_resolved: number;
        downloaded: number;
        last_updated: string;
        added: string;
        homepage: string;
        sections: Record<string, string>;
        download_link: string;
        screenshots: Record<string, Screenshot>;
        tags: Record<string, string>;
        versions: Record<string, string>;
        donate_link: string;
        contributors: any[];
    }
}

export declare module ThemeInfo {
    export interface Response {
        name: string;
        slug: string;
        version: string;
        preview_url: string;
        author: string;
        screenshot_url: string;
        rating: number;
        num_ratings: string;
        downloaded: number;
        last_updated: string;
        homepage: string;
        sections: Record<string, string>;
        download_link: string;
        tags: Record<string, string>;
        versions: Record<string, string>;
    }
}
