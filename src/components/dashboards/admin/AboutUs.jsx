import React from 'react';
import { 
  FaCheckCircle, 
  FaInfoCircle, 
  FaCode, 
  FaEnvelope,
  FaLayerGroup,
  FaClipboardCheck,
  FaChartLine,
  FaUsers,
  FaFileAlt,
  FaShieldAlt
} from 'react-icons/fa';

const AboutUs = () => {
  const features = [
    { id: 1, name: 'Form creation and submission', icon: <FaFileAlt /> },
    { id: 2, name: 'Multi-level approval workflow', icon: <FaClipboardCheck /> },
    { id: 3, name: 'Real-time analytics and reporting', icon: <FaChartLine /> },
    { id: 4, name: 'User and role management', icon: <FaUsers /> },
    { id: 5, name: 'Document version control', icon: <FaLayerGroup /> },
    { id: 6, name: 'Compliance tracking', icon: <FaShieldAlt /> },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6 flex items-center">
        <FaInfoCircle className="mr-2 text-blue-600" />
        About QSUTRA Quality Management System
      </h2>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-medium mb-3 text-gray-800">Quality Management System</h3>
          <p className="text-gray-700 leading-relaxed">
            Our Quality Management System is designed to ensure consistent quality control 
            and compliance with industry standards. This system helps track and manage 
            inspection forms, approval processes, and quality metrics across the organization.
            With a focus on usability and efficiency, QSUTRA enables teams to maintain high 
            quality standards while reducing administrative overhead.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium mb-3 text-blue-800 flex items-center">
              <FaCode className="mr-2" />
              System Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <div className="w-32 font-medium text-gray-600">Version:</div>
                <div>2.5.3</div>
              </div>
              <div className="flex items-start">
                <div className="w-32 font-medium text-gray-600">Last Updated:</div>
                <div>May 10, 2025</div>
              </div>
              <div className="flex items-start">
                <div className="w-32 font-medium text-gray-600">Developed By:</div>
                <div>QSutra Systems</div>
              </div>
              <div className="flex items-start">
                <div className="w-32 font-medium text-gray-600">Contact:</div>
                <div className="flex items-center">
                  <FaEnvelope className="mr-1 text-gray-500" size={14} />
                  <a href="mailto:support@qsutra.com" className="text-blue-600 hover:underline">
                    support@qsutra.com
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-800">Key Features</h3>
            <div className="space-y-3">
              {features.map(feature => (
                <div key={feature.id} className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-3" />
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2">{feature.icon}</span>
                    <span>{feature.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-medium mb-3 text-gray-800">Why Choose QSUTRA?</h3>
          <div className="bg-gray-50 p-5 rounded-lg">
            <p className="text-gray-700 mb-4">
              QSUTRA is designed with a focus on usability, flexibility, and compliance. Our system helps organizations:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Improve quality control processes</li>
              <li>Reduce time spent on administrative tasks</li>
              <li>Maintain regulatory compliance</li>
              <li>Generate comprehensive quality reports</li>
              <li>Track and resolve quality issues efficiently</li>
            </ul>
          </div>
        </div>
        
        <div className="text-center text-gray-500 text-sm pt-4 mt-4 border-t">
          &copy; 2025 QSutra Systems. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AboutUs;