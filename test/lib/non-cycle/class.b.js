'use strict';

const TestBase = require( '../class.base' );

class TestNonCycleB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNonCycleB' );

    this._c = deps.get( './test/lib/non-cycle/class.c' );
    this._g = deps.get( './test/lib/non-cycle/class.g' );


  }

}

module.exports = TestNonCycleB;
