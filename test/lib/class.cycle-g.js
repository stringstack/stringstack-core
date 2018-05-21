'use strict';

const TestBase = require( './class.base' );

class TestCycleG extends TestBase {

  constructor( deps ) {
    super( deps, 'TestCycleG' );

    this._h = deps.get( './test/lib/class.cycle-h' );

  }

}

module.exports = TestCycleG;