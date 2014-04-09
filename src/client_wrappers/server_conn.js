/**
 * server_conn.js
 * Łukasz Czapliński, ii.uni.wroc.pl
 * 09-04-2014
 * */
/*global window*/
var _;
var extend_client;
var extensions = [];

try {
  _ = require('underscore'); 
  extend_client = require('../clientWrapper.js');
  extensions = [
      require('../client_wrappers/metadata.js'), 
        ];
} catch(err) {
  /**
   * sth
   **/ 
  console.error(err);
}

var startServer = function () { };
var amServer = false;

function makeClientConnection(obj) {
  var unload = false;
  var serverNames = ["server-0"];
  var knownPeers = {};
  var reliablePeers = {};
  var send = function () { };
  var get_list = function () { return {}; };
  var connect = function () { };
  var startCheckingForServer;
  var startCheckingPeers;
  var new_obj = {
    on_data : function(p,d) {
      if(_.has(obj, 'on_data')) {
        obj.on_data.apply(this, arguments);
      }
      if(_.has(d, 'type') && d.type === 'peer_update') {
        _.extend(reliablePeers, d.ids);
      }
      if(_.has(d, 'type') && d.type === 'peer_request') {
        send(p, {type : 'peer_update', ids : knownPeers });
      }
    },
    on_close : function () {
      if(_.has(obj, 'on_close')) {
        obj.on_close.apply(this, arguments);
      }
    },
    on_create : function () {
      if(_.has(obj, 'on_create')) {
        obj.on_close.apply(this, arguments);
      }
      startCheckingForServer();
      startCheckingPeers();
    }
  };
  function requestPeers () {
    _.each(serverNames, function (el) {
      send(el, { type : 'peer_request' });
    });
  }

  var checkForServer = (function () {
    var sentRequests = {};
    return function(p) {
      if(! _.has(sentRequests, p)) {
        connect(p);
        sentRequests[p] = {};
        setTimeout(function () { if(! _.has(get_list(), p)) { startServer(p); }}, 1500);
      }
    };
  }());

  startCheckingForServer = function () {
    _.each(serverNames, function (el) {
      checkForServer(el);
    });
    if(!unload) {
      setTimeout(startCheckingForServer, 1000);
    }
  };
  startCheckingPeers = function () {
    knownPeers = reliablePeers;
    _.extend(reliablePeers, get_list());
    if(!unload) {
      setTimeout(startCheckingPeers, 500);
    }
  };
  window.addEventListener('onbeforeunload', function () {
    unload = true;
  });
  return {
    opt : _.extend(obj, new_obj),
    extension : function(client) {
      get_list = function () {
        var list = client.get_list();
        var obj = {};
        if(_.has(client, 'get_meta')) {
          _.each(list, function (el, k) {
            obj[k] = client.get_meta(el);
          });
        } else {
          _.each(list, function (el, k) {
            obj[k] = {};
          });
        }
        return obj;
      };
      send = client.send;
      connect = client.connect;
      return _.extend(client, { 
        get_peers : function() { return knownPeers; },
        request_peers : requestPeers, 
        am_i_server : function () { return amServer; }
      });
    }
  };
}

startServer = function (name) {
  if(! amServer ) {
    amServer = name;
  } else {
    amServer = [name] + amServer;
  } 
  var conn = extend_client({
          base_opts: {
            id : name
          },
          extension_list: extensions.push(makeClientConnection)
  });
  window.addEventListener('onbeforeunload', function () {
    conn.destroy();
  });
};

module.exports = makeClientConnection;