/**
 * Fake data for the demo MCP server.
 * All data is entirely fictional — no real patient information.
 */

export const demoProfile = {
  name: 'Sarah Chen',
  preferredName: 'Sarah',
  dateOfBirth: '03/15/1988',
  sex: 'Female',
  mrn: 'MRN-8834721',
  primaryCareProvider: 'Dr. Michael Rivera, MD',
  address: '742 Evergreen Terrace, Springfield, IL 62704',
  phone: '(555) 867-5309',
  email: 'sarah.chen@example.com',
};

export const demoHealthSummary = {
  bloodType: 'A+',
  height: '5\'6" (167.6 cm)',
  weight: '138 lbs (62.6 kg)',
  bmi: '22.3',
  bloodPressure: '118/76 mmHg',
  heartRate: '72 bpm',
  lastUpdated: '2026-02-20',
};

export const demoMedications = [
  {
    name: 'Lisinopril 10mg',
    directions: 'Take 1 tablet by mouth daily',
    prescriber: 'Dr. Michael Rivera',
    pharmacy: 'CVS Pharmacy #4821',
    refillsRemaining: 3,
    lastFilled: '2026-01-15',
  },
  {
    name: 'Vitamin D3 2000 IU',
    directions: 'Take 1 capsule by mouth daily',
    prescriber: 'Dr. Michael Rivera',
    pharmacy: 'CVS Pharmacy #4821',
    refillsRemaining: 5,
    lastFilled: '2026-02-01',
  },
  {
    name: 'Cetirizine 10mg',
    directions: 'Take 1 tablet by mouth daily as needed for allergies',
    prescriber: 'Dr. Michael Rivera',
    pharmacy: 'CVS Pharmacy #4821',
    refillsRemaining: 2,
    lastFilled: '2025-12-10',
  },
];

export const demoAllergies = [
  { allergen: 'Penicillin', reaction: 'Hives, rash', severity: 'Moderate', type: 'Medication' },
  { allergen: 'Shellfish', reaction: 'Throat swelling', severity: 'Severe', type: 'Food' },
  { allergen: 'Latex', reaction: 'Contact dermatitis', severity: 'Mild', type: 'Environmental' },
];

export const demoHealthIssues = [
  { condition: 'Essential Hypertension', status: 'Active', onsetDate: '2023-06-14', provider: 'Dr. Michael Rivera' },
  { condition: 'Seasonal Allergic Rhinitis', status: 'Active', onsetDate: '2019-04-01', provider: 'Dr. Michael Rivera' },
  { condition: 'Vitamin D Deficiency', status: 'Active', onsetDate: '2024-11-20', provider: 'Dr. Michael Rivera' },
  { condition: 'Ankle Sprain, Right', status: 'Resolved', onsetDate: '2025-08-03', resolvedDate: '2025-09-15', provider: 'Dr. James Park' },
];

export const demoUpcomingVisits = [
  {
    type: 'Office Visit',
    provider: 'Dr. Michael Rivera',
    department: 'Internal Medicine',
    location: 'Springfield Medical Center, Suite 200',
    date: '2026-03-25',
    time: '10:30 AM',
    status: 'Scheduled',
  },
  {
    type: 'Lab Work',
    provider: 'Lab Services',
    department: 'Laboratory',
    location: 'Springfield Medical Center, 1st Floor',
    date: '2026-03-24',
    time: '8:00 AM',
    status: 'Scheduled',
    instructions: 'Fasting required — nothing to eat or drink (except water) for 12 hours prior.',
  },
];

export const demoPastVisits = [
  {
    type: 'Office Visit',
    provider: 'Dr. Michael Rivera',
    department: 'Internal Medicine',
    date: '2026-01-10',
    reason: 'Annual Physical',
    diagnoses: ['Essential Hypertension', 'Vitamin D Deficiency'],
  },
  {
    type: 'Urgent Care',
    provider: 'Dr. James Park',
    department: 'Urgent Care',
    date: '2025-08-03',
    reason: 'Right ankle injury',
    diagnoses: ['Ankle Sprain, Right'],
  },
  {
    type: 'Office Visit',
    provider: 'Dr. Lisa Nguyen',
    department: 'Dermatology',
    date: '2025-05-18',
    reason: 'Skin check',
    diagnoses: ['Benign skin lesion'],
  },
  {
    type: 'Telehealth Visit',
    provider: 'Dr. Michael Rivera',
    department: 'Internal Medicine',
    date: '2025-03-22',
    reason: 'Blood pressure follow-up',
    diagnoses: ['Essential Hypertension'],
  },
];

