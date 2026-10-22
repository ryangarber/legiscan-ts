import { z } from "zod";
import {
  BillType,
  EventType,
  Mime,
  Party,
  Progress,
  Role,
  SastType,
  SponsorType,
  State,
  SupplementType,
  TextType,
  Vote,
  zNames,
  zNumbers
} from "../enums.ts";

export const _zSession = z.object({
  session_id: z.number().describe("Internal session id"),
  session_name: z.string().describe("State specific session name"),
  session_title: z
    .string()
    .describe("Normalized session title with year(s) and Regular/Nth Special Session"),
  session_tag: z.unknown(), // undocumented

  state: zNames(State).describe("Normalized state"),
  state_id: zNumbers(State).describe("Internal state id"),

  year_start: z.number().describe("Starting year of session"),
  year_end: z.number().describe("Ending year of session"),

  special: z.boolean().describe("Flag for being a special session"),
  prefile: z.boolean().describe("Flag for session being in prefile"),
  prior: z.boolean().describe("Flag for session being archived"),
  sine_die: z.boolean().describe("Flag for session being adjourned sine die")
});
export type _zSession = z.infer<typeof _zSession>;

export const zGetSessionList = z.array(
  _zSession.extend({
    session_hash: z.hash("md5").nullable().describe("Hash of session data, used for caching"),
    dataset_hash: z.hash("md5").nullable().describe("Hash of entire dataset, used for caching")
  })
);
export type zGetSessionList = z.infer<typeof zGetSessionList>;

export const _zBillText = z.object({
  doc_id: z.number().describe("Internal document id"),
  bill_id: z.number().optional().describe("Internal bill id"),
  type: zNames(TextType).describe("Type of draft text"),
  type_id: zNumbers(TextType).describe("Internal text type id"),
  type_raw: z.string().describe("Internal text type name"),
  date: z.iso.date().describe("Document date (if available)"),
  url: z.url().describe("URL of document on legiscan.com"),
  state_link: z.url().describe("URL of document on state website"),

  mime: zNames(Mime).describe("Normalized file type, e.g. 'PDF'"),
  mime_id: zNumbers(Mime).describe("Internal file type id"),
  mime_raw: z.string().describe("Raw MIME type of the document, e.g. 'application/pdf'"),
  text_size: z
    .number()
    .describe("Size in bytes of the decoded BASE64 document (add 33% for base64)"),
  text_hash: z.hash("md5").describe("MD5 hash of the decoded BASE64 document"),

  alt_doc_id: z.number().nullable().describe("Internal alternate bill text id"),
  alt_mime: zNames(Mime)
    .nullable()
    .describe("Normalized file type of alternate document, e.g. 'PDF'"),
  alt_mime_id: zNumbers(Mime).nullable().describe("Internal file type id of alternate document"),
  alt_mime_raw: z
    .string()
    .nullable()
    .describe("Raw MIME type of the alternate document, e.g. 'application/pdf'"),
  alt_state_link: z.url().nullable().describe("URL of alternate document on state website"),
  alt_text_size: z
    .number()
    .nullable()
    .describe("Size in bytes of the decoded BASE64 alternate document (add 33% for base64)"),
  alt_text_hash: z
    .hash("md5")
    .nullable()
    .describe("MD5 hash of the decoded BASE64 alternate document")
});
export type _zBilLText = z.infer<typeof _zBillText>;

export const zGetBillText = _zBillText.extend({
  doc: z.base64().describe("BASE64 encoded document"),
  alt_doc: z.unknown() // undocumented
});
export type zGetBillText = z.infer<typeof zGetBillText>;

export const _zCommittee = z.object({
  committee_id: z.number().describe("Internal committee id"),
  chamber_raw: z.string().describe("Internal chamber name, e.g. 'S' or 'H'"),
  chamber_id: z.number().describe("Internal chamber id"),
  name: z.string().describe("Committee name")
});
export type _zCommittee = z.infer<typeof _zCommittee>;

export const _zCommitteeReferral = z.intersection(
  _zCommittee,
  z.object({ date: z.iso.date().describe("Date of referral") })
);
export type _zCommitteeReferral = z.infer<typeof _zCommitteeReferral>;

export const _zBillProgress = z.object({
  date: z.iso.date().describe("Date of progress event"),
  event: zNames(Progress).describe("Normalized progress event"),
  event_id: zNumbers(Progress).describe("Internal progress event id")
});
export type _zBillProgress = z.infer<typeof _zBillProgress>;

