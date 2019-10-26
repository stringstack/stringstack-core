'use strict';

const TestBase = require( '../class.base' );

class TestD extends TestBase {

  constructor( deps ) {
    super( deps, 'TestD' );
  }

  isInitialized() {
    return this._initialized;
  }

}

module.exports = TestD;
