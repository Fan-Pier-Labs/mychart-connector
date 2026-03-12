/**
 * Fake data for the demo MCP server.
 * All data is entirely fictional — no real patient information.
 * Themed after Homer Simpson from The Simpsons.
 */

export const demoProfile = {
  name: 'Homer J. Simpson',
  preferredName: 'Homer',
  dateOfBirth: '05/12/1956',
  sex: 'Male',
  mrn: 'MRN-7704201',
  primaryCareProvider: 'Dr. Julius Hibbert, MD',
  address: '742 Evergreen Terrace, Springfield, IL 62704',
  phone: '(555) 636-7663',
  email: 'homer.simpson@example.com',
};

export const demoHealthSummary = {
  bloodType: 'O+',
  height: '6\'0" (182.9 cm)',
  weight: '260 lbs (117.9 kg)',
  bmi: '35.3',
  bloodPressure: '148/92 mmHg',
  heartRate: '88 bpm',
  lastUpdated: '2026-02-20',
};

export const demoMedications = [
  {
    name: 'Atorvastatin 40mg',
    directions: 'Take 1 tablet by mouth daily at bedtime',
    prescriber: 'Dr. Julius Hibbert',
    pharmacy: 'Springfield Pharmacy',
    refillsRemaining: 3,
    lastFilled: '2026-01-15',
  },
  {
    name: 'Lisinopril 20mg',
    directions: 'Take 1 tablet by mouth daily',
    prescriber: 'Dr. Julius Hibbert',
    pharmacy: 'Springfield Pharmacy',
    refillsRemaining: 2,
    lastFilled: '2026-02-01',
  },
  {
    name: 'Omeprazole 20mg',
    directions: 'Take 1 capsule by mouth daily before breakfast',
    prescriber: 'Dr. Julius Hibbert',
    pharmacy: 'Springfield Pharmacy',
    refillsRemaining: 4,
    lastFilled: '2025-12-10',
  },
  {
    name: 'Metformin 500mg',
    directions: 'Take 1 tablet by mouth twice daily with meals',
    prescriber: 'Dr. Julius Hibbert',
    pharmacy: 'Springfield Pharmacy',
    refillsRemaining: 1,
    lastFilled: '2026-01-20',
  },
];

export const demoAllergies = [
  { allergen: 'Penicillin', reaction: 'Hives, rash', severity: 'Moderate', type: 'Medication' },
  { allergen: 'Shrimp', reaction: 'Facial swelling', severity: 'Severe', type: 'Food' },
];

export const demoHealthIssues = [
  { condition: 'Obesity (Class II)', status: 'Active', onsetDate: '2005-03-10', provider: 'Dr. Julius Hibbert' },
  { condition: 'Essential Hypertension', status: 'Active', onsetDate: '2018-06-14', provider: 'Dr. Julius Hibbert' },
  { condition: 'Hyperlipidemia', status: 'Active', onsetDate: '2019-01-22', provider: 'Dr. Julius Hibbert' },
  { condition: 'Gastroesophageal Reflux Disease (GERD)', status: 'Active', onsetDate: '2020-09-05', provider: 'Dr. Julius Hibbert' },
  { condition: 'Type 2 Diabetes Mellitus', status: 'Active', onsetDate: '2023-11-15', provider: 'Dr. Julius Hibbert' },
  { condition: 'Crayon Lodged in Brain (frontal lobe)', status: 'Resolved', onsetDate: '2024-04-01', resolvedDate: '2024-04-03', provider: 'Dr. Nick Riviera' },
];

export const demoUpcomingVisits = [
  {
    type: 'Office Visit',
    provider: 'Dr. Julius Hibbert',
    department: 'Internal Medicine',
    location: 'Springfield General Hospital, Suite 200',
    date: '2026-03-25',
    time: '10:30 AM',
    status: 'Scheduled',
  },
  {
    type: 'Lab Work',
    provider: 'Lab Services',
    department: 'Laboratory',
    location: 'Springfield General Hospital, 1st Floor',
    date: '2026-03-24',
    time: '8:00 AM',
    status: 'Scheduled',
    instructions: 'Fasting required — nothing to eat or drink (except water) for 12 hours prior.',
  },
];

export const demoPastVisits = [
  {
    type: 'Office Visit',
    provider: 'Dr. Julius Hibbert',
    department: 'Internal Medicine',
    date: '2026-01-10',
    reason: 'Annual Physical',
    diagnoses: ['Obesity (Class II)', 'Hypertension', 'Hyperlipidemia', 'Type 2 Diabetes'],
  },
  {
    type: 'Emergency Room',
    provider: 'Dr. Nick Riviera',
    department: 'Emergency Medicine',
    date: '2025-09-14',
    reason: 'Chest pain — ruled out cardiac event',
    diagnoses: ['GERD exacerbation'],
  },
  {
    type: 'Office Visit',
    provider: 'Dr. Julius Hibbert',
    department: 'Internal Medicine',
    date: '2025-07-20',
    reason: 'Diabetes follow-up',
    diagnoses: ['Type 2 Diabetes Mellitus'],
  },
  {
    type: 'Surgical Procedure',
    provider: 'Dr. Nick Riviera',
    department: 'Neurosurgery',
    date: '2024-04-03',
    reason: 'Crayon removal from frontal lobe',
    diagnoses: ['Foreign body, brain'],
  },
];

export const demoLabResults = [
  {
    testName: 'Comprehensive Metabolic Panel',
    orderedBy: 'Dr. Julius Hibbert',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: 'Glucose', value: '128', units: 'mg/dL', referenceRange: '70-100', flag: 'High' },
      { component: 'BUN', value: '18', units: 'mg/dL', referenceRange: '7-20', flag: 'Normal' },
      { component: 'Creatinine', value: '1.1', units: 'mg/dL', referenceRange: '0.6-1.2', flag: 'Normal' },
      { component: 'Sodium', value: '141', units: 'mEq/L', referenceRange: '136-145', flag: 'Normal' },
      { component: 'Potassium', value: '4.5', units: 'mEq/L', referenceRange: '3.5-5.1', flag: 'Normal' },
      { component: 'AST', value: '52', units: 'U/L', referenceRange: '10-40', flag: 'High' },
      { component: 'ALT', value: '68', units: 'U/L', referenceRange: '7-56', flag: 'High' },
    ],
  },
  {
    testName: 'Lipid Panel',
    orderedBy: 'Dr. Julius Hibbert',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: 'Total Cholesterol', value: '258', units: 'mg/dL', referenceRange: '<200', flag: 'High' },
      { component: 'LDL Cholesterol', value: '172', units: 'mg/dL', referenceRange: '<130', flag: 'High' },
      { component: 'HDL Cholesterol', value: '34', units: 'mg/dL', referenceRange: '>40', flag: 'Low' },
      { component: 'Triglycerides', value: '260', units: 'mg/dL', referenceRange: '<150', flag: 'High' },
    ],
  },
  {
    testName: 'Hemoglobin A1c',
    orderedBy: 'Dr. Julius Hibbert',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: 'HbA1c', value: '7.2', units: '%', referenceRange: '<5.7', flag: 'High' },
    ],
  },
  {
    testName: 'CBC with Differential',
    orderedBy: 'Dr. Julius Hibbert',
    collectedDate: '2026-01-10',
    status: 'Final',
    results: [
      { component: 'WBC', value: '7.2', units: 'K/uL', referenceRange: '4.5-11.0', flag: 'Normal' },
      { component: 'RBC', value: '5.1', units: 'M/uL', referenceRange: '4.5-5.9', flag: 'Normal' },
      { component: 'Hemoglobin', value: '15.2', units: 'g/dL', referenceRange: '13.5-17.5', flag: 'Normal' },
      { component: 'Hematocrit', value: '44.8', units: '%', referenceRange: '38-50', flag: 'Normal' },
      { component: 'Platelets', value: '220', units: 'K/uL', referenceRange: '150-400', flag: 'Normal' },
    ],
  },
];

export const demoMessages = [
  {
    id: 'msg-001',
    subject: 'Lab Results Available',
    from: 'Dr. Julius Hibbert',
    date: '2026-01-12',
    preview: 'Your lab results from your annual physical are now available. We need to discuss a few things...',
    messages: [
      {
        from: 'Dr. Julius Hibbert',
        date: '2026-01-12',
        body: 'Hi Homer, your lab results from your annual physical are in. Your A1c has crept up to 7.2% and your liver enzymes are elevated. Your cholesterol is also still above target despite the Atorvastatin. We really need to talk about diet — and I mean it this time. Please come in for a follow-up. Also, please continue all your current medications.',
      },
      {
        from: 'Homer Simpson',
        date: '2026-01-13',
        body: 'Thanks Doc. I\'ll try to cut back on the donuts. Can I at least keep the ones with sprinkles?',
      },
    ],
  },
  {
    id: 'msg-002',
    subject: 'Prescription Renewal Request',
    from: 'Homer Simpson',
    date: '2025-12-05',
    preview: 'I need a refill on my Omeprazole...',
    messages: [
      {
        from: 'Homer Simpson',
        date: '2025-12-05',
        body: 'Hi Dr. Hibbert, I need a refill on my Omeprazole. The heartburn is really bad when I eat spicy food. My pharmacy is Springfield Pharmacy on Main St. Thanks!',
      },
      {
        from: 'Dr. Julius Hibbert',
        date: '2025-12-05',
        body: 'Hi Homer, I\'ve sent the renewal to your pharmacy. It should be ready for pickup tomorrow. Have you considered eating fewer chili dogs? Just a thought!',
      },
    ],
  },
];

export const demoBilling = [
  {
    date: '2026-01-10',
    description: 'Office Visit — Annual Physical',
    provider: 'Dr. Julius Hibbert',
    totalCharge: '$450.00',
    insurancePaid: '$382.50',
    patientResponsibility: '$67.50',
    status: 'Paid',
  },
  {
    date: '2026-01-10',
    description: 'Laboratory Services',
    provider: 'Springfield General Hospital Lab',
    totalCharge: '$380.00',
    insurancePaid: '$323.00',
    patientResponsibility: '$57.00',
    status: 'Paid',
  },
  {
    date: '2025-09-14',
    description: 'Emergency Room Visit',
    provider: 'Dr. Nick Riviera',
    totalCharge: '$2,800.00',
    insurancePaid: '$2,380.00',
    patientResponsibility: '$420.00',
    status: 'Payment Plan',
  },
];

export const demoCareTeam = [
  { name: 'Dr. Julius Hibbert, MD', role: 'Primary Care Provider', specialty: 'Internal Medicine', phone: '(555) 234-5678' },
  { name: 'Dr. Nick Riviera, MD', role: 'Specialist', specialty: 'General Surgery', phone: '(555) 345-6789' },
  { name: 'Nurse Ruth Powers, RN', role: 'Care Coordinator', specialty: 'Nursing', phone: '(555) 234-5680' },
];

export const demoInsurance = [
  {
    plan: 'Springfield Nuclear Power Plant — PPO',
    memberId: 'SNPP-7704201',
    groupNumber: 'GRP-SECTOR7G',
    subscriber: 'Homer J. Simpson',
    effectiveDate: '2025-01-01',
    copay: { office: '$30', specialist: '$50', urgentCare: '$75', er: '$200' },
  },
];

export const demoImmunizations = [
  { vaccine: 'Influenza (Flu)', date: '2025-10-15', site: 'Left arm', provider: 'Springfield General Hospital' },
  { vaccine: 'COVID-19 Booster (Pfizer)', date: '2025-09-20', site: 'Left arm', provider: 'Springfield General Hospital' },
  { vaccine: 'Tdap', date: '2022-06-10', site: 'Right arm', provider: 'Dr. Julius Hibbert' },
  { vaccine: 'Hepatitis B — Dose 3', date: '2015-03-01', site: 'Left arm', provider: 'Springfield General Hospital' },
];

export const demoPreventiveCare = [
  { item: 'Annual Physical Exam', status: 'Completed', dueDate: '2027-01-10', lastCompleted: '2026-01-10' },
  { item: 'Flu Vaccine', status: 'Completed', dueDate: '2026-10-01', lastCompleted: '2025-10-15' },
  { item: 'Colonoscopy', status: 'Overdue', dueDate: '2025-05-12', lastCompleted: '2015-05-12' },
  { item: 'Dental Cleaning', status: 'Overdue', dueDate: '2024-06-01', lastCompleted: '2023-06-15' },
  { item: 'Diabetes Eye Exam', status: 'Due', dueDate: '2026-06-01', lastCompleted: '2024-11-20' },
];

export const demoReferrals = [
  {
    referralTo: 'Dr. Nick Riviera, MD — Cardiology',
    reason: 'Cardiac risk assessment',
    referredBy: 'Dr. Julius Hibbert',
    date: '2025-09-14',
    status: 'Completed',
    expirationDate: '2026-03-14',
  },
];

export const demoMedicalHistory = {
  pastConditions: [
    { condition: 'Crayon Lodged in Brain', year: '2024', status: 'Resolved' },
    { condition: 'Myocardial Infarction (mild)', year: '2020', status: 'Resolved' },
    { condition: 'Broken Thumb', year: '2016', status: 'Resolved' },
  ],
  surgicalHistory: [
    { procedure: 'Coronary Artery Bypass Graft (CABG)', year: '2020', provider: 'Springfield General Hospital' },
    { procedure: 'Craniotomy — Crayon Removal', year: '2024', provider: 'Dr. Nick Riviera' },
    { procedure: 'Appendectomy', year: '2010', provider: 'Springfield General Hospital' },
  ],
  familyHistory: [
    { relation: 'Father', conditions: ['Coronary Artery Disease', 'Hypertension'] },
    { relation: 'Mother', conditions: ['Osteoporosis'] },
    { relation: 'Paternal Grandfather', conditions: ['Type 2 Diabetes', 'Stroke'] },
  ],
};

export const demoLetters = [
  {
    title: 'After Visit Summary — Annual Physical',
    date: '2026-01-10',
    provider: 'Dr. Julius Hibbert',
    type: 'After Visit Summary',
    summary: 'Patient seen for annual physical. BP elevated at 148/92. A1c 7.2%, up from 6.8%. LDL 172, well above goal. Liver enzymes mildly elevated — likely NAFLD given BMI. Continue all medications, increase Atorvastatin to 40mg. Strongly counseled on diet and exercise. Follow up in 3 months.',
  },
  {
    title: 'After Visit Summary — ER Visit',
    date: '2025-09-14',
    provider: 'Dr. Nick Riviera',
    type: 'After Visit Summary',
    summary: 'Patient presented with acute chest pain after eating. EKG normal, troponin negative x2. Chest pain reproduced with palpation — musculoskeletal and GERD exacerbation. Discharged with instructions to follow up with PCP.',
  },
];

export const demoVitals = [
  {
    date: '2026-01-10',
    measurements: [
      { name: 'Blood Pressure', value: '148/92', units: 'mmHg' },
      { name: 'Heart Rate', value: '88', units: 'bpm' },
      { name: 'Temperature', value: '98.6', units: '°F' },
      { name: 'Weight', value: '260', units: 'lbs' },
      { name: 'Height', value: '72', units: 'in' },
      { name: 'BMI', value: '35.3', units: 'kg/m²' },
      { name: 'SpO2', value: '97', units: '%' },
    ],
  },
  {
    date: '2025-09-14',
    measurements: [
      { name: 'Blood Pressure', value: '155/98', units: 'mmHg' },
      { name: 'Heart Rate', value: '102', units: 'bpm' },
      { name: 'Temperature', value: '98.8', units: '°F' },
      { name: 'Weight', value: '258', units: 'lbs' },
    ],
  },
];

export const demoEmergencyContacts = [
  { name: 'Marge Simpson', relationship: 'Spouse', phone: '(555) 636-7664' },
  { name: 'Bart Simpson', relationship: 'Son', phone: '(555) 636-7665' },
];

