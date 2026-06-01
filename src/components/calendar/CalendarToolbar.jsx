import { ChevronLeft, ChevronRight, Menu, Grid, List, Calendar as CalendarIcon } from 'lucide-react'
import moment from 'moment'

export default function CalendarToolbar({ 
  view, 
  date, 
  onNavigate, 
  onViewChange, 
  onToggleSidebar, 
  showSidebar,
  layout,
  onLayoutChange,
  userRole // ✅ ADD THIS PROP
}) {
  const navigate = (action) => {
    let newDate = new Date(date)
    
    switch (action) {
      case 'PREV':
        if (view === 'year') {
          newDate.setFullYear(newDate.getFullYear() - 1)
        } else if (view === 'month') {
          newDate.setMonth(newDate.getMonth() - 1)
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() - 7)
        } else if (view === 'day') {
          newDate.setDate(newDate.getDate() - 1)
        }
        break
      case 'NEXT':
        if (view === 'year') {
          newDate.setFullYear(newDate.getFullYear() + 1)
        } else if (view === 'month') {
          newDate.setMonth(newDate.getMonth() + 1)
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() + 7)
        } else if (view === 'day') {
          newDate.setDate(newDate.getDate() + 1)
        }
        break
      case 'TODAY':
        newDate = new Date()
        break
      default:
        return
    }
    
    onNavigate(newDate)
  }

  const getDateLabel = () => {
    switch (view) {
      case 'year':
        return moment(date).format('YYYY')
      case 'month':
        return moment(date).format('MMMM YYYY')
      case 'week':
        const weekStart = moment(date).startOf('week')
        const weekEnd = moment(date).endOf('week')
        if (weekStart.month() === weekEnd.month()) {
          return `${weekStart.format('MMM DD')} - ${weekEnd.format('DD, YYYY')}`
        } else {
          return `${weekStart.format('MMM DD')} - ${weekEnd.format('MMM DD, YYYY')}`
        }
      case 'day':
        return moment(date).format('dddd, MMMM DD, YYYY')
      case 'agenda':
        return moment(date).format('MMMM YYYY')
      default:
        return moment(date).format('MMMM YYYY')
    }
  }

  // ✅ FILTER VIEWS BASED ON USER ROLE
  const getAvailableViews = () => {
    const allViews = ['month', 'week', 'day', 'agenda', 'year'];
    
    if (userRole === 'operator') {
      // Operators only see practical views for their work
      return ['month', 'week', 'day'];
    }
    
    return allViews;
  };

  const availableViews = getAvailableViews();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Navigation */}
        <div className="flex items-center space-x-4">
          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('TODAY')}
              className="btn-secondary text-sm"
            >
              Today
            </button>
            
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => navigate('PREV')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('NEXT')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-r-lg border-l border-gray-300 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Current Date Label */}
          <h2 className="text-xl font-semibold text-gray-900">
            {getDateLabel()}
          </h2>
        </div>

        {/* Right side - View Controls */}
        <div className="flex items-center space-x-4">
          {/* Layout Toggle - Only show for non-year views and operators */}
          {view !== 'year' && userRole !== 'operator' && (
            <div className="hidden sm:flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => onLayoutChange('calendar')}
                className={`p-2 rounded-l-lg transition-colors ${
                  layout === 'calendar'
                    ? 'btn-secondary text-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => onLayoutChange('list')}
                className={`p-2 rounded-r-lg border-l border-gray-300 transition-colors ${
                  layout === 'list'
                    ? 'btn-secondary text-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* View Selector - Filtered based on role */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            {availableViews.map((viewType) => (
              <button
                key={viewType}
                onClick={() => onViewChange(viewType)}
                className={`px-3 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  view === viewType
                    ? 'btn-secondary text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 border-r border-gray-300 last:border-r-0'
                }`}
              >
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}