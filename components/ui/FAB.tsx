interface Props {
  onClick: () => void
  label?: string
}

export default function FAB({ onClick, label = '+' }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 active:scale-95 transition-transform z-40"
      aria-label="추가"
    >
      {label}
    </button>
  )
}
