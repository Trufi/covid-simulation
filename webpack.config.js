const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');
const fs = require('fs-extra');

copyAssets();

module.exports = (_, args) => {
    const mode = args.production ? 'production' : 'development';

    const library = {
        mode,

        module: {
            rules: [
                {
                    test: /(\.ts|\.tsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        },
                    },
                },
            ],
        },

        resolve: {
            extensions: ['.ts', '.js'],
        },

        entry: {
            simulation: './src/index.ts',
            demo: './demo/index.ts',
        },

        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist'),
            publicPath: '/',
        },

        plugins: [
            new ForkTsCheckerWebpackPlugin({
                watch: ['./src'],
            }),
        ],

        devtool: mode === 'production' ? false : 'source-map',

        devServer: {
            contentBase: path.resolve(__dirname, 'dist'),
            host: '0.0.0.0',
            port: 3000,
            stats: {
                modules: false,
            },
            disableHostCheck: true,
        },
    };

    return library;
};

function copyAssets() {
    const root = __dirname;
    const dist = path.join(root, 'dist');

    fs.copySync(path.join(root, 'assets'), path.join(dist, 'assets'));
    fs.copySync(path.join(root, 'demo', 'index.html'), path.join(dist, 'index.html'));
}
