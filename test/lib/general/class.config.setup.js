'use strict';

const TestBase = require( '../class.base' );

class TestConfigSetup extends TestBase {

  constructor( deps ) {
    super( deps, 'TestConfigSetup' );

    // reverse dependency, ensures TestConfigSetup is initialized before config, and de-initialized after config.
    this._config = deps.inject( 'config' );

  }

}

module.exports = TestConfigSetup;
