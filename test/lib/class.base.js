'use strict';

let events = [];

class TestBase {

  constructor( deps, name ) {
    this._name = name;
    this._deps = deps;
    this._initCalled = 0;
    this._dinitCalled = 0;
    this._testEvent( 'instantiate' );
  }

  init( done ) {
    this._testEvent( 'init' );
    this._initCalled++;
    done();
  }

  dinit( done ) {
    this._testEvent( 'dinit' );
    this._dinitCalled++;
    done();
  }

  _testEvent( eventName ) {
    let value = this._name + ':' + eventName;
    events.push( value );
  }

  _getEvents() {
    return events;
  }

  _resetEvents() {
    events = [];
  }

}

module.exports = TestBase;