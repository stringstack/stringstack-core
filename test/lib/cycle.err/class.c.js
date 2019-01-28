'use strict';

const TestBase = require( '../class.base' );

class TestCycleC extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleC' );

    this._d = deps.get( './test/lib/cycle.err/class.d' );

  }

}

module.exports = TestCycleC;
