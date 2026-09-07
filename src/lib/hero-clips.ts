/**
 * The hero bento's shared film queue.
 *
 * Three plates play from ONE list - `heroFilms` in `@/lib/site` - rather than
 * from a playlist each. This desk is what lets them do that without ever
 * showing the same film twice at once: a film is checked out before it goes
 * on screen and checked back in only once it has left, and the queue only
 * ever hands out something nobody is holding.
 *
 * The cursor is what makes the reel run end to end. It carries on from
 * wherever the last plate stopped, so the three boxes hand the list between
 * them in order instead of each restarting it - plate one takes the next
 * film, plate two the one after that, and round again at the end.
 *
 * Module-level state is the point: every plate imports the same desk, so it
 * sees all three without a provider threaded through the server components
 * between them. It is only ever touched from the browser, after mount - the
 * first paint is each plate's own starting film, identical on the server and
 * the client.
 */

const inUse = new Set<string>();
let cursor = 0;

/**
 * The next free film in the queue, checked out and ready to show. `avoid`
 * keeps a plate off the film it is already playing.
 *
 * The fallback at the end only fires if every film is somehow spoken for -
 * which needs a caller to have forgotten a release, since the list is kept
 * longer than the number of plates. Showing a duplicate beats showing
 * nothing, so it hands one back rather than failing.
 */
export function nextFilm(
  films: readonly string[],
  avoid?: string | null
): string {
  for (let i = 0; i < films.length; i++) {
    const index = (cursor + i) % films.length;
    const film = films[index]!;
    if (!inUse.has(film) && film !== avoid) {
      cursor = (index + 1) % films.length;
      inUse.add(film);
      return film;
    }
  }

  const film = films[cursor % films.length]!;
  cursor = (cursor + 1) % films.length;
  inUse.add(film);
  return film;
}

/**
 * Checks out one named film, or reports that someone else has it. Stepping
 * back through a plate's history asks for a specific film rather than for
 * whatever is next - and if another plate has taken it in the meantime, the
 * caller falls back to `nextFilm` rather than showing it twice.
 */
export function reserveFilm(film: string): boolean {
  if (inUse.has(film)) return false;
  inUse.add(film);
  return true;
}

/** Checks a film back in, once it is off screen rather than on its way out. */
export function releaseFilm(film: string | null | undefined) {
  if (film) inUse.delete(film);
}
