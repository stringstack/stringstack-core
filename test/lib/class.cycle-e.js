'use strict';

const TestBase = require( './class.base' );

class TestCycleE extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleE' );

    this._f = deps.get( './test/lib/class.cycle-f' );
    this._i = deps.get( './test/lib/class.cycle-i' );

  }

}

module.exports = TestCycleE;