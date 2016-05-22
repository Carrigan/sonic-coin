var ws;
var amounts = [];
var oscillators = [];
var scale_notes = [];

function change_chord(intervals, start_note, octaves) {
  scale_notes = [];
  for(var octave_i = 0; octave_i < octaves; octave_i++) {
    for(var note_i = 0; note_i < intervals.length; note_i++) {
      scale_notes.push(start_note + octave_i * 12 + intervals[note_i]);
    }
  }
}

function play_btc(amount) {
  var log_amt = Math.log(amount);
  var max_v = Math.log(10000);
  var min_v = 0;

  // Make higher amounts map to lower pitched notes
  note = Math.round(map(log_amt, min_v, max_v, scale_notes.length - 1, 0));
  if (note < 0) note = 0;

  // Make higher amounts map to longer, louder notes
  var scaled = map(log_amt, min_v, max_v, 0.2, 1.0);
  if(scaled > 1.0) scaled = 1.0;

  // Play the note, returning the duration
  return play_note(scale_notes[note], 0.5 * scaled, 0, 4 * scaled, scaled);
}

function play_note(midi_key, a, s, r, v) {
  // Use a free oscillator to play the note
  var osc_obj = free_oscillators()[0];
  if(!osc_obj) return;

  // Set the in_use flag until the note is finished
  var osc = osc_obj.osc;
  osc_obj.in_use = true;
  setTimeout(function() { osc_obj.in_use = false; }, (a + s + r) * 1000);

  // Create an envelope
  var env = new p5.Env();
  env.setADSR(a, s, 1.0, r);
  env.setRange(v, 0.0);

  // Play the note
  osc.freq(midiToFreq(midi_key));
  osc.amp(env);
  env.play();

  // Return the duration
  return a + s + r;
}

function free_oscillators() {
  // Create an array of all free oscillators
  var freed = [];
  for(var i = 0; i < oscillators.length; i++) {
    osc = oscillators[i];
    if(osc.in_use == false) freed.push(osc);
  }
  return freed;
}

function initialize_oscillators(count) {
  for(var i = 0; i < count; i++) {
    osc = new p5.Oscillator();
    osc.setType('sine');
    osc.amp(0);
    osc.start();

    oscillators.push({ osc: osc, in_use: false });
  }
}

function preload() {
  ws = new WebSocket("wss://ws.blockchain.info/inv");

  ws.onopen = function(event) {
    ws.send('{"op": "unconfirmed_sub"}');
  };

  ws.onmessage = function(event) {
    data = JSON.parse(event.data);
    outputs = data.x.out;
    amount = (outputs[outputs.length - 1].value / 100000000) * 450;
    amounts.push(amount.toFixed(2));
    play_btc(amount);
  };
}

function setup() {
  // Create the canvas
  createCanvas(windowWidth, windowHeight);
  textSize(32);

  // Start the oscillators
  initialize_oscillators(30);

  // Initialize the chord to a m7
  change_chord([0, 3, 7, 10], 42, 3);
}

function draw() {
  for(var i = 0; i < amounts.length; i++) text(amounts[i], random(windowWidth), random(windowHeight));
  amounts = [];
}
