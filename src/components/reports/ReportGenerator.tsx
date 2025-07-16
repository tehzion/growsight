import React from 'react';

import React from 'react';
import { AssessmentResult, User } from '../../types';

interface ReportGeneratorProps {
  selfAssessment: AssessmentResult | null;
  peerReviews: AssessmentResult[];
  user: User | null;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ selfAssessment, peerReviews, user }) => {
  // Helper to calculate average score for a given set of results
  const calculateAverage = (results: AssessmentResult[]) => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.overallScore, 0);
    return total / results.length;
  };

  // Helper to get all unique question texts from results
  const getAllQuestionTexts = () => {
    const questions = new Map<string, string>();
    if (selfAssessment) {
      selfAssessment.responses.forEach(r => {
        // Assuming assessmentId is the question text for simplicity, will need actual question text from assessment structure
        questions.set(r.questionId, `Question ${r.questionId}`); 
      });
    }
    peerReviews.forEach(pr => {
      pr.responses.forEach(r => {
        questions.set(r.questionId, `Question ${r.questionId}`);
      });
    });
    return Array.from(questions.values());
  };

  const allQuestionTexts = getAllQuestionTexts();

  return (
    <div className="report-container p-8 bg-white shadow-lg rounded-lg">
      {/* Cover Page */}
      <div className="cover-page text-center mb-12">
        <h1 className="text-4xl font-bold text-primary-800 mb-4">Leadership 360</h1>
        <h2 className="text-2xl text-gray-700 mb-8">Prepared for</h2>
        <p className="text-3xl font-semibold text-accent-600">Leadership 360</p>
        <p className="text-xl text-gray-600">{user?.organizationId}</p>
        <div className="mt-20">
          <p className="text-sm text-gray-500">Created on {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Introduction */}
      <div className="section mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Introduction</h2>
        <p className="text-gray-700 leading-relaxed">
          Congratulations on completing The Maxwell Leadership Assessment powered by RightPath.
          This report is designed to provide valuable feedback that can have a positive impact on your
          leadership development, personal growth, and journey to become a highly effective
          360-degree leader. The objective data in this report is related to how others are experiencing
          your influence in the five levels of leadership including Position, Permission, Production,
          People Development, and Pinnacle which all measure your overall leadership effectiveness.
          This report provides both metrics and written feedback about how you lead and develop
          others.
        </p>
      </div>

      {/* Report Format Summary */}
      <div className="section mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Report Format</h2>
        <ul className="list-disc list-inside text-gray-700 leading-relaxed">
          <li><strong>Section 1: CATEGORY SCORES</strong> provide a summary of your feedback in the areas of
          Position, Permission, Production, People Development, and Pinnacle (Self and Others).</li>
          <li><strong>Section 2: Written Comments</strong> provided by your raters are listed in unedited form.</li>
          <li><strong>Section 3: Reflection and Analysis</strong> offers help as you evaluate your feedback.</li>
          <li><strong>Section 4: Leadership Attributes Summary</strong> at the end of the report lists all items ranked
          from highest to lowest based on Overall Average score.</li>
        </ul>
      </div>

      {/* Raters Summary */}
      <div className="section mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Raters Summary</h2>
        <p className="text-gray-700 leading-relaxed">
          Note: {peerReviews.length} of {peerReviews.length + (selfAssessment ? 1 : 0)} of your selected raters participated in this assessment for you. The raters, by
          category, were as follows:
        </p>
        <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4">
          <li>{peerReviews.filter(r => r.relationshipType === 'direct_report').length} of {peerReviews.length} Direct Reports</li>
          <li>{peerReviews.filter(r => r.relationshipType === 'supervisor').length} of {peerReviews.length} Manager-Direct Line</li>
          <li>{peerReviews.filter(r => r.relationshipType === 'peer').length} of {peerReviews.length} Peer/Associates</li>
          <li>{peerReviews.filter(r => r.relationshipType === 'other').length} of {peerReviews.length} Others</li>
        </ul>
      </div>

      {/* Section 1: Category Results */}
      <div className="section mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">SECTION 1 - CATEGORY RESULTS</h2>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Overall Average: {calculateAverage([...(selfAssessment ? [selfAssessment] : []), ...peerReviews]).toFixed(1)}</h3>
        {/* This section will be dynamically generated for each category (Position, Permission, etc.) */}
        {/* For now, a simplified view */}
        <p className="text-gray-700">Detailed category scores will be presented here.</p>
      </div>

      {/* Section 2: Written Comments */}
      <div className="section mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">SECTION 2 - WRITTEN COMMENTS</h2>
        {peerReviews.length > 0 ? (
          peerReviews.map((review, index) => (
            <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50">
              <p className="font-medium text-gray-800">Comment from Anonymous Reviewer ({review.relationshipType})</p>
              {review.responses.map((response, qIndex) => (
                response.comment && <p key={qIndex} className="text-gray-700 mt-2"><strong>Question {response.questionId}:</strong> {response.comment}</p>
              ))}
            </div>
          ))
        ) : (
          <p className="text-gray-600">No written comments available.</p>
        )}
      </div>

      {/* Section 3: Reflection and Analysis */}
      <div className="section mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">SECTION 3 - REFLECTION and ANALYSIS</h2>
        <p className="text-gray-700">Prompts for self-reflection and analysis will be displayed here.</p>
      </div>

      {/* Appendix: Leadership Attributes Summary */}
      <div className="section mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">APPENDIX - Leadership Attributes Summary</h2>
        <p className="text-gray-700">A ranked summary of all assessment attributes will be displayed here.</p>
      </div>
    </div>
  );
};

export default ReportGenerator;