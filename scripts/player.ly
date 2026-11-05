% Included via --define-default=include-settings.
% The layout and MIDI passes see the same source note, so source position + pitch
% gives every notehead and MIDI event a stable, shared key.
#(define (note-key event)
   (let ((where (ly:input-file-line-char-column (ly:event-property event 'origin))))
     (format #f "n~a-~a-~a" (cadr where) (caddr where)
             (+ 60 (ly:pitch-semitones (ly:event-property event 'pitch))))))

\layout {
  % The tempo mark's notehead would otherwise show above the first system.
  \context {
    \Score
    \override MetronomeMark.stencil = ##f
  }
  \context {
    \Voice
    \override NoteHead.output-attributes =
      #(lambda (head)
         (let ((event (ly:grob-property head 'cause)))
           (if (ly:pitch? (ly:event-property event 'pitch))
               (list (cons 'data-note (note-key event))) '())))
  }
}

\midi {
  \context {
    \Voice
    \consists #(make-performer
      (listeners
        ((note-event performer event)
         (let* ((context (ly:translator-context performer))
                (moment (ly:context-current-moment context))
                (pitch (ly:event-property event 'pitch)))
           (when (ly:pitch? pitch)
             (format #t "PPNOTE ~a ~a ~a ~a\n"
               (exact->inexact (ly:moment-main moment))
               (exact->inexact (ly:moment-grace moment))
               (+ 60 (ly:pitch-semitones pitch)) (note-key event)))))))
  }
}
