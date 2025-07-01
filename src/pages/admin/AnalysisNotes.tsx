import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Tag, 
  User, 
  Save, 
  Trash2, 
  Plus,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Building2,
  Users,
  BarChart4,
  X
} from 'lucide-react';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useProfileStore } from '../../stores/profileStore';
import { useNotificationStore } from '../../stores/notificationStore';

interface AnalysisNote {
  id: string;
  userId: string;
  organizationId: string;
  departmentId?: string;
  title: string;
  content: string;
  tags: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  category: 'training' | 'performance' | 'development' | 'other';
}

const AnalysisNotes: React.FC = () => {
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUserStore();
  const { organizations, currentOrganization, fetchOrganizations } = useOrganizationStore();
  const { profileTags } = useProfileStore();
  const { addNotification } = useNotificationStore();
  
  const [notes, setNotes] = useState<AnalysisNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<AnalysisNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<AnalysisNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    organization: '',
    department: '',
    category: '',
    status: '',
    tag: ''
  });
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    userId: '',
    category: 'development' as 'training' | 'performance' | 'development' | 'other',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published'
  });
  
  const [newTag, setNewTag] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Mock data for demo
  const mockNotes: AnalysisNote[] = [
    {
      id: 'note-1',
      userId: '3', // John Doe
      organizationId: 'demo-org-1',
      departmentId: 'dept-3', // Engineering
      title: 'Leadership Training Recommendation',
      content: 'Based on the 360° feedback results, John would benefit from our advanced leadership training program. His communication skills are strong, but he needs development in strategic thinking and delegation.',
      tags: ['leadership', 'training', 'communication'],
      createdById: '1', // Super Admin
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'published',
      category: 'training'
    },
    {
      id: 'note-2',
      userId: '4', // Jane Smith
      organizationId: 'demo-org-1',
      departmentId: 'dept-2', // HR
      title: 'Performance Improvement Plan',
      content: 'Jane needs to improve her technical skills according to recent assessments. Recommend enrolling in our technical certification program with quarterly check-ins.',
      tags: ['performance', 'technical', 'certification'],
      createdById: '2', // Org Admin
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'published',
      category: 'performance'
    },
    {
      id: 'note-3',
      userId: '9', // Robert Taylor (Subscriber)
      organizationId: 'demo-org-1',
      title: 'Subscription Analysis',
      content: 'Robert has been actively using the platform for data analysis. His organization would benefit from the advanced analytics package based on usage patterns.',
      tags: ['subscriber', 'analytics', 'upgrade'],
      createdById: '1', // Super Admin
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      category: 'other'
    }
  ];
  
  useEffect(() => {
    // Load mock data
    setNotes(mockNotes);
    setFilteredNotes(mockNotes);
    
    // Fetch users and organizations
    if (user?.role === 'super_admin') {
      fetchOrganizations();
      fetchUsers();
    } else if (user?.organizationId) {
      fetchUsers(user.organizationId);
    }
  }, [user, fetchOrganizations, fetchUsers]);
  
  useEffect(() => {
    // Apply filters and search
    let filtered = notes;
    let activeFiltersList: string[] = [];
    
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (filters.organization) {
      filtered = filtered.filter(note => note.organizationId === filters.organization);
      activeFiltersList.push('Organization');
    }
    
    if (filters.department) {
      filtered = filtered.filter(note => note.departmentId === filters.department);
      activeFiltersList.push('Department');
    }
    
    if (filters.category) {
      filtered = filtered.filter(note => note.category === filters.category);
      activeFiltersList.push('Category');
    }
    
    if (filters.status) {
      filtered = filtered.filter(note => note.status === filters.status);
      activeFiltersList.push('Status');
    }
    
    if (filters.tag) {
      filtered = filtered.filter(note => note.tags.includes(filters.tag));
      activeFiltersList.push('Tag');
    }
    
    setFilteredNotes(filtered);
    setActiveFilters(activeFiltersList);
  }, [notes, searchTerm, filters]);
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  const handleSave = async () => {
    if (!formData.title || !formData.content || !formData.userId) {
      alert('Please fill in all required fields');
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isEditing && selectedNote) {
        // Update existing note
        const updatedNotes = notes.map(note => 
          note.id === selectedNote.id 
            ? {
                ...note,
                title: formData.title,
                content: formData.content,
                userId: formData.userId,
                category: formData.category,
                tags: formData.tags,
                status: formData.status,
                updatedAt: new Date().toISOString()
              }
            : note
        );
        
        setNotes(updatedNotes);
        
        // Add notification
        addNotification({
          title: 'Note Updated',
          message: `The analysis note "${formData.title}" has been updated successfully.`,
          type: 'success'
        });
      } else {
        // Create new note
        const newNote: AnalysisNote = {
          id: `note-${Date.now()}`,
          userId: formData.userId,
          organizationId: user?.organizationId || 'demo-org-1',
          departmentId: users.find(u => u.id === formData.userId)?.departmentId,
          title: formData.title,
          content: formData.content,
          tags: formData.tags,
          createdById: user?.id || '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: formData.status,
          category: formData.category
        };
        
        setNotes([...notes, newNote]);
        
        // Add notification
        addNotification({
          title: 'Note Created',
          message: `A new analysis note "${formData.title}" has been created successfully.`,
          type: 'success'
        });
      }
      
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        setIsEditing(false);
        setIsCreating(false);
        setSelectedNote(null);
        resetForm();
      }, 1500);
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveStatus('error');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to save note: ${(error as Error).message || 'Unknown error'}`,
        type: 'error'
      });
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this analysis note?')) {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const noteToDelete = notes.find(note => note.id === id);
        setNotes(notes.filter(note => note.id !== id));
        
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setIsEditing(false);
          resetForm();
        }
        
        // Add notification
        if (noteToDelete) {
          addNotification({
            title: 'Note Deleted',
            message: `The analysis note "${noteToDelete.title}" has been deleted.`,
            type: 'info'
          });
        }
      } catch (error) {
        console.error('Failed to delete note:', error);
        
        // Add error notification
        addNotification({
          title: 'Error',
          message: `Failed to delete note: ${(error as Error).message || 'Unknown error'}`,
          type: 'error'
        });
      }
    }
  };
  
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      userId: '',
      category: 'development',
      tags: [],
      status: 'draft'
    });
  };
  
  const handleEdit = (note: AnalysisNote) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      userId: note.userId,
      category: note.category,
      tags: [...note.tags],
      status: note.status
    });
    setIsEditing(true);
    setIsCreating(false);
  };
  
  const handleCreate = () => {
    setSelectedNote(null);
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
  };
  
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };
  
  const getUserRole = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.role : '';
  };
  
  const getOrganizationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : 'Unknown Organization';
  };
  
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'training': return 'Training';
      case 'performance': return 'Performance';
      case 'development': return 'Development';
      case 'other': return 'Other';
      default: return category;
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'training': return 'bg-primary-100 text-primary-800';
      case 'performance': return 'bg-warning-100 text-warning-800';
      case 'development': return 'bg-success-100 text-success-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-success-100 text-success-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'org_admin': return 'bg-indigo-100 text-indigo-800';
      case 'subscriber': return 'bg-accent-100 text-accent-800';
      case 'employee': return 'bg-blue-100 text-blue-800';
      case 'reviewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get all unique tags from notes
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));
  
  // Check if user has permission to manage notes
  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const canManageNotes = isSuperAdmin || isOrgAdmin;
  
  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      organization: '',
      department: '',
      category: '',
      status: '',
      tag: ''
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis Notes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage analysis notes for users based on assessment results
          </p>
        </div>
        {canManageNotes && !isCreating && !isEditing && (
          <Button
            onClick={handleCreate}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Note
          </Button>
        )}
      </div>
      
      {/* Create/Edit Form */}
      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Analysis Note' : 'Create Analysis Note'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User
                  </label>
                  <select
                    name="userId"
                    value={formData.userId}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(content) => {
                    // Sanitize content to prevent XSS attacks
                    const sanitizedContent = DOMPurify.sanitize(content, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a'],
                      ALLOWED_ATTR: ['href', 'target', 'rel'],
                      ALLOW_DATA_ATTR: false
                    });
                    setFormData(prev => ({ ...prev, content: sanitizedContent }));
                  }}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                  className="h-40 mb-12"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="training">Training</option>
                    <option value="performance">Performance</option>
                    <option value="development">Development</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <div key={tag} className="flex items-center bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                      <span>{tag}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-gray-500 hover:text-gray-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Suggested tags */}
                {profileTags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {profileTags.filter(tag => !formData.tags.includes(tag)).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              tags: [...prev.tags, tag]
                            }));
                          }}
                          className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 bg-gray-50 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
                setSelectedNote(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={saveStatus === 'saving'}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'saved' ? 'Saved!' : 
               saveStatus === 'error' ? 'Try Again' : 
               'Save Note'}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Filters and Search */}
      {!isCreating && !isEditing && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {isSuperAdmin && (
                <div>
                  <select
                    value={filters.organization}
                    onChange={(e) => handleFilterChange('organization', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">All Organizations</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">All Categories</option>
                  <option value="training">Training</option>
                  <option value="performance">Performance</option>
                  <option value="development">Development</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              
              <div>
                <select
                  value={filters.tag}
                  onChange={(e) => handleFilterChange('tag', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Active Filters Indicator */}
            {activeFilters.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">
                    Filters Applied: {activeFilters.join(', ')}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Notes List */}
      {!isCreating && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredNotes.length === 0 ? (
            <div className="md:col-span-3 text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No analysis notes found</h3>
              <p className="text-gray-500 mt-1">
                {searchTerm || Object.values(filters).some(Boolean)
                  ? 'Try adjusting your search or filters'
                  : 'Create your first analysis note to get started'
                }
              </p>
              {canManageNotes && (
                <Button
                  onClick={handleCreate}
                  className="mt-4"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create Note
                </Button>
              )}
            </div>
          ) : (
            filteredNotes.map(note => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                    <div className="flex space-x-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                        {note.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(note.category)}`}>
                        {getCategoryLabel(note.category)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <User className="h-4 w-4 mr-1" />
                    <span>{getUserName(note.userId)}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(getUserRole(note.userId))}`}>
                      {getUserRole(note.userId)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div 
                    className="text-sm text-gray-600 line-clamp-3"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(note.content, {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a'],
                        ALLOWED_ATTR: ['href', 'target', 'rel'],
                        ALLOW_DATA_ATTR: false
                      })
                    }}
                  />
                  
                  <div className="flex flex-wrap gap-1 mt-3">
                    {note.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    {canManageNotes && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          onClick={() => handleDelete(note.id)}
                          className="text-error-600 hover:text-error-700 hover:bg-error-50"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(note)}
                        >
                          View & Edit
                        </Button>
                      </>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Analytics Dashboard */}
      {!isCreating && !isEditing && filteredNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart4 className="h-5 w-5 mr-2" />
              Analysis Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                <h3 className="font-medium text-primary-800 mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Top Tags
                </h3>
                <div className="space-y-2">
                  {['leadership', 'communication', 'technical', 'training'].map(tag => (
                    <div key={tag} className="flex justify-between items-center">
                      <span className="text-sm text-primary-700">{tag}</span>
                      <span className="text-sm font-medium text-primary-800">
                        {notes.filter(note => note.tags.includes(tag)).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-secondary-50 p-4 rounded-lg border border-secondary-200">
                <h3 className="font-medium text-secondary-800 mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  User Role Distribution
                </h3>
                <div className="space-y-2">
                  {['employee', 'reviewer', 'subscriber', 'org_admin'].map(role => (
                    <div key={role} className="flex justify-between items-center">
                      <span className="text-sm text-secondary-700 capitalize">{role.replace('_', ' ')}</span>
                      <span className="text-sm font-medium text-secondary-800">
                        {notes.filter(note => getUserRole(note.userId) === role).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-success-50 p-4 rounded-lg border border-success-200">
                <h3 className="font-medium text-success-800 mb-2 flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Category Breakdown
                </h3>
                <div className="space-y-2">
                  {['training', 'performance', 'development', 'other'].map(category => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-success-700 capitalize">{category}</span>
                      <span className="text-sm font-medium text-success-800">
                        {notes.filter(note => note.category === category).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Recommendations</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <strong>Training Focus:</strong> Leadership training is the most common recommendation</p>
                <p>• <strong>Skill Gaps:</strong> Technical skills are frequently mentioned as areas for improvement</p>
                <p>• <strong>Subscriber Analysis:</strong> Subscribers show interest in advanced analytics features</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisNotes;