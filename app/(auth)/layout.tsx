export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Off-Records</h1>
          <p className="mt-1 text-sm text-gray-500">Attendance management</p>
        </div>
        {children}
      </div>
    </div>
  );
}
