'use strict';

const TestBase = require( './class.base' );

class ErrGetInit extends TestBase {

  constructor( deps ) {
    super( deps, 'ErrGetInit' );
  }

  init( done ) {
    this._f = this._deps.get( './test/lib/class.f' );
    super.init( done );
  }

}

module.exports = ErrGetInit;