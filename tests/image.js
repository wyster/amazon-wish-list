const test = require('tape');

const image = require('../lib/image');

test('price test', function (t) {
  t.plan(2);
  t.equal('https://images-na.ssl-images-amazon.com/images/I/6186c9FEYoL.jpg', image.prepare('https://images-na.ssl-images-amazon.com/images/I/6186c9FEYoL._SS300_.jpg'));
  t.equal('https://images-na.ssl-images-amazon.com/images/I/71cVQt6cFjL.jpg', image.prepare('https://images-na.ssl-images-amazon.com/images/I/71cVQt6cFjL._SS135_.jpg'))
});