export const demoDocuments = [
  { title: 'Annual Physical Results 2026', date: '2026-01-10', type: 'Clinical Document', provider: 'Dr. Julius Hibbert' },
  { title: 'ER Visit — Chest Pain Workup', date: '2025-09-14', type: 'Clinical Document', provider: 'Dr. Nick Riviera' },
];

export const demoGoals = [
  { goal: 'Lose 30 lbs — target weight 230 lbs', setBy: 'Dr. Julius Hibbert', status: 'Not Started', targetDate: '2026-07-01' },
  { goal: 'Lower A1c below 6.5%', setBy: 'Dr. Julius Hibbert', status: 'In Progress', targetDate: '2026-06-01' },
  { goal: 'Walk 20 minutes daily', setBy: 'Homer Simpson', status: 'Off Track', targetDate: 'Ongoing' },
];

export const demoUpcomingOrders = [
  {
    orderType: 'Lab',
    testName: 'Hemoglobin A1c',
    orderedBy: 'Dr. Julius Hibbert',
    orderDate: '2026-01-10',
    instructions: 'Recheck A1c in 3 months. No fasting required.',
  },
  {
    orderType: 'Lab',
    testName: 'Comprehensive Metabolic Panel with Hepatic Function',
    orderedBy: 'Dr. Julius Hibbert',
    orderDate: '2026-01-10',
    instructions: 'Monitor liver enzymes and glucose. Fasting 12 hours prior.',
  },
];

export const demoQuestionnaires = [
  {
    name: 'Pre-Visit Questionnaire',
    assignedDate: '2026-03-18',
    dueDate: '2026-03-25',
    status: 'Not Started',
    appointment: 'Office Visit with Dr. Hibbert — 03/25/2026',
  },
];

export const demoCareJourneys = [
  {
    name: 'Diabetes Management',
    status: 'Active',
    startDate: '2023-11-15',
    provider: 'Dr. Julius Hibbert',
    nextStep: 'Follow-up visit — March 25, 2026',
  },
  {
    name: 'Cardiac Risk Reduction',
    status: 'Active',
    startDate: '2020-06-01',
    provider: 'Dr. Julius Hibbert',
    nextStep: 'Lipid panel recheck — March 2026',
  },
];

export const demoActivityFeed = [
  { date: '2026-03-18', type: 'Questionnaire', description: 'Pre-Visit Questionnaire assigned for upcoming appointment' },
  { date: '2026-01-12', type: 'Message', description: 'New message from Dr. Julius Hibbert regarding lab results' },
  { date: '2026-01-10', type: 'Lab Results', description: 'Lab results available: CMP, CBC, Lipid Panel, HbA1c' },
  { date: '2026-01-10', type: 'Visit', description: 'After Visit Summary available for Annual Physical' },
  { date: '2025-10-15', type: 'Immunization', description: 'Flu vaccine administered at Springfield General Hospital' },
];

export const demoEducationMaterials = [
  { title: 'Managing Type 2 Diabetes', assignedBy: 'Dr. Julius Hibbert', date: '2023-11-15', category: 'Diabetes' },
  { title: 'Heart-Healthy Diet Guidelines', assignedBy: 'Dr. Julius Hibbert', date: '2020-06-01', category: 'Heart Health' },
  { title: 'Understanding Your Cholesterol Numbers', assignedBy: 'Dr. Julius Hibbert', date: '2019-01-22', category: 'Heart Health' },
];

export const demoEhiExport = {
  availableFormats: ['FHIR R4 (JSON)', 'C-CDA (XML)'],
  lastExport: '2025-11-01',
  note: 'Electronic Health Information export available per 21st Century Cures Act.',
};

export const demoImagingResults = [
  {
    study: 'Chest X-Ray, PA and Lateral',
    date: '2025-09-14',
    orderedBy: 'Dr. Nick Riviera',
    facility: 'Springfield General Hospital Radiology',
    status: 'Final',
    impression: 'Heart mildly enlarged. Lungs are clear. No acute cardiopulmonary disease. Recommend echocardiogram for further evaluation of cardiomegaly.',
  },
];

export const demoLinkedAccounts = [
  { organization: 'Springfield General Hospital', hostname: 'mychart.springfieldmed.example.org', status: 'Active' },
];
