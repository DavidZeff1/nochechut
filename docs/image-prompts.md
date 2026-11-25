# Course illustrations

Every course card shows a painted illustration. The app picks one from the course name (Hebrew keywords in `src/lib/images.ts`); an admin can also upload a custom picture for any course from the course dialog.

## Adding or regenerating the images

1. Open the ElevenLabs flow: https://elevenlabs.io/app/flows/cBP7Yr4iaxvFZy7XiTd6
2. Download each image and save it in `art/raw/` as `<slug>.png` (or `.jpg`/`.webp`), e.g. `art/raw/chess.png`. A file whose name contains the generation id from `art/images.json` is also recognised, so the default download names work.
3. Run `npm run images`. It centre-crops each picture to 16:10 and writes `public/courses/<slug>-800.webp` and `<slug>-1280.webp`.
4. Commit `public/courses/`. (`art/raw/` is git-ignored.)

Missing images are fine: a card without its file simply shows no picture.

## Shared style prompt

Every prompt is this style text followed by `Scene: …`.

> Use: header illustration for a class card in a community-center attendance app. Medium: hand-painted gouache on textured paper, storybook illustration, visible brush strokes and soft paper grain. Composition: wide landscape scene, main subject centered with generous empty margins at top and bottom (the image will be cropped to a 16:10 band). Palette limited to deep flag blue (#1847a8), warm sand and Jerusalem-stone beige, one brick-red accent (#b5391d) and cream highlights; gentle warm daylight from the left; light airy background. Simple, confident shapes. Constraints: no text, no letters, no numbers, no logos; people are stylized, faceless or seen from a distance, no realistic faces.

## Per-course scenes

| slug             | label          | scene                                                                                                                                                            | keywords                                                                       |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `martial-arts`   | אומנויות לחימה | two young martial-arts students in white uniforms bowing to each other on a blue mat in a sunlit dojo hall with tall arched windows                              | לחימה, קרב מגע, ג׳ודו, ג'ודו, גודו, קראטה, טאקוונדו, קפוארה, הגנה עצמית, אגרוף |
| `hairstyling`    | תסרוקות        | a cozy styling studio corner: a round mirror, combs, brushes, hair clips and a braided ponytail on a styling head, a teenage girl seen from behind braiding hair | תסרוק, שיער, צמות, איפור, קוסמטיקה, ציפורניים                                  |
| `zumba`          | זומבה וכושר    | a joyful group of women and girls dancing a fitness class in a bright community hall, arms up mid-move, motion swirls                                            | זומבה, אירובי, כושר, פילאטיס, יוגה, התעמלות                                    |
| `theatre`        | תאטרון         | a small community theatre stage with heavy blue curtains pulled open, warm spotlight on two young actors in simple costumes                                      | תאטרון, תיאטרון, דרמה, במה, סטנדאפ                                             |
| `art`            | אומנות         | an art-class table seen from above at a slight angle: paint jars, brushes, a palette and a half-finished painting of Acre sea walls                              | אומנות, אמנות, ציור, יצירה, קרמיקה, פיסול, רישום, צילום                        |
| `jewish-dance`   | מחול           | a circle of dancers holding hands in a joyful hora-style folk dance in a stone courtyard, skirts swirling                                                        | מחול, ריקוד, רוקדים, בלט, היפ הופ, ג׳אז, דבקה                                  |
| `surfing`        | גלישה          | young surfers carrying boards toward gentle waves at a Mediterranean beach with old Acre sea walls in the distance                                               | גלישה, גלישת, שחייה, קייאק, שייט                                               |
| `chess`          | שחמט           | a chessboard mid-game on a wooden table by a window, two players seen from the shoulders down                                                                    | שחמט, שח-מט, משחקי חשיבה, בריג׳                                                |
| `music`          | מוזיקה         | a music room with an acoustic guitar, a darbuka drum, a keyboard and floating musical notes                                                                      | מוזיקה, מוסיקה, גיטרה, תופים, פסנתר, מקהלה, שירה, כינור, אורגן, דרבוקה         |
| `sports`         | ספורט          | kids playing ball on an outdoor court at the neighbourhood community center, late afternoon light                                                                | כדור, ספורט, טניס, אתלטיקה, ריצה, אופניים, קטרגל                               |
| `cooking`        | בישול          | a warm kitchen counter with fresh challah dough, bowls, flour, herbs and a rolling pin, hands kneading                                                           | בישול, אפייה, שף, קונדיטוריה, עוגות, מטבח                                      |
| `science`        | מדע            | a science and robotics workshop table: a small wheeled robot, circuit parts, a magnifying glass and a globe                                                      | מדע, רובוט, מחשב, תכנות, מדעים, אסטרונומיה                                     |
| `sewing`         | תפירה וסריגה   | women in modest clothing around a table with a sewing machine, yarn and fabric, a window onto old stone houses                                                   | תפיר, סריג, רקמה, טלאים, מקרמה                                                 |
| `mishnah-crafts` | משניות ומלאכות | three boys in kippot at a long table: an open book on a stand on one side, wooden crafts on the other                                                            | משני, משנה, גמרא, תורה, מלאכות                                                 |
| `community`      | קהילה          | a welcoming stone community-center building in Acre with arched doorway, potted plants and people of all ages walking in                                         | — (fallback)                                                                   |

To add a new activity: add an entry to `ACTIVITY_IMAGES` in `src/lib/images.ts` and to `art/images.json`, generate the picture with the style prompt above, and run `npm run images`.
