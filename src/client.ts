// API docs: https://legiscan.com/misc/LegiScan_API_User_Manual.pdf

import {
  asName,
  asNumber,
  BillType,
  EventType,
  Mime,
  type Needle,
  Party,
  Progress,
  Role,
  SastType,
  SponsorType,
  State,
  SupplementType,
  TextType,
  Vote
} from "./enums.ts";
import type {
  Amendment,
  Bill,
  BillText,
  MasterList,
  Person,
  RollCall,
  Search,
  SessionList,
  SessionPeople,
  SponsoredList,
  Supplement
} from "./generated/types.ts";
import {
  type _zSession,
  zGetAmendment,
  zGetBill,
  zGetBillText,
  zGetMasterList,
  zGetPerson,
  zGetRollCall,
  type zGetSearch,
  zGetSessionList,
  zGetSessionPeople,
  zGetSponsoredList,
  zGetSupplement
} from "./schemas/types.ts";

/**
 * Converts a PHP object with numerical keys into entries for consumption by other JS methods
 * Discards any string keys it finds along the way
 * @param object numerically-keyed object to convert to an array
 */

function* numericalEntries(object: Record<string, any>) {
  for (const k in object) {
    if (k.match(/^\d+$/)) {
      yield [Number(k), object[k]];
    }
  }
}

/**
 * Converts a PHP object into a JS array using {@link numericalEntries}
 * @param object PHP-style object to convert
 */

export function numericalToArray(object: Record<string, any>) {
  return Array.from(numericalEntries(object), (entry) => entry[1]);
}

/**
 * Class to instantiate a client for the Legiscan API
 */
export class LegiscanClient {
  public key: string | undefined;

  /**
   * @param key the key for the API, defaults to your $LEGISCAN_API_KEY env variable
   */
  constructor(key?: string | undefined) {
    this.key = key ?? process?.env?.LEGISCAN_API_KEY;
  }

  /**
   * Make an API request, adding the key automatically
   * @param op The API endpoint to hit (e.g., getSearchRaw)
   * @param params Query parameters to add to the request URL
   */
  async request(op: string, params: Record<string, unknown> = {}) {
    const url = new URL("https://api.legiscan.com/");
    url.search = new URLSearchParams({
      op: op,
      key: this.key!,
      ...params
    }).toString();

    const response = await (await fetch(url.toString())).json();
    if (response.status === "ERROR") {
      throw new Error(
        `Legiscan API rejected request: ${response.alert?.message ?? "no reason given"}`
      );
    }
    return response;
  }

  /*
  Other API methods to stub out:
  - getSearchRaw(query, { state?, year?, id? })
  - getDatasetList({ state?, year? })
  - getDataset(id, key)
  - getMonitorList(record?)
  - getMonitorListRaw(record?)
  - setMonitor(list, action, stance?)
  */

  /**
   * Get a list of sessions for a state
   * @cli {getSessionList} sessionlist
   * @param {State} [state] The US state, or all states if omitted
   */
  async getSessionList({ state }: { state?: Needle }): Promise<SessionList> {
    const { sessions } = await this.request("getSessionList", {
      ...(state ? { state: asName(State, state) } : {})
    });
    return zGetSessionList.parse(
      sessions.map(
        (s: any) =>
          ({
            session_id: s.session_id,
            state: asName(State, s.state_id)!,
            state_id: s.state_id,
            year_start: s.year_start,
            year_end: s.year_end,
            special: Boolean(s.special),
            prefile: Boolean(s.prefile),
            prior: Boolean(s.prior),
            sine_die: Boolean(s.sine_die),
            session_name: s.session_name,
            session_title: s.session_title,
            session_tag: s.session_tag,

            dataset_hash: s.dataset_hash,
            session_hash: s.session_hash
          }) satisfies zGetSessionList[number]
      )
    ) as SessionList;
  }

