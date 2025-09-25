import React, { useState, useEffect } from 'react';
import { 
  Home, Users, AlertTriangle, Calendar, FileText, Settings, 
  Plus, Clock, MapPin, User, Shield, LogOut, Menu, X,
  CheckCircle, XCircle, Edit, Trash2, Filter, Search,
  Download, Upload, Eye, UserPlus, Building, Truck
} from 'lucide-react';

// Mock data and utilities
const generateMockIncidents = () => [
  {
    id: 'INC-2024-001',
    type: 'Structure Fire',
    address: '123 Main St',
    city: 'Elk River',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    station_status: {
      'Station 1': 'signed_in',
      'Station 2': 'pending',
      'Station 3': 'pending'
    }
  },
  {
    id: 'INC-2024-002', 
    type: 'Medical Emergency',
    address: '456 Oak Ave',
    city: 'Elk River',
    status: 'active',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    station_status: {
      'Station 1': 'complete',
      'Station 2': 'signed_in',
      'Station 3': 'pending'
    }
  }
];

const calculateVacationDays = (yearsOfService) => {
  if (yearsOfService <= 5) return 11;
  if (yearsOfService <= 7) return 14;
  if (yearsOfService <= 9) return 15;
  if (yearsOfService <= 11) return 16;
  if (yearsOfService <= 13) return 17;
  if (yearsOfService <= 15) return 18;
  if (yearsOfService <= 17) return 19;
  if (yearsOfService === 18) return 20;
  if (yearsOfService === 19) return 21;
  if (yearsOfService === 20) return 22;
  if (yearsOfService === 21) return 23;
  if (yearsOfService <= 24) return 24;
  return 25;
};

// Components
const Header = ({ currentUser, onLogout, sidebarOpen, setSidebarOpen }) => (
  <header className="bg-red-600 text-white p-4 flex items-center justify-between shadow-lg">
    <div className="flex items-center space-x-4">
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden p-2 hover:bg-red-700 rounded"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <Shield className="w-8 h-8" />
      <div>
        <h1 className="text-xl font-bold">Fire Department Tracker</h1>
        <p className="text-red-200 text-sm">Enterprise Fire Management System</p>
      </div>
    </div>
    <div className="flex items-center space-x-4">
      <span className="hidden sm:block">Welcome, {currentUser?.name}</span>
      <button 
        onClick={onLogout}
        className="flex items-center space-x-2 bg-red-700 px-4 py-2 rounded hover:bg-red-800"
      >
        <LogOut size={16} />
        <span className="hidden sm:block">Logout</span>
      </button>
    </div>
  </header>
);

