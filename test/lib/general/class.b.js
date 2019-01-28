'use strict';

const TestBase = require( '../class.base' );

class TestB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestB' );

    this._database = deps.get( './test/lib/general/class.database' );
    this._c = deps.get( './test/lib/general/class.c' );

  }

}

module.exports = TestB;
