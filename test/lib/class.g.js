'use strict';

const TestBase = require( './class.base' );

class TestG extends TestBase {

  constructor( deps ) {
    super( deps, 'TestG' );

    this._database = deps.get( './test/lib/class.database' );
  }

}

module.exports = TestG;