  /**
   * Get a list of all bills for a given session or state
   * @cli {getMasterList} masterlist
   * @param {State} [state] US State, will return the current session
   * @param {number} [session] the ID retrieved from getSessionList()
   */
  async getMasterList({
    state,
    session
  }: {
    state?: Needle;
    session?: number;
  }): Promise<MasterList> {
    const { masterlist } = await this.request("getMasterList", {
      ...(state ? { state: asName(State, state) } : {}),
      ...(session ? { id: session.toString() } : {})
    });
    return zGetMasterList.parse(
      numericalToArray(masterlist).map(
        (b: any) =>
          ({
            bill_id: b.bill_id,
            bill_number: b.number,
            title: b.title,
            description: b.description,
            url: b.url,
            status: asName(Progress, b.status)!,
            status_id: b.status,
            status_date: b.status_date,
            last_action: b.last_action,
            last_action_date: b.last_action_date !== "0000-00-00" ? b.last_action_date : null,
            change_hash: b.change_hash
          }) satisfies zGetMasterList[number]
      )
    ) as MasterList;
  }

  /**
   * Get the full text of a bill
   * @cli {getBillText} billtext
   * @param {number} id bill ID to request
   */
  async getBillText({ id }: { id: number }): Promise<BillText> {
    const { text } = await this.request("getBillText", { id });
    return zGetBillText.parse({
      doc_id: text.doc_id,
      bill_id: text.bill_id,
      type: asName(TextType, text.type_id)!,
      type_id: text.type_id,
      type_raw: text.type,
      date: text.date,
      url: text.url,
      state_link: text.state_link,

      mime: asName(Mime, text.mime_id)!,
      mime_id: text.mime_id,
      mime_raw: text.mime,
      text_size: text.text_size,
      text_hash: text.text_hash,
      doc: text.doc,

      alt_doc_id: text.alt_bill_text || null,
      alt_mime: text.alt_mime_id ? asName(Mime, text.alt_mime_id)! : null,
      alt_mime_id: text.alt_mime_id || null,
      alt_mime_raw: text.alt_mime || null,
      alt_text_size: text.alt_text_size || null,
      alt_text_hash: text.alt_text_hash || null,
      alt_state_link: text.alt_state_link || null,
      alt_doc: text.alt_doc || null
    } satisfies zGetBillText) as BillText;
  }

