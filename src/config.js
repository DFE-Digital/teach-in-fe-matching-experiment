export default {
    qualtricsBaseUrl: "https://fra1.qualtrics.com/API/v3/",
    qualtricsApiToken: process.env.QUALTRICS_ENV,
    qualtricsContactPoolId: process.env.QUALTRICS_POOL_ID,
    qualtricsMailingListCandidates:
        process.env.QUALTRICS_MAILING_LIST_CANDIDATES,
    qualtricsMailingListColleges: process.env.QUALTRICS_MAILING_LIST_COLLEGES,
    qualtricsMailingListCollegeGroups:
        process.env.QUALTRICS_MAILING_LIST_COLLEGE_GROUPS,
    mailinatorApiKey: process.env.MAILINATOR_API_KEY,
    mailinatorDomain: process.env.MAILINATOR_DOMAIN,
};
