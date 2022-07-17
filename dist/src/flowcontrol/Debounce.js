"use strict";
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-implied-eval */
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = exports.Debounce = void 0;
class Debounce {
    constructor(fn, waitMs = 100) {
        this.fn = fn;
        this.waitMs = waitMs;
        this._handle;
        this._last;
    }
    add(...args) {
        this._last = args;
        this._unschedule();
        this._schedule();
    }
    cancel() {
        this._unschedule();
        this._last = undefined;
    }
    _unschedule() {
        clearTimeout(this._handle);
    }
    _schedule() {
        this._handle = setTimeout(this._process.bind(this), this.waitMs);
        if (this._handle.unref) {
            this._handle.unref();
        }
    }
    _process() {
        if (!this._last)
            return;
        this.fn(...this._last);
    }
}
exports.Debounce = Debounce;
/**
 * Debounce allows repeated calls to a function but will delay execution of the
 * function until a a timeout period expires. Upon expiration, the function is
 * called with the last value that was provided
 *
 * @example
 * const debounceMs = 100;
 * const fn = n => console.log(n, new Date());
 * const debouncedFn = debounce(fn, debounceMs);
 * debouncedFn('h');
 * debouncedFn('he');
 * debouncedFn('hel');
 * debouncedFn('hell');
 * debouncedFn('hello');
 */
function debounce(fn, debounceMs = 100) {
    const i = new Debounce(fn, debounceMs);
    const add = i.add.bind(i);
    add.cancel = i.cancel.bind(i);
    return add;
}
exports.debounce = debounce;
//# sourceMappingURL=Debounce.js.map