export const demoLabResults = [
  {
    testName: 'Comprehensive Metabolic Panel',
    orderedBy: 'Dr. Michael Rivera',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: 'Glucose', value: '92', units: 'mg/dL', referenceRange: '70-100', flag: 'Normal' },
      { component: 'BUN', value: '14', units: 'mg/dL', referenceRange: '7-20', flag: 'Normal' },
      { component: 'Creatinine', value: '0.9', units: 'mg/dL', referenceRange: '0.6-1.2', flag: 'Normal' },
      { component: 'Sodium', value: '140', units: 'mEq/L', referenceRange: '136-145', flag: 'Normal' },
      { component: 'Potassium', value: '4.2', units: 'mEq/L', referenceRange: '3.5-5.1', flag: 'Normal' },
    ],
  },
  {
    testName: 'Lipid Panel',
    orderedBy: 'Dr. Michael Rivera',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: 'Total Cholesterol', value: '195', units: 'mg/dL', referenceRange: '<200', flag: 'Normal' },
      { component: 'LDL Cholesterol', value: '118', units: 'mg/dL', referenceRange: '<130', flag: 'Normal' },
      { component: 'HDL Cholesterol', value: '58', units: 'mg/dL', referenceRange: '>40', flag: 'Normal' },
      { component: 'Triglycerides', value: '95', units: 'mg/dL', referenceRange: '<150', flag: 'Normal' },
    ],
  },
  {
    testName: 'Vitamin D, 25-Hydroxy',
    orderedBy: 'Dr. Michael Rivera',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: '25-Hydroxyvitamin D', value: '28', units: 'ng/mL', referenceRange: '30-100', flag: 'Low' },
    ],
  },
  {
    testName: 'CBC with Differential',
    orderedBy: 'Dr. Michael Rivera',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: 'WBC', value: '6.8', units: 'K/uL', referenceRange: '4.5-11.0', flag: 'Normal' },
      { component: 'RBC', value: '4.5', units: 'M/uL', referenceRange: '4.0-5.5', flag: 'Normal' },
      { component: 'Hemoglobin', value: '13.8', units: 'g/dL', referenceRange: '12.0-16.0', flag: 'Normal' },
      { component: 'Hematocrit', value: '41.2', units: '%', referenceRange: '36-46', flag: 'Normal' },
      { component: 'Platelets', value: '245', units: 'K/uL', referenceRange: '150-400', flag: 'Normal' },
    ],
  },
];

export const demoMessages = [
  {
    id: 'msg-001',
    subject: 'Lab Results Available',
    from: 'Dr. Michael Rivera',
    date: '2026-01-12',
    preview: 'Your lab results from your annual physical are now available. Overall everything looks good...',
    messages: [
      {
        from: 'Dr. Michael Rivera',
        date: '2026-01-12',
        body: 'Hi Sarah, your lab results from your annual physical are now available. Overall everything looks good — your metabolic panel and CBC are within normal limits. Your Vitamin D is still a touch low at 28 ng/mL (goal is >30), so please continue the Vitamin D3 supplement. We\'ll recheck in 3 months. Let me know if you have any questions!',
      },
      {
        from: 'Sarah Chen',
        date: '2026-01-12',
        body: 'Thank you, Dr. Rivera! I\'ll keep taking the supplement. See you in March.',
      },
    ],
  },
  {
    id: 'msg-002',
    subject: 'Prescription Renewal Request',
    from: 'Sarah Chen',
    date: '2025-12-05',
    preview: 'I\'d like to request a refill for my Lisinopril prescription...',
    messages: [
      {
        from: 'Sarah Chen',
        date: '2025-12-05',
        body: 'Hi Dr. Rivera, I\'d like to request a refill for my Lisinopril prescription. My pharmacy is CVS #4821 on Main St. Thank you!',
      },
      {
        from: 'Dr. Michael Rivera',
        date: '2025-12-05',
        body: 'Hi Sarah, I\'ve sent the renewal to your pharmacy. It should be ready for pickup tomorrow. Please continue monitoring your blood pressure at home.',
      },
    ],
  },
];

export const demoBilling = [
  {
    date: '2026-01-10',
    description: 'Office Visit — Annual Physical',
    provider: 'Dr. Michael Rivera',
    totalCharge: '$350.00',
    insurancePaid: '$315.00',
    patientResponsibility: '$35.00',
    status: 'Paid',
  },
  {
    date: '2026-01-10',
    description: 'Laboratory Services',
    provider: 'Springfield Medical Center Lab',
    totalCharge: '$280.00',
    insurancePaid: '$252.00',
    patientResponsibility: '$28.00',
    status: 'Paid',
  },
  {
    date: '2025-08-03',
    description: 'Urgent Care Visit',
    provider: 'Dr. James Park',
    totalCharge: '$275.00',
    insurancePaid: '$220.00',
    patientResponsibility: '$55.00',
    status: 'Paid',
  },
];

