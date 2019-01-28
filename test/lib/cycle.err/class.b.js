'use strict';

const TestBase = require( '../class.base' );

class TestCycleB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleB' );

    this._c = deps.get( './test/lib/cycle.err/class.c' );

  }

}

module.exports = TestCycleB;
