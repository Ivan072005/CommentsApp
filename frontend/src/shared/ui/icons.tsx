// Небольшие SVG-иконки (без сторонних библиотек). Цвет берут из currentColor.
interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function ChatIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}

export function ReplyIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 17l-5-5 5-5" />
      <path d="M4 12h11a5 5 0 0 1 5 5v2" />
    </svg>
  );
}

export function ChevronIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function RefreshIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function FileIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
