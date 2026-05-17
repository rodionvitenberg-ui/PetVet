'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <h3 className="text-red-700 font-bold mb-1">Important: Medical Disclaimer</h3>
            <p className="text-sm text-red-600 m-0">
              PetVet is not a substitute for professional veterinary care. In emergency situations threatening your pet's life, contact your nearest veterinary clinic immediately. We are not liable for diagnoses made by users independently.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. General Provisions</h2>
            <p>
              By using the PetVet application, you agree to these Terms of Service. If you do not agree with any part of these terms, please discontinue using the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Owners:</strong> You are responsible for the accuracy of information about your pets.</li>
              <li><strong>Veterinarians:</strong> To obtain the "Veterinarian" status, you must provide authentic educational documents. The administration reserves the right to refuse verification without explanation.</li>
              <li>You are required to maintain the confidentiality of your account information (username and password).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Behavior Rules</h2>
            <p>Prohibited:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Using the service for spam or fraud.</li>
              <li>Uploading content that violates legislation or the rights of third parties.</li>
              <li>Impersonating a veterinarian without the corresponding qualification.</li>
              <li>Sharing your account with third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Intellectual Property</h2>
            <p>
              All rights to the design, code, and logo of PetVet belong to the service administration. User-generated content (pet photos) belongs to users, but you grant us the right to store and display it within the scope of service operation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Limitation of Liability</h2>
            <p>
              The service is provided "as is". We do not guarantee uninterrupted operation of the service, although we make every effort to ensure its stability. We are not liable for data loss resulting from force majeure circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. Continued use of the service after updates constitutes your agreement with the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Contact Us</h2>
            <p>
              For questions or suggestions, please contact us at <a href="mailto:support@petvet.app" className="text-blue-600 font-medium">support@petvet.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}