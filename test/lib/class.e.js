'use strict';

const TestBase = require( './class.base' );

class TestE extends TestBase {

  constructor( deps ) {
    super( deps, 'TestE' );

    this._config = deps.get( './test/lib/class.config' );
    this._database = deps.get( './test/lib/class.database' );
    this._h = deps.get( './test/lib/static.h' );
    this._f = deps.get( './test/lib/class.f' );

  }

}

module.exports = TestE;