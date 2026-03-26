import { describe, expect, it } from 'vitest';
import {
  trimLabResults,
  trimBilling,
  trimMessages,
  trimImagingResults,
  trimLinkedAccounts,
  paginate,
} from '../transforms';
import type { BillingAccount } from '../../../../../scrapers/myChart/bills/types';

describe('trimLabResults', () => {
  it('extracts flat component fields from nested structure', () => {
    const raw = [{
      orderName: 'CBC',
      key: 'enc-key-123',
      results: [{
        name: 'Complete Blood Count',
        key: 'enc-result-key',
        showName: true,
        showDetails: true,
        orderMetadata: {
          orderProviderName: 'Dr. Smith',
          authorizingProviderName: '',
          unreadCommentingProviderName: '',
          resultTimestampDisplay: '03/01/2026',
          collectionTimestampsDisplay: '03/01/2026',
          specimensDisplay: '',
          resultStatus: 'Final',
          resultingLab: { name: '', address: [], phoneNumber: '', labDirector: '', cliaNumber: '' },
          resultType: 0,
          read: 1,
        },
        resultComponents: [{
          componentInfo: { componentID: 'enc-id', name: 'WBC', commonName: 'White Blood Cell', units: 'K/uL' },
          componentResultInfo: {
            value: '7.5',
            isValueRtf: false,
            numericValue: 7.5,
            referenceRange: { low: 4.0, high: 11.0, displayLow: '4.0', displayHigh: '11.0', formattedReferenceRange: '4.0 - 11.0' },
            abnormalFlagCategoryValue: 0,
          },
          componentComments: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '' },
        }, {
          componentInfo: { componentID: 'enc-id-2', name: 'HGB', commonName: 'Hemoglobin', units: 'g/dL' },
          componentResultInfo: {
            value: '10.2',
            isValueRtf: false,
            numericValue: 10.2,
            referenceRange: { low: 12.0, high: 16.0, displayLow: '12.0', displayHigh: '16.0', formattedReferenceRange: '12.0 - 16.0' },
            abnormalFlagCategoryValue: 1,
          },
          componentComments: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '' },
        }],
        studyResult: { narrative: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' }, impression: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' }, combinedRTFNarrativeImpression: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' }, addenda: [], transcriptions: [], ecgDiagnosis: [], hasStudyContent: false },
        shouldHideHistoricalData: false,
        resultNote: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        reportDetails: { isDownloadablePDFReport: false, reportID: '', openRemotely: false, reportContext: '', reportVars: { ordId: '', ordDat: '' } },
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
      }],
      orderLimitReached: false,
      ordersDeduplicated: false,
      hideEncInfo: false,
      historicalResults: {
        historicalResults: { 'enc-id': { componentID: 'enc-id', name: 'WBC', commonName: 'WBC', units: 'K/uL', oldestResultISO: '', hideGraph: false, showAbnormalFlag: false, historicalResultData: [] } },
        orderedComponentIDs: ['enc-id'],
        reportID: '',
        shouldShowBedsideActiveView: false,
      },
    }];

    const trimmed = trimLabResults(raw);
    expect(trimmed).toHaveLength(1);
    expect(trimmed[0].orderName).toBe('CBC');
    expect(trimmed[0].date).toBe('03/01/2026');
    expect(trimmed[0].provider).toBe('Dr. Smith');
    expect(trimmed[0].isAbnormal).toBe(true);
    expect(trimmed[0].components).toHaveLength(2);
    expect(trimmed[0].components[0]).toEqual({ name: 'WBC', value: '7.5', units: 'K/uL', range: '4.0 - 11.0', abnormal: false });
    expect(trimmed[0].components[1]).toEqual({ name: 'HGB', value: '10.2', units: 'g/dL', range: '12.0 - 16.0', abnormal: true });

    // No historicalResults, reportDetails, encrypted keys, etc.
    expect(JSON.stringify(trimmed)).not.toContain('enc-key-123');
    expect(JSON.stringify(trimmed)).not.toContain('historicalResults');
    expect(JSON.stringify(trimmed)).not.toContain('reportContent');
  });

  it('includes narrative and impression when present', () => {
    const raw = [{
      orderName: 'X-Ray Chest',
      key: 'k',
      results: [{
        name: 'X-Ray',
        key: 'k2',
        showName: true,
        showDetails: true,
        orderMetadata: { orderProviderName: 'Dr. Jones', unreadCommentingProviderName: '', resultTimestampDisplay: '01/15/2026', collectionTimestampsDisplay: '', specimensDisplay: '', resultStatus: 'Final', resultingLab: { name: '', address: [], phoneNumber: '', labDirector: '', cliaNumber: '' }, resultType: 0, read: 1 },
        resultComponents: [],
        studyResult: {
          narrative: { isRTF: false, hasContent: true, contentAsString: 'No acute findings.', contentAsHtml: '', signingInstantTimestamp: '' },
          impression: { isRTF: false, hasContent: true, contentAsString: 'Normal chest X-ray.', contentAsHtml: '', signingInstantTimestamp: '' },
          combinedRTFNarrativeImpression: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
          addenda: [], transcriptions: [], ecgDiagnosis: [], hasStudyContent: true,
        },
        shouldHideHistoricalData: false,
        resultNote: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        reportDetails: { isDownloadablePDFReport: false, reportID: '', openRemotely: false, reportContext: '', reportVars: { ordId: '', ordDat: '' } },
        scans: [], imageStudies: [], indicators: [], geneticProfileLink: '', shareEverywhereLogin: false, showProviderNotReviewed: false, providerComments: [],
        resultLetter: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        warningType: '', warningMessage: '', variants: [], tooManyVariants: false, hasComment: false, hasAllDetails: true, isAbnormal: false,
      }],
      orderLimitReached: false, ordersDeduplicated: false, hideEncInfo: false,
    }];

    const trimmed = trimLabResults(raw);
    expect(trimmed[0].narrative).toBe('No acute findings.');
    expect(trimmed[0].impression).toBe('Normal chest X-ray.');
  });
});

describe('trimBilling', () => {
  it('extracts key billing fields and flattens visits', () => {
    const raw = [{
      guarantorNumber: '12345',
      patientName: 'Test Patient',
      amountDue: 150.00,
      id: 'enc-id',
      context: 'enc-ctx',
      billingDetails: {
        Success: true,
        Data: {
          UnifiedVisitList: [{
            GroupType: 0, Index: 0, BillingSystem: 1, IsSBO: false, BillingSystemDisplay: '', AdjustmentsOnly: false,
            DateRangeDisplay: null, StartDate: 20260301, StartDayOfMonth: 1, StartMonth: 3, StartYear: 2026,
            StartDateDisplay: '03/01/2026', StartDateAccessibleText: null,
            Description: 'Office Visit', Patient: null, Provider: 'Dr. Smith', ProviderId: null,
            HospitalAccountDisplay: null, HospitalAccountId: null, SupressDayFromDate: false,
            CanAddToPaymentPlan: false, PrimaryPayer: 'Blue Cross',
            IsLTCSeries: false, ChargeAmount: '$250.00',
            InsuranceAmountDue: '$0.00', InsuranceAmountDueRaw: 0,
            SelfAmountDue: '$50.00', SelfAmountDueRaw: 50,
            IsPatientNotResponsible: false, PatientNotResponsibleYet: false,
            InsurancePaymentAmount: '$200.00', InsuranceEstimatedPaymentAmount: null,
            SelfPaymentAmount: '$50.00', SelfAdjustmentAmount: null, SelfDiscountAmount: null,
            ContestedChargeAmount: null, ContestedPaymentAmount: null,
            ShowInsuranceHelp: false, SelfPaymentPlanAmountDue: null, SelfPaymentPlanAmountDueRaw: 0,
            IsExpanded: false, BlockExpanding: false,
            ProcedureList: [{ BillingSystem: 1, Description: 'CPT 99213', Amount: '$250.00', PaymentList: null, InsuranceAmountDue: null, SelfAmountDue: '$50.00', HasAmountDue: true, SelfBadDebtAmount: null, HasBadDebtAmount: false, AdjustmentsOnly: false, IsContested: false }],
            ProcedureGroupList: [],
            CoverageInfoList: [{ CoverageName: 'Blue Cross PPO', Billed: '$250.00', Covered: '$200.00', PendingInsurance: null, RemainingResponsibility: '$50.00', Copay: '$30.00', Deductible: '$20.00', Coinsurance: null, NotCovered: null, Benefits: [] }],
            ShowCoverageHelp: false, VisitAutoPay: null, ShowVisitAutoPay: false,
            LevelOfDetailLoaded: 2, SelfBadDebtAmount: null, SelfBadDebtAmountRaw: 0,
            IsClosedHospitalAccount: false, IsBadDebtHAR: false, IsPaymentPlanEstimate: false,
            IsResolvedEstimatedPPAccount: false, NotOnPlanAmount: null, NotOnPlanAmountRaw: 0,
            EmptyVisitEstimateID: null, EstimateInfo: null,
            PatFriendlyAccountStatus: 0, VisitBadDebtScenario: 0,
            PatFriendlyAccountStatusAccessibleText: '',
            VisitStatusesEqualToClosed: [1], IsOnPaymentPlan: false, IsNotOnPaymentPlan: true,
          }],
          InformationalVisitList: [],
          HasVisits: true, ShowingAll: true, HasUnconvertedPBVisits: false,
          CanMakePayment: true, CanEditPaymentPlan: false,
          URLMakePayment: null, URLEditPaymentPlan: null,
          Filters: { FilterClass: '', Options: [] },
          PartialPaymentPlanAlert: { Code: 0, Banner: { HeaderText: '', DetailText: '', AssistiveText: '', ButtonLabel: '', ButtonUrl: '', ButtonID: null, ButtonClass: null, ButtonData: null, TelephoneLink: null, ButtonLabelSecondary: null, ButtonUrlSecondary: null, ButtonIDSecondary: null, ButtonClassSecondary: null, ButtonAriaDescribedByContentSecondary: null, ButtonAriaDescribedByIdSecondary: null, ButtonDataSecondary: null, DisableDetailTextHtmlEncoding: false, BannerType: '', BannerTypeReact: '', IconOverride: '', IconAltTextOverride: null, FontSize: 0 } },
          BillingSystem: 1,
        },
      },
      statementList: {
        Success: true,
        DataStatement: { StatementList: [{ Show: true, Date: 20260301, DayOfMonth: 1, Month: 3, Year: 2026, DateDisplay: '03/01/2026', FormattedDateDisplay: 'March 1, 2026', Description: 'Statement', LinkText: '', LinkDescription: '', IsRead: false, ImagePath: 'enc-path', Token: 'enc-token', IsPaperless: false, PrintID: '', StatementAmountDisplay: '$50.00', IsEB: false, Format: 0, IsDetailBill: false, BillingSystem: 1, EncBillingSystem: 'enc', RecordID: 'rec1' }], HasUnread: true, HasRead: false, ShowAll: true, IsPaperless: false, PaperlessStatus: 0, ShowPaperlessSignup: false, ShowPaperlessCancel: false, URLPaperlessBilling: null, IsPaperlessAllowedForSA: false, IsDetailBillModel: false, noStatementsString: '', allReadString: '', loadMoreString: '' },
        DataDetailBill: { StatementList: [], HasUnread: false, HasRead: false, ShowAll: true, IsPaperless: false, PaperlessStatus: 0, ShowPaperlessSignup: false, ShowPaperlessCancel: false, URLPaperlessBilling: null, IsPaperlessAllowedForSA: false, IsDetailBillModel: false, noStatementsString: '', allReadString: '', loadMoreString: '' },
      },
    }];

    const trimmed = trimBilling(raw);
    expect(trimmed).toHaveLength(1);
    expect(trimmed[0].amountDue).toBe(150);
    expect(trimmed[0].visits).toHaveLength(1);
    expect(trimmed[0].visits[0].date).toBe('03/01/2026');
    expect(trimmed[0].visits[0].description).toBe('Office Visit');
    expect(trimmed[0].visits[0].provider).toBe('Dr. Smith');
    expect(trimmed[0].visits[0].payer).toBe('Blue Cross');
    expect(trimmed[0].visits[0].chargeAmount).toBe('$250.00');
    expect(trimmed[0].visits[0].insurancePaid).toBe('$200.00');
    expect(trimmed[0].visits[0].selfAmountDue).toBe('$50.00');
    expect(trimmed[0].visits[0].coverageSummary).toHaveLength(1);
    expect(trimmed[0].visits[0].coverageSummary![0].deductible).toBe('$20.00');
    expect(trimmed[0].payments).toHaveLength(0);
    expect(trimmed[0].statements).toHaveLength(1);
    expect(trimmed[0].statements[0].amount).toBe('$50.00');

    // No ProcedureList, Payment sub-objects, Banner, etc.
    expect(JSON.stringify(trimmed)).not.toContain('ProcedureList');
    expect(JSON.stringify(trimmed)).not.toContain('enc-token');
    expect(JSON.stringify(trimmed)).not.toContain('Banner');
  });

  it('extracts payment history from paymentList', () => {
    const raw = [{
      guarantorNumber: '99999',
      patientName: 'Payment Test',
      amountDue: 0,
      id: 'id',
      context: 'ctx',
      billingDetails: {
        Success: true,
        Data: {
          UnifiedVisitList: [],
          InformationalVisitList: [],
          HasVisits: false, ShowingAll: true, HasUnconvertedPBVisits: false,
          CanMakePayment: false, CanEditPaymentPlan: false,
          URLMakePayment: null, URLEditPaymentPlan: null,
          Filters: { FilterClass: '', Options: [] },
          PartialPaymentPlanAlert: { Code: 0, Banner: { HeaderText: '', DetailText: '', AssistiveText: '', ButtonLabel: '', ButtonUrl: '', ButtonID: null, ButtonClass: null, ButtonData: null, TelephoneLink: null, ButtonLabelSecondary: null, ButtonUrlSecondary: null, ButtonIDSecondary: null, ButtonClassSecondary: null, ButtonAriaDescribedByContentSecondary: null, ButtonAriaDescribedByIdSecondary: null, ButtonDataSecondary: null, DisableDetailTextHtmlEncoding: false, BannerType: '', BannerTypeReact: '', IconOverride: '', IconAltTextOverride: null, FontSize: 0 } },
          BillingSystem: 1,
        },
      },
      paymentList: {
        Success: true,
        Data: {
          PaymentList: [
            {
              ID: 'enc-pmt-id', ElementID: 'past_enc-pmt-id', Index: '0',
              DayOfMonth: 13, Month: 5, Year: 2022,
              FormattedDateDisplay: 'May 13, 2022',
              Description: 'MyChart Payment',
              SubText: null,
              HtmlSubText: '<img alt="Visa" class="brandImage" src="/en-US/images/3rdparty/Visa.png"></img> x1153',
              PaymentAmountDisplay: '$135.06',
              UndistributedAmountDisplay: null, CoverageInfo: null, Receipt: null,
              IsBadDebtAdj: false, IsWriteOffAdj: false, IsSurchargeAdj: false,
              CanEdit: false, EditPaymentOptions: null, CanCancel: false,
              CancelCommandOptions: null, ConsentDocument: null, ViewConsentOptions: null,
              IsCardExpiringSoon: false, HasCardExpired: false,
            },
          ],
          Filters: null,
        },
      },
    }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trimmed = trimBilling(raw as unknown as BillingAccount[]);
    expect(trimmed[0].payments).toHaveLength(1);
    expect(trimmed[0].payments[0].date).toBe('May 13, 2022');
    expect(trimmed[0].payments[0].description).toBe('MyChart Payment');
    expect(trimmed[0].payments[0].amount).toBe('$135.06');
    expect(trimmed[0].payments[0].paymentMethod).toBe('Visa x1153');
    // No encrypted IDs
    expect(JSON.stringify(trimmed)).not.toContain('enc-pmt-id');
  });
});

describe('trimMessages', () => {
  it('strips HTML from message bodies', () => {
    const raw = {
      conversations: [{
        hthId: 'enc-hth-id',
        subject: 'Test Results',
        previewText: 'Your results are ready',
        senderName: 'Dr. Smith',
        lastMessageDateDisplay: '03/01/2026',
        messages: [{
          wmgId: 'enc-wmg-id',
          body: '<div style="font-family: Arial"><p>Your test results are <b>normal</b>.</p><br/><p>Best,<br/>Dr. Smith</p></div>',
          deliveryInstantISO: '2026-03-01T10:00:00Z',
          author: { displayName: 'Dr. Smith' },
        }],
      }],
      threads: [],
      users: { 'enc-user-1': { name: 'User 1' } },
      viewers: { 'enc-viewer-1': { name: 'Viewer 1', isSelf: true } },
    };

    const trimmed = trimMessages(raw);
    expect(trimmed).toHaveLength(1);
    expect(trimmed[0].subject).toBe('Test Results');
    expect(trimmed[0].senderName).toBe('Dr. Smith');
    expect(trimmed[0].messages).toHaveLength(1);
    expect(trimmed[0].messages[0].author).toBe('Dr. Smith');
    expect(trimmed[0].messages[0].body).not.toContain('<div');
    expect(trimmed[0].messages[0].body).not.toContain('style=');
    expect(trimmed[0].messages[0].body).toContain('normal');

    // No encrypted IDs, users/viewers maps
    expect(JSON.stringify(trimmed)).not.toContain('enc-hth-id');
    expect(JSON.stringify(trimmed)).not.toContain('enc-wmg-id');
    expect(JSON.stringify(trimmed)).not.toContain('enc-user-1');
    expect(JSON.stringify(trimmed)).not.toContain('enc-viewer-1');
  });

  it('returns empty array for null input', () => {
    expect(trimMessages(null)).toEqual([]);
  });
});

describe('trimImagingResults', () => {
  it('strips report HTML and keeps impression text', () => {
    const raw = [{
      orderName: 'MRI Brain',
      key: 'enc-key',
      reportText: 'Normal brain MRI.',
      results: [{
        name: 'MRI',
        key: 'k',
        showName: true,
        showDetails: true,
        orderMetadata: { orderProviderName: 'Dr. Radiology', unreadCommentingProviderName: '', resultTimestampDisplay: '02/15/2026', collectionTimestampsDisplay: '', specimensDisplay: '', resultStatus: 'Final', resultingLab: { name: '', address: [], phoneNumber: '', labDirector: '', cliaNumber: '' }, resultType: 0, read: 1 },
        resultComponents: [],
        studyResult: {
          narrative: { isRTF: false, hasContent: true, contentAsString: 'Detailed findings here.', contentAsHtml: '<p>Detailed findings here.</p>', signingInstantTimestamp: '' },
          impression: { isRTF: false, hasContent: true, contentAsString: 'No abnormality.', contentAsHtml: '<p>No abnormality.</p>', signingInstantTimestamp: '' },
          combinedRTFNarrativeImpression: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
          addenda: [], transcriptions: [], ecgDiagnosis: [], hasStudyContent: true,
        },
        shouldHideHistoricalData: false,
        resultNote: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        reportDetails: { isDownloadablePDFReport: false, reportID: 'enc-report', openRemotely: false, reportContext: '', reportVars: { ordId: '', ordDat: '' }, reportContent: { reportContent: '<html><style>.report{}</style><body>Big HTML blob</body></html>', reportCss: '.css{}' } },
        scans: [], imageStudies: [{ studyId: 's1', studyDescription: 'MRI', studyDate: '', modality: 'MR', viewerUrl: '', numberOfImages: 50 }],
        indicators: [], geneticProfileLink: '', shareEverywhereLogin: false, showProviderNotReviewed: false, providerComments: [],
        resultLetter: { isRTF: false, hasContent: false, contentAsString: '', contentAsHtml: '', signingInstantTimestamp: '' },
        warningType: '', warningMessage: '', variants: [], tooManyVariants: false, hasComment: false, hasAllDetails: true, isAbnormal: false,
      }],
      orderLimitReached: false, ordersDeduplicated: false, hideEncInfo: false,
    }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trimmed = trimImagingResults(raw as any);
    expect(trimmed).toHaveLength(1);
    expect(trimmed[0].orderName).toBe('MRI Brain');
    expect(trimmed[0].date).toBe('02/15/2026');
    expect(trimmed[0].provider).toBe('Dr. Radiology');
    expect(trimmed[0].reportText).toBe('Normal brain MRI.');
    expect(trimmed[0].impression).toBe('No abnormality.');
    expect(trimmed[0].narrative).toBe('Detailed findings here.');
    expect(trimmed[0].hasImages).toBe(true);

    // No HTML blobs, encrypted IDs, CSS
    expect(JSON.stringify(trimmed)).not.toContain('reportContent');
    expect(JSON.stringify(trimmed)).not.toContain('enc-report');
    expect(JSON.stringify(trimmed)).not.toContain('.css{}');
  });
});

describe('trimLinkedAccounts', () => {
  it('drops logo URLs', () => {
    const raw = [
      { name: 'Mass General Brigham', logoUrl: 'https://example.com/logo.png', lastEncounter: '03/01/2026' },
      { name: 'Atrius Health', logoUrl: 'https://example.com/atrius.png', lastEncounter: null },
    ];

    const trimmed = trimLinkedAccounts(raw);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]).toEqual({ name: 'Mass General Brigham', lastEncounter: '03/01/2026' });
    expect(trimmed[1]).toEqual({ name: 'Atrius Health', lastEncounter: null });
    expect(JSON.stringify(trimmed)).not.toContain('logoUrl');
    expect(JSON.stringify(trimmed)).not.toContain('logo.png');
  });
});

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('returns first N items with limit', () => {
    expect(paginate(items, 3)).toEqual([1, 2, 3]);
  });

  it('supports offset', () => {
    expect(paginate(items, 3, 5)).toEqual([6, 7, 8]);
  });

  it('returns all items when no limit', () => {
    expect(paginate(items)).toEqual(items);
  });

  it('handles offset beyond array length', () => {
    expect(paginate(items, 3, 20)).toEqual([]);
  });
});
