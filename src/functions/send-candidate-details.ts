import "dotenv/config";
import config from "../config";
import {
    getAllCandidates,
    updateCandidate,
} from "../qualtrics/candidate-service";
import {
    getAllCollegeGroups,
    formatDate,
} from "../qualtrics/college-group-service";
import { getAllColleges } from "../qualtrics/college-service";
import { Candidate, College, CollegeGroup } from "../types";
import { encode } from "html-entities";

import { app } from "@azure/functions";
import axios from "axios";

type CollegeGroupWithCandidateData = {
    collegeGroup: CollegeGroup;
    candidates: Array<{
        candidate: Candidate;
        colleges: College[];
    }>;
};

app.http("send-candidate-details", {
    methods: ["POST"],
    authLevel: "function",
    handler: async (request, context) => {
        const testMode = request.query.get("testMode") == "true";

        // Get all the active college groups
        let activeCollegeGroups = (await getAllCollegeGroups()).filter(
            (collegeGroup) =>
                collegeGroup.embeddedData?.groupStatus == "Active",
        );

        if (testMode) {
            // If we're in test mode we will only use college groups with extRef that start with 'test-college'
            context.log("In test mode so only using test college groups");
            activeCollegeGroups = activeCollegeGroups.filter((collegeGroup) =>
                collegeGroup.extRef?.startsWith("test-group"),
            );
        }

        const currentDate = formatDate(new Date(Date.now()), "yyyy-mm-dd");

        // Get all the colleges
        const allColleges = await getAllColleges();

        const allCollegesByRef: {} = allColleges.reduce((prev, college) => {
            prev[college.extRef] = college;
            return prev;
        }, {});

        // Get all the candidates
        const allCandidates = await getAllCandidates();

        const stats = {
            numEmails: 0,
            numCandidates: 0,
        };

        for (const collegeGroup of activeCollegeGroups) {
            context.info(
                `Processing college group ${collegeGroup.extRef} [${collegeGroup.embeddedData.groupName}]`,
            );

            try {
                let dataForEmail: CollegeGroupWithCandidateData = {
                    collegeGroup,
                    candidates: [],
                };

                for (const candidate of allCandidates) {
                    const candidateMatchedColleges = [];

                    for (let collegeNum = 1; collegeNum <= 5; ++collegeNum) {
                        if (
                            collegeGroup.extRef ==
                                candidate.embeddedData[
                                    `collegeGroup${collegeNum}Id`
                                ] &&
                            candidate.embeddedData[
                                `collegeGroup${collegeNum}Status`
                            ] != "Sent"
                        ) {
                            context.info(
                                `Found a matching candidate: ${candidate.contactId}`,
                            );

                            for (const matchedCollegeRef of candidate.embeddedData[
                                `collegeGroup${collegeNum}Colleges`
                            ].split(",")) {
                                candidateMatchedColleges.push(
                                    allCollegesByRef[matchedCollegeRef.trim()],
                                );
                            }

                            candidate.embeddedData[
                                `collegeGroup${collegeNum}Status`
                            ] = "Sent";

                            candidate.embeddedData[
                                `collegeGroup${collegeNum}DateSent`
                            ] = currentDate;
                        }
                    }

                    if (candidateMatchedColleges.length > 0) {
                        context.info(
                            `Candidate ${candidate.contactId} matched ${candidateMatchedColleges.map((college) => `${college.extRef} [${college.firstName}]`).join(", ")}`,
                        );

                        dataForEmail.candidates.push({
                            candidate,
                            colleges: candidateMatchedColleges,
                        });

                        stats.numCandidates++;
                    }
                }

                if (dataForEmail.candidates.length == 0) {
                    context.info(`No candidates - skipping email`);
                    continue;
                }

                context.info(
                    `Found ${dataForEmail.candidates.length} candidates: ${dataForEmail.candidates.map((candidate) => candidate.candidate.contactId).join(", ")}`,
                );

                const emailContent = constructEmailContent(dataForEmail);

                context.info("Sending email");

                const subject = `Potential teachers for your college`;

                await sendEmail(collegeGroup, subject, emailContent);

                stats.numEmails++;

                for (const candidate of dataForEmail.candidates) {
                    context.info(
                        `Updating candidate ${candidate.candidate.contactId}`,
                    );
                    context.info(candidate.candidate);
                    await updateCandidate(candidate.candidate);
                }
            } catch (e) {
                context.error(
                    `Error sending email for college group ${collegeGroup.extRef}`,
                    e,
                );
            }
        }

        return {
            body: JSON.stringify({
                result: "success",
                stats,
            }),
        };
    },
});

