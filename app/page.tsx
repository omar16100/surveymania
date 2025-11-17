import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">SurveyMania</h1>
      <p className="text-gray-600 max-w-2xl">
        A collaborative survey management platform with geolocation and real-time visualization. This is a minimal MVP scaffold.
      </p>
      <div className="flex gap-3">
        <Link className="btn" href="/dashboard/surveys">Go to Surveys</Link>
        <Link className="btn" href="/dashboard/surveys/new">Create Survey</Link>
      </div>
    </div>
  )
}

