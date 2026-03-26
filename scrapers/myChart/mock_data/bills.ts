import { MockData } from "./types";

export const get_pdf: MockData = {
  path: ['/MyChartPRD/Billing/Details/DownloadFromBlob'],
  // AI made this pdf. No idea if it is valid.
  response: new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 40, 0, 0, 0, 40, 8, 6, 0, 0, 0, 255, 255, 255, 124, 237, 67, 220, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28, 233, 0, 0, 0, 0, 49, 48, 56, 57, 2, 2, 144, 0, 0, 0, 13, 73, 69, 78, 68, 174, 66, 96, 130]), {headers: {'Content-Type': 'application/pdf'}})
}


export const payment_list: MockData = {
  path: ['/MyChartPRD/Billing/Details/LoadPaymentList'],
  response: new Response(JSON.stringify({
    Success: true,
    Data: {
      PaymentList: [
        {
          ID: 'MOCK-PMT-001',
          ElementID: 'past_MOCK-PMT-001',
          Index: '0',
          DayOfMonth: 15,
          Month: 3,
          Year: 2023,
          FormattedDateDisplay: 'Mar 15, 2023',
          Description: 'MyChart Payment',
          SubText: null,
          HtmlSubText: '<img alt="Visa" class="brandImage" src="/en-US/images/3rdparty/Visa.png"></img> x4242',
          PaymentAmountDisplay: '$10.00',
          UndistributedAmountDisplay: null,
          CoverageInfo: null,
          Receipt: null,
          IsBadDebtAdj: false,
          IsWriteOffAdj: false,
          IsSurchargeAdj: false,
          CanEdit: false,
          EditPaymentOptions: null,
          CanCancel: false,
          CancelCommandOptions: null,
          ConsentDocument: null,
          ViewConsentOptions: null,
          IsCardExpiringSoon: false,
          HasCardExpired: false,
        },
      ],
      Filters: null,
    },
  }), { headers: { 'Content-Type': 'application/json' } })
}

export const statement_list: MockData = {
  path: ['/MyChartPRD/Billing/Details/GetStatementList'],
  response: new Response(`
    {
    "Success": true,
    "DataDetailBill": {"StatementList": []},
    "DataStatement": {
        "StatementList": [
            {
                "Show": true,
                "Date": 0,
                "DayOfMonth": 27,
                "Month": 1,
                "Year": 2025,
                "DateDisplay": "20250127",
                "FormattedDateDisplay": "Jan 27, 2025",
                "Description": "Sent via postal mail",
                "LinkText": "View (PDF)",
                "LinkDescription": "View the statement sent on January 27, 2025 (PDF).",
                "IsRead": true,
                "ImagePath": "FAKE_IMAGE_PATH_1",
                "Token": "FAKE_TOKEN_1",
                "IsPaperless": false,
                "PrintID": "FAKE_PRINT_ID_1",
                "StatementAmountDisplay": "$0.00",
                "IsEB": false,
                "Format": 1,
                "IsDetailBill": false,
                "BillingSystem": 3,
                "EncBillingSystem": "FAKE_ENC_BILLING_SYSTEM_1",
                "RecordID": "FAKE_RECORD_ID_1"
            },
            {
                "Show": false,
                "Date": 0,
                "DayOfMonth": 30,
                "Month": 12,
                "Year": 2024,
                "DateDisplay": "20241230",
                "FormattedDateDisplay": "Dec 30, 2024",
                "Description": "Sent via postal mail",
                "LinkText": "View (PDF)",
                "LinkDescription": "View the statement sent on December 30, 2024 (PDF).",
                "IsRead": true,
                "ImagePath": "FAKE_IMAGE_PATH_2",
                "Token": "FAKE_TOKEN_2",
                "IsPaperless": false,
                "PrintID": "FAKE_PRINT_ID_2",
                "StatementAmountDisplay": "$0.00",
                "IsEB": false,
                "Format": 1,
                "IsDetailBill": false,
                "BillingSystem": 3,
                "EncBillingSystem": "FAKE_ENC_BILLING_SYSTEM_2",
                "RecordID": "FAKE_RECORD_ID_2"
            },
            {
                "Show": false,
                "Date": 0,
                "DayOfMonth": 1,
                "Month": 12,
                "Year": 2024,
                "DateDisplay": "20241201",
                "FormattedDateDisplay": "Dec 1, 2024",
                "Description": "Sent via postal mail",
                "LinkText": "View (PDF)",
                "LinkDescription": "View the statement sent on December 1, 2024 (PDF).",
                "IsRead": true,
                "ImagePath": "FAKE_IMAGE_PATH_3",
                "Token": "FAKE_TOKEN_3",
                "IsPaperless": false,
                "PrintID": "FAKE_PRINT_ID_3",
                "StatementAmountDisplay": "$0.00",
                "IsEB": false,
                "Format": 1,
                "IsDetailBill": false,
                "BillingSystem": 3,
                "EncBillingSystem": "FAKE_ENC_BILLING_SYSTEM_3",
                "RecordID": "FAKE_RECORD_ID_3"
            }
        ],
        "HasUnread": true,
        "HasRead": true,
        "ShowAll": false,
        "IsPaperless": false,
        "PaperlessStatus": 0,
        "ShowPaperlessSignup": false,
        "ShowPaperlessCancel": false,
        "URLPaperlessBilling": null,
        "IsPaperlessAllowedForSA": false,
        "IsDetailBillModel": true,
        "noStatementsString": "No itemized bills are available for viewing.",
        "allReadString": "All itemized bills were previously read.",
        "loadMoreString": "Show all itemized bills"
    }
}

    `)
}

// PatFriendlyAccountStatus is the status of the bill
// 2 is pending insurance payment
// 3 is outstanding aka you owe money
// 7 is its totally paid off
// dont know what the other ones are yet


export const bills_visit_list: MockData = {
  path: ['/MyChartPRD/Billing/Details/GetVisits'],
  response: new Response(`
    {
  "Success": true,
  "Data": {
    "VisitList": [],
    "VisitListAmount": "",
    "BadDebtVisitList": [],
    "BadDebtVisitListAmount": "",
    "PaymentPlanVisitList": [],
    "PaymentPlanVisitListAmount": "",
    "PaymentPlanVisitListPostResolutionAmount": "",
    "NotPaymentPlanVisitList": [],
    "NotPaymentPlanVisitListAmount": "",
    "AdvanceBillVisitList": [],
    "AdvanceBillVisitListAmount": "",
    "InformationalVisitList": [
  {
    "GroupType": 2,
    "Index": 0,
    "BillingSystem": 1,
    "IsSBO": true,
    "BillingSystemDisplay": "Physician Services",
    "AdjustmentsOnly": false,
    "DateRangeDisplay": null,
    "StartDate": 67257,
    "StartDayOfMonth": 21,
    "StartMonth": 2,
    "StartYear": 2025,
    "StartDateDisplay": "Feb 21, 2025",
    "StartDateAccessibleText": "February 21, 2025",
    "Description": "Fake Procedure Visit at Fake Imaging Center - Xray, Sports Medicine",
    "Patient": "Patient: John Doe",
    "Provider": "Provider: Dr. Jane Smith",
    "ProviderId": null,
    "HospitalAccountDisplay": "Account #FAKE001",
    "HospitalAccountId": "FAKE001",
    "SupressDayFromDate": false,
    "CanAddToPaymentPlan": false,
    "PrimaryPayer": "Primary Payer: Fake Insurance Co.",
    "IsLTCSeries": false,
    "ChargeAmount": "$39.00",
    "InsuranceAmountDue": "$39.00",
    "InsuranceAmountDueRaw": 39,
    "SelfAmountDue": "$0.00",
    "SelfAmountDueRaw": 0,
    "IsPatientNotResponsible": true,
    "PatientNotResponsibleYet": false,
    "InsurancePaymentAmount": "$0.00",
    "InsuranceEstimatedPaymentAmount": null,
    "SelfPaymentAmount": null,
    "SelfAdjustmentAmount": null,
    "SelfDiscountAmount": null,
    "ContestedChargeAmount": null,
    "ContestedPaymentAmount": null,
    "ShowInsuranceHelp": true,
    "SelfPaymentPlanAmountDue": null,
    "SelfPaymentPlanAmountDueRaw": 0,
    "IsExpanded": false,
    "BlockExpanding": false,
    "ProcedureList": [
      {
        "BillingSystem": 1,
        "Description": "Interpretation of X-ray, Shoulder - [Fake CPT]",
        "Amount": "$39.00",
        "PaymentList": null,
        "InsuranceAmountDue": null,
        "SelfAmountDue": "$0.00",
        "HasAmountDue": false,
        "SelfBadDebtAmount": null,
        "HasBadDebtAmount": false,
        "AdjustmentsOnly": false,
        "IsContested": false
      }
    ],
    "ProcedureGroupList": null,
    "CoverageInfoList": null,
    "ShowCoverageHelp": true,
    "VisitAutoPay": null,
    "ShowVisitAutoPay": false,
    "LevelOfDetailLoaded": 2,
    "SelfBadDebtAmount": null,
    "SelfBadDebtAmountRaw": 0,
    "IsClosedHospitalAccount": false,
    "IsBadDebtHAR": false,
    "IsPaymentPlanEstimate": false,
    "IsResolvedEstimatedPPAccount": false,
    "NotOnPlanAmount": null,
    "NotOnPlanAmountRaw": 0,
    "EmptyVisitEstimateID": null,
    "EstimateInfo": null,
    "PatFriendlyAccountStatus": 2,
    "VisitBadDebtScenario": 0,
    "PatFriendlyAccountStatusAccessibleText": "Account status: Pending insurance",
    "VisitStatusesEqualToClosed": [
      8,
      9
    ],
    "IsOnPaymentPlan": false,
    "IsNotOnPaymentPlan": false
  },
  {
    "GroupType": 2,
    "Index": 1,
    "BillingSystem": 1,
    "IsSBO": true,
    "BillingSystemDisplay": "Physician Services",
    "AdjustmentsOnly": false,
    "DateRangeDisplay": null,
    "StartDate": 67257,
    "StartDayOfMonth": 21,
    "StartMonth": 2,
    "StartYear": 2025,
    "StartDateDisplay": "Feb 21, 2025",
    "StartDateAccessibleText": "February 21, 2025",
    "Description": "Fake Established Patient Visit at Fake Orthopaedic Clinic, Sports Medicine Service",
    "Patient": "Patient: John Doe",
    "Provider": "Provider: Dr. Emily Johnson",
    "ProviderId": null,
    "HospitalAccountDisplay": "Account #FAKE002",
    "HospitalAccountId": "FAKE002",
    "SupressDayFromDate": false,
    "CanAddToPaymentPlan": false,
    "PrimaryPayer": "Primary Payer: Fake Insurance Co.",
    "IsLTCSeries": false,
    "ChargeAmount": "$404.00",
    "InsuranceAmountDue": "$344.00",
    "InsuranceAmountDueRaw": 344,
    "SelfAmountDue": "$0.00",
    "SelfAmountDueRaw": 0,
    "IsPatientNotResponsible": true,
    "PatientNotResponsibleYet": false,
    "InsurancePaymentAmount": "$0.00",
    "InsuranceEstimatedPaymentAmount": null,
    "SelfPaymentAmount": "-$60.00",
    "SelfAdjustmentAmount": null,
    "SelfDiscountAmount": null,
    "ContestedChargeAmount": null,
    "ContestedPaymentAmount": null,
    "ShowInsuranceHelp": true,
    "SelfPaymentPlanAmountDue": null,
    "SelfPaymentPlanAmountDueRaw": 0,
    "IsExpanded": false,
    "BlockExpanding": false,
    "ProcedureList": [
      {
        "BillingSystem": 1,
        "Description": "Office Visit, Established Patient - [Fake CPT]",
        "Amount": "$404.00",
        "PaymentList": null,
        "InsuranceAmountDue": null,
        "SelfAmountDue": "$0.00",
        "HasAmountDue": false,
        "SelfBadDebtAmount": null,
        "HasBadDebtAmount": false,
        "AdjustmentsOnly": false,
        "IsContested": false
      }
    ],
    "ProcedureGroupList": [
      {
        "VisitIndex": 1,
        "VisitGroupType": 2,
        "Description": null,
        "Amount": "$0.00",
        "ProcedureList": null,
        "PaymentList": [
          {
            "ID": null,
            "ElementID": null,
            "Index": null,
            "DayOfMonth": 0,
            "Month": 0,
            "Year": 0,
            "FormattedDateDisplay": null,
            "Description": "Patient Payment - Feb 21, 2025",
            "SubText": null,
            "HtmlSubText": null,
            "PaymentAmountDisplay": "-$60.00",
            "UndistributedAmountDisplay": null,
            "CoverageInfo": null,
            "Receipt": null,
            "IsBadDebtAdj": false,
            "IsWriteOffAdj": false,
            "IsSurchargeAdj": false,
            "CanEdit": false,
            "EditPaymentOptions": null,
            "CanCancel": false,
            "CancelCommandOptions": null,
            "ConsentDocument": null,
            "ViewConsentOptions": null,
            "IsCardExpiringSoon": false,
            "HasCardExpired": false
          }
        ],
        "EstPlanPaymentList": [],
        "HasEstPlanList": false,
        "IsPaymentsOnly": true,
        "HasPaymentsTowardsEstimates": false,
        "HasContestedProcedures": false,
        "IsExpanded": true
      }
    ],
    "CoverageInfoList": null,
    "ShowCoverageHelp": true,
    "VisitAutoPay": null,
    "ShowVisitAutoPay": false,
    "LevelOfDetailLoaded": 2,
    "SelfBadDebtAmount": null,
    "SelfBadDebtAmountRaw": 0,
    "IsClosedHospitalAccount": false,
    "IsBadDebtHAR": false,
    "IsPaymentPlanEstimate": false,
    "IsResolvedEstimatedPPAccount": false,
    "NotOnPlanAmount": null,
    "NotOnPlanAmountRaw": 0,
    "EmptyVisitEstimateID": null,
    "EstimateInfo": null,
    "PatFriendlyAccountStatus": 2,
    "VisitBadDebtScenario": 0,
    "PatFriendlyAccountStatusAccessibleText": "Account status: Pending insurance",
    "VisitStatusesEqualToClosed": [
      8,
      9
    ],
    "IsOnPaymentPlan": false,
    "IsNotOnPaymentPlan": false
  },
  {
    "GroupType": 2,
    "Index": 2,
    "BillingSystem": 2,
    "IsSBO": true,
    "BillingSystemDisplay": "Hospital Services",
    "AdjustmentsOnly": false,
    "DateRangeDisplay": null,
    "StartDate": 67257,
    "StartDayOfMonth": 21,
    "StartMonth": 2,
    "StartYear": 2025,
    "StartDateDisplay": "Feb 21, 2025",
    "StartDateAccessibleText": "February 21, 2025",
    "Description": "Fake Established Patient Visit at Fake Orthopaedic Clinic, Sports Medicine Service",
    "Patient": "Patient: John Doe",
    "Provider": "Provider: PA Alex Brown",
    "ProviderId": null,
    "HospitalAccountDisplay": "Account #FAKE003",
    "HospitalAccountId": "FAKE003",
    "SupressDayFromDate": false,
    "CanAddToPaymentPlan": false,
    "PrimaryPayer": "Primary Payer: Fake Insurance Co.",
    "IsLTCSeries": false,
    "ChargeAmount": "$438.00",
    "InsuranceAmountDue": "$438.00",
    "InsuranceAmountDueRaw": 438,
    "SelfAmountDue": "$0.00",
    "SelfAmountDueRaw": 0,
    "IsPatientNotResponsible": true,
    "PatientNotResponsibleYet": false,
    "InsurancePaymentAmount": "$0.00",
    "InsuranceEstimatedPaymentAmount": null,
    "SelfPaymentAmount": null,
    "SelfAdjustmentAmount": null,
    "SelfDiscountAmount": null,
    "ContestedChargeAmount": null,
    "ContestedPaymentAmount": null,
    "ShowInsuranceHelp": true,
    "SelfPaymentPlanAmountDue": null,
    "SelfPaymentPlanAmountDueRaw": 0,
    "IsExpanded": false,
    "BlockExpanding": false,
    "ProcedureList": null,
    "ProcedureGroupList": [
      {
        "VisitIndex": 2,
        "VisitGroupType": 2,
        "Description": "Diagnostic Radiology- Hospital",
        "Amount": "$438.00",
        "ProcedureList": [
          {
            "BillingSystem": 2,
            "Description": "X-ray Shoulder, 2+ Views - [Fake CPT]",
            "Amount": "$438.00",
            "PaymentList": null,
            "InsuranceAmountDue": null,
            "SelfAmountDue": "$0.00",
            "HasAmountDue": false,
            "SelfBadDebtAmount": null,
            "HasBadDebtAmount": false,
            "AdjustmentsOnly": false,
            "IsContested": false
          }
        ],
        "PaymentList": null,
        "EstPlanPaymentList": null,
        "HasEstPlanList": false,
        "IsPaymentsOnly": false,
        "HasPaymentsTowardsEstimates": false,
        "HasContestedProcedures": false,
        "IsExpanded": false
      }
    ],
    "CoverageInfoList": null,
    "ShowCoverageHelp": true,
    "VisitAutoPay": null,
    "ShowVisitAutoPay": false,
    "LevelOfDetailLoaded": 2,
    "SelfBadDebtAmount": null,
    "SelfBadDebtAmountRaw": 0,
    "IsClosedHospitalAccount": false,
    "IsBadDebtHAR": false,
    "IsPaymentPlanEstimate": false,
    "IsResolvedEstimatedPPAccount": false,
    "NotOnPlanAmount": null,
    "NotOnPlanAmountRaw": 0,
    "EmptyVisitEstimateID": null,
    "EstimateInfo": null,
    "PatFriendlyAccountStatus": 2,
    "VisitBadDebtScenario": 0,
    "PatFriendlyAccountStatusAccessibleText": "Account status: Pending insurance",
    "VisitStatusesEqualToClosed": [
      8,
      9
    ],
    "IsOnPaymentPlan": false,
    "IsNotOnPaymentPlan": false
  }
],
    "NoBalanceVisitList": [],
    "AdjustmentVisitList": [],
    "AdjustmentVisitListAmount": "",
    "VisitAutoPayVisitList": [],
    "VisitAutoPayVisitListAmount": "",
    "UnifiedVisitList": [
      {
        "GroupType": 0,
        "Index": 0,
        "BillingSystem": 1,
        "IsSBO": true,
        "BillingSystemDisplay": "Physician Services",
        "AdjustmentsOnly": false,
        "DateRangeDisplay": null,
        "StartDate": 69000,
        "StartDayOfMonth": 10,
        "StartMonth": 3,
        "StartYear": 2023,
        "StartDateDisplay": "Mar 10, 2023",
        "StartDateAccessibleText": "March 10, 2023",
        "Description": "VIRTUAL ESTABLISHED Visit at Sample Medical Center",
        "Patient": "Patient: John Smith",
        "Provider": "Provider: Jane Doe, MD, MPH, MS",
        "ProviderId": null,
        "HospitalAccountDisplay": "Account #1234567890",
        "HospitalAccountId": "1234567890",
        "SupressDayFromDate": false,
        "CanAddToPaymentPlan": false,
        "PrimaryPayer": "Primary Payer: Sample Insurance",
        "IsLTCSeries": false,
        "ChargeAmount": "$100.00",
        "InsuranceAmountDue": "$0.00",
        "InsuranceAmountDueRaw": 0,
        "SelfAmountDue": "$0.00",
        "SelfAmountDueRaw": 0,
        "IsPatientNotResponsible": true,
        "PatientNotResponsibleYet": false,
        "InsurancePaymentAmount": "-$50.00",
        "InsuranceEstimatedPaymentAmount": null,
        "SelfPaymentAmount": "-$10.00",
        "SelfAdjustmentAmount": null,
        "SelfDiscountAmount": null,
        "ContestedChargeAmount": null,
        "ContestedPaymentAmount": null,
        "ShowInsuranceHelp": false,
        "SelfPaymentPlanAmountDue": null,
        "SelfPaymentPlanAmountDueRaw": 0,
        "IsExpanded": false,
        "BlockExpanding": false,
        "ProcedureList": [
          {
            "BillingSystem": 1,
            "Description": "Complex e/m visit add on - \u003cspan class=\u0027subtlecolor\u0027\u003eG2211 (HCPCS)\u003c/span\u003e",
            "Amount": "$25.00",
            "PaymentList": null,
            "InsuranceAmountDue": null,
            "SelfAmountDue": "$0.00",
            "HasAmountDue": false,
            "SelfBadDebtAmount": null,
            "HasBadDebtAmount": false,
            "AdjustmentsOnly": false,
            "IsContested": false
          },
          {
            "BillingSystem": 1,
            "Description": "Office Visit, Established Pat - \u003cspan class=\u0027subtlecolor\u0027\u003e99212 (CPT®)\u003c/span\u003e",
            "Amount": "$75.00",
            "PaymentList": null,
            "InsuranceAmountDue": null,
            "SelfAmountDue": "$0.00",
            "HasAmountDue": false,
            "SelfBadDebtAmount": null,
            "HasBadDebtAmount": false,
            "AdjustmentsOnly": false,
            "IsContested": false
          }
        ],
        "ProcedureGroupList": [
          {
            "VisitIndex": 0,
            "VisitGroupType": 0,
            "Description": null,
            "Amount": "$0.00",
            "ProcedureList": null,
            "PaymentList": [
              {
                "ID": null,
                "ElementID": null,
                "Index": null,
                "DayOfMonth": 0,
                "Month": 0,
                "Year": 0,
                "FormattedDateDisplay": null,
                "Description": "Sample Insurance",
                "SubText": null,
                "HtmlSubText": null,
                "PaymentAmountDisplay": "-$50.00",
                "UndistributedAmountDisplay": null,
                "CoverageInfo": null,
                "Receipt": null,
                "IsBadDebtAdj": false,
                "IsWriteOffAdj": false,
                "IsSurchargeAdj": false,
                "CanEdit": false,
                "EditPaymentOptions": null,
                "CanCancel": false,
                "CancelCommandOptions": null,
                "ConsentDocument": null,
                "ViewConsentOptions": null,
                "IsCardExpiringSoon": false,
                "HasCardExpired": false
              },
              {
                "ID": null,
                "ElementID": null,
                "Index": null,
                "DayOfMonth": 0,
                "Month": 0,
                "Year": 0,
                "FormattedDateDisplay": null,
                "Description": "Patient Payment - Mar 20, 2023",
                "SubText": null,
                "HtmlSubText": null,
                "PaymentAmountDisplay": "-$10.00",
                "UndistributedAmountDisplay": null,
                "CoverageInfo": null,
                "Receipt": null,
                "IsBadDebtAdj": false,
                "IsWriteOffAdj": false,
                "IsSurchargeAdj": false,
                "CanEdit": false,
                "EditPaymentOptions": null,
                "CanCancel": false,
                "CancelCommandOptions": null,
                "ConsentDocument": null,
                "ViewConsentOptions": null,
                "IsCardExpiringSoon": false,
                "HasCardExpired": false
              }
            ],
            "EstPlanPaymentList": [],
            "HasEstPlanList": false,
            "IsPaymentsOnly": true,
            "HasPaymentsTowardsEstimates": false,
            "HasContestedProcedures": false,
            "IsExpanded": true
          }
        ],
        "CoverageInfoList": [
          {
            "CoverageName": "Sample Insurance",
            "Billed": "$100.00",
            "Covered": "-$50.00",
            "PendingInsurance": null,
            "RemainingResponsibility": "$10.00",
            "Copay": "$10.00",
            "Deductible": null,
            "Coinsurance": null,
            "NotCovered": null,
            "Benefits": [
              {
                "Name": "Copay",
                "Amount": "$10.00"
              }
            ]
          }
        ],
        "ShowCoverageHelp": true,
        "VisitAutoPay": null,
        "ShowVisitAutoPay": false,
        "LevelOfDetailLoaded": 2,
        "SelfBadDebtAmount": null,
        "SelfBadDebtAmountRaw": 0,
        "IsClosedHospitalAccount": true,
        "IsBadDebtHAR": false,
        "IsPaymentPlanEstimate": false,
        "IsResolvedEstimatedPPAccount": false,
        "NotOnPlanAmount": null,
        "NotOnPlanAmountRaw": 0,
        "EmptyVisitEstimateID": null,
        "EstimateInfo": null,
        "PatFriendlyAccountStatus": 7,
        "VisitBadDebtScenario": 0,
        "PatFriendlyAccountStatusAccessibleText": "Account status: Paid off",
        "VisitStatusesEqualToClosed": [
          8,
          9
        ],
        "IsOnPaymentPlan": false,
        "IsNotOnPaymentPlan": false
      }
    ],
    "HasVisits": true,
    "ShowingAll": false,
    "HasUnconvertedPBVisits": false,
    "CanMakePayment": false,
    "CanEditPaymentPlan": false,
    "URLMakePayment": null,
    "URLEditPaymentPlan": null,
    "Filters": {
      "FilterClass": "col-9",
      "Options": [
        {
          "OptionClass": "col-3",
          "OptionLabel": "Active accounts"
        },
        {
          "OptionClass": "col-3",
          "OptionLabel": "Year to date"
        },
        {
          "OptionClass": "col-3",
          "OptionLabel": "Last year"
        },
        {
          "OptionClass": "col-3",
          "OptionLabel": "Date range"
        }
      ]
    },
    "PartialPaymentPlanAlert": {
      "Code": 0,
      "Banner": {
        "HeaderText": "",
        "DetailText": "Your current payment plan may not include all your balances listed below.",
        "AssistiveText": "",
        "ButtonLabel": "",
        "ButtonUrl": "",
        "ButtonID": null,
        "ButtonClass": null,
        "ButtonData": null,
        "TelephoneLink": null,
        "ButtonLabelSecondary": null,
        "ButtonUrlSecondary": null,
        "ButtonIDSecondary": null,
        "ButtonClassSecondary": null,
        "ButtonAriaDescribedByContentSecondary": null,
        "ButtonAriaDescribedByIdSecondary": null,
        "ButtonDataSecondary": null,
        "DisableDetailTextHtmlEncoding": false,
        "BannerType": "informationalType",
        "BannerTypeReact": "informational",
        "IconOverride": "",
        "IconAltTextOverride": null,
        "FontSize": 0
      }
    },
    "BillingSystem": 3
  }
}

  `)
}



export const bills_details_html_page: MockData = {
  path: ['/MyChartPRD/Billing/Details'],
  response: new Response(`
      accountDetailsController.Initialize({
                        "ID": "43434343",
                        "EncID": "WP-fdlkafjlsdajflsjlbXVjvrfdfsafdsfsklRTd2A-3D",
                        "EncCID": "",`
  )
}



// This should be the full HTML page of the test results page.
export const billing_page_section: MockData = {
  path: ['/MyChartPRD/Billing/Summary'],
  response: new Response(`
    <div>
        <div id="ba_card_SBO_12345678" class="col-6 card ba_card">
          <div class="grid compact">
            <div class="row fixed ba_card_header">
              <div class="ba_card_header_content col-12">
                <img
                  class="ba_saIcon"
                  alt=""
                  src="https://mychart.example.org/MyChart-PRD/PPGDocs/en-US/Images/example-icon-color.png"
                />
                <div class="ba_card_text_container">
                  <span class="ba_card_header_saLabel ba_card_header_saLabel_saName">
                    Example Health System
                  </span>
                </div>
                <p class="ba_card_header_account_billsys subtle"></p>
                <p class="ba_card_header_account_idAndType">
                  Guarantor #12345678 (John Doe)
                </p>
                <p class="ba_card_header_account_patients subtle">
                  Patients included: Sample Patient
                </p>
              </div>
            </div>
            <div class="ba_card_status row cardlist flex_to_height">
              <div class="center col-12 ba_card_status_column">
                <div>
                  <span class="ba_card_status_due_label">Amount Due</span>
                  <p class="money ba_card_status_due_amount moneyColor">$0.00</p>
                  <div class="ba_card_status_payLinks">
                    <p class="subtle ba_card_status_recentPaymentLabel">
                      <a
                        href="/MyChart-PRD/Billing/Details?ID=WP-XXXXXXX&Context=WP-XXXXXXX&tab=3"
                        title="View payment history"
                      >
                        Last paid: $45.00 on 2/05/2025
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="buttonList subtle noprint col-12">
                <a
                  class="ba_card_actions_link button"
                  href="/MyChart-PRD/Billing/Details?ID=WP-XXXXXXX&Context=WP-XXXXXXX"
                >
                  <svg focusable="false" aria-hidden="true">
                    <use xlink:href="/MyChart-PRD/en-US/images/library.svg#billingsummary_detailslink"></use>
                  </svg>
                  <span class="ba_card_actions_label">View account details</span>
                </a>
                <a
                  class="ba_card_actions_link button lastStatement"
                  href="#"
                  data-id="12345678"
                  data-billsys="3"
                >
                  <svg focusable="false" aria-hidden="true">
                    <use xlink:href="/MyChart-PRD/en-US/images/library.svg#billingsummary_statement"></use>
                  </svg>
                  <span class="ba_card_actions_label">
                    View last statement (2/02/2025)
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
        </div>
        `
  )
}
