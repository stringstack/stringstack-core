'use strict';

const TestBase = require( '../class.base' );

class TestDatabase extends TestBase {

  constructor( deps ) {
    super( deps, 'TestDatabase' );

    this._config = deps.get( 'config' );

  }

}

module.exports = TestDatabase;
