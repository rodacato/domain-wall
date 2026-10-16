# 11. The interface is a workshop room

Status: accepted

## Context

Only the wall had an identity. Around it sat a generic three-pane app: white panels, Inter, one
blue accent, a settings form as the first screen. Dark mode recoloured the surfaces but not the
note ink, which left context notes at about 1.13:1 contrast. The sibling courses each set the whole
interface in one physical place; this one did not.

## Decision

- **The whole screen is a facilitation room in daylight.** The wall is a roll of kraft paper taped
  across a plaster wall. The syllabus is a flipchart sheet, the narration is index cards pinned with
  a tack, experts wear name tags, and the player is a wooden ledge holding markers. The first screen
  is the wall itself, saying who the course is for before asking anything (`design/step0/prototype-taller.html`).
- **One type family, Recursive.** Its casual axis carries the handwriting of the notes and its mono
  axis the code, so a business sentence can become code by moving one font along its own axes.
  `--axes-ui`, `--axes-note` and `--axes-code` sit next to every `font-family`.
- **The room follows the theme; the world never does.** Dark mode changes only `--room*`. Paper,
  kraft, tape, notes and their ink are fixed, so every note keeps its contrast by construction.
- **Event Storming's colours stay the palette.** Red marker is the accent (current item, pins,
  highlights) so it never reads as a command's blue.

## Alternatives

- Keep the app frame and polish it: fixes contrast, keeps the gap with the sibling courses.
- A white butcher-paper wall: more faithful to a real session, but it reads as the old ivory frame.

## Consequences

- Inter, Kalam and JetBrains Mono are replaced by one variable font of about 300 KB (Latin, all
  axes), more than the three it replaces.
- Desktop first, like the sibling courses; narrow screens are not addressed by this decision.
- Kraft sits close to next-token's cream paper. Tape, marker and the sticky-note palette are what
  keep them apart, and should not be traded for print textures.