async function sendEmail(
    recipient: CollegeGroup,
    subject: string,
    body: string,
) {
    const requestData = {
        email: recipient.email,
        subject,
        body,
        key: config.emailSendWorkflowKey,
    };

    await axios.post(config.emailSendWorkflowUrl, requestData);
}

function constructEmailContent(data: CollegeGroupWithCandidateData) {
    const collegeGroup = data.collegeGroup;

    let content = `
    <div style="font-size:19px; font-family:Arial,Helvetica,sans-serif;">
        <p><img src="https://dferesearch.eu.qualtrics.com/CP/Graphic.php?IM=IM_3UDhH8iz4YHUyIS" alt="Department for Education logo" /></p>
        <p>Hello,</p>
        <p>Thank you for agreeing to take part in our trial to introduce potential FE teachers to local colleges.</p>
        <p>Here are the contact details of potential teachers who are local to your college.</p>
        <p>Note that this information has not been verified by DfE.</p>
        <p>DfE has also not conducted DBS checks or taken any other steps to determine anyone&rsquo;s suitability to teach in FE.</p>
        <p>We ask that you:</p>
        <ul>
            <li>at a minimum, contact each person listed here to invite them to have an informal conversation about teaching, or acknowledge their interest and explain why they&rsquo;re not suitable at this time</li>
            <li>keep a record of your interactions with these potential teachers and outcomes of any engagement with them, so you can share that information with DfE at the end of this trial. <a href="https://www.teach-in-further-education.campaign.gov.uk/matching-trial-for-colleges">Visit our website to see what kind of information to record and get a helpful template to store those details.</a></li>
        </ul>
    `;

    for (const candidateData of data.candidates) {
        content += constructEmailCandidateContent(
            candidateData.candidate,
            candidateData.colleges,
        );
    }

    content += `
        <hr/>
        <p>We are providing this information as part of the DfE trial to introduce potential FE teachers to colleges local to them.&nbsp;</p>
        <p>It is provided on the understanding that your college has agreed to:&nbsp;</p>
        <ul>
            <li>only share the information we send you with members of staff who have a need to see it, for example, the recruitment manager for the relevant department.&nbsp;</li>
            <li>not share the information we send you with anyone outside the college.</li>
            <li>store the information in a place that can only be accessed by employees of the college who have a need to see it.</li>
        </ul>
        <p>If you have questions about this DfE trial or the information given here, email the Teach in FE team at <a href="mailto:college.match@education.gov.uk">college.match@education.gov.uk</a></p>
        <p>Thanks,</p>
        <p>Teach in Further Education</p>
    </div>`;

    return content;
}

function constructEmailCandidateContent(
    candidate: Candidate,
    colleges: College[],
) {
    let content = `
    <hr/>
    <p><strong>Potential teacher in ${encode(candidate.embeddedData?.subject)}</strong></p>
    <dl>
        <dt style="font-weight: bold">Name</dt>
        <dd style="margin-bottom: 10px">${encode(candidate.firstName)} ${encode(candidate.lastName)}</dd>

        <dt style="font-weight: bold">Email address</dt>
        <dd style="margin-bottom: 10px"><a href="mailto:${encode(candidate.email)}">${encode(candidate.email)}</a></dd>

        <dt style="font-weight: bold">Colleges they have matched with</dt>
        <dd style="margin-bottom: 10px">${colleges.map((college) => encode(college.firstName)).join(", ")}</dd>
    `;

    if (candidate.embeddedData?.subSubject) {
        content += `
        <dt style="font-weight: bold">Specialism</dt>
        <dd style="margin-bottom: 10px">${encode(candidate.embeddedData?.subSubject)}</dd>
        `;
    }

    content += `
        <dt style="font-weight: bold">Highest qualification level in subject</dt>
        <dd style="margin-bottom: 10px">${encode(candidate.embeddedData?.qualification)}</dd>

        <dt style="font-weight: bold">Years of experience in subject</dt>
        <dd style="margin-bottom: 10px">${encode(candidate.embeddedData?.experience)}</dd>

        <dt style="font-weight: bold">Hours of teaching they are interested in</dt>
        <dd style="margin-bottom: 10px">${encode(candidate.embeddedData?.availability)}</dd>
    </dl>
    `;

    return content;
}
