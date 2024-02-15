export type CandidateCollegeMatchStatus = "Sent";

export type Contact = {
    contactId?: string;
    extRef?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
};

export type Candidate = Contact & {
    embeddedData?: {
        postcode?: string;
        college1Id?: string;
        college1Status?: CandidateCollegeMatchStatus;
        college1DateSent?: string;
        college2Id?: string;
        college2Status?: CandidateCollegeMatchStatus;
        college2DateSent?: string;
        college3Id?: string;
        college3Status?: CandidateCollegeMatchStatus;
        college3DateSent?: string;
        college4Id?: string;
        college4Status?: CandidateCollegeMatchStatus;
        college4DateSent?: string;
        college5Id?: string;
        college5Status?: CandidateCollegeMatchStatus;
        college5DateSent?: string;
        lat?: number;
        long?: number;
        region?: string;
        subject?: string;
        subSubject?: string;
        qualification?: string;
        experience?: string;
        availability?: string;
        matched?: boolean;
    };
};

export type College = Contact & {
    embeddedData?: {
        lat?: number;
        long?: number;
        groupId?: string;
    };
};

export type CollegeGroup = Contact & {
    unsubscribed?: string,
    embeddedData?: {
        groupName?: string;
        jobTitle?: string;
        dateInvited?: string;
        invitationAttempt?: string
        groupStatus?: "Unregistered" | "NeedsInvite" | "Invited" | "Active";
    };
};
