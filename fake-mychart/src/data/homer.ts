// All fake data for Homer Jay Simpson
// Shaped to exactly match the JSON structures MyChart scrapers expect

// ─── Profile ─────────────────────────────────────────────────────────
export const profile = {
  name: 'Homer Jay Simpson',
  dob: '05/12/1956',
  mrn: '742',
  pcp: 'Dr. Julius Hibbert, MD',
};

// ─── Credentials ─────────────────────────────────────────────────────
export const DEFAULT_USERNAME = 'homer';
export const DEFAULT_PASSWORD = 'donuts123';

// ─── Medications ─────────────────────────────────────────────────────
export const medications = {
  communityMembers: [
    {
      prescriptionList: {
        prescriptions: [
          {
            name: 'Duff Beer Extract 500mg',
            patientFriendlyName: { text: 'Duff Beer Extract' },
            sig: 'Take 1 tablet by mouth as needed for relaxation',
            dateToDisplay: '01/15/2026',
            startDate: '01/15/2026',
            authorizingProvider: { name: 'Julius Hibbert, MD' },
            orderingProvider: { name: 'Julius Hibbert, MD' },
            isPatientReported: false,
            refillDetails: {
              writtenDispenseQuantity: '30',
              daySupply: '30',
              isRefillable: true,
              owningPharmacy: {
                name: 'Kwik-E-Mart Pharmacy',
                phoneNumber: '(555) 636-2700',
                formattedAddress: ['742 Evergreen Terrace', 'Springfield, NT 49007'],
              },
            },
          },
          {
            name: 'Donut Supplement 100mg',
            patientFriendlyName: { text: 'Donut Supplement' },
            sig: 'Take 1 tablet by mouth daily with breakfast',
            dateToDisplay: '01/15/2026',
            startDate: '01/15/2026',
            authorizingProvider: { name: 'Julius Hibbert, MD' },
            orderingProvider: { name: 'Julius Hibbert, MD' },
            isPatientReported: false,
            refillDetails: {
              writtenDispenseQuantity: '90',
              daySupply: '90',
              isRefillable: true,
              owningPharmacy: {
                name: 'Kwik-E-Mart Pharmacy',
                phoneNumber: '(555) 636-2700',
                formattedAddress: ['742 Evergreen Terrace', 'Springfield, NT 49007'],
              },
            },
          },
          {
            name: 'Lisinopril 10mg',
            patientFriendlyName: { text: 'Lisinopril' },
            sig: 'Take 1 tablet by mouth daily for blood pressure',
            dateToDisplay: '06/01/2025',
            startDate: '06/01/2025',
            authorizingProvider: { name: 'Julius Hibbert, MD' },
            orderingProvider: { name: 'Julius Hibbert, MD' },
            isPatientReported: false,
            refillDetails: {
              writtenDispenseQuantity: '30',
              daySupply: '30',
              isRefillable: true,
              owningPharmacy: {
                name: 'Kwik-E-Mart Pharmacy',
                phoneNumber: '(555) 636-2700',
                formattedAddress: ['742 Evergreen Terrace', 'Springfield, NT 49007'],
              },
            },
          },
          {
            name: 'Atorvastatin 20mg',
            patientFriendlyName: { text: 'Atorvastatin' },
            sig: 'Take 1 tablet by mouth at bedtime for cholesterol',
            dateToDisplay: '06/01/2025',
            startDate: '06/01/2025',
            authorizingProvider: { name: 'Julius Hibbert, MD' },
            orderingProvider: { name: 'Julius Hibbert, MD' },
            isPatientReported: false,
            refillDetails: {
              writtenDispenseQuantity: '30',
              daySupply: '30',
              isRefillable: true,
              owningPharmacy: {
                name: 'Kwik-E-Mart Pharmacy',
                phoneNumber: '(555) 636-2700',
                formattedAddress: ['742 Evergreen Terrace', 'Springfield, NT 49007'],
              },
            },
          },
        ],
      },
    },
  ],
  getPatientFirstName: 'Homer',
};

// ─── Allergies ───────────────────────────────────────────────────────
export const allergies = {
  dataList: [
    {
      allergyItem: {
        name: 'Vegetables',
        id: 'ALLERGY-001',
        formattedDateNoted: '03/15/1990',
        type: 'Food',
        reaction: 'Hives',
        severity: 'Severe',
      },
    },
    {
      allergyItem: {
        name: 'Exercise',
        id: 'ALLERGY-002',
        formattedDateNoted: '01/01/1985',
        type: 'Other',
        reaction: 'Shortness of breath',
        severity: 'Moderate',
      },
    },
  ],
  allergiesStatus: 0,
};

// ─── Health Issues ───────────────────────────────────────────────────
export const healthIssues = {
  dataList: [
    { healthIssueItem: { name: 'Obesity', id: 'HI-001', formattedDateNoted: '01/15/2000', isReadOnly: false } },
    { healthIssueItem: { name: 'High blood pressure', id: 'HI-002', formattedDateNoted: '03/20/2010', isReadOnly: false } },
    { healthIssueItem: { name: 'High cholesterol', id: 'HI-003', formattedDateNoted: '03/20/2010', isReadOnly: false } },
    { healthIssueItem: { name: 'Chronic radiation exposure (nuclear plant, Sector 7-G)', id: 'HI-004', formattedDateNoted: '08/01/1990', isReadOnly: false } },
    { healthIssueItem: { name: 'Foreign body in brain (crayon, lodged since childhood)', id: 'HI-005', formattedDateNoted: '05/09/1972', isReadOnly: false } },
  ],
};

// ─── Health Summary ──────────────────────────────────────────────────
export const healthSummary = {
  header: {
    patientAge: '69',
    height: { value: "6' 0\"", dateRecorded: '01/10/2026' },
    weight: { value: '260 lbs', dateRecorded: '01/10/2026' },
    bloodType: 'O+',
  },
  patientFirstName: 'Homer',
};

export const healthSummaryHeader = {
  lastVisit: {
    date: '01/10/2026',
    visitType: 'Annual Physical',
  },
};

