export type Contact = {
    id?: string;
    extRef?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
};

export type Candidate = Contact & {
    embeddedData?: {
        postcode?: string;
        college1Id?: string;
        college2Id?: string;
        college3Id?: string;
        college4Id?: string;
        college5Id?: string;
        lat?: number;
        long?: number;
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
    embeddedData?: {
        groupName?: string;
        jobTitle?: string;
        groupStatus?: "Unregistered" | "NeedsInvite" | "Invited" | "Active";
    };
};
