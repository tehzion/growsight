import { useState } from 'react';
import { Bell, Calendar, Mail, Smartphone, X } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useReminderStore } from '../../stores/reminderStore';
import { useAuthStore } from '../../stores/authStore';
import { reminderService } from '../../services/reminderService';

interface ReminderSetupProps {
  assessmentId: string;
  assessmentTitle: string;
  dueDate: string;
  onClose: () => void;
  onReminderSet?: () => void;
}

interface ReminderOption {
  id: string;
  label: string;
  date: string;
  description: string;
}

const ReminderSetup = ({ 
  assessmentId, 
  assessmentTitle, 
  dueDate, 
  onClose, 
  onReminderSet 
}: ReminderSetupProps) => {
  const { user } = useAuthStore();
  const { createReminder, isLoading, error } = useReminderStore();
  
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [reminderType, setReminderType] = useState<'email' | 'push' | 'sms'>('email');
  const [customDate, setCustomDate] = useState('');

  // Calculate reminder options based on due date
  const reminderOptions: ReminderOption[] = reminderService.calculateReminderDates(dueDate);
  
  const reminderOptionsList = [
    {
      id: 'oneWeekBefore',
      label: '1 week before',
      date: reminderOptions.oneWeekBefore,
      description: 'Get a head start on your assessment'
    },
    {
      id: 'threeDaysBefore',
      label: '3 days before',
      date: reminderOptions.threeDaysBefore,
      description: 'Final preparation reminder'
    },
    {
      id: 'oneDayBefore',
      label: '1 day before',
      date: reminderOptions.oneDayBefore,
      description: 'Last chance reminder'
    },
    {
      id: 'sameDay',
      label: 'Due date',
      date: reminderOptions.sameDay,
      description: 'Same day notification'
    }
  ];

  const handleReminderToggle = (reminderId: string) => {
    setSelectedReminders(prev => 
      prev.includes(reminderId)
        ? prev.filter(id => id !== reminderId)
        : [...prev, reminderId]
    );
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDate(e.target.value);
  };

  const handleSaveReminders = async () => {
    if (!user || selectedReminders.length === 0) return;

    try {
      // Create reminders for each selected option
      for (const reminderId of selectedReminders) {
        const option = reminderOptionsList.find(opt => opt.id === reminderId);
        if (option) {
          await createReminder(user.id, {
            assessmentId,
            assessmentTitle,
            dueDate,
            reminderDate: option.date,
            type: reminderType
          });
        }
      }

      // Create custom reminder if custom date is set
      if (customDate) {
        await createReminder(user.id, {
          assessmentId,
          assessmentTitle,
          dueDate,
          reminderDate: new Date(customDate).toISOString(),
          type: reminderType
        });
      }

      onReminderSet?.();
      onClose();
    } catch (error) {
      console.error('Failed to create reminders:', error);
    }
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Set Reminders</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">{assessmentTitle}</h3>
            <p className="text-sm text-gray-600">
              Due: {new Date(dueDate).toLocaleDateString()}
            </p>
          </div>

          {/* Reminder Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
                { value: 'push', label: 'Push', icon: <Bell className="h-4 w-4" /> },
                { value: 'sms', label: 'SMS', icon: <Smartphone className="h-4 w-4" /> }
              ].map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReminderType(type.value as any)}
                  className={`p-2 rounded-md border text-sm font-medium transition-colors ${
                    reminderType === type.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    {type.icon}
                    <span>{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reminder Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When to remind you
            </label>
            <div className="space-y-2">
              {reminderOptionsList.map(option => (
                <label
                  key={option.id}
                  className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedReminders.includes(option.id)}
                    onChange={() => handleReminderToggle(option.id)}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(option.date).toLocaleDateString()}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom reminder date (optional)
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="datetime-local"
                value={customDate}
                onChange={handleCustomDateChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                min={new Date().toISOString().slice(0, 16)}
                max={dueDate.slice(0, 16)}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveReminders}
              disabled={selectedReminders.length === 0 && !customDate}
              loading={isLoading}
              className="flex-1"
            >
              Set Reminders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReminderSetup; 