export const _zBillHistory = z.object({
  date: z.iso.date().describe("Date of action"),
  action: z.string().describe("Description of action taken"),
  chamber_raw: z.string().nullable().describe("Internal chamber name"),
  chamber_id: z.number().nullable().describe("Internal chamber id"),
  importance: z.boolean().describe("Flag for major steps (i.e. those included in progress list)")
});
export type _zBillHistory = z.infer<typeof _zBillHistory>;

export const _zPerson = z.object({
  people_id: z.number().describe("Internal person id"),
  person_hash: z.string().describe("Hash of the person's details, used for caching"),
  party: zNames(Party).describe("Normalized party, e.g. 'Democrat' or 'Republican'"),
  party_id: zNumbers(Party).describe("Internal party id"),
  party_raw: z.string().describe("Internal party name"),
  state: zNames(State).describe("Normalized state"),
  state_id: zNumbers(State).describe("Internal state id"),
  role: zNames(Role).describe("Normalized role, e.g. 'Senator' or 'Representative'"),
  role_id: zNumbers(Role).describe("Internal role id"),
  role_raw: z.string().describe("Internal role name"),
  name: z.string().describe("Person's full name"),
  first_name: z.string().describe("Person's first name"),
  middle_name: z.string().nullable().describe("Person's middle name"),
  last_name: z.string().describe("Person's last name"),
  suffix: z.string().nullable().describe("Person's suffix"),
  nickname: z.string().nullable().describe("Person's nickname"),
  district: z.string().describe("Person's district"),
  ftm_eid: z.number().nullable().describe("FollowTheMoney ID of the person"),
  votesmart_id: z.number().nullable().describe("Votesmart ID of the person"),
  opensecrets_id: z.number().nullable().describe("OpenSecrets ID of the person"),
  knowwho_pid: z.number().nullable().describe("KnowWho PID of the person"),
  ballotpedia: z.string().nullable().describe("Ballotpedia ID of the person"),
  bioguide_id: z.string().nullable().describe("Bioguide ID of the person"),

  committee_sponsor: z.boolean().describe("Flag for committee sponsorship"),
  committee_id: z.number().nullable().describe("Internal committee id"),
  state_federal: z.unknown(), // undocumented
  bio: z.unknown() // undocumented
});
export type _zPerson = z.infer<typeof _zPerson>;

export const zGetPerson = _zPerson;
export type zGetPerson = z.infer<typeof zGetPerson>;

export const _zSast = z.object({
  type: zNames(SastType).describe("Normalized sast type"),
  type_id: zNumbers(SastType).describe("Internal sast id"),
  type_raw: z.string().describe("Internal sast type name"),
  sast_bill_number: z.string().describe("Bill number of the sast, e.g. HB 1234"),
  sast_bill_id: z.number().describe("Internal bill id of the sast")
});
export type _zSast = z.infer<typeof _zSast>;

export const _zSubject = z.object({
  subject_id: z.number().describe("Internal subject id"),
  subject_name: z.string().describe("Name of the subject")
});
export type _zSubject = z.infer<typeof _zSubject>;

export const _zVote = z.object({
  roll_call_id: z.number().describe("Internal roll call id"),
  date: z.iso.date().describe("Date of the vote"),
  description: z.string().describe("Description of the vote"),
  yea: z.number().describe("Number of votes for the bill"),
  nay: z.number().describe("Number of votes against the bill"),
  abstain: z.number().describe("Number of votes that abstained"),
  absent: z.number().describe("Number of votes that were absent"),
  total: z.number().describe("Total number of votes"),
  passed: z.boolean().describe("Flag for whether the vote passed"),
  chamber_id: z.number().describe("Internal chamber id"),
  chamber_raw: z.string().describe("Internal chamber name, e.g. 'S' or 'H'")
});
export type _zVote = z.infer<typeof _zVote>;

export const _zAmendment = z.object({
  amendment_id: z.number().describe("Internal amendment id"),
  adopted: z.boolean().describe("Flag for whether the amendment was adopted"),
  chamber_id: z.number().describe("Internal chamber id"),
  chamber_raw: z.string().describe("Internal chamber name, e.g. 'S' or 'H'"),
  date: z.iso.date().nullable().describe("Date of the amendment"),
  title: z.string().describe("Official amendment title"),
  description: z.string().describe("Official amendment description"),
  mime: zNames(Mime).describe("Normalized file type, e.g. 'PDF'"),
  mime_id: zNumbers(Mime).describe("Internal file type id"),
  mime_raw: z.string().describe("Raw MIME type of the document, e.g. 'application/pdf'"),
  url: z.url().describe("URL of the amendment on legiscan.com"),
  state_link: z.url().describe("URL of the amendment on state website"),
  amendment_size: z
    .number()
    .describe("Size in bytes of the decoded BASE64 document (add 33% for base64)"),
  amendment_hash: z.hash("md5").describe("MD5 hash of the decoded BASE64 document"),
  alt_amendment: z.number().nullable().describe("Internal alternate amendment id"),
  alt_mime: zNames(Mime)
    .nullable()
    .describe("Normalized file type of alternate document, e.g. 'PDF'"),
  alt_mime_id: zNumbers(Mime).nullable().describe("Internal file type id of alternate document"),
  alt_mime_raw: z
    .string()
    .nullable()
    .describe("Raw MIME type of the alternate document, e.g. 'application/pdf'"),
  alt_state_link: z.url().nullable().describe("URL of the alternate document on state website"),
  alt_amendment_size: z
    .number()
    .nullable()
    .describe("Size in bytes of the decoded alternate BASE64 document (add 33% for base64)"),
  alt_amendment_hash: z
    .hash("md5")
    .nullable()
    .describe("MD5 hash of the decoded alternate BASE64 document")
});
export type _zAmendment = z.infer<typeof _zAmendment>;

