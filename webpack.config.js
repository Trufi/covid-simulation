const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');

module.exports = (_, args) => {
    const mode = args.production ? 'production' : 'development';

    const library = {
        mode,

        module: {
            rules: [
                {
                    test: /(\.ts|\.js)$/,
                    exclude: /node_modules(\/|\\)(?!@2gis(\/|\\)gl-matrix|2gl|kdbush)/,
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

        entry: './src/index.ts',

        output: {
            filename: 'simulation.js',
            path: path.resolve(__dirname, 'dist'),
            publicPath: '/dist',
            libraryTarget: 'commonjs2',
        },

        plugins: [
            new ForkTsCheckerWebpackPlugin({
                watch: ['./src'],
            }),
        ],

        devtool: mode === 'production' ? false : 'source-map',

        devServer: {
            host: '0.0.0.0',
            port: 3000,
            stats: {
                modules: false,
            },
            disableHostCheck: true,
        },
    };

    const demo = {
        ...library,
        entry: './demo/index.ts',
        output: {
            filename: 'demo.js',
            path: path.resolve(__dirname, 'dist'),
            publicPath: '/dist',
        },
    };

    return [library, demo];
};
