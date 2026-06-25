export default function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <p className="text-gray-500 text-sm">{message}</p>
      {action}
    </div>
  )
}
