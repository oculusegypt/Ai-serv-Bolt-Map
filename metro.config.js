const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

const { resolver } = config;

config.resolver = {
  ...resolver,
  blockList: exclusionList([/admin-web\/\.next\/.*/]),
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return {
        filePath: require.resolve('./mocks/react-native-maps.web.js'),
        type: 'sourceFile',
      };
    }
    return resolver.resolveRequest
      ? resolver.resolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