// ─── Vitals / Flowsheets ────────────────────────────────────────────
export const vitals = {
  flowsheets: [
    {
      name: 'Blood Pressure',
      flowsheetId: 'FS-BP',
      readings: [
        { date: '01/10/2026', value: '145/95', units: 'mmHg' },
        { date: '07/15/2025', value: '150/98', units: 'mmHg' },
        { date: '01/20/2025', value: '142/92', units: 'mmHg' },
      ],
    },
    {
      name: 'Heart Rate',
      flowsheetId: 'FS-HR',
      readings: [
        { date: '01/10/2026', value: '88', units: 'bpm' },
        { date: '07/15/2025', value: '92', units: 'bpm' },
        { date: '01/20/2025', value: '85', units: 'bpm' },
      ],
    },
    {
      name: 'Weight',
      flowsheetId: 'FS-WT',
      readings: [
        { date: '01/10/2026', value: '260', units: 'lbs' },
        { date: '07/15/2025', value: '265', units: 'lbs' },
        { date: '01/20/2025', value: '255', units: 'lbs' },
      ],
    },
  ],
};

// ─── Care Team (HTML parsed) ────────────────────────────────────────
export const careTeam = [
  { name: 'Julius Hibbert, MD', role: 'Primary Care Provider', specialty: 'Internal Medicine' },
  { name: 'Nick Riviera, MD', role: 'Surgeon', specialty: 'General Surgery' },
];

// ─── Insurance (HTML parsed) ────────────────────────────────────────
export const insurance = [
  {
    planName: 'Springfield Nuclear Power Plant Employee Health Plan',
    subscriberName: 'Homer Jay Simpson',
    memberId: 'HSJ-12345',
    groupNumber: 'SNPP-742',
  },
];

// ─── Emergency Contacts ─────────────────────────────────────────────
export const emergencyContacts = {
  relationships: [
    { name: 'Marge Simpson', relationshipType: 'Spouse', phoneNumber: '(555) 636-2701', isEmergencyContact: true },
    { name: 'Barney Gumble', relationshipType: 'Friend', phoneNumber: '(555) 636-2800', isEmergencyContact: true },
  ],
};

// ─── Medical History ────────────────────────────────────────────────
export const medicalHistory = {
  medicalHistory: {
    diagnoses: [
      { diagnosisName: 'Obesity', diagnosisDate: '01/15/2000' },
      { diagnosisName: 'Hypertension', diagnosisDate: '03/20/2010' },
    ],
    medicalHistoryNotes: 'Patient has a history of donut-related incidents.',
  },
  surgicalHistory: {
    surgeries: [
      { surgeryName: 'Triple Bypass', surgeryDate: '11/05/1995' },
      { surgeryName: 'Crayon Removal from Brain', surgeryDate: '03/12/2001' },
    ],
    surgicalHistoryNotes: '',
  },
  familyHistoryAndStatus: {
    familyMembers: [
      { relationshipToPatientName: 'Father', statusName: 'Abraham Simpson - Living', conditions: ['Heart disease', 'Dementia'] },
      { relationshipToPatientName: 'Mother', statusName: 'Mona Simpson - Deceased', conditions: [] },
    ],
  },
};

// ─── Lab Results ────────────────────────────────────────────────────
export const labResultsList = {
  areResultsFullyLoaded: true,
  isGroupingFullyLoaded: true,
  groupBy: 1,
  newResultGroups: [
    {
      key: 'GRP-CMP',
      contactType: '',
      resultList: ['RES-CMP'],
      isInpatient: false,
      isEDVisit: false,
      isCurrentAdmission: false,
      visitProviderID: 'PROV-HIBBERT',
      organizationID: 'ORG-SPRINGFIELD',
      sortDate: '2026-01-10T10:30:00',
      formattedDate: 'Jan 10, 2026',
      isLargeGroup: false,
    },
    {
      key: 'GRP-LIPID',
      contactType: '',
      resultList: ['RES-LIPID'],
      isInpatient: false,
      isEDVisit: false,
      isCurrentAdmission: false,
      visitProviderID: 'PROV-HIBBERT',
      organizationID: 'ORG-SPRINGFIELD',
      sortDate: '2026-01-10T10:30:00',
      formattedDate: 'Jan 10, 2026',
      isLargeGroup: false,
    },
    {
      key: 'GRP-CBC',
      contactType: '',
      resultList: ['RES-CBC'],
      isInpatient: false,
      isEDVisit: false,
      isCurrentAdmission: false,
      visitProviderID: 'PROV-HIBBERT',
      organizationID: 'ORG-SPRINGFIELD',
      sortDate: '2026-01-10T10:30:00',
      formattedDate: 'Jan 10, 2026',
      isLargeGroup: false,
    },
  ],
  organizationLoadMoreInfo: {},
  newResults: {
    'RES-CMP^': {
      name: 'Comprehensive Metabolic Panel',
      key: 'RES-CMP',
      showName: false,
      showDetails: true,
      orderMetadata: {
        orderProviderName: 'Julius Hibbert, MD',
        authorizingProviderName: 'Julius Hibbert, MD',
        authorizingProviderID: 'PROV-HIBBERT',
        unreadCommentingProviderName: '',
        resultTimestampDisplay: 'Jan 10, 2026 10:30 AM',
        resultType: 1,
        read: 0,
      },
      resultComponents: [],
      shouldHideHistoricalData: false,
      scans: [],
      shareEverywhereLogin: false,
      showProviderNotReviewed: false,
      providerComments: [],
      tooManyVariants: false,
      hasComment: false,
      hasAllDetails: false,
      isAbnormal: false,
    },
    'RES-LIPID^': {
      name: 'Lipid Panel',
      key: 'RES-LIPID',
      showName: false,
      showDetails: true,
      orderMetadata: {
        orderProviderName: 'Julius Hibbert, MD',
        authorizingProviderName: 'Julius Hibbert, MD',
        authorizingProviderID: 'PROV-HIBBERT',
        unreadCommentingProviderName: '',
        resultTimestampDisplay: 'Jan 10, 2026 10:30 AM',
        resultType: 1,
        read: 0,
      },
      resultComponents: [],
      shouldHideHistoricalData: false,
      scans: [],
      shareEverywhereLogin: false,
      showProviderNotReviewed: false,
      providerComments: [],
      tooManyVariants: false,
      hasComment: false,
      hasAllDetails: false,
      isAbnormal: true,
    },
    'RES-CBC^': {
      name: 'Complete Blood Count',
      key: 'RES-CBC',
      showName: false,
      showDetails: true,
      orderMetadata: {
        orderProviderName: 'Julius Hibbert, MD',
        authorizingProviderName: 'Julius Hibbert, MD',
        authorizingProviderID: 'PROV-HIBBERT',
        unreadCommentingProviderName: '',
        resultTimestampDisplay: 'Jan 10, 2026 10:30 AM',
        resultType: 1,
        read: 0,
      },
      resultComponents: [],
      shouldHideHistoricalData: false,
      scans: [],
      shareEverywhereLogin: false,
      showProviderNotReviewed: false,
      providerComments: [],
      tooManyVariants: false,
      hasComment: false,
      hasAllDetails: false,
      isAbnormal: false,
    },
  },
  newProviderPhotoInfo: {
    'PROV-HIBBERT^': {
      name: 'Julius Hibbert, MD',
      empId: '',
      remoteEncrypted: false,
      photoUrl: '',
      providerId: 'PROV-HIBBERT',
      organizationId: '',
    },
  },
};

