'use strict';

const TestBase = require( '../class.base' );

class TestNonCycleC extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNonCycleC' );

    this._d = deps.get( './test/lib/non-cycle/class.d' );
    this._e = deps.get( './test/lib/non-cycle/class.e' );

  }

}

module.exports = TestNonCycleC;
