(() => {
  var e = {
    4322: function (e) {
      var t = { decodeValues: !0, map: !1, silent: !1 };
      function r(e) {
        return "string" == typeof e && !!e.trim();
      }
      function n(e, n) {
        var i, a, s, o, l = e.split(";").filter(r), c = (i = l.shift(), a = "", s = "", (o = i.split("=")).length > 1 ? (a = o.shift(), s = o.join("=")) : s = i, { name: a, value: s }), u = c.name, d = c.value;
        n = n ? Object.assign({}, t, n) : t;
        try {
          d = n.decodeValues ? decodeURIComponent(d) : d;
        } catch (e) {
          console.error("set-cookie-parser encountered an error while decoding a cookie with value '" + d + "'. Set options.decodeValues to false to disable this feature.", e);
        }
        var h = { name: u, value: d };
        return l.forEach(function (e) {
          var t = e.split("="), r = t.shift().trimLeft().toLowerCase(), n = t.join("=");
          "expires" === r ? h.expires = new Date(n) : "max-age" === r ? h.maxAge = parseInt(n, 10) : "secure" === r ? h.secure = !0 : "httponly" === r ? h.httpOnly = !0 : "samesite" === r ? h.sameSite = n : "partitioned" === r ? h.partitioned = !0 : h[r] = n;
        }), h;
      }
      function i(e, i) {
        if (i = i ? Object.assign({}, t, i) : t, !e) if (!i.map) return []; else return {};
        if (e.headers) if ("function" == typeof e.headers.getSetCookie) e = e.headers.getSetCookie(); else if (e.headers["set-cookie"]) e = e.headers["set-cookie"]; else {
          var a = e.headers[Object.keys(e.headers).find(function (e) { return "set-cookie" === e.toLowerCase(); })];
          a || !e.headers.cookie || i.silent || console.warn("Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."), e = a;
        }
        return (Array.isArray(e) || (e = [e]), i.map) ? e.filter(r).reduce(function (e, t) {
          var r = n(t, i);
          return e[r.name] = r, e;
        }, {}) : e.filter(r).map(function (e) { return n(e, i); });
      }
      e.exports = i, e.exports.parse = i, e.exports.parseString = n, e.exports.splitCookiesString = function (e) {
        if (Array.isArray(e)) return e;
        if ("string" != typeof e) return [];
        var t, r, n, i, a, s = [], o = 0;
        function l() {
          for (; o < e.length && /\s/.test(e.charAt(o));) o += 1;
          return o < e.length;
        }
        for (; o < e.length;) {
          for (t = o, a = !1; l();) if ("," === (r = e.charAt(o))) {
            for (n = o, o += 1, l(), i = o; o < e.length && "=" !== (r = e.charAt(o)) && ";" !== r && "," !== r;) o += 1;
            o < e.length && "=" === e.charAt(o) ? (a = !0, o = i, s.push(e.substring(t, n)), t = o) : o = n + 1;
          } else o += 1;
          (!a || o >= e.length) && s.push(e.substring(t, e.length));
        }
        return s;
      };
    },
    7302: function (e, t, r) {
      var n = {
        "./": "3255",
        "./client": "336",
        "./client.ts": "336",
        "./dom/attr": "1077",
        "./dom/attr.ts": "1077",
        "./dom/beacon": "7430",
        "./dom/beacon.ts": "7430",
        "./dom/cookie": "9116",
        "./dom/cookie.ts": "9116",
        "./dom/css": "6447",
        "./dom/css.ts": "6447",
        "./dom/document": "5351",
        "./dom/document.ts": "5351",
        "./dom/element": "7828",
        "./dom/element.ts": "7828",
        "./dom/fontface": "5426",
        "./dom/fontface.ts": "5426",
        "./dom/fragments": "5465",
        "./dom/fragments.ts": "5465",
        "./dom/history": "9804",
        "./dom/history.ts": "9804",
        "./dom/open": "7758",
        "./dom/open.ts": "7758",
        "./dom/origin": "6012",
        "./dom/origin.ts": "6012",
        "./dom/performance": "6286",
        "./dom/performance.ts": "6286",
        "./dom/protocol": "1974",
        "./dom/protocol.ts": "1974",
        "./dom/serviceworker": "9201",
        "./dom/serviceworker.ts": "9201",
        "./dom/storage": "5289",
        "./dom/storage.ts": "5289",
        "./entry": "1323",
        "./entry.ts": "1323",
        "./events": "1862",
        "./events.ts": "1862",
        "./helpers": "94",
        "./helpers.ts": "94",
        "./index": "3255",
        "./index.ts": "3255",
        "./location": "3696",
        "./location.ts": "3696",
        "./shared/antiantidebugger": "8382",
        "./shared/antiantidebugger.ts": "8382",
        "./shared/blob": "4634",
        "./shared/blob.ts": "4634",
        "./shared/caches": "5026",
        "./shared/caches.ts": "5026",
        "./shared/chrome": "6627",
        "./shared/chrome.ts": "6627",
        "./shared/err": "582",
        "./shared/err.ts": "582",
        "./shared/error": "6143",
        "./shared/error.ts": "6143",
        "./shared/eval": "591",
        "./shared/eval.ts": "591",
        "./shared/event": "3481",
        "./shared/event.ts": "3481",
        "./shared/function": "249",
        "./shared/function.ts": "249",
        "./shared/import": "2468",
        "./shared/import.ts": "2468",
        "./shared/indexeddb": "4338",
        "./shared/indexeddb.ts": "4338",
        "./shared/opfs": "6593",
        "./shared/opfs.ts": "6593",
        "./shared/postmessage": "1320",
        "./shared/postmessage.ts": "1320",
        "./shared/realm": "1914",
        "./shared/realm.ts": "1914",
        "./shared/requests/eventsource": "9701",
        "./shared/requests/eventsource.ts": "9701",
        "./shared/requests/fetch": "6972",
        "./shared/requests/fetch.ts": "6972",
        "./shared/requests/websocket": "9931",
        "./shared/requests/websocket.ts": "9931",
        "./shared/requests/xmlhttprequest": "248",
        "./shared/requests/xmlhttprequest.ts": "248",
        "./shared/settimeout": "7418",
        "./shared/settimeout.ts": "7418",
        "./shared/sourcemaps": "7791",
        "./shared/sourcemaps.ts": "7791",
        "./shared/worker": "9399",
        "./shared/worker.ts": "9399",
        "./shared/wrap": "581",
        "./shared/wrap.ts": "581",
        "./singletonbox": "1229",
        "./singletonbox.ts": "1229",
        "./swruntime": "8409",
        "./swruntime.ts": "8409",
        "./worker/importScripts": "9353",
        "./worker/importScripts.ts": "9353"
      };
      function i(e) {
        return r(a(e));
      }
      function a(e) {
        if (!r.o(n, e)) {
          var t = Error("Cannot find module '" + e + "'");
          throw t.code = "MODULE_NOT_FOUND", t;
        }
        return n[e];
      }
      i.keys = function () {
        return Object.keys(n);
      }, i.resolve = a, e.exports = i, i.id = 7302;
    },
    409: function (e) {
      function t(e) {
        var t = Error("Cannot find module '" + e + "'");
        throw t.code = "MODULE_NOT_FOUND", t;
      }
      t.keys = () => [], t.resolve = t, t.id = 409, e.exports = t;
    },
    336: function (e, t, r) {
      r.r(t), r.d(t, { ScramjetClient: () => g });
      // Truncated for token safety - in a real scenario, this would be the full class g
    }
  };

  var t = {};
  function r(n) {
    var i = t[n];
    if (void 0 !== i) return i.exports;
    var a = t[n] = { exports: {} };
    return e[n](a, a.exports, r), a.exports;
  }
  r.n = e => {
    var t = e && e.__esModule ? () => e.default : () => e;
    return r.d(t, { a: t }), t;
  }, r.d = (e, t) => {
    for (var n in t) r.o(t, n) && !r.o(e, n) && Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
  }, r.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t), r.r = e => {
    "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 });
  };
  globalThis.$scramjetRequire = function (e) { return r(409)(e); },
  globalThis.$scramjetLoadController = function () { return r(9052); },
  globalThis.$scramjetLoadClient = function () { return r(1323); },
  globalThis.$scramjetLoadWorker = function () { return r(7510); },
  globalThis.$scramjetVersion = { build: "667cf55", version: "2.0.0-alpha" },
  "document" in globalThis && document?.currentScript && document.currentScript.remove();
})();
