# API reference

Full method-level reference for the `mychart-cli` package. For the
high-level "how do I use this" guide, see [README.md](./README.md).

All shapes are TypeScript-first; importing from `mychart-cli` gives
you full `.d.ts` autocomplete. The reference below is grouped by domain.

## `MyChartClient` — high-level wrapper

The class owns a session, runs an auto-keepalive ping every 30s
(matching the official MyChart client), and exposes one method per
scraper. Construct it via one of three factories.

### Construction

```ts
class MyChartClient {
  static connect(args: ConnectArgs): Promise<ConnectResult>;
  static connectWithPasskey(args: MyChartClientOptions & { credential: PasskeyCredential }): Promise<ConnectResult>;
  static fromSerialized(json: string, opts?: { fetchFn?, keepalive?: boolean }): Promise<MyChartClient | null>;
  static totpCode(secret: string): Promise<string>;
}

interface MyChartClientOptions {
  hostname: string;
  protocol?: 'http' | 'https';                                    // default: 'https' (auto-'http' for hosts without a dot)
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
  keepalive?: boolean;                                            // default: true
}

interface ConnectArgs extends MyChartClientOptions {
  user: string;
  pass: string;
  skipSendCode?: boolean;
}

type ConnectResult =
  | { state: 'connected'; client: MyChartClient }
  | { state: 'need_2fa'; delivery?: TwoFaDeliveryInfo; sentAt?: number; complete(code: string, opts?: { isTOTP?: boolean }): Promise<MyChartClient> }
  | { state: 'invalid_login' | 'error'; error?: string };
```

### Session

| Method | Returns | Notes |
| --- | --- | --- |
| `client.serialize()` | `Promise<string>` | JSON blob — pair with `MyChartClient.fromSerialized(json)`. |
| `client.isSessionValid()` | `Promise<boolean>` | Cheap server-side check (fires `/Home/KeepAlive`). |
| `client.close()` | `void` | Stops the keepalive timer. After close, methods throw. Idempotent. |
| `client.request` | `MyChartRequest` | The underlying request object. Public for power users. |

### Profile / contact

| Method | Returns |
| --- | --- |
| `client.getProfile()` | `Promise<ProfileData \| null>` — `{ name, dob, mrn, pcp, email? }` |
| `client.getEmail()` | `Promise<string \| null>` — secure email on file |

### Health summary

| Method | Returns |
| --- | --- |
| `client.getHealthSummary()` | `Promise<HealthSummary>` — flowsheets + summary tables |
| `client.getVitals()` | `Promise<Flowsheet[]>` — height, weight, BP, etc. (latest readings + history) |
| `client.getAllergies()` | `Promise<AllergiesResult>` — `{ allergies: Allergy[], lastUpdated, ... }` |
| `client.getHealthIssues()` | `Promise<HealthIssue[]>` — current diagnoses |
| `client.getMedicalHistory()` | `Promise<MedicalHistoryResult>` — surgeries + family history + diagnoses |
| `client.getImmunizations()` | `Promise<Immunization[]>` |

### Medications

| Method | Returns |
| --- | --- |
| `client.getMedications()` | `Promise<MedicationsResult>` — `{ medications: Medication[], pharmacies: Pharmacy[] }` |
| `client.requestMedicationRefill(medicationKey)` | `Promise<RefillRequestResult>` — `medicationKey` from `Medication.key` |

### Labs / imaging

| Method | Returns |
| --- | --- |
| `client.listLabResults()` | `Promise<LabTestResultWithHistory[]>` — every lab test result + historical components |
| `client.getImagingResults({ followSaml? })` | `Promise<ImagingResult[]>` — imaging studies. With `followSaml: true` resolves the eUnity SAML chain to populate `fdiContext`. |
| `client.downloadImagingStudy(fdiContext, studyName, outputDir, opts?)` | `Promise<DirectDownloadResult>` — downloads CLO image bytes via eUnity. Pass `{ skipFileWrite: true }` to keep results in-memory. |

The CLO bytes returned by `downloadImagingStudy` can be turned into JPEGs
via the **CLO image conversion** functions below.

### CLO image conversion

```ts
import { convertCloToJpg, convertCloToBitmap16 } from 'mychart-cli';
```

