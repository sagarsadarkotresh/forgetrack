import { Link, useNavigate } from 'react-router-dom'

export default function Forbidden() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-display-hero text-danger-fg mb-4">403</h1>
      <h2 className="text-display-sm mb-6">Access Forbidden</h2>
      <p className="text-fg-secondary text-body-lg mb-8 max-w-md">
        You don't have permission to view this page. If you believe this is an error, please contact your mentor.
      </p>
      <div className="flex gap-4">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
        <Link to="/" className="btn-primary">Return Home</Link>
      </div>
    </div>
  )
}
