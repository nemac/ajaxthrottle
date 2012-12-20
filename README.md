ajaxthrottle.js
===============

Ajaxthrottle is a little jQuery plugin that can be used as a replacement for $.ajax()
in situations where you need to control the rate at which $.ajax() is called.

Use it like this:

    var t = $.ajaxthrottle({
       numRequestsPerTimePeriod : N,
       timePeriod               : P,
       maxConcurrent            : M
    });
    
This creates a "throttle" object `t` with an `ajax()` method that can be called
with exactly the same arguments accepted by `$.ajax()`.  The throttle object
delegates `t.ajax()` calls to `$.ajax()`, but queuing them up and delaying
them, as needed, in order to ensure that:

 * No more than N requests are initiated within P milliseconds of each other, and
 * No more than M concurrent (outstanding at the same time) requests are allowed
 
Calls to `$.ajax()` are issued in the same order that call to `t.ajax()`
occur, but with delays as needed to ensure the above constraints are met.

If N or P is 0, there is no time period based constraint, and if M is 0, there
is no constraint on the number of concurrent requests.

The defaults are N=P=0 and M=1, so `$.ajaxthrottle()` returns a throttle that
will sequence requests one after the other -- each request goes out when the
previous one completes.

`t.ajax()` returns a promise object that can be used in the same way
as the promise interface (.done(), .fail(), .always() methods) in the
return value of '$.ajax()'.

Requirements
------------

Ajaxthrottle depends on jQuery and assumes that jQuery has been loaded
before ajaxthrottle.js is loaded. Ajaxthrottle was written for jQuery 1.8.2;
it will probably work with older versions of jQuery, but I haven't tested it.

Installation
------------

Just grab the file *ajaxthrottle.js* from the *src* directory and load
it in your page, after jQuery has been loaded.  (The stuff in the
*lib* and *spec* directories is only used for development and testing
of ajaxthrottle itself and isn't needed by applications that use
ajaxthrottle.)

Examples
--------

Send 10 requests, no more than 2 in any 5 second period, no more than
3 outstanding at any one time:

    var t = $.ajaxthrottle({
       numRequestsPerTimePeriod : 2,
       timePeriod               : 5000,
       maxConcurrent            : 3
    });
    var i;
    for (i=0; i<10; ++i) {
        t.ajax({ url : 'http://www.example.com/page' + i,
             success : function(data) {
                 console.log('got response: ' + data);
             }});
    }

Send 10 requests, one after the other (wait for each request
to complete before sending the next), using the promise interface:

    var t = $.ajaxthrottle({
       numRequestsPerTimePeriod : 0,
       timePeriod               : 0,
       maxConcurrent            : 1
    });
    var i;
    for (i=0; i<10; ++i) {
        t.ajax({ url : 'http://www.example.com/page' + i}).done(function(data) {
            console.log('got response: ' + data);
        });
    }
