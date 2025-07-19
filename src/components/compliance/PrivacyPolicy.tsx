import React from 'react';
import { Shield, Lock, Eye, FileText, Users, Database, Globe, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export const PrivacyPolicy: React.FC = () => {
  const lastUpdated = 'January 15, 2025';
  const companyName = config.app.name;
  const contactEmail = config.app.supportEmail;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Shield className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-lg text-gray-600">
          How we collect, use, and protect your personal information
        </p>
        <p className="text-sm text-gray-500">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Introduction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            {companyName} ("we," "our," or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your 
            information when you use our 360° feedback platform and related services.
          </p>
          <p>
            This policy complies with the General Data Protection Regulation (GDPR) and other 
            applicable data protection laws. By using our services, you consent to the data 
            practices described in this policy.
          </p>
        </CardContent>
      </Card>

      {/* Information We Collect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3">Personal Information</h3>
            <ul className="space-y-2 text-sm">
              <li>• Name, email address, and contact information</li>
              <li>• Job title, department, and organizational role</li>
              <li>• Assessment responses and feedback data</li>
              <li>• Profile information and preferences</li>
              <li>• Communication records and support tickets</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Technical Information</h3>
            <ul className="space-y-2 text-sm">
              <li>• IP address and device information</li>
              <li>• Browser type and version</li>
              <li>• Operating system and device identifiers</li>
              <li>• Usage data and analytics</li>
              <li>• Cookie and tracking information</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Assessment Data</h3>
            <ul className="space-y-2 text-sm">
              <li>• 360° feedback responses and ratings</li>
              <li>• Competency assessments and evaluations</li>
              <li>• Development goals and progress tracking</li>
              <li>• Performance metrics and analytics</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* How We Use Your Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            How We Use Your Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Service Provision</h3>
              <ul className="text-sm space-y-1">
                <li>• Provide and maintain our platform</li>
                <li>• Process assessments and generate reports</li>
                <li>• Manage user accounts and permissions</li>
                <li>• Send notifications and updates</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Improvement & Analytics</h3>
              <ul className="text-sm space-y-1">
                <li>• Analyze usage patterns and trends</li>
                <li>• Improve platform functionality</li>
                <li>• Develop new features and services</li>
                <li>• Conduct research and analysis</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Communication</h3>
              <ul className="text-sm space-y-1">
                <li>• Send important updates and notifications</li>
                <li>• Provide customer support</li>
                <li>• Respond to inquiries and requests</li>
                <li>• Send marketing communications (with consent)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legal & Security</h3>
              <ul className="text-sm space-y-1">
                <li>• Comply with legal obligations</li>
                <li>• Protect against fraud and abuse</li>
                <li>• Ensure platform security</li>
                <li>• Enforce our terms of service</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Basis for Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Legal Basis for Processing (GDPR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Consent</h3>
              <p className="text-sm text-gray-600">
                We process your data based on your explicit consent for marketing communications, 
                analytics, and non-essential cookies.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Contract Performance</h3>
              <p className="text-sm text-gray-600">
                We process data necessary to provide our services and fulfill our contractual 
                obligations to you and your organization.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legitimate Interests</h3>
              <p className="text-sm text-gray-600">
                We process data for our legitimate business interests, such as improving our 
                services and ensuring platform security.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legal Obligations</h3>
              <p className="text-sm text-gray-600">
                We process data to comply with applicable laws, regulations, and legal requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Data Sharing and Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Within Your Organization</h3>
            <p className="text-sm text-gray-600 mb-4">
              Assessment results and feedback are shared with authorized personnel within your 
              organization according to your organization's policies and your consent settings.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Service Providers</h3>
            <p className="text-sm text-gray-600 mb-4">
              We may share data with trusted third-party service providers who assist us in 
              operating our platform, such as cloud hosting, email services, and analytics providers.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Legal Requirements</h3>
            <p className="text-sm text-gray-600 mb-4">
              We may disclose your information if required by law, court order, or government 
              request, or to protect our rights, property, or safety.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Business Transfers</h3>
            <p className="text-sm text-gray-600">
              In the event of a merger, acquisition, or sale of assets, your information may 
              be transferred as part of the business transaction.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Data Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Technical Measures</h3>
              <ul className="text-sm space-y-1">
                <li>• Encryption in transit and at rest</li>
                <li>• Secure data centers and infrastructure</li>
                <li>• Regular security audits and testing</li>
                <li>• Access controls and authentication</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Organizational Measures</h3>
              <ul className="text-sm space-y-1">
                <li>• Employee training and awareness</li>
                <li>• Data protection policies</li>
                <li>• Incident response procedures</li>
                <li>• Regular compliance reviews</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Your Rights (GDPR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Access & Portability</h3>
              <p className="text-sm text-gray-600">
                You have the right to access your personal data and receive a copy in a 
                machine-readable format.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Rectification</h3>
              <p className="text-sm text-gray-600">
                You can request correction of inaccurate or incomplete personal data.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Erasure</h3>
              <p className="text-sm text-gray-600">
                You can request deletion of your personal data in certain circumstances.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Restriction</h3>
              <p className="text-sm text-gray-600">
                You can request limitation of data processing in certain situations.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Objection</h3>
              <p className="text-sm text-gray-600">
                You can object to processing based on legitimate interests.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Withdraw Consent</h3>
              <p className="text-sm text-gray-600">
                You can withdraw consent for processing based on consent at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Retention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Account Data</h3>
              <p className="text-sm text-gray-600">
                Retained while your account is active and for 30 days after deletion 
                for recovery purposes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Assessment Data</h3>
              <p className="text-sm text-gray-600">
                Retained for 7 years to comply with employment and business record requirements.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Analytics Data</h3>
              <p className="text-sm text-gray-600">
                Retained for 2 years for service improvement and analytics purposes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Communication Data</h3>
              <p className="text-sm text-gray-600">
                Retained for 3 years for customer support and legal compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* International Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            International Data Transfers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Your data may be transferred to and processed in countries other than your own. 
            We ensure appropriate safeguards are in place for such transfers, including:
          </p>
          <ul className="text-sm space-y-2">
            <li>• Standard Contractual Clauses (SCCs) approved by the European Commission</li>
            <li>• Adequacy decisions for countries with equivalent data protection standards</li>
            <li>• Binding corporate rules for intra-group transfers</li>
            <li>• Other appropriate safeguards as required by law</li>
          </ul>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Contact Us
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            If you have any questions about this Privacy Policy or our data practices, 
            please contact us:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm">
              <strong>Email:</strong> {contactEmail}<br />
              <strong>Subject:</strong> Privacy Policy Inquiry
            </p>
          </div>
          <p className="text-sm text-gray-600">
            You also have the right to lodge a complaint with your local data protection 
            authority if you believe we have not addressed your concerns adequately.
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 border-t pt-6">
        <p>
          This Privacy Policy is effective as of {lastUpdated}. We may update this policy 
          from time to time and will notify you of any material changes.
        </p>
      </div>
    </div>
  );
}; 