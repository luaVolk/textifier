/**
 * https://github.com/TemplarVolk/textifier
 * Convert images to text in your browser
 * @version v1.0.0
 * @author Templar Volk
 * @copyright ©2018 Templar Volk
 * @license MIT
**/

(function() {
  var Textifier = (function() {

    function Textifier(maxWidth, maxHeight, options) {
      // WARNING: maxWidth and maxHeight are measured in characters, unless specified
      this.maxWidth = maxWidth || Infinity;
      this.maxHeight = maxHeight || Infinity;

      if (typeof maxWidth === 'object') {
        this.options = maxWidth;
        this.maxHeight = Infinity;
      } else if (typeof maxHeight === 'object') {
        this.options = maxHeight;
      } else {
        this.options = options || {};
      }

      // Default options
      this.options = {
        characters: this.options.characters && this.options.characters.length > 0 ? this.options.characters : '01',
        background: this.options.background || '#00000000', // Tranparent
        ordered: this.options.ordered || false, // Random
        color: this.options.color || 0 // Colored
      }

      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      this.font = getLetterDimensions();
    }

    // Some "constants"
    Textifier.COLORED = 0;
    Textifier.GRAYSCALE = 1;
    Textifier.MONOCHROME = 2;

    Textifier.HTML = 0;
    Textifier.CANVAS = 1;
    Textifier.CONSOLE = 2;

    Textifier.prototype.getPixels = function(url) {

      return new Promise(function(resolve, reject) {

        var img = new Image();

        img.onload = function() {

          var [width, height] = scaleDimensions(img.width, img.height, this.maxWidth, this.maxHeight, this.font);

          this.canvas.width = width;
          this.canvas.height = height;

          this.ctx.fillStyle = this.options.background;
          this.ctx.fillRect(0, 0, width, height);
          this.ctx.drawImage(img, 0, 0, width, height);

          var imageData = this.ctx.getImageData(0, 0, width, height);

          var pixels = [];

          for (var i = 0; i < imageData.data.length; i += 4) {

            pixels.push({
              r: imageData.data[i],
              g: imageData.data[i + 1],
              b: imageData.data[i + 2],
              a: imageData.data[i + 3] / 255
            });

          }

          resolve({pixels, width, height});
        }.bind(this)

        img.onerror = function() {
          reject(new Error("Couldn't load image " + url));
        }

        img.src = url;

      }.bind(this));
    }

    Textifier.prototype.createCharacters = function(type, url) {
      return this.getPixels(url).then(function(data) {

        var characters = [];
        var log = '';

        if (type == Textifier.CANVAS) {
          this.canvas.width = data.width * this.font.width;
          this.canvas.height = data.height * this.font.height;

          this.ctx.font = 'monospace';
          this.ctx.fillStyle = '#00000000';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        for (var i = 0; i < data.pixels.length; i++) {

          var r = data.pixels[i].r,
              g = data.pixels[i].g,
              b = data.pixels[i].b,
              a = data.pixels[i].a;

          var avg;

          if (this.options.color != Textifier.COLORED) {
            avg = toGrayscale(r, g, b);

            if (this.options.color == Textifier.MONOCHROME) {
              avg = avg > 127 ? 255 : 0;
              a = a > 0.5 ? 1 : 0;
            }

            r = g = b = avg;
          }

          var character;

          if (a == 0) {
            character = ' ';
          } else if (this.options.ordered) {
            character = this.options.characters[i % this.options.characters.length];
          } else {
            character = this.options.characters[Math.floor(Math.random() * this.options.characters.length)];
          }

          // TODO: DRY this
          if (type == Textifier.HTML) { // If HTML

            if (character == ' ') {
              characters.push(character);
            } else {
              characters.push('<span style="color: rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')">' + character + '</span>');
            }

            if ((i + 1) % data.width == 0) {
              characters.push('\n');
            }

          } else if (type == Textifier.CANVAS) {

            if (character != ' ') {
              this.ctx.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
              this.ctx.fillText(character, (i + 1) % data.width * this.font.width, Math.ceil(i / data.width) * this.font.height);
            }

          } else {

            if (character == ' ') {
              log += ' ';
            } else {
              log += '%c' + character;
              characters.push('color: rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')');
            }

            if ((i + 1) % data.width == 0) {
              log += '\n';
            }

          }
        }

        if (type == Textifier.CONSOLE) {
          characters.unshift('\n' + log);
        }

        return characters;
      }.bind(this));
    }

    Textifier.prototype.write = function(url, el, append) {
      return this.createCharacters(0, url).then(function(html) {

        if (!append) {
          el.innerHTML = '';
        }

        var final = document.createElement('pre');

        final.innerHTML = html.join('');

        return el.appendChild(final);
      })
      .catch(function(error) {
        console.log(error);
      });
    };

    Textifier.prototype.draw = function(url, el, append) {
      return this.createCharacters(1, url).then(function(html) {

        if (!append) {
          el.innerHTML = '';
        }

        return el.appendChild(this.canvas);
      }.bind(this))
      .catch(function(error) {
        console.log(error);
      });
    };

    Textifier.prototype.log = function(url) {
      return this.createCharacters(2, url).then(function(html) {
        console.log.apply(this, html);
      })
      .catch(function(error) {
        console.log(error);
      });
    };

    // Helper functions
    function toGrayscale(r, g, b) {
      return 0.21 * r + 0.72 * g + 0.07 * b;
    }

    function getLetterDimensions() {
      var pre = document.createElement('pre');
      pre.style.display = 'inline';
      pre.textContent = ' ';

      document.body.appendChild(pre);
      var { width, height } = pre.getBoundingClientRect();
      document.body.removeChild(pre);

      return {ratio: height / width, width, height};
    }

    function measureUnits(number, dir, font) {
      if (!number || isNaN(number)) {
        var div = document.createElement('div');
        div.style.position = 'absolute';
        div.style[dir] = number;

        document.body.appendChild(div);
        var { width, height } = div.getBoundingClientRect();
        document.body.removeChild(div);

        return {width: Math.floor(width / font.width) || Infinity,
                height: Math.floor(height / font.height) || Infinity};
      }

      return {width: number, height: number};
    }

    function scaleDimensions(width, height, maxWidth, maxHeight, font) {

      maxWidth = measureUnits(maxWidth, 'width', font).width;
      maxHeight = measureUnits(maxHeight, 'height', font).height;

      var newWidth = Math.floor(font.ratio * width);
      var newHeight = height;

      if (newWidth > maxWidth) {
        newHeight = Math.ceil(newHeight * maxWidth / newWidth);
        newWidth = maxWidth;
      }

      if (newHeight > maxHeight) {
        newWidth = Math.ceil(newWidth * maxHeight / newHeight);
        newHeight = maxHeight;
      }

      return [newWidth, newHeight];
    }

    return Textifier;

  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Textifier;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return Textifier;
    });
  } else {
    window.Textifier = Textifier;
  }

})();
