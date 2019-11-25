
export async function loadImage(url) {
  return new Promise(function(resolve) {
      let image = new Image();
      image.crossOrigin = "";
      image.src = url;
      image.addEventListener('load', function() {
          resolve(image);
      });
  });
}
