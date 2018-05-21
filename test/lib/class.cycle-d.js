'use strict';

const TestBase = require( './class.base' );

class TestCycleD extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleD' );

    this._e = deps.get( './test/lib/class.cycle-e' );

  }

}

module.exports = TestCycleD;