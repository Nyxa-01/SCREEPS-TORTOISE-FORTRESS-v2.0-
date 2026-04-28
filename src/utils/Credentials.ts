import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import yaml from 'js-yaml';

export interface ScreepsTargetConfig {
    host: string;
    port: number;
    protocol: 'http' | 'https';
    secure: boolean;
    token?: string;
    branch: string;
    path: string;
    email?: string;
    password?: string;
}

type PartialTargetConfig = Partial<ScreepsTargetConfig> & {
    host?: string;
    hostname?: string;
    https?: boolean;
};

interface SS3ConfigFile {
    servers?: Record<string, PartialTargetConfig>;
}

type LegacyConfigFile = Record<string, PartialTargetConfig>;

const HOME_CONFIG_PATH = path.join(os.homedir(), '.screeps.yaml');
const LOCAL_CONFIG_PATH = path.resolve(process.cwd(), 'screeps.json');

const DEFAULT_TARGETS: Record<string, ScreepsTargetConfig> = {
    main: {
        host: 'screeps.com',
        port: 443,
        protocol: 'https',
        secure: true,
        branch: 'default',
        path: '/api/',
    },
    sim: {
        host: 'screeps.com',
        port: 443,
        protocol: 'https',
        secure: true,
        branch: 'sim',
        path: '/api/',
    },
    ptr: {
        host: 'screeps.com',
        port: 443,
        protocol: 'https',
        secure: true,
        branch: 'default',
        path: '/ptr/api/',
    },
};

function readJsonConfig(): LegacyConfigFile | undefined {
    if (!existsSync(LOCAL_CONFIG_PATH)) {
        return undefined;
    }

    const raw = readFileSync(LOCAL_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === 'object') {
        return parsed as LegacyConfigFile;
    }

    return undefined;
}

function readYamlConfig(): SS3ConfigFile | undefined {
    if (!existsSync(HOME_CONFIG_PATH)) {
        return undefined;
    }

    const raw = readFileSync(HOME_CONFIG_PATH, 'utf8');
    const parsed = yaml.load(raw) as unknown;

    if (parsed && typeof parsed === 'object') {
        return parsed as SS3ConfigFile;
    }

    return undefined;
}

function normalizeTargetConfig(
    target: string,
    source: PartialTargetConfig | undefined,
): ScreepsTargetConfig {
    const fallback = DEFAULT_TARGETS[target] ?? DEFAULT_TARGETS.main!;
    const secure = source?.secure ?? source?.https ?? fallback.secure;
    const protocol = source?.protocol ?? (secure ? 'https' : 'http');

    return {
        host: source?.host ?? source?.hostname ?? fallback.host,
        port: source?.port ?? fallback.port,
        protocol,
        secure,
        token: source?.token ?? process.env.SCREEPS_TOKEN,
        branch: source?.branch ?? process.env.SCREEPS_BRANCH ?? fallback.branch,
        path: source?.path ?? fallback.path,
        email: source?.email ?? process.env.SCREEPS_EMAIL,
        password: source?.password ?? process.env.SCREEPS_PASSWORD,
    };
}

export function getScreepsConfig(target = process.env.SCREEPS_TARGET ?? 'main'): ScreepsTargetConfig {
    const yamlConfig = readYamlConfig();
    const yamlTarget = yamlConfig?.servers?.[target] ?? yamlConfig?.servers?.main;

    if (yamlTarget) {
        return normalizeTargetConfig(target, yamlTarget);
    }

    const jsonConfig = readJsonConfig();
    const jsonTarget = jsonConfig?.[target] ?? jsonConfig?.main;

    return normalizeTargetConfig(target, jsonTarget);
}

export function getScreepsConfigPaths(): string[] {
    return [HOME_CONFIG_PATH, LOCAL_CONFIG_PATH];
}

export function hasScreepsConfig(): boolean {
    return existsSync(HOME_CONFIG_PATH) || existsSync(LOCAL_CONFIG_PATH);
}
