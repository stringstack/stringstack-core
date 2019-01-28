'use strict';

const TestBase = require( '../class.base' );

class TestG extends TestBase {

  constructor( deps ) {
    super( deps, 'TestG' );

    this._database = deps.get( './test/lib/general/class.database' );
  }

}

module.exports = TestG;
