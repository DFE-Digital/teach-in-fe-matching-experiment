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
    dataSourceUrlCollegeGroups: process.env.DATA_SOURCE_URL_COLLEGE_GROUPS,
    dataSourceUrlColleges: process.env.DATA_SOURCE_URL_COLLEGES,
    emailSendWorkflowUrl: process.env.EMAIL_SEND_WORKFLOW_URL,
    emailSendWorkflowKey: process.env.EMAIL_SEND_WORKFLOW_KEY,
    candidateSurveyUrl: process.env.CANDIDATE_SURVEY_URL,
    triggerSendCandidateDetailsUrl:
        process.env.TRIGGER_SEND_CANDIDATE_DETAILS_URL,
};
