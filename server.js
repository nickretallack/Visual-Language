// Generated by CoffeeScript 1.3.3
(function() {
  var app, express;

  express = require('express');

  app = express.createServer();

  app.use(express["static"](__dirname));

  app.listen(5000);

}).call(this);
