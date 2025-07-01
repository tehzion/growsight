import React, { useState } from 'react';
import { FileText, Info, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import FormInput from './FormInput';
import Button from './Button';
import { usePDFExportStore } from '../../stores/pdfExportStore';

interface PDFBrandingSettingsProps {
  onSave?: () => void;
}

const PDFBrandingSettings: React.FC<PDFBrandingSettingsProps> = ({ onSave }) => {
  const { pdfSettings, updatePDFSettings } = usePDFExportStore();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const handleChange = (field: keyof typeof pdfSettings, value: string | boolean) => {
    updatePDFSettings({ [field]: value });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          PDF Branding Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Company Name"
              value={pdfSettings.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              helperText="Name displayed in PDF headers and footers"
            />
            
            <FormInput
              label="Logo URL"
              value={pdfSettings.logoUrl}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              helperText="URL to your company logo (recommended size: 200x60px)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={pdfSettings.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="h-10 w-10 border-0 p-0"
                />
                <input
                  type="text"
                  value={pdfSettings.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Used for headings, buttons, and highlights
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={pdfSettings.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="h-10 w-10 border-0 p-0"
                />
                <input
                  type="text"
                  value={pdfSettings.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Used for accents and secondary elements
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Footer Text
            </label>
            <input
              type="text"
              value={pdfSettings.footerText}
              onChange={(e) => handleChange('footerText', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Copyright notice or additional information for PDF footers
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">PDF Options</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={pdfSettings.includeTimestamp}
                  onChange={(e) => handleChange('includeTimestamp', e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include Generation Timestamp</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={pdfSettings.includePageNumbers}
                  onChange={(e) => handleChange('includePageNumbers', e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include Page Numbers</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default PDF Template
            </label>
            <select
              value={pdfSettings.defaultTemplate}
              onChange={(e) => handleChange('defaultTemplate', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
              <option value="detailed">Detailed</option>
              <option value="executive">Executive Summary</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Default template used for PDF exports
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-primary-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-primary-800">PDF Branding Preview</h4>
                  <p className="text-xs text-primary-700 mt-1">
                    These settings will be applied to all PDF exports, including assessment results, analytics reports, and system exports.
                  </p>
                  
                  <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          className={`px-3 py-1 text-xs rounded-md ${previewMode === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                          onClick={() => setPreviewMode('desktop')}
                        >
                          Desktop
                        </button>
                        <button
                          className={`px-3 py-1 text-xs rounded-md ${previewMode === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                          onClick={() => setPreviewMode('mobile')}
                        >
                          Mobile
                        </button>
                      </div>
                      <span className="text-xs text-gray-500">Preview</span>
                    </div>
                    
                    <div className={`bg-white p-4 ${previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''}`}>
                      <div className="flex justify-between items-center mb-4" style={{color: pdfSettings.primaryColor}}>
                        <div className="flex items-center">
                          <div className="w-[100px] h-[30px] bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                            Logo
                          </div>
                          <h3 className="ml-3 font-bold" style={{color: pdfSettings.primaryColor}}>
                            {pdfSettings.companyName}
                          </h3>
                        </div>
                        <div className="text-xs text-gray-500">
                          {pdfSettings.includeTimestamp && 'Generated: 2025-01-10'}
                        </div>
                      </div>
                      
                      <div className="border-t border-b border-gray-200 py-3 mb-4">
                        <h2 className="text-lg font-bold" style={{color: pdfSettings.primaryColor}}>
                          Assessment Results
                        </h2>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-3 rounded-lg" style={{backgroundColor: `${pdfSettings.primaryColor}10`}}>
                          <h4 className="font-medium mb-2" style={{color: pdfSettings.primaryColor}}>
                            Communication Skills
                          </h4>
                          <div className="flex justify-between text-sm">
                            <span>Average Rating:</span>
                            <span className="font-medium">5.2/7</span>
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-lg" style={{backgroundColor: `${pdfSettings.secondaryColor}10`}}>
                          <h4 className="font-medium mb-2" style={{color: pdfSettings.secondaryColor}}>
                            Leadership
                          </h4>
                          <div className="flex justify-between text-sm">
                            <span>Average Rating:</span>
                            <span className="font-medium">4.8/7</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                        <div>{pdfSettings.footerText}</div>
                        {pdfSettings.includePageNumbers && <div>Page 1 of 5</div>}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      alert('PDF preview would be shown here in the production version.');
                    }}
                  >
                    Generate Full Preview
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {onSave && (
            <div className="flex justify-end">
              <Button onClick={onSave}>
                Save Settings
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFBrandingSettings;