'use strict';

const TestBase = require( './class.base' );

class TestCycleC extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleC' );

    this._d = deps.get( './test/lib/class.cycle-d' );
    this._e = deps.get( './test/lib/class.cycle-e' );

  }

}

module.exports = TestCycleC;