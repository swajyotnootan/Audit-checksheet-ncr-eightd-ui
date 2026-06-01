import { useState, useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  X, Plus, Minus, Calendar, Clock, MapPin, Users, FileText, Tag, 
  AlertTriangle, Bell, Save, Check, Eye, EyeOff, Info, Star,
  Globe, Lock, Repeat, Trash2, Copy, Palette, Paperclip
} from 'lucide-react'
import moment from 'moment'

// Validation schema using Yup
const eventSchema = yup.object().shape({
  title: yup
    .string()
    .required('Event title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: yup
    .string()
    .max(2000, 'Description must be less than 2000 characters'),
  start: yup
    .date()
    .required('Start date is required')
    .min(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), 'Start date cannot be more than one year in the past'),
  end: yup
    .date()
    .required('End date is required')
    .min(yup.ref('start'), 'End time must be after start time'),
  category: yup
    .string()
    .oneOf(['work', 'personal', 'health', 'education'], 'Invalid category')
    .required('Category is required'),
  priority: yup
    .string()
    .oneOf(['low', 'medium', 'high'], 'Invalid priority')
    .required('Priority is required'),
  location: yup
    .string()
    .max(500, 'Location must be less than 500 characters'),
  attendees: yup
    .array()
    .of(
      yup.string()
        .email('Please enter a valid email address')
        .required('Email is required')
    ),
  reminders: yup
    .array()
    .of(
      yup.object().shape({
        type: yup.string().oneOf(['popup', 'email'], 'Invalid reminder type'),
        minutes: yup
          .number()
          .min(0, 'Minutes cannot be negative')
          .max(10080, 'Reminder cannot be more than 1 week (10080 minutes)')
          .required('Minutes is required')
      })
    )
    .min(1, 'At least one reminder is required'),
  isAllDay: yup.boolean(),
  isRecurring: yup.boolean()
})

