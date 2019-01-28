'use strict';

const TestBase = require( '../class.base' );

class TestF extends TestBase {

  constructor( deps ) {
    super( deps, 'TestF' );

    this._database = deps.get( './test/lib/general/class.database' );
    this._g = deps.get( './test/lib/general/class.g' );
    this._json = deps.get( './test/lib/data.json' );

  }

}

module.exports = TestF;