export const labResultsDetails = {
  orderName: 'Lipid Panel',
  key: 'RES-LIPID',
  results: [
    {
      name: 'Lipid Panel',
      key: 'RES-LIPID',
      showName: false,
      showDetails: true,
      orderMetadata: {
        orderProviderName: 'Julius Hibbert, MD',
        unreadCommentingProviderName: '',
        readingProviderName: '',
        resultTimestampDisplay: 'Jan 10, 2026 10:30 AM',
        collectionTimestampsDisplay: 'Jan 10, 2026 9:00 AM',
        specimensDisplay: 'Blood',
        resultStatus: 'Final',
        resultingLab: {
          name: 'Springfield General Hospital Lab',
          address: ['123 Main Street', 'Springfield, NT 49007'],
          phoneNumber: '(555) 636-3000',
          labDirector: 'Julius Hibbert, MD',
          cliaNumber: '',
        },
        resultType: 1,
        read: 0,
      },
      resultComponents: [
        {
          componentInfo: { componentID: 'COMP-CHOL', name: 'Total Cholesterol', commonName: 'Total Cholesterol', units: 'mg/dL' },
          componentResultInfo: { value: '280', isValueRtf: false, referenceRange: { displayLow: '125', displayHigh: '200', formattedReferenceRange: '125 - 200 mg/dL' }, abnormalFlagCategoryValue: 2 },
          componentComments: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '' },
        },
        {
          componentInfo: { componentID: 'COMP-LDL', name: 'LDL Cholesterol', commonName: 'LDL Cholesterol', units: 'mg/dL' },
          componentResultInfo: { value: '190', isValueRtf: false, referenceRange: { displayLow: '0', displayHigh: '100', formattedReferenceRange: '0 - 100 mg/dL' }, abnormalFlagCategoryValue: 2 },
          componentComments: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '' },
        },
        {
          componentInfo: { componentID: 'COMP-HDL', name: 'HDL Cholesterol', commonName: 'HDL Cholesterol', units: 'mg/dL' },
          componentResultInfo: { value: '35', isValueRtf: false, referenceRange: { displayLow: '40', displayHigh: '60', formattedReferenceRange: '40 - 60 mg/dL' }, abnormalFlagCategoryValue: 3 },
          componentComments: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '' },
        },
        {
          componentInfo: { componentID: 'COMP-TRIG', name: 'Triglycerides', commonName: 'Triglycerides', units: 'mg/dL' },
          componentResultInfo: { value: '350', isValueRtf: false, referenceRange: { displayLow: '0', displayHigh: '150', formattedReferenceRange: '0 - 150 mg/dL' }, abnormalFlagCategoryValue: 2 },
          componentComments: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '' },
        },
      ],
      studyResult: {
        narrative: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        impression: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        combinedRTFNarrativeImpression: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        addenda: [],
        isCupidAddendum: false,
        transcriptions: [],
        ecgDiagnosis: [],
        hasStudyContent: false,
      },
      shouldHideHistoricalData: false,
      resultNote: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
      reportDetails: { isDownloadablePDFReport: false, reportID: '', openRemotely: false, reportContext: '', reportVars: { ordId: 'RES-LIPID', ordDat: 'RES-LIPID-DAT' } },
      scans: [],
      imageStudies: [],
      indicators: [],
      geneticProfileLink: '',
      shareEverywhereLogin: false,
      showProviderNotReviewed: false,
      providerComments: [],
      resultLetter: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
      warningType: '',
      warningMessage: '',
      variants: [],
      tooManyVariants: false,
      hasComment: false,
      hasAllDetails: true,
      isAbnormal: true,
    },
  ],
  orderLimitReached: false,
  ordersDeduplicated: false,
  hideEncInfo: false,
};

// ─── Immunizations ──────────────────────────────────────────────────
export const immunizations = {
  organizationImmunizationList: [
    {
      organization: { organizationName: 'Springfield General Hospital' },
      orgImmunizations: [
        { name: 'Influenza (Flu)', id: 'IMM-001', formattedAdministeredDates: ['10/01/2025', '10/15/2024'] },
        { name: 'Tdap', id: 'IMM-002', formattedAdministeredDates: ['05/12/2020'] },
        { name: 'COVID-19 Vaccine', id: 'IMM-003', formattedAdministeredDates: ['09/01/2025', '03/15/2024'] },
        { name: 'Hepatitis B', id: 'IMM-004', formattedAdministeredDates: ['01/20/1990', '02/20/1990', '07/20/1990'] },
      ],
    },
  ],
};

// ─── Visits ─────────────────────────────────────────────────────────
export const upcomingVisits = {
  LaterVisitsList: [
    {
      HasPaymentFeature: true,
      HasQuestionnaireFeature: true,
      HasNewPvdFeature: false,
      PrimaryDate: '04/15/2026 09:00:00 AM',
      CsnForECheckIn: 'CSN-HOMER-001',
      RescheduledDatString: null,
      IsNoShow: false,
      LeftWithoutSeen: false,
      DischargeDate: null,
      HasDownloadSummaryLink: false,
      HasTransmitSummaryLink: false,
      CanRedirectToApptDetails: false,
      PastVisitBucket: null,
      IsClinicalInformationAvailable: false,
      OwnedBy: 0,
      AdmissionDateRange: null,
      IsApptDetailsEnabled: true,
      IsRequestCancelEnabled: true,
      IsDirectCancelEnabled: true,
      IsRescheduleEnabled: true,
      IsCopayEnabled: true,
      IsVisitSummaryEnabled: true,
      IsDownloadSummaryEnabled: true,
      IsTransmitCEEnabled: true,
      IsTransmitDirectEnabled: false,
      IsDischargeInstrEnabled: true,
      IsPatHandoutsEnabled: false,
      IsIPReviewEnabled: false,
      IsDischargeSummaryEnabled: true,
      IsProviderLinkEnabled: true,
      IsPreadmissionEnabled: true,
      IsEcheckInCompleted: false,
      Csn: 'CSN-HOMER-001',
      Id: 'VISIT-HOMER-001',
      ReferenceID: '',
      OrganizationLinks: [],
      PrimaryOrganizationLink: null,
      Organization: {
        OrganizationId: 'ORG-SPRINGFIELD',
        OrganizationIdentifier: null,
        RelatedOrganizations: null,
        HasChildOrgs: false,
      },
      Providers: [{ Name: 'Julius Hibbert, MD', ID: 'PROV-HIBBERT' }],
      VisitType: 'Annual Physical',
      Location: 'Springfield General Hospital',
      LocationAddress: '123 Main Street, Springfield, NT 49007',
      CancelRescheduleLink: null,
      ScheduleNewLink: null,
      VisitProviderAppointment: null,
    },
  ],
  EarlierVisitsList: [],
  PastVisitsList: [],
  ApptTypes: null,
  IsScrollToEnabled: false,
};

export const pastVisits = {
  LaterVisitsList: [],
  EarlierVisitsList: [],
  PastVisitsList: [
    {
      HasPaymentFeature: true,
      HasQuestionnaireFeature: false,
      HasNewPvdFeature: false,
      PrimaryDate: '01/10/2026 09:00:00 AM',
      CsnForECheckIn: 'CSN-HOMER-002',
      RescheduledDatString: null,
      IsNoShow: false,
      LeftWithoutSeen: false,
      DischargeDate: null,
      HasDownloadSummaryLink: true,
      HasTransmitSummaryLink: true,
      CanRedirectToApptDetails: true,
      PastVisitBucket: null,
      IsClinicalInformationAvailable: true,
      OwnedBy: 0,
      AdmissionDateRange: null,
      IsApptDetailsEnabled: true,
      IsRequestCancelEnabled: false,
      IsDirectCancelEnabled: false,
      IsRescheduleEnabled: false,
      IsCopayEnabled: false,
      IsVisitSummaryEnabled: true,
      IsDownloadSummaryEnabled: true,
      IsTransmitCEEnabled: true,
      IsTransmitDirectEnabled: false,
      IsDischargeInstrEnabled: true,
      IsPatHandoutsEnabled: false,
      IsIPReviewEnabled: false,
      IsDischargeSummaryEnabled: true,
      IsProviderLinkEnabled: true,
      IsPreadmissionEnabled: false,
      IsEcheckInCompleted: false,
      Csn: 'CSN-HOMER-002',
      Id: 'VISIT-HOMER-002',
      ReferenceID: '',
      OrganizationLinks: [],
      PrimaryOrganizationLink: null,
      Organization: {
        OrganizationId: 'ORG-SPRINGFIELD',
        OrganizationIdentifier: null,
        RelatedOrganizations: null,
        HasChildOrgs: false,
      },
      Providers: [{ Name: 'Julius Hibbert, MD', ID: 'PROV-HIBBERT' }],
      VisitType: 'Annual Physical',
      Location: 'Springfield General Hospital',
      LocationAddress: '123 Main Street, Springfield, NT 49007',
      CancelRescheduleLink: null,
      ScheduleNewLink: null,
      VisitProviderAppointment: null,
    },
    {
      HasPaymentFeature: true,
      HasQuestionnaireFeature: false,
      HasNewPvdFeature: false,
      PrimaryDate: '11/20/2025 02:30:00 PM',
      CsnForECheckIn: 'CSN-HOMER-003',
      RescheduledDatString: null,
      IsNoShow: false,
      LeftWithoutSeen: false,
      DischargeDate: null,
      HasDownloadSummaryLink: true,
      HasTransmitSummaryLink: true,
      CanRedirectToApptDetails: true,
      PastVisitBucket: null,
      IsClinicalInformationAvailable: true,
      OwnedBy: 0,
      AdmissionDateRange: null,
      IsApptDetailsEnabled: true,
      IsRequestCancelEnabled: false,
      IsDirectCancelEnabled: false,
      IsRescheduleEnabled: false,
      IsCopayEnabled: false,
      IsVisitSummaryEnabled: true,
      IsDownloadSummaryEnabled: true,
      IsTransmitCEEnabled: true,
      IsTransmitDirectEnabled: false,
      IsDischargeInstrEnabled: true,
      IsPatHandoutsEnabled: false,
      IsIPReviewEnabled: false,
      IsDischargeSummaryEnabled: true,
      IsProviderLinkEnabled: true,
      IsPreadmissionEnabled: false,
      IsEcheckInCompleted: false,
      Csn: 'CSN-HOMER-003',
      Id: 'VISIT-HOMER-003',
      ReferenceID: '',
      OrganizationLinks: [],
      PrimaryOrganizationLink: null,
      Organization: {
        OrganizationId: 'ORG-SPRINGFIELD',
        OrganizationIdentifier: null,
        RelatedOrganizations: null,
        HasChildOrgs: false,
      },
      Providers: [{ Name: 'Nick Riviera, MD', ID: 'PROV-NICK' }],
      VisitType: 'ER Visit - Donut Incident',
      Location: 'Springfield General Hospital ER',
      LocationAddress: '123 Main Street, Springfield, NT 49007',
      CancelRescheduleLink: null,
      ScheduleNewLink: null,
      VisitProviderAppointment: null,
    },
    {
      HasPaymentFeature: true,
      HasQuestionnaireFeature: false,
      HasNewPvdFeature: false,
      PrimaryDate: '08/05/2025 10:00:00 AM',
      CsnForECheckIn: 'CSN-HOMER-004',
      RescheduledDatString: null,
      IsNoShow: false,
      LeftWithoutSeen: false,
      DischargeDate: null,
      HasDownloadSummaryLink: true,
      HasTransmitSummaryLink: true,
      CanRedirectToApptDetails: true,
      PastVisitBucket: null,
      IsClinicalInformationAvailable: true,
      OwnedBy: 0,
      AdmissionDateRange: null,
      IsApptDetailsEnabled: true,
      IsRequestCancelEnabled: false,
      IsDirectCancelEnabled: false,
      IsRescheduleEnabled: false,
      IsCopayEnabled: false,
      IsVisitSummaryEnabled: true,
      IsDownloadSummaryEnabled: true,
      IsTransmitCEEnabled: true,
      IsTransmitDirectEnabled: false,
      IsDischargeInstrEnabled: true,
      IsPatHandoutsEnabled: false,
      IsIPReviewEnabled: false,
      IsDischargeSummaryEnabled: true,
      IsProviderLinkEnabled: true,
      IsPreadmissionEnabled: false,
      IsEcheckInCompleted: false,
      Csn: 'CSN-HOMER-004',
      Id: 'VISIT-HOMER-004',
      ReferenceID: '',
      OrganizationLinks: [],
      PrimaryOrganizationLink: null,
      Organization: {
        OrganizationId: 'ORG-SPRINGFIELD',
        OrganizationIdentifier: null,
        RelatedOrganizations: null,
        HasChildOrgs: false,
      },
      Providers: [{ Name: 'Julius Hibbert, MD', ID: 'PROV-HIBBERT' }],
      VisitType: 'Radiation Screening',
      Location: 'Springfield Nuclear Power Plant Health Center',
      LocationAddress: '100 Industrial Way, Springfield, NT 49007',
      CancelRescheduleLink: null,
      ScheduleNewLink: null,
      VisitProviderAppointment: null,
    },
  ],
  ApptTypes: null,
  IsScrollToEnabled: false,
};

// ─── Messages / Conversations ───────────────────────────────────────
export const conversations = {
  conversations: [
    {
      hthId: 'CONV-001',
      subject: 'Weight Management Follow-up',
      previewText: 'Homer, we discussed your weight loss goals...',
      audience: [{ name: 'Julius Hibbert, MD' }],
      hasMoreMessages: false,
      userOverrideNames: {},
      messages: [
        {
          wmgId: 'MSG-001',
          author: { empKey: 'PROV-HIBBERT', wprKey: '', displayName: 'Julius Hibbert, MD' },
          deliveryInstantISO: '2026-01-10T14:30:00Z',
          body: 'Homer, as we discussed during your visit, I strongly recommend reducing your donut intake to no more than 3 per day. Your cholesterol levels are concerning.',
        },
        {
          wmgId: 'MSG-002',
          author: { empKey: '', wprKey: 'WPR-HOMER', displayName: 'Homer Simpson' },
          deliveryInstantISO: '2026-01-10T15:45:00Z',
          body: "But doc, donuts are a food group! Can't I just take more pills instead?",
        },
        {
          wmgId: 'MSG-003',
          author: { empKey: 'PROV-HIBBERT', wprKey: '', displayName: 'Julius Hibbert, MD' },
          deliveryInstantISO: '2026-01-11T09:00:00Z',
          body: "No Homer, that's not how it works. Let's schedule a nutritionist appointment. I'm also referring you to a weight management program.",
        },
      ],
    },
    {
      hthId: 'CONV-002',
      subject: 'Discount Surgery Consultation',
      previewText: 'Hi-Everybody! I have great news about...',
      audience: [{ name: 'Nick Riviera, MD' }],
      hasMoreMessages: false,
      userOverrideNames: {},
      messages: [
        {
          wmgId: 'MSG-004',
          author: { empKey: 'PROV-NICK', wprKey: '', displayName: 'Nick Riviera, MD' },
          deliveryInstantISO: '2025-12-15T10:00:00Z',
          body: "Hi-Everybody! I have great news about a new discount liposuction procedure. Only $29.95! Results may vary.",
        },
        {
          wmgId: 'MSG-005',
          author: { empKey: '', wprKey: 'WPR-HOMER', displayName: 'Homer Simpson' },
          deliveryInstantISO: '2025-12-15T11:30:00Z',
          body: "Woohoo! Sign me up, Dr. Nick! That's cheaper than a month of donuts!",
        },
      ],
    },
  ],
  users: {
    'PROV-HIBBERT': { name: 'Julius Hibbert, MD' },
    'PROV-NICK': { name: 'Nick Riviera, MD' },
  },
  viewers: {
    'WPR-HOMER': { name: 'Homer Simpson', isSelf: true },
  },
};

// ─── Billing ────────────────────────────────────────────────────────
export const billingSummary = [
  {
    guarantorId: '742',
    guarantorName: 'Homer Simpson',
    amountDue: '$350.00',
    lastPaid: 'Last paid: $75.00 on 12/15/2025',
    detailsId: 'WP-BILLING-001',
    detailsContext: 'WP-BILLING-CTX-001',
  },
];

export const billingEncId = 'WP-BILLING-ENC-001';

export const billingVisits = {
  Success: true,
  Data: {
    VisitList: [],
    VisitListAmount: '',
    BadDebtVisitList: [],
    BadDebtVisitListAmount: '',
    PaymentPlanVisitList: [],
    PaymentPlanVisitListAmount: '',
    PaymentPlanVisitListPostResolutionAmount: '',
    NotPaymentPlanVisitList: [],
    NotPaymentPlanVisitListAmount: '',
    AdvanceBillVisitList: [],
    AdvanceBillVisitListAmount: '',
    InformationalVisitList: [
      {
        GroupType: 2,
        Index: 0,
        BillingSystem: 1,
        IsSBO: true,
        BillingSystemDisplay: 'Physician Services',
        AdjustmentsOnly: false,
        DateRangeDisplay: null,
        StartDate: 67300,
        StartDayOfMonth: 10,
        StartMonth: 1,
        StartYear: 2026,
        StartDateDisplay: 'Jan 10, 2026',
        StartDateAccessibleText: 'January 10, 2026',
        Description: 'Annual Physical at Springfield General Hospital',
        Patient: 'Patient: Homer Simpson',
        Provider: 'Provider: Julius Hibbert, MD',
        ProviderId: null,
        HospitalAccountDisplay: 'Account #HS-742-001',
        HospitalAccountId: 'HS-742-001',
        SupressDayFromDate: false,
        CanAddToPaymentPlan: false,
        PrimaryPayer: 'Primary Payer: Springfield Nuclear Employee Health Plan',
        IsLTCSeries: false,
        ChargeAmount: '$500.00',
        InsuranceAmountDue: '$150.00',
        InsuranceAmountDueRaw: 150,
        SelfAmountDue: '$350.00',
        SelfAmountDueRaw: 350,
        IsPatientNotResponsible: false,
        PatientNotResponsibleYet: false,
        InsurancePaymentAmount: '$0.00',
        InsuranceEstimatedPaymentAmount: null,
        SelfPaymentAmount: null,
        SelfAdjustmentAmount: null,
        SelfDiscountAmount: null,
        ContestedChargeAmount: null,
        ContestedPaymentAmount: null,
        ShowInsuranceHelp: true,
        SelfPaymentPlanAmountDue: null,
        SelfPaymentPlanAmountDueRaw: 0,
        IsExpanded: false,
        BlockExpanding: false,
        ProcedureList: [
          {
            BillingSystem: 1,
            Description: 'Office Visit, Established Patient - Annual Physical',
            Amount: '$350.00',
            PaymentList: null,
            InsuranceAmountDue: null,
            SelfAmountDue: '$350.00',
            HasAmountDue: true,
            SelfBadDebtAmount: null,
            HasBadDebtAmount: false,
            AdjustmentsOnly: false,
            IsContested: false,
          },
          {
            BillingSystem: 1,
            Description: 'Lab Work - Lipid Panel',
            Amount: '$150.00',
            PaymentList: null,
            InsuranceAmountDue: null,
            SelfAmountDue: '$0.00',
            HasAmountDue: false,
            SelfBadDebtAmount: null,
            HasBadDebtAmount: false,
            AdjustmentsOnly: false,
            IsContested: false,
          },
        ],
        ProcedureGroupList: null,
        CoverageInfoList: null,
        ShowCoverageHelp: true,
        VisitAutoPay: null,
        ShowVisitAutoPay: false,
        LevelOfDetailLoaded: 2,
        SelfBadDebtAmount: null,
        SelfBadDebtAmountRaw: 0,
        IsClosedHospitalAccount: false,
        IsBadDebtHAR: false,
        IsPaymentPlanEstimate: false,
        IsResolvedEstimatedPPAccount: false,
        NotOnPlanAmount: null,
        NotOnPlanAmountRaw: 0,
        EmptyVisitEstimateID: null,
        EstimateInfo: null,
        PatFriendlyAccountStatus: 3,
        VisitBadDebtScenario: 0,
        PatFriendlyAccountStatusAccessibleText: 'Account status: Outstanding',
        VisitStatusesEqualToClosed: [8, 9],
        IsOnPaymentPlan: false,
        IsNotOnPaymentPlan: false,
      },
    ],
    UnifiedVisitList: [],
    NoBalanceVisitList: [],
    AdjustmentVisitList: [],
    AdjustmentVisitListAmount: '',
    VisitAutoPayVisitList: [],
    VisitAutoPayVisitListAmount: '',
    HasVisits: true,
    ShowingAll: false,
    HasUnconvertedPBVisits: false,
    CanMakePayment: true,
    CanEditPaymentPlan: false,
    URLMakePayment: null,
    URLEditPaymentPlan: null,
    Filters: {
      FilterClass: 'col-9',
      Options: [
        { OptionClass: 'col-3', OptionLabel: 'Active accounts' },
        { OptionClass: 'col-3', OptionLabel: 'Year to date' },
        { OptionClass: 'col-3', OptionLabel: 'Last year' },
        { OptionClass: 'col-3', OptionLabel: 'Date range' },
      ],
    },
    PartialPaymentPlanAlert: { Code: 0, Banner: { HeaderText: '', DetailText: '', BannerType: 'informationalType', BannerTypeReact: 'informational' } },
    BillingSystem: 3,
  },
};

export const billingStatements = {
  Success: true,
  DataDetailBill: { StatementList: [] },
  DataStatement: {
    StatementList: [
      {
        Show: true,
        Date: 0,
        DayOfMonth: 15,
        Month: 1,
        Year: 2026,
        DateDisplay: '20260115',
        FormattedDateDisplay: 'Jan 15, 2026',
        Description: 'Sent via postal mail',
        LinkText: 'View (PDF)',
        LinkDescription: 'View the statement sent on January 15, 2026 (PDF).',
        IsRead: false,
        ImagePath: 'HOMER-STMT-001',
        Token: 'HOMER-TOKEN-001',
        IsPaperless: false,
        PrintID: 'HOMER-PRINT-001',
        StatementAmountDisplay: '$350.00',
        IsEB: false,
        Format: 1,
        IsDetailBill: false,
        BillingSystem: 3,
        EncBillingSystem: 'HOMER-ENC-BS-001',
        RecordID: 'HOMER-REC-001',
      },
    ],
    HasUnread: true,
    HasRead: false,
    ShowAll: false,
    IsPaperless: false,
    PaperlessStatus: 0,
    ShowPaperlessSignup: false,
    ShowPaperlessCancel: false,
    URLPaperlessBilling: null,
    IsPaperlessAllowedForSA: false,
    IsDetailBillModel: true,
    noStatementsString: 'No itemized bills are available for viewing.',
    allReadString: 'All itemized bills were previously read.',
    loadMoreString: 'Show all itemized bills',
  },
};

// ─── Letters ────────────────────────────────────────────────────────
export const letters = {
  letters: [
    { dateISO: '2026-01-10T16:00:00Z', reason: 'After Visit Summary - Annual Physical', viewed: false, empId: 'PROV-HIBBERT', hnoId: 'LTR-001', csn: 'CSN-HOMER-002' },
    { dateISO: '2025-11-20T16:00:00Z', reason: 'After Visit Summary - ER Visit', viewed: true, empId: 'PROV-NICK', hnoId: 'LTR-002', csn: 'CSN-HOMER-003' },
  ],
  users: {
    'PROV-HIBBERT': { name: 'Julius Hibbert, MD', photoUrl: '', empId: 'PROV-HIBBERT' },
    'PROV-NICK': { name: 'Nick Riviera, MD', photoUrl: '', empId: 'PROV-NICK' },
  },
};

export const letterDetails: Record<string, { bodyHTML: string }> = {
  'LTR-001': {
    bodyHTML: '<h2>After Visit Summary</h2><p>Patient: Homer Simpson</p><p>Date: January 10, 2026</p><p>Provider: Dr. Julius Hibbert</p><p>Reason: Annual Physical</p><p>Assessment: Patient is obese (BMI 35.3). Hypertension not well controlled. Hypercholesterolemia - lipid panel shows elevated LDL and triglycerides.</p><p>Plan: Continue current medications. Referred to weight management program. Follow up in 3 months. Dietary counseling recommended - reduce donut consumption.</p>',
  },
  'LTR-002': {
    bodyHTML: '<h2>After Visit Summary</h2><p>Patient: Homer Simpson</p><p>Date: November 20, 2025</p><p>Provider: Dr. Nick Riviera</p><p>Reason: ER Visit - Donut Incident</p><p>Assessment: Patient presented with abdominal distress after consuming 48 donuts in a single sitting.</p><p>Plan: Gastric lavage performed. Patient discharged with instructions to limit donut intake. Follow up with PCP.</p>',
  },
};

// ─── Goals ───────────────────────────────────────────────────────────
export const careTeamGoals = {
  goals: [
    { name: 'Lose 50 lbs', description: 'Reduce body weight from 260 lbs to 210 lbs through diet and exercise', status: 'In Progress', startDate: '01/10/2026', targetDate: '07/10/2026' },
    { name: 'Lower cholesterol', description: 'Reduce total cholesterol below 200 mg/dL', status: 'In Progress', startDate: '01/10/2026', targetDate: '04/10/2026' },
  ],
};

export const patientGoals = {
  goals: [
    { name: 'Eat one vegetable per week', description: 'Incorporate at least one serving of vegetables into weekly diet', status: 'Not Started', startDate: '01/15/2026', targetDate: '12/31/2026' },
  ],
};

// ─── Referrals ──────────────────────────────────────────────────────
export const referrals = {
  referralList: [
    {
      internalId: 'REF-001',
      externalId: 'REF-EXT-001',
      status: 'Approved',
      statusString: 'Approved',
      creationDate: '01/10/2026',
      start: '01/10/2026',
      end: '04/10/2026',
      referredByProviderName: 'Julius Hibbert, MD',
      referredToProviderName: 'Nick Riviera, MD',
      referredToFacility: 'Springfield Cardiology Associates',
    },
  ],
};

// ─── Preventive Care ────────────────────────────────────────────────
export const preventiveCare = [
  { name: 'Colonoscopy', status: 'overdue', date: '01/01/2024' },
  { name: 'Influenza Vaccine', status: 'due', date: '10/01/2026' },
  { name: 'Lipid Panel', status: 'completed', date: '01/10/2026' },
];

// ─── Documents ──────────────────────────────────────────────────────
export const documents = {
  documents: [
    { id: 'DOC-001', title: 'After Visit Summary', documentType: 'Clinical', date: '01/10/2026', providerName: 'Julius Hibbert, MD', organizationName: 'Springfield General Hospital' },
    { id: 'DOC-002', title: 'Lab Results Report', documentType: 'Lab', date: '01/10/2026', providerName: 'Julius Hibbert, MD', organizationName: 'Springfield General Hospital' },
  ],
};

// ─── Questionnaires ─────────────────────────────────────────────────
export const questionnaires = {
  questionnaires: [
    { id: 'QUEST-001', name: 'PHQ-9 Depression Screening', status: 'Completed', dueDate: '01/10/2026', completedDate: '01/10/2026' },
    { id: 'QUEST-002', name: 'Health Risk Assessment', status: 'Pending', dueDate: '04/15/2026', completedDate: '' },
  ],
};

// ─── Care Journeys ──────────────────────────────────────────────────
export const careJourneys = {
  careJourneys: [
    { id: 'CJ-001', name: 'Weight Management Program', description: 'Comprehensive program including dietary counseling, exercise plan, and regular check-ins', status: 'Active', providerName: 'Julius Hibbert, MD' },
  ],
};

// ─── Activity Feed ──────────────────────────────────────────────────
export const activityFeed = {
  items: [
    { id: 'FEED-001', title: 'New Lab Results Available', description: 'Your Lipid Panel results from January 10 are ready to view.', date: '01/10/2026', type: 'lab_result', isRead: false },
    { id: 'FEED-002', title: 'Upcoming Appointment Reminder', description: 'Annual Physical with Dr. Hibbert on April 15, 2026 at 9:00 AM.', date: '04/08/2026', type: 'appointment', isRead: false },
    { id: 'FEED-003', title: 'New Message from Dr. Hibbert', description: 'Dr. Hibbert sent you a message about Weight Management Follow-up.', date: '01/11/2026', type: 'message', isRead: true },
  ],
};

// ─── Education Materials ────────────────────────────────────────────
export const educationMaterials = {
  educationTitles: [
    { id: 'EDU-001', title: 'Heart Health: What You Need to Know', category: 'Cardiovascular', assignedDate: '01/10/2026', providerName: 'Julius Hibbert, MD' },
    { id: 'EDU-002', title: 'Managing Your Cholesterol', category: 'Cardiovascular', assignedDate: '01/10/2026', providerName: 'Julius Hibbert, MD' },
  ],
};

// ─── EHI Export ─────────────────────────────────────────────────────
export const ehiExport = {
  templates: [
    { id: 'EHI-001', name: 'Full Health Record', description: 'Complete export of all health information', format: 'CCDA' },
  ],
};

// ─── Upcoming Orders ────────────────────────────────────────────────
export const upcomingOrders = {
  orders: [
    { orderName: 'Lipid Panel', orderType: 'Lab', status: 'Ordered', orderedDate: '01/10/2026', orderedByProvider: 'Julius Hibbert, MD', facilityName: 'Springfield General Hospital' },
    { orderName: 'HbA1c', orderType: 'Lab', status: 'Ordered', orderedDate: '01/10/2026', orderedByProvider: 'Julius Hibbert, MD', facilityName: 'Springfield General Hospital' },
  ],
};

// ─── Linked Accounts ────────────────────────────────────────────────
export const linkedAccounts = {
  OrgList: {
    'ORG-SHELBYVILLE': {
      OrganizationName: 'Shelbyville Medical Center',
      LogoUrl: '',
      LastEncounterDetail: 'Sep 15, 2025',
    },
  },
};

// ─── Contact Information ────────────────────────────────────────────
export const contactInfo = {
  SecureCommunicationInfo: {
    EmailAddress: 'homer.simpson@springfieldnuclear.example.com',
  },
};

// ─── TOTP Setup ─────────────────────────────────────────────────────
export const totpInfo = {
  IsTotpEnabled: false,
};