export default function EventForm({ event, onClose, onSave }) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#3b82f6')
  const [showPreview, setShowPreview] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isDirty, touchedFields }
  } = useForm({
    resolver: yupResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000),
      category: 'work',
      priority: 'medium',
      location: '',
      attendees: [],
      reminders: [{ type: 'popup', minutes: 15 }],
      isAllDay: false,
      isRecurring: false
    },
    mode: 'onChange'
  })

  const { fields: attendeeFields, append: appendAttendee, remove: removeAttendee } = useFieldArray({
    control,
    name: 'attendees'
  })

  const { fields: reminderFields, append: appendReminder, remove: removeReminder } = useFieldArray({
    control,
    name: 'reminders'
  })

  const watchedStart = watch('start')
  const watchedEnd = watch('end')
  const watchedTitle = watch('title')
  const watchedCategory = watch('category')
  const watchedPriority = watch('priority')

  // Load event data when editing
  useEffect(() => {
    if (event) {
      const parseDate = (dateValue) => {
        if (!dateValue) return new Date()
        if (dateValue instanceof Date) return dateValue
        return new Date(dateValue)
      }

      reset({
        title: event.title || '',
        description: event.description || '',
        start: parseDate(event.start),
        end: parseDate(event.end),
        category: event.category || 'work',
        priority: event.priority || 'medium',
        location: event.location || '',
        attendees: Array.isArray(event.attendees) ? event.attendees : [],
        reminders: Array.isArray(event.reminders) && event.reminders.length > 0 
          ? event.reminders.map(r => ({
              type: r.type || 'popup',
              minutes: parseInt(r.minutes) || 15
            }))
          : [{ type: 'popup', minutes: 15 }],
        isAllDay: Boolean(event.isAllDay),
        isRecurring: Boolean(event.isRecurring)
      })
    }
  }, [event, reset])

  // Auto-adjust end time when start time changes
  useEffect(() => {
    if (watchedStart && watchedEnd) {
      const startDate = new Date(watchedStart)
      const endDate = new Date(watchedEnd)
      
      if (endDate <= startDate) {
        setValue('end', new Date(startDate.getTime() + (60 * 60 * 1000)), { shouldValidate: true })
      }
    }
  }, [watchedStart, setValue, watchedEnd])

  const onSubmit = async (data) => {
    setIsLoading(true)
    
    try {
      const submitData = {
        ...data,
        start: new Date(data.start),
        end: new Date(data.end),
        color: selectedColor
      }

      await onSave(submitData)
    } catch (error) {
      console.error('Error saving event:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      work: '💼',
      personal: '👤',
      health: '🏥',
      education: '📚'
    }
    return icons[category] || '📅'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const formatDateTimeLocal = (date) => {
    if (!date) return ''
    return moment(date).format('YYYY-MM-DDTHH:mm')
  }

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ]

  const quickTimePresets = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '2 hours', minutes: 120 },
    { label: '4 hours', minutes: 240 },
    { label: 'All day', isAllDay: true }
  ]

  const reminderPresets = [
    { label: 'At time', minutes: 0 },
    { label: '5 min', minutes: 5 },
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '1 day', minutes: 1440 }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Enhanced Header with gradient */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {event?.id ? 'Edit Event' : 'Schedule New Job'}
                </h3>
                <p className="text-blue-100 text-sm">
                  {watchedTitle || 'Untitled Event'} • {getCategoryIcon(watchedCategory)} {watchedCategory}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Preview"
              >
                {showPreview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-4 bg-white bg-opacity-20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${Object.keys(touchedFields).length * 10}%` }}
            />
          </div>
        </div>

        <div className="flex">
          {/* Main Form */}
          <div className={`${showPreview ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[calc(95vh-200px)] overflow-y-auto custom-scrollbar">
              
              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Quick setup:</span>
                  {quickTimePresets.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        if (preset.isAllDay) {
                          setValue('isAllDay', true, { shouldValidate: true })
                        } else {
                          const start = new Date(watchedStart)
                          setValue('end', new Date(start.getTime() + preset.minutes * 60 * 1000), { shouldValidate: true })
                        }
                      }}
                      className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>

              {/* Title with enhanced styling */}
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Calendar className="h-4 w-4 mr-2" />
                      Event Title *
                      {watchedTitle && (
                        <Check className="h-4 w-4 ml-2 text-green-500" />
                      )}
                    </label>
                    <div className="relative">
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                          errors.title 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                            : field.value 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        } focus:ring-4 focus:ring-opacity-20`}
                        placeholder="Enter a descriptive title for your event"
                        maxLength={255}
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 top-3 text-xs text-gray-400">
                        {field.value?.length || 0}/255
                      </div>
                    </div>
                    {errors.title && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {errors.title.message}
                      </div>
                    )}
                  </div>
                )}
              />

              {/* Enhanced Date and Time with better UX */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="start"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <Clock className="h-4 w-4 mr-2" />
                        Start Date & Time *
                      </label>
                      <input
                        {...field}
                        type="datetime-local"
                        value={formatDateTimeLocal(field.value)}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                          errors.start 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        } focus:ring-4 focus:ring-opacity-20`}
                        disabled={isLoading}
                      />
                      {errors.start && (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {errors.start.message}
                        </div>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name="end"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <Clock className="h-4 w-4 mr-2" />
                        End Date & Time *
                        {watchedStart && watchedEnd && (
                          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Duration: {moment.duration(moment(watchedEnd).diff(moment(watchedStart))).humanize()}
                          </span>
                        )}
                      </label>
                      <input
                        {...field}
                        type="datetime-local"
                        value={formatDateTimeLocal(field.value)}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                          errors.end 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        } focus:ring-4 focus:ring-opacity-20`}
                        disabled={isLoading}
                      />
                      {errors.end && (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {errors.end.message}
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Enhanced toggles */}
              <div className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
                <Controller
                  name="isAllDay"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center cursor-pointer">
                      <input
                        {...field}
                        type="checkbox"
                        className="sr-only"
                        disabled={isLoading}
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                        field.value ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                          field.value ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700">All day event</span>
                    </label>
                  )}
                />

                <Controller
                  name="isRecurring"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center cursor-pointer">
                      <input
                        {...field}
                        type="checkbox"
                        className="sr-only"
                        disabled={isLoading}
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                        field.value ? 'bg-purple-600' : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                          field.value ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700 flex items-center">
                        <Repeat className="h-4 w-4 mr-1" />
                        Recurring event
                      </span>
                    </label>
                  )}
                />
              </div>

              {/* Enhanced Category and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <Tag className="h-4 w-4 mr-2" />
                        Category
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['work', 'personal', 'health', 'education'].map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => field.onChange(category)}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${
                              field.value === category
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            <div className="text-2xl mb-1">{getCategoryIcon(category)}</div>
                            <div className="text-sm font-medium capitalize">{category}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                />

                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <Star className="h-4 w-4 mr-2" />
                        Priority
                      </label>
                      <div className="space-y-2">
                        {['low', 'medium', 'high'].map((priority) => (
                          <button
                            key={priority}
                            type="button"
                            onClick={() => field.onChange(priority)}
                            className={`w-full p-3 border-2 rounded-lg text-left transition-all duration-200 ${
                              field.value === priority
                                ? getPriorityColor(priority) + ' border-opacity-100'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="capitalize font-medium">{priority}</span>
                              <div className="flex">
                                {Array.from({ length: priority === 'high' ? 3 : priority === 'medium' ? 2 : 1 }).map((_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Location with enhanced UI */}
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location
                    </label>
                    <div className="relative">
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                          errors.location 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        } focus:ring-4 focus:ring-opacity-20`}
                        placeholder="Enter event location or online meeting link"
                        maxLength={500}
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 top-3 text-xs text-gray-400">
                        {field.value?.length || 0}/500
                      </div>
                    </div>
                    {errors.location && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {errors.location.message}
                      </div>
                    )}
                  </div>
                )}
              />

              {/* Description with rich text features */}
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <FileText className="h-4 w-4 mr-2" />
                      Description
                    </label>
                    <div className="relative">
                      <textarea
                        {...field}
                        rows={4}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 resize-none ${
                          errors.description 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        } focus:ring-4 focus:ring-opacity-20`}
                        placeholder="Add event details, agenda, or notes..."
                        maxLength={2000}
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                        {field.value?.length || 0}/2000
                      </div>
                    </div>
                    {errors.description && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {errors.description.message}
                      </div>
                    )}
                  </div>
                )}
              />

              {/* Enhanced Attendees Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Users className="h-4 w-4 mr-2" />
                    Attendees ({attendeeFields.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => appendAttendee('')}
                    className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attendee
                  </button>
                </div>
                
                {attendeeFields.length > 0 && (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {attendeeFields.map((field, index) => (
                      <Controller
                        key={field.id}
                        name={`attendees.${index}`}
                        control={control}
                        render={({ field: attendeeField }) => (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <input
                                {...attendeeField}
                                type="email"
                                className={`w-full px-3 py-2 border rounded-lg ${
                                  errors.attendees?.[index]
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-gray-300 focus:border-blue-500'
                                } focus:ring-2 focus:ring-opacity-20`}
                                placeholder="Enter email address"
                                disabled={isLoading}
                              />
                              {errors.attendees?.[index] && (
                                <p className="mt-1 text-xs text-red-600">
                                  {errors.attendees[index].message}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttendee(index)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={isLoading}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Enhanced Reminders Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Bell className="h-4 w-4 mr-2" />
                    Reminders ({reminderFields.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => appendReminder({ type: 'popup', minutes: 30 })}
                    className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Reminder
                  </button>
                </div>

                {/* Quick reminder presets */}
                <div className="flex flex-wrap gap-2">
                  {reminderPresets.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => appendReminder({ type: 'popup', minutes: preset.minutes })}
                      className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                
                <div className="space-y-3">
                  {reminderFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Controller
                        name={`reminders.${index}.type`}
                        control={control}
                        render={({ field: typeField }) => (
                          <select
                            {...typeField}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-20"
                            disabled={isLoading}
                          >
                            <option value="popup">🔔 Popup</option>
                            <option value="email">📧 Email</option>
                          </select>
                        )}
                      />
                      <Controller
                        name={`reminders.${index}.minutes`}
                        control={control}
                        render={({ field: minutesField }) => (
                          <select
                            {...minutesField}
                            onChange={(e) => minutesField.onChange(parseInt(e.target.value))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-20"
                            disabled={isLoading}
                          >
                            <option value={0}>At event time</option>
                            <option value={5}>5 minutes before</option>
                            <option value={15}>15 minutes before</option>
                            <option value={30}>30 minutes before</option>
                            <option value={60}>1 hour before</option>
                            <option value={120}>2 hours before</option>
                            <option value={1440}>1 day before</option>
                            <option value={2880}>2 days before</option>
                            <option value={10080}>1 week before</option>
                          </select>
                        )}
                      />
                      {reminderFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReminder(index)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={isLoading}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* File Attachments */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attachments
                </label>
                
                <div className="space-y-3">
                  {/* File Drop Zone */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                    <div className="flex flex-col items-center text-center">
                      <Paperclip className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Drag & drop files here, or{' '}
                        <label className="text-blue-500 hover:text-blue-600 cursor-pointer">
                          browse
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              // Handle file selection
                              console.log(e.target.files)
                            }}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum file size: 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-6 p-4 border-2 border-dashed border-gray-200 rounded-lg">
                  <h4 className="flex items-center text-lg font-semibold text-gray-900">
                    <Info className="h-5 w-5 mr-2" />
                    Advanced Options
                  </h4>

                  {/* Color Picker */}
                  <div className="space-y-3">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Palette className="h-4 w-4 mr-2" />
                      Event Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg border-2 border-gray-300 cursor-pointer"
                        style={{ backgroundColor: selectedColor }}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      />
                      {showColorPicker && (
                        <div className="flex space-x-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setSelectedColor(color)
                                setShowColorPicker(false)
                              }}
                              className="w-6 h-6 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="space-y-3">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Lock className="h-4 w-4 mr-2" />
                      Privacy & Visibility
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        type="button"
                        className="p-3 border-2 border-gray-200 rounded-lg text-left hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">🌍 Public</div>
                            <div className="text-sm text-gray-500">Anyone can see this event</div>
                          </div>
                          <Globe className="h-5 w-5 text-gray-400" />
                        </div>
                      </button>
                      <button
                        type="button"
                        className="p-3 border-2 border-blue-200 bg-blue-50 rounded-lg text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">🔒 Private</div>
                            <div className="text-sm text-gray-500">Only you and attendees</div>
                          </div>
                          <Lock className="h-5 w-5 text-blue-500" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-1/3 border-l border-gray-200 p-6 bg-gray-50">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Event Preview
              </h4>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  className="h-2"
                  style={{ backgroundColor: selectedColor }}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="font-semibold text-gray-900 flex-1">
                      {watchedTitle || 'Untitled Event'}
                    </h5>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(watchedPriority)}`}>
                      {watchedPriority}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {watchedStart && moment(watchedStart).format('MMM DD, YYYY @ h:mm A')}
                    </div>
                    {watchedStart && watchedEnd && (
                      <div className="flex items-center">
                        <span className="w-4 h-4 mr-2" />
                        Duration: {moment.duration(moment(watchedEnd).diff(moment(watchedStart))).humanize()}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      {getCategoryIcon(watchedCategory)} {watchedCategory}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Validation Status */}
              <div className="mt-6 p-4 bg-white rounded-lg border">
                <h5 className="font-medium mb-3">Form Status</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Form Valid</span>
                    {isValid ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Has Changes</span>
                    {isDirty ? (
                      <Check className="h-4 w-4 text-blue-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Fields completed: {Object.keys(touchedFields).length}/8
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Action Bar */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {event?.id && (
                <button
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicate
                </button>
              )}
              {event?.id && (
                <button
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading || !isValid}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {event?.id ? 'Update Event' : 'Create Event'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}