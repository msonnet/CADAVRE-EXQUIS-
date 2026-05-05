interface Props {
  className?: string
}

export default function SeparateurOr({ className = '' }: Props) {
  return (
    <div className={`my-6 ${className}`}>
      <hr className="separateur-or" />
    </div>
  )
}
