% MIDI pass only: expand written repeats so playback matches the printed score.
#(set! toplevel-music-functions
   (cons unfold-repeats-fully toplevel-music-functions))
