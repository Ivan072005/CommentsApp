import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  size?: number;
}

// Цвет аватара стабильно зависит от имени: у одного автора — всегда один цвет
function hueFromName(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export function Avatar({ name, size = 32 }: AvatarProps) {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  const hue = hueFromName(name);

  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 70% 48%))`,
      }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