  /**
   * Get the details for a bill (such as status or history)
   * @cli {getBill} bill
   * @param {number} id bill ID to request
   */
  async getBill({ id }: { id: number }): Promise<Bill> {
    const { bill } = await this.request("getBill", { id });
    if (!Array.isArray(bill.committee)) bill.committee = [bill.committee];
    return zGetBill.parse({
      bill_id: bill.bill_id,
      change_hash: bill.change_hash,
      session_id: bill.session_id,
      session: {
        session_id: bill.session.session_id,
        state: asName(State, bill.session.state_id)!,
        state_id: bill.session.state_id,
        year_start: bill.session.year_start,
        year_end: bill.session.year_end,
        prefile: Boolean(bill.session.prefile),
        sine_die: Boolean(bill.session.sine_die),
        prior: Boolean(bill.session.prior),
        special: Boolean(bill.session.special),
        session_tag: bill.session.session_tag,
        session_title: bill.session.session_title,
        session_name: bill.session.session_name
      },
      url: bill.url,
      state_link: bill.state_link,
      completed: Boolean(bill.completed),
      status: asName(Progress, bill.status)!,
      status_id: bill.status,
      status_date: bill.status_date,
      progress: bill.progress.map((p: any): zGetBill["progress"][number] => ({
        date: p.date,
        event: asName(Progress, p.event)!,
        event_id: p.event
      })),
      state: asName(State, bill.state_id)!,
      state_id: bill.state_id,
      state_raw: bill.state,
      bill_number: bill.bill_number,
      bill_type: asName(BillType, parseInt(bill.bill_type_id, 10))!,
      bill_type_id: parseInt(bill.bill_type_id, 10),
      bill_type_raw: bill.bill_type,
      body_id: bill.body_id,
      body_raw: bill.body,
      current_body_id: bill.current_body_id || null,
      current_body_raw: bill.current_body_raw || null,
      title: bill.title,
      description: bill.description,
      pending_committee_id: bill.pending_committee_id,
      committee: bill.committee.map((c: any): zGetBill["committee"][number] => ({
        committee_id: c.committee_id,
        chamber_id: c.chamber_id,
        chamber_raw: c.chamber,
        name: c.name
      })),
      referrals: bill.referrals.map((r: any): zGetBill["referrals"][number] => ({
        date: r.date,
        committee_id: r.committee_id,
        chamber_id: r.chamber_id,
        chamber_raw: r.chamber,
        name: r.name
      })),
      history: bill.history.map((h: any): zGetBill["history"][number] => ({
        date: h.date,
        action: h.action,
        chamber_id: h.chamber_id || null,
        chamber_raw: h.chamber || null,
        importance: Boolean(h.importance)
      })),
      sponsors: bill.sponsors.map((s: any): zGetBill["sponsors"][number] => ({
        people_id: s.people_id,
        person_hash: s.person_hash,
        party: asName(Party, parseInt(s.party_id, 10))!,
        party_id: parseInt(s.party_id, 10),
        party_raw: s.party,
        state: asName(State, s.state_id)!,
        state_id: s.state_id,
        role: asName(Role, s.role_id)!,
        role_id: s.role_id,
        role_raw: s.role,
        name: s.name,
        first_name: s.first_name,
        middle_name: s.middle_name || null,
        last_name: s.last_name,
        suffix: s.suffix || null,
        nickname: s.nickname || null,
        district: s.district,
        ftm_eid: s.ftm_eid,
        votesmart_id: s.votesmart_id || null,
        opensecrets_id: s.opensecrets_id || null,
        knowwho_pid: s.knowwho_pid || null,
        ballotpedia: s.ballotpedia || null,
        bioguide_id: s.bioguide_id || null,
        sponsor_type: asName(SponsorType, s.sponsor_type_id)!,
        sponsor_type_id: s.sponsor_type_id,
        sponsor_order: s.sponsor_order,
        committee_sponsor: Boolean(s.committee_sponsor),
        committee_id: s.committee_id || null,
        state_federal: Boolean(s.state_federal),
        bio: s.bio
      })),
      sasts: bill.sasts.map((s: any): zGetBill["sasts"][number] => ({
        sast_bill_id: s.sast_bill_id,
        sast_bill_number: s.sast_bill_number,
        type: asName(SastType, s.type_id)!,
        type_id: s.type_id,
        type_raw: s.type
      })),
      subjects: bill.subjects.map((s: any): zGetBill["subjects"][number] => ({
        subject_id: s.subject_id,
        subject_name: s.subject_name
      })),
      texts: bill.texts.map((t: any): zGetBill["texts"][number] => ({
        doc_id: t.doc_id,
        bill_id: t.bill_id,
        type: asName(TextType, t.type_id)!,
        type_id: t.type_id,
        type_raw: t.type,
        date: t.date,
        url: t.url,
        state_link: t.state_link,
        mime: asName(Mime, t.mime_id)!,
        mime_id: t.mime_id,
        mime_raw: t.mime,
        text_size: t.text_size,
        text_hash: t.text_hash,
        alt_doc_id: t.alt_bill_text || null,
        alt_mime: t.alt_mime_id ? asName(Mime, t.alt_mime_id)! : null,
        alt_mime_id: t.alt_mime_id || null,
        alt_mime_raw: t.alt_mime || null,
        alt_state_link: t.alt_state_link || null,
        alt_text_size: t.alt_text_size || null,
        alt_text_hash: t.alt_text_hash || null
      })),
      votes: bill.votes.map((v: any): zGetBill["votes"][number] => ({
        roll_call_id: v.roll_call_id,
        date: v.date,
        description: v.desc,
        yea: v.yea,
        nay: v.nay,
        abstain: v.nv,
        absent: v.absent,
        total: v.total,
        passed: Boolean(v.passed),
        chamber_id: v.chamber_id,
        chamber_raw: v.chamber,
        url: v.url,
        state_link: v.state_link
      })),
      amendments: bill.amendments.map((a: any): zGetBill["amendments"][number] => ({
        amendment_id: a.amendment_id,
        adopted: Boolean(a.adopted),
        chamber_id: a.chamber_id,
        chamber_raw: a.chamber,
        date: a.date !== "0000-00-00" ? a.date : null,
        title: a.title,
        description: a.description,
        mime: asName(Mime, a.mime_id)!,
        mime_id: a.mime_id,
        mime_raw: a.mime,
        url: a.url,
        state_link: a.state_link,
        amendment_size: a.amendment_size,
        amendment_hash: a.amendment_hash,
        alt_amendment: a.alt_amendment || null,
        alt_mime: a.alt_mime_id ? asName(Mime, a.alt_mime_id)! : null,
        alt_mime_id: a.alt_mime_id || null,
        alt_mime_raw: a.alt_mime || null,
        alt_state_link: a.alt_state_link || null,
        alt_amendment_size: a.alt_amendment_size || null,
        alt_amendment_hash: a.alt_amendment_hash || null
      })),
      supplements: bill.supplements.map((s: any): zGetBill["supplements"][number] => ({
        supplement_id: s.supplement_id,
        date: s.date,
        type: asName(SupplementType, s.type_id)!,
        type_id: s.type_id,
        type_raw: s.type,
        mime: asName(Mime, s.mime_id)!,
        mime_id: s.mime_id,
        mime_raw: s.mime,
        url: s.url,
        state_link: s.state_link,
        supplement_size: s.supplement_size,
        supplement_hash: s.supplement_hash,
        alt_supplement: s.alt_supplement || null,
        alt_mime: s.alt_mime_id ? asName(Mime, s.alt_mime_id)! : null,
        alt_mime_id: s.alt_mime_id || null,
        alt_mime_raw: s.alt_mime || null,
        alt_state_link: s.alt_state_link || null,
        alt_supplement_size: s.alt_supplement_size || null,
        alt_supplement_hash: s.alt_supplement_hash || null
      })),
      calendar: bill.calendar.map((c: any): zGetBill["calendar"][number] => ({
        type: asName(EventType, c.type_id)!,
        type_id: c.type_id,
        type_raw: c.type,
        date: c.date,
        time: c.time || null,
        location: c.location || null,
        description: c.description
      }))
    }) as Bill;
  }

