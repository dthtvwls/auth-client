var auth = require('auth/lib/authentication');

var authServer = 'https://auth.localtunnel.me';

var msgId = function () {
  var counter = 0;
  return function () {
    return counter++;
  };
}();

var callbacks = {};

document.getElementsByTagName('button')[0].addEventListener('click', function (event) {
  window.testWindow = open(authServer);

  var pingInterval = setInterval(function (event) {
    var id = msgId();
    testWindow.postMessage(JSON.stringify({ id: id, method: 'handshake' }), authServer);

    callbacks[id] = function (error) {
      delete callbacks[id];
      if (error) throw Error();
      clearInterval(pingInterval);

      var challengeId = msgId();
      var challenge = new Buffer(128);
      crypto.getRandomValues(challenge);

      testWindow.postMessage(JSON.stringify({ id: challengeId, method: 'challenge', challenge: challenge.toString('base64') }), authServer);

      callbacks[challengeId] = function (error, response) {
        delete callbacks[challengeId];
        if (error) throw error;

        var signature = new Buffer(response.signature, 'base64');
        var publicKey = new Buffer(response.publicKey, 'base64');

        auth.verify(challenge, signature, publicKey, function (error) {
          if (error) {
            throw error;
          } else {
            console.log('success');
          }
        });
      };
    };
  }, 1000);
});

addEventListener('message', function (event) {
  var data = JSON.parse(event.data);
  if (callbacks[data.id]) callbacks[data.id](data.error, data.response);
});
