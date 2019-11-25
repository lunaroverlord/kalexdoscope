export class Audio
{
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 32;
    this.output = new Uint8Array(this.analyser.frequencyBinCount)
  }

  fromStream = (stream) => {
    this.source = this.audioCtx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
  }

  fromFile = (sourceFile) => {
    var audio = new Audio();
    audio.src = sourceFile;
    audio.controls = true;
    audio.autoplay = false;
    document.getElementById('audio').appendChild(audio);

    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = audioCtx.createAnalyser();
    var source = audioCtx.createMediaElementSource(audio);
    source.connect(this.analyser);
    //source.connect(audioCtx.destination);
 
    this.analyser.fftSize = 32;

    this.output = new Uint8Array(this.analyser.frequencyBinCount)

    this.audio = audio;
  }

  getFFT = () => {
    this.analyser.getByteFrequencyData(this.output);
    return this.output;

    /* TimeDomain
    this.analyser.getByteTimeDomainData(this.output)
    const sum = this.output.reduce((a, b) => a + b, 0);
    const max = this.output.reduce((a, b) => b > a ? b : a, 0);
    const len = (sum / 50) - (1000 / 50)
    console.log("|".repeat(max/4));
    //console.log(max, this.output);
    //*/
  }

  getOnsets = () => {
  }
}
