/*global describe, it, beforeEach, expect, xit, jasmine */

describe("jsThrottle", function () {
    "use strict";

    var typeOf = function(value) {
        var s = typeof value;
        if (s === 'object') {
            if (value) {
                //NOTE: Crockford used "=="   ?????!!!!!  mbp Fri Sep 28 08:44:34 2012
                //if (Object.prototype.toString.call(value) == '[object Array]') {
                if (Object.prototype.toString.call(value) === '[object Array]') {
                    s = 'array';
                }
            } else {
                s = 'null';
            }
        }
        return s;
    };

    var time = function() {
        return (new Date()).getTime();
    };
    
    var th;

    var timePeriod = 1000;
    
    beforeEach(function () {
        th = jsthrottle({
            numRequestsPerTimePeriod : 2,
            timePeriod               : timePeriod,
            maxConcurrent            : 3
        });
    });

    it("should be able to create a jsthrottle", function () {
        expect(th).not.toBeUndefined();
    });
    it("should have correctly initialized properties", function () {
        expect(typeOf(th.outstanding_requests)).toBe("array");
        expect(th.outstanding_requests.length).toBe(0);
        expect(typeOf(th.initiated_requests)).toBe("array");
        expect(th.initiated_requests.length).toBe(0);
        expect(typeOf(th.request_queue)).toBe("array");
        expect(th.request_queue.length).toBe(0);
        expect(typeof(th.ajax)).toBe("function");
        expect(th.options.numRequestsPerTimePeriod).toBe(2);
        expect(th.options.timePeriod).toBe(timePeriod);
        expect(th.options.maxConcurrent).toBe(3);
    });

    it("should correctly execute a single ajax call", function () {
        var spy = jasmine.createSpy();
        var done = false;

        th.ajax({
            url : 'data.txt',
            success : function (data) {
                spy();
            },
            complete : function () {
                done = true;
            }
        });

        waitsFor(function () {
            return done;
        });

        runs(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

    it("should correctly execute multiple ajax calls", function () {
        var calls = [
            { spy : jasmine.createSpy(), done : false },
            { spy : jasmine.createSpy(), done : false },
            { spy : jasmine.createSpy(), done : false }
        ];

        $.each(calls, function (i) {
            th.ajax({
                url : 'data.txt',
                success : function (data) {
                    calls[i].spy();
                },
                complete : function () {
                    calls[i].done = true;
                    calls[i].time = time();
                }
            });
        });

        waitsFor(function () {
            var done = true;
            $.each(calls, function() {
                if (!this.done) {
                    done = false;
                    return false;
                }
                return true;
            });
            return done;
        });

        runs(function () {
            $.each(calls, function(i) {
                expect(this.spy).toHaveBeenCalled();
            });
            expect(calls[2].time - calls[0].time >= 0.99*timePeriod).toBe(true);
        });
    });

    it("ajax method should return a promise whose done() method is called", function () {
        var spy = jasmine.createSpy();
        var done = false;

        var promise = th.ajax({
            url : 'data.txt'
        });

        promise.done(function(data) {
            spy();
        });

        promise.then(function () {
            done = true;
        });

        waitsFor(function () {
            return done;
        });

        runs(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

});
