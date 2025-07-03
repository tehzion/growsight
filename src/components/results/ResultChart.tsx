import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AssessmentResult } from '../../types';
import { AlertCircle, TrendingDown, TrendingUp, CheckCircle, Lock, Eye, EyeOff, Tag } from 'lucide-react';

interface ResultChartProps {
  result: AssessmentResult;
  showComments?: boolean;
  showCompetencies?: boolean;
}

const ResultChart: React.FC<ResultChartProps> = ({ 
  result, 
  showComments = true,
  showCompetencies = true
}) => {
  const [activeView, setActiveView] = useState<'questions' | 'competencies'>(
    result.competencyResults && result.competencyResults.length > 0 && showCompetencies
      ? 'competencies'
      : 'questions'
  );
  
  const questionData = result.questions.map(q => ({
    name: q.text.length > 30 ? q.text.substring(0, 30) + '...' : q.text,
    Self: q.selfRating,
    'Reviewer Avg': q.avgReviewerRating,
    Gap: q.gap
  }));
  
  const competencyData = result.competencyResults?.map(c => ({
    name: c.competencyName,
    Self: c.selfAverage,
    'Reviewer Avg': c.reviewerAverage,
    Gap: c.gap
  })) || [];
  
  const getAlignmentIcon = (alignment: string) => {
    switch (alignment) {
      case 'aligned':
        return <CheckCircle className="h-4 w-4 text-success-600" />;
      case 'blind_spot':
        return <EyeOff className="h-4 w-4 text-warning-600" />;
      case 'hidden_strength':
        return <Eye className="h-4 w-4 text-primary-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getAlignmentBadge = (alignment: string) => {
    switch (alignment) {
      case 'aligned':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          <CheckCircle className="h-3 w-3 mr-1" /> Aligned
        </span>;
      case 'blind_spot':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
          <EyeOff className="h-3 w-3 mr-1" /> Blind Spot
        </span>;
      case 'hidden_strength':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          <Eye className="h-3 w-3 mr-1" /> Hidden Strength
        </span>;
      default:
        return null;
    }
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (activeView === 'questions') {
        const question = result.questions.find(q => 
          q.text.startsWith(label.split('...')[0])
        );
        
        return (
          <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
            <p className="font-medium mb-2">{question?.text}</p>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-primary-600">Self Rating:</span> {payload[0].value}/7
              </p>
              <p className="text-sm">
                <span className="text-secondary-600">Reviewer Average:</span> {payload[1].value}/7
              </p>
              {question && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="flex items-center">
                    <span className="text-sm mr-2">Alignment:</span>
                    {getAlignmentBadge(question.alignment)}
                  </div>
                  {question.competencies && question.competencies.length > 0 && (
                    <div className="mt-1">
                      <span className="text-sm">Competencies:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {question.competencies.map(comp => (
                          <span key={comp.id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                            {comp.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      } else {
        const competency = result.competencyResults?.find(c => 
          c.competencyName === label
        );
        
        return (
          <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
            <p className="font-medium mb-2">{competency?.competencyName}</p>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-primary-600">Self Average:</span> {payload[0].value.toFixed(1)}/7
              </p>
              <p className="text-sm">
                <span className="text-secondary-600">Reviewer Average:</span> {payload[1].value.toFixed(1)}/7
              </p>
              {competency && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="flex items-center">
                    <span className="text-sm mr-2">Alignment:</span>
                    {getAlignmentBadge(competency.alignment)}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      }
    }
    return null;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{result.sectionTitle}</h3>
          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
            <span>Self Average: {result.selfAverage.toFixed(1)}/7</span>
            <span>•</span>
            <span>Reviewer Average: {result.reviewerAverage.toFixed(1)}/7</span>
            <span>•</span>
            <span>Gap: {result.overallGap > 0 ? '+' : ''}{result.overallGap.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Overall:</span>
          {getAlignmentBadge(result.overallAlignment)}
        </div>
      </div>
      
      {/* View toggle - only show if competency results exist */}
      {result.competencyResults && result.competencyResults.length > 0 && showCompetencies && (
        <div className="mb-4 flex space-x-2">
          <button
            onClick={() => setActiveView('questions')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeView === 'questions' 
                ? 'bg-primary-100 text-primary-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            By Question
          </button>
          <button
            onClick={() => setActiveView('competencies')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center ${
              activeView === 'competencies' 
                ? 'bg-primary-100 text-primary-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Tag className="h-3 w-3 mr-1" />
            By Competency
          </button>
        </div>
      )}
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeView === 'questions' ? questionData : competencyData}
            layout="vertical"
            margin={{
              top: 20,
              right: 30,
              left: 40,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, 7]} 
              ticks={[1, 2, 3, 4, 5, 6, 7]}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={150} 
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine x={4} stroke="#CBD5E1" strokeDasharray="3 3" />
            <Bar 
              dataKey="Self" 
              fill="#3B82F6" 
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="Reviewer Avg" 
              fill="#7E22CE" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {activeView === 'questions' && (
        <div className="mt-6 space-y-4">
          {result.questions.map(q => (
            <div key={q.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getAlignmentIcon(q.alignment)}
                    <span className="font-medium">{q.text}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Self Rating:</span>
                      <span className="ml-1 font-medium text-primary-700">{q.selfRating}/7</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reviewer Avg:</span>
                      <span className="ml-1 font-medium text-secondary-700">{q.avgReviewerRating}/7</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Gap:</span>
                      <span className={`ml-1 font-medium ${
                        q.gap > 0 ? 'text-warning-600' : 
                        q.gap < 0 ? 'text-primary-600' : 
                        'text-success-600'
                      }`}>
                        {q.gap > 0 ? '+' : ''}{q.gap}
                      </span>
                    </div>
                  </div>
                  
                  {/* Competency tags */}
                  {q.competencies && q.competencies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.competencies.map(comp => (
                        <span key={comp.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                          <Tag className="h-3 w-3 mr-1" />
                          {comp.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  {getAlignmentBadge(q.alignment)}
                </div>
              </div>
              {showComments && q.comments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <Lock className="h-4 w-4 text-gray-500 mr-1" />
                    <p className="text-sm font-medium text-gray-700">Aggregated Feedback Themes:</p>
                  </div>
                  <ul className="space-y-1">
                    {q.comments.map((comment, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{comment}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Individual responses are anonymized to protect reviewer privacy
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {activeView === 'competencies' && result.competencyResults && (
        <div className="mt-6 space-y-4">
          {result.competencyResults.map(comp => (
            <div key={comp.competencyId} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-primary-600" />
                    <span className="font-medium">{comp.competencyName}</span>
                    {getAlignmentBadge(comp.alignment)}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Self Average:</span>
                      <span className="ml-1 font-medium text-primary-700">{comp.selfAverage.toFixed(1)}/7</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reviewer Avg:</span>
                      <span className="ml-1 font-medium text-secondary-700">{comp.reviewerAverage.toFixed(1)}/7</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Gap:</span>
                      <span className={`ml-1 font-medium ${
                        comp.gap > 0 ? 'text-warning-600' : 
                        comp.gap < 0 ? 'text-primary-600' : 
                        'text-success-600'
                      }`}>
                        {comp.gap > 0 ? '+' : ''}{comp.gap.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultChart;
export { ResultChart };