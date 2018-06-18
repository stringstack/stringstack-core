'use strict';

const TestBase = require( './class.base' );

class TestRootB extends TestBase {

  constructor( deps ) {
    super( deps, 'TestRootB' );

  }

}

module.exports = TestRootB;