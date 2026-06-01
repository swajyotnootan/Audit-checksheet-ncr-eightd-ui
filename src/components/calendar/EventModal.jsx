import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  Tag, 
  AlertTriangle,
  Edit,
  Trash2,
  Bell,Play, Factory, Target, CheckCircle
} from 'lucide-react'
import moment from 'moment'

// Status display mapping function
const getDisplayStatus = (status) => {
  const statusMap = {
    'UPCOMING': 'Open',
    'RUNNING': 'In Progress',
    'COMPLETED': 'Closed',
    'FINISHED': 'Closed',
    'PAUSED': 'Paused'
  };
  return statusMap[status] || status;
};

export default function EventModal({ event, onClose, onEdit, onDelete }) {
  const getCategoryColor = (category) => {
    const colors = {
      work: 'bg-blue-100 text-blue-800',
      personal: 'bg-green-100 text-green-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    }
    return colors[priority] || 'text-gray-600'
  }

  const formatDateTime = (date) => {
    return moment(date).format('MMM DD, YYYY [at] h:mm A')
  }

  const formatDuration = (start, end) => {
    const duration = moment.duration(moment(end).diff(moment(start)))
    const hours = duration.hours()
    const minutes = duration.minutes()
    
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content compact-modal" onClick={(e) => e.stopPropagation()}>
        {/* Compact Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
              Order No.{event.title || 'Untitled Event'}
            </h3>
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                <Tag className="h-3 w-3 mr-1" />
                {event.category}
              </span>
              <span className={`inline-flex items-center text-xs font-medium ${getPriorityColor(event.priority)}`}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {event.priority}
              </span>
              {event.productionOrderId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Factory className="h-3 w-3 mr-1" />
                  Production
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Compact Content */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Date and Time - Compact */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700">
              <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{formatDateTime(event.start)}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-700">
              <Clock className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>Duration: {formatDuration(event.start, event.end)}</span>
            </div>
          </div>

          {/* Location - Only show if exists */}
          {event.location && (
            <div className="flex items-center text-sm text-gray-700">
              <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Description - Compact */}
          {event.description && (
            <div className="text-sm">
              <div className="flex items-center text-gray-700 mb-1">
                <FileText className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="font-medium">Description</span>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3 pl-6">{event.description}</p>
            </div>
          )}

          {/* Production Information - Compact */}
          {(event.assignedLine || event.productionOrderId || event.status) && (
            <div className="text-sm">
              <div className="flex items-center text-gray-700 mb-2">
                <Factory className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="font-medium">Production Info</span>
              </div>
              <div className="space-y-1 pl-6">
                {event.assignedLine && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Line:</span>
                    <span className="font-medium text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {event.assignedLine}
                    </span>
                  </div>
                )}
                
                {event.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      event.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' :
                      event.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                      event.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {event.status === 'UPCOMING' && <Clock className="h-3 w-3 mr-1" />}
                      {event.status === 'RUNNING' && <Play className="h-3 w-3 mr-1" />}
                      {event.status === 'COMPLETED' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {getDisplayStatus(event.status)}
                    </span>
                  </div>
                )}
                
                {event.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="text-gray-600 text-xs">
                      {moment(event.completedAt).format('MMM DD, h:mm A')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendees - Compact */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="text-sm">
              <div className="flex items-center text-gray-700 mb-1">
                <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="font-medium">Attendees ({event.attendees.length})</span>
              </div>
              <div className="pl-6">
                <div className="text-gray-600 line-clamp-2">
                  {event.attendees.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Reminders - Compact */}
          {event.reminders && event.reminders.length > 0 && (
            <div className="text-sm">
              <div className="flex items-center text-gray-700 mb-1">
                <Bell className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="font-medium">Reminders</span>
              </div>
              <div className="pl-6 space-y-0.5">
                {event.reminders.slice(0, 2).map((reminder, index) => {
                  const timeText = reminder.minutes === 0 ? 'At event time' :
                                 reminder.minutes < 60 ? `${reminder.minutes}m before` :
                                 reminder.minutes === 60 ? '1h before' :
                                 reminder.minutes === 1440 ? '1d before' :
                                 `${Math.floor(reminder.minutes / 60)}h before`
                  
                  return (
                    <div key={index} className="text-gray-600 text-xs">
                      {reminder.type === 'popup' ? '🔔' : '📧'} {timeText}
                    </div>
                  )
                })}
                {event.reminders.length > 2 && (
                  <div className="text-gray-500 text-xs">
                    +{event.reminders.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Compact Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {event.status === 'UPCOMING' && event.assignedLine && !event.isOwner && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('start-production-job', {
                    detail: { 
                      orderId: event.productionOrderId,
                      eventId: event.id 
                    }
                  }));
                  onClose();
                }}
                className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 flex items-center transition-colors"
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            {event.isOwner && (
              <>
                {/* <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center transition-colors"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </button> */}
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this event?')) {
                      onDelete()
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center transition-colors"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .compact-modal {
          max-width: 500px;
          margin: 1rem;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}