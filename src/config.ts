// Configuration information goes here

import type { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile();

type APIConfig = {
    fileserverHits: number;
    platform: string;
    db: DBConfig;
};

type DBConfig = {
    url: string;
    migrationConfig: MigrationConfig;
};

export const config = {
    fileserverHits: 0,
    platform: envOrThrow("PLATFORM"),
    db: {
        url: envOrThrow("DB_URL"),
        migrationConfig: {
            migrationsFolder: "./src/db",
        },
    },
};

function envOrThrow(key: string) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} is missing`);
    }
    return value;
}
