'use strict';

const TestBase = require( '../class.base' );

class TestCycleA extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleA' );

    this._b = deps.get( './test/lib/cycle.err.part-2/class.b' );

  }

}

module.exports = TestCycleA;
