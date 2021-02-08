type LooseArgs = {
    [argName: string]: unknown
};

export type CommonArgs = LooseArgs & {
    pretty: boolean,
    verbose: boolean,
}
