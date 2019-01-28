'use strict';

const TestBase = require( '../class.base' );

class TestNonCycleH extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNonCycleH' );

    this._i = deps.get( './test/lib/non-cycle/class.i' );
    this._c = deps.get( './test/lib/non-cycle/class.c' );

  }

}

module.exports = TestNonCycleH;
