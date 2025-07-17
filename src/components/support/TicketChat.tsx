import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Paperclip, X, User, AlertTriangle, Star } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSupportStore } from '../../stores/supportStore';
import { TicketMessage, TicketStatus } from '../../types';
import Button from '../ui/Button';

interface TicketChatProps {
  ticketId: string;
  status: TicketStatus;
}

const TicketChat: React.FC<TicketChatProps> = ({ ticketId, status }) => {
  const { user } = useAuthStore();
  const { messages, fetchMessages, sendMessage, isLoading, addAttachment } = useSupportStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const ticketMessages = useMemo(() => messages[ticketId] || [], [messages, ticketId]);
  const isResolved = status === 'resolved';
  const isClosed = status === 'closed';
  
  useEffect(() => {
    fetchMessages(ticketId);
    
    // Set up polling for new messages
    const interval = setInterval(() => {
      fetchMessages(ticketId);
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [ticketId, fetchMessages]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketMessages]);
  
  useEffect(() => {
    // Show rating prompt when ticket is resolved
    if (isResolved && user && !isClosed) {
      setShowRating(true);
    } else {
      setShowRating(false);
    }
  }, [isResolved, isClosed, user]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!user) return;
    
    setIsSending(true);
    
    try {
      // First send the message
      const messageId = await sendMessage(ticketId, newMessage.trim());
      
      // Then upload any attachments
      if (attachments.length > 0 && messageId) {
        for (const file of attachments) {
          await addAttachment(ticketId, messageId, file);
        }
      }
      
      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const submitRating = async (rating: number) => {
    // In a real implementation, this would update the ticket with the satisfaction rating
    console.log(`Submitting rating ${rating} for ticket ${ticketId}`);
    setSatisfactionRating(rating);
    setShowRating(false);
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && ticketMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : ticketMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gray-100 p-3 rounded-full mb-2">
              <User className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">No messages yet</h3>
            <p className="text-xs text-gray-500 mt-1">
              {isClosed 
                ? 'This ticket is closed.' 
                : 'Start the conversation by sending a message.'}
            </p>
          </div>
        ) : (
          <>
            {ticketMessages.map((message, index) => {
              const isCurrentUser = message.senderId === user?.id;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isCurrentUser 
                        ? 'bg-primary-100 text-primary-900' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <span className="font-medium">
                        {isCurrentUser ? 'You' : message.sender?.firstName || 'User'}
                      </span>
                      <span className="mx-1">•</span>
                      <span>{formatTimestamp(message.createdAt)}</span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{message.messageText}</div>
                    
                    {/* Attachments would be rendered here */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map(attachment => (
                          <div key={attachment.id} className="flex items-center text-xs text-blue-600 hover:text-blue-800">
                            <Paperclip className="h-3 w-3 mr-1" />
                            <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                              {attachment.fileName}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Satisfaction Rating */}
      {showRating && (
        <div className="p-4 bg-primary-50 border-t border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-primary-800">How satisfied are you with the support?</h3>
              <p className="text-xs text-primary-600 mt-1">Your feedback helps us improve our service</p>
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => submitRating(rating)}
                  className={`p-1 rounded-full hover:bg-primary-100 transition-colors ${
                    satisfactionRating === rating ? 'text-yellow-500' : 'text-gray-400'
                  }`}
                >
                  <Star className="h-6 w-6" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Message Input */}
      {!isClosed && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-200">
                  <div className="flex items-center">
                    <Paperclip className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 resize-none"
                rows={2}
              />
            </div>
            
            <div className="flex space-x-2">
              <label className="cursor-pointer">
                <div className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                  <Paperclip className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>
              
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && attachments.length === 0) || isSending}
                isLoading={isSending}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Send
              </Button>
            </div>
          </div>
          
          {isClosed && (
            <div className="mt-2 flex items-center text-xs text-warning-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>This ticket is closed. You cannot send new messages.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketChat;