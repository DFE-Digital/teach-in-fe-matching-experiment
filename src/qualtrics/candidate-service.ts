import config from "../config";
import { Candidate } from "../types";
import {
    getAllMailingListContacts,
    getMailingListContactByEmail,
    updateContactById,
} from "./qualtrics-service";

export const getAllCandidates = async (): Promise<Candidate[]> => {
    return await getAllMailingListContacts(
        config.qualtricsMailingListCandidates,
    );
};

export const getCandidateByEmail = async (
    emailAddress: string,
): Promise<Candidate> => {
    return await getMailingListContactByEmail(
        config.qualtricsMailingListCandidates,
        emailAddress,
    );
};

export const updateCandidate = async (candidate: Candidate) => {
    updateContactById(candidate.contactId, candidate);
};