  /**
   * Get the text of an amendment
   * @cli {getAmendment} amendment
   * @param {number} id amendment ID number (probably from getBill)
   */
  async getAmendment({ id }: { id: number }): Promise<Amendment> {
    const { amendment } = await this.request("getAmendment", { id });
    return zGetAmendment.parse({
      amendment_id: amendment.amendment_id,
      bill_id: amendment.bill_id,
      adopted: Boolean(amendment.adopted),
      chamber_id: amendment.chamber_id,
      chamber_raw: amendment.chamber,
      date: amendment.date !== "0000-00-00" ? amendment.date : null,
      title: amendment.title,
      description: amendment.description,
      mime: asName(Mime, amendment.mime_id)!,
      mime_id: amendment.mime_id,
      mime_raw: amendment.mime,
      url: amendment.url,
      state_link: amendment.state_link,
      amendment_size: amendment.amendment_size,
      amendment_hash: amendment.amendment_hash,
      doc: amendment.doc,
      alt_amendment: amendment.alt_amendment || null,
      alt_mime: amendment.alt_mime_id ? asName(Mime, amendment.mime_id)! : null,
      alt_mime_id: amendment.alt_mime_id || null,
      alt_mime_raw: amendment.alt_mime || null,
      alt_state_link: amendment.alt_state_link || null,
      alt_amendment_size: amendment.alt_amendment_size || null,
      alt_amendment_hash: amendment.alt_amendment_hash || null,
      alt_doc: amendment.alt_doc || null
    } satisfies zGetAmendment) as Amendment;
  }

  /**
   * Get the text of a supplement (such as a fiscal note or analysis)
   * @cli {getSupplement} supplement
   * @param {number} id supplement ID number (probably from getBill)
   */
  async getSupplement({ id }: { id: number }): Promise<Supplement> {
    const { supplement } = await this.request("getSupplement", { id });
    return zGetSupplement.parse({
      supplement_id: supplement.supplement_id,
      bill_id: supplement.bill_id,
      date: supplement.date !== "0000-00-00" ? supplement.date : null,
      type: asName(SupplementType, supplement.type_id)!,
      type_id: supplement.type_id,
      type_raw: supplement.type,
      mime: asName(Mime, supplement.mime_id)!,
      mime_id: supplement.mime_id,
      mime_raw: supplement.mime,
      url: supplement.url,
      state_link: supplement.state_link,
      supplement_size: supplement.supplement_size,
      supplement_hash: supplement.supplement_hash,
      doc: supplement.doc,
      alt_supplement: supplement.alt_supplement || null,
      alt_mime: supplement.alt_mime_id ? asName(Mime, supplement.mime_id)! : null,
      alt_mime_id: supplement.alt_mime_id || null,
      alt_mime_raw: supplement.alt_mime || null,
      alt_state_link: supplement.alt_state_link || null,
      alt_supplement_size: supplement.alt_supplement_size || null,
      alt_supplement_hash: supplement.alt_supplement_hash || null,
      alt_doc: supplement.alt_doc || null
    } satisfies zGetSupplement) as Supplement;
  }

  /**
   * Get the details of a roll call vote
   * @cli {getRollCall} rollcall
   * @param {number} id vote ID number
   */
  async getRollCall({ id }: { id: number }): Promise<RollCall> {
    const { roll_call } = await this.request("getRollCall", { id });
    return zGetRollCall.parse({
      roll_call_id: roll_call.roll_call_id,
      bill_id: roll_call.bill_id,
      date: roll_call.date,
      description: roll_call.desc,
      yea: roll_call.yea,
      nay: roll_call.nay,
      abstain: roll_call.nv,
      absent: roll_call.absent,
      total: roll_call.total,
      passed: Boolean(roll_call.passed),
      chamber_id: roll_call.chamber_id,
      chamber_raw: roll_call.chamber,
      votes: numericalToArray(roll_call.votes).map((v: any): zGetRollCall["votes"][number] => ({
        people_id: v.people_id,
        vote: asName(Vote, v.vote_id)!,
        vote_id: v.vote_id,
        vote_raw: v.vote_text
      }))
    } satisfies zGetRollCall) as RollCall;
  }

  /**
   * Get details on a person by ID
   * @cli {getPerson} person
   * @param {number} id The Legiscan person ID
   */
  async getPerson({ id }: { id: number }): Promise<Person> {
    const { person } = await this.request("getPerson", { id });
    return zGetPerson.parse({
      people_id: person.people_id,
      person_hash: person.person_hash,
      party: asName(Party, parseInt(person.party_id, 10))!,
      party_id: parseInt(person.party_id, 10),
      party_raw: person.party,
      state: asName(State, person.state_id)!,
      state_id: person.state_id,
      role: asName(Role, person.role_id)!,
      role_id: person.role_id,
      role_raw: person.role,
      name: person.name,
      first_name: person.first_name,
      middle_name: person.middle_name || null,
      last_name: person.last_name,
      suffix: person.suffix || null,
      nickname: person.nickname || null,
      district: person.district,
      ftm_eid: person.ftm_eid,
      votesmart_id: person.votesmart_id || null,
      opensecrets_id: person.opensecrets_id || null,
      knowwho_pid: person.knowwho_pid || null,
      ballotpedia: person.ballotpedia || null,
      bioguide_id: person.bioguide_id || null,
      committee_sponsor: Boolean(person.committee_sponsor),
      committee_id: person.committee_id || null,
      state_federal: Boolean(person.state_federal),
      bio: person.bio
    } satisfies zGetPerson) as Person;
  }