export const zGetAmendment = _zAmendment.extend({
  bill_id: z.number().describe("Internal bill id the amendment belongs to"),
  doc: z.base64().describe("BASE64 encoded document"),
  alt_doc: z.base64().nullable().describe("BASE64 encoded alternate document")
});
export type zGetAmendment = z.infer<typeof zGetAmendment>;

export const _zSupplement = z.object({
  supplement_id: z.number().describe("Internal supplement id"),
  date: z.iso.date().nullable().describe("Date of the supplement"),
  type: zNames(SupplementType).describe("Normalized supplement type"),
  type_id: zNumbers(SupplementType).describe("Internal supplement type id"),
  type_raw: z.string().describe("Internal supplement type name"),
  mime: zNames(Mime).describe("Normalized file type, e.g. 'PDF'"),
  mime_id: zNumbers(Mime).describe("Internal file type id"),
  mime_raw: z.string().describe("Raw mime type of the document, e.g. 'application/pdf'"),
  url: z.url().describe("URL of the supplement on legiscan.com"),
  state_link: z.url().describe("URL of the supplement on state website"),
  supplement_size: z
    .number()
    .describe("Size in bytes of the decoded BASE64 document (add 33% for base64)"),
  supplement_hash: z.hash("md5").describe("MD5 hash of the decoded BASE64 document"),
  alt_supplement: z.number().nullable().describe("Internal alternate supplement id"),
  alt_mime: zNames(Mime)
    .nullable()
    .describe("Normalized file type of alternate document, e.g. 'PDF'"),
  alt_mime_id: zNumbers(Mime).nullable().describe("Internal file type id of alternate document"),
  alt_mime_raw: z
    .string()
    .nullable()
    .describe("Raw MIME type of the alternate document, e.g. 'application/pdf'"),
  alt_state_link: z.url().nullable().describe("URL of the alternate document on state website"),
  alt_supplement_size: z
    .number()
    .nullable()
    .describe("Size in bytes of the decoded alternate BASE64 document (add 33% for base64)"),
  alt_supplement_hash: z
    .hash("md5")
    .nullable()
    .describe("MD5 hash of the decoded alternate BASE64 document")
});
export type _zSupplement = z.infer<typeof _zSupplement>;

export const zGetSupplement = _zSupplement.extend({
  bill_id: z.number().describe("Internal bill id the supplement belongs to"),
  doc: z.base64().describe("BASE64 encoded document"),
  alt_doc: z.base64().nullable().describe("BASE64 encoded alternate document")
});
export type zGetSupplement = z.infer<typeof zGetSupplement>;

export const _zEvent = z.object({
  type: zNames(EventType).describe("Normalized event type"),
  type_id: zNumbers(EventType).describe("Internal event type id"),
  type_raw: z.string().describe("Internal event type name"),
  date: z.iso.date().describe("Date of the event"),
  time: z.iso.time().nullable().describe("Time of the event (if available)"),
  location: z.string().nullable().describe("Location of the event (if available)"),
  description: z.string().describe("Description of the event")
});
export type _zEvent = z.infer<typeof _zEvent>;

export const _zBill = z.object({
  bill_id: z.number().describe("Internal bill id"),
  bill_number: z.string().describe("Bill number, e.g. HB 1234"),
  title: z.string().describe("Official bill title"),
  description: z.string().describe("Official bill description"),
  url: z.url().describe("URL of bill on legiscan.com"),

  status: zNames(Progress).describe("Latest bill progress, e.g. 'Introduced'"),
  status_id: zNumbers(Progress).nullable().describe("Internal progress id"),
  status_date: z.iso.date().nullable().describe("Date of last progress update (if available)"),
  change_hash: z.hash("md5").describe("Hash of bill data, used for caching")
});
export type _zBill = z.infer<typeof _zBill>;

