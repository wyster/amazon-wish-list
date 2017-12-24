const test = require('tape');

const price = require('../lib/price');

test('price test', function (t) {
  t.plan(3);
  
  t.equal(parseFloat('1357.14'), price.getPrice('1.357,14'));
  t.equal(parseFloat('109.99'), price.getPrice('109,99'));
  t.equal(parseFloat('0'), price.getPrice('0'));
});