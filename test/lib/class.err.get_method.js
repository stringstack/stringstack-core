'use strict';

const TestBase = require( './class.base' );

class ErrGetMethod extends TestBase {

  constructor( deps ) {
    super( deps, 'ErrGetMethod' );
  }

  method( done ) {
    this._c = this._deps.get( './test/lib/class.c' );
    done();
  }

}

module.exports = ErrGetMethod;