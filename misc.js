// Generated by CoffeeScript 1.3.3
(function() {
  var blab, last, obj_first;

  blab = function() {
    return console.log(arguments);
  };

  last = function(list) {
    return list[list.length - 1];
  };

  obj_first = function(obj) {
    var item, key;
    for (key in obj) {
      item = obj[key];
      return item;
    }
  };

  RegExp.escape = function(s) {
    return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  };

}).call(this);
