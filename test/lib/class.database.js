'use strict';

const TestBase = require( './class.base' );

class TestDatabase extends TestBase {

  constructor( deps ) {
    super( deps, 'TestDatabase' );

    this._config = deps.get( './test/lib/class.config' );

  }

}

module.exports = TestDatabase;