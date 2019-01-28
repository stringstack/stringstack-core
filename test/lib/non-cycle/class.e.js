'use strict';

const TestBase = require( '../class.base' );

class TestNonCycleE extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNonCycleE' );

    this._f = deps.get( './test/lib/non-cycle/class.f' );
    this._i = deps.get( './test/lib/non-cycle/class.i' );

  }

}

module.exports = TestNonCycleE;
