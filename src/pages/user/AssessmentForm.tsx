import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Save, ArrowLeft, ArrowRight, HelpCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AssessmentGuide from '../../components/assessments/AssessmentGuide';
import QuestionCard from '../../components/assessments/QuestionCard';
import ProgressBar from '../../components/assessments/ProgressBar';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentStore } from '../../stores/assessmentStore';

const AssessmentForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentAssessment, fetchAssessment, isLoading } = useAssessmentStore();
  
  const [showGuide, setShowGuide] = useState(true);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (id) {
      fetchAssessment(id);
    }
  }, [id, fetchAssessment]);

  // Load saved responses from localStorage
  useEffect(() => {
    if (id && user) {
      const savedResponses = localStorage.getItem(`assessment_${id}_${user.id}`);
      if (savedResponses) {
        try {
          setResponses(JSON.parse(savedResponses));
        } catch (error) {
          console.error('Failed to load saved responses:', error);
        }
      }
    }
  }, [id, user]);

  // Auto-save responses
  useEffect(() => {
    if (id && user && Object.keys(responses).length > 0) {
      const timeoutId = setTimeout(() => {
        setSaveStatus('saving');
        localStorage.setItem(`assessment_${id}_${user.id}`, JSON.stringify(responses));
        setTimeout(() => setSaveStatus('saved'), 500);
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [responses, id, user]);

  if (isLoading || !currentAssessment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const currentSection = currentAssessment.sections[currentSectionIndex];

  if (!currentSection) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-warning-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No sections available</h3>
        <p className="text-gray-500">This assessment doesn't have any sections yet.</p>
        <Button
          className="mt-4"
          onClick={() => navigate('/my-assessments')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Assessments
        </Button>
      </div>
    );
  }

  // Calculate progress
  const calculateSectionProgress = () => {
    const sectionQuestions = currentSection.questions;
    const answeredQuestions = sectionQuestions.filter(q => {
      const response = responses[q.id];
      return response?.rating || response?.textResponse || response?.selectedOptionId;
    });
    return sectionQuestions.length > 0 ? (answeredQuestions.length / sectionQuestions.length) * 100 : 0;
  };

  const calculateOverallProgress = () => {
    const totalQuestions = currentAssessment.sections.reduce((acc, section) => 
      acc + section.questions.length, 0
    );
    const answeredQuestions = Object.values(responses).filter(r => 
      r.rating || r.textResponse || r.selectedOptionId
    ).length;
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  };

  const handleResponseChange = (questionId: string, type: 'main' | 'comment', value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [type === 'main' ? getResponseKey(questionId) : 'comment']: value
      }
    }));
  };

  const getResponseKey = (questionId: string) => {
    const question = currentSection.questions.find(q => q.id === questionId);
    switch (question?.questionType) {
      case 'rating':
        return 'rating';
      case 'multiple_choice':
        return 'selectedOptionId';
      case 'yes_no':
      case 'text':
        return 'textResponse';
      default:
        return '';
    }
  };

  const isQuestionValid = (questionId: string) => {
    const question = currentSection.questions.find(q => q.id === questionId);
    if (!question?.isRequired) return true;

    const response = responses[questionId];
    return Boolean(response?.rating || response?.textResponse || response?.selectedOptionId);
  };

  const isSectionComplete = () => {
    return currentSection.questions.every(q => isQuestionValid(q.id));
  };

  const getInvalidQuestions = () => {
    return currentSection.questions.filter(q => !isQuestionValid(q.id));
  };

  const handleNext = () => {
    if (currentSectionIndex < currentAssessment.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      // Scroll to top when moving to next section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveProgress = async () => {
    setSaveStatus('saving');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (id && user) {
        localStorage.setItem(`assessment_${id}_${user.id}`, JSON.stringify(responses));
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear saved responses
      if (id && user) {
        localStorage.removeItem(`assessment_${id}_${user.id}`);
      }
      
      alert('Assessment submitted successfully! Your responses have been recorded and will be reviewed.');
      navigate('/my-assessments');
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      alert('Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const invalidQuestions = getInvalidQuestions();
  const sectionProgress = calculateSectionProgress();
  const overallProgress = calculateOverallProgress();
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate('/my-assessments')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentAssessment.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {currentAssessment.description}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowGuide(!showGuide)}
            leftIcon={<HelpCircle className="h-4 w-4" />}
          >
            {showGuide ? 'Hide Guide' : 'Show Guide'}
          </Button>
          <Button
            onClick={handleSaveProgress}
            variant="outline"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={saveStatus === 'saving'}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' : 
             saveStatus === 'saved' ? 'Saved' : 
             saveStatus === 'error' ? 'Error' : 'Save Progress'}
          </Button>
        </div>
      </div>
      
      {/* Save Status Indicator */}
      {saveStatus === 'saved' && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-2 rounded-md text-sm">
          ✓ Progress saved automatically
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-2 rounded-md text-sm">
          ✗ Failed to save progress. Please try again.
        </div>
      )}
      
      {/* Instructions Guide */}
      {showGuide && (
        <AssessmentGuide role={user?.role === 'employee' ? 'employee' : 'reviewer'} />
      )}
      
      {/* Progress Tracking */}
      <ProgressBar
        currentSection={currentSectionIndex + 1}
        totalSections={currentAssessment.sections.length}
        sectionProgress={sectionProgress}
        overallProgress={overallProgress}
      />
      
      {/* Section Navigation */}
      {currentAssessment.sections.length > 1 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Sections</h3>
              <div className="flex space-x-2">
                {currentAssessment.sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSectionIndex(index)}
                    className={`
                      px-3 py-1 rounded-full text-sm font-medium transition-colors
                      ${index === currentSectionIndex 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Current Section */}
      <Card>
        <CardHeader className="bg-primary-50 border-b border-primary-100">
          <CardTitle className="text-xl text-primary-800">{currentSection.title}</CardTitle>
          {currentSection.description && (
            <p className="text-sm text-gray-600 mt-1">{currentSection.description}</p>
          )}
          <div className="mt-2 text-sm text-gray-500">
            Section {currentSectionIndex + 1} of {currentAssessment.sections.length} • 
            {currentSection.questions.length} question{currentSection.questions.length !== 1 ? 's' : ''}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Section Progress Indicator */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Section Progress</span>
              <span className="text-gray-600">{Math.round(sectionProgress)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${sectionProgress}%` }}
              />
            </div>
            {invalidQuestions.length > 0 && (
              <div className="mt-2 text-sm text-warning-600">
                {invalidQuestions.length} required question{invalidQuestions.length !== 1 ? 's' : ''} remaining
              </div>
            )}
          </div>
          
          <div className="space-y-8">
            {currentSection.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                response={responses[question.id] || {}}
                onResponseChange={(type, value) => handleResponseChange(question.id, type, value)}
                index={index}
                isValid={isQuestionValid(question.id)}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous Section
          </Button>
          
          <div className="flex space-x-2">
            {currentSectionIndex === currentAssessment.sections.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!isSectionComplete() || isSubmitting}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                className="bg-success-600 hover:bg-success-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isSectionComplete()}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Next Section
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {/* Completion Requirements */}
      {invalidQuestions.length > 0 && (
        <Card className="border-warning-200 bg-warning-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-warning-800">Complete Required Questions</h3>
                <p className="text-sm text-warning-700 mt-1">
                  Please answer all required questions before proceeding to the next section.
                </p>
                <ul className="mt-2 text-sm text-warning-700 list-disc list-inside">
                  {invalidQuestions.map((q, idx) => (
                    <li key={q.id}>Question {currentSection.questions.indexOf(q) + 1}: {q.text.substring(0, 50)}...</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentForm;