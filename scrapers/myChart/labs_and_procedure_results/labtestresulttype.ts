export interface LabTestResult {
  orderName: string
  key: string
  results: LabResult[]
  orderLimitReached: boolean
  ordersDeduplicated: boolean
  isEnhancedAskAQuestionActive?: boolean
  hideEncInfo: boolean
}

export interface LabResult {
  name: string
  key: string
  showName: boolean
  showDetails: boolean
  orderMetadata: OrderMetadata
  resultComponents: ResultComponent[]
  studyResult: StudyResult
  shouldHideHistoricalData: boolean
  resultNote: ResultNote
  reportDetails: ReportDetails
  scans: Scan[]
  imageStudies: ImageStudy[]
  indicators: unknown[]
  geneticProfileLink: string
  shareEverywhereLogin: boolean
  showProviderNotReviewed: boolean
  providerComments: unknown[]
  resultLetter: ResultLetter
  warningType: string
  warningMessage: string
  variants: unknown[]
  tooManyVariants: boolean
  hasComment: boolean
  hasAllDetails: boolean
  isAbnormal: boolean
  hiddenProxies?: string
  baseSingleMessageUrl?: string
  fullMultipleMessagesUrl?: string
  relatedConversationIds?: string[]
}

export interface OrderMetadata {
  orderProviderName: string
  authorizingProviderName?: string
  unreadCommentingProviderName: string
  readingProviderName?: string
  resultTimestampDisplay: string
  prioritizedInstantISO?: string
  prioritizedInstantDisplay?: string
  latestUpdateInstantISO?: string
  collectionTimestampsDisplay: string
  specimensDisplay: string
  resultStatus: string
  resultingLab: ResultingLab
  resultType: number
  read: number
  associatedDiagnoses?: string[]
}

export interface ResultingLab {
  name: string
  address: string[]
  phoneNumber: string
  labDirector: string
  cliaNumber: string
}

export interface ResultComponent {
  componentInfo: ComponentInfo
  componentResultInfo: ComponentResultInfo
  componentComments: ComponentComments
}

export interface ComponentInfo {
  componentID: string
  name: string
  commonName: string
  units: string
}

export interface ComponentResultInfo {
  value: string
  isValueRtf: boolean
  numericValue?: number
  referenceRange: ReferenceRange
  abnormalFlagCategoryValue: string | number
}

export interface ReferenceRange {
  low?: number
  high?: number
  displayLow: string
  displayHigh: string
  formattedReferenceRange: string
}

export interface ComponentComments {
  isRTF: boolean
  hasContent: boolean
  contentAsString: string
  contentAsHtml: string
}

export interface Scan {
  scanId: string;
  scanType: string;
  scanDate: string;
  viewerUrl: string;
}

export interface ImageStudy {
  studyId: string;
  studyDescription: string;
  studyDate: string;
  modality: string;
  viewerUrl: string;
  numberOfImages: number;
}

export interface Addendum {
  isRTF: boolean;
  hasContent: boolean;
  contentAsString: string;
  contentAsHtml: string;
  signingInstantTimestamp: string;
}

export interface StudyResult {
  narrative: Narrative
  impression: Impression
  combinedRTFNarrativeImpression: CombinedRtfnarrativeImpression
  addenda: Addendum[]
  isFullResultText?: boolean
  isCupidAddendum?: boolean
  transcriptions: unknown[]
  ecgDiagnosis: unknown[]
  hasStudyContent: boolean
}

export interface Narrative {
  isRTF: boolean
  hasContent: boolean
  contentAsString: string
  contentAsHtml: string
  signingInstantTimestamp: string
}

export interface Impression {
  isRTF: boolean
  hasContent: boolean
  contentAsString: string
  contentAsHtml: string
  signingInstantTimestamp: string
}

export interface CombinedRtfnarrativeImpression {
  isRTF: boolean
  hasContent: boolean
  contentAsString: string
  contentAsHtml: string
  signingInstantTimestamp: string
}

export interface ResultNote {
  isRTF: boolean
  hasContent: boolean
  contentAsString: string
  contentAsHtml: string
  signingInstantTimestamp: string
}

// This comes from a different API.
export type ReportContent = {
  reportContent: string;
  reportCss: string;
}

export interface ReportDetails {
  isDownloadablePDFReport: boolean
  reportID: string
  openRemotely: boolean
  reportContext: string
  reportVars: ReportVars

  // I added this one. No need to keep it separate (in mychart there's a separate api that is called that returns this data)
  reportContent?: ReportContent
}

export interface ReportVars {
  ordId: string
  ordDat: string
}

export interface ResultLetter {
  isRTF: boolean
  hasContent: boolean
  contentAsString: string
  contentAsHtml: string
  signingInstantTimestamp: string
}

// Historical result types (from /api/past-results/GetMultipleHistoricalResultComponents)
export interface HistoricalResultsResponse {
  historicalResults: Record<string, HistoricalComponentResult>
  orderedComponentIDs: string[]
  reportID: string
  shouldShowBedsideActiveView: boolean
}

export interface HistoricalComponentResult {
  componentID: string
  name: string
  commonName: string
  units: string
  oldestResultISO: string
  hideGraph: boolean
  showAbnormalFlag: boolean
  historicalResultData: HistoricalResultDataPoint[]
}

export interface HistoricalResultDataPoint {
  value: string
  isValueRtf: boolean
  numericValue?: number
  referenceRange: ReferenceRange
  abnormalFlagCategoryValue: string | number
  dateISO: string
}

// Extended lab result that includes historical trend data
export interface LabTestResultWithHistory extends LabTestResult {
  historicalResults?: HistoricalResultsResponse
}

export interface ImagingSeriesInfo {
  studyDescription: string;
  modality: string;
  numberOfImages: number;
}

export interface ImagingResult extends LabTestResult {
  /** FDI context extracted from report HTML (fdi + ord params for image viewer) */
  fdiContext?: { fdi: string; ord: string } | null;
  /** SAML URL that opens the eUnity image viewer (single-use, expires quickly) */
  samlUrl?: string;
  /** The eUnity viewer URL (only if SAML chain was followed) */
  viewerUrl?: string;
  /** Report text extracted from narrative + impression */
  reportText?: string;
  /** Series info extracted from imageStudies (description, modality, image count) */
  series?: ImagingSeriesInfo[];
}