  /**
   * Get all active people in a given legislative session
   * @cli {getSessionPeople} sessionpeople
   * @param {number} id The Legiscan session ID
   */
  async getSessionPeople({ id }: { id: number }): Promise<SessionPeople> {
    const {
      sessionpeople: { people }
    } = await this.request("getSessionPeople", { id });
    return zGetSessionPeople.parse(
      (people ?? []).map((person: any): zGetSessionPeople[number] => ({
        people_id: person.people_id,
        person_hash: person.person_hash,
        party: asName(Party, parseInt(person.party_id, 10))!,
        party_id: parseInt(person.party_id, 10),
        party_raw: person.party,
        state: asName(State, person.state_id)!,
        state_id: person.state_id,
        role: asName(Role, person.role_id)!,
        role_id: person.role_id,
        role_raw: person.role,
        name: person.name,
        first_name: person.first_name,
        middle_name: person.middle_name || null,
        last_name: person.last_name,
        suffix: person.suffix || null,
        nickname: person.nickname || null,
        district: person.district,
        ftm_eid: person.ftm_eid,
        votesmart_id: person.votesmart_id || null,
        opensecrets_id: person.opensecrets_id || null,
        knowwho_pid: person.knowwho_pid || null,
        ballotpedia: person.ballotpedia || null,
        bioguide_id: person.bioguide_id || null,
        committee_sponsor: Boolean(person.committee_sponsor),
        committee_id: person.committee_id || null,
        state_federal: Boolean(person.state_federal),
        bio: person.bio
      }))
    ) as SessionPeople;
  }

  /**
   * Get a list of bills sponsored by a specific person
   * @cli {getSponsoredList} sponsoredlist
   * @param {number} id Legiscan person ID for the sponsor
   */
  async getSponsoredList({ id }: { id: number }): Promise<SponsoredList> {
    const {
      sponsoredbills: { sessions, bills }
    } = await this.request("getSponsoredList", { id });
    return zGetSponsoredList.parse(
      bills.map((b: any): zGetSponsoredList[number] => ({
        bill_id: b.bill_id,
        bill_number: b.number,
        session: sessions
          .map(
            (s: any): _zSession => ({
              session_id: s.session_id,
              state: asName(State, s.state_id)!,
              state_id: s.state_id,
              year_start: s.year_start,
              year_end: s.year_end,
              prefile: Boolean(s.prefile),
              sine_die: Boolean(s.sine_die),
              prior: Boolean(s.prior),
              special: Boolean(s.special),
              session_tag: s.session_tag,
              session_title: s.session_title,
              session_name: s.session_name
            })
          )
          .find((s: _zSession) => s.session_id === b.session_id)
      }))
    ) as SponsoredList;
  }

  /**
   * Get the results of a search as a complete array containing all response pages
   * @cli {getSearch} search
   * @param {string} query Full text query
   * @param {State} [state] US state for this search
   * @param {number} [year] Year where 1=all, 2=current, 3=recent, 4=prior, >1900=exact
   */
  async getSearch({
    query,
    state,
    year
  }: {
    query: string;
    state?: Needle;
    year?: number;
  }): Promise<Search> {
    const items: zGetSearch = [];
    for await (const result of this.getSearchAsync({ query, state, year })) {
      items.push(result);
    }
    return items as Search;
  }

  /**
   * Get the results of a search one at a time, as an async iterator
   * @param query
   * @param state US state for this search
   * @param year Year where 1=all, 2=current, 3=recent, 4=prior, >1900=exact
   */
  async *getSearchAsync({
    query,
    state,
    year
  }: {
    query: string;
    state?: Needle;
    year?: number;
  }): AsyncGenerator<Search[number]> {
    let page = 1;

    while (true) {
      const { searchresult } = await this.request("getSearch", {
        query,
        page,
        ...(state ? { state: asName(State, state) } : {}),
        ...(year ? { year: year.toString() } : {})
      });
      const items = numericalToArray(searchresult).map(
        (b: any): zGetSearch[number] =>
          ({
            relevance: b.relevance,
            state: b.state,
            state_id: asNumber(State, b.state)!,
            bill_number: b.bill_number,
            bill_id: b.bill_id,
            change_hash: b.change_hash,
            url: b.url,
            text_url: b.text_url,
            research_url: b.research_url,
            last_action: b.last_action,
            last_action_date: b.last_action_date,
            title: b.title
          }) satisfies zGetSearch[number]
      );
      yield* items as Search;
      page++;

      if (searchresult.summary.page_total < page) return;
    }
  }
}