export const demoCareTeam = [
  { name: 'Dr. Michael Rivera, MD', role: 'Primary Care Provider', specialty: 'Internal Medicine', phone: '(555) 234-5678' },
  { name: 'Dr. Lisa Nguyen, MD', role: 'Specialist', specialty: 'Dermatology', phone: '(555) 345-6789' },
  { name: 'Maria Santos, RN', role: 'Care Coordinator', specialty: 'Nursing', phone: '(555) 234-5680' },
];

export const demoInsurance = [
  {
    plan: 'Blue Cross Blue Shield — PPO Gold',
    memberId: 'XYZ-9988-7766',
    groupNumber: 'GRP-44521',
    subscriber: 'Sarah Chen',
    effectiveDate: '2025-01-01',
    copay: { office: '$25', specialist: '$40', urgentCare: '$50', er: '$150' },
  },
];

export const demoImmunizations = [
  { vaccine: 'Influenza (Flu)', date: '2025-10-15', site: 'Left arm', provider: 'CVS MinuteClinic' },
  { vaccine: 'COVID-19 Booster (Pfizer)', date: '2025-09-20', site: 'Left arm', provider: 'Springfield Medical Center' },
  { vaccine: 'Tdap', date: '2022-06-10', site: 'Right arm', provider: 'Dr. Michael Rivera' },
  { vaccine: 'Hepatitis B — Dose 3', date: '2019-03-01', site: 'Left arm', provider: 'University Health Center' },
];

export const demoPreventiveCare = [
  { item: 'Annual Physical Exam', status: 'Completed', dueDate: '2027-01-10', lastCompleted: '2026-01-10' },
  { item: 'Flu Vaccine', status: 'Completed', dueDate: '2026-10-01', lastCompleted: '2025-10-15' },
  { item: 'Dental Cleaning', status: 'Due', dueDate: '2026-04-01', lastCompleted: '2025-10-05' },
  { item: 'Eye Exam', status: 'Due', dueDate: '2026-06-01', lastCompleted: '2024-06-15' },
  { item: 'Cervical Cancer Screening (Pap)', status: 'Completed', dueDate: '2028-01-10', lastCompleted: '2026-01-10' },
];

export const demoReferrals = [
  {
    referralTo: 'Dr. Lisa Nguyen, MD — Dermatology',
    reason: 'Annual skin check',
    referredBy: 'Dr. Michael Rivera',
    date: '2025-04-20',
    status: 'Completed',
    expirationDate: '2025-10-20',
  },
];

export const demoMedicalHistory = {
  pastConditions: [
    { condition: 'Mononucleosis', year: '2008' },
    { condition: 'Ankle Sprain, Right', year: '2025', status: 'Resolved' },
  ],
  surgicalHistory: [
    { procedure: 'Wisdom Teeth Extraction', year: '2010', provider: 'Dr. Alan Brooks, DDS' },
  ],
  familyHistory: [
    { relation: 'Mother', conditions: ['Type 2 Diabetes', 'Hypertension'] },
    { relation: 'Father', conditions: ['Coronary Artery Disease'] },
    { relation: 'Maternal Grandmother', conditions: ['Breast Cancer'] },
  ],
};

export const demoLetters = [
  {
    title: 'After Visit Summary — Annual Physical',
    date: '2026-01-10',
    provider: 'Dr. Michael Rivera',
    type: 'After Visit Summary',
    summary: 'Patient seen for annual physical. BP well controlled on Lisinopril. Continue Vitamin D supplementation. Labs ordered: CMP, CBC, Lipid Panel, Vitamin D. Follow up in 3 months.',
  },
  {
    title: 'After Visit Summary — Urgent Care',
    date: '2025-08-03',
    provider: 'Dr. James Park',
    type: 'After Visit Summary',
    summary: 'Patient presented with right ankle pain after stepping off a curb. X-ray negative for fracture. Diagnosis: right ankle sprain. Treatment: RICE protocol, ACE wrap, follow up in 2 weeks if not improving.',
  },
];

