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
        collegeGroup1Id?: string;
        collegeGroup1Status?: CandidateCollegeMatchStatus;
        collegeGroup1DateSent?: string;
        collegeGroup1Colleges?: string;

        collegeGroup2Id?: string;
        collegeGroup2Status?: CandidateCollegeMatchStatus;
        collegeGroup2DateSent?: string;
        collegeGroup2Colleges?: string;

        collegeGroup3Id?: string;
        collegeGroup3Status?: CandidateCollegeMatchStatus;
        collegeGroup3DateSent?: string;
        collegeGroup3Colleges?: string;

        collegeGroup4Id?: string;
        collegeGroup4Status?: CandidateCollegeMatchStatus;
        collegeGroup4DateSent?: string;
        collegeGroup4Colleges?: string;

        collegeGroup5Id?: string;
        collegeGroup5Status?: CandidateCollegeMatchStatus;
        collegeGroup5DateSent?: string;
        collegeGroup5Colleges?: string;

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

export type CollegeGroupStatus =
    | "Unregistered"
    | "NeedsInvite"
    | "Invited"
    | "Active";

export type CollegeGroup = Contact & {
    unsubscribed?: string;
    embeddedData?: {
        groupName?: string;
        jobTitle?: string;
        dateInvited?: string;
        invitationAttempt?: string;
        groupStatus?: CollegeGroupStatus;
    };
};