export const _zBillWithAction = _zBill.extend({
  last_action: z
    .string()
    .nullable()
    .describe("Description of the bill's last action (if available)"),
  last_action_date: z.iso
    .date()
    .nullable()
    .describe("Date of the bill's last action (if available)")
});

export const zGetMasterList = z.array(_zBillWithAction);
export type zGetMasterList = z.infer<typeof zGetMasterList>;

export const zGetSearch = z.array(
  _zBillWithAction
    .extend({
      relevance: z.number().describe("Relevance score of the search result"),
      state: zNames(State).describe("Normalized state"),
      state_id: zNumbers(State).describe("Internal state id"),
      bill_id: z.number().describe("Internal bill id"),
      text_url: z.url().describe("URL of the bill text on legiscan.com"),
      research_url: z.url().describe("URL of the bill research page on legiscan.com")
    })
    .omit({
      description: true,
      status: true,
      status_id: true,
      status_date: true
    })
);
export type zGetSearch = z.infer<typeof zGetSearch>;

export const _zBillVote = _zVote.extend({
  url: z.url().describe("URL of the vote on legiscan.com"),
  state_link: z.url().describe("URL of the vote on state website")
});

export const _zSponsor = _zPerson.extend({
  sponsor_type: zNames(SponsorType).describe("Normalized sponsor type"),
  sponsor_type_id: zNumbers(SponsorType).describe("Internal sponsor type id"),
  sponsor_order: z.number().describe("Order of sponsorship")
});

export const zGetBill = _zBill.extend({
  session_id: z.number().describe("Internal session id"),
  session: _zSession.describe("Session object"),
  state_link: z.url().describe("URL of bill on state website"),
  completed: z.boolean().describe("Flag for whether bill is completed"),
  progress: z
    .array(_zBillProgress)
    .describe("Major history of the bill (i.e. important items from history)"),
  state: zNames(State).describe("Normalized state"),
  state_id: zNumbers(State).describe("Internal state id"),
  state_raw: z.string().describe("Internal state name"),
  bill_type: zNames(BillType).describe("Normalized bill type, e.g. 'JointResolution'"),
  bill_type_id: zNumbers(BillType).describe("Internal bill type id"),
  bill_type_raw: z.string().describe("Internal bill type name, e.g. 'JR'"),
  body_id: z.number().describe("Internal body id (original)"),
  body_raw: z.string().describe("Internal body name (original)"),
  current_body_id: z.number().nullable().describe("Internal body id (current)"),
  current_body_raw: z.string().nullable().describe("Internal body name (current)"),
  pending_committee_id: z.number().describe("Internal committee id"),
  committee: z.array(_zCommittee).describe("List of committees if pending"),
  referrals: z.array(_zCommitteeReferral).describe("History of committee referrals"),
  history: z.array(_zBillHistory).describe("Full history of the bill"),
  sponsors: z.array(_zSponsor).describe("Sponsors of the bill"),
  sasts: z.array(_zSast).describe("SASTs of the bill"),
  subjects: z.array(_zSubject).describe("Subjects of the bill"),
  texts: z.array(_zBillText).describe("Documents from the bill"),
  votes: z.array(_zBillVote).describe("Votes for the bill"),
  amendments: z.array(_zAmendment).describe("Amendments to the bill"),
  supplements: z.array(_zSupplement).describe("Supplements to the bill"),
  calendar: z.array(_zEvent).describe("Events related to the bill")
});
export type zGetBill = z.infer<typeof zGetBill>;

export const _zRollCallVote = z.object({
  people_id: z.number().describe("Internal person id"),
  vote: zNames(Vote).describe("Vote of the person"),
  vote_id: zNumbers(Vote).describe("Internal vote id"),
  vote_raw: z.string().describe("Internal vote name")
});
export type _zRollCallVote = z.infer<typeof _zRollCallVote>;

export const zGetRollCall = _zVote.extend({
  bill_id: z.number().describe("Internal bill id the vote belongs to"),
  votes: z.array(_zRollCallVote).describe("Individual votes for the roll call")
});
export type zGetRollCall = z.infer<typeof zGetRollCall>;

export const zGetSessionPeople = z.array(_zPerson.extend({}));
export type zGetSessionPeople = z.infer<typeof zGetSessionPeople>;

export const zGetSponsoredList = z.array(
  z.object({
    bill_id: z.number().describe("Internal bill id"),
    bill_number: z.string().describe("Bill number, e.g. HB 1234"),
    session: _zSession
  })
);
export type zGetSponsoredList = z.infer<typeof zGetSponsoredList>;
