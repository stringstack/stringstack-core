'use strict';

const TestBase = require( '../class.base' );

class TestNonCycleA extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNonCycleA' );

    this._b = deps.get( './test/lib/non-cycle/class.b' );

  }

}

module.exports = TestNonCycleA;
