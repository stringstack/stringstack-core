# StringStack Core

StringStack/core is the dependency management and injection system at the heart of the StringStack ecosystem of 
components. It is responsible for instantiating, initializing and d-initializing components in the correct order.

StringStack has a very short list of very important objectives in the world of Node.js, from most to least important:

1. Be as vanilla Node.js as possible
1. Graceful startup and shutdown
1. Avoid dependency cycles (dependency spaghetti, I know that doesn't rhyme)
1. Handy utility for accessing contents of package.json (yes, this is basically require(process.cwd() + '/package.json'))
1. Handy utility for accessing name of the current environment (no this isn't just a wrapper for process.env.NODE_ENV)

That is it. You organize your code into components, which are just ECMAScript 6 classes with a certain interface and 
then load your code using the StringStack code App class. That is it. StringStack will take care of instantiating your
components in the correct order, then initializing them, and then d-initializing them. 

This document is mainly written to be in the order you should probably learn things, but feel free to use the
[Table of Contents](#table-of-contents) to skip around.

StringStack is maintained by [BlueRival Software](https://bluerival.com) and is deployed on APIs for multiple Internet
scale systems for multiple Fortune 500 and Fortune 100 companies.

## Table of Contents

* [Component Interfaces](#component-interfaces)
    * [Choosing a Form](#choosing-a-form)
        * [Form 1 - ES6 Class](#form-1---es6-class)
        * [Form 2 - Object Literal](#form-2---object-literal)
        * [Form 3 - JSON](#form-3---json)
    * [Interface Methods](#interface-methods)
    * [Dependency Container](#dependency-container)
        * [get() Method](#get-method)
        * [inject() Method](#inject-method)
* [Bootstrap Yo' App](#bootstrap-yo-app)
    * [Create App and App Class Interfaces](#create-app-and-app-class-interfaces)
        * [Core.createApp()](#corecreateapp)
        * [App Class](#app-class)
* [StringStack Life Cycle](#stringstack-life-cycle)
    * [Cheat Sheet](#cheat-sheet)
* [Path Resolution](#path-resolution)
* [Configuration](#configuration)
    * [Configuration for 3rd Party Components](#configuration-for-3rd-party-components)
* [Logging](#logging)
    * [Logging from Custom Components](#logging-from-custom-components)
* [Daemonix for Creating Proper Linux Services](#daemonix-for-creating-proper-linux-services)


## Component Interfaces

In StringStack nomenclature each dependency is referred to as a component. A component is a chunk of code responsible 
for a specific task. In more general terms, a class in object oriented patterns would have the same level of granularity 
as a StringStack component. In NodeJS, a module would typically have the same level of granularity as a StringStack 
component. In fact, in StringStack, there is typically a 1-to-1 correspondence between NodeJS modules and components.

There are two possible interface forms for StringStack components. There is a 3rd possible form, but its not a component
in the strict sense.

### Choosing a Form

Should you use form 1 or form 2? The question is really about testing. If you want truly isolated tests, then you
should use form 1. With form 1 you can have multiple tests that each pass in different dependency variations to your
component. You can then test your component under each scenario. With form 2, although StringStack will call `load()`
it is up to your code to ensure consistency between tests, which means your tests now need to also test for consistency.

Internal StringStack engineers only use form 1 for StringStack components and for projects that utilize StringStack.

Note: Form 2 is now deprecated entirely. 

#### Form 1 - ES6 Class

```javascript

class SomeComponent {
  
  constructor(deps) {
    
  }
  
  init(done) {

    done();  // yay the component initialized!
    
    // OR
  
    done( new Error('boo!') ); // no, the component failed to initialize!

  }
  
  dinit(done) {
    
    done();  // yay the component d-initialized!
    
    // OR
  
    done( new Error('boo!') ); // no, the component failed to d-initialize!

  }
  
}

module.exports = SomeComponent;

```

Here we see an ES6 style class named `SomeComponent` with a constructor and two methods: `init()` and `dinit()`. We also 
see that the only thing exported by the NodeJS module is the `SomeComponent` class.

The constructor is passed one value: deps. This is short for dependencies. You can name it whatever you want in your 
code. Just remember that the first and only parameter passed in is a StringStack dependency container. More on the this
later.

The two methods, `init()` and `dinit()` are each passed a callback function. Again, you can name this callback function
whatever you like, but the first and only parameter passed in is the done callback. If your component passes an instance
of `Error` class to `done()`, then all initialization will stop and core will exit with an error.

#### Form 2 - Object Literal

(Deprecated) This interface leads to issues when users try to do testing, because testing typically involves creating
multiple instances of App class and initializing over and over to test different things. We are going to get rid of this
interface in a future release soon. Don't use it!

```javascript

let SomeComponent = {
  
  load: (deps) => {
    
  },
  
  init: (done) => {

    done();  // yay the component initialized!
        
    // OR
      
    done( new Error('boo!') ); // no, the component failed to initialize!

  },
  
  dinit: (done) => {

    done();  // yay the component d-initialized!
        
    // OR
      
    done( new Error('boo!') ); // no, the component failed to d-initialize!

  }
  
}

module.exports = SomeComponent;

```

An object literal looks almost like the ES6 form except for two distinct differences. First, object literals don't have
constructors, so we use a `load()` method to pass in dependencies. Second, only one object literal will exist for this
component (global singleton) since StringStack will not instantiate this object with the `new Class()` syntax. 
Otherwise the semantics of loading components of either form are identical. 

Note: If you create multiple instances of the App class, they will all load and init the same instance of this object. 
This is because it is an object literal and only one exists in the entire Node.js process. 


#### Form 3 - JSON

The final form is completely different than the other two forms. It is not instantiated, initialized or d-initialized. 
This form is for including JSON files. The files are parsed and returned as native javascript data structures. For 
example, in any component you could call `deps.get( './meta/some-data.json' )` and this would return the parsed 
contents of the meta/some-data.json file for your application, assuming your current working directory is where your the
meta directory lives. This is a great way to load config or other meta data. 

Note: This will throw an exception if the contents of the target file does not parse with JSON.parse().

### Interface Methods

The methods of each of the first 2 forms are constructor, init, dinit; and load, init, dinit; respectively. The 
constructor and load methods both accept a dependency container. The dependency container has two methods `get( path )` 
and `inject( path )`. Path is a string containing the path of the component to be retrieved. See the 
[Path Resolution](#path-resolution) section in this document to know how paths are resolved. The difference between the 
two methods is whether the calling component depends on the target, or if the calling component is injecting itself as a
dependency of the target path. 

get( path ): This instructs the dependency management system that the calling component depends on the component 
identified by path. That is, StringStack will ensure that the component identified by path is initialized BEFORE the
component calling get is initialized. Similarly, it will ensure that the component that called get is d-initialized 
BEFORE the component identified by path is d-initialized.

inject( path ): This instructs the dependency management system that the calling component must be injected as a 
dependency of the component identified by path. See the section on configuration for an example of why this might be 
useful. StringStack will ensure that the component identified by path is initialized AFTER the component calling get is 
initialized. Similarly, it will ensure that the component that called get is d-initialized AFTER the component 
identified by path is d-initialized. 

Each component MUST get all of its dependencies in its constructor or load method. If you attempt to get a dependency 
outside of one of these methods an exception will be thrown by the container. 

Each of the `init()` and `dinit()` methods are optional. But, if your component does define either method your component 
MUST call the done method passed once your component is ready for all dependent components to start using it. If you 
omit one of the methods, StringStack simply considers the component immediately initialized or d-initialized.

Learn more about when things are instantiated, initialized, d-initialized, etc in the section 
[StringStack Life Cycle](#stringstack-life-cycle).

For an imaginary database component you might want to create, it could look something like this.

```javascript

const SomeDatabaseDriver = require('somedatabase');

class SomeDatabaseComponent {
  
  constructor(deps) {
    this._config = deps.get('config').get('database'); // .get('config') returns the instance of nconf
    this._handle = new SomeDatabaseDriver(this._config);
  }
  
  init(done) {
    this._handle.connect(done);
  }
  
  dinit(done) {
    this._handle.disconnect(done);
  }
  
}
  
  
module.exports = SomeDatabaseComponent;

```

### Dependency Container

Every component that has a constructor or load method gets a dependency container passed in as the only parameter. This 
section will describe how to use that container. 

The dependency container is how any component loads any string stack resource. This includes:

* Built-in String Stack Resources
    * env: A string containing the environment name passed to App class during instantiation.
    * logger: Method that accepts level (string), message (string) and meta (optional:object || Error instance) to log 
    to
    * config: An empty instance of nconf. It is up to your components to setup this object. Typically you would
    bootstrap a configSetup component, and configSetup would call deps.inject( 'config' ) to populate config with values
    before any other component calls deps.get( 'config' ) to access config values. 
       
* 3rd party components are loaded through NPM and are identified by their package name from your package.json file.

* Your custom components. You access all your components in your code base through the dependency container.

You MUST access the dependency container in your constructor. Extract all dependencies via the .get() or .inject() 
methods in your constructor and store them on your object. Do not use any of the dependencies until init() is called
on your component. 

Side note: you can still have traditional require() methods at the global level of your component, but those resources
will load outside of StringStack. It is up to you to handle those resources. 

Learn more about when things are instantiated, initialized, d-initialized, etc in the section 
[StringStack Life Cycle](#stringstack-life-cycle).

#### get() Method

This is how your component accesses a component it needs and at the same time tells StringStack, "The component I am 
asking for needs to be initialized before I am initialized". It also tells StringStack, "I need to be d-initialized 
before the component I am accessing here".

The method will return an instantiated instance of the component synchronously. If you load a json file, the file is
already parsed and you can access contents immediately. This is the ONLY resource type you can access immediately inside
your constructor and before init() is called on your component. 


#### inject() Method

This method is nearly identical to get(). The only difference is what your are telling StringStack about what is 
dependent on what. With .get(), you are telling StringStack that code calling .get() is dependent on the target path 
passed to get(). With inject, you are telling StringStack that the code calling inject() is depended on by the target
path.

##### Example Populating Config

Why would you need this? This is for configuring built-in and 3rd party components. For example, the config component
is built in to StringStack. You can't access the constructor in the config component and tell it that you want the
config component to init after your custom configSetup component. Lets say you are using StringStack/mongo, a 3rd party
component. StringStack/mongo will check for its config in a special place by in deps.get( 'config' ). This means that
StringStack will not initialize StringStack/mongo until config is initialized. If you call deps.inject( 'config' ) in
your custom configSetup component, then StringStack will initialize all three components in this order:

configSetup, config, StringStack/mongo

That guarantees the config values are in place before StringStack/mongo looks for them.

##### Example Setting Up Express Routes

Similarly, with a 3rd party component, such as StringStack/express, you would want to setup all your express routes 
before StringStack/express initializes and opens up a port to accept HTTP traffic. You would ensure your expressSetup
component initializes first by having expressSetup call deps.inject( 'StringStack/express' ). Then, expressSetup
can initialize all the HTTP routes before any HTTP ports are opened. 

## Bootstrap Yo' App

(Finally, something that does rhyme!)

Ok, so you build a bunch of components, now what? This... This is what....

1. Create an instance of StringStack/core.
1. call core.createApp() to create an App class that starts and stops your application.
1. Instantiate App class.
1. Call app.init().
1. When its time to shutdown, call app.dinit().

Aside from the completely made up names for root components, this is all the code you need to bootstrap a production 
system.

```javascript
 
const Core = require( '@stringstack/core' );
 
let core = new Core();
 
const App = core.createApp( {
  rootComponents: [
    './lib/some-component-a',
    './lib/some-component-b',
  ]
} );
 
// you can just pass process.env.NODE_ENV, or any other thing to identify env name
let app = new App( 'production' );

function dinit() {

  app.dinit( (err) => {

    if (err) {
      console.error('something went wrong, the app may not have shutdown correctly', e);
    } else {
      console.log('the node process should exit after this statement prints!');
    }
  
    process.exit();

  } );

}


app.init( (err) => {
  
  if (err) {
  
    // initialization bails on first thrown exception or callback that returns an Error. Handle error and shutdown
    console.error('something went wrong', e);
    dinit(); // its ok to d-init even though init failed. Only the initialized components will get d-initialized. 

  } else {
    console.log('app is up and running!');
  }
  
});
 
// Its up to you to manage these signals. See the section on Daemonix below for a recommendation on how to properly 
// handle shutdown signals, as well as some other nifty process management features.
onSomeProcessShutdownSignal( dinit );
 
```

### Create App and App Class Interfaces

Here we describe the interfaces for the Core.createApp() method and the App class returned from createApp().

#### Core.createApp()

The job of createApp() is to create an App class that controls your code. The method accepts a single object parameter
of the form:

```javascript
let params = {
  "log": function ( level, component, message, meta ) {
    // wire this up to Winston, or whatever you log with.
  },
  "rootComponents": [
    // A list of component paths to load. 
  ] 
};
```

##### Log Method

The log method handles logging calls routed from all components. It is up to each component to determine how it logs.
Including log level semantics, what to put in the message, and if it wants to pass meta data.
 
For the most part the log values passed from the component are the same values that arrive at this handler. See the 
details below to see exactly how each value works.

The log method accepts the following four parameters:

level: This can be any string. StringStack/core will force it to lowercase, so it is a little opinionated about that.
Otherwise it will pass through directly to your log handler from each component. 

component: This is a string value of the component path. This is the same string value you would use to load the 
component via deps.get() in your constructor. It is provided by StringStack/core automatically. 

message: This should be a string. It is up to your components to use message correctly. 

meta [optional]: Should be a serializable object or an instance of Error. It is up to your component to use this field
correctly.

Note: 3rd party components will write log entries to this same log handler. It is up to your handler to handle them 
correctly. A well written component will document it's log levels, message types, etc. Your handler could look at the
component value to determine if the incoming log entry is from a 3rd party component and needs modification for your 
logging facility. 

#### rootComponents

This is an array of component paths for the components that will bootstrap your entire application stack. Typically you
would specify at least a config setup component that populates the config object, and an app setup component that starts
loading your actual application code. Each string in this array is a path to a component. See the section 
[Path Resolution](#path-resolution) for details on how to craft those strings.

Learn more about when things are instantiated, initialized, d-initialized, etc in the section 
[StringStack Life Cycle](#stringstack-life-cycle).

#### App Class

The App class returned by createApp() is a very simple interface. The constructor accepts a single string for the name
of the environment where the app is running. Traditionally node processes are provided the name of their environment
via the environment variable NODE_ENV. So, you could just instantiate app with:

```javascript 
new App( process.env.NODE_ENV )
```

For the production load of your app this is probably fine. For testing you will likely just hard code 'test' for your 
environment name when you instantiate App.

The instance of App will have two methods you will use for normal production: init() and dinit(). These methods will
initialize and d-initialize the instance of App respectively. 

Learn more about when things are instantiated, initialized, d-initialized, etc in the section 
[StringStack Life Cycle](#stringstack-life-cycle).

## StringStack Life Cycle

StringStack will instantiate, initialize and d-initialize each of your components, and all 3rd party components you load
in a very specific manner. The goal of this semantic is to ensure a few things:

1. Your dependencies are 100% ready to be used anytime your component is initialized. That is, it ensures graceful 
propagation of start and stop signals of your application. 
2. Prevents cycles in your dependency graph. Cycles in dependencies create unmanageable code. (Spaghetti code) 
3. Promotes strong modularization of code and DRY patterns.
4. Enables considerably easier testing of your code since dependencies are injected via constructor or load methods.

Before we go on, a note on ES6 classes vs object literals. When we use the term 'instantiation', this refers to calling
`new SomeComponent(deps)` on a component of the ES6 class variety, or to calling `load(deps)` on the object literal 
variety. Note that object literal component format is now deprecated. See the section 
[Form 2 - Object Literal](#form-2---object-literal) for explanation on the rational for removing that form. 

When StringStack core is instantiated, you pass in the root components. These are the top of your dependency graph. 

Here we are passing in two root components. The order matters. StringStack instantiates components in depth-first order.

That is, say you have a dependency tree like this:

```
Core
|_ A
|  |_C
|_ B
   |_D
     |_E
```

The components will be instantiated in this order: A, C, B, D, E. Instantiation order is pretty straight forward. 
Initialization, is a little less straight forward. Initialization is the process of calling `init()` on each component.
Recall that one of the goals of StringStack is to ensure all dependencies of a component are ready to accept requests
once `init()` is called on a component. That is, in our sample dependency graph, `B.init()`, will not be called until 
`D.init(done)` is called and `done()` is returned. Similarly, `D.init()` will not be called until `E.init(done)` is 
called and `done()` is returned. In the case of this graph, the initialization order would be E, D, B, C, A. 

For the case of d-initialization, the order is again simple, sorta. Components are d-initialized in reverse order of
initialization. For the above graph that would be A, C, B, D, E. But wait, isn't that just the instantiation order? In
this case it is. But it won't always be the same. Let us add another dependency to our example. Many applications use
a database. Furthermore, the database may be utilized at multiple levels in a dependency graph. Lets add one to our 
example.

```
Core
|_ A
|  |_C
|    |_DATABASE
|_ B
   |_D
     |_E
       |_DATABASE
```

Now we have both C and E components including DATABASE as a dependency. The instantiation order is now:

A, C, DATABASE, B, D, E. 

Notice that DATABASE is only instantiated once. E will be passed the same instance of DATABASE that was passed to C.
As for initialization order we have:

DATABASE, E, D, B, C, A

And for d-initialization we have:

A, C, B, D, E, DATABASE

Why?! The reason being is that during instantiation each component is simply declaring its dependencies. Nothing is 
going to start running yet. Its just depth-first order. Really, any order would be fine. Depth-first order is simply the
easiest order to implement and so we use it. Initialization is where order starts to matter because the moment `init()` 
is called on a component, that component MUST be able to start using all of its dependencies immediately. Since both C 
and E depend on DATABASE, DATABASE MUST be initialized before either C or E gets initialized. Although in this 
particular example there are more than one stable initialization orders, that will not always be the case for all 
examples. For example, this order would also work for this example:

DATABASE, C, E, A, D, B

The problem is this order is virtually random with a few constraints. It is not a consistent algorithm. The algorithm 
used by StringStack is reverse depth-first order, as apposed to the reverse of depth-first order. Finally, 
d-initialization is just the reverse of initialization order.

Finally, a component may include as many dependencies as is needed. Take for example this dependency graph.

```
Core
|_ A
   |_ B
   |  |_D
   |  |_E
   |_ C
      |_F
      |_G
```

The instantiation, initialization and d-initialization orders are:

Instantiate: A, B, D, E, C, F, G

Initialize: G, F, C, E, D, B, A

D-initialize: A, B, D, E, C, F, G

### Cheat Sheet

This is a short hand reminder of everything you need to know for the order things occur in StringStack.

1. Your code calls: ```let App = core.createApp();```
1. Your code instantiates App: ```let app = new App( env );```
    1. StringStack: sets up the global log handler and puts it in the global dependency container as ```logger```.
    1. StringStack: App creates an empty instance of nconf and puts it in the global dependency container as 
    ```config```.
    1. StringStack: App sets the ```env``` value in the global dependency container.
    1. StringStack: Instantiates each ```root component``` in order
        1. Each root component may call ```deps.get()``` or ```deps.inject()```. If any component, including a root 
        components, calls ```deps.get()``` or ```deps.inject()```, the target path component of that call will get 
        instantiated immediately if it hasn't already been instantiated by another component. So the loading of 
        components is a depth first, recursive instantiation of dependencies. If a dependency cycle is detected, 
        StringStack will throw an Error.
    1. Once all root components have been instantiated, and thus all their upstream dependency trees have also been 
    instantiated, the constructor for App returns. 
    1. If any component tries to call ```deps.get()``` or ```deps.inject()``` after this point an Error will be thrown.
1. Your code calls: ``` app.init( (err) => { } );```
    1. If an err is returned, your app did not finish initializing. You could attempt a dinit() then process.exit(), or 
    just process.exit().
    1. StringStack: Asynchronously initializes all components by calling ```init( done )``` on each component. The order 
    depends on what components called ```deps.get()``` and which called ```deps.inject()```. But you can be assured that 
    if your component called deps.get( target ), then target was initialized before your component was initialized. If 
    your component called deps.inject( target ), then target won't be initialized until your component finishes 
    initialization.
1. Your app is now running. StringStack is no longer involved except for routing logging calls to your handler. The 
performance of your application is 100% based on the quality of your code.

After some time, its time for your code to shutdown. Maybe it is a Ctrl+C signal or the server is shutting down, or
an uncaught exception handler is causing the system to shutdown. This is the d-initialization life cycle.
 
1. Your code responds to the shutdown request and calls: ``` app.dinit( (err) => { } );``` 
    1. StringStack: Asynchronously d-initializes all components. The order is exactly the reverse of initialization 
    order. This ensures that, for example, you stop accepting new web requests, and let existing web requests finish
    before you close your connection to the database. 
    1. If you get an error, you could log it, or not, but either way call process.exit() once the callback to dinit() is
    fired.     
         

## Path Resolution

Path resolution in StringStack is very similar to native NodeJS `require(path)`. The only exception is for relative
include paths. That is, for paths that begin with `./` or `../`, StringStack will prefix the path with the current
working directory of your process. If your current working directory is `/src/app`, then `./lib/thing` becomes 
`/src/app/./lib/thing`, and `../lib/thing` becomes `/src/app/../lib/thing`. In both cases, the new path is passed
directly to native `require(path)`. 

All other paths which do not start with `./` or `../` are passed directly to native `require(path)` un-modified.

There is one caveat to everything just mentioned. Any include path that ends in `.js` is also modified and the trailing
`.js` is removed. This is because NodeJS doesn't require it and StringStack thinks there should be no difference in 
path for components that are a single file, or components that are a directory with an index.js file in it.

## Configuration

StringStack/core has a built in configuration place. It is implemented with [nconf](https://www.npmjs.com/package/nconf)
. The current version of nconf being used is v0.10.0. 

You can access the nconf instance with the dependency container in the constructor of your component.

```javascript
  let config = deps.get( 'config' );
```

The nconf instance is a raw instance of nconf's provider class. We create an instance of nconf so that we don't use a 
global, configuration singleton. Essentially we create the nconf instance like this.

```javascript
  let config = new require( 'nconf' ).Provider;
```

That is all that is done. It is up to you to initialize the instance. Keep in mind that nconf is geared more toward 
synchronous loading of config, so you will need to trigger the loading and parsing of config resources in a constructor
of one of your custom components. It is recommended that you create a config setup component that is loaded as one of 
the root components passed to ```rootComponents``` field passed to ```createApp()```. A config setup component would 
do something like this.

```javascript

  const request = require( 'request' );
  
  class SetupConfig {
    
    constructor(deps) {
      
      // using inject vs get injects SetupConfig as a dependency of config. The nConf instance is still returned, but
      // this means that SetupConfig will get initialized before config, and thus before anything that loads config
      // using deps.get( 'config' ). For example, all StringStack/* components will load config with get(), this means
      // that the SetupConfig.init() method will run before say StringStack/express.init(). That allows you to pull down 
      // config asynchronously from some remote location, such as we do here inside the example init() method. Config 
      // will then be available before StringStack/express.init() method is called.
      this._config = deps.inject( 'config' );
        
      // This is where you would do the synchronous config loads. If your configs are local, loading synchronously in 
      // the constructor will make that config available immediately to all components in your application.
      //
      // You should consult documentation for nconf v0.10.0 for reference https://www.npmjs.com/package/nconf
      this._config
        .argv()
        .env()
        .file({ file: 'path/to/config.json' });
      
    }
    
    init(done) {
      
      // If you need to load config asynchronously, do it in the init method. That way all dependencies should wait
      // until init is called to pull their values. 
      request.get( 'http://some.config.server.com/app.json', (err, response, body) => {
        
        if (err) {
          return done(err);
        }
        
        body = JSON.parse( body );
        
        // You should consult documentation for nconf v0.10.0 for reference https://www.npmjs.com/package/nconf
        this._config.set('some.path', body);
        
        done();
        
      } );
      
    }
    
    // ...
    
  }
  
  module.exports = SetupConfig;

```

### Configuration for 3rd Party Components

One of the values of StringStack is the ability to include 3rd party libraries into your stack. Many of these 3rd party 
libraries, such as StringStack/express, will require config. Each of these components will specify where they will look
for config within the nconf component.

See the documentation of each 3rd party component to know how to configure them.

## Logging

StringStack/core provides a logging router that you can use to tap into your favorite logging tool. Simply pass a 
logger function to the config for createApp() and get all the log writes from all components. You could wire up Winston
like this.

Note that the fields passed to the logging function are:

level: This is a string. Your custom components can pass anything your logger understands. All @StringStack/* community 
components will use log levels as prescribed by https://www.npmjs.com/package/winston#logging-levels 

component: This is the string name of the component that triggered the log event. The dependency injector will provide 
this field for you. The logging function passed into your component will only accept level, message and meta.
 
message: This is a string containing a message describing the event.

meta: This is any value you want to associate with your message. @StringStack/* components may pass instances of Error 
as meta or an object that can be serialized with JSON.stringify(). 

```javascript
 
const Core = require('@stringstack/core');
const Winston = require( 'winston' );

// log to stdout/stderr
let winston = new (Winston.Logger)( {
  transports: [
    new Winston.transports.Console( {
      timestamp: true,
      colorize: true,
      level: process.env.NODE_LOG_LEVEL || 'info' // default to info, unless environment overrides
    } )
  ]
} );

let winstonLogger = function ( level, component, message, meta ) {
                 
  // pass the event to your favorite logger, such as https://www.npmjs.com/package/winston OR, just console it.
  
  if ( meta instanceof Error ) {
   meta = ` ${message.message}: ${message.stack}`;
  }
  
  winston.log( level, `[${process.pid}] ${component}: ${message}: ${typeof meta === 'string' ? meta : JSON.stringify( meta )}`);
                 
}

let core = new Core();

const App = core.createApp( {
  log: winstonLogger,
  rootComponents: [
    // ...
  ]
} );
 
// daemonix also has a log facility which could easily be used in conjunction with your StringStack/core app
const daemonix = require( 'daemonix' );
 
daemonix( { 
  app: App,
  log: function (level, message, meta) {
    winstonLogger(level, 'daemonix', message, meta);
  }
} );
 
```

The handler function will receive a log level, the full path to the component triggering the log event, a string message
and an optional meta object with relevant data about the log message. Meta might be an instance of Error, a random 
object literal, or some other piece of data to describe the log event beyond the message.

The component loader and the generated app, both parts of StringStack/core, will generate some log entries, as well as
all StringStack/* components built by the StringStack team. The log events generated will conform to the following
practices as it pertains to log level. We use the same log level semantics recommended by RFC5424, 
https://www.npmjs.com/package/winston, and Linux' syslog. 

```json
{ 
  emerg: 0, // emergency: System is unusable. Complete system failure.
  alert: 1, // alert: Action must be taken immediately. Potential data loss or curroption eminent.
  crit: 2, // critical: Major system component failing, such as device IO error, network unreachable, etc.
  error: 3, // error: An error occurred, but the system should be able to keep running otherwise.
  warning: 4, // warning: Something less than ideal occurred, deprecated function call, bad request, etc.
  notice: 5, // notice: Something significant happened, but is not a problem. This is startup, shutdown, etc.
  info: 6, // information: Something common happened, is not a problem. 
  debug: 7, // debug: Tracking as much detail as possible on the actions of the code, incudling sensative data.
  silly: 8 // silly: Tracking every detail of code, including sensative data. 
}
```

The recommended frequency with which log level should be called is as follows.


```json
{ 
  emerg: 0, // emergency: Should trigger at any time, and should be logged any time it happens.
  alert: 1, // alert: Should trigger at any time, and should be logged any time it happens.
  crit: 2, // critical: Should trigger at any time, and should be logged any time it happens.
  error: 3, // error: Should trigger at any time, and should be logged any time it happens.
  warning: 4, // warning: Should trigger at any time, and should be logged any time it happens.
  notice: 5, // notice: Should only trigger a finite amount of time relative to process lifetime and to a given time window. Should not fire with frequency congruent with system load.
  info: 6, // information: Should only trigger a finite amount of time relative to system load. Where notice rate < frequency rate <= load/N, where N is some real number. 
  debug: 7, // debug: May trigger with every system event with frequency >= load * N, where N is some real number.
  silly: 8 // silly: Will trigger multiple times with every event with frequency >= load * N, where N is some real number > 1.
}
```

Recommended actions for each log level are as follows.


```json
{ 
  emerg: 0, // emergency: Shutdown the system and investigate. 
  alert: 1, // alert: Shutdown the system and investigate. 
  crit: 2, // critical: Shutdown the system and investigate. 
  error: 3, // error: Investigate the error.
  warning: 4, // warning: Investigate the warning.
  notice: 5, // notice: Nothing, non-problem event.
  info: 6, // information: Nothing, non-problem event. 
  debug: 7, // debug: For development and debuging only. Do not run in production under normal conditions.
  silly: 8 // silly: For development and debuging only. Do not run in production under normal conditions.
}
```

### Logging from Custom Components

Accessing the logging function from within your custom component is accomplished like this. Most components will tell
you when they are ready to run. Logger is available immediately in your constructor.

```javascript

class CustomComponent {
    
    constructor( deps ) {
      
      this._log = deps.get( 'logger' );
      
      this._log( 'info', 'I got my logger!' ); // notice you don't have to supply the component name
      
    }
    
    // ...
    
    someMethod( done ) {
      
      somethingElse( ( err ) => {
      
        if ( err ) {
          this._log( 'err', 'Error doing somethingElse', err );
        } else {
          this._log( 'debug', 'somethingElse returned fine' );
        }     
        
        done( err || null );
        
      })
      
      
    }
    
  }
  
  module.exports = CustomComponent;

```

## Daemonix for Creating Proper Linux Services

If you are running your application on a Linux/Mac/BSD/Unix/etc based system, including containers or app engines, we 
recommend using Daemonix for handling OS process signals and properly daemonizing your NodeJS application. Daemonix also
has built in cluster management. It can be configured to automatically select the correct cluster size based on number
of CPU cores, or you can manually specify the number of cores to use. 

Check it out https://www.npmjs.com/package/daemonix

With Daemonix you can run your entire StringStack application like this.

```javascript
 
const Core = require('@stringstack/core');
 
let core = new Core();
 
const App = core.createApp( {
  rootComponents: [
     './lib/setup.config',
     './lib/custom-component-a',
     './lib/custom-component-b',
  ]
} );
 
const daemonix = require( 'daemonix' );
 
daemonix( { app: App } );
 
```
