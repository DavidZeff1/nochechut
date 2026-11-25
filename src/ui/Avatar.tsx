import { useData } from '../data/DataContext';
import { avatarHue, initials, profileFor } from '../lib/instructors';

/** An instructor's photo, or a coloured circle with their initials. */
export function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  return photo ? (
    <img className="avatar" src={photo} alt={name} width={size} height={size} style={style} />
  ) : (
    <span className="avatar ini" style={{ ...style, background: avatarHue(name) }} aria-label={name} role="img">
      {initials(name)}
    </span>
  );
}

/** Instructor names with small avatars, for course cards. */
export function InstructorNames({ names, size = 22 }: { names: string[]; size?: number }) {
  const { S } = useData();
  if (!names.length) return null;
  return (
    <span className="inames">
      {names.map((n) => (
        <span key={n} className="iname">
          <Avatar name={n} photo={profileFor(S, n)?.photo} size={size} />
          {n}
        </span>
      ))}
    </span>
  );
}
