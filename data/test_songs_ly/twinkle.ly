\version "2.26.0"
\header {
  title = "Twinkle Twinkle Little Star"
  composer = "Traditional"
  style = "Nursery rhyme"
  instrument = "Piano"
}

\score {
  \new Staff \fixed c' {
    \key c \major
    \time 4/4
    \tempo 4 = 100
    c4 c g g | a a g2 | f4 f e e | d d c2 |
    g4 g f f | e e d2 | g4 g f f | e e d2 |
    c4 c g g | a a g2 | f4 f e e | d d c2 \bar "|."
  }
  \layout { }
  \midi { }
}