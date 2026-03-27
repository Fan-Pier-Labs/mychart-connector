import { describe, test, expect } from 'bun:test';
import {
  mapPatientToProfile,
  mapMedicationRequests,
  mapAllergyIntolerances,
  mapConditions,
  mapObservationsToLabResults,
  mapObservationsToVitals,
  mapImmunizations,
  mapEncountersToVisits,
  mapCareTeams,
  mapDocumentReferences,
  mapDiagnosticReportsToImaging,
} from '../mappers';

describe('FHIR mappers', () => {
  describe('mapPatientToProfile', () => {
    test('maps a Patient resource to ProfileData', () => {
      const patient = {
        resourceType: 'Patient',
        name: [{ use: 'official', given: ['John', 'Q'], family: 'Doe' }],
        birthDate: '1990-05-15',
        identifier: [
          { type: { coding: [{ code: 'MR' }] }, value: '12345678' },
        ],
        generalPractitioner: [{ display: 'Dr. Jane Smith' }],
        telecom: [{ system: 'email', value: 'john@example.com' }],
      };

      const result = mapPatientToProfile(patient);
      expect(result.name).toBe('John Q Doe');
      expect(result.dob).toContain('1990');
      expect(result.mrn).toBe('12345678');
      expect(result.pcp).toBe('Dr. Jane Smith');
      expect(result.email).toBe('john@example.com');
    });

    test('handles missing fields gracefully', () => {
      const patient = { resourceType: 'Patient' };
      const result = mapPatientToProfile(patient);
      expect(result.name).toBe('Unknown');
      expect(result.dob).toBe('');
      expect(result.mrn).toBe('');
      expect(result.pcp).toBe('');
      expect(result.email).toBeNull();
    });
  });

  describe('mapMedicationRequests', () => {
    test('maps MedicationRequest resources', () => {
      const resources = [
        {
          resourceType: 'MedicationRequest',
          medicationCodeableConcept: { text: 'Lisinopril 10mg' },
          dosageInstruction: [{ text: 'Take 1 tablet daily' }],
          authoredOn: '2024-01-15',
          requester: { display: 'Dr. Smith' },
          status: 'active',
        },
      ];

      const result = mapMedicationRequests(resources, 'John Doe');
      expect(result.medications).toHaveLength(1);
      expect(result.medications[0].name).toBe('Lisinopril 10mg');
      expect(result.medications[0].sig).toBe('Take 1 tablet daily');
      expect(result.medications[0].authorizingProviderName).toBe('Dr. Smith');
      expect(result.patientFirstName).toBe('John');
    });
  });

  describe('mapAllergyIntolerances', () => {
    test('maps AllergyIntolerance resources', () => {
      const resources = [
        {
          resourceType: 'AllergyIntolerance',
          id: 'allergy-1',
          code: { text: 'Penicillin' },
          reaction: [{ manifestation: [{ text: 'Rash' }], severity: 'moderate' }],
          category: ['medication'],
          recordedDate: '2023-06-01',
        },
      ];

      const result = mapAllergyIntolerances(resources);
      expect(result.allergies).toHaveLength(1);
      expect(result.allergies[0].name).toBe('Penicillin');
      expect(result.allergies[0].reaction).toBe('Rash');
      expect(result.allergies[0].severity).toBe('moderate');
      expect(result.allergies[0].type).toBe('medication');
    });
  });

  describe('mapConditions', () => {
    test('maps Condition resources to health issues', () => {
      const resources = [
        {
          resourceType: 'Condition',
          id: 'cond-1',
          code: { text: 'Essential hypertension' },
          onsetDateTime: '2022-03-10',
          clinicalStatus: { coding: [{ code: 'active' }] },
        },
      ];

      const result = mapConditions(resources);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Essential hypertension');
      expect(result[0].id).toBe('cond-1');
      expect(result[0].isReadOnly).toBe(true);
    });
  });

  describe('mapObservationsToLabResults', () => {
    test('maps Observation resources to lab results', () => {
      const resources = [
        {
          resourceType: 'Observation',
          id: 'obs-1',
          code: { text: 'Hemoglobin A1c', coding: [{ display: 'Hemoglobin A1c' }] },
          valueQuantity: { value: 5.7, unit: '%' },
          effectiveDateTime: '2024-01-15T10:00:00Z',
          performer: [{ display: 'Quest Diagnostics' }],
          referenceRange: [{ low: { value: 4.0 }, high: { value: 5.6 }, text: '4.0 - 5.6' }],
          interpretation: [{ coding: [{ code: 'H' }] }],
        },
      ];

      const result = mapObservationsToLabResults(resources);
      expect(result).toHaveLength(1);
      expect(result[0].orderName).toBe('Hemoglobin A1c');
      expect(result[0].results[0].resultComponents[0].componentResultInfo.value).toBe('5.7 %');
      expect(result[0].results[0].isAbnormal).toBe(true);
    });
  });

  describe('mapObservationsToVitals', () => {
    test('groups observations by code into flowsheets', () => {
      const resources = [
        {
          resourceType: 'Observation',
          code: { text: 'Blood Pressure', coding: [{ code: '85354-9' }] },
          valueQuantity: { value: 120, unit: 'mmHg' },
          effectiveDateTime: '2024-01-15',
        },
        {
          resourceType: 'Observation',
          code: { text: 'Blood Pressure', coding: [{ code: '85354-9' }] },
          valueQuantity: { value: 118, unit: 'mmHg' },
          effectiveDateTime: '2024-02-15',
        },
        {
          resourceType: 'Observation',
          code: { text: 'Heart Rate', coding: [{ code: '8867-4' }] },
          valueQuantity: { value: 72, unit: 'bpm' },
          effectiveDateTime: '2024-01-15',
        },
      ];

      const result = mapObservationsToVitals(resources);
      expect(result).toHaveLength(2);

      const bp = result.find((f) => f.name === 'Blood Pressure');
      expect(bp).toBeDefined();
      expect(bp!.readings).toHaveLength(2);

      const hr = result.find((f) => f.name === 'Heart Rate');
      expect(hr).toBeDefined();
      expect(hr!.readings).toHaveLength(1);
      expect(hr!.readings[0].value).toBe('72');
    });
  });

  describe('mapImmunizations', () => {
    test('groups immunizations by vaccine name', () => {
      const resources = [
        {
          resourceType: 'Immunization',
          id: 'imm-1',
          vaccineCode: { text: 'COVID-19 Vaccine' },
          occurrenceDateTime: '2023-01-15',
          performer: [{ actor: { display: 'CVS Pharmacy' } }],
        },
        {
          resourceType: 'Immunization',
          id: 'imm-2',
          vaccineCode: { text: 'COVID-19 Vaccine' },
          occurrenceDateTime: '2023-04-15',
          performer: [{ actor: { display: 'CVS Pharmacy' } }],
        },
      ];

      const result = mapImmunizations(resources);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('COVID-19 Vaccine');
      expect(result[0].administeredDates).toHaveLength(2);
    });
  });

  describe('mapEncountersToVisits', () => {
    test('maps Encounter resources to visits', () => {
      const resources = [
        {
          resourceType: 'Encounter',
          period: { start: '2024-01-15T09:00:00Z' },
          type: [{ text: 'Office Visit' }],
          participant: [
            { individual: { display: 'Dr. Smith' }, type: [{ coding: [{ code: 'ATND' }] }] },
          ],
          location: [{ location: { display: 'Main Campus' } }],
          status: 'finished',
        },
      ];

      const result = mapEncountersToVisits(resources);
      expect(result).toHaveLength(1);
      expect(result[0].visitTypeName).toBe('Office Visit');
      expect(result[0].providerName).toBe('Dr. Smith');
      expect(result[0].departmentName).toBe('Main Campus');
      expect(result[0].status).toBe('finished');
    });
  });

  describe('mapCareTeams', () => {
    test('maps CareTeam resources to members', () => {
      const resources = [
        {
          resourceType: 'CareTeam',
          participant: [
            { member: { display: 'Dr. Smith' }, role: [{ text: 'Primary Care Provider' }] },
            { member: { display: 'Nurse Johnson' }, role: [{ text: 'Nurse' }] },
          ],
        },
      ];

      const result = mapCareTeams(resources);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Dr. Smith');
      expect(result[0].role).toBe('Primary Care Provider');
      expect(result[1].name).toBe('Nurse Johnson');
    });
  });

  describe('mapDocumentReferences', () => {
    test('maps DocumentReference resources', () => {
      const resources = [
        {
          resourceType: 'DocumentReference',
          id: 'doc-1',
          description: 'After Visit Summary',
          type: { text: 'Clinical Note' },
          date: '2024-01-15',
          author: [{ display: 'Dr. Smith' }],
        },
      ];

      const result = mapDocumentReferences(resources);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('After Visit Summary');
      expect(result[0].documentType).toBe('Clinical Note');
      expect(result[0].providerName).toBe('Dr. Smith');
    });
  });

  describe('mapDiagnosticReportsToImaging', () => {
    test('maps DiagnosticReport resources to imaging results', () => {
      const resources = [
        {
          resourceType: 'DiagnosticReport',
          id: 'report-1',
          code: { text: 'Chest X-Ray' },
          conclusion: 'No acute findings.',
          effectiveDateTime: '2024-01-15',
          performer: [{ display: 'Radiology Dept' }],
          status: 'final',
        },
      ];

      const result = mapDiagnosticReportsToImaging(resources);
      expect(result).toHaveLength(1);
      expect(result[0].orderName).toBe('Chest X-Ray');
      expect(result[0].reportText).toBe('No acute findings.');
      expect(result[0].providerName).toBe('Radiology Dept');
      expect(result[0].status).toBe('final');
    });
  });
});
