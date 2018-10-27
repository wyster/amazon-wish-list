

export function prepare(image) {
  image = image.replace(/_SS([0-9]+)_\./, '');
  return image;
}