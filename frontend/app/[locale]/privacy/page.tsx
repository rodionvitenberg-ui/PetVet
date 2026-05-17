'use client';

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to PetVet («we», «our» or «Platform»). We take the confidentiality of your data seriously. 
              This Policy describes how we collect, use, and protect user information when using the PetVet application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. What Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Data:</strong> Name, email, profile photo, city, and links to social networks and messengers (Telegram, WhatsApp), if you choose to include them in your profile.</li>
              <li><strong>Pet Data:</strong> Names, breeds, ages, medical histories, photos, and files uploaded by you.</li>
              <li><strong>Veterinarian Documents:</strong> Photos of diplomas and licenses for qualification verification (stored in private access and used only for verification).</li>
              <li><strong>Geolocation:</strong> We request access to your precise location solely for displaying nearby veterinary clinics on the map. These data are processed on your device and not stored on our servers.</li>
              <li><strong>Technical Data:</strong> IP address, device type, cookie files (for maintaining login session).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <p>We use the collected information for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Providing access to the service and user dashboard.</li>
              <li>Maintaining the digital medical record of your pet.</li>
              <li>Verifying the status of veterinary professionals.</li>
              <li>Communicating with you regarding technical issues (via email).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Access to Data and Disclosure to Third Parties</h2>
            <p>
              We <strong>do not sell</strong> your personal data. Access to the pet's medical record is provided only:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To you (the Owner).</li>
              <li>To veterinary professionals to whom you have personally granted access (e.g., via a link or through the application interface).</li>
            </ul>
            <p className="mt-2">
              We use third-party services for application operation (hosting, file storage, Google authentication), which are required to maintain confidentiality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Google User Data</h2>
            <p>
              When logging in through Google, we only receive access to your email, name, and public avatar. 
              This data is used exclusively for creating and identifying your profile in the PetVet system.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Deletion</h2>
            <p>
              You have the right to request complete deletion of your account and all associated data. 
              To do so, please send a request to <a href="mailto:support@petvet.app" className="text-blue-600 hover:underline">support@petvet.app</a> or use the deletion function in your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Contacts</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us: <br />
              Email: <a href="mailto:support@petvet.app" className="text-blue-600 font-medium">support@petvet.app</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}