'use strict';

const TestBase = require( '../class.base' );

class TestNonCycleD extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNonCycleD' );

    this._e = deps.get( './test/lib/non-cycle/class.e' );

  }

}

module.exports = TestNonCycleD;
