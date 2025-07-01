import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Filter, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  X,
  ChevronDown,
  Paperclip,
  Send,
  User,
  Calendar,
  ArrowUpRight,
  Tag,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { SupportTicket, TicketMessage, PriorityLevel, TicketCategory, TicketStatus } from '../../types';
import { useSupportStore } from '../../stores/supportStore';
import TicketForm from '../../components/support/TicketForm';
import TicketChat from '../../components/support/TicketChat';

const SupportHub: React.FC = () => {
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUserStore();
  const { currentOrganization } = useOrganizationStore();
  const { 
    tickets, 
    fetchTickets, 
    createTicket, 
    updateTicketStatus, 
    assignTicket, 
    isLoading, 
    error 
  } = useSupportStore();
  
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const isStaff = !isSuperAdmin && !isOrgAdmin;
  
  useEffect(() => {
    if (user) {
      fetchTickets(user.id, user.role, user.organizationId);
      
      if (isSuperAdmin || isOrgAdmin) {
        fetchUsers(user.organizationId);
      }
    }
  }, [user, fetchTickets, fetchUsers, isSuperAdmin, isOrgAdmin]);
  
  useEffect(() => {
    // Apply filters
    let filtered = tickets;
    
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.description && ticket.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter);
    }
    
    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (user) {
        await fetchTickets(user.id, user.role);
      }
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      
      // Update selected ticket if it's the one being changed
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: newStatus,
          ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}),
          ...(newStatus === 'closed' ? { closedAt: new Date().toISOString() } : {})
        });
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };
  
  const handleAssign = async (ticketId: string, userId: string) => {
    try {
      await assignTicket(ticketId, userId);
      
      // Update selected ticket if it's the one being assigned
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          assignedToId: userId
        });
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };
  
  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Open</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>;
      case 'resolved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Resolved</span>;
      case 'closed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Closed</span>;
      case 'escalated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Escalated</span>;
      default:
        return null;
    }
  };
  
  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Urgent</span>;
      case 'normal':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Normal</span>;
      case 'low':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Low</span>;
      default:
        return null;
    }
  };
  
  const getCategoryBadge = (category: TicketCategory) => {
    switch (category) {
      case 'technical_support':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Technical Support</span>;
      case 'training_request':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Training Request</span>;
      case 'consultation':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Consultation</span>;
      default:
        return null;
    }
  };
  
  const getUserName = (userId?: string) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  const getUserDepartment = (userId?: string) => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown';
    
    // Mock department data based on user ID
    const departmentMap: Record<string, string> = {
      '3': 'Engineering',
      '4': 'Marketing',
      '5': 'Sales',
      '2': 'Human Resources',
      '7': 'Technology'
    };
    return departmentMap[userId] || 'General';
  };

  const getUserJobTitle = (userId?: string) => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown';
    
    // Mock job title data based on user ID
    const jobTitleMap: Record<string, string> = {
      '3': 'Software Engineer',
      '4': 'Marketing Manager',
      '5': 'Sales Representative',
      '2': 'HR Director',
      '7': 'Tech Lead'
    };
    return jobTitleMap[userId] || 'Staff Member';
  };

  const getUserLocation = (userId?: string) => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown';
    
    // Mock location data based on user ID
    const locationMap: Record<string, string> = {
      '3': 'San Francisco, CA',
      '4': 'New York, NY',
      '5': 'Chicago, IL',
      '2': 'New York, NY',
      '7': 'Austin, TX'
    };
    return locationMap[userId] || 'Remote';
  };
  
  const getTicketAge = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support & Consultation</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isStaff 
              ? 'Submit support requests and get assistance from your organization administrators' 
              : isOrgAdmin
                ? `Manage support requests for ${currentOrganization?.name}`
                : 'Manage support requests across all organizations'
            }
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          {!selectedTicket && (
            <Button
              onClick={() => {
                setShowNewTicketForm(true);
                setSelectedTicket(null);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {showNewTicketForm ? 'Cancel' : 'New Ticket'}
            </Button>
          )}
          {selectedTicket && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTicket(null);
                setShowNewTicketForm(false);
              }}
              leftIcon={<X className="h-4 w-4" />}
            >
              Close Ticket
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className={`${selectedTicket ? 'hidden lg:block' : ''} lg:col-span-1`}>
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle>
                {isStaff ? 'My Tickets' : 'Support Tickets'}
              </CardTitle>
            </CardHeader>
            
            {/* Search and Filters */}
            <div className="px-6 py-2 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
                  className="text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="escalated">Escalated</option>
                </select>
                
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | 'all')}
                  className="text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | 'all')}
                  className="text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Categories</option>
                  <option value="technical_support">Technical Support</option>
                  <option value="training_request">Training Request</option>
                  <option value="consultation">Consultation</option>
                </select>
              </div>
            </div>
            
            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : isStaff
                        ? 'Create your first support ticket to get help'
                        : 'No support tickets have been submitted yet'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowNewTicketForm(false);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</h3>
                          <div className="flex items-center mt-1 space-x-2">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {getTicketAge(ticket.createdAt)}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          <span>
                            {isStaff ? 'You' : getUserName(ticket.staffMemberId)}
                          </span>
                          {(isSuperAdmin || isOrgAdmin) && (
                            <span className="ml-2 text-gray-400">
                              • {ticket.organizationId}
                            </span>
                          )}
                        </div>
                        <div>
                          {getCategoryBadge(ticket.category)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Create New Ticket Button (Mobile) */}
            <CardFooter className="border-t border-gray-200 p-4 lg:hidden">
              <Button
                fullWidth
                onClick={() => {
                  setShowNewTicketForm(true);
                  setSelectedTicket(null);
                }}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                New Ticket
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Ticket Detail or New Ticket Form */}
        <div className="lg:col-span-2">
          {showNewTicketForm ? (
            <TicketForm 
              onSubmit={(data) => {
                createTicket(data);
                setShowNewTicketForm(false);
              }}
              onCancel={() => setShowNewTicketForm(false)}
            />
          ) : selectedTicket ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <div className="flex items-center mt-1 space-x-2">
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                      {getCategoryBadge(selectedTicket.category)}
                    </div>
                  </div>
                  {(isSuperAdmin || isOrgAdmin) && (
                    <div className="flex space-x-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                        className="text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                        <option value="escalated">Escalated</option>
                      </select>
                      
                      {isOrgAdmin && (
                        <select
                          value={selectedTicket.assignedToId || ''}
                          onChange={(e) => handleAssign(selectedTicket.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Unassigned</option>
                          {users
                            .filter(u => u.role === 'org_admin' && u.organizationId === selectedTicket.organizationId)
                            .map(admin => (
                              <option key={admin.id} value={admin.id}>
                                {admin.firstName} {admin.lastName}
                              </option>
                            ))
                          }
                        </select>
                      )}
                      
                      {isSuperAdmin && selectedTicket.status !== 'escalated' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(selectedTicket.id, 'escalated')}
                        >
                          Escalate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>From: {isStaff ? 'You' : getUserName(selectedTicket.staffMemberId)}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>Assigned: {getUserName(selectedTicket.assignedToId)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Created: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    <span>Org: {selectedTicket.organizationId}</span>
                  </div>
                </div>
                
                {/* Additional Details for Super Admin and Org Admin */}
                {(isSuperAdmin || isOrgAdmin) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Ticket Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700">
                      <div>
                        <span className="font-medium">Organization:</span> {selectedTicket.organizationId}
                      </div>
                      <div>
                        <span className="font-medium">Staff Member:</span> {getUserName(selectedTicket.staffMemberId)}
                      </div>
                      {isSuperAdmin && (
                        <>
                          <div>
                            <span className="font-medium">Department:</span> {getUserDepartment(selectedTicket.staffMemberId)}
                          </div>
                          <div>
                            <span className="font-medium">Job Title:</span> {getUserJobTitle(selectedTicket.staffMemberId)}
                          </div>
                        </>
                      )}
                      {isOrgAdmin && (
                        <>
                          <div>
                            <span className="font-medium">Department:</span> {getUserDepartment(selectedTicket.staffMemberId)}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {getUserLocation(selectedTicket.staffMemberId)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedTicket.description && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {selectedTicket.description}
                  </div>
                )}
              </CardHeader>
              
              {/* Ticket Chat */}
              <TicketChat 
                ticketId={selectedTicket.id} 
                status={selectedTicket.status}
              />
            </Card>
          ) : (
            <Card className="h-full flex flex-col justify-center items-center p-8">
              <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Support & Consultation</h3>
              <p className="text-gray-500 text-center mb-6 max-w-md">
                {isStaff 
                  ? 'Submit a support ticket to get help from your organization administrators.'
                  : 'Select a ticket from the list to view details and respond.'
                }
              </p>
              <Button
                onClick={() => {
                  setShowNewTicketForm(true);
                  setSelectedTicket(null);
                }}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create New Ticket
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportHub;