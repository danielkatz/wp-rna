export class AppError extends Error {
    public readonly innerError: Error | undefined;

    constructor(message: string, innerError: Error | undefined = undefined) {
        super(message);
        Error.captureStackTrace(this);

        this.innerError = innerError;
    }
}