export const totpQrCode = {
  encodedSecretKey: 'JBSWY3DPEHPK3PXP', // standard base32 test secret
};

// ─── Message Compose ────────────────────────────────────────────────
export const subtopics = {
  topicList: [
    { id: 'TOPIC-001', name: 'Medical Question' },
    { id: 'TOPIC-002', name: 'Medication Refill' },
    { id: 'TOPIC-003', name: 'Appointment Request' },
  ],
};

export const messageRecipients = [
  { id: 'PROV-HIBBERT', name: 'Julius Hibbert, MD', specialty: 'Internal Medicine' },
  { id: 'PROV-NICK', name: 'Nick Riviera, MD', specialty: 'General Surgery' },
];

export const messageViewers = {
  viewers: [
    { wprId: 'WPR-HOMER', isSelf: true },
  ],
};

// ─── Imaging / eUnity ──────────────────────────────────────────────

// DICOM UIDs for Homer's shoulder X-ray study
export const imaging = {
  studyUID: '1.2.840.114350.2.362.2.742742.2.1234567890.1',
  accessionNumber: 'E12345742',
  serviceInstance: 'SPRINGFIELDstudystrategy',
  patientId: '742$$$SPRINGFIELD',
  series: [
    {
      seriesUID: '1.3.51.0.7.748833181.4805.29255.36386.22408.54239.53943',
      instanceUID: '1.3.51.0.7.1272019023.37494.53573.32951.58539.52999.27202',
      seriesDescription: 'CHEST PA',
    },
    {
      seriesUID: '1.3.51.0.7.3271007396.35359.25929.40621.44249.10393.55955',
      instanceUID: '1.3.51.0.7.1476580709.39260.10317.37364.41212.20646.62903',
      seriesDescription: 'CHEST LATERAL',
    },
  ],
};

// Imaging lab result (X-ray) — returned when groupType=2 or when querying imaging results
export const imagingLabResultsList = {
  areResultsFullyLoaded: true,
  isGroupingFullyLoaded: true,
  groupBy: 1,
  newResultGroups: [
    {
      key: 'GRP-XRAY',
      contactType: '',
      resultList: ['RES-XRAY'],
      isInpatient: false,
      isEDVisit: false,
      isCurrentAdmission: false,
      visitProviderID: 'PROV-HIBBERT',
      organizationID: 'ORG-SPRINGFIELD',
      sortDate: '2025-08-05T10:00:00',
      formattedDate: 'Aug 5, 2025',
      isLargeGroup: false,
    },
  ],
  organizationLoadMoreInfo: {},
  newResults: {},
  newProviderPhotoInfo: {},
};

export const imagingLabResultDetails = {
  orderName: 'XR Chest 2 Views',
  key: 'RES-XRAY',
  results: [
    {
      name: 'XR Chest 2 Views',
      key: 'RES-XRAY',
      showName: false,
      showDetails: true,
      orderMetadata: {
        orderProviderName: 'Julius Hibbert, MD',
        unreadCommentingProviderName: '',
        readingProviderName: 'Julius Hibbert, MD',
        resultTimestampDisplay: 'Aug 5, 2025 11:00 AM',
        collectionTimestampsDisplay: 'Aug 5, 2025 10:00 AM',
        specimensDisplay: '',
        resultStatus: 'Final',
        resultingLab: {
          name: 'Springfield General Hospital Radiology',
          address: ['123 Main Street', 'Springfield, NT 49007'],
          phoneNumber: '(555) 636-3000',
          labDirector: 'Julius Hibbert, MD',
          cliaNumber: '',
        },
        resultType: 3,
        read: 0,
      },
      resultComponents: [],
      studyResult: {
        narrative: {
          isRTF: false,
          hasContent: true,
          contentAsString: 'FINDINGS: Heart size is at the upper limits of normal. Lungs are clear. No pleural effusion or pneumothorax. Bony structures are intact. Mild degenerative changes of the thoracic spine.',
          contentAsHtml: '<p>FINDINGS: Heart size is at the upper limits of normal. Lungs are clear. No pleural effusion or pneumothorax. Bony structures are intact. Mild degenerative changes of the thoracic spine.</p>',
          signingInstantTimestamp: '2025-08-05T11:00:00Z',
        },
        impression: {
          isRTF: false,
          hasContent: true,
          contentAsString: 'IMPRESSION: No acute cardiopulmonary abnormality. Cardiomegaly borderline. Recommend clinical correlation.',
          contentAsHtml: '<p>IMPRESSION: No acute cardiopulmonary abnormality. Cardiomegaly borderline. Recommend clinical correlation.</p>',
          signingInstantTimestamp: '2025-08-05T11:00:00Z',
        },
        combinedRTFNarrativeImpression: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        addenda: [],
        isCupidAddendum: false,
        transcriptions: [],
        ecgDiagnosis: [],
        hasStudyContent: true,
      },
      shouldHideHistoricalData: false,
      resultNote: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
      reportDetails: {
        isDownloadablePDFReport: false,
        reportID: 'RPT-XRAY-001',
        openRemotely: false,
        reportContext: '',
        reportVars: { ordId: 'ORD-XRAY-001', ordDat: 'ORD-XRAY-001-DAT' },
      },
      scans: [],
      imageStudies: [
        {
          studyId: imaging.studyUID,
          studyDescription: 'XR Chest 2 Views',
          studyDate: '2025-08-05',
          modality: 'CR',
          viewerUrl: '',
          numberOfImages: 2,
        },
      ],
      indicators: [],
      geneticProfileLink: '',
      shareEverywhereLogin: false,
      showProviderNotReviewed: false,
      providerComments: [],
      resultLetter: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
      warningType: '',
      warningMessage: '',
      variants: [],
      tooManyVariants: false,
      hasComment: false,
      hasAllDetails: true,
      isAbnormal: false,
    },
  ],
  orderLimitReached: false,
  ordersDeduplicated: false,
  hideEncInfo: false,
};

// Report content HTML with data-fdi-context for image viewer access
export const imagingReportContent = {
  reportContent: `<div class="report-content"><h3>XR Chest 2 Views</h3><p>FINDINGS: Heart size is at the upper limits of normal.</p><div data-fdi-context='${JSON.stringify({ fdi: 'FDI-XRAY-001', ord: 'ORD-XRAY-001' })}'><a href="#">View Images</a></div></div>`,
  reportCss: '',
};
