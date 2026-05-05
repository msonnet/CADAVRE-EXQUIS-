interface Props {
  className?: string
  animee?: boolean
}

export default function IconePlume({ className = '', animee = false }: Props) {
  return (
    <svg
      className={`${animee ? 'plume-animation' : ''} ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 4 C16 2, 8 6, 4 20" />
      <path d="M20 4 C18 8, 12 12, 4 20" />
      <path d="M12 12 L4 20" />
      <path d="M4 20 L6 18" />
    </svg>
  )
}
