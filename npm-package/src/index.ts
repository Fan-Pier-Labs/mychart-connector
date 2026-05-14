/**
 * mychart-cli — programmatic access to Epic MyChart patient portals.
 *
 * Two ways to use this package:
 *
 *   1. The high-level `MyChartClient` class. Owns the session, runs an
 *      auto-keepalive ping, and exposes one method per scraper. Most users
 *      should start here.
 *
 *   2. The raw scraper functions. Every scraper takes a `MyChartRequest` as
 *      its first argument and returns a typed Promise. Use these when the
 *      class wrapper doesn't fit your control flow.
 *
 * @see {@link MyChartClient} for the recommended ergonomic API.
 */

// ─── Core session ──────────────────────────────────────────────────────────
export {
  MyChartRequest,
  type MyChartRequestOptions,
} from '../../scrapers/myChart/myChartRequest';
export type { RequestConfig } from '../../scrapers/myChart/types';

// ─── Auth / login / 2FA / passkeys ─────────────────────────────────────────
export {
  myChartUserPassLogin,
  myChartPasskeyLogin,
  complete2faFlow,
  areCookiesValid,
  parse2faDeliveryMethods,
  type LoginResult,
  type TwoFaResult,
  type TwoFaDeliveryInfo,
} from '../../scrapers/myChart/login';

export { generateTotpCode, parseTotpUri } from '../../scrapers/myChart/totp';
export {
  setupTotp,
  disableTotp,
  type SetupTotpResult,
} from '../../scrapers/myChart/setupTotp';
export {
  setupPasskey,
  listPasskeys,
  deletePasskey,
} from '../../scrapers/myChart/setupPasskey';
export {
  serializeCredential,
  deserializeCredential,
  type PasskeyCredential,
} from '../../scrapers/myChart/softwareAuthenticator';

// ─── Profile ──────────────────────────────────────────────────────────────
export {
  getMyChartProfile,
  getEmail,
  type ProfileData,
} from '../../scrapers/myChart/profile';

// ─── Health summary / vitals ──────────────────────────────────────────────
export {
  getHealthSummary,
  type HealthSummary,
} from '../../scrapers/myChart/healthSummary';
export {
  getVitals,
  type Flowsheet,
  type VitalReading,
} from '../../scrapers/myChart/vitals';

// ─── Medications ──────────────────────────────────────────────────────────
export {
  getMedications,
  type MedicationsResult,
  type Medication,
  type Pharmacy,
} from '../../scrapers/myChart/medications';
export {
  requestMedicationRefill,
  type RefillRequestResult,
} from '../../scrapers/myChart/medicationRefill';

// ─── Allergies / health issues / history / immunizations ──────────────────
export {
  getAllergies,
  type AllergiesResult,
  type Allergy,
} from '../../scrapers/myChart/allergies';
export {
  getHealthIssues,
  type HealthIssue,
} from '../../scrapers/myChart/healthIssues';
export {
  getMedicalHistory,
  type MedicalHistoryResult,
  type Diagnosis,
  type Surgery,
  type FamilyMember,
} from '../../scrapers/myChart/medicalHistory';
export {
  getImmunizations,
  type Immunization,
} from '../../scrapers/myChart/immunizations';

// ─── Labs / imaging ───────────────────────────────────────────────────────
export {
  listLabResults,
  getImagingResults,
} from '../../scrapers/myChart/labs_and_procedure_results/labResults';
export {
  downloadImagingStudyDirect,
  type DirectDownloadResult,
  type DirectDownloadedImage,
  type DirectDownloadOptions,
  type SeriesInfo,
} from '../../scrapers/myChart/eunity/imagingDirectDownload';

// ─── CLO image conversion ────────────────────────────────────────────────
// Turn raw CLO bytes from `downloadImagingStudyDirect` into JPEG / PNG /
// AVIF / TIFF / WebP. Goes through an intermediate 16-bit Bitmap so callers
// can apply their own VOI LUT / windowing before encoding if they want.
export {
  convertCloToJpg,
  convertCloToBitmap,
  convertCloToBitmap16,
  convertBitmapToJpg,
  convertBitmapToWebp,
  convertBitmap16ToJpg,
  convertBitmap16ToPng,
  convertBitmap16ToAvif,
  convertBitmap16ToTiff,
  convertBitmap16ToWebp,
  parseWrapper,
  applyVoiLut,
  to8bit,
  to16bit,
  type Bitmap,
  type Bitmap16,
  type CloMetadata,
  type JpgOptions,
  type PngOptions,
  type AvifOptions,
  type TiffOptions,
} from '../../scrapers/myChart/clo-image-parser/clo_to_jpg';

// ─── Visits ───────────────────────────────────────────────────────────────
export { upcomingVisits, pastVisits } from '../../scrapers/myChart/visits/visits';

// ─── Messages ─────────────────────────────────────────────────────────────
export {
  listConversations,
  type ConversationListResponse,
} from '../../scrapers/myChart/messages/conversations';
export {
  getConversationMessages,
  type ConversationThread,
  type ThreadMessage,
} from '../../scrapers/myChart/messages/messageThreads';
export {
  sendNewMessage,
  getMessageRecipients,
  getMessageTopics,
  getVerificationToken,
  type MessageRecipient,
  type MessageTopic,
  type SendNewMessageParams,
  type SendNewMessageResult,
} from '../../scrapers/myChart/messages/sendMessage';
export {
  sendReply,
  type SendReplyParams,
  type SendReplyResult,
} from '../../scrapers/myChart/messages/sendReply';
export {
  deleteMessage,
  type DeleteMessageResult,
} from '../../scrapers/myChart/messages/deleteMessage';

// ─── Bills ────────────────────────────────────────────────────────────────
export { getBillingHistory } from '../../scrapers/myChart/bills/bills';

// ─── Care coordination ───────────────────────────────────────────────────
export {
  getCareTeam,
  type CareTeamMember,
} from '../../scrapers/myChart/careTeam';
export {
  getReferrals,
  type Referral,
} from '../../scrapers/myChart/referrals';
export {
  getInsurance,
  type InsuranceCoverage,
  type InsuranceResult,
} from '../../scrapers/myChart/insurance';
export {
  getDocuments,
  type Document,
} from '../../scrapers/myChart/documents';
export {
  getGoals,
  type Goal,
  type GoalsResult,
} from '../../scrapers/myChart/goals';
export {
  getCareJourneys,
  type CareJourney,
} from '../../scrapers/myChart/careJourneys';
export {
  getUpcomingOrders,
  type UpcomingOrder,
} from '../../scrapers/myChart/upcomingOrders';
export {
  getPreventiveCare,
  type PreventiveCareItem,
} from '../../scrapers/myChart/preventiveCare';
export {
  getEducationMaterials,
  type EducationMaterial,
} from '../../scrapers/myChart/educationMaterials';
export {
  getQuestionnaires,
  type Questionnaire,
} from '../../scrapers/myChart/questionnaires';
export {
  getActivityFeed,
  type ActivityFeedItem,
} from '../../scrapers/myChart/activityFeed';
export {
  getLetters,
  getLetterDetails,
  type Letter,
  type LetterDetailsResponse,
} from '../../scrapers/myChart/letters';

// ─── Emergency contacts ──────────────────────────────────────────────────
export {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  removeEmergencyContact,
  type EmergencyContact,
  type EmergencyContactInput,
  type EmergencyContactUpdateInput,
  type EmergencyContactResult,
} from '../../scrapers/myChart/emergencyContacts';

// ─── Linked accounts / EHI export ────────────────────────────────────────
export {
  getLinkedMyChartAccounts,
  type LinkedMyChart,
} from '../../scrapers/myChart/other_mycharts/other_mycharts';
export {
  getEhiExportTemplates,
  type EhiTemplate,
} from '../../scrapers/myChart/ehiExport';

// ─── High-level client ───────────────────────────────────────────────────
export {
  MyChartClient,
  type MyChartClientOptions,
  type ConnectArgs,
  type ConnectResult,
  type PendingTwoFa,
} from './client';
