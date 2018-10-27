

function format(priceText) {
  priceText = priceText.replace('.', '').trim();
  priceText = priceText.replace(',', '.').trim();
  const re = /(\D*)(.*)/;
  return re.exec(priceText);
}

export function getPrice(priceText) {
  const result = format(priceText);
  return parseFloat(parseFloat(result[2]).toFixed(2));
}