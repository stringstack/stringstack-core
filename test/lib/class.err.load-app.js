'use strict';

const TestBase = require( './class.base' );

class TestLoadApp extends TestBase {

  constructor( deps ) {
    super( deps, 'TestLoadApp' );

    this._err_load_self = deps.get( 'app' );

  }

}

module.exports = TestLoadApp;