export const demoVitals = [
  {
    date: '2026-01-10',
    measurements: [
      { name: 'Blood Pressure', value: '118/76', units: 'mmHg' },
      { name: 'Heart Rate', value: '72', units: 'bpm' },
      { name: 'Temperature', value: '98.4', units: '°F' },
      { name: 'Weight', value: '138', units: 'lbs' },
      { name: 'Height', value: '66', units: 'in' },
      { name: 'BMI', value: '22.3', units: 'kg/m²' },
      { name: 'SpO2', value: '99', units: '%' },
    ],
  },
  {
    date: '2025-08-03',
    measurements: [
      { name: 'Blood Pressure', value: '122/78', units: 'mmHg' },
      { name: 'Heart Rate', value: '80', units: 'bpm' },
      { name: 'Temperature', value: '98.6', units: '°F' },
      { name: 'Weight', value: '140', units: 'lbs' },
    ],
  },
];

export const demoEmergencyContacts = [
  { name: 'David Chen', relationship: 'Spouse', phone: '(555) 867-5310' },
  { name: 'Linda Chen', relationship: 'Mother', phone: '(555) 234-9876' },
];

export const demoDocuments = [
  { title: 'Annual Physical Results 2026', date: '2026-01-10', type: 'Clinical Document', provider: 'Dr. Michael Rivera' },
  { title: 'Right Ankle X-Ray Report', date: '2025-08-03', type: 'Imaging Report', provider: 'Springfield Medical Center Radiology' },
];

export const demoGoals = [
  { goal: 'Maintain blood pressure below 130/80', setBy: 'Dr. Michael Rivera', status: 'On Track', targetDate: '2026-06-01' },
  { goal: 'Raise Vitamin D level above 30 ng/mL', setBy: 'Dr. Michael Rivera', status: 'In Progress', targetDate: '2026-04-10' },
  { goal: 'Walk 30 minutes daily', setBy: 'Sarah Chen', status: 'On Track', targetDate: 'Ongoing' },
];

export const demoUpcomingOrders = [
  {
    orderType: 'Lab',
    testName: 'Vitamin D, 25-Hydroxy',
    orderedBy: 'Dr. Michael Rivera',
    orderDate: '2026-01-10',
    instructions: 'Recheck Vitamin D level in 3 months. No fasting required.',
  },
  {
    orderType: 'Lab',
    testName: 'Comprehensive Metabolic Panel',
    orderedBy: 'Dr. Michael Rivera',
    orderDate: '2026-01-10',
    instructions: 'Annual monitoring. Fasting 12 hours prior.',
  },
];

export const demoQuestionnaires = [
  {
    name: 'Pre-Visit Questionnaire',
    assignedDate: '2026-03-18',
    dueDate: '2026-03-25',
    status: 'Not Started',
    appointment: 'Office Visit with Dr. Rivera — 03/25/2026',
  },
];

export const demoCareJourneys = [
  {
    name: 'Hypertension Management',
    status: 'Active',
    startDate: '2023-06-14',
    provider: 'Dr. Michael Rivera',
    nextStep: 'Follow-up visit — March 25, 2026',
  },
];

export const demoActivityFeed = [
  { date: '2026-03-18', type: 'Questionnaire', description: 'Pre-Visit Questionnaire assigned for upcoming appointment' },
  { date: '2026-01-12', type: 'Message', description: 'New message from Dr. Michael Rivera regarding lab results' },
  { date: '2026-01-10', type: 'Lab Results', description: 'Lab results available: CMP, CBC, Lipid Panel, Vitamin D' },
  { date: '2026-01-10', type: 'Visit', description: 'After Visit Summary available for Annual Physical' },
  { date: '2025-10-15', type: 'Immunization', description: 'Flu vaccine administered at CVS MinuteClinic' },
];

export const demoEducationMaterials = [
  { title: 'Understanding Your Blood Pressure', assignedBy: 'Dr. Michael Rivera', date: '2023-06-14', category: 'Heart Health' },
  { title: 'Vitamin D and Your Health', assignedBy: 'Dr. Michael Rivera', date: '2024-11-20', category: 'Nutrition' },
];

export const demoEhiExport = {
  availableFormats: ['FHIR R4 (JSON)', 'C-CDA (XML)'],
  lastExport: '2025-11-01',
  note: 'Electronic Health Information export available per 21st Century Cures Act.',
};

export const demoImagingResults = [
  {
    study: 'X-Ray — Right Ankle, 3 Views',
    date: '2025-08-03',
    orderedBy: 'Dr. James Park',
    facility: 'Springfield Medical Center Radiology',
    status: 'Final',
    impression: 'No acute fracture or dislocation. Mild soft tissue swelling over the lateral malleolus. No significant joint effusion.',
  },
];

export const demoLinkedAccounts = [
  { organization: 'Springfield Medical Center', hostname: 'mychart.springfieldmed.example.org', status: 'Active' },
];
