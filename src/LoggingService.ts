import winston from "winston";
import { version } from "../package.json";

const defaultOptions = {
    pretty: false,
    verbose: false,
};

export type LoggerOptions = typeof defaultOptions;

export type Logger = winston.Logger;

export class LoggingService {
    private readonly protoLogger: winston.Logger;

    constructor(options: LoggerOptions = defaultOptions) {
        const format = options.pretty
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            )
            : winston.format.combine(
                {
                    transform: (info) => {
                        const { level } = info;
                        return {
                            severity: level,
                            ...info,
                        };
                    },
                },
                winston.format.json(),
            );

        this.protoLogger = winston.createLogger({
            defaultMeta: {
                version,
            },
            level: options.verbose ? "debug" : "info",
            transports: [
                new winston.transports.Console({ format }),
            ]
        });
    }

    createLogger(metadata: Record<string, unknown> = {}): Logger {
        return this.protoLogger.child(metadata);
    }
}
