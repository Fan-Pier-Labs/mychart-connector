

export type BillingAccount = {
  guarantorNumber: string;
  patientName: string;
  amountDue?: number;

  // Two IDs needed for scraping the detail page
  id?: string;
  context?: string;

  // Note: This is not on the schema from MyChart - it comes from a separate API call, but I'm just going to condense it all into this type.
  billingDetails?: BillingDetails

  // Statement list for PDF downloads
  statementList?: StatementListResponse;

  // Payment history (MyChart payments made by the patient)
  paymentList?: PaymentListResponse;

  // Encrypted billing ID needed for PDF downloads
  encBillingId?: string;
}


/**
 * Represents the top-level structure of the JSON.
 */
export interface BillingDetails {
  Success: boolean;
  Data: {
    UnifiedVisitList: BillingVisit[];
    InformationalVisitList: BillingVisit[];

    // Newly discovered fields
    HasVisits: boolean;
    ShowingAll: boolean;
    HasUnconvertedPBVisits: boolean;
    CanMakePayment: boolean;
    CanEditPaymentPlan: boolean;
    URLMakePayment: string | null;
    URLEditPaymentPlan: string | null;
    Filters: Filters;
    PartialPaymentPlanAlert: PartialPaymentPlanAlert;
    BillingSystem: number;
  };
}


/**
 * Break down any nested structures accordingly:
 */
export interface Filters {
  FilterClass: string;
  Options: FilterOption[];
}

export interface FilterOption {
  OptionClass: string;
  OptionLabel: string;
}

export interface PartialPaymentPlanAlert {
  Code: number;
  Banner: Banner;
}

export interface Banner {
  HeaderText: string;
  DetailText: string;
  AssistiveText: string;
  ButtonLabel: string;
  ButtonUrl: string;
  ButtonID: string | null;
  ButtonClass: string | null;
  ButtonData: string | null;
  TelephoneLink: string | null;
  ButtonLabelSecondary: string | null;
  ButtonUrlSecondary: string | null;
  ButtonIDSecondary: string | null;
  ButtonClassSecondary: string | null;
  ButtonAriaDescribedByContentSecondary: string | null;
  ButtonAriaDescribedByIdSecondary: string | null;
  ButtonDataSecondary: string | null;
  DisableDetailTextHtmlEncoding: boolean;
  BannerType: string;
  BannerTypeReact: string;
  IconOverride: string;
  IconAltTextOverride: string | null;
  FontSize: number;
}
export interface BillingVisit {
  GroupType: number;
  Index: number;
  BillingSystem: number;
  IsSBO: boolean;
  BillingSystemDisplay: string;
  AdjustmentsOnly: boolean;
  DateRangeDisplay: string | null;
  StartDate: number;
  StartDayOfMonth: number;
  StartMonth: number;
  StartYear: number;
  StartDateDisplay: string | null;
  StartDateAccessibleText: string | null;
  Description: string | null;
  Patient: string | null;
  Provider: string | null;
  ProviderId: string | null;
  HospitalAccountDisplay: string | null;
  HospitalAccountId: string | null;
  SupressDayFromDate: boolean;
  CanAddToPaymentPlan: boolean;
  PrimaryPayer: string | null;
  IsLTCSeries: boolean;
  ChargeAmount: string | null;
  InsuranceAmountDue: string | null;
  InsuranceAmountDueRaw: number;
  SelfAmountDue: string | null;
  SelfAmountDueRaw: number;
  IsPatientNotResponsible: boolean;
  PatientNotResponsibleYet: boolean;
  InsurancePaymentAmount: string | null;
  InsuranceEstimatedPaymentAmount: string | null;
  SelfPaymentAmount: string | null;
  SelfAdjustmentAmount: string | null;
  SelfDiscountAmount: string | null;
  ContestedChargeAmount: string | null;
  ContestedPaymentAmount: string | null;
  ShowInsuranceHelp: boolean;
  SelfPaymentPlanAmountDue: string | null;
  SelfPaymentPlanAmountDueRaw: number;
  IsExpanded: boolean;
  BlockExpanding: boolean;
  ProcedureList: Procedure[] | null;
  ProcedureGroupList: ProcedureGroup[];
  CoverageInfoList: CoverageInfo[] | null;
  ShowCoverageHelp: boolean;
  VisitAutoPay: VisitAutoPayInfo | null;
  ShowVisitAutoPay: boolean;
  LevelOfDetailLoaded: number;
  SelfBadDebtAmount: string | null;
  SelfBadDebtAmountRaw: number;
  IsClosedHospitalAccount: boolean;
  IsBadDebtHAR: boolean;
  IsPaymentPlanEstimate: boolean;
  IsResolvedEstimatedPPAccount: boolean;
  NotOnPlanAmount: string | null;
  NotOnPlanAmountRaw: number;
  EmptyVisitEstimateID: string | null;
  EstimateInfo: EstimateInfo | null;
  PatFriendlyAccountStatus: number;
  VisitBadDebtScenario: number;
  PatFriendlyAccountStatusAccessibleText: string;
  VisitStatusesEqualToClosed: number[];
  IsOnPaymentPlan: boolean;
  IsNotOnPaymentPlan: boolean;
}


export interface Procedure {
  BillingSystem: number;
  Description: string;
  Amount: string;
  PaymentList: Payment[] | null;
  InsuranceAmountDue: string | null;
  SelfAmountDue: string;
  HasAmountDue: boolean;
  SelfBadDebtAmount: string | null;
  HasBadDebtAmount: boolean;
  AdjustmentsOnly: boolean;
  IsContested: boolean;
}

export interface ProcedureGroup {
  VisitIndex: number;
  VisitGroupType: number;
  Description: string | null;
  Amount: string;
  ProcedureList: Procedure[] | null;
  PaymentList: Payment[];
  EstPlanPaymentList: Payment[];
  HasEstPlanList: boolean;
  IsPaymentsOnly: boolean;
  HasPaymentsTowardsEstimates: boolean;
  HasContestedProcedures: boolean;
  IsExpanded: boolean;
}

export interface CoverageInfo {
  CoverageName: string;
  Billed: string;
  Covered: string;
  PendingInsurance: string | null;
  RemainingResponsibility: string;
  Copay: string | null;
  Deductible: string;
  Coinsurance: string | null;
  NotCovered: string | null;
  Benefits: Benefit[];
}


export interface Benefit {
  Name: string;
  Amount: string;
}

/**
 * Root interface for the entire response
 */
export interface StatementListResponse {
  Success: boolean;
  DataStatement: DataDetailBill;
  DataDetailBill: DataDetailBill;
}

/**
 * Interface for detail-bill data
 */
export interface DataDetailBill {
  StatementList: StatementItem[];
  HasUnread: boolean;
  HasRead: boolean;
  ShowAll: boolean;
  IsPaperless: boolean;
  PaperlessStatus: number;
  ShowPaperlessSignup: boolean;
  ShowPaperlessCancel: boolean;
  URLPaperlessBilling: string | null;
  IsPaperlessAllowedForSA: boolean;
  IsDetailBillModel: boolean;
  noStatementsString: string;
  allReadString: string;
  loadMoreString: string;
}


export interface VisitAutoPayInfo {
  IsEnrolled: boolean;
  CanEnroll: boolean;
  PaymentMethodDisplay: string | null;
}

export interface EstimateInfo {
  EstimateID: string;
  EstimateAmount: string | null;
  EstimateStatus: number;
}

export interface EditPaymentOptions {
  PaymentID: string;
  CanEdit: boolean;
}

export interface CancelCommandOptions {
  PaymentID: string;
  CanCancel: boolean;
}

export interface ViewConsentOptions {
  ConsentDocumentID: string;
  CanView: boolean;
}

export interface Payment {
  ID: string | null;
  ElementID: string | null;
  Index: number | null;
  DayOfMonth: number;
  Month: number;
  Year: number;
  FormattedDateDisplay: string | null;
  Description: string;
  SubText: string | null;
  HtmlSubText: string | null;
  PaymentAmountDisplay: string;
  UndistributedAmountDisplay: string | null;
  CoverageInfo: CoverageInfo | null;
  Receipt: string | null;
  IsBadDebtAdj: boolean;
  IsWriteOffAdj: boolean;
  IsSurchargeAdj: boolean;
  CanEdit: boolean;
  EditPaymentOptions: EditPaymentOptions | null;
  CanCancel: boolean;
  CancelCommandOptions: CancelCommandOptions | null;
  ConsentDocument: string | null;
  ViewConsentOptions: ViewConsentOptions | null;
  IsCardExpiringSoon: boolean;
  HasCardExpired: boolean;
}


/**
 * Common interface for individual statements/bills
 */
export interface StatementItem {
  Show: boolean;
  Date: number;
  DayOfMonth: number;
  Month: number;
  Year: number;
  DateDisplay: string;
  FormattedDateDisplay: string;
  Description: string;
  LinkText: string;
  LinkDescription: string;
  IsRead: boolean;

  // this is the fileKey param on the PDF download call
  ImagePath: string;

  // this is the token param on the PDF download call
  Token: string;
  IsPaperless: boolean;
  PrintID: string;
  StatementAmountDisplay: string;
  IsEB: boolean;
  Format: number;
  IsDetailBill: boolean;
  BillingSystem: number;

  // this is the billSys param on the PDF download call
  EncBillingSystem: string;
  RecordID: string;
}

/**
 * Response from /Billing/Details/LoadPaymentList
 * Contains patient payment history (MyChart payments made through the portal)
 */
export interface PaymentListResponse {
  Success: boolean;
  Data: {
    PaymentList: Payment[];
    Filters: unknown;
  };
}
