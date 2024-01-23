import config from "../config";
import { Candidate } from "../types";
import { getMailingListContactByEmail } from "./qualtrics-service";

export const getCandidateByEmail = async (
  emailAddress: string,
): Promise<Candidate> => {
  return await getMailingListContactByEmail(
    config.qualtricsMailingListCandidates,
    emailAddress,
  );
};
