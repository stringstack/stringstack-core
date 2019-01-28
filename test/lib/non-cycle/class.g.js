'use strict';

const TestBase = require( '../class.base' );

class TestNonCycleG extends TestBase {

  constructor( deps ) {
    super( deps, 'TestNonCycleG' );

    this._h = deps.get( './test/lib/non-cycle/class.h' );

  }

}

module.exports = TestNonCycleG;
