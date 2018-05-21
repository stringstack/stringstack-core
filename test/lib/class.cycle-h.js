'use strict';

const TestBase = require( './class.base' );

class TestCycleH extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleH' );

    this._i = deps.get( './test/lib/class.cycle-i' );
    this._c = deps.get( './test/lib/class.cycle-c' );

  }

}

module.exports = TestCycleH;