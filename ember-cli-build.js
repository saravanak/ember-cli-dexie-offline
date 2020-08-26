'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function (defaults) {
  let app = new EmberAddon(defaults, {
    'ember-service-worker': {
      registrationStrategy: 'inline',
      enabled: true
    },
    'esw-cache-fallback': {
      patterns: [
        'https://emberjs.com/images/brand/ember_Ember-Light.png',
        'https://love2dev.com/img/basic-service-worker-caching-980x552.jpg'
      ],

      // changing this version number will bust the cache
      version: '1'
    }
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */
  app.import('node_modules/turretcss/dist/turretcss.min.css');
  app.import('node_modules/reveal.js/dist/reveal.css');
  app.import('node_modules/reveal.js/dist/theme/white.css');
  return app.toTree();
};
