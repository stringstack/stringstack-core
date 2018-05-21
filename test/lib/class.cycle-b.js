'use strict';

const TestBase = require( './class.base' );

class TestCycleB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleB' );

    this._c = deps.get( './test/lib/class.cycle-c' );
    this._g = deps.get( './test/lib/class.cycle-g' );


  }

}

module.exports = TestCycleB;