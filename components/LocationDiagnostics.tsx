interface LocationDiagnosticsProps {
  location: {
    latitude: number
    longitude: number
    accuracy?: number
  } | null
  loading?: boolean
  error?: string | null
}

export default function LocationDiagnostics({
  location,
  loading = false,
  error = null
}: LocationDiagnosticsProps) {
  if (!loading && !location && !error) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-sm font-medium text-gray-900">Location Status</h3>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span>Acquiring location...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {location && !loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-700">Location acquired</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Latitude:</span>
              <span className="ml-2 font-mono text-gray-900">{location.latitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-600">Longitude:</span>
              <span className="ml-2 font-mono text-gray-900">{location.longitude.toFixed(6)}</span>
            </div>
          </div>

          {location.accuracy !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">Accuracy:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gray-900">
                  ±{Math.round(location.accuracy)}m
                </span>
                {location.accuracy <= 10 && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Excellent</span>
                )}
                {location.accuracy > 10 && location.accuracy <= 50 && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Good</span>
                )}
                {location.accuracy > 50 && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Fair</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
