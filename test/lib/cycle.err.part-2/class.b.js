'use strict';

const TestBase = require( '../class.base' );

class TestCycleB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleB' );

    this._a = deps.inject( './test/lib/cycle.err.part-2/class.a' );

  }

}

module.exports = TestCycleB;
