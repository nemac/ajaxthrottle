/*

 q = ajaxQueue({
   numRequestsPerTimePeriod: N,
                 timePeriod: P,
              maxConcurrent: M
 });

 q can be used to issue ajax requests, and it will queue them up as needed in order
 to ensure:

 * if N > 0 and P > 0, no more than N requests are initiated in any time period of
 P seconds.  If either N or P is <= 0, there is no restriction on the rate
 at which requests are INITIATED.
 * if M > 0, no more than M requests may be outstanding at any one time.  If M <=0,
 there is no limit to the number of concurrent requests that may be outstanding.

 q.ajax(req)
 Returns a promise that can be used just the same as if $.ajax(req) was called,
 but queues requests as needed to make sure the conditions above are met.

 */

(function($) {
    window.jsthrottle = function(options) {
        var time = function() {
            return (new Date()).getTime();
        };
        return {
            options : $.extend({
                // default is one request at a time, no time limit
                numRequestsPerTimePeriod : 0,
                timePeriod               : 0,
                maxConcurrent            : 1
            }, options),

            // Array of outstanding requests; these are requests that have neither
            // completed nor timed out yet.  Each entry in this array is
            // an object of the form
            //    {  request: the request object,
            //          time: time request was sent }
            outstanding_requests : [],

            // Array of initiated requests; each entry in this array is an
            // object just like the ones in the outstanding_requests
            // array.  This lists keeps track of initiated requests,
            // regardless of whether they have completed or timed out.
            // This list is used to keep track of how many requests have
            // been initiated in P seconds.  Requests are removed from
            // this list when they are at least P seconds old (although
            // the removal doesn't happen until another request comes in).
            initiated_requests : [],

            // Array of requests waiting to be initiated
            request_queue : [],

            // Purge the initiated requests list so that it doesn't contain any
            // requests from more than options.timePeriod seconds ago, relative
            // to the 'now' time value passed in.  Return the amount of time that
            // needs to be waited until options.timePeriod seconds have passed
            // after the initiation time of the first remaining (after purging)
            // request in the list.
            purge_initiated_requests : function(now) {
                if (options.timePeriod >= 0) {
                    while ((this.initiated_requests.length > 0)
                           &&
                           (this.initiated_requests[0].time + options.timePeriod - now <= 0)) {
                        this.initiated_requests.shift();
                    }
                    if (this.initiated_requests.length > 0) {
                        return this.initiated_requests[0].time + options.timePeriod - now;
                    }
                }
                return 0;
            },

            remove_outstanding_request : function(obj) {
                var that = this;
                $.each(this.outstanding_requests, function(i) {
                    if (that.outstanding_requests[i] === obj) {
                        that.outstanding_requests.splice(i,1);
                        return false;
                    }
                    return true;
                });
            },

            process_queue : function() {
                var that = this,
                    now = time(),
                    delay, request, obj, deferred;

                delay = this.purge_initiated_requests(now);
                if (delay > 0 && this.initiated_requests.length >= options.numRequestsPerTimePeriod) {
                    // call process_queue() again after delay
                    setTimeout(function() {
                        that.process_queue();
                    }, delay);
                } else if ((options.maxConcurrent > 0)
                           &&
                           (this.outstanding_requests.length >= options.maxConcurrent)) {
                    // The max number of allowed requests is outstanding, so do nothing.
                    // process_queue() will get called again when a request completes.
                } else {
                    if (this.request_queue.length > 0) {
                        request = this.request_queue.shift();
                        request.time = time();

                        this.initiated_requests.push(request);
                        this.outstanding_requests.push(request);
                        $.ajax(request.ajaxoptions).always(function() {
                            that.remove_outstanding_request(request);
                            that.process_queue();
                        }).done(function() {
                            request.deferred.resolve.apply(request.deferred, arguments);
                        }).fail(function() {
                            request.deferred.reject.apply(request.deferred, arguments);
                        });
                    }
                }
            },

            ajax : function(ajaxoptions) {
                var deferred = $.Deferred();
                this.request_queue.push({ ajaxoptions : ajaxoptions, deferred : deferred });
                this.process_queue();
                return deferred.promise();
            }
        };
    };
}(jQuery));