| Function | Signature |
| --- | --- |
| `convertCloToJpg({ pixelData, wrapperData?, outputPath? })` | `Promise<Buffer \| string>` — high-level. Returns JPEG bytes; if `outputPath` ends in `.webp`, returns WebP. |
| `convertCloToBitmap(pixelInput, wrapperInput?)` | `Bitmap` — 8-bit raw pixels (1 channel). |
| `convertCloToBitmap16(pixelInput, wrapperInput?)` | `Bitmap16` — 16-bit raw pixels with VOI LUT applied. |
| `convertBitmap16ToJpg(b, opts?, outputPath?)` | `Promise<Buffer>` — JPEG. |
| `convertBitmap16ToPng(b, opts?, outputPath?)` | `Promise<Buffer>` — PNG (16-bit grayscale supported). |
| `convertBitmap16ToAvif(b, opts?, outputPath?)` | `Promise<Buffer>` — AVIF (8-bit only with prebuilt sharp). |
| `convertBitmap16ToTiff(b, opts?, outputPath?)` | `Promise<Buffer>` — TIFF. |
| `convertBitmap16ToWebp(b, outputPath?)` | `Promise<Buffer>` — lossless WebP. |
| `convertBitmapToJpg(b, outputPath?)` | `Promise<Buffer>` — 8-bit Bitmap → JPEG (legacy compat). |
| `convertBitmapToWebp(b, outputPath?)` | `Promise<Buffer>` — 8-bit Bitmap → lossless WebP. |
| `parseWrapper(input)` | `CloMetadata` — DICOM-ish metadata embedded in the wrapper file. |
| `applyVoiLut(img16, h, w, metadata)` | `Uint16Array` — apply VOI LUT / window-level for medical-grade rendering. |
| `to8bit(img, invert)` | `Uint8Array` — clip 16-bit to 8-bit. |
| `to16bit(img, invert)` | `Uint16Array` — re-pack 16-bit. |

### Visits

| Method | Returns |
| --- | --- |
| `client.upcomingVisits()` | `Promise<VisitListContainer \| { visits: never[]; error: string }>` |
| `client.pastVisits(oldestRenderedDate: Date)` | `Promise<PastVisitsContainer \| { visits: never[]; error: string }>` |

### Messages

| Method | Returns |
| --- | --- |
| `client.listConversations()` | `Promise<ConversationListResponse \| null>` |
| `client.getConversationMessages(conversationId)` | `Promise<ConversationThread>` |
| `client.sendMessage(params: SendNewMessageParams)` | `Promise<SendNewMessageResult>` |
| `client.sendReply(params: SendReplyParams)` | `Promise<SendReplyResult>` |
| `client.deleteMessage(conversationId)` | `Promise<DeleteMessageResult>` |
| `client.getMessageRecipients(token)` | `Promise<MessageRecipient[]>` — `token` from `getVerificationToken(req)`. |
| `client.getMessageTopics(token)` | `Promise<MessageTopic[]>` |

`SendNewMessageParams` shape:

```ts
{
  recipientId: string;       // from getMessageRecipients
  topicId: string;           // from getMessageTopics
  subject: string;
  body: string;
  organizationId?: string;
}
```

### Bills

| Method | Returns |
| --- | --- |
| `client.getBillingHistory()` | `Promise<BillingAccount[]>` — every billing account + statements/payments |

### Care coordination

| Method | Returns |
| --- | --- |
| `client.getCareTeam()` | `Promise<CareTeamMember[]>` |
| `client.getReferrals()` | `Promise<Referral[]>` |
| `client.getInsurance()` | `Promise<InsuranceResult>` — `{ coverages: InsuranceCoverage[], lastUpdated }` |
| `client.getDocuments()` | `Promise<Document[]>` |
| `client.getGoals()` | `Promise<GoalsResult>` |
| `client.getCareJourneys()` | `Promise<CareJourney[]>` |
| `client.getUpcomingOrders()` | `Promise<UpcomingOrder[]>` |
| `client.getPreventiveCare()` | `Promise<PreventiveCareItem[]>` |
| `client.getEducationMaterials()` | `Promise<EducationMaterial[]>` |
| `client.getQuestionnaires()` | `Promise<Questionnaire[]>` |
| `client.getActivityFeed()` | `Promise<ActivityFeedItem[]>` |
| `client.getLetters()` | `Promise<Letter[]>` |
| `client.getLetterDetails(hnoId, csn)` | `Promise<LetterDetailsResponse>` |

### Emergency contacts

| Method | Returns |
| --- | --- |
| `client.getEmergencyContacts()` | `Promise<EmergencyContact[]>` |
| `client.addEmergencyContact(input: EmergencyContactInput)` | `Promise<EmergencyContactResult>` |
| `client.updateEmergencyContact(input: EmergencyContactUpdateInput)` | `Promise<EmergencyContactResult>` |
| `client.removeEmergencyContact(id)` | `Promise<EmergencyContactResult>` |

### Other accounts / EHI export

| Method | Returns |
| --- | --- |
| `client.getLinkedMyChartAccounts()` | `Promise<LinkedMyChart[]>` — accounts at other MyChart instances linked to this one |
| `client.getEhiExportTemplates()` | `Promise<EhiTemplate[]>` |

## Lower-level: passkey lifecycle

Most users only need `connectWithPasskey`. If you want to manage passkeys
programmatically (audit, revoke, register without the CLI), use these
raw functions, which take a logged-in `MyChartRequest` as their first
argument:

```ts
import {
  setupPasskey,        // (req) => Promise<PasskeyCredential | null>   — register a new passkey on the account
  listPasskeys,        // (req) => Promise<unknown[] | null>           — audit what's currently registered
  deletePasskey,       // (req, rawId: string) => Promise<boolean>     — revoke one by rawId
  serializeCredential, // (cred) => string                             — JSON-serialize for persistence
  deserializeCredential, // (json) => PasskeyCredential
} from 'mychart-cli';

// `req` comes from any successful login — e.g. `client.request` or the
// `mychartRequest` field on a `LoginResult`.
const cred = await setupPasskey(client.request);
await fs.writeFile('passkey.json', serializeCredential(cred!));
```

## Lower-level: TOTP lifecycle

```ts
import {
  setupTotp,        // (req, password: string) => Promise<SetupTotpResult>     — enroll, returns secret + QR + backup codes
  disableTotp,      // (req, password: string, totpSecret: string) => Promise<boolean>
  generateTotpCode, // (secret: string, timestamp?: number) => Promise<string> — derive a 6-digit code locally
  parseTotpUri,     // (uri) => { secret, issuer, account }
} from 'mychart-cli';
```

## Lower-level: raw scraper functions

If the class doesn't fit your control flow, every scraper is also
exported as a plain function whose first argument is a `MyChartRequest`:

```ts
import {
  myChartUserPassLogin,
  myChartPasskeyLogin,
  complete2faFlow,
  areCookiesValid,
  parse2faDeliveryMethods,
  getMyChartProfile, getEmail, getHealthSummary, getVitals,
  getMedications, requestMedicationRefill,
  getAllergies, getHealthIssues, getMedicalHistory, getImmunizations,
  listLabResults, getImagingResults, downloadImagingStudyDirect,
  upcomingVisits, pastVisits,
  listConversations, getConversationMessages,
  sendNewMessage, sendReply, deleteMessage,
  getMessageRecipients, getMessageTopics, getVerificationToken,
  getBillingHistory,
  getCareTeam, getReferrals, getInsurance, getDocuments,
  getGoals, getCareJourneys, getUpcomingOrders, getPreventiveCare,
  getEducationMaterials, getQuestionnaires, getActivityFeed,
  getLetters, getLetterDetails,
  getEmergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact,
  getLinkedMyChartAccounts, getEhiExportTemplates,
  MyChartRequest,
} from 'mychart-cli';

const result = await myChartUserPassLogin({ hostname, user, pass });
if (result.state === 'logged_in') {
  const meds = await getMedications(result.mychartRequest);
}
```

Login result shape:

```ts
type LoginResult = {
  state: 'logged_in' | 'need_2fa' | 'invalid_login' | 'error';
  error?: string;
  mychartRequest: MyChartRequest;
  twoFaSentTime?: number;
  twoFaDelivery?: { method: 'email' | 'sms'; contact?: string };
};
```

`complete2faFlow({ mychartRequest, code, isTOTP? })` finishes the 2FA
step and returns `{ state: 'logged_in' | 'invalid_2fa' | 'error', mychartRequest }`.
