/**
 * ajaxthrottle.js
 * 
 * Usage:
 * 
 *     var t = $.ajaxthrottle({
 *        numRequestsPerTimePeriod : N,
 *        timePeriod               : P,
 *        maxConcurrent            : M
 *     });
 *    
 *     t.ajax(args);
 *
 * This is just like calling $.ajax(args), except that requests are throttled
 * so that no more than N are initiated in any time period of P milliseconds,
 * and no more than M concurrent (outstanding at the same time) requests are allowed.
 * If N or P is 0, there is no time period based constraint, and if M is 0, there
 * is no constraint on the number of concurrent requests.
 * 
 * Mark Phillips <mphillip@unca.edu>
 * Thu Dec 20 11:04:19 2012
 */
(function($) {
    $.ajaxthrottle = function(options) {

        var timeout,

            settings = $.extend({
                numRequestsPerTimePeriod : 0,
                timePeriod               : 0,
                maxConcurrent            : 1
            }, options),

            time = function() {
                return (new Date()).getTime();
            },

            // Array of outstanding requests; these are requests that have
            // been initiated with a call to $.ajax() but that have not
            // completed yet.  Each entry in this array is an object of the form
            //    {
            //         arguments: the original arguments list passed to .ajax()
            //              time: the time this request was passed to $.ajax()
            //          deferred: the jQuery deferred object for this request
            //    }
            outstanding_reqs = [],

            // Array of initiated requests; each entry in this array
            // is an object just like the ones in the outstanding_reqs
            // array above, but this array keeps track of all
            // requests, regardless of whether they have completed.
            // This list is used to keep track of how many requests
            // have been initiated in settings.timePeriod.  Requests
            // that are older than settings.timePeriod milliseconds
            // get removed from this list when it is purged.
            initiated_reqs = [],

            // Array of requests waiting to be initiated
            waiting_reqs = [],

            // Purge the initiated reqs list so that it doesn't contain any
            // reqs from more than settings.timePeriod ms ago.  Return the
            // amount of time that needs to be waited until the oldest remaining
            // (after purging) req in the list will be settings.timePeriod ms old.
            // Do all of this relative to the passed in 'now' value.
            purge_initiated_reqs = function(now) {
                if (settings.timePeriod >= 0) {
                    while ((initiated_reqs.length > 0)
                           &&
                           (initiated_reqs[0].time + settings.timePeriod - now <= 0)) {
                        initiated_reqs.shift();
                    }
                    if (initiated_reqs.length > 0) {
                        return initiated_reqs[0].time + settings.timePeriod - now;
                    }
                }
                return 0;
            },

            // remove a req from the outstanding_reqs list
            remove_outstanding_req = function(obj) {
                $.each(outstanding_reqs, function(i) {
                    if (outstanding_reqs[i] === obj) {
                        outstanding_reqs.splice(i,1);
                        return false;
                    }
                    return true;
                });
            },

            // Initiate the next request on the waiting list, unless we need to wait
            // till some time has passed or some outstanding requests have completed.
            process_waiting = function() {
                var now = time(),
                    delay, req, deferred;

                if (waiting_reqs.length <= 0) {
                    return;
                }

                delay = purge_initiated_reqs(now);

                // If we have a timePeriod constraint, and the max number of allowed
                // requests have gone out in that time period, arrange to wait for
                // 'delay' ms
                if ((settings.numRequestsPerTimePeriod > 0) && (settings.timePeriod > 0)
                    &&
                    (delay > 0)
                    &&
                    (initiated_reqs.length >= settings.numRequestsPerTimePeriod)) {
                    // clear any existing timeout first, because this one will
                    // require waiting till after it would finish anyway
                    if (timeout !== undefined) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(function() {
                        timeout = undefined;
                        process_waiting();
                    }, delay);
                    return;
                }

                // If the max number of allowed requests is outstanding, do nothing;
                // process_waiting() will get called again when a request completes.
                if ((settings.maxConcurrent > 0)
                           &&
                           (outstanding_reqs.length >= settings.maxConcurrent)) {
                    return;
                }

                // If we make it to here, then it's OK to initiate the next
                // request in the waiting list
                req = waiting_reqs.shift();
                req.time = time();
                initiated_reqs.push(req);
                outstanding_reqs.push(req);
                $.ajax.apply($,req.arguments).done(function() {
                    req.deferred.resolve.apply(req.deferred, arguments);
                }).fail(function() {
                    req.deferred.reject.apply(req.deferred, arguments);
                }).always(function() {
                    remove_outstanding_req(req);
                    process_waiting();
                });
                
            }
        ;

        return {
            ajax : function() {
                var deferred = $.Deferred();
                waiting_reqs.push({ arguments : arguments, deferred : deferred });
                process_waiting();
                return deferred.promise();
            }
        };
    };
}(jQuery));
