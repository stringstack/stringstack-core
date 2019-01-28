'use strict';

const TestBase = require( '../class.base' );

class TestCycleD extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleD' );

    this._b = deps.get( './test/lib/cycle.err/class.b' );
    this._e = deps.get( './test/lib/cycle.err/class.e' );

  }

}

module.exports = TestCycleD;
