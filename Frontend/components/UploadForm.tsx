// components/UploadForm.tsx
"use client"
import { useState } from "react"

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [response, setResponse] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("userId", "dummy_user_id")
    formData.append("fileId", "dummy_file_id")

    const res = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    setResponse(data)
  }

  return (
    <div className="p-4">
      <input type="file" onChange={handleFileChange} className="mb-2" />
      <button onClick={handleUpload} className="px-4 py-2 bg-blue-500 text-white rounded">
        Upload
      </button>
      {response && (
        <pre className="mt-4 bg-gray-100 p-2 rounded text-sm">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  )
}
