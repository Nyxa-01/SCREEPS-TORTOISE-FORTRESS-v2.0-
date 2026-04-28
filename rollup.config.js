import { builtinModules } from 'node:module';

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { createJiti } from 'jiti';
import screeps from 'rollup-plugin-screeps';

const buildTarget = process.env.SCREEPS_TARGET ?? 'main';
const deployEnabled = process.env.DEPLOY === 'true' || process.env.DEPLOY === '1';
const jiti = createJiti(import.meta.url);
const { getScreepsConfig } = await jiti.import('./src/utils/Credentials.ts');

const nodeBuiltins = new Set([
    ...builtinModules,
    ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

function isNodeBuiltin(importId) {
    for (const builtin of nodeBuiltins) {
        if (importId === builtin || importId.startsWith(`${builtin}/`)) {
            return true;
        }
    }

    return false;
}

function embedSourceMap() {
    return {
        name: 'embed-source-map',
        generateBundle(_outputOptions, bundle) {
            const mainChunk = bundle['main.js'];

            if (!mainChunk || mainChunk.type !== 'chunk' || !mainChunk.map) {
                return;
            }

            const embeddedSourceMap = JSON.stringify(JSON.stringify(mainChunk.map));
            mainChunk.code = mainChunk.code.replace(/"__SCREEPS_SOURCE_MAP__"/g, embeddedSourceMap);
        },
    };
}

const deployPlugin = deployEnabled
    ? screeps({
        config: getScreepsConfig(buildTarget),
    })
    : null;

export default {
    input: 'src/main.ts',
    output: {
        file: 'dist/main.js',
        format: 'cjs',
        sourcemap: true,
    },
    external: (importId) => isNodeBuiltin(importId),
    plugins: [
        resolve({
            browser: true,
            preferBuiltins: false,
        }),
        commonjs(),
        replace({
            preventAssignment: true,
            values: {
                BUILD_TARGET: JSON.stringify(buildTarget),
                NODE_ENV: JSON.stringify(process.env.NODE_ENV ?? 'development'),
            },
        }),
        typescript({
            tsconfig: './tsconfig.json',
            sourceMap: true,
            inlineSources: true,
        }),
        embedSourceMap(),
        deployPlugin,
    ].filter(Boolean),
};
