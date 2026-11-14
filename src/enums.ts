import { z } from "zod";

export const EventType = {
	Hearing: 1,
	ExecutiveSession: 2,
	MarkupSession: 3,
} as const;

export const Party = {
	Democrat: 1,
	Republican: 2,
	Independent: 3,
	GreenParty: 4,
	Libertarian: 5,
	Nonpartisan: 6,
} as const;

export const Progress = {
	Prefiled: 0,
	Introduced: 1,
	Engrossed: 2,
	Enrolled: 3,
	Passed: 4,
	Vetoed: 5,
	Failed: 6,
	Override: 7,
	Chaptered: 8,
	Refer: 9,
	ReportPass: 10,
	ReportDnp: 11,
	Draft: 12,
} as const;

export const Reason = {
	NewBill: 1,
	StatusChange: 2,
	Chamber: 3,
	Complete: 4,
	Title: 5,
	Description: 6,
	CommRefer: 7,
	CommReport: 8,
	SponsorAdd: 9,
	SponsorRemove: 10,
	SponsorChange: 11,
	HistoryAdd: 12,
	HistoryRemove: 13,
	HistoryRevised: 14,
	HistoryMajor: 15,
	HistoryMinor: 16,
	SubjectAdd: 17,
	SubjectRemove: 18,
	Sast: 19,
	Text: 20,
	Amendment: 21,
	Supplement: 22,
	Vote: 23,
	Calendar: 24,
	Progress: 25,
	VoteUpdate: 26,
	TextUpdate: 27,
	Icbm: 99,
} as const;

export const Role = {
	Representative: 1,
	Senator: 2,
	JointConference: 3,
} as const;

export const SastType = {
	SameAs: 1,
	SimilarTo: 2,
	ReplacedBy: 3,
	Replaces: 4,
	Crossfiled: 5,
	EnablingFor: 6,
	EnabledBy: 7,
	Related: 8,
	CarryOver: 9,
} as const;

export const SponsorType = {
	Sponsor: 0,
	PrimarySponsor: 1,
	CoSponsor: 2,
	JointSponsor: 3,
} as const;

export const Stance = {
	Watch: 0,
	Support: 1,
	Oppose: 2,
} as const;

export const SupplementType = {
	FiscalNote: 1,
	Analysis: 2,
	FiscalNoteAnalysis: 3,
	VoteImage: 4,
	LocalMandate: 5,
	CorrectionsImpact: 6,
	Misc: 7,
	VetoLetter: 8,
} as const;

export const TextType = {
	Introduced: 1,
	CommitteeSubstitute: 2,
	Amended: 3,
	Engrossed: 4,
	Enrolled: 5,
	Chaptered: 6,
	FiscalNote: 7,
	Analysis: 8,
	Draft: 9,
	ConferenceSubstitute: 10,
	Prefiled: 11,
	VetoMessage: 12,
	VetoResponse: 13,
	Substitute: 14,
} as const;

export const BillType = {
	Bill: 1,
	Resolution: 2,
	ConcurrentResolution: 3,
	JointResolution: 4,
	JointResolutionConstitutionalAmendment: 5,
	ExecutiveOrder: 6,
	ConstitutionalAmendment: 7,
	Memorial: 8,
	Claim: 9,
	Commendation: 10,
	CommitteeStudyRequest: 11,
	JointMemorial: 12,
	Proclamation: 13,
	StudyRequest: 14,
	Address: 15,
	ConcurrentMemorial: 16,
	Initiative: 17,
	Petition: 18,
	StudyBill: 19,
	InitiativePetition: 20,
	RepealBill: 21,
	Remonstration: 22,
	CommitteeBill: 23,
} as const;

export const VoteType = {
	Yea: 1,
	Nay: 2,
	Abstain: 3,
	Absent: 4,
} as const;

export const State = {
	AL: 1,
	AK: 2,
	AZ: 3,
	AR: 4,
	CA: 5,
	CO: 6,
	CT: 7,
	DE: 8,
	FL: 9,
	GA: 10,
	HI: 11,
	ID: 12,
	IL: 13,
	IN: 14,
	IA: 15,
	KS: 16,
	KY: 17,
	LA: 18,
	ME: 19,
	MD: 20,
	MA: 21,
	MI: 22,
	MN: 23,
	MS: 24,
	MO: 25,
	MT: 26,
	NE: 27,
	NV: 28,
	NH: 29,
	NJ: 30,
	NM: 31,
	NY: 32,
	NC: 33,
	ND: 34,
	OH: 35,
	OK: 36,
	OR: 37,
	PA: 38,
	RI: 39,
	SC: 40,
	SD: 41,
	TN: 42,
	TX: 43,
	UT: 44,
	VT: 45,
	VA: 46,
	WA: 47,
	WV: 48,
	WI: 49,
	WY: 50,
	DC: 51,
	US: 52,
} as const;

export const Mime = {
	HTML: 1,
	PDF: 2,
	WPD: 3,
	DOC: 4,
	RTF: 5,
	DOCX: 6,
} as const;

export type Needle = number | string;

export function asName<T extends Record<string, number>>(
	haystack: T,
	needle: Needle,
): keyof T | undefined {
	return Object.entries(haystack).find(
		([k, v]) => k === String(needle) || v === Number(needle),
	)?.[0] as keyof T | undefined;
}

export function asNumber<T extends Record<string, number>>(
	haystack: T,
	needle: Needle,
): number | undefined {
	return Object.entries(haystack).find(
		([k, v]) => k === String(needle) || v === Number(needle),
	)?.[1] as T[keyof T] | undefined;
}

export function zNames<T extends Record<string, number>>(haystack: T) {
	return z.union(Object.keys(haystack).map((k) => z.literal(k)));
}

export function zNumbers<T extends Record<string, number>>(haystack: T) {
	return z.union(Object.values(haystack).map((n) => z.literal(n)));
}