const Sidebar = ({ activeModule, setActiveModule, sidebarOpen, setSidebarOpen }) => {
  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'incidents', name: 'Incidents', icon: AlertTriangle },
    { id: 'events', name: 'Events & Training', icon: Calendar },
    { id: 'vacation', name: 'Vacation', icon: User },
    { id: 'reports', name: 'Reports', icon: FileText },
    { id: 'admin', name: 'Admin', icon: Settings },
  ];

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed left-0 top-0 h-full bg-gray-800 text-white w-64 transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="p-4 pt-20 lg:pt-4">
          <nav className="space-y-2">
            {modules.map(module => (
              <button
                key={module.id}
                onClick={() => {
                  setActiveModule(module.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeModule === module.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <module.icon size={20} />
                <span>{module.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

const Dashboard = ({ incidents, events, training }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <AlertTriangle className="mr-2 text-red-500" size={20} />
          Recent Incidents
        </h3>
        <div className="space-y-3">
          {incidents.slice(0, 3).map(incident => (
            <div key={incident.id} className="border-l-4 border-red-500 pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800">{incident.type}</p>
                  <p className="text-sm text-gray-600">{incident.address}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(incident.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  incident.status === 'active' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {incident.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Calendar className="mr-2 text-blue-500" size={20} />
          Upcoming Events
        </h3>
        <div className="space-y-3">
          {events.slice(0, 3).map(event => (
            <div key={event.id} className="border-l-4 border-blue-500 pl-4">
              <p className="font-medium text-gray-800">{event.name}</p>
              <p className="text-sm text-gray-600">{event.type}</p>
              <p className="text-xs text-gray-500">
                {new Date(event.date).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Training */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="mr-2 text-green-500" size={20} />
          Recent Training
        </h3>
        <div className="space-y-3">
          {training.slice(0, 3).map(item => (
            <div key={item.id} className="border-l-4 border-green-500 pl-4">
              <p className="font-medium text-gray-800">{item.name}</p>
              <p className="text-sm text-gray-600">{item.type}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.date).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Station Status Overview */}
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Station Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Station 1', 'Station 2', 'Station 3'].map(station => (
          <div key={station} className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">{station}</h4>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Operational</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Last updated: 5 min ago</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const IncidentsModule = ({ incidents, currentUser, onUpdateIncident }) => {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [signInData, setSignInData] = useState({ badge: '', pin: '', apparatus: '' });
  const [showSignIn, setShowSignIn] = useState(false);

  const handleSignIn = () => {
    if (!signInData.badge || !signInData.pin || !signInData.apparatus) {
      alert('Please fill in all fields');
      return;
    }
    
    // Update incident with sign-in data
    onUpdateIncident(selectedIncident.id, {
      ...selectedIncident,
      station_status: {
        ...selectedIncident.station_status,
        [signInData.apparatus]: 'signed_in'
      }
    });
    
    setShowSignIn(false);
    setSignInData({ badge: '', pin: '', apparatus: '' });
    alert('Successfully signed in to incident');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Incident Management</h2>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700">
          <Plus size={16} />
          <span>New Incident</span>
        </button>
      </div>

      {/* Active Incidents */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-red-600 text-white px-6 py-3 rounded-t-lg">
          <h3 className="font-semibold">Active Incidents</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {incidents.filter(i => i.status === 'active').map(incident => (
              <div key={incident.id} className="border rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-800">{incident.id}</h4>
                    <p className="text-gray-600">{incident.type}</p>
                    <p className="text-sm text-gray-500">
                      <MapPin size={14} className="inline mr-1" />
                      {incident.address}, {incident.city}
                    </p>
                    <p className="text-sm text-gray-500">
                      <Clock size={14} className="inline mr-1" />
                      {new Date(incident.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setSelectedIncident(incident);
                        setShowSignIn(true);
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(incident.station_status).map(([station, status]) => (
                    <div key={station} className="text-center">
                      <p className="text-sm font-medium text-gray-700">{station}</p>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        status === 'complete' ? 'bg-green-100 text-green-800' :
                        status === 'signed_in' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status === 'complete' && <CheckCircle size={12} className="mr-1" />}
                        {status === 'signed_in' && <Clock size={12} className="mr-1" />}
                        {status === 'pending' && <XCircle size={12} className="mr-1" />}
                        {status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="bg-gray-600 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
          <h3 className="font-semibold">Recent Incidents</h3>
          <div className="flex space-x-2">
            <Filter size={16} />
            <Search size={16} />
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personnel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incidents.map(incident => (
                  <tr key={incident.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {incident.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incident.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incident.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(incident.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        incident.status === 'active' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Object.values(incident.station_status).filter(s => s === 'complete').length}/3
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        <Eye size={16} />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Sign In to Incident</h3>
            <p className="text-sm text-gray-600 mb-4">
              Incident: {selectedIncident?.id} - {selectedIncident?.type}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge Number
                </label>
                <input
                  type="text"
                  value={signInData.badge}
                  onChange={(e) => setSignInData({...signInData, badge: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN
                </label>
                <input
                  type="password"
                  value={signInData.pin}
                  onChange={(e) => setSignInData({...signInData, pin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station/Apparatus
                </label>
                <select
                  value={signInData.apparatus}
                  onChange={(e) => setSignInData({...signInData, apparatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Station/Apparatus</option>
                  <option value="Station 1">Station 1</option>
                  <option value="Station 2">Station 2</option>
                  <option value="Station 3">Station 3</option>
                  <option value="ERCA11">ERCA11</option>
                  <option value="ERCA21">ERCA21</option>
                  <option value="ERCA31">ERCA31</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSignIn(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSignIn}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EventsTrainingModule = ({ events, training, onCreateEvent }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [eventType, setEventType] = useState('event');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    date: '',
    duration: '',
    location: '',
    instructor: ''
  });

  const handleSubmit = () => {
    onCreateEvent({
      ...formData,
      id: Date.now().toString(),
      eventType,
      created_by: 'Current User'
    });
    setFormData({
      name: '',
      type: '',
      date: '',
      duration: '',
      location: '',
      instructor: ''
    });
    setShowCreateForm(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Events & Training Management</h2>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>New Event</span>
        </button>
      </div>

      {/* Quick Event Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['Department Meeting', 'Truck Checks', 'Training Drill', 'Community Event'].map(type => (
          <button
            key={type}
            onClick={() => {
              setFormData({...formData, type, name: type});
              setShowCreateForm(true);
            }}
            className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Calendar className="mx-auto mb-2 text-gray-400" size={24} />
            <p className="text-sm font-medium text-gray-700">{type}</p>
          </button>
        ))}
      </div>

      {/* Active Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-blue-600 text-white px-6 py-3 rounded-t-lg">
            <h3 className="font-semibold">Active Events</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {events.slice(0, 5).map(event => (
                <div key={event.id} className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{event.name}</h4>
                      <p className="text-sm text-gray-600">{event.type}</p>
                      <p className="text-sm text-gray-500">
                        <Clock size={14} className="inline mr-1" />
                        {new Date(event.date).toLocaleString()}
                      </p>
                      {event.location && (
                        <p className="text-sm text-gray-500">
                          <MapPin size={14} className="inline mr-1" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                      Sign In
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-green-600 text-white px-6 py-3 rounded-t-lg">
            <h3 className="font-semibold">Training Sessions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {training.slice(0, 5).map(item => (
                <div key={item.id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.type}</p>
                      <p className="text-sm text-gray-500">
                        <Clock size={14} className="inline mr-1" />
                        {new Date(item.date).toLocaleString()}
                      </p>
                      {item.instructor && (
                        <p className="text-sm text-gray-500">
                          <User size={14} className="inline mr-1" />
                          Instructor: {item.instructor}
                        </p>
                      )}
                    </div>
                    <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                      Sign In
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Event/Training</h3>
            
            <div className="space-y-4">
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="event"
                    checked={eventType === 'event'}
                    onChange={(e) => setEventType(e.target.value)}
                    className="mr-2"
                  />
                  Event
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="training"
                    checked={eventType === 'training'}
                    onChange={(e) => setEventType(e.target.value)}
                    className="mr-2"
                  />
                  Training
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    {eventType === 'event' ? (
                      <>
                        <option value="Department Meeting">Department Meeting</option>
                        <option value="Truck Checks">Truck Checks</option>
                        <option value="Station Cleanup">Station Cleanup/Work Detail</option>
                        <option value="Committee Meeting">Committee Meeting</option>
                        <option value="Officers Meeting">Officers Meeting</option>
                        <option value="Community Event">Community Event</option>
                        <option value="Public Education">Public Education</option>
                      </>
                    ) : (
                      <>
                        <option value="Department Training">Department Training</option>
                        <option value="Technical Rescue">Technical Rescue Training</option>
                        <option value="EMR/EMT Training">EMR/EMT Training</option>
                        <option value="Training Prep">Department Training Prep</option>
                        <option value="Outside Classes">Outside Classes/Training</option>
                      </>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {eventType === 'training' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructor
                    </label>
                    <input
                      type="text"
                      value={formData.instructor}
                      onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create {eventType === 'event' ? 'Event' : 'Training'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VacationModule = ({ currentUser, personnel, vacationRequests, onSubmitVacationRequest }) => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [authData, setAuthData] = useState({ badge: '', pin: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requestData, setRequestData] = useState({
    startDate: '',
    endDate: '',
    days: 1,
    reason: ''
  });

  const userVacationData = personnel.find(p => p.badge === currentUser?.badge) || {
    yearsOfService: 5,
    vacationDaysUsed: 3
  };

  const totalVacationDays = calculateVacationDays(userVacationData.yearsOfService);
  const remainingDays = totalVacationDays - userVacationData.vacationDaysUsed;

  const handleAuth = () => {
    if (authData.badge && authData.pin) {
      setIsAuthenticated(true);
    } else {
      alert('Please enter badge number and PIN');
    }
  };

  const handleRequestSubmit = () => {
    onSubmitVacationRequest({
      ...requestData,
      id: Date.now().toString(),
      userId: currentUser?.id,
      status: 'pending',
      submittedAt: new Date().toISOString()
    });
    setRequestData({
      startDate: '',
      endDate: '',
      days: 1,
      reason: ''
    });
    setShowRequestForm(false);
    alert('Vacation request submitted successfully');
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Vacation Management</h2>
        
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Authentication Required</h3>
          <p className="text-gray-600 mb-4 text-center">
            Please enter your badge number and PIN to access vacation information.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge Number
              </label>
              <input
                type="text"
                value={authData.badge}
                onChange={(e) => setAuthData({...authData, badge: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN
              </label>
              <input
                type="password"
                value={authData.pin}
                onChange={(e) => setAuthData({...authData, pin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Access Vacation Information
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Vacation Management</h2>
        <button
          onClick={() => setShowRequestForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>Request Vacation</span>
        </button>
      </div>

      {/* Vacation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Days</h3>
          <p className="text-3xl font-bold text-blue-600">{totalVacationDays}</p>
          <p className="text-sm text-gray-500">Based on {userVacationData.yearsOfService} years service</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Used Days</h3>
          <p className="text-3xl font-bold text-orange-600">{userVacationData.vacationDaysUsed}</p>
          <p className="text-sm text-gray-500">This year</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Remaining</h3>
          <p className="text-3xl font-bold text-green-600">{remainingDays}</p>
          <p className="text-sm text-gray-500">Available days</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {vacationRequests.filter(r => r.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-500">Requests</p>
        </div>
      </div>

      {/* Vacation Formula Reference */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-gray-600 text-white px-6 py-3 rounded-t-lg">
          <h3 className="font-semibold">Vacation Day Calculation</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><strong>Start-5th year:</strong> 11 days</div>
            <div><strong>6th-7th year:</strong> 14 days</div>
            <div><strong>8th-9th year:</strong> 15 days</div>
            <div><strong>10th-11th year:</strong> 16 days</div>
            <div><strong>12th-13th year:</strong> 17 days</div>
            <div><strong>14th-15th year:</strong> 18 days</div>
            <div><strong>16th-17th year:</strong> 19 days</div>
            <div><strong>18th year:</strong> 20 days</div>
            <div><strong>19th year:</strong> 21 days</div>
            <div><strong>20th year:</strong> 22 days</div>
            <div><strong>21st year:</strong> 23 days</div>
            <div><strong>22nd-24th year:</strong> 24 days</div>
            <div><strong>25th+ year:</strong> 25 days</div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            * Vacation is only allowed in 24-hour periods (midnight to midnight)
          </p>
        </div>
      </div>

      {/* Request History */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="bg-blue-600 text-white px-6 py-3 rounded-t-lg">
          <h3 className="font-semibold">Vacation Request History</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vacationRequests.map(request => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.startDate} to {request.endDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.days}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {request.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Request Vacation Time</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={requestData.startDate}
                  onChange={(e) => setRequestData({...requestData, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={requestData.endDate}
                  onChange={(e) => setRequestData({...requestData, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Days
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={remainingDays}
                  value={requestData.days}
                  onChange={(e) => setRequestData({...requestData, days: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You have {remainingDays} days remaining
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={requestData.reason}
                  onChange={(e) => setRequestData({...requestData, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportsModule = ({ incidents, personnel, vacationRequests, currentUser }) => {
  const [authData, setAuthData] = useState({ badge: '', pin: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');

  const handleAuth = () => {
    if (authData.badge && authData.pin) {
      setIsAuthenticated(true);
    } else {
      alert('Please enter badge number and PIN');
    }
  };

  const calculateCallPercentage = (userId, period) => {
    const totalCalls = incidents.length;
    const userCalls = incidents.filter(i => 
      i.personnel && i.personnel.includes(userId)
    ).length;
    return totalCalls > 0 ? Math.round((userCalls / totalCalls) * 100) : 0;
  };

  const generateCallStats = () => {
    const callsByType = {};
    const callsByMonth = {};
    
    incidents.forEach(incident => {
      callsByType[incident.type] = (callsByType[incident.type] || 0) + 1;
      
      const month = new Date(incident.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      callsByMonth[month] = (callsByMonth[month] || 0) + 1;
    });

    return { callsByType, callsByMonth };
  };

  const stats = generateCallStats();

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports & Statistics</h2>
        
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Authentication Required</h3>
          <p className="text-gray-600 mb-4 text-center">
            Please enter your badge number and PIN to access detailed reports.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge Number
              </label>
              <input
                type="text"
                value={authData.badge}
                onChange={(e) => setAuthData({...authData, badge: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN
              </label>
              <input
                type="password"
                value={authData.pin}
                onChange={(e) => setAuthData({...authData, pin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Access Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Reports & Statistics</h2>
        <div className="flex space-x-2">
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="overview">Overview</option>
            <option value="personal">Personal Stats</option>
            <option value="department">Department Stats</option>
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-700">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {selectedReport === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Incidents</h3>
              <p className="text-3xl font-bold text-red-600">{incidents.length}</p>
              <p className="text-sm text-gray-500">All time</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Active Personnel</h3>
              <p className="text-3xl font-bold text-blue-600">{personnel.length}</p>
              <p className="text-sm text-gray-500">Current roster</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Response Rate</h3>
              <p className="text-3xl font-bold text-green-600">87%</p>
              <p className="text-sm text-gray-500">Average</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Avg Response Time</h3>
              <p className="text-3xl font-bold text-orange-600">6.2</p>
              <p className="text-sm text-gray-500">Minutes</p>
            </div>
          </div>

          {/* Calls by Type */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-gray-600 text-white px-6 py-3 rounded-t-lg">
              <h3 className="font-semibold">Incidents by Type</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.callsByType).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600">{type}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'personal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Performance</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {calculateCallPercentage(currentUser?.id, selectedPeriod)}%
                </p>
                <p className="text-sm text-gray-600">Call Percentage</p>
                <p className="text-xs text-gray-500">vs department average</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">12</p>
                <p className="text-sm text-gray-600">Calls Attended</p>
                <p className="text-xs text-gray-500">This {selectedPeriod}</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">45</p>
                <p className="text-sm text-gray-600">Training Hours</p>
                <p className="text-xs text-gray-500">This year</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-t-lg">
              <h3 className="font-semibold">Call Credit Details</h3>
            </div>
            <div className="p-6">
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Note:</strong> Call percentages are calculated as attended calls vs. total department calls.</p>
                <p>• Duty Officer only calls are excluded from totals but credit is given if attended</p>
                <p>• Calls during vacation or training events receive credit</p>
                <p>• Multiple sign-ins during vacation/training count as single credit</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'department' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-green-600 text-white px-6 py-3 rounded-t-lg">
              <h3 className="font-semibold">Department Performance</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personnel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Badge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calls Attended</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Training Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {personnel.map(person => (
                      <tr key={person.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {person.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {person.badge}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(Math.random() * 20) + 5}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(Math.random() * 40) + 60}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(Math.random() * 60) + 20}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminModule = ({ personnel, stations, apparatus, vacationRequests, onUpdatePersonnel, onUpdateVacationRequest }) => {
  const [activeTab, setActiveTab] = useState('personnel');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const tabs = [
    { id: 'personnel', name: 'Personnel', icon: Users },
    { id: 'stations', name: 'Stations', icon: Building },
    { id: 'apparatus', name: 'Apparatus', icon: Truck },
    { id: 'vacation', name: 'Vacation Requests', icon: Calendar },
    { id: 'incidents', name: 'Incidents', icon: AlertTriangle },
    { id: 'reports', name: 'Reports', icon: FileText },
  ];

  const handleSave = () => {
    if (activeTab === 'personnel') {
      onUpdatePersonnel(editingItem?.id || Date.now().toString(), formData);
    }
    setShowForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleApproveVacation = (requestId, approved) => {
    onUpdateVacationRequest(requestId, approved ? 'approved' : 'denied');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Administration</h2>
        <div className="flex space-x-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-700">
            <Upload size={16} />
            <span>Import CSV</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-700">
            <Download size={16} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'personnel' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Personnel Management</h3>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      rank: '',
                      badge: '',
                      pin: '',
                      hireDate: '',
                      yearsOfService: 0,
                      vacationDaysUsed: 0
                    });
                    setShowForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-700"
                >
                  <UserPlus size={16} />
                  <span>Add Personnel</span>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Badge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hire Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Years</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vacation Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {personnel.map(person => (
                      <tr key={person.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {person.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {person.rank}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {person.badge}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {person.hireDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {person.yearsOfService}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calculateVacationDays(person.yearsOfService)} total, {person.vacationDaysUsed} used
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(person)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit size={16} />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'vacation' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Vacation Request Management</h3>
              
              <div className="space-y-4">
                {vacationRequests.filter(r => r.status === 'pending').map(request => (
                  <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-800">
                          Vacation Request - {personnel.find(p => p.id === request.userId)?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {request.startDate} to {request.endDate} ({request.days} days)
                        </p>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-600 mt-2">
                            Reason: {request.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveVacation(request.id, true)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveVacation(request.id, false)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stations' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Station Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stations.map(station => (
                  <div key={station.id} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800">{station.name}</h4>
                    <p className="text-sm text-gray-600">{station.address}</p>
                    <p className="text-sm text-gray-500">Apparatus: {station.apparatus?.length || 0}</p>
                    <div className="mt-2 flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Edit size={16} />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'apparatus' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Apparatus Management</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apparatus.map(app => (
                      <tr key={app.code}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {app.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.station}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            <Edit size={16} />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit' : 'Add'} Personnel
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rank</label>
                <select
                  value={formData.rank || ''}
                  onChange={(e) => setFormData({...formData, rank: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Rank</option>
                  <option value="Firefighter">Firefighter</option>
                  <option value="Driver/Operator">Driver/Operator</option>
                  <option value="Lieutenant">Lieutenant</option>
                  <option value="Captain">Captain</option>
                  <option value="Chief">Chief</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge Number</label>
                <input
                  type="text"
                  required
                  value={formData.badge || ''}
                  onChange={(e) => setFormData({...formData, badge: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
                <input
                  type="password"
                  required
                  value={formData.pin || ''}
                  onChange={(e) => setFormData({...formData, pin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                <input
                  type="date"
                  required
                  value={formData.hireDate || ''}
                  onChange={(e) => setFormData({...formData, hireDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Service</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.yearsOfService || ''}
                  onChange={(e) => setFormData({...formData, yearsOfService: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const FireDepartmentApp = () => {
  const [currentUser] = useState({ 
    id: '1', 
    name: 'John Smith', 
    badge: '123', 
    rank: 'Captain' 
  });
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock data
  const [incidents, setIncidents] = useState(generateMockIncidents());
  const [events, setEvents] = useState([
    {
      id: '1',
      name: 'Department Meeting',
      type: 'Meeting',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      location: 'Station 1'
    },
    {
      id: '2',
      name: 'Truck Checks',
      type: 'Maintenance',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'All Stations'
    }
  ]);
  
  const [training, setTraining] = useState([
    {
      id: '1',
      name: 'EMT Recertification',
      type: 'Medical Training',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      instructor: 'Dr. Johnson'
    }
  ]);

  const [personnel, setPersonnel] = useState([
    {
      id: '1',
      name: 'John Smith',
      rank: 'Captain',
      badge: '123',
      pin: '1234',
      hireDate: '2015-03-15',
      yearsOfService: 9,
      vacationDaysUsed: 5
    },
    {
      id: '2',
      name: 'Jane Doe',
      rank: 'Firefighter',
      badge: '456',
      pin: '5678',
      hireDate: '2020-06-01',
      yearsOfService: 4,
      vacationDaysUsed: 3
    }
  ]);

  const [stations] = useState([
    { id: '1', name: 'Station 1', address: '100 Main St', apparatus: ['ERCA11', 'ERLT11'] },
    { id: '2', name: 'Station 2', address: '200 Oak Ave', apparatus: ['ERCA21', 'ERLT21'] },
    { id: '3', name: 'Station 3', address: '300 Pine St', apparatus: ['ERCA31', 'ERLT31'] }
  ]);

  const [apparatus] = useState([
    { code: 'ERCA11', name: 'Engine 11', station: 'Station 1', type: 'Engine' },
    { code: 'ERCA21', name: 'Engine 21', station: 'Station 2', type: 'Engine' },
    { code: 'ERCA31', name: 'Engine 31', station: 'Station 3', type: 'Engine' },
    { code: 'ERLT11', name: 'Ladder 11', station: 'Station 1', type: 'Ladder' },
    { code: 'ERLT21', name: 'Ladder 21', station: 'Station 2', type: 'Ladder' },
    { code: 'ERLT31', name: 'Ladder 31', station: 'Station 3', type: 'Ladder' }
  ]);

  const [vacationRequests, setVacationRequests] = useState([
    {
      id: '1',
      userId: '1',
      startDate: '2024-12-20',
      endDate: '2024-12-25',
      days: 4,
      reason: 'Holiday vacation',
      status: 'pending',
      submittedAt: new Date().toISOString()
    }
  ]);

  // Event handlers
  const handleUpdateIncident = (id, updatedIncident) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? updatedIncident : inc));
  };

  const handleCreateEvent = (event) => {
    if (event.eventType === 'event') {
      setEvents(prev => [...prev, event]);
    } else {
      setTraining(prev => [...prev, event]);
    }
  };

  const handleSubmitVacationRequest = (request) => {
    setVacationRequests(prev => [...prev, request]);
  };

  const handleUpdatePersonnel = (id, person) => {
    setPersonnel(prev => prev.map(p => p.id === id ? { ...person, id } : p));
  };

  const handleUpdateVacationRequest = (id, status) => {
    setVacationRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleLogout = () => {
    alert('Logged out successfully');
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard incidents={incidents} events={events} training={training} />;
      case 'incidents':
        return (
          <IncidentsModule 
            incidents={incidents} 
            currentUser={currentUser}
            onUpdateIncident={handleUpdateIncident}
          />
        );
      case 'events':
        return (
          <EventsTrainingModule 
            events={events} 
            training={training}
            onCreateEvent={handleCreateEvent}
          />
        );
      case 'vacation':
        return (
          <VacationModule 
            currentUser={currentUser}
            personnel={personnel}
            vacationRequests={vacationRequests}
            onSubmitVacationRequest={handleSubmitVacationRequest}
          />
        );
      case 'reports':
        return (
          <ReportsModule 
            incidents={incidents}
            personnel={personnel}
            vacationRequests={vacationRequests}
            currentUser={currentUser}
          />
        );
      case 'admin':
        return (
          <AdminModule 
            personnel={personnel}
            stations={stations}
            apparatus={apparatus}
            vacationRequests={vacationRequests}
            onUpdatePersonnel={handleUpdatePersonnel}
            onUpdateVacationRequest={handleUpdateVacationRequest}
          />
        );
      default:
        return <Dashboard incidents={incidents} events={events} training={training} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar 
        activeModule={activeModule} 
        setActiveModule={setActiveModule}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          currentUser={currentUser} 
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderActiveModule()}
        </main>
      </div>
    </div>
  );
};

export default FireDepartmentApp;
