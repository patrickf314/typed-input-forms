import nodeModulesPlugin from '@rollup/plugin-node-resolve';
import commonjsPlugin from '@rollup/plugin-commonjs';
import typescriptPlugin from '@rollup/plugin-typescript';
import pkg from './package.json' assert {type: "json"};
import glob from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default {
    input: Object.fromEntries(
        glob.globSync('src/index.ts').map(file => [
            // This remove `src/` as well as the file extension from each
            // file, so e.g. src/nested/foo.js becomes nested/foo
            path.relative(
                'src',
                file.slice(0, file.length - path.extname(file).length)
            ),
            // This expands the relative paths to absolute paths, so e.g.
            // src/nested/foo becomes /project/src/nested/foo.js
            fileURLToPath(new URL(file, import.meta.url))
        ]),
    ),
    output: {
        dir: './out/esm',
        format: 'es'
    },
    external: [...Object.keys(pkg.peerDependencies || {})],
    plugins: [
        nodeModulesPlugin(),
        commonjsPlugin(),
        typescriptPlugin()
    ],
};