'use strict';

const TestBase = require( './class.base' );

class TestB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestB' );

    this._database = deps.get( './test/lib/class.database' );
    this._c = deps.get( './test/lib/class.c' );
  }

}

module.exports = TestB;