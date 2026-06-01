import React, { useRef, useState, useEffect } from 'react'
import { Upload, X, Image, Check, AlertCircle } from 'lucide-react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// ✅ CORRECT: Define your API base URL here.
// If your backend runs on localhost:8080, use this.
const API_BASE_URL = 'http://localhost:8080/api/logo';

function LogoManagement() {
  const [logo, setLogo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [currentLogo, setCurrentLogo] = useState(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [logoInfo, setLogoInfo] = useState(null)
  const fileInputRef = useRef(null)

  // Load existing logo on component mount
  useEffect(() => {
    loadCurrentLogo()
  }, [])

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const loadCurrentLogo = async () => {
    setLoading(true)
    try {
      // First check if logo exists
      const infoResponse = await fetch(`${API_BASE_URL}/info`)
      const info = await infoResponse.json()
      
      if (info.exists) {
        // Get the actual logo image
        const logoResponse = await fetch(API_BASE_URL)
        if (logoResponse.ok) {
          const blob = await logoResponse.blob()
          const logoUrl = URL.createObjectURL(blob)
          setCurrentLogo(logoUrl)
        }
      }
    } catch (err) {
      console.error('Failed to load current logo:', err)
      setError('Failed to load current logo. Please check your network connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.')
        return
      }

      setLogo(file)
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)
      setError('')
      setSuccess('')

      const img = new window.Image()
      img.onload = () => {
        setLogoInfo({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          dimensions: `${img.width} × ${img.height}`,
          type: file.type
        })
      }
      img.onerror = () => {
        setLogoInfo(null)
        setError('Failed to load image info.')
      }
      img.src = previewUrl
    } else {
      setLogo(null)
      setPreview(null)
      setLogoInfo(null)
      setError('Please select a valid image file (PNG, JPG, GIF, SVG).')
    }
  }

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    handleFileChange(file)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!logo) {
      setError('Please select a logo to upload.')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', logo)

      // Use POST for create, PUT for update
      const method = currentLogo ? 'PUT' : 'POST'
      const response = await fetch(API_BASE_URL, {
        method: method,
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(result.message || 'Logo uploaded successfully!')
        setLogo(null)
        setPreview(null)
        setLogoInfo(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        
        // Reload current logo
        setTimeout(() => {
          loadCurrentLogo()
        }, 500)
      } else {
        setError(result.error || 'Failed to upload logo')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentLogo) return

    if (!window.confirm('Are you sure you want to delete the current logo?')) {
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(result.message || 'Logo deleted successfully!')
        setCurrentLogo(null)
      } else {
        setError(result.error || 'Failed to delete logo')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview)
    setLogo(null)
    setPreview(null)
    setLogoInfo(null)
    setError('')
    setSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleBack = () => {
    // Implement your back navigation logic here
    console.log('Back button clicked')
  }

  return (
    <div className="shadow-lg rounded-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center mb-2">
          <Image className="mr-3 text-purple-600" size={24} />
          Company Logo
        </h1>
        <p className="text-gray-600">Upload and manage your company logo</p>
      </div>

      {/* Back Button */}
      <button className="flex items-center text-blue-700 font-medium" onClick={handleBack}>
        <ArrowBackIcon fontSize="small" className="mr-2" />
        Back
      </button>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
          <Check size={16} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Logo Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-4">
          {/* Current Logo or Preview */}
          {loading ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600">Loading current logo...</p>
              </div>
            </div>
          ) : (currentLogo || preview) ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-24 h-24 flex items-center justify-center bg-gray-50 rounded-lg border">
                  <img 
                    src={preview || currentLogo} 
                    alt={preview ? "Logo preview" : "Current Logo"} 
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {preview ? 'Logo selected for upload' : 'Current company logo'}
                </p>
                {currentLogo && !preview && (
                  <button
                    onClick={handleDelete}
                    disabled={uploading}
                    className="text-red-500 hover:text-red-700 text-sm font-medium underline transition-colors disabled:opacity-50"
                  >
                    Remove logo
                  </button>
                )}
                {preview && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="text-red-500 hover:text-red-700 text-sm font-medium underline transition-colors"
                  >
                    Cancel selection
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Upload Area */
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleInputChange}
                className="hidden"
                id="logo-upload"
              />
              <div className="space-y-3">
                <Upload className="mx-auto text-3xl text-gray-400" size={32} />
                <div>
                  <p className="text-gray-600">Drag and drop logo image here, or</p>
                  <label
                    htmlFor="logo-upload"
                    className="inline-block mt-2 px-4 py-2 bg-blue-800 text-white rounded-lg cursor-pointer hover:bg-background transition-colors"
                  >
                    Choose File
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF, SVG up to 5MB</p>
              </div>
            </div>
          )}

          {/* Logo Info */}
          {logoInfo && preview && (
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-gray-800 mb-2">File Information</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Name:</strong> {logoInfo.name}</div>
                <div><strong>Size:</strong> {logoInfo.size}</div>
                <div><strong>Dimensions:</strong> {logoInfo.dimensions}</div>
                <div><strong>Format:</strong> {logoInfo.type.split('/')[1].toUpperCase()}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {preview && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-2 bg-background text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {currentLogo ? 'Updating...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Check size={16} className="mr-2" />
                    {currentLogo ? 'Update Logo' : 'Upload Logo'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LogoManagement