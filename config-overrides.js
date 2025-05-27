const webpack = require('webpack');

module.exports = function override(config) {
    config.resolve.fallback = {
        ...config.resolve.fallback,
        process: require.resolve('process'),
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
    };

    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process',
            Buffer: ['buffer', 'Buffer'],
        })
    );

    return config;
};
