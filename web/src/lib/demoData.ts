// Realistic fake data for demo mode — matches all scraper return types

export const demoData = {
  profile: {
    name: 'Homer J. Simpson',
    dob: '05/12/1956',
    mrn: 'MRN-0000742',
    pcp: 'Dr. Julius Hibbert, MD',
  },
  email: 'homer.simpson@springfieldnuclear.com',

  healthSummary: {
    patientAge: '69',
    height: { value: '6\' 0"', dateRecorded: '01/10/2026' },
    weight: { value: '239 lbs', dateRecorded: '01/10/2026' },
    bloodType: 'O+',
    patientFirstName: 'Homer',
    lastVisit: { date: '01/10/2026', visitType: 'Office Visit' },
  },

  medications: {
    medications: [
      {
        name: 'Lisinopril 20mg tablet',
        commonName: 'Lisinopril',
        sig: 'Take 1 tablet by mouth once daily',
        dateToDisplay: '03/15/2025',
        startDate: '03/15/2025',
        authorizingProviderName: 'Dr. Julius Hibbert',
        orderingProviderName: 'Dr. Julius Hibbert',
        isRefillable: true,
        isPatientReported: false,
        pharmacy: { name: 'Springfield Pharmacy', phoneNumber: '(939) 555-0113', formattedAddress: ['742 Evergreen Terrace', 'Springfield, IL 62704'] },
        refillDetails: { writtenDispenseQuantity: '90', daySupply: '90' },
      },
      {
        name: 'Atorvastatin 40mg tablet',
        commonName: 'Lipitor',
        sig: 'Take 1 tablet by mouth at bedtime',
        dateToDisplay: '06/01/2025',
        startDate: '06/01/2025',
        authorizingProviderName: 'Dr. Julius Hibbert',
        orderingProviderName: 'Dr. Julius Hibbert',
        isRefillable: true,
        isPatientReported: false,
        pharmacy: { name: 'Springfield Pharmacy', phoneNumber: '(939) 555-0113', formattedAddress: ['742 Evergreen Terrace', 'Springfield, IL 62704'] },
        refillDetails: { writtenDispenseQuantity: '90', daySupply: '90' },
      },
      {
        name: 'Omeprazole 20mg capsule',
        commonName: 'Prilosec',
        sig: 'Take 1 capsule by mouth once daily before breakfast',
        dateToDisplay: '09/20/2025',
        startDate: '09/20/2025',
        authorizingProviderName: 'Dr. Julius Hibbert',
        orderingProviderName: 'Dr. Julius Hibbert',
        isRefillable: false,
        isPatientReported: true,
        pharmacy: null,
        refillDetails: null,
      },
    ],
    patientFirstName: 'Homer',
  },

  allergies: {
    allergies: [
      { name: 'Penicillin', id: 'ALG-001', formattedDateNoted: '05/12/2010', type: 'Medication', reaction: 'Hives, Rash', severity: 'Moderate' },
      { name: 'Shrimp', id: 'ALG-002', formattedDateNoted: '08/03/2015', type: 'Food', reaction: 'Mild swelling', severity: 'Mild' },
    ],
    allergiesStatus: 1,
  },

  immunizations: [
    { name: 'COVID-19 Vaccine (Pfizer)', id: 'IMM-001', administeredDates: ['01/15/2021', '02/12/2021', '11/05/2021', '10/15/2023'], organizationName: 'Springfield General Hospital' },
    { name: 'Influenza Vaccine', id: 'IMM-002', administeredDates: ['10/01/2025', '09/28/2024', '10/05/2023'], organizationName: 'Springfield General Hospital' },
    { name: 'Tdap (Tetanus, Diphtheria, Pertussis)', id: 'IMM-003', administeredDates: ['03/10/2020'], organizationName: 'Springfield General Hospital' },
    { name: 'Hepatitis B Vaccine', id: 'IMM-004', administeredDates: ['06/01/1956', '07/01/1956', '12/01/1956'], organizationName: 'Shelbyville Medical Center' },
  ],

  insurance: {
    coverages: [
      { planName: 'Springfield Nuclear Power Plant PPO', subscriberName: 'Homer J. Simpson', memberId: 'SNP-7421056', groupNumber: 'GRP-SECTOR7G', details: ['Effective: 01/01/2025', 'Copay: $25 PCP / $50 Specialist'] },
      { planName: 'Springfield Dental Plan', subscriberName: 'Homer J. Simpson', memberId: 'SDP-7421056', groupNumber: 'GRP-SECTOR7G', details: ['Effective: 01/01/2025', 'Annual Maximum: $2,000'] },
    ],
    hasCoverages: true,
  },

  careTeam: [
    { name: 'Julius Hibbert, MD', role: 'Primary Care Provider', specialty: 'Internal Medicine' },
    { name: 'Nick Riviera, MD', role: 'Specialist', specialty: 'Cardiology' },
    { name: 'Marcia Wallace, NP', role: 'Nurse Practitioner', specialty: 'Occupational Health' },
  ],

  referrals: [
    {
      internalId: 'REF-101', externalId: 'EXT-2025-001', status: 'active', statusString: 'Active',
      creationDate: '12/01/2025', startDate: '12/15/2025', endDate: '06/15/2026',
      referredByProviderName: 'Dr. Julius Hibbert', referredToProviderName: 'Dr. Nick Riviera', referredToFacility: 'Springfield Heart Center',
    },
    {
      internalId: 'REF-102', externalId: 'EXT-2025-002', status: 'completed', statusString: 'Completed',
      creationDate: '08/15/2025', startDate: '09/01/2025', endDate: '12/01/2025',
      referredByProviderName: 'Dr. Julius Hibbert', referredToProviderName: 'Dr. Nick Riviera', referredToFacility: 'Springfield Gastroenterology',
    },
  ],

  letters: [
    { dateISO: '2026-01-15', reason: 'Annual Physical Results', viewed: true, providerName: 'Dr. Julius Hibbert', providerPhotoUrl: '', hnoId: 'HNO-001', csn: 'CSN-001' },
    { dateISO: '2025-11-20', reason: 'Cardiology Follow-up', viewed: true, providerName: 'Dr. Nick Riviera', providerPhotoUrl: '', hnoId: 'HNO-002', csn: 'CSN-002' },
    { dateISO: '2026-02-10', reason: 'Lab Results Discussion', viewed: false, providerName: 'Dr. Julius Hibbert', providerPhotoUrl: '', hnoId: 'HNO-003', csn: 'CSN-003' },
  ],

  healthIssues: [
    { name: 'Essential Hypertension', id: 'HI-001', formattedDateNoted: '03/15/2025', isReadOnly: true },
    { name: 'Hyperlipidemia', id: 'HI-002', formattedDateNoted: '06/01/2025', isReadOnly: true },
    { name: 'Obesity', id: 'HI-003', formattedDateNoted: '04/10/2020', isReadOnly: true },
    { name: 'Gastroesophageal Reflux Disease (GERD)', id: 'HI-004', formattedDateNoted: '09/20/2025', isReadOnly: false },
  ],

  preventiveCare: [
    { name: 'Colonoscopy', status: 'overdue' as const, overdueSince: '05/12/2026', notDueUntil: '', previouslyDone: [], completedDate: '' },
    { name: 'Flu Shot', status: 'not_due' as const, overdueSince: '', notDueUntil: '10/01/2026', previouslyDone: ['10/01/2025', '09/28/2024'], completedDate: '' },
    { name: 'Dental Cleaning', status: 'overdue' as const, overdueSince: '06/01/2025', notDueUntil: '', previouslyDone: [], completedDate: '' },
    { name: 'Prostate Screening (PSA)', status: 'not_due' as const, overdueSince: '', notDueUntil: '01/10/2027', previouslyDone: ['01/10/2026'], completedDate: '' },
  ],

  medicalHistory: {
    medicalHistory: {
      diagnoses: [
        { diagnosisName: 'Essential Hypertension', diagnosisDate: '03/15/2025' },
        { diagnosisName: 'Hyperlipidemia', diagnosisDate: '06/01/2025' },
        { diagnosisName: 'Obesity', diagnosisDate: '04/10/2020' },
        { diagnosisName: 'Gastroesophageal Reflux Disease', diagnosisDate: '09/20/2025' },
      ],
      notes: 'Patient counseled on weight management and dietary modifications. Occupational radiation exposure monitoring ongoing.',
    },
    surgicalHistory: {
      surgeries: [
        { surgeryName: 'Coronary Artery Bypass Graft (Triple)', surgeryDate: '08/15/2018' },
        { surgeryName: 'Appendectomy', surgeryDate: '03/22/2005' },
        { surgeryName: 'Crayon Removal (Nasal)', surgeryDate: '11/10/1997' },
      ],
      notes: '',
    },
    familyHistory: {
      familyMembers: [
        { relationshipToPatientName: 'Father', statusName: 'Living', conditions: ['Heart Disease', 'Hypertension'] },
        { relationshipToPatientName: 'Mother', statusName: 'Living', conditions: [] },
        { relationshipToPatientName: 'Paternal Grandfather', statusName: 'Deceased', conditions: ['Heart Disease', 'Stroke'] },
      ],
    },
  },

  vitals: [
    {
      name: 'Blood Pressure', flowsheetId: 'FS-BP',
      readings: [
        { date: '01/10/2026', value: '145/92', units: 'mmHg' },
        { date: '10/15/2025', value: '150/95', units: 'mmHg' },
        { date: '07/20/2025', value: '155/98', units: 'mmHg' },
        { date: '04/10/2025', value: '160/100', units: 'mmHg' },
      ],
    },
    {
      name: 'Heart Rate', flowsheetId: 'FS-HR',
      readings: [
        { date: '01/10/2026', value: '82', units: 'bpm' },
        { date: '10/15/2025', value: '85', units: 'bpm' },
        { date: '07/20/2025', value: '88', units: 'bpm' },
      ],
    },
    {
      name: 'Weight', flowsheetId: 'FS-WT',
      readings: [
        { date: '01/10/2026', value: '239', units: 'lbs' },
        { date: '10/15/2025', value: '242', units: 'lbs' },
        { date: '07/20/2025', value: '245', units: 'lbs' },
      ],
    },
    {
      name: 'BMI', flowsheetId: 'FS-BMI',
      readings: [
        { date: '01/10/2026', value: '32.4', units: 'kg/m²' },
        { date: '10/15/2025', value: '32.8', units: 'kg/m²' },
      ],
    },
  ],

  emergencyContacts: [
    { name: 'Marge Simpson', relationshipType: 'Spouse', phoneNumber: '(939) 555-0113', isEmergencyContact: true },
    { name: 'Bart Simpson', relationshipType: 'Son', phoneNumber: '(939) 555-0114', isEmergencyContact: true },
  ],

  documents: [
    { id: 'DOC-001', title: 'After Visit Summary - Annual Physical', documentType: 'AVS', date: '01/10/2026', providerName: 'Dr. Julius Hibbert', organizationName: 'Springfield General Hospital' },
    { id: 'DOC-002', title: 'Cardiology Consultation Note', documentType: 'Clinical Note', date: '12/20/2025', providerName: 'Dr. Nick Riviera', organizationName: 'Springfield Heart Center' },
    { id: 'DOC-003', title: 'Occupational Health Report', documentType: 'Clinical Note', date: '07/22/2025', providerName: 'Marcia Wallace, NP', organizationName: 'Springfield Nuclear Power Plant' },
  ],

  goals: {
    careTeamGoals: [
      { name: 'Lower Blood Pressure', description: 'Target: below 140/90 mmHg through medication and diet changes', status: 'In Progress', startDate: '03/15/2025', targetDate: '09/15/2026', source: 'care_team' as const },
      { name: 'Reduce LDL Cholesterol', description: 'Target: LDL below 100 mg/dL with statin therapy', status: 'In Progress', startDate: '06/01/2025', targetDate: '06/01/2026', source: 'care_team' as const },
      { name: 'Weight Loss', description: 'Target: lose 30 lbs through diet and exercise', status: 'In Progress', startDate: '01/01/2026', targetDate: '01/01/2027', source: 'care_team' as const },
    ],
    patientGoals: [
      { name: 'Walk 5,000 steps daily', description: 'Gradually increase daily activity', status: 'In Progress', startDate: '01/01/2026', targetDate: '06/01/2026', source: 'patient' as const },
      { name: 'Eat more vegetables', description: 'Include vegetables in at least one meal per day', status: 'In Progress', startDate: '01/01/2026', targetDate: '06/01/2026', source: 'patient' as const },
    ],
  },

  upcomingOrders: [
    { orderName: 'Comprehensive Metabolic Panel', orderType: 'Lab', status: 'Ordered', orderedDate: '01/10/2026', orderedByProvider: 'Dr. Julius Hibbert', facilityName: 'Springfield General Lab' },
    { orderName: 'Lipid Panel', orderType: 'Lab', status: 'Ordered', orderedDate: '01/10/2026', orderedByProvider: 'Dr. Julius Hibbert', facilityName: 'Springfield General Lab' },
    { orderName: 'Chest X-Ray', orderType: 'Imaging', status: 'Scheduled', orderedDate: '02/01/2026', orderedByProvider: 'Dr. Nick Riviera', facilityName: 'Springfield Imaging Center' },
  ],

  questionnaires: [
    { id: 'Q-001', name: 'Pre-Visit Health Screening', status: 'Pending', dueDate: '03/15/2026', completedDate: '' },
    { id: 'Q-002', name: 'PHQ-9 Depression Screening', status: 'Completed', dueDate: '01/10/2026', completedDate: '01/10/2026' },
    { id: 'Q-003', name: 'Occupational Health Questionnaire', status: 'Completed', dueDate: '01/10/2026', completedDate: '01/08/2026' },
  ],

  careJourneys: [
    { id: 'CJ-001', name: 'Heart Health Management', description: 'Ongoing cardiovascular risk management program with regular monitoring', status: 'Active', providerName: 'Dr. Nick Riviera' },
  ],

  activityFeed: [
    { id: 'AF-001', title: 'New Lab Results Available', description: 'Your Comprehensive Metabolic Panel results are ready to view', date: '02/28/2026', type: 'lab_result', isRead: false },
    { id: 'AF-002', title: 'Message from Dr. Hibbert', description: 'Re: Follow-up on blood pressure readings', date: '02/25/2026', type: 'message', isRead: true },
    { id: 'AF-003', title: 'Upcoming Appointment Reminder', description: 'Annual Physical with Dr. Hibbert on 03/15/2026', date: '02/20/2026', type: 'appointment', isRead: true },
    { id: 'AF-004', title: 'Prescription Refill Ready', description: 'Your Lisinopril refill is ready for pickup at Springfield Pharmacy', date: '02/15/2026', type: 'medication', isRead: true },
    { id: 'AF-005', title: 'New Letter Available', description: 'Letter from Dr. Riviera regarding cardiology follow-up', date: '02/10/2026', type: 'letter', isRead: false },
  ],

  educationMaterials: [
    { id: 'ED-001', title: 'Managing High Blood Pressure', category: 'Cardiovascular', assignedDate: '03/15/2025', providerName: 'Dr. Julius Hibbert' },
    { id: 'ED-002', title: 'Understanding Your Cholesterol Numbers', category: 'Cardiovascular', assignedDate: '06/01/2025', providerName: 'Dr. Julius Hibbert' },
    { id: 'ED-003', title: 'Heart-Healthy Diet Guide', category: 'Nutrition', assignedDate: '01/10/2026', providerName: 'Dr. Nick Riviera' },
  ],

  ehiExport: [
    { id: 'EHI-001', name: 'Full Health Record Export', description: 'Complete patient health record in standard format', format: 'C-CDA' },
    { id: 'EHI-002', name: 'Lab Results Export', description: 'Laboratory results in structured format', format: 'FHIR' },
  ],

  imagingResults: [
    {
      orderName: 'Chest X-Ray (PA and Lateral)', key: 'IMG-001',
      narrative: 'FINDINGS: The lungs are clear bilaterally. No pleural effusion or pneumothorax. The cardiac silhouette is mildly enlarged. Prior CABG changes noted with sternotomy wires in expected position. No acute osseous abnormalities.',
      impression: 'Mildly enlarged cardiac silhouette, stable. Prior CABG changes. No acute cardiopulmonary disease.',
      imageStudyCount: 2, scanCount: 0, resultDate: '11/15/2025', orderProvider: 'Dr. Nick Riviera',
    },
    {
      orderName: 'CT Head without Contrast', key: 'IMG-002',
      narrative: 'FINDINGS: No evidence of acute intracranial hemorrhage, mass effect, or midline shift. The ventricles and sulci are normal in size and configuration. No abnormal enhancement is seen.',
      impression: 'Normal CT of the head. No acute intracranial abnormality.',
      imageStudyCount: 4, scanCount: 1, resultDate: '08/20/2025', orderProvider: 'Dr. Julius Hibbert',
    },
  ],

  billing: [
    {
      guarantorNumber: '1001',
      patientName: 'Homer J. Simpson',
      amountDue: 175.50,
      billingDetails: {
        Data: {
          UnifiedVisitList: [
            {
              StartDateDisplay: '01/10/2026',
              Description: 'Office Visit - Annual Physical',
              Provider: 'Dr. Julius Hibbert',
              ChargeAmount: '$350.00',
              SelfAmountDue: '$25.00',
              PrimaryPayer: 'Springfield Nuclear Power Plant PPO',
              ProcedureList: [
                { Description: 'Preventive Visit, Est Patient', Amount: '$250.00', SelfAmountDue: '$0.00' },
                { Description: 'Venipuncture', Amount: '$35.00', SelfAmountDue: '$0.00' },
                { Description: 'Comprehensive Metabolic Panel', Amount: '$65.00', SelfAmountDue: '$25.00' },
              ],
            },
            {
              StartDateDisplay: '12/20/2025',
              Description: 'Cardiology Consultation',
              Provider: 'Dr. Nick Riviera',
              ChargeAmount: '$425.00',
              SelfAmountDue: '$50.00',
              PrimaryPayer: 'Springfield Nuclear Power Plant PPO',
              ProcedureList: [
                { Description: 'Office Visit, Level 4', Amount: '$325.00', SelfAmountDue: '$50.00' },
                { Description: 'ECG, 12-Lead', Amount: '$100.00', SelfAmountDue: '$0.00' },
              ],
            },
          ],
          InformationalVisitList: [
            {
              StartDateDisplay: '11/15/2025',
              Description: 'Chest X-Ray',
              Provider: 'Dr. Nick Riviera',
              ChargeAmount: '$175.00',
              SelfAmountDue: '$100.50',
              PrimaryPayer: 'Springfield Nuclear Power Plant PPO',
              ProcedureList: [],
            },
          ],
        },
      },
    },
  ],

  upcomingVisits: {
    LaterVisitsList: [
      {
        Date: '04/15/2026',
        Time: '2:30 PM',
        VisitTypeName: 'Follow-up Visit',
        PrimaryProviderName: 'Dr. Nick Riviera',
        PrimaryDepartment: { Name: 'Springfield Heart Center' },
      },
    ],
    NextNDaysVisits: [
      {
        Date: '03/15/2026',
        Time: '9:00 AM',
        VisitTypeName: 'Annual Physical',
        PrimaryProviderName: 'Dr. Julius Hibbert',
        PrimaryDepartment: { Name: 'Springfield General Hospital - Primary Care' },
      },
    ],
    InProgressVisits: [],
  },

  pastVisits: {
    List: {
      org1: {
        List: [
          { Date: '01/10/2026', Time: '10:00 AM', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Julius Hibbert', PrimaryDepartment: { Name: 'Springfield General Hospital' } },
          { Date: '12/20/2025', Time: '1:30 PM', VisitTypeName: 'Cardiology Consultation', PrimaryProviderName: 'Dr. Nick Riviera', PrimaryDepartment: { Name: 'Springfield Heart Center' } },
          { Date: '11/15/2025', Time: '11:00 AM', VisitTypeName: 'Imaging', PrimaryProviderName: 'Dr. Nick Riviera', PrimaryDepartment: { Name: 'Springfield Imaging Center' } },
          { Date: '10/15/2025', Time: '9:30 AM', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Julius Hibbert', PrimaryDepartment: { Name: 'Springfield General Hospital' } },
          { Date: '07/20/2025', Time: '2:00 PM', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Julius Hibbert', PrimaryDepartment: { Name: 'Springfield General Hospital' } },
        ],
      },
    },
  },

  labResults: [
    {
      orderName: 'Comprehensive Metabolic Panel',
      results: [
        {
          orderMetadata: { resultTimestampDisplay: '02/28/2026 8:30 AM', orderProviderName: 'Dr. Julius Hibbert' },
          resultComponents: [
            { componentInfo: { name: 'Glucose', units: 'mg/dL' }, componentResultInfo: { value: '112', referenceRange: { formattedReferenceRange: '70-100' }, abnormalFlagCategoryValue: 1 } },
            { componentInfo: { name: 'BUN', units: 'mg/dL' }, componentResultInfo: { value: '22', referenceRange: { formattedReferenceRange: '7-20' }, abnormalFlagCategoryValue: 1 } },
            { componentInfo: { name: 'Creatinine', units: 'mg/dL' }, componentResultInfo: { value: '1.1', referenceRange: { formattedReferenceRange: '0.7-1.3' }, abnormalFlagCategoryValue: 0 } },
            { componentInfo: { name: 'Sodium', units: 'mEq/L' }, componentResultInfo: { value: '141', referenceRange: { formattedReferenceRange: '136-145' }, abnormalFlagCategoryValue: 0 } },
            { componentInfo: { name: 'Potassium', units: 'mEq/L' }, componentResultInfo: { value: '4.5', referenceRange: { formattedReferenceRange: '3.5-5.0' }, abnormalFlagCategoryValue: 0 } },
          ],
        },
      ],
    },
    {
      orderName: 'Lipid Panel',
      results: [
        {
          orderMetadata: { resultTimestampDisplay: '02/28/2026 8:30 AM', orderProviderName: 'Dr. Julius Hibbert' },
          resultComponents: [
            { componentInfo: { name: 'Total Cholesterol', units: 'mg/dL' }, componentResultInfo: { value: '248', referenceRange: { formattedReferenceRange: '<200' }, abnormalFlagCategoryValue: 1 } },
            { componentInfo: { name: 'LDL Cholesterol', units: 'mg/dL' }, componentResultInfo: { value: '165', referenceRange: { formattedReferenceRange: '<100' }, abnormalFlagCategoryValue: 1 } },
            { componentInfo: { name: 'HDL Cholesterol', units: 'mg/dL' }, componentResultInfo: { value: '38', referenceRange: { formattedReferenceRange: '>40' }, abnormalFlagCategoryValue: 1 } },
            { componentInfo: { name: 'Triglycerides', units: 'mg/dL' }, componentResultInfo: { value: '225', referenceRange: { formattedReferenceRange: '<150' }, abnormalFlagCategoryValue: 1 } },
          ],
        },
      ],
    },
    {
      orderName: 'Complete Blood Count (CBC)',
      results: [
        {
          orderMetadata: { resultTimestampDisplay: '01/10/2026 9:15 AM', orderProviderName: 'Dr. Julius Hibbert' },
          resultComponents: [
            { componentInfo: { name: 'WBC', units: 'K/uL' }, componentResultInfo: { value: '7.2', referenceRange: { formattedReferenceRange: '4.5-11.0' }, abnormalFlagCategoryValue: 0 } },
            { componentInfo: { name: 'RBC', units: 'M/uL' }, componentResultInfo: { value: '5.0', referenceRange: { formattedReferenceRange: '4.5-5.5' }, abnormalFlagCategoryValue: 0 } },
            { componentInfo: { name: 'Hemoglobin', units: 'g/dL' }, componentResultInfo: { value: '15.2', referenceRange: { formattedReferenceRange: '13.5-17.5' }, abnormalFlagCategoryValue: 0 } },
            { componentInfo: { name: 'Hematocrit', units: '%' }, componentResultInfo: { value: '45.1', referenceRange: { formattedReferenceRange: '38-50' }, abnormalFlagCategoryValue: 0 } },
            { componentInfo: { name: 'Platelets', units: 'K/uL' }, componentResultInfo: { value: '260', referenceRange: { formattedReferenceRange: '150-400' }, abnormalFlagCategoryValue: 0 } },
          ],
        },
      ],
    },
  ],

  messages: {
    conversations: [
      {
        conversationId: 'MSG-001',
        subject: 'Question about blood pressure medication',
        senderName: 'Dr. Julius Hibbert',
        lastMessageDate: '02/25/2026',
        preview: 'Homer, your recent readings are still elevated...',
        messages: [
          { messageId: 'M001-1', senderName: 'Homer Simpson', sentDate: '02/20/2026 10:30 AM', messageBody: 'Hey Doc, my blood pressure machine at home keeps showing numbers like 150/95. Is that bad? Marge is worried.', isFromPatient: true },
          { messageId: 'M001-2', senderName: 'Dr. Julius Hibbert', sentDate: '02/22/2026 2:15 PM', messageBody: 'Homer, those readings are above our target of 140/90. Are you taking your Lisinopril every day? And remember, we talked about cutting back on the sodium — that means fewer Krusty Burgers and less beer.', isFromPatient: false },
          { messageId: 'M001-3', senderName: 'Homer Simpson', sentDate: '02/23/2026 9:00 AM', messageBody: 'D\'oh! I may have missed a few days. And what if I switch to Krusty\'s low-sodium menu?', isFromPatient: true },
          { messageId: 'M001-4', senderName: 'Dr. Julius Hibbert', sentDate: '02/25/2026 11:45 AM', messageBody: 'Homer, your recent readings are still elevated. Please take your medication every day without exception. Any dietary improvement helps, but I\'d really like to see you stick to the plan we discussed. Let\'s review at your next appointment on 03/15.', isFromPatient: false },
        ],
      },
      {
        conversationId: 'MSG-002',
        subject: 'Cardiology follow-up',
        senderName: 'Dr. Nick Riviera',
        lastMessageDate: '01/20/2026',
        preview: 'Hi everybody! Your stress test results look...',
        messages: [
          { messageId: 'M002-1', senderName: 'Dr. Nick Riviera', sentDate: '01/15/2026 3:00 PM', messageBody: 'Hi everybody! Homer, Dr. Hibbert referred you for a follow-up on your cardiovascular health. Given your history of CABG, I\'d like to run a stress test. My office will call to schedule.', isFromPatient: false },
          { messageId: 'M002-2', senderName: 'Homer Simpson', sentDate: '01/16/2026 8:30 AM', messageBody: 'I did the treadmill test yesterday. I made it 6 minutes before I needed a donut break. When do I get the results?', isFromPatient: true },
          { messageId: 'M002-3', senderName: 'Dr. Nick Riviera', sentDate: '01/20/2026 10:00 AM', messageBody: 'Hi everybody! Your stress test results look acceptable — no signs of ischemia. Your exercise tolerance is below average for your age, which we should work on. I\'ll send the full report to Dr. Hibbert. Keep taking your medications!', isFromPatient: false },
        ],
      },
      {
        conversationId: 'MSG-003',
        subject: 'Prescription renewal request',
        senderName: 'Nurse Springfield',
        lastMessageDate: '02/15/2026',
        preview: 'Your Lisinopril refill has been sent to Springfield Pharmacy...',
        messages: [
          { messageId: 'M003-1', senderName: 'Homer Simpson', sentDate: '02/13/2026 4:00 PM', messageBody: 'Hi, I need more of my blood pressure pills. The ones that are white and round. Can you send them to the pharmacy on Evergreen Terrace?', isFromPatient: true },
          { messageId: 'M003-2', senderName: 'Nurse Springfield', sentDate: '02/15/2026 9:30 AM', messageBody: 'Your Lisinopril refill has been sent to Springfield Pharmacy. It should be ready for pickup within 24 hours. If you have any issues, please call us at (939) 555-0100.', isFromPatient: false },
        ],
      },
    ],
  },
};
